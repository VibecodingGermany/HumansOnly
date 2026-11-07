# Validierung — Humans Only 2.0

## Callback-Regression 2026-11-07

Der Benutzer bestätigt den Empfang der Anmeldemail. Supabase protokolliert den erfolgreichen PKCE-Codeaustausch; die anschließende Weiterleitung führt jedoch zu `https://localhost:3218/onboarding`. Auch der Aufruf ohne Code ist auf beiden öffentlichen Domains reproduzierbar betroffen: HTTP 307 mit `Location: https://localhost:3218/invite?auth_error=1`.

Ursache ist die Ableitung des Redirect-Ziels aus `request.url`, dessen Origin hinter dem Reverse-Proxy die interne Serveradresse enthält. Die Korrektur verwendet feste relative Ziele für Erfolgs- und Fehlerfall, behält HTTP 307 und den vorhandenen Session-/Cookie-Austausch bei und setzt `Cache-Control: private, no-store`. Es werden keine Host-Header oder frei wählbaren Rücksprungziele vertraut.

Fünf neue Regressionstests prüfen den erfolgreichen Austausch bei interner Origin, abgelaufene Codes, fehlende/leere Codes, Demo-Modus sowie manipulierte Host-/Forwarded-Header und `next`-Parameter. `npm test` (15/15), `npm run typecheck`, `npm run lint` und `git diff --check` sind erfolgreich. Lokale Prüfungen: 15/15 Tests (davon fünf Callback-Regressionen), Typecheck, Lint und Produktionsbuild erfolgreich. Die Korrektur ist auf beiden Domains aktiviert. Je Domain wurden fehlender Code, ungültiger Code und ein fremdes `next`-Ziel mit manipulierten Forwarded-Headern geprüft: jeweils HTTP 307, relative `Location: /invite?auth_error=1`, `private, no-store`; Folgen der Weiterleitung endet öffentlich mit HTTP 200. Zwei echte Browserprüfungen bestätigen die sichtbare Fehlermeldung ohne localhost-Wechsel. Der tatsächliche Callback-Handler wurde zusätzlich für Erfolg und Fehler durch den Next.js-HTTP-Transport geprüft: relative Ziele, Status und synthetische Sitzungscookies bleiben erhalten. Der Benutzer hat den E-Mail-Empfang bestätigt; dessen erfolgreicher PKCE-Austausch ist protokolliert, und sein Chrome zeigt nach Aufruf der öffentlichen Startseite das Clubhaus als Dennis. Ein zweiter echter Mail-Code wurde für den Fix nicht verbraucht. PM2-Neustartkonfiguration ist gespeichert. Lokale Nachweise: `auth-callback-transport.json` und `callback-public-checks.json` im Deployment-Verzeichnis. Release-Auswirkung: **patch**; keine Versionsänderung ohne separaten Release-Auftrag.

## Live-Deployment 2026-11-07

Release v2.0.0 / `2a62c42270a7132ecac630f61cf8934f5ff79f1f` wurde auf dem bestehenden Server aktiviert. Beide öffentlichen Domains liefern die neue App über HTTPS. Der Produktionsbuild verwendet das tatsächliche dedizierte Supabase-Projekt, keinen Demo-Modus. Der folgende historische lokale Abnahmebericht bleibt unverändert als Nachweis erhalten.

Erfolgreich am gehosteten Projekt geprüft:

- Migration, Seed, sechs Tabellen mit RLS, drei private Buckets und Realtime-Publication.
- Echter Gastgeber-Auth-Account, authentifizierte Datenabfragen und Owner-Bootstrap.
- Profilfreier Testgast sieht keine Clubdaten; direkte Tabellenwrites sind gesperrt.
- Gastgeber erstellt ein Ticket; anonyme Vorschau funktioniert; Sprachdatei-Upload und einmalige Einlösung erzeugen Profil und Mitgliedschaft. Wiederholte Einlösung scheitert.
- Fremde Upload-Pfade und unreferenzierte fremde Sprachdateien sind gesperrt. Nach Aufnahme ins Clubhaus funktioniert der signierte Medienabruf; der öffentliche Bucket-Pfad bleibt gesperrt.
- Beiträge im Raum, Verbot der Selbstabstimmung und Stimmenwechsel mit korrekten Zählern.
- Realtime zwischen zwei echten Auth-Clients: zwei erfolgreiche Prüfungen, davon eine mit Beitrag unmittelbar nach `SUBSCRIBED`. Beim ersten Verbindungsversuch kam kein Ereignis innerhalb des Prüfzeitraums; die Providerlogs zeigen zu diesem Zeitpunkt die Erstinitialisierung des neuen Tenants. Keine Schema- oder App-Änderung war für die erfolgreichen Wiederholungen nötig.
- Sämtliche temporären Beiträge, Stimmen, Ticket, Auth-Nutzer und die synthetische WAV-Datei wurden entfernt. Dennis besitzt wieder drei Tickets; es bleiben genau ein Auth-Nutzer und ein Profil, keine Posts, Tickets oder Storage-Objekte aus den Prüfungen.
- Beide Domains: HTTP 200, jeweils 14 Skript-/Stylesheet-Dateien erreichbar, Manifest, Service Worker und Offline-Seite erreichbar. Auth-Seiten erhalten `private, no-store`; der Service Worker wird nicht langfristig gecacht.
- Öffentliche Desktop-/Mobilansicht mit echter Gastgeber-Sitzung, Tickets und Profil erreichbar, kein horizontaler Überlauf bei 390 px, keine JavaScript- oder Supabase-HTTP-Fehler. Diese Prüfung verwendet eine regulär erhaltene Auth-Sitzung und ersetzt keinen Mail-Callback-Test.
- Vorhandener SMTP-Server akzeptiert STARTTLS und Anmeldung. Die öffentliche App hat die erste Anmeldemail angefordert; Supabase protokolliert `/otp` mit HTTP 200 und der korrekten Callback-URL. Posteingang und persönlicher Mail-Link-Abschluss wurden zur Bestätigung an den Benutzer übergeben und sind noch nicht unabhängig nachgewiesen.
- PM2-Prozesse V1 und V2 online, V2 ohne Neustarts; Nginx-Syntaxprüfung erfolgreich, Umschaltung aktiv und PM2-Prozessliste gespeichert.

Die Supabase-Hinweise auf absichtlich ausführbare SECURITY-DEFINER-RPCs wurden gegen deren Auth-/Mitgliedschaftsprüfungen geprüft ([anonyme Funktionen](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authentifizierte Funktionen](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). Der Health-Advisor meldet keine Befunde. Passwort-Leak-Schutz ist nicht aktiviert ([Providerhinweis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)); die App bietet E-Mail-Link/Code-Anmeldung. Zwei fehlende Fremdschlüsselindizes und noch unbenutzte Indizes sind als nicht blockierende Performance-Hinweise erfasst ([Fremdschlüssel](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [unbenutzte Indizes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).

Lokale, ignorierte Betriebsnachweise liegen unter `output/deployment-2026-11-07/`. Zugangsdaten und Auth-Sitzungen werden nicht veröffentlicht. Physische iOS-/Android-Aufnahmen, Mikrofonqualität und Installation auf echten Geräten bleiben offen.

## Release-Prüfung 2026-11-07

Für den ausdrücklich beauftragten Push und Release wurde der Workspace mit der bestehenden Historie von `cubetribe/HumansOnly` verbunden. Release-Branch: `feat/humans-only-v2`; Basis: `main` / `f95b6acf439c8dd9d65ffa961670d13158c1d1f4`. Der folgende ursprüngliche Abnahmebericht vom 2026-11-04 bleibt als historischer Nachweis erhalten.

Erneut erfolgreich: `npm run lint`, `npm run typecheck`, `npm test` (10/10), `npm run build`, `npm audit --omit=dev` (0 bekannte Schwachstellen) sowie `python3 supabase/tests/contract.py` (51/51). Browserabläufe und Produktcode sind seit der dokumentierten Abnahme unverändert. Die neue GitHub-CI prüft die Web-App unter Node.js 22 und den isolierten SQL-Vertrag auf Ubuntu; sie verwendet keine Produktionszugänge und führt kein Deployment aus. Details und verbleibende Live-Abnahmen: [Release 2.0.0](RELEASE_2.0.0.md).

Archivvergleich gegen `origin/main`: **376/376** ursprüngliche Dateien sind lokal bytegenau unter `_legacy_v1/` erhalten. Der historische Bericht `_legacy_v1/Agents/BUILDER_deployment-report.md` enthält kennwortähnliche Literale und wird durch eine spezifische Ignore-Regel nicht erneut veröffentlicht. Der lokale Originalbericht und die frühere Git-Historie bleiben erhalten; der aktuelle Gültigkeitsstatus dieser alten Werte ist unbekannt. Private Umgebungsdateien, Build-Verzeichnisse und lokale Testartefakte sind ebenfalls vom Commit ausgeschlossen.

Gitleaks-Prüfung des vollständigen Index-Exports: ein nachgeprüfter Fehlalarm in der unveränderten alten Deployment-Anleitung (Zeile 184, mit Auslassungspunkten abgeschnittener JWT-Beispielheader im ausdrücklich bezeichneten Placeholder-Abschnitt). Kein gültiger Schlüssel in diesem Fund. Whitespace-Prüfung der neuen/geänderten V2-Dateien erfolgreich; vorhandener Whitespace im bindenden Masterplan und unveränderten Archiv wurde bewusst nicht umformatiert.

## Ursprüngliche lokale Abnahme

Abnahme am **2026-11-04** im ausdrücklich beauftragten lokalen Workspace `/Volumes/2TB_CodingProjekte/Coding_Projekte/HumansOnly-Lokal`.

## Ergebnis

Der lokale MVP-Durchstich ist implementiert und geprüft. Altbestand archiviert, Original-Branddateien übernommen, alle geforderten Seiten vorhanden. **Release-Auswirkung: major; Versionskandidat 2.0.0.** Branch, Basisbranch und Commit-Build-ID: nicht vorhanden, da diese Kopie kein Git-Repository ist. Kein Commit, Push, Deployment oder Zugriff auf eine produktive Datenbank.

| Prüfung | Ergebnis |
|---|---|
| `npm run lint` in `app/` | Erfolgreich, keine Lint-Fehler oder -Warnungen |
| `npm run typecheck` | Erfolgreich, strict TypeScript |
| `npm test` | **10/10** Fachlogik-Tests erfolgreich |
| `npm run build` | Erfolgreich auf **Next.js 15.5.29**, alle neun statischen Seiten generiert; Profil und Callback dynamisch |
| `npm start -- --port 3217` | Produktionsserver gestartet und im Browser geprüft |
| `npm audit --omit=dev` | **0 bekannte Schwachstellen** in der ausgeführten Prüfung; transitive PostCSS-Version gezielt auf 8.5.32 überschrieben |
| `python3 supabase/tests/contract.py` | **51/51** Prüfungen erfolgreich, isolierter PostgreSQL 14.19 |
| VCG-Originalvergleich | **40 Dateien**, SHA-256 identisch: drei CSS-Dateien, Tailwind-Konfiguration, acht Fonts und 28 Karl-Dieter-Assets |
| Responsive Browserprüfung | 320, 375, 390, 768 und 1440 px ohne horizontalen Dokument-Überlauf |

Die früheren Änderungen und Testscripts liegen unverändert im Archiv und wurden nicht ausgeführt. Die ursprüngliche Server-Umgebungsdatei ist erhalten; Inhalte wurden nicht in die neue Anwendung übernommen.

## Fachlogik und SQL

Die zehn TypeScript-Tests prüfen Ticketbudget, einmalige Einlösung, Verfall/Entzug, eindeutige Namen/Voice-Grenzen, idempotente Stimmenwechsel und Statusschwellen, Raumgrenzen/Selbstabstimmung, Post-/Reply-Scope, MIME-/Größenprüfung sowie explizite Live-Konfiguration.

Eine unabhängige SQL-Prüfung hat die echte Migration und den Seed gegen eine neue lokale Testdatenbank ausgeführt. Nach Korrektur und erneuter Abnahme sind alle 51 Prüfungen grün, darunter:

- Anonyme und Auth-Nutzer ohne Einladung sehen keine Clubdaten.
- Kein Direktwrite auf Einladungsbudget, Rollen oder Stimmenzähler.
- Vier parallele Ticket-Ausgaben bei drei Guthaben ergeben exakt drei Tickets.
- Zwei parallele Einlösungen desselben Codes lassen exakt einen Gast hinein; beim Verlierer bleiben keine Teil-Daten.
- Abgelaufene Tickets, entzogene Bürgenrechte und fremde Voice-Pfade scheitern.
- Raumfremde dürfen weder Beiträge schreiben/lesen/prüfen noch deren Medien abrufen.
- Stimmenwechsel und konkurrierende Stimmen ergeben exakte Zähler sowie korrektes Ausblenden/Rehabilitieren.
- Alle Medien-Buckets sind privat; immutable Uploads können nicht überschrieben oder gelöscht werden.
- Ein erneuter Owner-Bootstrap mit anderem Nutzer wird ohne Profil-Nebenwirkung abgelehnt; derselbe Owner ist idempotent.

Der wiederholbare Runner liegt in `supabase/tests/contract.py`. Ausgabe: `output/sql-validation/reproducible-run.log`, `output/sql-validation/results.json`. Alle von der Prüfung gestarteten Datenbankserver wurden beendet. Auth-Funktionen/Rollen und Storage-Metadaten sind für diesen Test minimal emuliert; ihre HTTP-Dienste sind nicht simuliert.

## Browserprüfung

Mit isoliertem Playwright-Chromium wurden reale UI-Aktionen ausgeführt. Audioaufnahmen verwendeten eine **künstliche MediaStream-Testspur**; ein physisches Mikrofon wurde nicht aufgenommen.

- Mobile Lobby auswählen → festen „+“-Button öffnen → Text absenden: `space_id=NULL` und sichtbarer Beitrag.
- Ticket ausstellen: Guthaben von 3 auf 2, genau ein Ticket; QR-Dialog rendert.
- Ungültiger Invite-Code wird abgewiesen; `MOIN-VIBECODING` öffnet Onboarding.
- Voice-Intro stoppt automatisch nach 15 Sekunden, Audio-Tracks werden beendet.
- Onboarding erzeugt Profil Nora, Bürge Mira, Mitgliedschaft, gespeichertes Intro und drei Guthaben; Ticket-Vormerkung wird entfernt.
- Dritte Slop-Stimme blendet den Beitrag aus; Wechsel auf „wertvoll“ korrigiert Zähler auf 1/2 und Status auf `under_review`.
- PNG-Bildpost bleibt nach Reload vorhanden.
- Verweigerter Mikrofonzugriff zeigt einen verständlichen Fehler. Während der Aufnahme sind Formatwechsel und Absenden gesperrt.
- Aufgenommener Sprachpost wird gespeichert; stummgeschaltete Testwiedergabe zeigt laufende `currentTime`.
- Vertrauens-Stammbaum führt von Mira zum neu eingeladenen Nora-Profil.
- Nacht-Modus bleibt nach Reload/Hydration erhalten.
- Abmelden ist mobil erreichbar; der ausdrücklich beschriftete Demo-Wiedereinstieg als Dennis funktioniert ohne Datenreset.
- Mobile Pinwand ist am Raum-Header ausklappbar. Installationshilfe ist mobil erreichbar.
- Finale Dev-Konsolenprüfung: keine Fehler oder Warnungen.

Ein kurzzeitig fehlgeschlagener Theme-Test las vor der Hydration; die Prüfung wartet danach auf den tatsächlich wiederhergestellten Theme-Zustand. Während der Entwicklung durch Hot Reload ungültig gewordene Dialog-Referenzen wurden mit frischen Snapshots erneut geprüft. Diese Testlauf-Artefakte sind keine offenen Produktfehler.

Die Produktionsprüfung bestätigte Manifest mit drei Icons, aktive Service-Worker-Kontrolle und ausschließlich `/offline.html` im Cache. Bei deaktiviertem Netzwerk öffnet eine Navigation auf `/tickets` die allgemeine Offline-Seite; bei wiederhergestelltem Netzwerk lädt das Clubhaus erneut. Es werden keine privaten Feeds oder Medien im Service Worker gespeichert. Ein erwarteter Netzwerkfehler während des absichtlichen Offline-Tests wird nicht als regulärer Laufzeitfehler gewertet.

Browser-Ergebnisse: `output/playwright/browser-results.json`. Bilder:

- [Desktop-Vorschau](../output/playwright/clubhouse-preview.png)
- [Clubhaus komplett / Desktop](../output/playwright/clubhouse-desktop.png)
- [Clubhaus / Mobil](../output/playwright/clubhouse-mobile.png)
- [Feed / Mobil](../output/playwright/clubhouse-feed-mobile.png)
- [Einladung / Desktop](../output/playwright/invite-desktop.png)
- [Einladung / Mobil](../output/playwright/invite-mobile.png)
- [Aufgenommenes Intro](../output/playwright/onboarding-recorded-mobile.png)
- [Abstimmung](../output/playwright/community-vote-mobile.png)
- [Ticket-QR](../output/playwright/ticket-qr-mobile.png)
- [Profil](../output/playwright/profile-mobile.png)
- [Profil im Nacht-Modus](../output/playwright/profile-dark-mobile.png)
- [Offline-Seite](../output/playwright/offline-mobile.png)

Screenshots sind lokale Abnahmeartefakte, keine produktiven Nutzerdaten. Alle Demo-Daten wurden anschließend im isolierten Testbrowser zurückgesetzt.

## Unabhängige Reviews

Read-only-Prüfungen haben sechs Web-Ablaufprobleme und einen Owner-Bootstrap-Fehler gefunden. Korrekturen wurden unabhängig nachgeprüft: separater Mitglieder-Login, ausstehendes Ticket mit TTL über Tabs hinweg, gemeinsames Raumziel für mobilen Composer, Aufnahme-Sperren, mobile Install-/Logout-Controls und gebündelte/cachebare Medien-Signaturen. Kein offener Blocker in den nachgeprüften Bereichen.

Der Rückgabetyp nicht-SETOF-basierter Supabase-RPCs wurde gegen die offiziellen PostgREST-Tests geprüft: benannte Composite-Rückgaben sind Einzelobjekte. Web-Typen und Flutter-Beispiele stimmen damit überein.

## Noch nicht nachgewiesen / bewusste Grenzen

- Kein Zugang zu einem konfigurierten echten Supabase-Projekt: tatsächliche E-Mail-Zustellung, PKCE-Callback mit echten Tokens, Storage-HTTP und Realtime-Auslieferung müssen dort vor Veröffentlichung abgenommen werden.
- Keine physischen iOS-/Android-/macOS-Geräte geprüft; native Flutter-Apps sind hier spezifiziert, nicht implementiert. Physische Mikrofonqualität, native Permission-Dialoge und Homescreen-Installation bleiben Geräteabnahme.
- Voice ist eine soziale Vorstellung, kein belastbarer Mensch-Nachweis. Dauerangaben untrusted Clients werden nicht anhand des Medieninhalts verifiziert.
- Feed lädt maximal 100 sichtbare Beiträge; bezahlt zugängliche Räume und automatische Bürgen-Sanktionen sind spätere Phasen.
- `hidden` ist Darstellungsunterdrückung innerhalb berechtigter Räume; keine zusätzliche Vertraulichkeitsgrenze.
- Lokale Demo-Dateien unterliegen Browser-Speicherquoten; sie werden nicht in Live-Supabase importiert.

Einrichtungs- und Live-Abnahmeschritte: [DEPLOYMENT.md](DEPLOYMENT.md). Gemeinsamer Native-Vertrag: [FLUTTER_CONTRACT.md](FLUTTER_CONTRACT.md).
