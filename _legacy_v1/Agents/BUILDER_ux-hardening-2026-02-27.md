# Builder Report - UX + Engagement + Deploy Hardening
Date: 2026-02-27
Owner: BUILDER

## Implemented Scope

### 1. UX and Social Linking
- Added `MentionText` renderer for post body content:
  - `src/components/misc/MentionText.tsx`
- Integrated mention rendering in:
  - `src/components/tweet/Tweet.tsx`
  - `src/components/tweet/SingleTweet.tsx`

### 2. Engagement Reliability
- Upgraded share logic (`src/components/tweet/Share.tsx`):
  - Native Web Share API first
  - Clipboard fallback second
  - Explicit user feedback on failures
- Hardened like logic (`src/components/tweet/Like.tsx`):
  - Guard for unloaded tweet query data
  - Safer optimistic update handling
- Standardized action payloads to `{ tokenOwnerId }` in fetch layer:
  - `src/utilities/fetch/index.ts`
- Updated action API routes to accept object payload and remain backward compatible:
  - likes: `.../like/route.ts`, `.../unlike/route.ts`
  - reposts: `.../retweet/route.ts`, `.../unretweet/route.ts`
  - follow: `users/[username]/follow|unfollow/route.ts`
  - delete tweet: `.../delete/route.ts`

### 3. Auth UX Alignment
- Updated sidebar unauthenticated actions to Clerk modal flows:
  - `src/components/layout/RightSidebar.tsx`
- Updated logout flow to clear legacy session and Clerk session:
  - `src/components/layout/LeftSidebar.tsx`

### 4. Deploy and Automation
- Added auto-deploy workflow:
  - `.github/workflows/deploy.yml`
- Added manual deploy script:
  - `scripts/deploy-server.sh`
- Added safeguards in deploy sync:
  - excludes `public/uploads` from destructive `rsync --delete`
  - excludes `.env.backup*`
  - health-check retry loop after PM2 restart

### 5. Documentation
- Updated deploy docs and root README for new deployment flow and script usage.
- Updated changelog with `1.2.1` entry.

## Server-side Operations Executed
- Set Clerk keys in `/var/www/humansonly/.env`.
- Executed full deploy via `./scripts/deploy-server.sh`.
- Confirmed PM2 process `humansonly` online post deploy.
