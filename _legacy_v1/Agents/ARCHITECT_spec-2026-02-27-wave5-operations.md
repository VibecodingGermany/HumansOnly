# Architecture Spec - Wave 5 (Operations, Quality, Observability)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
1. Enforce repeatable release quality gates in CI.
2. Add baseline production observability primitives.
3. Ship actionable operations documentation and incident workflows.

## Selected Design

### Quality Gates
- Add reusable script: `scripts/ci-quality.sh`
  - npm ci
  - lint
  - build
  - prisma schema validate
- Add workflow: `.github/workflows/quality-gates.yml`
  - runs on PRs to `main`
  - runs on push to `main` for app/workflow changes

### Observability
- Request correlation:
  - middleware injects `x-request-id` when missing
  - forwards request ID into request/response headers
- Structured logging utilities:
  - `utilities/observability/index.ts`
  - `logApiEvent`, `successResponse`, `errorResponse`
- Health endpoint:
  - `GET /api/health`
  - includes runtime status + release metadata (`.deploy/release.txt` when present)

### Live Validation Automation
- Add script: `scripts/live-social-smoke.sh`
  - health check
  - auth smoke
  - privacy/block/message restriction checks with temp users
- Add workflow: `.github/workflows/live-smoke.yml`
  - scheduled + manual trigger

### Operations Docs
- Add `docs/OPERATIONS.md`:
  - release gates
  - observability behavior
  - backup/restore commands
  - rollback playbook

## Diagram-as-Text
[PR / Push]
  -> Quality Gates workflow
     -> ci-quality.sh
        -> lint + build + prisma validate

[Incoming request]
  -> middleware assigns requestId
  -> API handler emits structured logs
  -> response includes x-request-id

[Live monitoring]
  -> scheduled Live Smoke workflow
  -> health + auth + social restrictions verification
  -> workflow failure acts as alert signal

## Acceptance Criteria
1. CI quality gate workflow exists and passes locally.
2. Request IDs and structured logs are implemented in middleware + key API routes.
3. Health endpoint exists and returns operational metadata.
4. Live smoke script/workflow can validate production behavior.
5. Backup/restore and rollback procedures are documented.
