# Research Brief - Wave 5 (Operations, Quality, Observability)
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Add quality gates suitable for CI.
- Add operational observability baseline (health endpoint, request IDs, structured logs).
- Add repeatable live smoke checks and operations runbook (backup/restore + rollback).

## Key Facts
1. Existing deploy workflow included build/lint but no dedicated reusable quality gate workflow for PRs.
2. No first-class health endpoint existed for structured runtime + release metadata checks.
3. API logs were not normalized and had no request correlation ID across middleware/handlers.
4. There was no codified backup/restore and rollback playbook in repository docs.

## Risks
1. `P0` Missing request correlation complicates production incident triage.
2. `P1` Lack of standardized live smoke checks causes regressions to escape release.
3. `P1` Undocumented restore/rollback process increases outage duration.

## Open Questions
1. Should live smoke run every 6 hours or at a different cadence/cost profile?
2. Should request IDs be propagated to downstream notification/storage providers in a later wave?
3. Should backup jobs be fully automated via cron/systemd from repo-managed scripts?

## Primary Sources (accessed 2026-02-27)
- Next.js middleware and route handlers:
  - https://nextjs.org/docs/app/building-your-application/routing/middleware
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- OWASP logging and monitoring guidance:
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- GitHub Actions workflow basics:
  - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
