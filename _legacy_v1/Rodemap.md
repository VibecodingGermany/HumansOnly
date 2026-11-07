# Humans Only - Rodemap

Last updated: 2026-03-03  
Owner: Codex + Dennis  
Current app version: `1.18.1`

## Goal
Build Humans Only into a production-grade, humans-only social network with enforceable authenticity controls, moderator tooling, and reliable production operations.

## Current Status Snapshot
- Waves `0-6`: completed and validated in production hardening cycles.
- Wave `7` (Human Authenticity): actively advanced, core foundation is working in production code.
- Latest completed milestone:
  - adaptive challenge enforcement (`trusted` fallback to `pending_review`)
  - explicit block responses (`403 authenticity_blocked`)
  - appeals hardening slice:
    - inline appeal composer (no prompt UX)
    - SLA-aware moderator queue metadata (`slaDueAt`, `slaState`)
    - challenge + appeal + moderator decision throttle/anomaly events
- Mandatory validation gate remains:
  - lint
  - build
  - Prisma validate + migration status
  - smoke scripts (including `human-layer-smoke.sh`)

## Wave-by-Wave Delivery Status

### Wave 0 - Stabilization and Security Baseline
Status: `completed`

### Wave 1 - Auth Consolidation (Clerk-first)
Status: `completed`

### Wave 2 - Media Pipeline Hardening
Status: `completed`

### Wave 3 - Messaging and Notifications Reliability
Status: `completed`

### Wave 4 - Product Completion (Core UX)
Status: `completed`

### Wave 5 - Operations, Quality, and Observability
Status: `completed`

### Wave 6 - Live Validation and Hardening Loop
Status: `completed` (with follow-up hardening loops as needed)

### Wave 7 - Human Authenticity Foundation and Enforcement
Status: `in_progress` (advanced)

Delivered:
- Rules + acceptance flow (`/rules`, `/api/rules/current`, `/api/rules/accept`)
- Human challenge verification (`/api/human/challenge/verify`) with replay/TTL checks
- Turnstile integration in create/reply/edit composer flows
- Human gate on create/edit/reply/upload
- Trust snapshot API (`/api/me/trust`)
- Authenticity moderation queue (`/api/moderation/authenticity*`)
- Adaptive trusted fallback:
  - low-trust: fail-closed
  - trusted/high_trust: fail-open only into `pending_review`
- Explicit `block` behavior (`403`, `authenticity_blocked`)
- Initial provenance metadata persistence on uploaded media
- Appeals foundation:
  - user endpoints (`/api/me/authenticity`, `/api/authenticity/appeals`)
  - moderator appeal queue + decisions (`/api/moderation/authenticity/appeals*`)
  - Settings UI sections for user appeal submission and moderator appeal handling

Still open in Wave 7:
- Moderator SOP ownership + escalation playbook
- Shared/distributed rate limiting (current approach is in-memory per runtime)
- Richer appeal evidence model (attachments + structured claims)

### Wave 8 - Creator Commerce + Provenance + Trust Expansion
Status: `in_progress`

Delivered in 8.0:
- Creator commerce foundation:
  - Artist Studio (creator profile + portfolio publishing)
  - public Artist Showcase on profile pages
  - support/tip intent ledger + admin creator commerce KPI visibility
  - upload support for creator image/audio media types

Delivered in 8.1 hardening slice:
- Post delete reliability hardening (prevents false 404 on slug mismatch).
- Structured error responses on core tweet read endpoints.
- Admin dashboard clarity upgrade (queue severity, KPI status rows, quick actions).

Planned (next slices):
- Stripe Connect checkout/payout automation for creator support
- rights/dispute moderation workflow for creator sales
- Full C2PA/content-credentials parsing and verification chain
- Neutral provenance badges in UI (`verified`, `unknown`, `invalid`)
- Passkey/WebAuthn signal integration into trust scoring (currently placeholder `passkeyEnrolled=false`)

### Wave 9 - Moderation Automation + Compliance
Status: `not started`

Planned:
- Calibration loop for thresholds using moderator outcomes
- Appeals SLA tracking and queue prioritization
- Compliance flows (incl. transparency/labeling obligations by August 2, 2026)
- Controlled rollout strategy (`10% -> 50% -> 100%`) with safety metrics

## Immediate Next Priorities
1. Finalize moderator SOP ownership and escalation playbook on top of delivered appeal SLA metadata.
2. Integrate passkey signal from Clerk into trust engine and adaptive challenge frequency.
3. Replace lightweight provenance heuristics with proper C2PA verification path.
4. Upgrade abuse controls from in-memory to shared-store throttling for multi-instance safety.
5. Extend admin dashboard from snapshot view to full moderation case workspace.

## Versioning and Release Policy
- Every meaningful milestone updates:
  - `app/package.json` version
  - `app/src/version.ts`
  - `app/version`
  - changelogs
- Only validated milestones are committed/pushed.
- Pushes remain gated by explicit confirmation.
