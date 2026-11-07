# Architecture Spec - UX + Engagement + Deploy Automation (Iteration 1)
Date: 2026-02-27
Owner: ARCHITECT

## Goal
Deliver a stable improvement slice that is deployable immediately:
1. Mention links in content are clickable and readable.
2. Like/Repost/Share flows are resilient and predictable.
3. Deployment can be automated from GitHub to server.
4. Validation is repeatable (local + server probes).

## Chosen Approach
### Option Selected: Incremental hardening over existing stack
- Keep current Prisma + API routes + Clerk bridge architecture.
- Add UI utility layer for mentions + share UX improvements.
- Normalize engagement action payload contracts (object body with backward compatibility).
- Add CI/CD deployment workflow and a matching local/manual deploy script.

## Diagram-as-Text
[Client UI]
  -> Mention renderer (`MentionText`) for post text
  -> Like/Repost/Share components
  -> API fetch helpers (structured action payload)
  -> Next.js API route handlers (auth + payload validation)
  -> Prisma/PostgreSQL

[GitHub push main]
  -> GitHub Actions deploy workflow
  -> SSH + rsync to `/var/www/humansonly`
  -> remote `npm ci` + `prisma migrate deploy` + `next build` + `pm2 restart`
  -> health probe validation

## Module Plan
1. Mention rendering
- New reusable component: `src/components/misc/MentionText.tsx`.
- Integrate in `Tweet.tsx` and `SingleTweet.tsx`.

2. Engagement robustness
- Improve `Share.tsx` with native Web Share first, clipboard fallback second, deterministic snackbar.
- Improve `Like.tsx` guard rails for unloaded data + optimistic update consistency.
- Normalize fetch + API payload for like/unlike/repost/unrepost/delete action routes.

3. UX touch-ups (low-risk)
- Replace sidebar unauthenticated links with Clerk modal buttons where appropriate.

4. Deploy automation
- Add `.github/workflows/deploy.yml` (push to `main`).
- Add `scripts/deploy-server.sh` for manual parity and operational fallback.
- Keep secrets in GitHub Actions secrets; no credentials in repo.

## Acceptance Criteria
1. Mention links render and route to `/<username>` from tweet body text.
2. Share button works on devices with Web Share and still works via clipboard fallback.
3. Like/Repost actions succeed with structured payload and do not crash on missing query data.
4. `npm run lint` and `npm run build` pass.
5. Deploy script runs successfully to server and app stays online.
6. GitHub workflow file is present and syntactically valid.
