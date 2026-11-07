# Architecture Spec - Wave 8.0 Creator Commerce Foundation

Date: 2026-03-03  
Owner: Codex (Architect)  
Input: `docs/RESEARCH_BRIEF_CREATOR_COMMERCE_2026-03-03.md`

## Objective

Deliver a production-safe creator foundation to attract artists and enable monetization rollout:

1. Artist profile + public showcase for image/audio works.
2. Support/tipping intent flow with auditable records.
3. Admin visibility for creator-economy health.
4. Preserve current auth/moderation/security controls.

## Option Analysis

1. **Full payment automation now (Connect + webhooks + payout ledger)**
   - Pros: immediate end-to-end commerce.
   - Cons: higher compliance and operational risk for current cycle.
2. **Foundation-first release in current stack (selected)**
   - Pros: low-risk, shippable quickly, measurable adoption before payment hardening.
   - Cons: payout automation deferred to follow-up wave.

## Selected Design

### Data Model

- `CreatorProfile` (1:1 with `User`)
- `CreatorPortfolioItem` (image/audio, pricing/licensing, published state)
- `CreatorTip` (support transaction ledger: status/provider/reference)

### API Surface

- `GET/POST /api/creator/profile`
- `GET/POST /api/creator/items`
- `GET /api/creator/[username]`
- `POST /api/creator/tips`

### UI Integration

- `Settings` gets “Artist Studio (Beta)” for creator profile + item publishing.
- `Profile` gets `Artist Showcase` module (public items + support buttons).
- `Admin` dashboards include creator-commerce KPIs.

### Upload Flow

- Existing `/api/upload` extended with:
  - `creator_image` (optimized image path)
  - `creator_audio` (validated audio storage path)

### Admin & Security

- Existing RBAC remains authoritative (`user`/`moderator`/`admin` + super-admin protection).
- Default super-admin identity includes `@human_ikzcsvsb`.
- Creator operations require authenticated user and validated media URLs.

## Diagram (Text)

`Artist setup in Settings -> /api/creator/profile + /api/creator/items -> Prisma models -> public /api/creator/[username] -> Profile Showcase -> user support action -> /api/creator/tips -> ledger + admin KPIs`

## Validation Plan

1. `npx prisma validate --schema src/prisma/schema.prisma`
2. `npm run lint`
3. `npm run build`
4. Manual smoke: create profile, publish image/audio item, view showcase, create support intent, verify admin KPI card.

## Follow-Up Wave (planned)

1. Stripe Connect checkout + webhook reconciliation.
2. Connected-account payout state machine.
3. Rights-claim workflow + admin dispute queue.
4. Creator sales entitlements/download tokens.
