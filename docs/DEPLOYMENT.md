# Humans Only 2.0 — Einrichtung und Betrieb

Stand 2026-11-07. Dieses Dokument beschreibt die **neue** Anwendung. Die ursprüngliche VPS-/Nginx-/PM2-Anleitung bleibt unverändert unter [`../_legacy_v1/docs/DEPLOYMENT.md`](../_legacy_v1/docs/DEPLOYMENT.md); `.env_new_Server` bleibt unverändert im Projekt-Root und ist ignoriert. Ihre Zugangsdaten und alten Migrations-/Deploy-Skripte gehören nicht in V2.

## Lokaler Modus

`cd app && npm ci && npm run dev`. Demo ist Standard, Daten bleiben im Browser. `npm run dev:https` für sichere lokale Aufnahmen auf einem Testgerät; dem Entwicklungszertifikat muss das Gerät vertrauen. Alternativ eigenen HTTPS-Testhost verwenden. Auf localhost am Rechner ist das Mikrofon auch per HTTP verfügbar.

## Neue Supabase-Instanz

1. Neues Projekt erstellen. Auth, PostgreSQL und Storage sind gemeinsame Infrastruktur für Web/Flutter.
2. Migrationen `supabase/migrations/0001_humans_only_v2_core.sql` und `0002_waitlist.sql` in dieser Reihenfolge anwenden, danach `supabase/seed.sql`. Nicht gegen die Legacy-Datenbank ausführen.
3. Für den ersten Gastgeber einen echten Auth-Account im Dashboard erstellen bzw. per Login anlegen. Mit administrativer DB-Verbindung `supabase/bootstrap-owner.sql` und den dort genannten `psql -v`-Argumenten ausführen. Seed zuerst; derselbe Owner ist wiederholbar, ein anderer Owner wird zurückgewiesen. Der Scriptaufruf zeigt keine DB-Passwörter im Beispiel.
4. In Supabase Auth den gewünschten Site URL setzen und exakte Redirect-URLs erlauben, z. B. `https://club.example.org/auth/callback` und für lokale Tests `http://localhost:3000/auth/callback`. Keine beliebigen Redirect-Wildcards nötig.
5. Für PKCE-Magic-Links das Supabase-Mailtemplate mit `{{ .ConfirmationURL }}` verwenden. Wer alternativ den sichtbaren E-Mail-Code-Einstieg nutzt, ergänzt im Template `{{ .Token }}`. Supabase Mail/SMTP, Versandlimits und Bestätigung am echten Projekt prüfen. Die UI unterstützt einen wiederkehrenden Member-Login ohne neues Ticket. Ausstehende Tickets werden maximal eine Stunde browserlokal vorgemerkt; bei einem anderen Gerät muss der Code erneut eingegeben werden.
6. Native Redirect-URLs nur für die tatsächlichen Flutter-Clients freigeben. Siehe Flutter-Vertrag.
7. Alle drei Buckets sind privat, Policies entstehen mit der Migration. Keine Public-Schaltung. `posts` wird zur vorhandenen Standard-Publication `supabase_realtime` hinzugefügt. Realtime im tatsächlichen Projekt prüfen.

## Web-Konfiguration

`app/.env.example` als `app/.env.local` kopieren. `NEXT_PUBLIC_DATA_MODE=supabase`, URL und Publishable Key setzen. Die App benötigt keinen Service-Role-Key. Ein Publishable Key ist öffentlich; Schutz kommt aus Auth, RLS und RPC-Prüfungen. Fehlende Live-Konfiguration verhindert den Start/Build, statt Demo-Daten anzuzeigen.

`NEXT_PUBLIC_*` wird beim Build festgelegt. Nach einer Änderung neu bauen. Für produktiven Betrieb Node.js 22+ verwenden:

```sh
cd app
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Hinter eigenem HTTPS-Reverse-Proxy betreiben. Der Auth-Callback antwortet mit festen relativen `Location`-Pfaden (`/onboarding` bzw. `/invite?auth_error=1`), damit der Browser auf seiner öffentlichen Domain bleibt. Interne Request-Hosts und weitergereichte Host-Header bestimmen diese Ziele nicht. `npm start` verwendet den vollständigen Build im Checkout einschließlich `public/` und `.next/`. Keine Legacy-Clerk-/Prisma-Startskripte starten.

Manifest, Icons und Service Worker werden unter `/` bereitgestellt. `/sw.js` darf nicht langfristig gecacht werden; dafür sind Header gesetzt. Authentifizierte Seiten erhalten im Supabase-Modus `Cache-Control: private, no-store`. Der Service Worker cached nur `/offline.html`, keine App-Seiten, Supabase-Responses oder privaten Medien.

## Abnahme vor Livebetrieb

Lokal geprüftes SQL ist nicht dasselbe wie ein gehosteter Integrationstest. Am tatsächlichen Projekt einmal durchführen:

- Erstgast: gültiges Ticket → E-Mail → Callback in neuem Tab → eigene Aufnahme → Profil + Zielraum; erneute Einlösung muss scheitern.
- Bestandsmitglied: Logout/Login ohne neues Ticket; ungültiger/abgelaufener Link zeigt Fehler.
- Zwei getrennte Clients: Post/Vote und Realtime-Status, fremder Raum und dessen Medien bleiben gesperrt.
- Safari/iOS und Android: Audioformat, Permission-Abbruch, 15-/60-Sekunden-Stopp, Playback, QR-Link und PWA-Installation.
- Supabase Auth-Rate-Limits, E-Mail-Zustellung, Backups und vertrauenswürdige Wartung für nicht referenzierte Uploads passend zum Betrieb konfigurieren. Keine falschen Identitäts-/Anti-Bot-Garantien aus Voice-Aufnahmen ableiten.

## Warteliste und Admin-Bereich

`/warteliste` ist öffentlich: Name, E-Mail und Einwilligung. `/admin` zeigt Admins (`private.admins`) offene, freigegebene und abgelehnte Einträge. „Freigeben & einladen“ stellt ein Goldenes Ticket aus und verschickt die Einladung direkt; „Alle offenen einladen“ arbeitet die Liste nacheinander ab. Jeder erfolgreiche Versand wird protokolliert (`invited_at`, `invite_count`).

Der Versand läuft serverseitig über `POST /api/admin/waitlist/invite` und denselben SMTP-Zugang, den Vibecoding Germany und Supabase-Auth nutzen. Die Route handelt mit der Sitzung der angemeldeten Person; Admin-Rechte prüft die Datenbank. Dafür in der `.env.production` des Releases auf dem VPS **ohne** `NEXT_PUBLIC_`-Präfix setzen: `SITE_URL=https://humans-only.de`, `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS oder 465 TLS), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (z. B. `Humans Only <noreply@vibecoding-germany.de>`), optional `SMTP_REPLY_TO`. Die Werte werden zur Laufzeit gelesen; nach Änderung den PM2-Prozess neu starten. Zugangsdaten nie ins Repository. Ohne diese Werte fällt der Admin-Bereich auf „Mail schreiben“ (eigenes Mailprogramm) und „Link kopieren“ zurück. Versandlimits des SMTP-Anbieters beachten; bei einem Fehler bricht „Alle einladen“ ab und meldet, wie viele raus sind.

**Reihenfolge am bestehenden Live-Projekt:** zuerst `0002_waitlist.sql` anwenden (macht den vorhandenen Gastgeber automatisch zum Admin), danach die neue Web-Version ausrollen. Die neue Web-Version ruft `is_admin()` beim Laden auf und funktioniert ohne Migration nicht. Weitere Admins nur per vertrauenswürdiger DB-Verbindung: `insert into private.admins(user_id) values('<profil-uuid>');`.

`can_invite=false` für ein Profil entzieht dessen Ausgabe- und Einlöserechte auch für bestehende Tickets. Das setzt nur eine vertrauenswürdige Administration, keine Browser-Komponente. Automatische Sanktionen und ein Admin-UI sind nicht Teil des Durchstichs.

## Produktiver Stand — 2026-11-07

Der ausdrücklich freigegebene Release **v2.0.0** mit dem Callback-Fix aus PR #4 (Main-Commit `39a73b0fbc0c9faeb9a9a5eefa53d8f224bb400a`, gebauter Quellstand `6a473be5491b3d7572142feee049512d47379e59`) läuft unter [humans-only.de](https://humans-only.de) und [ho.nm-forum.de](https://ho.nm-forum.de). Das dedizierte Supabase-Projekt `humans-only-v2` in der Organisation Nerdsmiths liegt in Frankfurt (`eu-central-1`). Migration und Seed sind angewendet; der erste Gastgeber `dennis` besitzt den Raum Vibecoding Germany und drei Einladungstickets. Es wurden keine V1-Konten oder Demo-Daten übernommen.

Auth verwendet `https://humans-only.de` als Site URL. Die beiden exakten Callback-URLs sind `https://humans-only.de/auth/callback` und `https://ho.nm-forum.de/auth/callback`. Bestätigungs- und Anmeldemails enthalten `{{ .ConfirmationURL }}` und `{{ .Token }}`. Der ausdrücklich freigegebene vorhandene SMTP-Zugang von Vibecoding Germany ist ausschließlich in Supabase hinterlegt; Absender ist `Humans Only <noreply@vibecoding-germany.de>`. Das anfängliche Versandlimit beträgt 30 E-Mails pro Stunde. Es wurden keine SMTP-Zugangsdaten in Repository oder App übernommen.

Die App liegt auf dem bestehenden VPS unter `/var/www/humansonly-v2/releases/6a473be/app`. PM2 startet `humansonly-v2-authfix` mit der separat installierten Node.js 22.23.4 auf `127.0.0.1:3219`; der System-Node bleibt unverändert. Die drei öffentlichen Build-Werte stehen in `.env.production` dieses Releases. Beide Nginx-Domains leiten auf diesen Prozess und dessen Next-Static-Verzeichnis. Die PM2-Prozessliste ist gespeichert.

Der vorherige V2-Prozess `humansonly-v2` auf Port 3218 bleibt erhalten. Seine Nginx-Sicherung liegt unter `/var/www/humansonly-v2/backups/nginx-humansonly.before-callback-6a473be.conf`; dieser Stand enthält den inzwischen behobenen Callback-Fehler.

Rückkehr zu V1: Die vorherige Nginx-Konfiguration liegt unter `/var/www/humansonly-v2/backups/nginx-humansonly.before-v2.conf`. Der bisherige PM2-Prozess `humansonly` und `/var/www/humansonly` bleiben für eine Rückkehr erhalten. Vor Wiederherstellung den aktuellen Konfigurationsstand prüfen, die Sicherung nach `/etc/nginx/sites-available/humansonly` kopieren, `nginx -t` erfolgreich ausführen und erst dann Nginx neu laden. Dies stellt V1 bereit; V2-Daten bleiben in ihrem separaten Supabase-Projekt erhalten.

Prüfnachweise und verbleibende Geräte-/Mail-Abnahme: [VALIDATION.md](VALIDATION.md).
