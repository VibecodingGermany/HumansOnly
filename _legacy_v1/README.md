<div align="center">

<img src="app/public/assets/ho-logo-icon.png" alt="Humans Only Red Fist" width="140" />

# HUMANS ONLY

### Human-first social network. No AI-generated posts.

[![Live](https://img.shields.io/badge/Live-humans--only.de-EA2A12?style=for-the-badge)](https://humans-only.de/)
[![Quality Gates](https://img.shields.io/github/actions/workflow/status/cubetribe/HumansOnly/quality-gates.yml?branch=main&label=Quality%20Gates&style=for-the-badge)](https://github.com/cubetribe/HumansOnly/actions/workflows/quality-gates.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/cubetribe/HumansOnly/deploy.yml?branch=main&label=Deploy&style=for-the-badge)](https://github.com/cubetribe/HumansOnly/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/cubetribe/HumansOnly?style=for-the-badge)](LICENSE)

[Live Platform](https://humans-only.de/) · [Deployment](docs/DEPLOYMENT.md) · [API](docs/API_CONSUMERS.md) · [Roadmap](#roadmap)

---

*Built with modern AI-assisted engineering.*
*Built for authentic, human-created social content.*
*Engineered, tested, and deployed continuously.*

</div>

---

## What's Happening Here

The internet has an authenticity problem. Your feed is full of AI-generated art posted as "my latest work," LLM-written LinkedIn posts about "my journey," and deepfake selfies from people who look suspiciously like they were rendered at 4K resolution with perfect skin.

**Humans Only is a social platform where every post, every image, every thought comes from an actual human being.** No exceptions. No "but my prompt was really creative." No.

This is a space for artists, musicians, writers, creators, thinkers, overthinkers, and people who still type their own tweets at 2am with typos they refuse to fix.

We're building a home for human expression. And yes - we're using AI to build it.

> *"In a world full of AI-generated cat pictures... be the real cat."*

## The Irony (Let's Talk About It)

We use AI. Every day. We think it's incredible technology.

We also think your social media feed shouldn't be a guessing game of "did a human write this or did someone spend 30 seconds on a prompt?" There's a difference between **AI as a tool** and **AI as the voice.**

So here's what's happening: AI is helping us write the code that will detect and lock out AI-generated content. Read that again. **The AI is building the cage. For itself.**

If that's not the most poetically absurd thing in tech right now, we don't know what is.

Our position is simple:
- **AI building tools for humans?** Great. Do that.
- **AI pretending to be human?** Not here. Not on this platform.

We use AI to build. Humans get to create.

<!-- 
📸 SCREENSHOT PLACEHOLDER
Add a screenshot or GIF of the app here. Show the vibe.
![Humans Only Screenshot](docs/images/screenshot-demo.png)
-->

## What's Already Standing

This isn't a concept. It's not a pitch deck. It's deployed, it's live, and you can use it right now at **[humans-only.de](https://humans-only.de/)**.

**The platform:**
- User profiles with bios and images
- Posts with replies and nested conversations
- Follow system, likes, reposts
- Composer-grade post editing (text, emoji, replace/remove image)
- Moderated deletion controls
- Rules page + versioned policy acceptance flow
- Pre-post human challenge verification pipeline with Turnstile token capture in create/reply/edit flows
- Direct messaging
- Real-time notifications
- Private profiles + message privacy controls
- Block, mute, and report flows
- Role-based moderation (`user`, `moderator`, `admin`) with protected super-admin controls
- Authenticity moderation queue (`allow`, `reject`, `strike`)
- User-facing authenticity status and appeals flow in Settings
- Moderator authenticity appeals queue with overturn/uphold decisions
- Artist Studio (Beta) in Settings (creator profile + portfolio publishing for image/audio)
- Public Artist Showcase on profile pages with support buttons
- Creator economy analytics in admin dashboards (active creators, published items, support volume)
- Trust snapshot API and adaptive risk scoring groundwork
- Global search
- Dark mode (because we're a resistance, not savages)
- Fully responsive - works on your phone, your laptop, your smart fridge (untested, but probably)

**The engine:**
- Next.js 14 / TypeScript / PostgreSQL / Prisma
- Clerk auth with legacy JWT bridge
- SSR, infinite scroll, optimistic updates
- Ubuntu 24.04, Nginx, PM2, HTTP/2, Let's Encrypt SSL

It's real. It works. And it's about to get a lot bigger.

## Join the Resistance

We're one person right now. That needs to change. Not because we're desperate - because this idea is bigger than a solo project.

If you've ever scrolled past a "painting" that was obviously Midjourney and felt something - annoyance, sadness, the slow death of your faith in the internet - this might be your project.

### 🔧 Developers

The stack is Next.js, TypeScript, PostgreSQL. There's real engineering ahead - AI content detection, moderation systems, performance at scale. If that sounds like fun to you, it probably is.

### 🎨 Designers

The platform works. It doesn't look as good as it should yet. We need people who can make a resistance movement feel like somewhere you want to hang out every day.

### 🧠 Thinkers, Testers, Troublemakers

Don't code? Don't design? Don't care. Use the platform. Break things. Tell us what's stupid. Suggest what's missing. The best products are shaped by the people who use them, not just the people who build them.

**How to jump in:**
1. Check the [open issues](https://github.com/cubetribe/HumansOnly/issues)
2. Look at the [Roadmap](#roadmap) - find what pulls you
3. Open an issue, start a conversation, submit a PR
4. Or just show up and say hi

No contribution is too small. Fix a typo. Improve an error message. Roast our color scheme. It all moves this forward.

## Roadmap

### Current Delivery Status (2026-03-03)
- ✅ Waves `0-6` delivered (stabilization, auth, media hardening, messaging, operations, live validation).
- ✅ Wave `7` significantly advanced (rules, challenge, trust/risk gate, moderation queue, adaptive fallback, appeals backbone).
- ✅ Phase `0` measurement foundation started (`POST /api/analytics/events`, first home-feed product events).
- ✅ Phase `0.1` measurement expansion delivered (server-side events for create/like/reply/follow + admin KPI endpoint).
- ✅ Phase `0.2` delivered (admin analytics snapshot in Settings).
- ✅ Phase `0.3` delivered (message/notification/profile events + KPI health flags).
- ✅ Phase `1` delivered (For You feed API, feedback endpoint, and Home mode toggle).
- ✅ Phase `2` delivered (composer draft persistence + clearer composer media/draft states).
- ✅ Phase `3` delivered (conversation starter prompts on Home + usage analytics).
- ✅ Phase `4` delivered (dedicated `/admin` dashboard and admin navigation).
- ✅ Phase `5` delivered (rate limits on challenge/appeal APIs + KPI operations ritual).
- ✅ Wave `7.3` delivered (appeal SLA metadata, inline appeal UX, moderator decision throttles + anomaly logs, API/ops docs sync).
- 🔄 Wave `7` still open:
  - moderator SOP ownership + escalation schedule
  - distributed/global rate limiting (current implementation is in-memory per runtime)
  - richer appeal evidence model (attachments + structured claims)
- 🔄 Wave `8` started:
  - ✅ Wave `8.0` creator commerce foundation delivered (artist studio, showcase, support intents, creator KPIs)
  - ⏳ pending: Stripe Connect checkout/payout automation + rights-dispute workflow
- ⏳ Wave `9` not started (compliance labeling, rollout controls, calibration automation).

### Next Milestones
1. **Wave 7.3 - Appeals Hardening**
- Finalize moderator SOP + response SLA ownership model
- Upgrade in-memory abuse controls to shared-store rate limiting
- Add evidence attachments and richer moderator decision notes

2. **Wave 8.1 - Creator Payments Hardening**
- Activate Stripe Connect checkout + webhook reconciliation
- Add connected-account onboarding + payout status lifecycle
- Add rights/dispute moderation workflow for creator sales

3. **Wave 8.2 - Provenance + Trust Upgrade**
- Replace heuristic provenance extraction with C2PA-aware verification path
- Add UI provenance badges (`verified`, `unknown`, `invalid`)
- Integrate Clerk passkey enrollment signal into trust engine
- Reduce challenge friction for higher trust tiers with measurable guardrails

4. **Wave 9.0 - Compliance and Scale**
- Add transparency/labeling flows (EU AI Act timeline alignment)
- Introduce controlled rollout strategy (`10% -> 50% -> 100%`) with rollback criteria

Something on this list keeping you up at night? [That's your invitation.](#join-the-resistance)

## Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18.x+ (LTS recommended) |
| npm | 9.x+ |
| PostgreSQL | 14.x+ |

### Local Setup

```bash
# Clone and install
git clone https://github.com/cubetribe/HumansOnly.git
cd HumansOnly/app
npm install

# Database
createdb humansonly_dev

# Environment
cp .env.example .env
# Edit .env with your database credentials

# Clerk auth (local dev)
cat > .env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY
EOF

# Migrations
cd src
npx prisma migrate dev --name init
npx prisma generate
cd ..

# Run
npm run dev
# → http://localhost:3000
```

### Super Admin Bootstrap (Live/Prod)

Add one or both environment variables on your server to unlock protected super-admin controls in Settings:

```bash
SUPER_ADMIN_USERNAMES="your_username,co_admin_username"
SUPER_ADMIN_CLERK_IDS="user_2abc123,user_2def456"
```

Behavior:
- super admins can assign all roles (`user`, `moderator`, `admin`)
- regular admins can manage users/moderators, but cannot assign/demote admins
- super admin identities are protected from role edits
- role changes are server-audited via structured logs (`event: role_change`)
- default protected super-admin identity in code: `human_ikzcsvsb`

### Human Authenticity Layer (Wave 7 Foundation)

```bash
HUMAN_ENFORCEMENT_MODE="adaptive"      # off | adaptive
HUMAN_CHALLENGE_PROVIDER="turnstile"
TURNSTILE_SECRET_KEY="your_secret"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_site_key"
HUMAN_CHALLENGE_TTL_SECONDS="300"
HUMAN_REVIEW_THRESHOLD="0.72"
HUMAN_BLOCK_THRESHOLD="0.90"
HUMAN_RULES_VERSION="2026-03-02.1"
HUMAN_DRY_RUN="true"                    # start in dry-run for safe rollout
RATE_LIMIT_CHALLENGE_VERIFY_PER_10M="30"
RATE_LIMIT_APPEAL_SUBMIT_PER_DAY="12"
KPI_MIN_ACTIVE_USERS_7D="10"
KPI_MIN_POSTS_CREATED_7D="20"
KPI_MIN_REPLIES_CREATED_7D="10"
NEXT_PUBLIC_VIDEO_BETA_PREVIEW="false"  # feature-flagged UI readiness path
```

### Checks & Deploy

```bash
# Baseline gates (lint, build, prisma)
./scripts/baseline-check.sh

# CI-compatible quality gates (no DB migration status)
./scripts/ci-quality.sh

# Auth smoke test (app must be running on :3000)
./scripts/auth-smoke-local.sh

# Human authenticity smoke (rules/challenge/trust/moderation guards)
./scripts/human-layer-smoke.sh

# Full live-domain social smoke
./scripts/live-social-smoke.sh https://humans-only.de

# Upload compression/resize hardening smoke
./scripts/upload-compression-smoke.sh https://humans-only.de

# Final live validation matrix
./scripts/live-wave6-validation.sh https://humans-only.de

# One-off cleanup for timestamped smoke users (uses DATABASE_URL from env)
./scripts/cleanup-artifact-users.sh --dry-run
./scripts/cleanup-artifact-users.sh --execute

# Deploy (or --dry-run)
./scripts/deploy-server.sh
```

Smoke scripts now auto-delete the users they create via `POST /api/users/me/delete` to avoid test-account buildup.

Auto-deploy runs via `.github/workflows/deploy.yml` on pushes to `main`.

### Project Structure

```
HumansOnly/
├── app/                    # Main application
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   ├── prisma/        # Schema + migrations
│   │   ├── hooks/         # Custom hooks
│   │   ├── utilities/     # Helpers
│   │   └── types/         # TypeScript types
│   ├── public/            # Static assets
│   └── ecosystem.config.js
├── docs/
│   ├── DEPLOYMENT.md
│   ├── API_CONSUMERS.md
│   └── OPERATIONS.md      # release gates, backup/restore, rollback
├── scripts/                # Deploy & checks
└── .github/workflows/      # CI/CD
```

### API

Human-authenticity foundation endpoints are now included (`/api/rules/*`, `/api/human/challenge/verify`, `/api/me/trust`, `/api/me/authenticity`, `/api/authenticity/appeals`, `/api/moderation/authenticity*`).

Core platform surface remains organized across the existing categories:

| Category | Routes | Scope |
|----------|--------|-------|
| Auth | 5 | Session, bridge, login/logout, verify |
| Users | 14 | Profile, social graph, privacy, moderation |
| Posts | 14 | CRUD, likes, reposts, replies, feeds |
| Messages | 4 | DMs + read state |
| Notifications | 4 | Feed, create, read, preferences |
| Upload | 1 | Media upload pipeline |
| Reports | 1 | Abuse reporting |
| Health | 1 | Runtime/service health |
| Search | 1 | Global |

Full docs: [`docs/API_CONSUMERS.md`](docs/API_CONSUMERS.md)

## Credits

Built on the foundation of [Fatih Arapoglu's Twitter Clone](https://github.com/fatiharapoglu/twitter) (MIT License). Real gratitude for the starting point.

Powered by Next.js, Prisma, Material UI, PostgreSQL, Clerk, and the open-source community that makes all of this possible.

## License

MIT - because the resistance doesn't do paywalls.

Based on [twitter](https://github.com/fatiharapoglu/twitter) by Fatih Arapoglu (MIT License).

## Contact

**Maintainer:** d.westermann@ol-mg.de
**Security issues:** Report directly via email, not public issues.

---

<div align="center">

**The AI helped build this. It won't be allowed to post here.**

*For the human internet.*

</div>
