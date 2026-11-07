# Architecture Spec - Wave 7.3 Appeals Hardening

Date: 2026-03-03  
Owner: Codex (Architect)  
Input: `docs/RESEARCH_BRIEF_2026-03-03.md`

## Objective

Deliver the next production slice that raises user trust and moderation quality without destabilizing the app:

1. Better user appeal UX (no prompt-based text capture).
2. SLA-aware moderation queue (priority signals in API + admin surfaces).
3. Stronger anti-abuse controls and anomaly logging on challenge/appeal decision paths.
4. Route/API docs synchronized with concrete contracts.

## Options Considered

1. Full workflow engine now (dedicated queue service + background jobs + persisted incident stream).
   - Pros: strongest long-term control.
   - Cons: high migration risk and infra overhead for this cycle.
2. Incremental hardening in current stack (Next.js routes + Prisma + typed fetch + ops docs). **Selected**
   - Pros: low-risk, fast, buildable in small diffs.
   - Cons: some limits remain (in-memory limiter not multi-node global).

## Selected Architecture

### Module Changes

1. `app/src/app/api/authenticity/appeals/route.ts`
   - Keep submission endpoint but strengthen abuse controls (multi-window limits + anomaly events).
2. `app/src/app/api/moderation/authenticity/appeals/route.ts`
   - Add derived SLA fields per appeal (`slaDueAt`, `slaState`, `slaRemainingMinutes`).
   - Sort queue by SLA urgency then recency.
3. `app/src/app/api/moderation/authenticity/appeals/[id]/decision/route.ts`
   - Add per-moderator decision rate limit and anomaly logging for bursts.
4. `app/src/app/api/moderation/authenticity/[id]/decision/route.ts`
   - Apply same decision-side abuse protections for non-appeal authenticity decisions.
5. `app/src/utilities/security/*`
   - Add shared structured security event logger utility for throttle/anomaly events.
6. `app/src/app/(twitter)/settings/page.tsx`
   - Replace `window.prompt(...)` appeal path with inline composer (textarea + clear action).
7. `app/src/app/(twitter)/admin/page.tsx`
   - Surface SLA health counters for open appeals (on-track, due-soon, overdue).
8. `docs/API_CONSUMERS.md`, `docs/OPERATIONS.md`, `README.md`, `Rodemap.md`
   - Document new response fields, limits, and operational ritual.

### Data Flow (Diagram as Text)

`User action -> API route -> authz check -> rate-limit check -> domain mutation -> structured event log -> response payload (with SLA/rate metadata) -> React Query refresh -> admin/user UI`

### API Contracts (New/Extended)

1. `GET /api/moderation/authenticity/appeals`
   - Extended payload fields per item:
     - `slaDueAt: string (ISO datetime)`
     - `slaState: "on_track" | "due_soon" | "overdue" | "resolved"`
     - `slaRemainingMinutes: number | null`
2. `POST /api/authenticity/appeals`
   - Preserves response shape but adds stricter limiter behavior and anomaly logs.
3. `POST /api/moderation/authenticity/appeals/[id]/decision`
4. `POST /api/moderation/authenticity/[id]/decision`
   - Now return `429` + `Retry-After` when moderator decision throttles trigger.

### Config / Environment

Add optional env keys (with safe defaults):

1. `APPEAL_SLA_HOURS` (default `24`)
2. `APPEAL_SLA_SOON_MINUTES` (default `120`)
3. `RATE_LIMIT_APPEAL_SUBMIT_PER_10_MIN` (default `3`)
4. `RATE_LIMIT_APPEAL_DECISION_PER_MINUTE` (default `30`)
5. `RATE_LIMIT_AUTH_DECISION_PER_MINUTE` (default `40`)

### Error Handling

1. Invalid inputs remain `400`.
2. Missing auth remains `401`/unauthorized helper.
3. Role/permission remains `403`.
4. Conflict states remain `409`.
5. New throttles return `429` with `Retry-After`.
6. Unexpected errors return `500` and still log structured event context.

### Security Decisions

1. Least privilege unchanged: only moderators/admins can decision endpoints.
2. Rate limits applied before mutation side effects.
3. Structured anomaly events include actor id, endpoint, limiter key, and retry window.
4. No secrets/tokens emitted in logs.

### Validation Plan

1. `npx prisma validate` (if schema touched).
2. `npm run lint`
3. `npm run build`
4. Local smoke:
   - `./scripts/live-social-smoke.sh <base>`
   - `./scripts/human-layer-smoke.sh <base>`
5. Live check:
   - `curl https://humans-only.de/api/health` and compare deployed SHA.

## Acceptance Criteria

1. Users can submit appeals in settings without browser prompt dialogs.
2. Moderator appeal queue exposes SLA state and due timing.
3. Decision endpoints for authenticity and appeals enforce limiter responses (`429` path tested).
4. Admin surface shows appeal SLA health snapshot.
5. Docs and changelogs updated with exact contracts and env knobs.
