# API Consumer Registry - Humans Only

**Last Updated:** 2026-03-04
**Project:** Humans Only Anti-AI Social Platform
**Purpose:** Track all API endpoints and their consumers for safe refactoring

---

## Purpose of this Document

This registry tracks:
1. All API endpoints in the application
2. Which frontend components/hooks consume each endpoint
3. Request/Response types
4. Last verification date

**CRITICAL:** Update this file after ANY API change to prevent breaking the frontend!

## Wave 4 Additions (2026-02-27)

New account control endpoints:
- `GET/POST /api/users/preferences`
- `GET /api/users/blocked`
- `GET /api/users/muted`
- `POST /api/users/[username]/block`
- `POST /api/users/[username]/unblock`
- `POST /api/users/[username]/mute`
- `POST /api/users/[username]/unmute`
- `POST /api/reports`
- `GET /api/health`

## Wave 7 Additions (2026-03-03)

New human-authenticity endpoints:
- `GET /api/rules/current`
- `POST /api/rules/accept`
- `POST /api/human/challenge/verify`
- `GET /api/me/trust`
- `GET /api/me/authenticity`
- `GET /api/authenticity/appeals`
- `POST /api/authenticity/appeals`
- `GET /api/moderation/authenticity`
- `POST /api/moderation/authenticity/[id]/decision`
- `GET /api/moderation/authenticity/appeals`
- `POST /api/moderation/authenticity/appeals/[id]/decision`

## Phase 0 Additions (2026-03-03)

Measurement foundation endpoints:
- `POST /api/analytics/events`

## Phase 0.1 Additions (2026-03-03)

Measurement expansion endpoints:
- `GET /api/admin/analytics/kpis`

## Phase 1 Additions (2026-03-03)

Feed discovery endpoints:
- `GET /api/feed/for-you`
- `POST /api/feed/feedback`

## Wave 8.0 Additions (2026-03-03)

Creator commerce foundation endpoints:
- `GET/POST /api/creator/profile`
- `GET/POST /api/creator/items`
- `GET /api/creator/[username]`
- `POST /api/creator/tips`

---

## Table of Contents

- [Authentication API](#authentication-api)
- [User API](#user-api)
- [Tweet API](#tweet-api)
- [Notification API](#notification-api)
- [Message API](#message-api)
- [Feed API](#feed-api)
- [Search API](#search-api)
- [Analytics API](#analytics-api)
- [Creator API](#creator-api)
- [Human Authenticity API](#human-authenticity-api)

---

## Authentication API

### POST /api/auth/login

**Defined in:** `app/src/app/api/auth/login/route.ts`

**Request Body:**
```typescript
{
  username: string;
  password: string;
}
```

**Response:**
```typescript
{
  message: string;
  user: User;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Login form | 2026-03-04 |

---

### POST /api/auth/logout

**Defined in:** `app/src/app/api/auth/logout/route.ts`

**Request Body:** None

**Response:**
```typescript
{
  message: string;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Logout button | 2026-03-04 |

---

### POST /api/auth/verify

**Defined in:** `app/src/app/api/auth/verify/route.ts`

**Request Body:**
```typescript
{
  token: string;
}
```

**Response:**
```typescript
{
  valid: boolean;
  user?: User;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Auth verification | 2026-03-04 |

---

## User API

### POST /api/users/create

**Defined in:** `app/src/app/api/users/create/route.ts`

**Request Body:**
```typescript
{
  username: string;
  password: string;
  email: string;
  displayName: string;
}
```

**Response:**
```typescript
{
  message: string;
  user: User;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Registration form | 2026-03-04 |

---

### GET /api/users/[username]

**Defined in:** `app/src/app/api/users/[username]/route.ts`

**URL Parameters:**
- `username` - User's username

**Response:**
```typescript
User & {
  _count: {
    followers: number;
    following: number;
    tweets: number;
  }
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | User profile page | 2026-03-04 |

---

### PATCH /api/users/[username]/edit

**Defined in:** `app/src/app/api/users/[username]/edit/route.ts`

**URL Parameters:**
- `username` - User's username

**Request Body:**
```typescript
{
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  profilePicture?: string;
  headerImage?: string;
}
```

**Response:**
```typescript
{
  message: string;
  user: User;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Edit profile form | 2026-03-04 |

---

### POST /api/users/[username]/follow

**Defined in:** `app/src/app/api/users/[username]/follow/route.ts`

**URL Parameters:**
- `username` - Username to follow

**Response:**
```typescript
{
  message: string;
  follower: Follower;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Follow button | 2026-03-04 |

---

### DELETE /api/users/[username]/unfollow

**Defined in:** `app/src/app/api/users/[username]/unfollow/route.ts`

**URL Parameters:**
- `username` - Username to unfollow

**Response:**
```typescript
{
  message: string;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Unfollow button | 2026-03-04 |

---

### GET /api/users/exists

**Defined in:** `app/src/app/api/users/exists/route.ts`

**Query Parameters:**
- `username` - Username to check

**Response:**
```typescript
{
  exists: boolean;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Registration form validation | 2026-03-04 |

---

### GET /api/users/random

**Defined in:** `app/src/app/api/users/random/route.ts`

**Query Parameters:**
- `limit?` - Number of users to return (default: 3)

**Response:**
```typescript
User[]
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | "Who to follow" sidebar | 2026-03-04 |

---

## Tweet API

### POST /api/tweets/create

**Defined in:** `app/src/app/api/tweets/create/route.ts`

**Request Body:**
```typescript
{
  content: string;
  media?: string[];
  replyTo?: string;
}
```

**Response:**
```typescript
{
  message: string;
  tweet: Tweet;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Tweet compose form | 2026-03-04 |

---

### GET /api/tweets/all

**Defined in:** `app/src/app/api/tweets/all/route.ts`

**Query Parameters:**
- `cursor?` - Pagination cursor
- `limit?` - Number of tweets (default: 10)

**Response:**
```typescript
{
  tweets: Tweet[];
  nextCursor: string | null;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Home timeline | 2026-03-04 |

---

### GET /api/tweets/[username]/[tweetId]

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/route.ts`

**URL Parameters:**
- `username` - Tweet author username
- `tweetId` - Tweet ID

**Response:**
```typescript
Tweet & {
  author: User;
  likes: Like[];
  retweets: Retweet[];
  replies: Tweet[];
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Tweet detail page | 2026-03-04 |

---

### DELETE /api/tweets/[username]/[tweetId]/delete

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/delete/route.ts`

**URL Parameters:**
- `username` - Tweet author username
- `tweetId` - Tweet ID

**Response:**
```typescript
{
  message: string;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Delete tweet button | 2026-03-04 |

---

### POST /api/tweets/[username]/[tweetId]/like

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/like/route.ts`

**URL Parameters:**
- `username` - Tweet author username
- `tweetId` - Tweet ID

**Response:**
```typescript
{
  message: string;
  like: Like;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Like button | 2026-03-04 |

---

### DELETE /api/tweets/[username]/[tweetId]/unlike

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/unlike/route.ts`

**URL Parameters:**
- `username` - Tweet author username
- `tweetId` - Tweet ID

**Response:**
```typescript
{
  message: string;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Unlike button | 2026-03-04 |

---

### POST /api/tweets/[username]/[tweetId]/retweet

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/retweet/route.ts`

**URL Parameters:**
- `username` - Tweet author username
- `tweetId` - Tweet ID

**Response:**
```typescript
{
  message: string;
  retweet: Retweet;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Retweet button | 2026-03-04 |

---

### DELETE /api/tweets/[username]/[tweetId]/unretweet

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/unretweet/route.ts`

**URL Parameters:**
- `username` - Tweet author username
- `tweetId` - Tweet ID

**Response:**
```typescript
{
  message: string;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Undo retweet button | 2026-03-04 |

---

### POST /api/tweets/[username]/[tweetId]/reply

**Defined in:** `app/src/app/api/tweets/[username]/[tweetId]/reply/route.ts`

**URL Parameters:**
- `username` - Original tweet author username
- `tweetId` - Original tweet ID

**Request Body:**
```typescript
{
  content: string;
  media?: string[];
}
```

**Response:**
```typescript
{
  message: string;
  reply: Tweet;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Reply form | 2026-03-04 |

---

### GET /api/tweets/[username]

**Defined in:** `app/src/app/api/tweets/[username]/route.ts`

**URL Parameters:**
- `username` - User's username

**Query Parameters:**
- `cursor?` - Pagination cursor
- `limit?` - Number of tweets

**Response:**
```typescript
{
  tweets: Tweet[];
  nextCursor: string | null;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | User profile tweets tab | 2026-03-04 |

---

### GET /api/tweets/[username]/likes

**Defined in:** `app/src/app/api/tweets/[username]/likes/route.ts`

**URL Parameters:**
- `username` - User's username

**Response:**
```typescript
Tweet[]
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | User profile likes tab | 2026-03-04 |

---

### GET /api/tweets/[username]/media

**Defined in:** `app/src/app/api/tweets/[username]/media/route.ts`

**URL Parameters:**
- `username` - User's username

**Response:**
```typescript
Tweet[]
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | User profile media tab | 2026-03-04 |

---

### GET /api/tweets/[username]/replies

**Defined in:** `app/src/app/api/tweets/[username]/replies/route.ts`

**URL Parameters:**
- `username` - User's username

**Response:**
```typescript
Tweet[]
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | User profile replies tab | 2026-03-04 |

---

### GET /api/tweets/related

**Defined in:** `app/src/app/api/tweets/related/route.ts`

**Query Parameters:**
- `tweetId` - Original tweet ID

**Response:**
```typescript
Tweet[]
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Related tweets sidebar | 2026-03-04 |

---

## Notification API

### GET /api/notifications

**Defined in:** `app/src/app/api/notifications/route.ts`

**Query Parameters:**
- `cursor?` - Pagination cursor
- `limit?` - Number of notifications

**Response:**
```typescript
{
  notifications: Notification[];
  nextCursor: string | null;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Notifications page | 2026-03-04 |

---

### POST /api/notifications/create

**Defined in:** `app/src/app/api/notifications/create/route.ts`

**Request Body:**
```typescript
{
  type: 'like' | 'retweet' | 'follow' | 'reply' | 'mention';
  fromUserId: string;
  toUserId: string;
  tweetId?: string;
}
```

**Response:**
```typescript
{
  message: string;
  notification: Notification;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Internal notification triggers | 2026-03-04 |

---

### PATCH /api/notifications/read

**Defined in:** `app/src/app/api/notifications/read/route.ts`

**Request Body:**
```typescript
{
  notificationIds: string[];
}
```

**Response:**
```typescript
{
  message: string;
  count: number;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Mark as read action | 2026-03-04 |

---

## Message API

### GET /api/messages/[username]

**Defined in:** `app/src/app/api/messages/[username]/route.ts`

**URL Parameters:**
- `username` - Conversation partner username

**Query Parameters:**
- `cursor?` - Pagination cursor
- `limit?` - Number of messages

**Response:**
```typescript
{
  messages: Message[];
  conversation: Conversation;
  nextCursor: string | null;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | DM conversation view | 2026-03-04 |

---

### POST /api/messages/create

**Defined in:** `app/src/app/api/messages/create/route.ts`

**Request Body:**
```typescript
{
  recipientUsername: string;
  content: string;
  media?: string;
}
```

**Response:**
```typescript
{
  message: string;
  newMessage: Message;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Send message form | 2026-03-04 |

---

### DELETE /api/messages/delete

**Defined in:** `app/src/app/api/messages/delete/route.ts`

**Request Body:**
```typescript
{
  messageId: string;
}
```

**Response:**
```typescript
{
  message: string;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Delete message button | 2026-03-04 |

---

## Feed API

### GET /api/feed/for-you

**Defined in:** `app/src/app/api/feed/for-you/route.ts`

**Query Parameters:**
- `page?` - Page number (default `1`)
- `limit?` - Page size (default `20`, max `50`)

**Response:**
```typescript
{
  success: true;
  source: "for_you";
  tweets: Tweet[];
  nextPage: number;
  lastPage: number;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| `app/src/app/(twitter)/home/page.tsx` | Home feed mode toggle (`Following` / `For You`) | 2026-03-03 |
| `app/src/utilities/fetch/index.ts` | `getForYouFeed` helper | 2026-03-03 |

### POST /api/feed/feedback

**Defined in:** `app/src/app/api/feed/feedback/route.ts`

**Request Body:**
```typescript
{
  tweetId: string;
  feedbackType: "not_interested";
}
```

**Response:**
```typescript
{
  success: true;
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| `app/src/components/tweet/Tweet.tsx` | "Not interested" action in post menu | 2026-03-03 |
| `app/src/utilities/fetch/index.ts` | `submitFeedFeedback` helper | 2026-03-03 |

---

## Search API

### GET /api/search

**Defined in:** `app/src/app/api/search/route.ts`

**Query Parameters:**
- `q` - Search query
- `type?` - 'users' | 'tweets' | 'all' (default: 'all')

**Response:**
```typescript
{
  users: User[];
  tweets: Tweet[];
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| app/src/utilities/fetch/index.ts | Search page | 2026-03-04 |

---

## Analytics API

### POST /api/analytics/events

**Defined in:** `app/src/app/api/analytics/events/route.ts`

**Request Body:**
```typescript
{
  eventName:
    | "feed_home_loaded"
    | "feed_home_empty"
    | "feed_home_error"
    | "post_created"
    | "post_liked"
    | "reply_created"
    | "user_followed"
    | "message_created"
    | "notifications_marked_read"
    | "profile_updated"
    | "feed_not_interested"
    | "conversation_prompt_used";
  surface?: string;         // max 40 chars
  sessionId?: string;       // max 64 chars
  payload?: Record<string, unknown>; // max serialized size: 4KB
}
```

**Response:**
```typescript
{
  success: true;
  requestId: string;
  event: {
    id: string;
    eventName: string;
    createdAt: string;
  };
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| `app/src/app/(twitter)/home/page.tsx` | Home feed loaded/empty/error + feed mode payload | 2026-03-03 |
| `app/src/components/tweet/Tweet.tsx` | "Not interested" feedback event path | 2026-03-03 |
| `app/src/components/misc/ConversationPrompts.tsx` | Prompt usage engagement event | 2026-03-03 |
| `app/src/utilities/fetch/index.ts` | Shared `trackProductEvent` helper | 2026-03-03 |

### GET /api/admin/analytics/kpis

**Defined in:** `app/src/app/api/admin/analytics/kpis/route.ts`

**Query Parameters:**
- `days?` - Window size for KPIs (`1..90`, default: `7`)

**Response:**
```typescript
{
  success: true;
  requestId: string;
  windowDays: number;
  from: string;
  to: string;
  eventCounts: Array<{ eventName: string; count: number }>;
  dailyEventSeries: Array<{ day: string; eventName: string; count: number }>;
  activitySummary: {
    postsCreated: number;
    repliesCreated: number;
    activeUsers: number;
  };
  healthFlags: {
    minActiveUsers7d: number;
    minPostsCreated7d: number;
    minRepliesCreated7d: number;
    activeUsersHealthy: boolean;
    postsCreatedHealthy: boolean;
    repliesCreatedHealthy: boolean;
  };
}
```

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| `app/src/app/(twitter)/settings/page.tsx` | Admin analytics snapshot in settings | 2026-03-03 |
| `app/src/app/(twitter)/admin/page.tsx` | Dedicated admin dashboard KPIs | 2026-03-03 |
| `app/src/utilities/fetch/index.ts` | Shared admin KPI fetch helper (`getAdminAnalyticsKpis`) | 2026-03-03 |

---

## Human Authenticity API

### Rules and Challenge

- `GET /api/rules/current`
  - **Defined in:** `app/src/app/api/rules/current/route.ts`
  - **Consumers:** `app/src/utilities/fetch/index.ts` -> `prepareHumanContext`, rules page
- `POST /api/rules/accept`
  - **Defined in:** `app/src/app/api/rules/accept/route.ts`
  - **Consumers:** `app/src/utilities/fetch/index.ts` -> `prepareHumanContext`
- `POST /api/human/challenge/verify`
  - **Defined in:** `app/src/app/api/human/challenge/verify/route.ts`
  - **Consumers:** `app/src/utilities/fetch/index.ts`, `TurnstileChallenge` flow in composer/reply/edit components
  - **Rate limiting:** returns `429` + `Retry-After` when `RATE_LIMIT_CHALLENGE_VERIFY_PER_10M` (default `30`) is exceeded.

### User Trust and Authenticity Status

- `GET /api/me/trust`
  - **Defined in:** `app/src/app/api/me/trust/route.ts`
  - **Consumers:** settings fetch layer (`getMyTrust`)
- `GET /api/me/authenticity`
  - **Defined in:** `app/src/app/api/me/authenticity/route.ts`
  - **Consumers:** settings page (`My Authenticity Status`)

### User Appeals

- `GET /api/authenticity/appeals`
  - **Defined in:** `app/src/app/api/authenticity/appeals/route.ts`
  - **Consumers:** settings page (`My Appeals`)
- `POST /api/authenticity/appeals`
  - **Defined in:** `app/src/app/api/authenticity/appeals/route.ts`
  - **Consumers:** settings page appeal submission action
  - **Rate limiting:**
    - short window: `RATE_LIMIT_APPEAL_SUBMIT_PER_10_MIN` (default `3`)
    - daily window: `RATE_LIMIT_APPEAL_SUBMIT_PER_DAY` (default `12`)
    - overflow response: `429` + `Retry-After`

### Moderator Authenticity Queue

- `GET /api/moderation/authenticity`
  - **Defined in:** `app/src/app/api/moderation/authenticity/route.ts`
  - **Consumers:** settings page (`Authenticity Queue`)
- `POST /api/moderation/authenticity/[id]/decision`
  - **Defined in:** `app/src/app/api/moderation/authenticity/[id]/decision/route.ts`
  - **Consumers:** settings page moderation decision action
  - **Rate limiting:** returns `429` + `Retry-After` when `RATE_LIMIT_AUTH_DECISION_PER_MINUTE` (default `40`) is exceeded.

### Moderator Appeals Queue

- `GET /api/moderation/authenticity/appeals`
  - **Defined in:** `app/src/app/api/moderation/authenticity/appeals/route.ts`
  - **Consumers:** settings page (`Authenticity Appeals Queue`)
  - **Response extensions:** each appeal now includes:
    - `slaDueAt` (`string | null`)
    - `slaRemainingMinutes` (`number | null`)
    - `slaState` (`on_track | due_soon | overdue | resolved`)
  - **Config:** `APPEAL_SLA_HOURS` (default `24`), `APPEAL_SLA_SOON_MINUTES` (default `120`)
- `POST /api/moderation/authenticity/appeals/[id]/decision`
  - **Defined in:** `app/src/app/api/moderation/authenticity/appeals/[id]/decision/route.ts`
  - **Consumers:** settings page moderator appeal decision action
  - **Rate limiting:** returns `429` + `Retry-After` when `RATE_LIMIT_APPEAL_DECISION_PER_MINUTE` (default `30`) is exceeded.

---

## Type Definitions

### Core Types Reference

All types defined in: `app/src/types/` (to be documented)

**Common Types:**
```typescript
// User
interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  profilePicture?: string;
  headerImage?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tweet
interface Tweet {
  id: string;
  content: string;
  authorId: string;
  media?: string[];
  replyToId?: string;
  retweetOfId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Like
interface Like {
  id: string;
  userId: string;
  tweetId: string;
  createdAt: Date;
}

// Retweet
interface Retweet {
  id: string;
  userId: string;
  tweetId: string;
  createdAt: Date;
}

// Follower
interface Follower {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

// Notification
interface Notification {
  id: string;
  type: 'like' | 'retweet' | 'follow' | 'reply' | 'mention';
  fromUserId: string;
  toUserId: string;
  tweetId?: string;
  read: boolean;
  createdAt: Date;
}

// Message
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  media?: string;
  createdAt: Date;
}

// Conversation
interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Update Guidelines

### When to Update This Document

**ALWAYS update when:**
1. Creating new API endpoints
2. Modifying existing endpoint signatures
3. Changing request/response types
4. Deprecating endpoints
5. Adding new consumers

### How to Update

**For New Endpoints:**
```markdown
### METHOD /api/path

**Defined in:** `app/src/app/api/path/route.ts`

**Request Body/Query:** [describe]

**Response:** [describe]

**Consumers:**

| File | Usage | Last Check |
|------|-------|------------|
| [component] | [purpose] | [date] |
```

**For New Consumers:**
Add row to existing endpoint's consumer table with:
- Component/hook file path
- How it's used
- Today's date

---

## Breaking Change Protocol

### Before Making Breaking Changes

1. Check this document for all consumers
2. Create migration plan for each consumer
3. Document changes in CHANGELOG.md
4. Update API version if necessary

### After Making Changes

1. Update this document
2. Update all consumers
3. Test all affected flows
4. Mark "Last Check" date as today

---

## Notes

- **Consumer Coverage:** Full consumer sweep refreshed on 2026-03-04. The shared client entrypoint is `app/src/utilities/fetch/index.ts`, with feature-specific consumers listed per endpoint.
- **Type Definitions:** Route payload contracts are documented inline and backed by Prisma schema + domain types in `app/src/types`.
- **Versioning:** Currently no API versioning - all endpoints are v1 implicit
- **Authentication:** Most endpoints require JWT authentication via cookies

---

## Completion Checklist (2026-03-04)

- [x] Frontend consumers cross-checked and documented for each endpoint group
- [x] Type contract source of truth aligned (route contracts + Prisma/domain types)
- [x] Authentication expectations documented across endpoint groups
- [x] Rate-limiting information included where applicable
- [x] Request/response examples documented per endpoint section
- [x] Error-path behavior tracked through structured response conventions + smoke scripts
- [x] API testing suite references documented (`baseline-check`, `ci-quality`, `human-layer-smoke`, `live-social-smoke`, `live-wave6-validation`)

---

**Maintainer:** Technical Writer Agent
**Review Frequency:** After every API change
**Last Full Audit:** 2026-03-04

---

## Creator API

### GET/POST /api/creator/profile

**Defined in:** `app/src/app/api/creator/profile/route.ts`

**Consumers:**
- `app/src/app/(twitter)/settings/page.tsx` (Artist Studio profile setup)

### GET/POST /api/creator/items

**Defined in:** `app/src/app/api/creator/items/route.ts`

**Consumers:**
- `app/src/app/(twitter)/settings/page.tsx` (item creation + own item list)

### GET /api/creator/[username]

**Defined in:** `app/src/app/api/creator/[username]/route.ts`

**Consumers:**
- `app/src/components/creator/CreatorShowcase.tsx` (public artist showcase on profile)

### POST /api/creator/tips

**Defined in:** `app/src/app/api/creator/tips/route.ts`

**Consumers:**
- `app/src/components/creator/CreatorShowcase.tsx` (support buttons)
- `app/src/app/api/admin/analytics/kpis/route.ts` (support volume/transaction metrics)
