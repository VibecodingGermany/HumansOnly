# Humans Only 2.0

**Deine Leute. Deine Stimme. Dein Clubhaus.**

Ein warmes Clubhaus für echte Menschen: Freunde öffnen mit Goldenen Tickets die Tür, eine kurze eigene Stimme macht die Vorstellung persönlich, und gemeinsame Räume geben Ideen einen Platz. Los geht es mit **Vibecoding Germany**. KI als Werkzeug ist willkommen; gedankenloser Copy-Paste-Slop nicht.

Der Neustart folgt [MASTERPLAN_2027.md](MASTERPLAN_2027.md). Die frühere Anwendung `1.18.6` ist unter [`_legacy_v1/`](_legacy_v1/ARCHIVE.md) archiviert. Das vollständige lokale Archiv bleibt unverändert; ein historischer Deployment-Bericht mit kennwortähnlichen Werten ist von der erneuten Veröffentlichung ausgeschlossen. V2 hat ein neues Backend und ist keine Migration alter Benutzer oder Posts. Repository: [cubetribe/HumansOnly](https://github.com/cubetribe/HumansOnly).

## Sofort ausprobieren

Node.js 22+ und npm:

```sh
cd app
npm ci
npm run dev
```

Öffne `http://localhost:3000`. Ohne Umgebungsdatei startet der **ausdrücklich gekennzeichnete Demo-Modus** als Gastgeber Dennis. Keine Datenbank, kein Auth-Schlüssel und kein kostenpflichtiger Dienst nötig.

- `/`: Große Lobby und Vibecoding Germany, Pinwand, Mitglieder mit Voice-Intros, chronologischer Feed und Text-, Bild- oder Sprachbeiträge.
- `/invite`: Demo-Ticket `MOIN-VIBECODING` eintragen oder über den Button einsetzen.
- `/onboarding`: Namen wählen, 1–15 Sekunden aufnehmen und eintreten. Das Ticket erzeugt ein Profil, die Bürgschaft und die Raum-Mitgliedschaft zusammen.
- `/u/mira`: Voice-Intro, anklickbarer Bürge und Vertrauens-Stammbaum.
- `/tickets`: Drei Einladungsguthaben als Mango-Sticker. Beim **Ausstellen** wird ein Guthaben verbraucht; Link und QR-Code sind anschließend wiederverwendbar, bis das Ticket einmal eingelöst ist.
- Community-Check: Eine Stimme pro Mensch und Beitrag, jederzeit wechselbar. Drei Slop-Stimmen Überhang blenden den Inhalt aus; eine Wertvoll-Mehrheit vergibt ein Qualitätssiegel.

Demo-Änderungen und aufgenommene Audiodaten liegen nur im lokalen Browser-Speicher und überleben einen Reload. Die Mitglieder sind fiktiv, die illustrierten Avatare und Projektbilder Beispiele, die mitgelieferten Stimmen **synthetisch**. Der Reset im Fußbereich stellt die Demo nach ausdrücklichem Klick wieder her. Eine neue Aufnahme verwendet dein Mikrofon nur nach Browserfreigabe. Eine Stimme ist eine soziale Vorstellung, kein technischer Mensch-/Identitätsnachweis.

### Auf dem Handy / als PWA

Das Dev-Script hört auf `0.0.0.0`. Im selben WLAN kannst du die angezeigte Netzwerkadresse des Rechners öffnen. **Mikrofon und PWA-Installation benötigen einen sicheren Kontext:** `localhost` am eigenen Rechner oder vertrauenswürdiges HTTPS auf dem Handy. `npm run dev:https` startet eine lokale HTTPS-Vorschau; das Entwicklungszertifikat muss auf dem Testgerät vertrauenswürdig sein. Alternativ eine eigene HTTPS-Testumgebung verwenden.

Im UI gibt es „Dein Clubhaus als App“ samt Installationshinweis; auf iOS über Teilen → Zum Home-Bildschirm. Manifest, 192-/512-Pixel-Icons und ein maskierbares Icon sind enthalten. Der Service Worker wird nur im Produktionsbuild registriert und hält ausschließlich eine allgemeine Offline-Seite vor, keine privaten Feeds oder Medien. Für eine PWA-Prüfung `npm run build && npm start` verwenden. Ein QR-Link mit `localhost` funktioniert nicht auf einem anderen Gerät; Tickets über die erreichbare Testadresse ausstellen.

## Gemeinsames Backend für Web und Flutter

Stack: **Next.js 15.5.29 / App Router**, React, strict TypeScript, Tailwind 3 mit übernommenem VCG-Designsystem, Radix Dialog/Tabs und Supabase (`supabase-js`, `ssr`). MUI, Prisma, Clerk und Turnstile sind ausschließlich im Archiv.

Die neue Supabase-Datenbank hat genau sechs Kern-Tabellen: `profiles`, `invite_tickets`, `spaces`, `space_members`, `posts`, `content_votes`. RLS und transaktionale RPCs regeln Zugang, Ticketbudget und Abstimmungen. Auth-Konten allein gewähren noch keinen Club-Zugang. Alle drei Medien-Buckets bleiben privat.

1. Ein **neues** Supabase-Projekt verwenden.
2. [`supabase/migrations/0001_humans_only_v2_core.sql`](supabase/migrations/0001_humans_only_v2_core.sql) und [`supabase/seed.sql`](supabase/seed.sql) anwenden.
3. Einen echten Supabase-Auth-Nutzer für den ersten Gastgeber anlegen und [`supabase/bootstrap-owner.sql`](supabase/bootstrap-owner.sql) nach dessen Anleitung ausführen. Der Seed-Raum bleibt bis dahin ohne Besitzer und vergibt keine Tickets.
4. Auth-Redirects und E-Mail einrichten; Details in [Deployment](docs/DEPLOYMENT.md).
5. `app/.env.example` nach `app/.env.local` kopieren und konfigurieren:

```dotenv
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=DEIN_PUBLIC_KEY
```

App neu starten bzw. neu bauen. Fehlende Live-Konfiguration wird als Fehler gemeldet; sie schaltet **nicht** stillschweigend auf Demo um. Niemals Service-Role-Keys oder Werte aus der alten `.env_new_Server` in die Web-App kopieren. Der E-Mail-Callback und Cookie-Refresh sind implementiert. Rückkehrende Mitglieder haben einen eigenen Login-Einstieg, ohne ein neues Ticket zu benötigen.

**Für die Partner:** [Flutter/Dart-Vertrag mit Tabellen, RPCs, Auth, Storage und Design-Tokens](docs/FLUTTER_CONTRACT.md).

## Projektaufteilung

```text
app/
  app/                    Next.js-Seiten, Layout, Manifest, VCG-Styles und Fonts
  components/             Clubhaus, Voice-Recorder, Voting, Ticket-Wallet
  lib/model.ts            gemeinsame DTOs und fachliche Validierung
  lib/repositories/       Repository-Vertrag, lokale Demo, echtes Supabase
  lib/supabase/           typisierter Client und Cookie-Adapter
  public/                 Karl-Dieter, HO-Badge, PWA-Icons, Demo-Medien
  tests/                  relevante Fachlogik-Regressionstests
supabase/                 Schema/RLS/RPCs, Seed, Gastgeber-Bootstrap
  tests/                  reproduzierbarer isolierter SQL-Vertragstest
docs/                     Flutter-Vertrag, Betrieb, Architektur und Prüfnachweise
_legacy_v1/                unveränderter Altbestand inklusive alter CI/Deploy-Skripte
MASTERPLAN_2027.md         bindendes Konzept
AGENTS.md                 lokale Arbeits- und Release-Regeln
.env_new_Server           unveränderte, private Infrastruktur-Referenz
```

Die Original-VCG-Dateien, Tailwind-Konfiguration, acht Fonts und alle Karl-Dieter-Assets stammen aus dem ausdrücklich benannten Nachbarprojekt. Die lokalen Fonts sind **Anton, Barlow Condensed, Hanken Grotesk und Kalam**; sie entsprechen dem aktuellen VCG-Original. Humans-Only-spezifische CSS-Regeln stehen separat in `app/app/globals.css`.

## Qualität und Lieferstand

```sh
cd app
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Die durch Next.js gebundene alte PostCSS-Version wird gezielt auf `8.5.32` überschrieben; der Next.js-Major bleibt 15. Reproduzierbare Abhängigkeiten stehen im npm-Lockfile.

Konkrete Ergebnisse und Grenzen: [VALIDATION.md](docs/VALIDATION.md). Die Backend-SQL-Prüfung verwendet einen isolierten PostgreSQL-Cluster mit Supabase-kompatiblen Auth-/Storage-Stubs. Gehostete E-Mail-Zustellung, Storage-HTTP und Realtime müssen vor dem Livebetrieb am tatsächlichen Supabase-Projekt geprüft werden.

MVP-Grenzen: Feed liest die jüngsten 100 sichtbaren Posts; kein unendliches Archiv. Demo-Speicher hat Browser-Quoten. Synthetische Demo-Daten werden nicht nach Supabase importiert. Bezahlte Räume, Kurse, Creator-Kasse und automatische Moderationssanktionen sind spätere Phasen. `hidden` bedeutet ausgeblendeten Inhalt für berechtigte Raum-Mitglieder, keine zusätzliche Vertraulichkeitsstufe. Zugang zu fremden Räumen bleibt durch RLS gesperrt.

**Release-Auswirkung: major; Version 2.0.0.** [Release-Notizen](docs/RELEASE_2.0.0.md). Die bisherige manuelle Release-Historie bleibt im Archiv; V2 verwendet `app/package.json` als Versionsquelle. Releases werden über einen PR mit erfolgreichen Web-/SQL-Prüfungen, Versions-Tag und GitHub Release veröffentlicht. Die neue CI benötigt keine produktiven Zugangsdaten und führt kein Deployment aus. Ein GitHub Release richtet weder Supabase ein noch aktualisiert er die bisherige Produktion.
