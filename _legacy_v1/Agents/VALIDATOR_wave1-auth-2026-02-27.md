# Validation Report - Wave 1 (Auth Consolidation)
Date: 2026-02-27
Owner: VALIDATOR
Status: PASS

## Acceptance Criteria Results
1. Protected routes use centralized Clerk-first auth resolution.
- Result: PASS
- Evidence: direct JWT verification removed from protected route set; centralized `getAuthenticatedUser()` adopted.

2. Client no longer needs `tokenOwnerId` for core mutations.
- Result: PASS
- Evidence: live like/unlike/follow/unfollow/message-delete succeeded without `tokenOwnerId` payload.

3. Session contract is deterministic.
- Result: PASS
- Evidence:
  - unauth: `/api/auth/session` -> `token:null`
  - auth (legacy login): `/api/auth/session` -> includes username + `source:"legacy"`

4. Build and quality gates pass.
- Result: PASS
- Commands:
  - `cd app && npm run lint`
  - `cd app && npm run build`
  - `./scripts/baseline-check.sh`

5. Live domain validation matrix passes.
- Result: PASS
- Domain: `https://humans-only.de`
- Executed scenarios:
  - create/login two users
  - session contract checks (unauth/auth)
  - tweet create + like/unlike (no tokenOwnerId body)
  - follow/unfollow (no tokenOwnerId body)
  - message create (sender mismatch in body, server-auth sender enforced)
  - message delete (participants-only payload)
  - notifications read
  - upload unauth `401`, upload auth `200`

## Issues Encountered During Validation
1. Type mismatch after migration: notification sender `name/photoUrl` nullable from DB user shape.
- Resolution: normalized nullable fields to empty strings at notification payload construction sites.

## Residual Risks
- Legacy JWT APIs (`/api/auth/login`, `/api/users/create`) still intentionally present for migration fallback.
- Full removal of legacy auth surface remains future wave scope.
