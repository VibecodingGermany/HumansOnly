# Humans Only 2.0 — gemeinsamer Vertrag für Flutter/Dart und Web

Version: **2.0.0**, 2026-11-04. Zielplattformen: iOS, Android, macOS. Maßgeblich sind `supabase/migrations/0001_humans_only_v2_core.sql` und `app/lib/model.ts`. Flutter verbindet sich mit **derselben neuen Supabase-Instanz** wie die PWA. Es gibt keine separate native API und keine Clerk-/Prisma-Kompatibilität.

## 1. Gemeinsame Datentypen

UUIDs als Strings, Zeitstempel als ISO-8601 UTC/`DateTime`, `numeric` als Dart `num` (bei Bedarf `.toDouble()`), Stimmenzähler/Guthaben/Preise als `int`. Namen und Texte als Unicode-Strings. DB-Spalten heißen `snake_case`.

| Tabelle | Felder / Nullbarkeit | Bedeutung |
|---|---|---|
| `profiles` | `id uuid PK → auth.users`, `username text UNIQUE`, `display_name text`, `bio text DEFAULT ''`, `avatar_url text?`, `voice_intro_url text?`, `voice_duration_sec numeric?`, `invited_by_id uuid? → profiles`, `invites_left int DEFAULT 3`, `can_invite bool DEFAULT true`, `created_at timestamptz` | Identität und Vertrauens-Stammbaum. `username`: 3–24 Zeichen `[a-z0-9_]`, Name 1–60, Bio max. 300. Voice 1–15 Sekunden. |
| `invite_tickets` | `id uuid PK`, `code text UNIQUE`, `creator_id uuid → profiles`, `target_space_id uuid → spaces`, `redeemed_by_id uuid? UNIQUE → profiles`, `redeemed_at timestamptz?`, `expires_at timestamptz` | Kombi-Pass, einmal einlösbar, 30 Tage gültig. Nicht als öffentliches Verzeichnis abfragen. |
| `spaces` | `id uuid PK`, `slug text UNIQUE`, `name text`, `description text`, `owner_id uuid? → profiles`, `pinned_info jsonb`, `access_type text`, `price_cents int`, `created_at timestamptz` | `access_type` ist `invite` oder `paid`; bezahlte Räume sind noch nicht freigegeben. `owner_id=NULL` ist ausschließlich der unbeanspruchte Bootstrap-Zustand. |
| `space_members` | `(space_id,user_id) PK/FKs`, `role text`, `joined_at timestamptz` | Rolle `owner`, `moderator`, `member`; höchstens ein Owner pro Raum. Clients vergeben keine Rollen. |
| `posts` | `id uuid PK`, `author_id uuid → profiles`, `space_id uuid? → spaces`, `text text`, `image_url text?`, `audio_url text?`, `audio_duration_sec numeric?`, `parent_id uuid? → posts`, `slop_status text`, `valuable_votes_count int`, `slop_votes_count int`, `created_at timestamptz` | `space_id=NULL`: Große Lobby. Text max. 2.000 Zeichen. Audio 1–60 Sekunden. Mindestens Text oder ein Medium. Antworten müssen im gleichen Raum bleiben. |
| `content_votes` | `id uuid PK`, `post_id uuid → posts`, `voter_id uuid → profiles`, `vote text`, `created_at timestamptz`, UNIQUE `(post_id,voter_id)` | `valuable` oder `slop`; Wiederholung idempotent, Wechsel ersetzt bisherige Stimme. Keine Selbstabstimmung. |

`pinned_info` ist ein Array, kein beliebiger HTML-String:

```json
[{"title":"Offene Werkbank","text":"Zeig, woran du gerade baust."},
 {"title":"Stammtisch","text":"Termine und Infos","url":"https://vibecoding-germany.de"}]
```

Links nur mit sicherem HTTPS-Schema öffnen; Texte normal rendern, keine HTML-Ausführung.

## 2. Auth + Golden Ticket

**Ein Auth-Login allein ist noch keine Mitgliedschaft.** Es gibt keinen Profil-Autocreate-Trigger.

1. Deep Link `/invite?code=…` oder Code-Eingabe lesen und `inspect_invite` aufrufen. Der öffentliche Preview liefert nur Gültigkeit, Raum und Bürge.
2. Ausstehendes Ticket im Client bis zum Abschluss/Timeout behalten. Die Web-App merkt es maximal eine Stunde über Tabs hinweg vor. Ein Preview reserviert das Ticket nicht.
3. Mit Supabase Auth anmelden. Der Web-Client verwendet E-Mail-Magic-Link/OTP, PKCE-Callback `/auth/callback` und Cookie-Refresh. Native Clients konfigurieren eigene zulässige Redirect-URLs und Deep Links; alternativ E-Mail-Code verwenden. Rückkehrende Mitglieder benötigen kein neues Ticket.
4. Erst nach Auth eine echte Aufnahme erstellen, Vorschau anbieten und in `voice-intros/<uid>/<random>.<ext>` hochladen. Dauer in Sekunden messen; 1–15 Sekunden, Aufnahme automatisch stoppen. Mikrofonberechtigungen nativ korrekt deklarieren und Tracks/Sessions nach Ende freigeben.
5. `redeem_invite` aufrufen. **Eine Transaktion** prüft Ticket, Ablauf, Bürgenrecht, eigenen gespeicherten Voice-Pfad und eindeutigen Nutzernamen; erstellt dann Profil und Raum-Mitgliedschaft und markiert die Einlösung.
6. Profil/Rooms neu laden, Ticket-Vormerkung löschen, Zielraum öffnen. Nach Fehler keinen lokalen Mitgliedsstatus simulieren.

```dart
final supabase = Supabase.instance.client;
// Beispiel: E-Mail-OTP; Mail-Template muss {{ .Token }} anzeigen.
await supabase.auth.signInWithOtp(email: email);
await supabase.auth.verifyOTP(
  email: email,
  token: codeFromEmail,
  type: OtpType.email,
);

final preview = await supabase.rpc('inspect_invite', params: {
  'p_code': inviteCode,
});
if (preview['valid'] != true) throw StateError('Ticket ungültig');

final profile = await supabase.rpc('redeem_invite', params: {
  'p_code': inviteCode,
  'p_username': username.trim().toLowerCase(),
  'p_display_name': displayName.trim(),
  'p_bio': bio,
  'p_voice_path': uploadedObjectPath, // NICHT die signierte URL!
  'p_voice_duration_sec': durationSeconds,
});
```

Eine Stimme schafft soziale Nähe und ist **kein biometrischer oder technischer Identitätsnachweis**. Ein manipuliertes Clientprogramm kann eine deklarierte Dauer angeben; eine serverseitige Prüfung des Audio-Inhalts ist nicht Bestandteil dieses MVP.

## 3. RPC-Vertrag

Alle Parameter sind benannt. Benutzer-/Voter-/Creator-IDs kommen aus `auth.uid()`, niemals aus Clientparametern. Funktionsnamen und Signaturen gelten für beide Clients.

| RPC | Argumente | Ergebnis |
|---|---|---|
| `inspect_invite` | `p_code text` | JSON `{valid:bool, space_slug:string?, space_name:string?, inviter_username:string?}`. Anonym zulässig. |
| `create_invite` | `p_space_id uuid` | Ein `invite_tickets`-Objekt. Sperrt das Profil; reduziert Guthaben bei **Ausgabe**. Mitgliedschaft, `can_invite`, beanspruchter kostenloser Raum und Guthaben erforderlich. |
| `redeem_invite` | `p_code text`, `p_username text`, `p_display_name text`, `p_bio text`, `p_voice_path text`, `p_voice_duration_sec numeric` | Ein `profiles`-Objekt. Auth erforderlich; bestehendes Profil kann nicht erneut onboarden. |
| `create_post` | `p_space_id uuid?`, `p_text text`, `p_image_path text?=null`, `p_audio_path text?=null`, `p_audio_duration_sec numeric?=null`, `p_parent_id uuid?=null` | Ein `posts`-Objekt. Raumprüfung, eigene gespeicherte Medien und Parent-Scope werden geprüft. |
| `cast_content_vote` | `p_post_id uuid`, `p_vote text` | Aktualisiertes `posts`-Objekt inklusive Zähler/Status. Sperrt Post vor dem Upsert. |

```dart
final ticket = await supabase.rpc('create_invite', params: {
  'p_space_id': spaceId,
});
final inviteUri = Uri.parse(webOrigin).replace(
  path: '/invite', queryParameters: {'code': ticket['code'] as String},
);

final post = await supabase.rpc('create_post', params: {
  'p_space_id': null, // Lobby; sonst UUID des Raums
  'p_text': 'Moin aus der nativen App!',
  'p_image_path': null,
  'p_audio_path': null,
  'p_audio_duration_sec': null,
  'p_parent_id': null,
});
final updated = await supabase.rpc('cast_content_vote', params: {
  'p_post_id': postId, 'p_vote': 'valuable',
});
```

Status-Reihenfolge ist deterministisch:

1. `slop_votes_count - valuable_votes_count >= 3` → `hidden`.
2. Sonst `valuable_votes_count > slop_votes_count` → `valuable_verified`.
3. Sonst `slop_votes_count > 0` → `under_review`.
4. Sonst → `clean`.

`hidden` bedeutet **Darstellungsunterdrückung**: Der Client zeigt eine Platzhalterkarte, keinen Text/Bild/Audio-Inhalt. Berechtigte Mitglieder können im Prüfbereich weiter abstimmen und den Beitrag rehabilitieren. RLS sperrt fremde Räume unabhängig vom Status; innerhalb eines berechtigten Raums bleibt der Datensatz per API lesbar. Kein `slop_status`-, Counter- oder Vote-Write direkt aus Flutter.

Stabile Fehlermeldungen: `AUTH_REQUIRED`, `PROFILE_REQUIRED`, `INVALID_TICKET`, `ALREADY_ONBOARDED`, `INVITES_REVOKED`, `NO_INVITES_LEFT`, `SPACE_FORBIDDEN`, `VOICE_REQUIRED`, `INVALID_PARENT`, `INVALID_MEDIA`, `POST_FORBIDDEN`, `SELF_VOTE_FORBIDDEN`, `INVALID_VOTE`. Berechtigungsfehler nutzen überwiegend SQLSTATE `42501`; Eindeutigkeitsfehler `23505`, Constraints `23514`. Fehler lokal übersetzen und Inputs behalten. Fehlerstatus niemals als Erfolg behandeln.

### Warteliste (Migration `0002_waitlist.sql`)

Zusätzliche, rein additive Tabelle `waitlist_entries` (`id`, `name`, `email`, `status` = `pending|approved|rejected`, `ticket_id`, `created_at`, `decided_at`, `decided_by`, `invited_at`, `invite_count`). Die sechs Kern-Tabellen bleiben unverändert. Admins stehen in `private.admins` (kein Client-Zugriff); der Gastgeber von Vibecoding Germany ist erster Admin.

| RPC | Rolle | Verhalten |
| :--- | :--- | :--- |
| `join_waitlist(p_name, p_email)` | anon, authenticated | Trägt ein. Gleiche Antwort für neue und bekannte Adressen (E-Mail case-insensitiv eindeutig). Fehler: `INVALID_NAME`, `INVALID_EMAIL`, `WAITLIST_BUSY` (mehr als 60 Einträge in 10 Minuten). |
| `is_admin()` | authenticated | `true` für Admins. |
| `approve_waitlist_entry(p_entry_id)` | Admin | Stellt ein Goldenes Ticket für Vibecoding Germany aus (30 Tage, `creator_id` = Admin), ohne `invites_left` zu verbrauchen. Wiederholung liefert dasselbe gültige Ticket, nach Ablauf ein neues. Gibt `invite_tickets` zurück. |
| `reject_waitlist_entry(p_entry_id)` | Admin | Nur für nicht freigegebene Einträge (`WAITLIST_ALREADY_APPROVED`). |
| `mark_waitlist_invited(p_entry_id)` | Admin | Protokolliert einen erfolgreichen Mailversand (nur freigegebene Einträge, sonst `WAITLIST_NOT_APPROVED`). Den Versand selbst übernimmt der Web-Server. |
| `delete_waitlist_entry(p_entry_id)` | Admin | Löscht den Eintrag (z. B. auf Wunsch). Ein bereits ausgestelltes Ticket bleibt gültig. |

`waitlist_entries` ist nur für Admins per `select` lesbar; direkte Schreibzugriffe sind gesperrt. Fehler ohne Admin-Rechte: `ADMIN_REQUIRED`.

### Profil-Einstellungen (Migration `0003_profile_settings.sql`)

Additiv: `profiles` erhält `location` (≤ 60), `pronouns` (≤ 30), `links` (jsonb-Array, ≤ 5 Einträge `{label, url}`; `url` nur `http(s)://`, ≤ 200 Zeichen), `visibility` (`members` Standard | `public` | `hidden`), `show_posts` und `show_trust_tree` (beide Standard `true`). Neue Tabelle `profile_settings` (`user_id`, `notify_replies` = true, `notify_ticket_redeemed` = true, `notify_news` = false); nur die eigene Zeile ist per `select` lesbar, fehlt sie, gelten die Standardwerte.

| RPC | Rolle | Verhalten |
| :--- | :--- | :--- |
| `update_profile(p_display_name, p_bio, p_location, p_pronouns, p_links, p_visibility, p_show_posts, p_show_trust_tree)` | Mitglied | Speichert alle Felder auf einmal (Werte werden getrimmt, Links bereinigt). Fehler: `PROFILE_REQUIRED`, `INVALID_DISPLAY_NAME`, `INVALID_BIO`, `INVALID_LOCATION`, `INVALID_PRONOUNS`, `INVALID_LINKS`, `INVALID_VISIBILITY`. |
| `set_avatar(p_path)` | Mitglied | Setzt einen zuvor in den Bucket `avatars` hochgeladenen eigenen Pfad (`<uid>/<datei>`); `null` entfernt das Bild. Fehler: `INVALID_MEDIA`. Storage-Objekte bleiben unveränderlich: ein neues Bild ist ein neuer Pfad. |
| `update_notification_settings(p_replies, p_ticket_redeemed, p_news)` | Mitglied | Upsert der eigenen Zeile. Der Versand der Mitteilungen ist noch nicht umgesetzt. |
| `get_public_profile(p_username)` | anon, authenticated | Liefert nur bei `visibility = 'public'` ein JSON mit `username`, `display_name`, `bio`, `avatar_path`, `location`, `pronouns`, `links`, `member_since`, sonst `null`. Keine Beiträge, kein Vertrauensbaum, keine Stimme. |
| `delete_my_account()` | Mitglied | Löscht `auth.users` und damit Profil, Mitgliedschaften, Beiträge samt Antworten, Stimmen und Tickets (ON DELETE CASCADE). Gastgeber eines Raums erhalten `OWNER_CANNOT_DELETE`. Hochgeladene Dateien bleiben bis zur Wartung im Storage. |

Nur `public` wird serverseitig erzwungen: anon darf ausschließlich über `get_public_profile` und per Storage-Policy `clubhouse_public_avatar_read` Avatare öffentlicher Profile lesen (zum Signieren der URL). `members` und `hidden` steuern die Darstellung der Profilseite unter Mitgliedern; Name, Nutzername, Bild und Bio sind für Mitglieder weiterhin per API lesbar. Flutter blendet bei `hidden` Bio, Ort, Pronomen, Links, Stimme, Beiträge und Vertrauensbaum anderer aus. E-Mail-Änderung läuft über `auth.updateUser(email)`.

### Social-Basics (Migration `0004_social_basics.sql`)

Additiv: `posts.likes_count` (≥ 0, per Trigger gepflegt) und Tabelle `post_likes` (`post_id`, `user_id`, `created_at`, Primärschlüssel aus beiden). Lesbar für alle, die den Beitrag lesen dürfen (`private.can_read_post`), also auch „wem gefällt das“. Likes sind unabhängig von der Community-Prüfung (`content_votes`) und ändern `slop_status` nicht. Kommentare bleiben Beiträge mit `parent_id` und werden über `create_post` geschrieben. `post_likes` ist Teil von `supabase_realtime`.

| RPC | Rolle | Verhalten |
| :--- | :--- | :--- |
| `toggle_post_like(p_post_id)` | Mitglied | Herz an/aus, Zeile des Beitrags gesperrt. Rückgabe `{liked, likes_count}`. Fehler: `PROFILE_REQUIRED`, `POST_FORBIDDEN` (kein Lesezugriff), `SELF_LIKE_FORBIDDEN`. |
| `delete_post(p_post_id)` | Autor, Gastgeber/Moderation des Raums, Admin | Löscht Beitrag oder Kommentar samt Antworten, Likes und Stimmen (ON DELETE CASCADE). Fehler: `POST_FORBIDDEN`, `DELETE_FORBIDDEN`. Medien bleiben bis zur Wartung im Storage. |
| `set_voice_intro(p_path, p_duration_sec)` | Mitglied | Neue Sprachvorstellung aus dem Bucket `voice-intros` (eigener Pfad, 1–15 s). Fehler: `VOICE_REQUIRED`. |

Links im Text erkennt der Client (http/https und `www.`), `@name` verlinkt auf `/u/name`, wenn das Profil existiert. Die Web-App holt Link-Vorschauen über `GET /api/link-preview?url=…` (nur mit Sitzung; Server ruft die Seite ab, blockt private Netze). Spotify- und YouTube-Player werden erst nach einem Tipp geladen. Teilen nutzt den Link `/p/<post_id>`; er öffnet das Gespräch nur für Mitglieder mit Lesezugriff.

## 4. Lesen, RLS und Realtime

RLS ist auf allen sechs Tabellen aktiv. Anonyme Nutzer sehen keine Clubdaten; nur die schmale Ticketvorschau ist öffentlich. Authentifizierte Nutzer ohne Profil sehen ebenfalls keine Clubdaten. Mitglieder lesen Profile, Raum-Metadaten, die Lobby und ihre eigenen Räume. `space_members` ist nur innerhalb eigener Räume sichtbar. `invite_tickets` sehen nur Aussteller oder eingelöster Gast; `content_votes` nur der eigene Voter. Der Client darf auf den Tabellen ausschließlich lesen, alle fachlichen Änderungen laufen über RPC.

```dart
final lobby = await supabase.from('posts')
  .select().isFilter('space_id', null)
  .order('created_at', ascending: false).limit(100);
final room = await supabase.from('posts')
  .select().eq('space_id', spaceId)
  .order('created_at', ascending: false).limit(100);
final invited = await supabase.from('profiles')
  .select().eq('invited_by_id', profileId);
```

`posts` ist Teil von `supabase_realtime`, sofern die Standard-Publication vorhanden ist. Bei Änderungen inklusive Stimmenzählern gezielt neu laden oder den erlaubten Datensatz ersetzen. RLS gilt auch für Realtime-Auslieferung. Subscription beim Dispose entfernen, Burst-Ereignisse entprellen. Der Web-MVP liest maximal die jüngsten 100 sichtbaren Posts. Eine Flutter-Paginierung sollte dieselbe absteigende Reihenfolge `(created_at,id)` verwenden.

## 5. Private Storage-Buckets

| Bucket | Größe | MIME-Typen | Lesen |
|---|---:|---|---|
| `avatars` | 5 MiB | `image/jpeg`, `image/png`, `image/webp` | Eigentümer; sonst erst nach Profilreferenz und Mitgliedschaft |
| `voice-intros` | 5 MiB | `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/x-m4a` | Eigentümer auch vor Onboarding; andere Clubmitglieder erst nach Profilreferenz |
| `post-media` | 10 MiB | Bild- und Audio-Typen von oben | Eigentümer; andere erst nach Referenz in einem für sie lesbaren Post |

Namensschema: `<auth.uid()>/<zufällige UUID>.<Endung>`. Neue immutable Uploads, `upsert:false`; kein Überschreiben oder Löschen durch Clients. Kein SVG-Upload. Bucket-Limits und Policies prüfen Größe/Format/Zugriff, kein menschliches Stimmmerkmal. Nicht referenzierte fehlgeschlagene Uploads müssen später über vertrauenswürdige Wartung bereinigt werden.

```dart
final path = '$userId/$randomId.m4a';
await supabase.storage.from('voice-intros').uploadBinary(
  path, audioBytes,
  fileOptions: const FileOptions(contentType: 'audio/mp4', upsert: false),
);
final playbackUrl = await supabase.storage
  .from('voice-intros').createSignedUrl(path, 3600);
```

Trotz `_url`-Suffix speichern alle Medienfelder im Live-Backend nur den **bucketrelativen Pfad**. Die Web-Repository-Schicht ersetzt ihn beim Lesen im UI-Snapshot durch eine kurzlebige signierte URL. In Flutter dieselbe Trennung vorsehen: Roh-DTO mit Pfad, Wiedergabe-ViewModel mit URL. URLs nach Ablauf erneuern; gebündelt signieren und gültige Signaturen wiederverwenden. `getPublicUrl` passt nicht zu diesen privaten Buckets. Auch signierte URLs bleiben bis Ablauf nutzbare Bearer-Links; nicht protokollieren oder öffentlich teilen.

## 6. VCG-Design in Flutter

Die unveränderten Web-Originale stehen in `app/app/styles/vcg-*.css`, die Fonts in `app/app/fonts/`, die Maskottchen in `app/public/images/karl-dieter/`. Das HO-Icon unter `app/public/assets/ho-logo-icon.png` ist ein sekundäres Badge.

| Token | Tag | Nacht |
|---|---|---|
| Papier / `surface` | `#faf7ef` | `#0a0a0a` |
| Erhöhte Fläche / `surface-raised` | `#ffffff` | `#1c1b18` |
| Tinte / `ink` | `#0a0a0a` | `#faf7ef` |
| Sekundäre Tinte | `#55524a` | `#b3ad9f` |
| Vibe-Blau | `#0238ef` | identisch |
| Mango | `#fca50a` | identisch |
| Mango tief | `#f98b02` | identisch |
| Auf Blau | `#ffffff` | identisch |
| Auf Mango | `#0a0a0a` | identisch |
| Fokus | `#0238ef` | `#fca50a` |

Rahmen: 1,5 px fein, **2 px** normal, **3 px** kräftig. Radien 0/6/12/18 px. Abstände 4/8/12/16/24/32/40/56/80/120 px. Sticker-Neigungen `--tilt-s=-2deg`, `--tilt-m=3deg`, `--tilt-l=-8deg`; Flutter `Transform.rotate(angle: degrees*pi/180)`. Original-Stickerschatten: `(0,2,0,8% schwarz)` plus `(0,6,14,16% schwarz)`, ergänzt durch versetzte harte Tinte-Schatten für Buttons/Tickets.

Die tatsächlichen mitgelieferten VCG-Fonts sind **Anton** (Display), **Barlow Condensed** (Medium/SemiBold/Bold/ExtraBold), **Hanken Grotesk** (variabler Fließtext) und **Kalam** (Handschrift). „Bebas Neue / Arial Narrow“ im Masterplan bezeichnet Fallbacks; das Originalprojekt liefert diese vier anderen Familien. Für Flutter geeignete TTF/OTF-Versionen derselben Familien aus lizenzierten Quellen einbinden, keine WOFF2-Unterstützung voraussetzen. Die Web-Fontdateien und deren Herkunft sind erhalten.

Mango-Play-Button mit Tinte-Rand, Fortschritt/Wellenform plus zugänglicher Wiedergabe-/Pause-Beschriftung. Lokale Aufnahme ohne Autoplay, klarer Timer, automatisches Ende bei 15 Sekunden (Intro) / 60 Sekunden (Voice-Post), zugängliche Fehler bei fehlender Berechtigung. Schrift/Touch-Ziele an native Bedienung und Textskalierung anpassen; Papier/Tinte/Mango bleiben konsistent.

## 7. Bootstrap und Parität

`seed.sql` legt `vibecoding-germany` mit UUID `10000000-0000-4000-8000-000000000001` an. Ein Administrator verbindet danach mit `bootstrap-owner.sql` einen echten Auth-Nutzer als ersten Besitzer. Gleicher Besitzer ist idempotent, anderer Besitzer wird ohne Nebenwirkungen abgewiesen. Der erste Gastgeber ist die dokumentierte Ausnahme vom Ticket-Onboarding; sein Voice-Intro ist zunächst optional.

Demo-Daten bleiben ausschließlich im Web-Demo-Adapter. Für native Offline-Demos dieselben fachlichen DTOs nutzen, aber nie Demotickets in Live-Supabase anlegen.

Vor Veröffentlichung gemeinsam prüfen: Auth/Deep-Link in neuem Tab/Gerät, Invite-Einlösung inklusive Race, Medienaufnahme unter iOS/Android/macOS, MIME/Playback, private Raumgrenzen, Stimmenwechsel/Realtime, offline und Session-Ablauf. SQL- und Web-Nachweise: `docs/VALIDATION.md`.

Offizielle Referenzen: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Database Functions](https://supabase.com/docs/guides/database/functions), [private Storage-Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Flutter E-Mail-Login](https://supabase.com/docs/reference/dart/auth-signinwithotp), [OTP prüfen](https://supabase.com/docs/reference/dart/auth-verifyotp), [Binärdateien hochladen](https://supabase.com/docs/reference/dart/storage-from-upload).
