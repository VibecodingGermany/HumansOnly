# Validation Report
Date: 2026-02-27
Owner: VALIDATOR
Status: PASS

## Acceptance Criteria
1. `npm run lint` in `app` passes.
2. `npm run build` in `app` passes.
3. Prisma migration status is reachable and up to date.
4. Local auth smoke (`create -> login -> verify`) passes.
5. Clerk bridge route is wired through middleware and returns deterministic auth status.
6. Production login no longer fails with `PrismaClientInitializationError`.

## Executed Checks

### Local Quality Gates
- Command: `./scripts/baseline-check.sh`
- Result: PASS
- Evidence:
  - Lint: no warnings/errors
  - Build: successful
  - Prisma status: up to date (15 migrations)

### Local Auth Smoke (legacy JWT compatibility)
- Command: `./scripts/auth-smoke-local.sh`
- Result: PASS
- Evidence:
  - User create success
  - Login success
  - Verify payload contains created username

### Clerk Middleware Wiring
- Probe: `POST /api/auth/clerk/bridge` without Clerk session
- Result: PASS
- HTTP: `401`
- Body: `{"success":false,"message":"Unauthorized."}`

### Production Runtime Sanity
- Server DB env corrected to `humansonly_prod`.
- PM2 `humansonly` restarted and online.
- Probe: `POST http://127.0.0.1:3001/api/auth/login` with invalid credentials
- Result: PASS
- Body now returns controlled auth error, no Prisma initialization crash.

## Issues Encountered During Validation (Resolved)
1. Clerk route initially returned 500 because runtime expected middleware detection.
- Fix: added `src/middleware.ts` re-exporting `src/proxy.ts`.

2. Server DB probe initially failed through `psql` due Prisma URL query parameter handling.
- Fix: validated via URL without query for `psql`, kept Prisma URL unchanged for app.

## Residual Risks
- Production Clerk flow not deployed/validated end-to-end with real Clerk dashboard domain settings yet.
- Legacy JWT API layer remains in place; full Clerk-native API authorization migration is pending.
