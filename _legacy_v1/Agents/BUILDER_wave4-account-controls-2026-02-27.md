# Builder Report - Wave 4 (Account Controls + Visibility)
Date: 2026-02-27
Owner: BUILDER

## Implemented

### Database + Prisma
- Added `User.isPrivate` and `User.messagePrivacy`.
- Added models: `Block`, `Mute`, `Report`.
- Added migration:
  - `app/src/prisma/migrations/20260227220220_add_social_controls_wave4/migration.sql`

### Social Utilities
- Extended `app/src/utilities/social/access.ts`:
  - `canUsersInteract(...)` now returns explicit block direction flags.
  - `visibleAuthorWhereForViewer(...)` adds privacy + block/mute visibility filter.

### New APIs
- User controls:
  - `POST /api/users/[username]/block`
  - `POST /api/users/[username]/unblock`
  - `POST /api/users/[username]/mute`
  - `POST /api/users/[username]/unmute`
  - `GET /api/users/blocked`
  - `GET /api/users/muted`
  - `GET/POST /api/users/preferences`
- Moderation:
  - `POST /api/reports`

### Extended Existing APIs
- Visibility filtering added to:
  - `/api/tweets/all`
  - `/api/tweets/related`
  - `/api/search`
  - `/api/tweets/[username]`
  - `/api/tweets/[username]/likes`
  - `/api/tweets/[username]/media`
  - `/api/tweets/[username]/replies`
  - `/api/tweets/[username]/[tweetId]`
  - `/api/tweets/[username]/[tweetId]/reply` (GET)
- Interaction guards added to:
  - `/api/tweets/[username]/[tweetId]/like`
  - `/api/tweets/[username]/[tweetId]/retweet`
  - `/api/tweets/[username]/[tweetId]/reply` (POST)
  - `/api/messages/create`
  - `/api/users/[username]/follow`

### Frontend
- Settings page upgraded with:
  - theme toggle
  - private account toggle
  - message privacy selector
  - blocked users list with unblock action
  - muted users list with unmute action
- Profile page upgraded with:
  - block/unblock, mute/unmute, report user actions
  - guarded message/follow behavior for restricted accounts
  - private/blocked content restriction UX (`canViewContent`)
- Single post menu:
  - report post action for non-author users
- Fetch layer additions in `utilities/fetch/index.ts`:
  - block/mute/preference/report helper calls

### Types + UX Safety
- `UserProps` expanded for privacy/restriction flags and nullable profile fields.
- Client-side null-guard fixes for user query payloads.

## Build Gates
- `npm run lint` passed.
- `npm run build` passed.
- `./scripts/baseline-check.sh` passed.

## Pending in this report
- Live-domain validation results are recorded in VALIDATOR report.
