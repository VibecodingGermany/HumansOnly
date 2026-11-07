# Builder Report - Wave 3 (Messaging + Notifications Reliability)
Date: 2026-02-27
Owner: BUILDER

## Implemented

### 1) Schema + migration
- Added `Message.isRead` flag.
- Added `NotificationPreference` model with per-type toggles.
- Applied migration:
  - `20260227212241_add_notification_preferences_and_message_reads`

### 2) Message reliability APIs
- Added `POST /api/messages/read`:
  - marks inbound unread messages as read for selected conversation partner.
- Enhanced `GET /api/messages/[username]`:
  - returns `totalUnread`
  - returns conversation-level `unreadCount`
  - returns pagination metadata (`page`, `limit`, `hasMore`, etc.).

### 3) Notification reliability APIs
- Added `GET/POST /api/notifications/preferences`.
- Enhanced `POST /api/notifications/create`:
  - enforces recipient preferences by notification type.
  - returns `{ success: true, skipped: true }` when suppressed.
- Enhanced `GET /api/notifications`:
  - pagination metadata + `unreadCount` aggregate.
- Enhanced `GET /api/notifications/read`:
  - returns `marked` count.

### 4) Frontend integration
- Added `markMessagesRead()` fetch utility.
- `Messages` component marks conversation as read on open and invalidates messages/notifications caches.
- `Conversation` supports optional unread badge via `unreadCount`.
- `UnreadNotificationsBadge` now prioritizes server `unreadCount` aggregate.

## Notes
- Existing contracts remain backward-compatible (`notifications`, `formattedConversations` arrays still returned).
- New metadata is additive for clients.
