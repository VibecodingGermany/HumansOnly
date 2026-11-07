# Validation Report - Wave 4 (Account Controls + Visibility)
Date: 2026-02-27
Owner: VALIDATOR
Status: PASS

## Acceptance Criteria Results
1. Account control endpoints exist and persist state.
- Result: PASS
- Evidence:
  - `POST /api/users/preferences` returned `{"isPrivate":true,"messagePrivacy":"followers"}`.
  - `POST /api/users/[username]/block` returned `{"success":true}`.
  - `GET /api/users/blocked` returned blocked user list including target username.

2. Private/block/mute visibility rules are enforced server-side.
- Result: PASS
- Evidence:
  - For non-follower user B, `GET /api/users/<private-user>` returned `"canViewContent":false`.
  - `GET /api/tweets/<private-user>` returned empty tweets for user B.
  - Search query for private post text returned empty result set.

3. Interaction restrictions are enforced.
- Result: PASS
- Evidence:
  - `POST /api/tweets/<private-user>/<tweetId>/like` returned `success:false` with private-account restriction message.
  - After block, `POST /api/messages/create` from blocked user returned `success:false` with restriction message.

4. Frontend build quality gates pass.
- Result: PASS
- Commands:
  - `cd app && npm run lint`
  - `cd app && npm run build`
  - `./scripts/baseline-check.sh`

5. Production deploy + migration pass.
- Result: PASS
- Evidence:
  - Remote deploy executed via `./scripts/deploy-server.sh`.
  - Migration `20260227220220_add_social_controls_wave4` applied on `humansonly_prod`.
  - PM2 restart succeeded and internal health probe returned HTTP 200.

## Live Checks Executed
- Domain: `https://humans-only.de`
- `./scripts/auth-smoke-local.sh https://humans-only.de` (create/login/verify) -> PASS
- Manual live smoke script:
  - create two users A/B
  - A posts, sets private + followers-only DMs
  - B cannot view A content (`canViewContent:false`, empty tweets)
  - B cannot like A post (403-like restriction response)
  - A blocks B
  - B cannot DM A
  - A blocked list contains B

## Residual Risks
- Follow-request approvals for private accounts are not implemented (current follow remains immediate).
- Reporting is persisted but no moderator review UI/workflow exists yet.
