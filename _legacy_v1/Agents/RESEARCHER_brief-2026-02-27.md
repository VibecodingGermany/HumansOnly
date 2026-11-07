# Research Brief - HumansOnly Stabilization Baseline
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Validate current state before implementation.
- Focus on: GitHub hygiene, database correctness, login path reliability, and security baseline.

## Key Facts (Measured)
1. Local app quality gates:
- `npm run lint` in `app` passes with no warnings/errors.
- `npm run build` in `app` currently fails.
  - Failure: `src/components/tweet/Retweet.tsx` imports `updateRetweets` which is no longer exported from `@/utilities/fetch`.

2. Local database status:
- Prisma schema is valid.
- `prisma migrate status` reports schema up to date (14 migrations).
- Local data currently exists (`User` count = 2, `Tweet` count = 0).

3. Local auth smoke test:
- End-to-end signup/login/verify works locally via API calls (`/api/users/create`, `/api/auth/login`, `/api/auth/verify`).

4. Server/runtime status:
- SSH access works with `root@5.182.17.148` on port `2222` using `~/.ssh/id_vibecoding`.
- `vibecoding@5.182.17.148` key login currently fails.
- PM2 process `humansonly` is online (~23d), running `next start` in `/var/www/humansonly`, serving on port `3001`.
- Nginx site `ho.nm-forum.de` proxies to `localhost:3001` and has TLS config.

5. Server Git state (`/var/www/humansonly`):
- No commits on branch `master`.
- No remote/upstream configured.
- Large uncommitted working tree.
- Additional local issue: project has root git repo and nested `app/.git` repo, creating workflow ambiguity.

6. Production database mismatch (critical):
- Live app env in `/var/www/humansonly/.env` points to:
  - `DATABASE_URL=postgresql://denniswestermann@localhost:5432/humansonly_dev?...`
- Production DB actually present on server is `humansonly_prod` (owner `humansonly_user`) with data and migration history:
  - `_prisma_migrations` count = 14
  - `User` count = 2
  - `Tweet` count = 6
- Runtime symptom:
  - `POST http://127.0.0.1:3001/api/auth/login` returns `{"success":false,"error":{"name":"PrismaClientInitializationError"...}}`.

## Main Risks
1. `P0` Authentication in production is effectively broken due to DB env misconfiguration.
2. `P0` Deployment reproducibility is missing (server repo not connected to GitHub, no clean commit history).
3. `P1` Build gate currently red locally (obsolete `Retweet` component import mismatch).
4. `P1` API CORS config is unsafe/invalid for credentialed requests (`Access-Control-Allow-Origin: *` + `Allow-Credentials: true`).
5. `P1` Upload endpoint currently has no auth gate and permits large uploads (up to 50 MB input) for any caller.
6. `P2` Auth verification flow performs network roundtrip to `/api/auth/verify` for token checks, increasing failure surface and latency.

## Open Questions
1. Single source of truth for code/deploy: root repo only, or keep nested `app/.git` intentionally?
2. Preferred deployment model: `git pull` from GitHub on server vs rsync artifact deploy?
3. Production DB credential policy: rotate/create dedicated credentials now?
4. Should public cross-origin API consumers be supported, or is app same-origin only?

## Sources (Primary, with recency)
- Git `safe.directory` behavior (git-config): https://git-scm.com/docs/git-config.html (crawled recently, published 2025)
- Git submodule forms and old-form nested `.git`: https://git-scm.com/docs/gitsubmodules (published 2025)
- Prisma migrate deploy (production guidance): https://docs.prisma.io/docs/cli/migrate/deploy (crawled last week)
- Prisma migrate command set (`status`, `deploy`, `resolve`): https://docs.prisma.io/docs/cli/migrate (crawled last week)
- Prisma prod troubleshooting/hotfix flow: https://www.prisma.io/docs/guides/migrate/production-troubleshooting
- Next.js Route Handlers docs (updated 2025-11-18): https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware
- Next.js `cookies` API (updated 2026-01-26): https://nextjs.org/docs/app/api-reference/functions/cookies
- MDN CORS credential + wildcard incompatibility: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSNotSupportingCredentials (updated 2025-07-04)
- MDN CORS header semantics: https://developer.mozilla.org/en-us/docs/web/http/cors
- MDN Set-Cookie security flags: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
- MDN secure cookie configuration: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies (updated 2026-02-11)
- OWASP Authentication Cheat Sheet (throttling/lockout): https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet (bcrypt legacy guidance): https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
