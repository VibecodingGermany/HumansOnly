# Architecture Spec - Stabilization Iteration 1
Date: 2026-02-27
Owner: ARCHITECT

## Goal for This Iteration
Establish a stable baseline before feature work:
1. Git/GitHub workflow is deterministic.
2. DB connectivity is verified and points to production DB in production runtime.
3. Login/signup path is runnable and testable.
4. Project remains buildable at every step.

## Options Considered
### Option A: Minimal hotfix only
- Fix server `.env` DB URL + patch compile error.
- Pros: fastest.
- Cons: no guardrails, regressions likely, no repeatable validation.

### Option B (Chosen): Baseline hardening + ops guardrails
- Fix blocking runtime/build issues.
- Add small smoke-validation scripts and consistent auth response/cookie behavior.
- Clarify deploy source-of-truth and server checks.
- Pros: still small diffs, but future work safer.
- Cons: slightly more upfront work.

### Option C: Full auth rewrite (e.g. NextAuth/Auth.js)
- Pros: modern auth framework.
- Cons: too risky/large for stabilization phase.

## Selected Design
### System Diagram (as text)
[Developer Root Repo]
  -> (changes in `app/` + docs/scripts)
  -> [Validation Gates: lint/build/prisma/auth-smoke]
  -> [Deploy Sync: app/ -> /var/www/humansonly]
  -> [PM2 process humansonly]
  -> [Next.js Route Handlers]
  -> [Prisma Client]
  -> [PostgreSQL humansonly_prod]
  -> [Nginx TLS reverse proxy ho.nm-forum.de]

### Module Decisions
1. Auth route hardening:
- Keep existing custom JWT approach.
- Normalize status codes and error payloads (no raw internal error object leaks).
- Use consistent secure cookie options in every token write path.

2. Build consistency:
- Remove obsolete Retweet legacy component files from compilation (Repost path is canonical).

3. Ops validation:
- Add lightweight scripts for:
  - local baseline checks (`lint`, `build`, Prisma status)
  - local auth smoke (`create -> login -> verify`)
- Keep scripts shell-based to avoid new runtime dependencies.

4. Production DB alignment:
- Runtime must use `humansonly_prod` connection string.
- Validate by calling login endpoint and ensuring no Prisma initialization failure.

5. GitHub cleanup policy (for now):
- Root repo is canonical source of truth.
- Server runtime directory is deployment target, not authoritative git history.
- No server-side push/pull automation in this iteration.

## Interfaces
### New scripts
- `scripts/baseline-check.sh`
  - Runs lint/build/migrate status in `app`.
  - Non-zero exit on first failure.
- `scripts/auth-smoke-local.sh`
  - Requires local app on `http://localhost:3000`.
  - Executes user create/login/verify sequence.

### Route behavior changes
- `POST /api/auth/login`
  - 400 for malformed input.
  - 401 for bad credentials.
  - 500 generic message on server error.
- `POST /api/users/create`
  - 400 for invalid payload.
  - 409 if username exists.
  - 500 generic message on server error.
- `POST /api/users/[username]/edit`
  - token cookie rewritten with secure options (`httpOnly`, `sameSite`, `secure`, `maxAge`).

## Security Decisions (Iteration 1)
- Prevent internal error leakage in auth/user creation endpoints.
- Ensure auth cookie flags are consistently secure.
- Defer rate limiting and CSRF hardening to Iteration 2 after baseline pass.

## Planned File Tree Delta
- `app/src/app/api/auth/login/route.ts` (harden)
- `app/src/app/api/users/create/route.ts` (harden)
- `app/src/app/api/users/[username]/edit/route.ts` (cookie consistency)
- `app/src/utilities/auth/*` (optional helper extraction)
- `app/src/components/tweet/Retweet.tsx` (remove)
- `app/src/components/misc/RetweetIcon.tsx` (remove)
- `scripts/baseline-check.sh` (new)
- `scripts/auth-smoke-local.sh` (new)
- `README.md` / `docs/DEPLOYMENT.md` (small updates)

## Acceptance Criteria for VALIDATOR
1. `npm run lint` in `app` passes.
2. `npm run build` in `app` passes.
3. `cd app/src && npx prisma migrate status` reports reachable + up-to-date locally.
4. Local auth smoke passes (`create`, `login`, `verify`).
5. On server, login endpoint no longer returns `PrismaClientInitializationError`.
6. PM2 `humansonly` remains `online` after config correction.
