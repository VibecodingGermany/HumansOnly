# Architekturentscheidung — Humans Only 2.0

Stand: 2026-11-04. Verbindliche Produktquelle: `MASTERPLAN_2027.md` und der Neustartauftrag. Release-Impact: major, neues Schema und neue Auth-Identität. Workspace: `/Volumes/2TB_CodingProjekte/Coding_Projekte/HumansOnly-Lokal`; lokale Kopie ohne Branch oder Commit-ID.

## Bewusste Trennung

Next.js-Seiten und Metadaten bleiben Server Components. Zustandsabhängige Clubhaus-Ansichten, Browser-Aufnahmen und lokale Demo-Persistenz liegen in expliziten Client Components. Der gemeinsame `ClubhouseRepository` abstrahiert Lesen, Medien-Upload, Auth, Ticket-Ausgabe/-Einlösung, Beiträge und Stimmen. Der Provider koordiniert nur UI-Snapshots. Fachliche Hoheitsrechte liegen im PostgreSQL-Backend, nicht im Provider.

`NEXT_PUBLIC_DATA_MODE` wählt genau einen Adapter. Standard ist eine klar markierte, sofort nutzbare lokale Demo. Der echte Adapter lädt keine fiktiven Menschen, wenn eine Live-Anfrage fehlschlägt. Der Demo-Adapter ist kein Sicherheitssystem: browserlokale Daten sind vom Nutzer editierbar. Web Locks serialisieren lokale Mutationen, soweit verfügbar; der synchrone lokale Fallback ist keine Garantie für Konflikte zwischen Tabs in unsicheren Kontexten. Dafür ist das echte Backend zuständig.

## Schnittstellenentscheidungen

- Ein Supabase-Auth-Nutzer ohne Profil ist noch kein Mitglied. Keine automatische Profilanlage beim Signup.
- Atomare `redeem_invite`-Transaktion: eigenes gespeichertes Voice-Intro, Ticketvalidität, Bürgenrecht, eindeutiger Nutzername, Profil, Raum-Mitgliedschaft und Einlösungsstempel.
- Drei Guthaben werden beim Ausstellen eines Tickets verbraucht. Einmalige Einlösung, 30 Tage Gültigkeit, kein automatischer Ablauf-Refund. Zufällige Live-Codes enthalten zwei UUIDv4-Werte.
- Alle fachlichen Schreibvorgänge erfolgen über `SECURITY DEFINER`-Funktionen mit festem leerem `search_path`, expliziten Grants und internen Berechtigungsprüfungen. Clients können weder Rollen noch Zähler oder Einladungsrechte direkt verändern.
- Votes werden vor dem Upsert pro Post serialisiert. Ein Trigger aktualisiert Zähler und Status. Gleichartige Wiederholung ist idempotent; ein Wechsel überschreibt die eigene Stimme.
- `hidden` unterdrückt die Inhaltsanzeige, bleibt für berechtigte Mitglieder prüfbar und kann rehabilitiert werden. Kein Anspruch auf Datenentzug innerhalb eines berechtigten Raums. Raumgrenzen sind RLS-geschützt.
- Drei private Storage-Buckets. DB-Felder mit Suffix `_url` enthalten im Live-Modus **Objektpfade**, keine signierten URLs. Der Adapter signiert pro Bucket gebündelt und cached nur bis kurz vor Ablauf. Signaturen werden nie in die Datenbank zurückgeschrieben.
- Realtime hört auf `posts`, inklusive Zähleränderungen. Burst-Ereignisse werden entprellt; Fokus und ein 45-Minuten-Intervall erneuern Daten/Signaturen. Netzwerkfehler bleiben sichtbar.
- Die ausstehende Einladung wird eine Stunde browserlokal vorgemerkt, damit ein E-Mail-Callback in einem zweiten Tab den Kontext behält. Das RPC prüft sie bei Einlösung vollständig erneut. Abgeschlossene Einlösung entfernt die Vormerkung.
- Der aktive Raum wird zwischen Feed und mobilem Composer geteilt, sodass Beiträge nicht versehentlich im anderen Raum landen.

## Grenzen und Rollback

Das Archiv ist der Rückweg zum alten Code, kein automatisches Datenbank-Rollback. V2 wird auf einer frischen Supabase-Instanz eingerichtet. Alte Infrastruktur-Anweisungen bleiben archiviert und werden nicht auf das neue System angewandt. Kein Dienst oder externes Konto wurde hierfür geändert.

Browser- und SQL-Längenprüfungen belegen weder echte menschliche Identität noch tatsächlichen Audio-Inhalt; für untrusted Clients wären serverseitige Medienprüfung, Rate-Limits und Moderationsbetrieb weitere Ausbauarbeiten. Die aktuelle UI hat keine automatische Bürgen-Sanktion. `can_invite=false` kann ein Administrator setzen und sperrt dann Ausgabe und Einlösung. Bezahlte Räume werden im MVP nicht freigeschaltet.

Die 6 Tabellen und gemeinsamen Regeln sind für die Flutter-Partner spezifiziert; ein nativer Client ist nicht Bestandteil dieses Web-Auftrags.
