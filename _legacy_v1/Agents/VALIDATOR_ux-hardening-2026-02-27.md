# Validation Report - UX + Engagement + Deploy
Date: 2026-02-27
Owner: VALIDATOR
Status: PASS

## Acceptance Criteria Results

1. Mention linking from post body text
- Result: PASS
- Evidence: `MentionText` component integrated into tweet renderers.

2. Share action robustness
- Result: PASS
- Evidence: native `navigator.share` with clipboard fallback + snackbar error handling.

3. Like/Repost reliability with standardized payloads
- Result: PASS
- Evidence:
  - Fetch layer now sends `{ tokenOwnerId }` JSON body.
  - Routes parse object payload and keep string payload compatibility.

4. Build quality gates
- Result: PASS
- Commands:
  - `npm run lint` (app)
  - `npm run build` (app)
  - `./scripts/baseline-check.sh`

5. Auth baseline compatibility
- Result: PASS
- Command: `./scripts/auth-smoke-local.sh`

6. Engagement API integration smoke
- Result: PASS
- Scenario executed locally:
  - create user A + B
  - create post by A with `@B` text
  - like + repost by B using structured payload
  - verify `likedBy=1`, `repostedBy=1`

7. Server deployment + runtime health
- Result: PASS
- Evidence:
  - `./scripts/deploy-server.sh` completed successfully
  - server probes:
    - `GET /` => HTTP 200
    - `POST /api/auth/login` invalid creds => HTTP 401 expected
  - PM2 `humansonly` remains `online`

## Issues Found During Validation (Resolved)
1. Deploy initially failed because server lacked Clerk env keys.
- Resolution: added Clerk keys in server `.env`.

2. Deploy health check initially produced false negative immediately after PM2 restart.
- Resolution: added retry loop in deploy script and workflow.

3. Dry-run revealed dangerous delete behavior for server uploads.
- Resolution: excluded `public/uploads` and `.env.backup*` from rsync delete set.

## Residual Risks
- GitHub auto-deploy workflow still requires repository secrets to be set in GitHub UI before first successful CI deploy run.
- Legacy JWT auth is still present (intentional compatibility bridge). Full Clerk-native authorization cleanup remains a future iteration.
