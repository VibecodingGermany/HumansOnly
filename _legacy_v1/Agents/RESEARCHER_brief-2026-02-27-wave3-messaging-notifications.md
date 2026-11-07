# Research Brief - Wave 3 (Messaging + Notifications Reliability)
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Improve deterministic behavior for messaging and notifications.
- Add unread tracking and read-marking for direct messages.
- Add user-configurable notification preferences.
- Add pagination metadata for better API scalability.

## Key Facts
1. Messaging lacked unread semantics.
- `Message` rows had no read-state field.
- Conversations could not reliably expose unread counts.

2. Notification delivery had no per-user preference controls.
- All event types were created if the route secret matched.
- Users could not disable specific notification types.

3. Notifications and conversations were returned as full lists.
- API responses lacked pagination metadata and unread aggregates.

## Risks
1. `P0` Schema updates for message read-state and notification preferences require safe production migration.
2. `P1` Notification suppression logic must not block unrelated notification types.
3. `P1` Read-marking should not incorrectly mark outbound messages as read.

## Primary Sources (accessed 2026-02-27)
- Prisma schema/migrations:
  - https://www.prisma.io/docs/orm/prisma-migrate
- Next.js Route Handlers:
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- OWASP Logging and Monitoring guidance:
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
