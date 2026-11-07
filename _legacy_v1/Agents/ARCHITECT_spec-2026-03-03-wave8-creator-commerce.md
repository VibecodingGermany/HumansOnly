# ARCHITECT - Wave 8 Creator Commerce Foundation

Date: 2026-03-03

Source doc: `docs/ARCHITECTURE_SPEC_WAVE8_CREATOR_COMMERCE.md`

## Selected Option
Foundation-first rollout in current stack (Next.js + Prisma), with payout automation deferred to follow-up wave.

## Modules
- Prisma models: `CreatorProfile`, `CreatorPortfolioItem`, `CreatorTip`
- APIs: `/api/creator/profile`, `/api/creator/items`, `/api/creator/[username]`, `/api/creator/tips`
- UI: Settings Artist Studio, profile Creator Showcase, admin creator KPI extensions
- Upload extension: `creator_image`, `creator_audio`

## Security/RBAC
- Existing role model preserved.
- Super-admin protection preserved; default protected identity includes `human_ikzcsvsb`.
