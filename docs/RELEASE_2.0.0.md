# Humans Only 2.0.0 — Dein Clubhaus

Release-Datum: **2026-11-07**. Release-Auswirkung: **major**. Versionsquelle: `app/package.json`.

Humans Only startet als Clubhaus mit Einladungen, persönlichen Voice-Intros und gemeinsamen Räumen neu. Der frühere Twitter-Klon ist unter `_legacy_v1/` archiviert; die bestehende Git-Historie bleibt erhalten. Alle 376 ursprünglich getrackten Dateien sind im lokalen Archiv bytegenau erhalten. Ein historischer Bericht (`Agents/BUILDER_deployment-report.md`) enthält kennwortähnliche Werte und bleibt ausschließlich im lokalen Archiv; er wird nicht erneut veröffentlicht. Seine frühere Git-Historie wurde nicht umgeschrieben.

## Neu

- Mobile-First-PWA auf Next.js 15 mit strict TypeScript, Tailwind und Radix; originale VCG-Tokens, Fonts, Karl-Dieter und Humans-Only-Badge.
- Goldene Tickets mit Copy-Link und QR-Code, einmaliger Einlösung, drei Einladungsguthaben und 15-Sekunden-Voice-Onboarding.
- Große Lobby und Vibecoding-Germany-Raum mit Pinwand, Mitglieder-Stimmen und chronologischem Text-, Bild- und Sprach-Feed.
- Community-Abstimmung mit eindeutigen Stimmen, korrigierten Zählern bei Stimmenwechsel sowie Ausblenden und Rehabilitieren von Beiträgen.
- Profile mit Voice-Intro, Bürgschaft und verlinktem Vertrauens-Stammbaum.
- Sofort lauffähige lokale Demo; separates echtes Supabase-Repository mit Auth-Callback und privaten Medien.
- Sechs Supabase-Kerntabellen, RLS, transaktionale RPCs, Seed-Raum und expliziter Gastgeber-Bootstrap.
- Gemeinsamer [Flutter/Dart-Vertrag](FLUTTER_CONTRACT.md), [Einrichtungsanleitung](DEPLOYMENT.md) und [Prüfnachweise](VALIDATION.md).

## Breaking Changes und Einrichtung

Die bisherigen MUI-/Prisma-/Clerk-/Turnstile-Integrationen und v1-API-Verträge werden nicht weitergeführt. Es gibt keine automatische Migration alter Accounts, Beiträge oder Datenbanken. Ein neues Supabase-Projekt gemäß `docs/DEPLOYMENT.md` einrichten und anschließend den Live-Modus ausdrücklich konfigurieren.

Zum lokalen Ausprobieren: Node.js 22+, in `app/` zuerst `npm ci`, dann `npm run dev`. Ohne Live-Konfiguration läuft die gekennzeichnete Demo. Demo-Ticket: `MOIN-VIBECODING`.

Die aktiven GitHub Actions prüfen ausschließlich V2. Alte CI-/Deployment-Skripte bleiben im Archiv. Dieses Quellcode-Release löst kein Produktionsdeployment aus.

## Validiert

- Am 2026-11-07 erneut erfolgreich: Lint, strict Typecheck, 10 Fachlogiktests und Produktionsbuild.
- 51 isolierte PostgreSQL-Prüfungen für RLS, RPCs, Storage-Policies, Ticketbudget und konkurrierende Vorgänge.
- 24 dokumentierte Chromium-Browserprüfungen vom 2026-11-04, einschließlich mobiler Abläufe, synthetischer Audioaufnahme und PWA-Offline-Seite.
- `npm audit --omit=dev`: keine bekannten Schwachstellen bei der Release-Prüfung.
- GitHub-CI prüft Web und SQL auf Linux vor der Freigabe.

## Bekannte Grenzen

Ein gehostetes Supabase-Projekt wurde mangels Zugangsdaten noch nicht geprüft: E-Mail-Zustellung, PKCE mit echten Tokens, Storage-HTTP und Realtime benötigen eine Live-Abnahme. Physische Mobilgeräte, echte Mikrofonqualität und Homescreen-Installation sind ebenfalls noch abzunehmen. Die Flutter-Clients sind spezifiziert, nicht Bestandteil dieses Releases.

Der Feed lädt höchstens 100 Beiträge. Bezahlte Räume und automatische Bürgen-Sanktionen folgen später. Eine Stimme ist eine soziale Vorstellung, kein technischer Mensch-Nachweis. `hidden` blendet Inhalte innerhalb berechtigter Räume aus; es ist keine zusätzliche Vertraulichkeitsgrenze.
