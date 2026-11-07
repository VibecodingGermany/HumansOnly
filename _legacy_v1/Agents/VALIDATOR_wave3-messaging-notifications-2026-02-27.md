# Validation Report - Wave 3 (Messaging + Notifications Reliability)
Date: 2026-02-27
Owner: VALIDATOR
Status: PASS

## Acceptance Criteria Results
1. Message unread state tracked + mark-as-read works.
- Result: PASS
- Evidence: `totalUnread` changed from `1` to `0` after `POST /api/messages/read`.

2. Notification preferences suppress selected notification types.
- Result: PASS
- Evidence: recipient set `message:false`; message notification count did not increase after new DM.

3. Pagination/unread metadata present for messages and notifications.
- Result: PASS
- Evidence:
  - `/api/messages/[username]` returns `pagination` + `totalUnread`.
  - `/api/notifications` returns `pagination` + `unreadCount`.

4. Local quality gates pass.
- Result: PASS
- Commands:
  - `cd app && npm run lint`
  - `cd app && npm run build`
  - `./scripts/baseline-check.sh`

5. Production migration + deploy pass.
- Result: PASS
- Evidence:
  - Migration `20260227212241_add_notification_preferences_and_message_reads` applied.
  - PM2 service online post-restart.

## Live Checks Executed
- Domain: `https://humans-only.de`
- create/login two users
- GET/POST notification preferences
- send message A -> B
- compare B message-notification count before/after (unchanged with `message:false`)
- verify messages endpoint metadata
- mark conversation as read and verify unread decrease

## Residual Risks
- Realtime transport (websocket/rooms) is still not implemented; current delivery remains request/response driven.
