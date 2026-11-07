# Builder Report - Wave 1 (Auth Consolidation)
Date: 2026-02-27
Owner: BUILDER

## Implemented

### 1) Central auth/session utility
- Added `src/utilities/auth/session.ts`:
  - `getAuthenticatedUser()` (Clerk-first, JWT fallback)
  - `getOrCreateUserByClerkId()` (shared Clerk provisioning)
  - `unauthorizedResponse()`

### 2) Clerk bridge reuse
- Updated `src/app/api/auth/clerk/bridge/route.ts` to reuse `getOrCreateUserByClerkId()`.
- Removed duplicated username/displayname/provisioning logic from route.

### 3) Canonical session endpoint
- Updated `src/app/api/auth/session/route.ts` to use central auth resolver.
- Added `source` field (`clerk|legacy|null`) to session response.

### 4) Protected API migration to Clerk-first resolver
Refactored these routes from direct JWT cookie verification to `getAuthenticatedUser()`:
- Tweets:
  - `src/app/api/tweets/related/route.ts`
  - `src/app/api/tweets/create/route.ts`
  - `src/app/api/tweets/[username]/[tweetId]/reply/route.ts`
  - `src/app/api/tweets/[username]/[tweetId]/like/route.ts`
  - `src/app/api/tweets/[username]/[tweetId]/unlike/route.ts`
  - `src/app/api/tweets/[username]/[tweetId]/retweet/route.ts`
  - `src/app/api/tweets/[username]/[tweetId]/unretweet/route.ts`
  - `src/app/api/tweets/[username]/[tweetId]/delete/route.ts`
- Users:
  - `src/app/api/users/random/route.ts`
  - `src/app/api/users/[username]/edit/route.ts`
  - `src/app/api/users/[username]/follow/route.ts`
  - `src/app/api/users/[username]/unfollow/route.ts`
- Messages:
  - `src/app/api/messages/create/route.ts`
  - `src/app/api/messages/delete/route.ts`
  - `src/app/api/messages/[username]/route.ts`
- Notifications:
  - `src/app/api/notifications/route.ts`
  - `src/app/api/notifications/read/route.ts`
- Upload:
  - `src/app/api/upload/route.ts`

### 5) Identity contract hardening (client payload no longer authoritative)
- Removed server dependency on `tokenOwnerId` payload in core mutation routes.
- Message create now uses authenticated server user as sender.
- Message delete now validates only participants + server-authenticated user membership.

### 6) Frontend fetch/client cleanup
- Updated `src/utilities/fetch/index.ts` signatures to remove `tokenOwnerId` transport for:
  - `updateTweetLikes`
  - `updateReposts`
  - `updateUserFollows`
  - `deleteTweet`
  - `deleteConversation`
- Updated client callers:
  - `src/components/tweet/Like.tsx`
  - `src/components/tweet/Repost.tsx`
  - `src/components/user/Follow.tsx`
  - `src/components/tweet/SingleTweet.tsx`
  - `src/components/message/Conversation.tsx`

### 7) Legacy UI cleanup
- Removed dead, unused legacy auth dialog components:
  - `src/components/dialog/LogInDialog.tsx`
  - `src/components/dialog/SignUpDialog.tsx`
- Cleaned obsolete dialog prop types in `src/types/DialogProps.ts`.

## Notes
- Notification sender payload now normalizes nullable `name`/`photoUrl` to empty strings where required by shared types.
- Tweet delete route now confirms ownership server-side before deletion.
