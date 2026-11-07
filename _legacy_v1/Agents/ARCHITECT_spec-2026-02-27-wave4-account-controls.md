# Architecture Spec - Wave 4 (Account Controls + Visibility)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
1. Introduce account-level safety controls (block, mute, report).
2. Enforce privacy and relationship visibility server-side.
3. Ship user-facing controls in profile and settings UX.

## Selected Design

### Data Model
- Extend `User`:
  - `isPrivate: Boolean` (default `false`)
  - `messagePrivacy: String` (`everyone|followers`, default `everyone`)
- New models:
  - `Block(blockerId, blockedId, createdAt)` unique pair
  - `Mute(muterId, mutedId, createdAt)` unique pair
  - `Report(reporterId, targetUserId?, targetTweetId?, reason, details?, status)`

### API Surface
- `POST /api/users/[username]/block|unblock`
- `POST /api/users/[username]/mute|unmute`
- `GET /api/users/blocked|muted`
- `GET/POST /api/users/preferences`
- `POST /api/reports`
- Extend existing APIs with visibility/authz guards:
  - feeds/search/profile tweets/single tweet/replies
  - like/retweet/reply create
  - follow/message create

### Visibility/Authorization Rules
- Block is bilateral for interaction denial.
- Mute is unilateral for content filtering in viewer feed/search.
- Private account content visible if:
  - viewer is owner, or
  - viewer follows target.
- DM privacy: when `messagePrivacy=followers`, only followers (or self) may DM.

## Diagram-as-Text
[Viewer requests feed/search/profile tweets]
  -> resolve optional viewer identity
  -> apply author visibility filter
      -> private account gate (owner/follower/public)
      -> block gate (both directions)
      -> mute gate (viewer muted target)
  -> return only visible tweets

[Viewer interacts with target tweet/user]
  -> resolve auth user
  -> evaluate relationship constraints
      -> deny on block
      -> deny on private-account non-follower interaction
  -> perform mutation

[Settings/Profile actions]
  -> call preferences/block/mute/report endpoints
  -> refresh user/settings queries
  -> show deterministic feedback

## Modules
- `app/src/utilities/social/access.ts`
  - `canUsersInteract(viewerId, targetId)`
  - `visibleAuthorWhereForViewer(viewerId)`
- Route handlers in `app/src/app/api/*`
- UI integration:
  - `app/src/app/(twitter)/settings/page.tsx`
  - `app/src/components/user/Profile.tsx`
  - `app/src/components/tweet/SingleTweet.tsx`

## Acceptance Criteria
1. Block/mute/report/preferences endpoints are available and persisted.
2. Private/block/mute visibility is enforced in server read APIs.
3. Like/retweet/reply/message/follow flows honor relationship restrictions.
4. Settings/Profile UI surfaces account controls with clear feedback.
5. Lint/build/baseline pass and live-domain checks pass.
