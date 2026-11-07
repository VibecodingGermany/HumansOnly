# Builder Report - Stabilization + Clerk Integration
Date: 2026-02-27
Owner: BUILDER

## Scope Implemented
- Baseline stabilization from prior architecture spec.
- Pivoted registration/auth UX to Clerk App Router integration per latest requirement.

## Code Changes

### Auth hardening (legacy JWT path)
- Added `src/utilities/auth/cookies.ts` to centralize secure cookie settings.
- Updated:
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/users/create/route.ts`
  - `src/app/api/users/[username]/edit/route.ts`
- Improvements:
  - Request body validation
  - Correct status codes (`400`, `401`, `409`, `500`)
  - No raw internal error object leakage

### Clerk integration
- Installed `@clerk/nextjs@latest`.
- Added `src/proxy.ts` with `clerkMiddleware()` and App Router matcher.
- Added compatibility export `src/middleware.ts` -> `./proxy` (required by current runtime check in Next 14).
- Wrapped app with `ClerkProvider` and added Clerk UI controls in `src/app/layout.tsx`.
- Updated landing auth UX in `src/app/page.tsx` to use Clerk `SignUpButton`/`SignInButton`.

### Clerk to legacy session bridge
- Added `POST /api/auth/clerk/bridge` route:
  - Validates Clerk session via `auth()`
  - Upserts/creates local user mapping with `User.clerkId`
  - Issues existing JWT cookie for compatibility with current API layer
- Added client sync component `src/components/auth/ClerkAuthBridge.tsx`.

### Database
- Updated Prisma schema with `User.clerkId String? @unique`.
- Added migration:
  - `src/prisma/migrations/20260227121000_add_clerk_id_to_user/migration.sql`

### Build blocker cleanup
- Removed obsolete files causing type/build issues:
  - `src/components/tweet/Retweet.tsx`
  - `src/components/misc/RetweetIcon.tsx`

### Ops/scripts/docs
- Added `scripts/baseline-check.sh`.
- Added `scripts/auth-smoke-local.sh`.
- Updated `.env.example` with Clerk placeholders only.
- Ensured `.env.local` ignored in git.
- Updated docs:
  - root `README.md`
  - `app/README.md`
  - `docs/DEPLOYMENT.md`
  - `CHANGELOG.md`

## Runtime Ops Applied (Server)
- Corrected server DB env to production DB (`humansonly_prod`).
- Rotated `humansonly_user` database password.
- Restarted PM2 and confirmed login endpoint no longer throws Prisma init error.
