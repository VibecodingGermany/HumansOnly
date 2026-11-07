# Architecture Spec - Wave 2 (Media Pipeline Hardening)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
1. Keep uploads authenticated.
2. Make uploads auditable and moderation-ready.
3. Enforce abuse controls (quota + duplicate reuse).
4. Support storage-agnostic persistence (local + managed provider).

## Chosen Approach
### Option Selected: DB-audited upload route with pluggable storage backend
- Add `MediaAsset` table for ownership, checksums, provider/key, moderation flags.
- Add storage provider abstraction (`local`, `supabase`, `auto`).
- Keep existing `/api/upload` client contract while extending response metadata.

## Diagram-as-Text
[Client FormData Upload]
  -> `/api/upload`
     -> Auth resolve (`getAuthenticatedUser`)
     -> Validate type/size
     -> Check daily quota from `MediaAsset` aggregates
     -> Compute checksum + dedupe lookup
     -> Image transform (Sharp)
     -> `storeMediaBuffer()` provider abstraction
         -> local filesystem OR Supabase Storage
     -> Persist `MediaAsset` row (audit + moderation defaults)
     -> Return `path` + `assetId` + provider/moderation metadata

## Data Model
- New model: `MediaAsset`
  - owner relation
  - provider + storageKey
  - url + uploadType + mimeType
  - original/compressed size
  - checksum
  - width/height
  - moderationStatus + moderationReason
  - timestamps + indexes

## Config Decisions
- `UPLOAD_STORAGE_PROVIDER`:
  - `local` (default)
  - `supabase`
  - `auto` (use supabase if configured, else local)
- `UPLOAD_MAX_FILES_PER_DAY` default `40`
- `UPLOAD_MAX_BYTES_PER_DAY` default `250MB`
- Managed storage env (optional):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET`

## Acceptance Criteria
1. Uploads remain authenticated (`401` unauth).
2. Successful uploads persist metadata in DB (`MediaAsset`).
3. Duplicate content for same user/type reuses existing asset (`reused: true`).
4. Route returns compatibility fields (`path`) plus audit metadata (`assetId`, `provider`, `moderationStatus`).
5. Production migration applies cleanly.
