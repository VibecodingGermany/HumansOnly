# Humans Only 2.0 — project constitution

- The binding product/architecture source is MASTERPLAN_2027.md and the user’s reboot request.
- Work in this local workspace, connected to `cubetribe/HumansOnly` with base branch `main`. Never commit, push, deploy or mutate a remote database without explicit authorization. Use a topic branch and PR for releases; do not rewrite shared history.
- `_legacy_v1/` is a preserved, read-only archive of v1.18.6. Never remove its files or apply its old CI/deployment scripts to v2. `.env_new_Server` remains a private infrastructure reference; never copy its credentials into the new app.
- New runtime lives in `app/`: Next.js 15 App Router, strict TypeScript, npm, Tailwind, Radix, Supabase. No MUI, Prisma, Clerk or Turnstile.
- `supabase/` owns six core tables, RLS, storage policies and authoritative business RPCs. Web and Flutter share that contract. Demo data is explicitly local and cannot silently replace a failing production backend.
- VCG source assets are copied from the user-authorized neighboring project. Preserve originals under `app/app/styles/`, `app/app/fonts/`, and `app/public/images/karl-dieter/`.
- Use one implementation writer. Independent read-only research and validation agents may work in parallel with bounded ownership. Do not delegate further.
- Required checks in `app/`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; verify key flows on desktop/mobile and SQL behavior with an isolated database when available.
- Release law: the old manual v1 changelog is archived unchanged. V2 uses `app/package.json` as its version source, initially 2.0.0. Releases are manual: dated notes in `docs/RELEASE_<version>.md`, a matching `v<version>` tag and GitHub Release after the PR's web/SQL quality checks pass. No automatic deployment or auto-release workflow exists. Record evidence/limitations in `docs/VALIDATION.md`; the v2 reboot's release impact is major. Future version changes require a release request, not automatic changelog edits.
- Keep configuration in `app/lib/config.ts` and `.env.example`; public values only in browser bundles. No service-role key is needed by the app.
