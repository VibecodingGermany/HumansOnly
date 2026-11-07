# Operations Playbook - Humans Only

Last Updated: 2026-03-03
Scope: Wave 5+7 operations hardening (quality gates, observability, authenticity SLA/rate controls, backup/restore, rollback)

## 1) Release Gates

### Required before merge/release
- `Quality Gates` GitHub workflow passes (`.github/workflows/quality-gates.yml`).
- `Deploy HumansOnly` workflow passes on `main`.
- Live smoke passes (`scripts/live-social-smoke.sh https://humans-only.de`).
- Human-layer smoke passes (`scripts/human-layer-smoke.sh https://humans-only.de`).
- Final matrix passes (`scripts/live-wave6-validation.sh https://humans-only.de`).

### Local preflight
```bash
./scripts/ci-quality.sh
./scripts/baseline-check.sh
./scripts/human-layer-smoke.sh
```

### Artifact cleanup (when needed)
```bash
# Preview timestamped smoke users (safe read-only)
./scripts/cleanup-artifact-users.sh --dry-run

# Delete only timestamped, non-Clerk `role=user` smoke accounts
./scripts/cleanup-artifact-users.sh --execute
```

## 2) Observability

### Request IDs
- Middleware injects `x-request-id` for all app and API routes.
- API responses from observability-enabled handlers include `requestId` and `x-request-id` response header.

### Structured Logs
- Use `utilities/observability` helpers:
  - `logApiEvent(level, payload)`
  - `errorResponse(requestId, ...)`
  - `successResponse(requestId, ...)`
- Log lines are JSON for easier parsing/search.

### Health Endpoint
- `GET /api/health` returns:
  - runtime status
  - server uptime
  - node version
  - release metadata from `.deploy/release.txt` (when available)

## 3) Backup and Restore

### Database backup (server)
```bash
# Full dump (custom format)
pg_dump -h localhost -U humansonly_user -d humansonly_prod -Fc -f /var/backups/humansonly_prod_$(date +%F_%H%M).dump

# Verify backup file
pg_restore --list /var/backups/humansonly_prod_YYYY-MM-DD_HHMM.dump >/dev/null
```

### Upload/media backup (server local storage)
```bash
tar -czf /var/backups/humansonly_uploads_$(date +%F_%H%M).tar.gz /var/www/humansonly/public/uploads
```

### Restore drill (staging or isolated DB)
```bash
# Restore database to target DB
createdb -h localhost -U humansonly_user humansonly_restore_test
pg_restore -h localhost -U humansonly_user -d humansonly_restore_test /var/backups/humansonly_prod_YYYY-MM-DD_HHMM.dump

# Optional: restore uploads
mkdir -p /var/www/humansonly_restore/public
cd /var/www/humansonly_restore/public
tar -xzf /var/backups/humansonly_uploads_YYYY-MM-DD_HHMM.tar.gz
```

## 4) Rollback Playbook

### Trigger criteria
- Repeated deploy health check failures
- Critical auth/data-loss regressions in production
- Live smoke failures with blocker severity

### Procedure
1. Identify last known-good commit/tag in `main`.
2. Re-deploy known-good revision to server:
```bash
# local machine
cd /path/to/HumansOnly
git checkout <known-good-sha>
./scripts/deploy-server.sh
```
3. Validate:
```bash
curl -sS https://humans-only.de/api/health
./scripts/live-social-smoke.sh https://humans-only.de
```
4. Return local repo to `main` after incident response:
```bash
git checkout main
git pull
```

## 5) On-call Checklist
- Confirm `https://humans-only.de/` HTTP 200.
- Confirm `https://humans-only.de/api/health` status `ok`.
- Check latest `Deploy HumansOnly` workflow conclusion.
- Run live smoke if behavior is uncertain.

## 6) Weekly KPI Review Ritual

### Snapshot endpoint
- `GET /api/admin/analytics/kpis?days=7`
- Requires admin authentication.

### KPI minimums (configurable via env)
- `KPI_MIN_ACTIVE_USERS_7D` (default: `10`)
- `KPI_MIN_POSTS_CREATED_7D` (default: `20`)
- `KPI_MIN_REPLIES_CREATED_7D` (default: `10`)

### Review cadence
1. Every Monday, review `healthFlags` and event-count trend deltas against last week.
2. If any health flag is `false` for two consecutive weeks, open a blocking issue and assign an owner.
3. Track remediation actions in roadmap/changelog and re-check after deploy.

## 7) Authenticity Appeals SLA + Abuse Controls

### Queue SLA configuration
- `APPEAL_SLA_HOURS` (default: `24`)
- `APPEAL_SLA_SOON_MINUTES` (default: `120`)
- `GET /api/moderation/authenticity/appeals` returns per-appeal:
  - `slaDueAt`
  - `slaRemainingMinutes`
  - `slaState` (`on_track`, `due_soon`, `overdue`, `resolved`)

### Rate-limit controls
- `POST /api/human/challenge/verify`
  - `RATE_LIMIT_CHALLENGE_VERIFY_PER_10M` (default: `30`)
- `POST /api/authenticity/appeals`
  - `RATE_LIMIT_APPEAL_SUBMIT_PER_10_MIN` (default: `3`)
  - `RATE_LIMIT_APPEAL_SUBMIT_PER_DAY` (default: `12`)
- `POST /api/moderation/authenticity/[id]/decision`
  - `RATE_LIMIT_AUTH_DECISION_PER_MINUTE` (default: `40`)
- `POST /api/moderation/authenticity/appeals/[id]/decision`
  - `RATE_LIMIT_APPEAL_DECISION_PER_MINUTE` (default: `30`)

### Anomaly logging
- Security-throttle events are emitted as structured JSON logs via `utilities/security/events.ts`.
- Track for spikes:
  - `authenticity_appeal_submit_rate_limited`
  - `authenticity_decision_rate_limited`
  - `authenticity_appeal_decision_rate_limited`

## 8) Creator Commerce Operations (Wave 8.0 Foundation)

### Admin KPI fields
- `creatorCommerce.activeCreators`
- `creatorCommerce.publishedItems`
- `creatorCommerce.supportTransactions`
- `creatorCommerce.supportVolumeCents`

### Current payment mode
- Wave 8.0 stores support intents in `CreatorTip` (`status: recorded`) for auditable tracking.
- Direct Stripe checkout/payout automation is intentionally deferred to follow-up wave.

### Weekly creator review
1. Validate creator KPI trend in `GET /api/admin/analytics/kpis?days=7`.
2. Spot-check newly published creator items for policy/risk issues.
3. Reconcile recorded support intents with planned payout process until Stripe Connect rollout is active.
