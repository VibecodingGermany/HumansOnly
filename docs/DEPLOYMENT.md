# Humans Only 2.0 — Einrichtung und Betrieb

Stand 2026-11-04. Dieses Dokument beschreibt die **neue** Anwendung. Die ursprüngliche VPS-/Nginx-/PM2-Anleitung bleibt unverändert unter [`../_legacy_v1/docs/DEPLOYMENT.md`](../_legacy_v1/docs/DEPLOYMENT.md); `.env_new_Server` bleibt unverändert im Projekt-Root und ist ignoriert. Ihre Zugangsdaten und alten Migrations-/Deploy-Skripte gehören nicht in V2.

## Lokaler Modus

`cd app && npm ci && npm run dev`. Demo ist Standard, Daten bleiben im Browser. `npm run dev:https` für sichere lokale Aufnahmen auf einem Testgerät; dem Entwicklungszertifikat muss das Gerät vertrauen. Alternativ eigenen HTTPS-Testhost verwenden. Auf localhost am Rechner ist das Mikrofon auch per HTTP verfügbar.

## Neue Supabase-Instanz

1. Neues Projekt erstellen. Auth, PostgreSQL und Storage sind gemeinsame Infrastruktur für Web/Flutter.
2. Migration `supabase/migrations/0001_humans_only_v2_core.sql` anwenden, danach `supabase/seed.sql`. Nicht gegen die Legacy-Datenbank ausführen.
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

Hinter eigenem HTTPS-Reverse-Proxy betreiben. `npm start` verwendet den vollständigen Build im Checkout einschließlich `public/` und `.next/`. Keine Legacy-Clerk-/Prisma-Startskripte starten.

Manifest, Icons und Service Worker werden unter `/` bereitgestellt. `/sw.js` darf nicht langfristig gecacht werden; dafür sind Header gesetzt. Authentifizierte Seiten erhalten im Supabase-Modus `Cache-Control: private, no-store`. Der Service Worker cached nur `/offline.html`, keine App-Seiten, Supabase-Responses oder privaten Medien.

## Abnahme vor Livebetrieb

Lokal geprüftes SQL ist nicht dasselbe wie ein gehosteter Integrationstest. Am tatsächlichen Projekt einmal durchführen:

- Erstgast: gültiges Ticket → E-Mail → Callback in neuem Tab → eigene Aufnahme → Profil + Zielraum; erneute Einlösung muss scheitern.
- Bestandsmitglied: Logout/Login ohne neues Ticket; ungültiger/abgelaufener Link zeigt Fehler.
- Zwei getrennte Clients: Post/Vote und Realtime-Status, fremder Raum und dessen Medien bleiben gesperrt.
- Safari/iOS und Android: Audioformat, Permission-Abbruch, 15-/60-Sekunden-Stopp, Playback, QR-Link und PWA-Installation.
- Supabase Auth-Rate-Limits, E-Mail-Zustellung, Backups und vertrauenswürdige Wartung für nicht referenzierte Uploads passend zum Betrieb konfigurieren. Keine falschen Identitäts-/Anti-Bot-Garantien aus Voice-Aufnahmen ableiten.

`can_invite=false` für ein Profil entzieht dessen Ausgabe- und Einlöserechte auch für bestehende Tickets. Das setzt nur eine vertrauenswürdige Administration, keine Browser-Komponente. Automatische Sanktionen und ein Admin-UI sind nicht Teil des Durchstichs.

Es wurde für diesen Auftrag **kein externer Dienst geändert und nichts veröffentlicht**. Das Archiv ist vollständig vorhanden; es gibt kein automatisches Upgrade alter Konten. Eine Veröffentlichung braucht eine separate Entscheidung über neue Infrastruktur und Datenübernahme.
