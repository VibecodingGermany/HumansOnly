# Research Brief - Creator Commerce (Artists: Music + Visuals)

Date: 2026-03-03  
Owner: Codex (Researcher)

## Scope

1. Artist attraction and retention loops for a social platform.
2. Monetization primitives (tips, digital works, creator payout path).
3. Admin/compliance requirements for creator commerce operations.

## Key Facts

1. Platform-mediated creator monetization is best shipped incrementally: portfolio/discovery first, then payments/payout automation, then storefront licensing.
2. Stripe Connect remains the practical baseline for marketplace payouts and onboarding in EU/US contexts.
3. Trust and moderation are part of creator monetization quality: rights disputes and abuse controls must exist before scaling payments.
4. EU-facing operations need clear policy for VAT reporting and platform reporting obligations when monetization volume grows.

## Risks

1. Commerce without payout reconciliation creates accounting ambiguity.
2. Selling digital content without rights workflow increases legal dispute risk.
3. Payment-only optimization can reduce social quality if discovery and community loops are weak.

## Open Questions

1. Launch payout mode: manual reconciliation first or immediate Stripe Connect transfers?
2. Licensing model at launch: personal-only vs commercial/exclusive choices?
3. Which creator KPI thresholds define “healthy creator economy” in admin dashboards?

## Assumptions

1. Current release focuses on production-safe foundation (profiles, artist items, support intents, admin visibility).
2. Direct card checkout + automatic payouts can be activated in next wave after compliance checklist closure.
3. Existing role and moderation architecture remains authoritative for all creator operations.

## Sources (Primary)

1. Stripe Connect overview and platform fees: https://docs.stripe.com/connect
2. Stripe hosted onboarding for connected accounts: https://docs.stripe.com/connect/hosted-onboarding
3. EU VAT policy portal (business + platform obligations): https://taxation-customs.ec.europa.eu/taxation/vat_en
4. EU DAC7 platform reporting page: https://taxation-customs.ec.europa.eu/taxation-1/administrative-cooperation-and-mutual-assistance/direct-taxation/dac7_en
5. EU DSA policy overview: https://digital-strategy.ec.europa.eu/en/policies/digital-services-act-package
