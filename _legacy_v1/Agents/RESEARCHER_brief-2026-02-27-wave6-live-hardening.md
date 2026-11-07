# Research Brief - Wave 6 (Live Validation + Hardening Loop)
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Execute final live-domain verification matrix.
- Validate security sanity checks for authz-critical endpoints.
- Document residual risks and final release readiness.

## Key Facts
1. Live-only validation is required for final release confidence.
2. Recent waves added sensitive controls (privacy/block/report) and ops primitives (health/request IDs), requiring direct domain verification.
3. Critical risks at this stage are regressions in unauthorized access and production-only behavior.

## Risks
1. `P0` Silent authz regressions in production endpoints.
2. `P1` Live smoke drift if scripts are not executed consistently.
3. `P1` Runtime degradation hidden by local-only checks.

## Open Questions
1. Should performance SLO thresholds be hard-coded in smoke scripts in the next iteration?
2. Should security checks include CSP/HSTS header assertion in CI as a strict gate?

## Primary Sources (accessed 2026-02-27)
- OWASP Authorization Cheat Sheet:
  - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Logging Cheat Sheet:
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- GitHub Actions workflow syntax:
  - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
