# Change Log (Started at April 4, 2023)

## 2026-03-04 - Smoke User Cleanup Hardening + Account Self-Delete Endpoint (v1.18.6)

-   added authenticated legacy account self-delete API:
    -   `POST /api/users/me/delete`
    -   requires password + username confirmation
    -   blocks admin/super-admin deletion on this route
    -   removes restrictive dependent records before account delete
-   hardened smoke scripts to auto-clean created users on exit:
    -   `scripts/auth-smoke-local.sh`
    -   `scripts/live-social-smoke.sh`
    -   `scripts/human-layer-smoke.sh`
    -   `scripts/upload-compression-smoke.sh`
-   added cleanup helper for timestamped smoke users:
    -   `scripts/cleanup-artifact-users.sh --dry-run|--execute`
-   production data cleanup executed:
    -   removed `195` timestamped non-Clerk smoke users and dependent artifacts.

## 2026-03-04 - Delete Redirect Hardening on Single Post View (v1.18.5)

-   fixed single-post delete navigation race that could land users on a stale not-found page:
    -   `SingleTweet` now removes the deleted post detail query cache before redirect
    -   redirect to `/{username}` now happens immediately after successful deletion
    -   timeline queries are invalidated after redirect trigger
-   added client-side fallback redirect on single-post page when the current user/moderator/admin lands on a missing post after delete:
    -   `app/src/app/(twitter)/[username]/tweets/[tweetId]/page.tsx`
    -   avoids false “Sorry, that page doesn't exist!” after legitimate delete actions

## 2026-03-04 - Smoke Cleanup Guard + Incident Cleanup (v1.18.4)

-   fixed human-layer smoke script to auto-clean test posts after validation:
    -   `scripts/human-layer-smoke.sh` now deletes `human-layer-smoke-*` posts created during the run
    -   prevents explore/feed pollution from validation artifacts
-   verified live cleanup:
    -   removed existing smoke artifacts from production (`6` posts deleted)
    -   confirmed zero remaining `human-layer-smoke-*` posts after script run
-   incident note:
    -   observed short-lived `502` window caused by host/service restart (Nginx + PM2 recovered, services online)

## 2026-03-04 - API Reliability Sweep + Docs Closure (v1.18.3)

-   hardened additional high-traffic APIs to structured observability responses (request-id aware):
    -   `GET /api/search`
    -   `GET /api/notifications`
    -   `POST /api/notifications/create`
    -   `GET/POST /api/notifications/preferences`
    -   `GET /api/messages/[username]`
    -   `POST /api/messages/delete`
    -   `POST /api/messages/read`
    -   `GET /api/feed/for-you`
    -   `GET /api/users/[username]`
    -   `GET /api/users/random`
    -   `POST /api/users/[username]/unfollow`
    -   `POST /api/tweets/create`
    -   `POST /api/tweets/[username]/[tweetId]/like`
    -   `GET/POST /api/tweets/[username]/[tweetId]/reply`
    -   `POST /api/tweets/[username]/[tweetId]/retweet`
-   improved mutation robustness:
    -   explicit not-found handling (`P2025`) in like/unfollow/retweet-related paths
    -   normalized bad-payload handling with `400` + structured messages
-   completed documentation cleanup for open checklists:
    -   removed stale `TBD` consumer placeholders from `docs/API_CONSUMERS.md`
    -   converted old pending TODO checklist to completed audit checklist (`2026-03-04`)
    -   refreshed app README roadmap snapshot and removed stale checkbox backlog format

## 2026-03-04 - API Hardening + Admin Live System Status (v1.18.2)

-   hardened additional tweet endpoints with structured observability responses:
    -   `GET /api/tweets/[username]/media`
    -   `GET /api/tweets/[username]/likes`
    -   `GET /api/tweets/[username]/replies`
    -   `GET /api/tweets/related`
    -   `POST /api/tweets/[username]/[tweetId]/unlike`
    -   `POST /api/tweets/[username]/[tweetId]/unretweet`
-   improved unretweet robustness:
    -   explicit `404` when source post is missing
    -   safe no-op behavior when user has no retweet record
    -   response now includes `removedRetweet` flag
-   extended admin dashboard with live runtime visibility:
    -   new System Status card (health, uptime, node version)
    -   release metadata surfacing (`sha`, workflow run, deploy timestamp) via `/api/health`
    -   refresh interval for near-live operational monitoring

## 2026-03-03 - System Hardening + Admin Dashboard UX (v1.18.1)

-   fixed post deletion hardening:
    -   `POST /api/tweets/[username]/[tweetId]/delete` no longer returns false `404` on slug mismatch
    -   ownership/moderator authorization remains enforced by `authorId` + role checks
    -   improved structured error handling with request-id aware responses
-   improved delete UX on single post page:
    -   surfaced delete failures in snackbar instead of silent console-only errors
-   hardened API error handling for high-traffic tweet read endpoints:
    -   `GET /api/tweets/all`
    -   `GET /api/tweets/[username]`
    -   `GET /api/tweets/[username]/[tweetId]`
-   upgraded admin dashboard presentation for operational clarity:
    -   severity pills for moderation/KPI/creator state
    -   KPI health row list
    -   quick action links
-   extended live smoke script with delete-route hardening check:
    -   `scripts/live-social-smoke.sh`

## 2026-03-03 - Wave 8.0 Creator Commerce Foundation (v1.18.0)

-   added creator-commerce domain models and migration:
    -   `CreatorProfile`
    -   `CreatorPortfolioItem`
    -   `CreatorTip`
    -   migration: `20260303173000_add_creator_commerce_foundation`
-   added creator APIs:
    -   `GET/POST /api/creator/profile`
    -   `GET/POST /api/creator/items`
    -   `GET /api/creator/[username]`
    -   `POST /api/creator/tips`
-   added Artist Studio (Beta) in Settings:
    -   creator profile setup
    -   image/audio portfolio item publishing
    -   creator item list in settings
-   added public `CreatorShowcase` on profile pages:
    -   published artworks/tracks
    -   support action buttons
-   extended upload pipeline with creator media types:
    -   `creator_image`
    -   `creator_audio`
-   extended admin analytics/dashboard with creator-commerce KPIs:
    -   active creators
    -   published artist items
    -   support transaction count + volume
-   enforced default protected super-admin identity:
    -   `@human_ikzcsvsb`

## 2026-03-03 - Wave 7.3 Appeals Hardening (v1.17.0)

-   added Wave 7.3 planning artifacts:
    -   `docs/RESEARCH_BRIEF_2026-03-03.md`
    -   `docs/ARCHITECTURE_SPEC_WAVE7_3.md`
-   added appeal SLA metadata in moderator queue API:
    -   `slaDueAt`, `slaRemainingMinutes`, `slaState`
    -   env knobs: `APPEAL_SLA_HOURS`, `APPEAL_SLA_SOON_MINUTES`
-   replaced prompt-based appeal submission with inline composer UX in settings:
    -   textarea input
    -   quick templates
    -   character counter
-   expanded anti-abuse controls with `429 + Retry-After` on:
    -   `POST /api/human/challenge/verify`
    -   `POST /api/authenticity/appeals`
    -   `POST /api/moderation/authenticity/[id]/decision`
    -   `POST /api/moderation/authenticity/appeals/[id]/decision`
-   added structured security throttle/anomaly events via:
    -   `src/utilities/security/events.ts`
-   extended admin dashboard and operations docs with appeal SLA health visibility

## 2026-03-03 - Human Layer Smoke Portability Hotfix (v1.16.1)

-   fixed `scripts/human-layer-smoke.sh` for macOS Bash 3.2 compatibility:
    -   replaced nameref-based status/body splitting (`local -n`) with portable helper functions
-   revalidated live smoke coverage against production:
    -   `scripts/live-social-smoke.sh https://humans-only.de`
    -   `scripts/human-layer-smoke.sh https://humans-only.de`

## 2026-03-03 - Phases 2-5 Delivery Slice (v1.16.0)

-   Phase 2 (Creation Delight):
    -   added resilient local draft persistence for post and reply composers
    -   added clearer composer status rows (draft state + selected media controls)
    -   added feature-flagged video beta preview hint (`NEXT_PUBLIC_VIDEO_BETA_PREVIEW`)
-   Phase 3 (Conversation Loops):
    -   added `ConversationPrompts` module on Home with prompt-usage analytics event
-   Phase 4 (Admin Backoffice V1):
    -   added dedicated admin dashboard route `/admin`
    -   linked admin navigation entry in sidebar/profile menu for admins
-   Phase 5 (Compliance/Hardening):
    -   added in-memory rate limiting utility for sensitive routes
    -   applied `429 + Retry-After` controls to:
        -   `POST /api/human/challenge/verify`
        -   `POST /api/authenticity/appeals`
    -   documented weekly KPI review ritual in `docs/OPERATIONS.md`

## 2026-03-03 - Phase 1 Feed Discovery V1 (v1.15.0)

-   added For You feed API:
    -   `GET /api/feed/for-you` (ranking heuristic with recency + engagement + follow boost)
-   added recommendation feedback API:
    -   `POST /api/feed/feedback` (`not_interested`)
-   added `RecommendationFeedback` data model + migration (`20260303142000_add_recommendation_feedback`)
-   added home feed mode toggle:
    -   `Following` / `For You`
-   added tweet menu action:
    -   `Not interested` (stores feedback and refreshes home feed)

## 2026-03-03 - Phase 0.3 Metrics Hardening (v1.14.0)

-   expanded product event coverage for additional core behaviors:
    -   `message_created` via `POST /api/messages/create`
    -   `notifications_marked_read` via `GET /api/notifications/read`
    -   `profile_updated` via `POST /api/users/[username]/edit`
-   extended product event registry (`src/utilities/analytics/events.ts`)
-   enhanced admin KPI endpoint with health thresholds + boolean health flags:
    -   `KPI_MIN_ACTIVE_USERS_7D` (default `10`)
    -   `KPI_MIN_POSTS_CREATED_7D` (default `20`)
    -   `KPI_MIN_REPLIES_CREATED_7D` (default `10`)

## 2026-03-03 - Phase 0.2 Admin Analytics Snapshot (v1.13.0)

-   added admin analytics snapshot UI section in Settings (admin-only):
    -   7-day active users / posts created / replies created cards
    -   7-day event count list from aggregated KPI endpoint
-   added fetch integration:
    -   `getAdminAnalyticsKpis(7)` query in settings page
-   added responsive settings styles for KPI metric cards
-   updated roadmap/docs to reflect Phase 0.2 progress

## 2026-03-03 - Phase 0.1 Metrics Expansion + Admin KPI Endpoint (v1.12.0)

-   expanded server-side product event tracking for core actions:
    -   `post_created` in `POST /api/tweets/create`
    -   `post_liked` in `POST /api/tweets/[username]/[tweetId]/like`
    -   `reply_created` in `POST /api/tweets/[username]/[tweetId]/reply`
    -   `user_followed` in `POST /api/users/[username]/follow`
-   added shared server analytics writer:
    -   `src/utilities/analytics/server.ts` (`trackProductEventForUser`)
-   added admin KPI aggregation endpoint:
    -   `GET /api/admin/analytics/kpis?days=7`
    -   returns event counts, daily event series, and activity summary (`postsCreated`, `repliesCreated`, `activeUsers`)
-   added fetch helper:
    -   `getAdminAnalyticsKpis(days)`
-   updated roadmap and API consumer documentation for Phase 0.1

## 2026-03-03 - Phase 0 Measurement Foundation (v1.11.0)

-   added `ProductEvent` data model + migration (`20260303121500_add_product_events_foundation`)
-   added new product analytics ingestion API:
    -   `POST /api/analytics/events`
-   added shared analytics utility:
    -   `src/utilities/analytics/events.ts` (event registry + type guards)
    -   `trackProductEvent(...)` helper in `src/utilities/fetch/index.ts`
-   instrumented Home feed with first product events:
    -   `feed_home_loaded`
    -   `feed_home_empty`
    -   `feed_home_error`
-   updated docs and roadmap to mark Phase 0 rollout start

## 2026-03-03 - Authenticity Appeals Foundation + Docs Sync (v1.10.0)

-   added `AuthenticityAppeal` data model + migration
-   added new APIs:
    -   `GET /api/me/authenticity`
    -   `GET /api/authenticity/appeals`
    -   `POST /api/authenticity/appeals`
    -   `GET /api/moderation/authenticity/appeals`
    -   `POST /api/moderation/authenticity/appeals/[id]/decision`
-   extended settings page:
    -   user-side authenticity status and appeal submission
    -   user-side appeal status list
    -   moderator-side appeal queue decisions
-   extended `scripts/human-layer-smoke.sh` to cover appeals endpoint validation and moderation access guards
-   documented remaining open work in root/app README and `Rodemap.md`

## 2026-03-03 - Adaptive Trusted Fallback + Block Responses (v1.9.3)

-   updated human gate logic to support trusted fail-open fallback:
    -   `trusted` / `high_trust` users can continue if challenge is missing/invalid
    -   fallback is always forced to `pending_review`
-   differentiated API behavior for authenticity outcomes:
    -   `pending_review` -> `202`
    -   `block` -> `403` with `code: "authenticity_blocked"`
-   applied across create/edit/reply/upload post-authenticity routes

## 2026-03-03 - Human Layer Smoke Validation Script (v1.9.2)

-   added `scripts/human-layer-smoke.sh` for repeatable authenticity-layer smoke coverage:
    -   rules current + accept success/failure checks
    -   challenge endpoint validation checks
    -   trust endpoint check
    -   moderator queue access guard check
    -   adaptive assertions for dry-run vs strict challenge enforcement
-   updated release-gate docs to include human-layer smoke

## 2026-03-03 - Turnstile Client Enforcement for Post Actions (v1.9.1)

-   added reusable client Turnstile widget component (`src/components/human/TurnstileChallenge.tsx`)
-   wired Turnstile token flow into:
    -   create post composer
    -   reply composer
    -   edit post dialog
-   aligned edit mutations on timeline + single-post view to always request `post_edit` human context with challenge token
-   improved challenge UX with token refresh after each submit attempt to avoid stale/replayed tokens

## 2026-03-02 - Human Authenticity Layer Foundation (v1.9.0)

-   added Wave 7 authenticity data model foundation:
    -   `PolicyDocument`
    -   `PolicyAcceptance`
    -   `HumanChallengeSession`
    -   `AuthenticityCheck`
    -   new tweet/media authenticity fields (`visibilityStatus`, risk/decision metadata, provenance metadata)
-   added new APIs:
    -   `GET /api/rules/current`
    -   `POST /api/rules/accept`
    -   `POST /api/human/challenge/verify`
    -   `GET /api/me/trust`
    -   `GET /api/moderation/authenticity`
    -   `POST /api/moderation/authenticity/[id]/decision`
-   wired create/edit/reply flows into a shared human gate pipeline (rules acceptance + challenge + trust/risk scoring)
-   added first `/rules` page and linked it in sidebar/profile menu
-   added authenticity moderation queue controls in Settings
-   added feed visibility filtering for blocked/non-public authenticity states
-   added upload provenance signal extraction + persistence (`provenanceStatus`, `syntheticRiskScore`)
-   updated terms to explicitly prohibit AI-generated content being posted as human-created

## 2026-03-02 - Sidebar Rework, Legal Hub, Version Sync + Clerk Username Cleanup (v1.8.9)

-   added right-sidebar community board for contributor recruiting and partner ad inventory:
    -   primary campaign card for developers/moderators/contributors
    -   two prepared ad placeholder cards
-   added legal routes:
    -   `/legal/terms`
    -   `/legal/privacy`
    -   `/legal/cookies`
    -   `/legal/imprint`
    -   `/legal/accessibility`
-   switched legal/footer links to Humans Only legal hub and official project GitHub
-   replaced favicon assets with red fist branding (`src/app/icon.png`, `public/assets/favicon*.png`)
-   added version automation:
    -   `scripts/sync-version-file.mjs`
    -   generated `src/version.ts`
    -   generated plain `version` file for release visibility
    -   hooked sync into `predev`, `prebuild`, `prestart`, and `version` script
-   improved Clerk username handling:
    -   better username candidates from claims (`username`, `preferred_username`, email, name variants)
    -   auto-upgrade for legacy auto-generated usernames like `human_xxxxxxxx`
    -   preserves manually chosen usernames

## 2026-03-02 - Super Admin RBAC + Full Edit Composer (v1.8.8)

-   added super-admin bootstrap allowlists via env vars:
    -   `SUPER_ADMIN_USERNAMES`
    -   `SUPER_ADMIN_CLERK_IDS`
-   added centralized effective-role/super-admin resolver in `src/utilities/auth/roles.ts`
-   enforced server-side admin escalation guards:
    -   only super admins can assign/remove `admin`
    -   super-admin identities are protected from role edits
-   added structured role-change audit logs (`event: role_change`)
-   upgraded post edit UX from text-only modal to composer-style editor:
    -   emoji support
    -   image replace/remove
    -   upload-before-save integration with existing edit API
-   updated settings role-management UI for super-admin visibility and protections
-   synchronized auth/session JWT payloads with `isSuperAdmin` + effective role resolution

## 2026-02-28 - Roles, Moderation, Mobile UX + CI Reliability (v1.8.7)

-   added admin/moderation APIs for user role changes and report queue status updates
-   added post edit API + UI flow with edited marker support (`Tweet.editedAt`)
-   enabled moderator/admin post deletion from UI and backend auth checks
-   fixed single-post delete path to use `username` route param instead of user ID
-   added mobile bottom navigation and floating post action for authenticated users
-   added migration `20260227235937_add_roles_and_tweet_editing` (`User.role`, `Tweet.updatedAt`, `Tweet.editedAt`)
-   hardened `scripts/ci-quality.sh` to set Prisma env before `npm ci` and isolate `NODE_ENV` from `.env`

## 2026-02-27 - CI Gate Env Fallback Fix (v1.8.6)

-   fixed recurring GitHub Quality Gate failures by providing CI-safe fallback `DATABASE_URL`/`DIRECT_DATABASE_URL` when no `.env` exists on runners
-   aligned `baseline-check.sh` with the same Prisma env fallback behavior for consistent local/CI results

## 2026-02-27 - Upload + Media Security Hardening (v1.8.5)

-   hardened `/api/upload` request validation with strict `multipart/form-data` and request-size guardrails
-   added declared-vs-detected MIME enforcement and reject-on-mismatch behavior to block spoofed uploads
-   enforced optimizer hard output limits so oversized images fail fast instead of being stored
-   centralized media URL sanitization across profile edit, tweets, replies, and messages APIs
-   restricted accepted media URLs to local uploads and configured storage origins/hosts only
-   switched upload/storage object key suffixes from `Math.random` to crypto-grade random bytes
-   extended live upload smoke with explicit MIME-mismatch negative checks

## 2026-02-27 - CI/Prisma Env Hotfix (v1.8.4)

-   fixed `DIRECT_DATABASE_URL` validation failures in quality scripts by auto-falling back to `DATABASE_URL` when missing
-   limited `.env` sourcing in quality scripts to Prisma steps so `NODE_ENV=development` does not break production builds
-   updated `.env.example` with `DIRECT_DATABASE_URL` to match Prisma schema requirements
-   hardened upload compression smoke script with startup readiness/retry handling for fresh deploy runs

## 2026-02-27 - Adaptive Image Compression Pipeline (v1.8.3)

-   added adaptive upload optimizer with iterative quality + rescale passes per upload type (`profile`, `header`, `post`)
-   introduced per-type output byte budgets with hard caps and automatic fallback encoding
-   normalized uploaded images to web delivery formats (`image/webp` primary, JPEG fallback for hard-limit cases)
-   extended upload API response with compression diagnostics (`outputFormat`, dimensions, target/hard limits, attempt count)
-   added live verification script `scripts/upload-compression-smoke.sh` for large image fixtures and invalid-image rejection checks

## 2026-02-27 - Upload Hardening Hotfix (v1.8.2)

-   hardened `/api/upload` with real image parsing validation and decompression safeguards
-   expanded supported upload types (`AVIF`, `HEIC`, `HEIF`) and aligned stored MIME type with processed output
-   improved upload client error handling for non-JSON/HTTP error responses
-   added strict profile/header file validation + accepted MIME filters in edit profile UI
-   extended Next.js image domain allowlist to include `humans-only.de` to prevent optimizer `400` failures
-   improved `/api/users/preferences` handling for stale/missing user records to avoid avoidable `500` responses

## 2026-02-27 - Hotfix (v1.8.1)

-   fixed frontend API base URL handling to use same-origin calls in the browser
-   added server-only fallback base URL (`INTERNAL_API_BASE_URL`) for route-to-route fetches
-   resolved production auth/session mismatch on `humans-only.de` affecting messaging, profile edit, and settings actions

## 2026-02-27 - Hotfix (v1.5.1)

-   fixed `POST /api/users/create` unhandled hashing failure path by moving password hashing into route `try/catch`
-   restored JSON error handling path and eliminated HTML `500 Internal Server Error` regression on user signup

## 2026-02-27 - Wave 3 Messaging + Notifications Reliability (v1.5.0)

-   added `Message.isRead` field and `POST /api/messages/read` endpoint
-   added `NotificationPreference` model and `GET/POST /api/notifications/preferences`
-   updated `/api/messages/[username]` with `totalUnread`, per-conversation `unreadCount`, and pagination metadata
-   updated `/api/notifications` with `unreadCount` + pagination metadata
-   updated `/api/notifications/create` to respect recipient preference toggles
-   updated message UI to mark conversations as read on open and refresh unread counters
-   deployed migration `20260227212241_add_notification_preferences_and_message_reads`

## 2026-02-27 - Wave 2 Media Pipeline Hardening (v1.4.0)

-   added `MediaAsset` Prisma model for upload audit and moderation metadata
-   added storage abstraction in `src/utilities/storage/server.ts` (`local`, `supabase`, `auto`)
-   hardened `/api/upload` with per-user daily upload count + byte quotas
-   added checksum dedupe/reuse for identical uploads (`reused: true`)
-   extended upload response with `assetId`, `provider`, `moderationStatus`
-   deployed migration `20260227211236_add_media_assets` to production

## 2026-02-27 - Wave 1 Auth Consolidation (v1.3.0)

-   added centralized Clerk-first auth resolver in `src/utilities/auth/session.ts`
-   migrated protected tweets/users/messages/notifications/upload routes to shared auth resolver
-   updated `/api/auth/session` to return canonical session data with `source` metadata
-   removed server dependency on client-sent `tokenOwnerId` for authorization
-   updated frontend fetch + mutation callers to stop sending `tokenOwnerId`
-   removed unused legacy auth dialogs (`LogInDialog`, `SignUpDialog`)

## 2026-02-27 - Hotfix (v1.2.3)

-   added `bcryptjs` fallback for hashing/comparison when native `bcrypt` fails at runtime

## 2026-02-27 - Wave 0 Stabilization (v1.2.2)

-   fixed client action ID transport (`tokenOwnerId`) to use plain UUIDs
-   added backend normalization for legacy quoted UUID payloads
-   required authentication for `/api/upload`
-   fixed `tweets/all` pagination count to exclude replies
-   stabilized unauthenticated UX on Home/Messages/Notifications pages
-   moved verified-human code check to server-side validation in profile edit route
-   redacted sensitive deployment credentials from docs

-   [x] add hash to passwords when creating
-   [x] add auth
-   [x] if auth, return to /home | /explore
-   [x] add regex validation to usernames / yup docs
-   [x] list tweets as last tweeted first
-   [x] add a static @ into username in login and sign up
-   [x] if name is not provided, get username in prisma schema
-   [x] refactor sign up and sign in forms
-   [x] break-word for description
-   [x] add env.example
-   [x] add modal for logout
-   [x] think about test account
-   [x] global loading
-   [x] add global loading as twitter bird with animation
-   [x] tweak useAuth, add loading state for auth loading instead of null
-   [x] optimistic update on likes
-   [x] unlike feature
-   [x] animation on click ? react spring/framer
-   [x] div onClick and cursor pointer for tweets
-   [x] useContext in useAuth?
-   [x] fix the logout sometimes not working as expected
-   [x] authorization wall for create/like/unlike
-   [x] fix middleware, make it useful
-   [x] handle tweet text html-like breaks
-   [x] emote picker in new tweet
-   [x] photo upload in new tweet
-   [x] more compact uploader for photo upload,
-   [x] supabase storage is ok to use for avatars and images? if not use aws
-   [x] clicking images should open full screen images
-   [x] avatar logic
-   [x] handle default avatar / twitter egg
-   [x] fix emoji not opening in the modal
-   [x] complete media link in profile
-   [x] follow/unfollow feature
-   [x] optimistic update on follow/unfollow
-   [x] lazy load tweets / react query implementation for lazy loading
-   [x] add is following you feature
-   [x] complete edit profile page
-   [x] fix url for photos (only short url exist for now, will give error)
-   [x] profile pic, header pic change in profile
-   [x] cascade in postgresql / how to handle deleted tweets
-   [x] refactor uploader in new tweet to prevent unnecessary uploads to the server, only upload if user tweets
-   [x] add delete options for users tweets
-   [x] handle tweet not found error
-   [x] handle user not found error
-   [x] authorization wall for delete/follow/unfollow/edit
-   [x] add retweet feature
-   [x] single tweet page refactor with images
-   [x] header and profile picture click fullscreen preview
-   [x] show retweets in the main flood
-   [x] add reply feature
-   [x] single tweet page shows all replies or only first degree replies?
-   [x] console log every useQuery to find out if any password leaking
-   [x] exlude password in prisma includes:{}, fix types and what includes for all api routes
-   [x] handle errors like "user already exists"
-   [x] add card when hover on tweet profile & username & who retweeted & mentioned
-   [x] complete profile, remove placeholders, desc images and everything
-   [x] think about handling related errors in the fetch folder
-   [x] add global-error.tsx
-   [x] use "use client" if possible
-   [x] change all request type to nextRequest
-   [x] organize overall code/folders
-   [x] autofocus in modals
-   [x] add loading when logging as test account
-   [x] change explore to home, home only followings
-   [x] make settings public, home private
-   [x] progress bar for 280 characters
-   [x] animations on tweets
-   [x] hover effect on avatars
-   [x] custom scrollbar
-   [x] header photo with twitter bird
-   [x] you are not authorized seen as json, do a page for that
-   [x] start working on right sidebar
-   [x] search mechanism, only for users / users and tweets would be better
-   [x] useDeferredValue for search if react query has not have it
-   [x] if auth, show random non-followed 3 people with avatars for user to follow in right side
-   [x] add complete profile reminder
-   [x] add snackbar for some feedback, copy from twitter
-   [x] add footer-like twitter info, github
-   [x] add html dialog for confirmations
-   [x] find a better way to delete tweets other than window.location.replace()
-   [x] find throw new Errors, console.logs, message:, error:, snackbar here, alert(), confirm(),
-   [x] handle home/edit explore/edit and this kind of paths, redirect if requested. or catch all method
-   [x] add twitter blue tick in edit profile
-   [x] change localhost to env or however next handles this
-   [x] add messages feature
-   [x] add images for messaging
-   [x] optimistic update on new messages
-   [x] scroll down to bottom of chat when opening messages
-   [x] add disabled buttons
-   [x] handle username is not found error with snackbar while messaging
-   [x] add new message button on profiles
-   [x] handle users trying to message themselves
-   [x] handle users message click without auth
-   [x] add delete conversations logic
-   [x] finish /home (only followings and user's tweets)
-   [x] add css tooltip for verified blue tick
-   [x] complete share button in related components
-   [x] add notifications
-   [x] add welcome notification
-   [x] handle users getting notifications from themselves
-   [x] handle message notification's frequency
-   [x] message and notifications length, and banner to icon
-   [x] handle isRead function
-   [x] finish /notifications page
-   [x] error handling with onSuccess, onError, throw new Error in fetch responses
-   [x] add next optimized fonts
-   [x] improve new message modal visually
-   [x] add different active icons for left-sidebar
-   [x] sticky page names and back links
-   [x] add dark mode
-   [x] finish /settings page
-   [x] fix favicon problem when path is deeper
-   [x] choose database and vercel serverless locations close
-   [x] make color choice stable by saving it to the localstore
-   [x] activate material ui dark mode when dark mode
-   [x] optimistic updates on maybe tweet creation, retweet especially, try passing isRetweeted as a prop then set onMutate
-   [x] make it responsive

# Deploy 1.0.0 (May 18, 2023)

-   [x] create changelog md
-   [x] update db settings
-   [x] update broken dependencies
-   [x] change host & dns
