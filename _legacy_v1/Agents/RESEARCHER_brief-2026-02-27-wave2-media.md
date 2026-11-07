# Research Brief - Wave 2 (Media Pipeline Hardening)
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Harden media upload pipeline for production.
- Add authenticated auditing, quota controls, and moderation metadata.
- Introduce storage abstraction to support managed object storage.

## Key Facts (Code + Runtime)
1. Upload endpoint was authenticated but not auditable.
- Before Wave 2, uploads returned only file path and size stats.
- No DB record existed for ownership, checksum, provider, or moderation status.

2. Upload abuse controls were missing.
- No per-user daily file-count or bandwidth limits.
- Duplicate uploads created repeated files.

3. Storage path was single-provider local filesystem.
- Route wrote directly into `public/uploads`.
- No provider abstraction for managed storage.

4. Existing stack already includes Supabase SDK dependency.
- `@supabase/supabase-js` was available for optional managed storage integration.

## Risks
1. `P0` Migration risk: introducing new media table in production.
2. `P1` Upload route complexity increase can break profile/tweet/message image flows.
3. `P1` Quota logic must avoid false positives/negatives under concurrent uploads.
4. `P2` Provider misconfiguration can silently break uploads if fallback is not explicit.

## Open Questions
1. Should moderation status transition be manual admin-only, or rules-engine driven in Wave 3+?
2. Should duplicate detection be per-user only or global dedupe?

## Primary Sources (accessed 2026-02-27)
- Next.js Route Handlers:
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Prisma schema and migrations:
  - https://www.prisma.io/docs/orm/prisma-migrate
- Supabase Storage (server-side uploads):
  - https://supabase.com/docs/guides/storage/uploads/standard-uploads
- OWASP File Upload Cheat Sheet:
  - https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
