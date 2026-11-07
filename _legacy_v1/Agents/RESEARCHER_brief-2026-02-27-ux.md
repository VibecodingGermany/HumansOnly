# Research Brief - UX, Engagement Features, Deploy Automation
Date: 2026-02-27
Owner: RESEARCHER

## Scope
- Improve UX quality and interaction reliability.
- Ensure users can mention/link each other in posts.
- Verify like/share/repost behavior robustness.
- Introduce and validate practical auto-deploy path to server.

## Key Facts (Code + Runtime)
1. Mention linking currently missing in post body rendering.
- Tweet text is rendered as plain text in:
  - `src/components/tweet/Tweet.tsx`
  - `src/components/tweet/SingleTweet.tsx`
- Existing `.mention` style is only used for explicit reply target labels.

2. Share behavior is limited.
- `src/components/tweet/Share.tsx` only calls `navigator.clipboard.writeText`.
- No native Web Share flow and no explicit fallback error state.

3. Like/Repost interactions mostly work but have fragility.
- `Like.tsx` uses optimistic updates with mismatched placeholder type (string id pushed into `likedBy` list).
- Action routes (`like`, `unlike`, `retweet`, `unretweet`) currently expect raw JSON body value instead of structured object; this is brittle.

4. Clerk migration changed auth entrypoints, but old auth components still coexist.
- Top-level Clerk UI exists in `layout.tsx`.
- Some legacy login UX elements still present in sidebars/dialog pathways.

5. Autodeploy is not yet implemented in repo.
- No `.github/workflows/*` deployment workflow exists.
- Deployment is currently manual (docs + ad-hoc server commands).

6. Server status (verified live)
- App is online on PM2 (`humansonly`, port `3001`, Nginx proxy active).
- Server repo is not a clean git checkout (no commits/upstream); artifact-style deploy is effectively used.

## Risks
1. `P0` No repository-level autodeploy pipeline means deploy drift risk remains high.
2. `P1` Engagement actions are vulnerable to payload-shape inconsistencies.
3. `P1` Mention UX gap reduces social graph usability and discoverability.
4. `P2` Mixed legacy + Clerk auth UX may confuse users.

## Open Questions
1. Should mentions trigger notifications immediately (server-side mention extraction), or linking-only for now?
2. Should autodeploy run on every `main` push or path-filtered to `app/**` + deployment files?

## Up-to-date References (Primary)
- Clerk Next.js App Router quickstart (middleware/proxy + provider):
  - https://clerk.com/docs/quickstarts/nextjs
- Clerk `clerkMiddleware()` + middleware behavior:
  - https://clerk.com/docs/references/nextjs/clerk-middleware
- GitHub Actions workflow syntax:
  - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions secrets usage:
  - https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
- MDN Web Share API:
  - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- MDN Clipboard API:
  - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
