# Research Brief - Wave 1 (Auth Consolidation, Clerk-first)
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Consolidate API authorization to Clerk-first session resolution.
- Keep legacy JWT compatibility as fallback.
- Remove dead legacy login/signup UI paths.
- Define a canonical session contract for frontend consumption.

## Key Facts (Code + Runtime)
1. Protected API routes were previously coupled to legacy JWT cookies.
- `verifyJwtToken` + `cookies().get("token")` was directly used across tweets, messages, users, notifications, and upload routes.
- This created dual-auth state risk when Clerk state and legacy token drifted.

2. Client mutations were sending `tokenOwnerId` in request bodies.
- Like/repost/follow/delete/message delete flows passed user identity from client payload.
- Even with server checks, this is a weaker contract than server-derived identity.

3. Clerk bridge already existed and could provision DB users by `clerkId`.
- Existing route `POST /api/auth/clerk/bridge` created/linked a DB user and wrote a legacy token cookie.
- Provisioning logic was route-local and not reusable by other APIs.

4. Live-domain baseline (post v1.2.3) was stable before Wave 1 changes.
- Signup/login working.
- Upload auth gate working (`401` unauthenticated).
- Like/unlike + follow/unfollow + message endpoints functional.

## Risks
1. `P0` Breaking protected routes during auth migration could block core social actions.
2. `P1` Inconsistent session shape could break `useAuth()` dependent components.
3. `P1` Nullability mismatch for notification sender fields can fail type/build checks.
4. `P2` Keeping dead legacy UI code increases maintenance surface and confusion.

## Open Questions
1. Should legacy JWT login/signup APIs remain permanently as emergency fallback, or be sunset in Wave 2+?
2. Should session endpoint include `clerkId` for observability/debug, or keep strict user-profile shape only?

## Primary Sources (accessed 2026-02-27)
- Clerk Next.js quickstart (App Router):
  - https://clerk.com/docs/quickstarts/nextjs
- Clerk `auth()` and server-side session access:
  - https://clerk.com/docs/reference/nextjs/app-router/auth
- Next.js Route Handlers:
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js cookies API:
  - https://nextjs.org/docs/app/api-reference/functions/cookies
- OWASP Session Management Cheat Sheet:
  - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
