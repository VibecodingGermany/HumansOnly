# Architecture Spec - Wave 6 (Live Validation + Hardening Loop)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
1. Define a deterministic final live validation matrix.
2. Verify authz/security behavior on production domain.
3. Close release loop with explicit PASS/FAIL evidence.

## Selected Design

### Validation Matrix Script
- Add `scripts/live-wave6-validation.sh` to run:
  - public availability check
  - health endpoint + request-id header check
  - unauthorized protection checks
  - feed/search regression sanity checks
  - full social smoke (delegates to `live-social-smoke.sh`)
  - response-time spot checks

### Gating Rule
- Wave is PASS only if all matrix checks succeed on `https://humans-only.de`.

### Output Artifacts
- Validator report with exact command evidence and residual risks.
- Rodemap/Changelog/README synchronized with final wave status.

## Diagram-as-Text
[Wave6 validation start]
  -> live-wave6-validation.sh
      -> health + request-id checks
      -> unauthorized checks
      -> feed/search checks
      -> live-social-smoke.sh
      -> response-time spot checks
  -> PASS => finalize docs/version/push
  -> FAIL => route issues back to BUILDER

## Acceptance Criteria
1. Live matrix script exists and is executable.
2. Script passes on production domain.
3. Final docs and changelog reflect completed Wave 6.
