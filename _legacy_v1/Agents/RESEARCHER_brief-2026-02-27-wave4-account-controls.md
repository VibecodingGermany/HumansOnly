# Research Brief - Wave 4 (Account Controls + Visibility)
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Add robust account control primitives: private profiles, DM privacy, block, mute, report.
- Enforce visibility and interaction constraints across feed/search/profile/tweet APIs.
- Expose account controls through settings and profile UX.

## Key Facts
1. The product lacked account-level safety controls.
- No first-party block/mute/report endpoints.
- No server-enforced account privacy model for profile feeds.

2. Privacy had no data-model representation.
- `User` did not contain `isPrivate` or message privacy state.
- DM creation had no consistent follower-only gate.

3. Content visibility enforcement was inconsistent.
- Read APIs (`tweets/all`, `search`, profile tweets) did not filter blocked/muted/private relationships.
- Interaction APIs (`like`, `retweet`, `reply`) accepted operations without cross-account relationship checks.

## Risks
1. `P0` Missing server-side authz checks can leak private/blocked content even if frontend hides it.
2. `P1` Partial filtering (feed but not search/single tweet) causes bypass vectors and inconsistent UX.
3. `P1` New account-control models require migration safety on production data.

## Open Questions
1. Should private-account follow requests require approval (future feature), or remain immediate follow for now?
2. Should blocked accounts be fully hidden at profile level or visible with a restricted shell?
3. Should report reasons be standardized enum-only in future moderation tooling?

## Primary Sources (accessed 2026-02-27)
- Prisma schema relations and migration patterns:
  - https://www.prisma.io/docs/orm/prisma-schema/data-model/relations
  - https://www.prisma.io/docs/orm/prisma-migrate
- Next.js Route Handlers (server-side enforcement points):
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- OWASP authorization guidance:
  - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
