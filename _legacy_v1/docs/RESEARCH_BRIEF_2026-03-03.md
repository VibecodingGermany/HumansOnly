# Research Brief - Social Growth + Admin Backoffice

Date: 2026-03-03  
Owner: Codex (Researcher)

## Scope

1. User attraction and retention loops for a social platform (feed, sharing, network effects).
2. Moderator/admin operating model (roles, appeals, decision quality, abuse controls).
3. Regulatory and trust constraints relevant to EU-facing social products in 2026.

## Key Facts

1. Modern feed systems are explicitly multi-stage (`candidate sourcing -> ranking -> heuristics/filters`) and combine engagement signals with safety and diversity constraints.
   - X engineering + open repo describe this pipeline and include explicit post-ranking heuristics such as author diversity, feedback fatigue, and safety filtering.
2. Large recommendation systems report better outcomes when they use multiple satisfaction signals, not only clicks.
   - YouTube documents clicks, watchtime, survey feedback, shares, likes/dislikes, plus demotion of harmful/borderline content.
3. EU platform expectations are stricter for moderation explanations and user control over ranking.
   - Commission DSA materials state users must receive reasons for moderation actions, appeal options, and non-personalized feed options on very large platforms.
4. EU AI transparency obligations are active in the current transition window and become broadly applicable on 2026-08-02.
   - Commission AI Act pages list timeline and transparency obligations (including AI-generated/deepfake disclosure context).
5. Current anti-bot posture depends on strict server-side challenge verification.
   - Cloudflare Turnstile docs require server-side validation; tokens are single-use and expire after 5 minutes.
6. Phishing-resistant authentication is now mainstream baseline guidance.
   - NIST SP 800-63B-4 (published 2025-08-01) supersedes SP 800-63B; passkey-related guidance is integrated in this revision cycle.
7. Authorization and admin controls should default to least privilege + deny-by-default + per-request checks + logging.
   - OWASP Authorization Cheat Sheet is explicit on these controls.
8. Proven social software admin models separate owner/admin/moderator concerns with role priority and audit-log access.
   - Mastodon docs expose role hierarchy and dedicated moderation/admin permissions in production deployments.

## Inferences For HumansOnly (from facts above)

1. A “best social system” needs explicit user agency loops, not only stronger ranking:
   - fast negative feedback controls
   - conversation prompts + creator momentum tools
   - diversity/fatigue constraints in ranking
2. Admin quality is a product feature:
   - clear queue prioritization
   - response-time/SLA visibility
   - durable auditability
3. Appeals flow quality is now a direct trust + compliance lever:
   - better user-side appeal UX
   - moderation workflow hardening
   - stronger abuse throttles and anomaly events

## Current Gaps (Mapped to Local Code)

1. Appeal submission UX is still prompt-based in settings (basic and error-prone).
2. Appeals queue lacks SLA metadata and explicit prioritization state.
3. Challenge/appeal abuse controls are partially present but not yet complete for moderator decision endpoints and anomaly signaling.
4. API documentation exists, but route-level operational contracts (SLA/rate-limit expectations) are still light.

## Risks

1. Engagement-only optimization risk: rabbit-hole effects and lower user trust.
2. Moderation bottleneck risk: no SLA visibility means unbounded appeal latency.
3. Abuse risk: concentrated automation against decision endpoints can degrade moderation quality.
4. Compliance risk: weak explanation and labeling controls become expensive near 2026-08-02 transparency obligations.

## Open Questions

1. Which appeal SLA target should be enforced for production (`24h` vs `48h`)?
2. Should anomaly events be only logs now, or also persisted in DB for dashboarding?
3. At what scale do we replace in-memory rate limiting with shared storage (Redis)?

## Assumptions

1. We keep existing role model (`user`, `moderator`, `admin`, `super-admin` protection).
2. We deliver Wave 7.3 in safe incremental slices (no risky full rewrite).
3. We preserve current Next.js + Prisma architecture and avoid infrastructure-heavy dependencies this cycle.

## Sources (Primary / Official where possible)

1. X Engineering - Recommendation pipeline overview (candidate/rank/filter): [blog.x.com](https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm) (published 2023-03-31, accessed 2026-03-03)
2. X open repository architecture: [github.com/twitter/the-algorithm](https://github.com/twitter/the-algorithm) (accessed 2026-03-03)
3. YouTube recommendation system (signals + responsible demotion): [blog.youtube](https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/) (published 2021-09-15, accessed 2026-03-03)
4. EU DSA user rights + feed control explainer: [commission.europa.eu](https://commission.europa.eu/news-and-media/news/digital-services-act-keeping-us-safe-online-2025-09-22_en) (published 2025-09-22, accessed 2026-03-03)
5. EU DSA VLOP obligations (non-profile recommender option): [digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/policies/dsa-vlops) (updated 2026, accessed 2026-03-03)
6. EU AI Act timeline + transparency applicability: [digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) (updated 2026, accessed 2026-03-03)
7. Cloudflare Turnstile server-side validation requirements: [developers.cloudflare.com](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) (updated 2026, accessed 2026-03-03)
8. NIST SP 800-63B-4 publication record: [nist.gov](https://www.nist.gov/publications/nist-sp-80063b-4digital-identity-guidelines-authentication-and-authenticator) (published 2025-08-01, accessed 2026-03-03)
9. OWASP Authorization Cheat Sheet: [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) (accessed 2026-03-03)
10. Mastodon roles and role priority docs: [docs.joinmastodon.org](https://docs.joinmastodon.org/admin/roles/) (last updated 2023-12-07, accessed 2026-03-03)
11. CISA event logging best practices: [cisa.gov](https://www.cisa.gov/resources-tools/resources/best-practices-event-logging-and-threat-detection) (published 2024-08-21, accessed 2026-03-03)
