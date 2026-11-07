# Architecture Spec - Wave 3 (Messaging + Notifications Reliability)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
1. Add deterministic unread semantics to DMs.
2. Add user-level notification preference controls.
3. Add pagination metadata for messages/notifications endpoints.

## Selected Design
### Data Model
- `Message.isRead: Boolean` default false.
- `NotificationPreference` model (`userId` unique) with booleans:
  - `like`, `reply`, `follow`, `retweet`, `message`.

### API Changes
1. `POST /api/messages/read`
- Body: `{ messagedUsername }`
- Marks inbound unread messages from that user as read.

2. `GET /api/messages/[username]`
- Adds pagination metadata and `totalUnread`.
- Adds per-conversation `unreadCount`.

3. `GET/POST /api/notifications/preferences`
- GET: upsert-on-read defaults for current user.
- POST: partial boolean updates.

4. `POST /api/notifications/create`
- Applies per-user preference gate before persisting event notification.

5. `GET /api/notifications`
- Adds pagination metadata and `unreadCount`.

## Diagram-as-Text
[Message create]
  -> persist `isRead=false`
  -> optional notification create
      -> check recipient `NotificationPreference`
      -> create or skip

[Conversation open]
  -> `POST /api/messages/read`
  -> mark inbound unread rows as read
  -> refresh unread counts in messages/notifications queries

## Acceptance Criteria
1. Message unread state is tracked and can be marked read per conversation.
2. Notification preferences can disable specific event notifications.
3. Notifications and messages endpoints return pagination/unread metadata.
4. Live-domain tests confirm end-to-end behavior.
