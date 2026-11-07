# Architecture Spec - Wave 1 (Clerk-first Auth Consolidation)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
Use a single server-side auth resolver for all protected APIs:
1. Prefer Clerk session (`auth()`) when present.
2. Fallback to legacy JWT cookie only for compatibility.
3. Remove client-supplied identity (`tokenOwnerId`) from authorization decisions.

## Options Considered
### Option A: Full immediate removal of legacy JWT
- Pros: clean final-state auth model.
- Cons: high migration risk; breaks existing operational tooling and fallback flows.

### Option B (Chosen): Clerk-first + legacy JWT fallback bridge
- Pros: safer rollout, minimal user disruption, supports partial migration.
- Cons: temporary dual stack remains.

### Option C: Keep current dual model with route-by-route checks
- Pros: minimal code churn.
- Cons: continues identity drift/race risk and inconsistent route behavior.

## Selected Design
### Diagram-as-Text
[Client]
  -> [Protected API Route]
      -> `getAuthenticatedUser()`
          -> try Clerk `auth()`
              -> resolve/create DB User by `clerkId`
          -> else fallback JWT cookie -> verify -> DB User lookup
      -> route-level authorization from resolved user (id/username)
      -> Prisma mutations/queries

### Module Decisions
1. Add centralized auth utility:
- `src/utilities/auth/session.ts`
- Exposes:
  - `getAuthenticatedUser()`
  - `getOrCreateUserByClerkId()`
  - `unauthorizedResponse()`

2. Canonical session endpoint:
- `GET /api/auth/session` now returns resolved user from central utility.
- Response includes `source` to expose `clerk|legacy|null` for observability.

3. API authorization strategy:
- Protected routes stop trusting body-level `tokenOwnerId`.
- Identity is derived server-side from resolved authenticated user.

4. Bridge reuse:
- `POST /api/auth/clerk/bridge` reuses shared Clerk user provisioning logic.

5. Frontend contract cleanup:
- Remove `tokenOwnerId` from fetch utility payloads for like/repost/follow/delete conversation/delete tweet.
- Keep optimistic UI locally, but auth identity remains server-owned.

## Interface Notes
- `AuthenticatedUser` includes core profile fields and `authSource`.
- Session endpoint response:
  - unauth: `{ success: true, token: null, source: null }`
  - auth: `{ success: true, token: <UserLike>, source: "clerk"|"legacy" }`

## Security Decisions
- Authorization decisions are server-derived, not client-asserted.
- Unauthorized responses normalized to status `401` via helper.
- Clerk-first provisioning ensures APIs work even before explicit bridge sync call.

## Acceptance Criteria
1. All protected routes use central Clerk-first resolver.
2. Core actions work without sending `tokenOwnerId` payload.
3. Build/lint/baseline pass.
4. Live-domain E2E matrix passes (auth/session, tweets, follows, messages, notifications, upload).
