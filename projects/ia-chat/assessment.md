# ia-chat — initial Foundry assessment

**Scan date:** 26 November 2026  
**Repository:** `mkwitko/ia-chat`, default branch `main`  
**Mode:** Existing project adoption  
**Method:** Static inspection of repository metadata, root files, selected product/business docs, source tree, selected API routes and website components.

## Executive assessment

The product does not need another round of generic ideation or a replacement business plan. It already contains a clear product thesis, multiple founder/business artifacts, a staged implementation roadmap, pricing hypotheses, customer objections, channel ideas, and a set of product-led growth features.

The constraint is now **evidence and distribution execution**:

1. Convert founder-led referrals and demos into a tracked sales pipeline.
2. Measure the path from website / referral to invitation, WhatsApp connection, activation, and payment.
3. Observe whether the first customer reaches value quickly and repeatedly.
4. Reconcile real acquisition, AI, WhatsApp, onboarding and support costs.
5. Build repeatable channels only after the pilot produces credible proof.

A large part of the strategy is based on simulated buyer panels, internal estimates and untested assumptions. These are useful for choosing experiments, but they are not evidence that real buyers will pay.

## What is already in place

| Capability | Assessment | Evidence inspected |
|---|---|---|
| Product thesis and personas | Present | `PRODUCT.md`, `CLAUDE.md` |
| Technical architecture and delivery plan | Present | `docs/plan/IMPLEMENTACAO.md`, `docs/plan/TASKS.md` |
| Positioning, offer and objection handling | Present | `founder/marketing.md`, `founder/offer.md` |
| Pricing and unit economics | Present as hypotheses / estimates | `founder/pricing.md`, `founder/cfo.md`, `founder/numbers.json` |
| Competitor research | Present; should be refreshed only when a decision needs it | `founder/competitors.md`, `founder/competitors.csv` |
| Launch and founder-led channel plan | Present | `founder/launch.md`, `founder/marketing.md` |
| Founder operations | Present | `founder/ops.md` |
| Customer onboarding | Product flows and requirements exist | `docs/spec/09-site-aquisicao-suporte.md`, `apps/api/src/onboarding/` |
| Product waitlist | Implemented at API level | `apps/api/src/waitlist/waitlist-routes.ts` |
| Referral capture | Implemented at API level for referral code, link and waitlist signup count | `apps/api/src/growth/referral-routes.ts`, `apps/api/src/waitlist/waitlist-routes.ts` |
| Lead follow-up configuration | Implemented at API level | `apps/api/src/growth/lead-follow-up-routes.ts` |
| Review request configuration | Implemented at API level | `apps/api/src/growth/review-request-routes.ts` |
| Help center and support | Present | `apps/site/src/content/help/`, `docs/spec/09-site-aquisicao-suporte.md` |
| Operational observability | Present | `docs/observabilidade.md` |
| Pilot metrics definitions | Present in specification | `docs/spec/11-pequenos-negocios.md` |

"Implemented at API level" does not prove the full user journey is complete, the feature is enabled in production, or that it has generated outcomes. UI, scheduled execution, delivery gates and production behaviour need separate checks.

## Important evidence limitations

- `founder/pricing.md` says the simulated buyer panel had 0 purchases out of 18 valid responses; trust was the main objection. This is a simulated panel, not real market validation.
- `founder/launch.md` defines a target of 6 WhatsApp-connected trials and 3 paid customers from 10 invited prospects. This is a pre-written success threshold, not an achieved result.
- The current strategy describes founder-led referrals, live demonstration and Instagram as initial channels, with paid ads deferred. No repeatable channel performance is established in the inspected documents.
- The founder's planned price test of R$ 247 versus R$ 297 should be treated as directional with a very small sample. Counts and buyer conversations matter more than statistical claims.
- The code and docs were inspected statically. No application was run and no CI or test suite was executed during this assessment.
- This assessment deliberately excludes production data, patient conversations, credentials and database contents.

## Gaps found or requiring verification

### 1. Product analytics and acquisition attribution — highest priority

The specification defines useful metrics for first response, unanswered conversations, appointments, lead conversion, lead source, referrals, cost per conversation and recovered revenue.

Operational observability is also documented: logs, Sentry, Axiom, Langfuse, operator events and health endpoints.

These solve different problems. In the files reviewed, I did not find a complete product/acquisition event taxonomy that connects:

`site_visit → demo → waitlist → invite → WhatsApp_connected → activation → trial → paid → retained`

The operator funnel function inspected reads onboarding progress; that alone is not a marketing-to-revenue funnel. Existing database queries and dashboards may cover part of the journey, so the next step is an instrumentation inventory before adding a new analytics vendor.

**Recommendation:** define a first-party, privacy-safe event contract and map each metric to an existing table or new event. Never include message text, patient symptoms, names, phone numbers or other clinical content in events.

### 2. Founder-led sales execution

The channel plan is deliberately narrow and sensible for the current stage: referrals, a live demo and founder-led Instagram. The gap is operational repeatability and measurement, not a lack of channel ideas.

The current process needs one record per prospect with source, segment, stage, last action, objection, demo status, offer shown, price variant, next step and outcome. Reuse the existing Customers/lead workflow where it fits instead of introducing a second CRM.

**Recommendation:** make a lightweight sales workflow and weekly review; no mass scraping, automated cold messaging or paid lead lists.

### 3. Activation and first value

The product has onboarding and a simulator, but the first-value event is not yet consistently defined in the growth documentation as an observable metric.

Candidate first value: the business has connected WhatsApp, approved its setup, and the assistant completes a useful customer interaction. A first appointment booked by the assistant without the owner typing is a stronger value event, but may take longer and may not occur for every business.

**Recommendation:** measure both a leading activation event and the stronger outcome event. Validate the definition with the pilot rather than hardcoding a target based on assumptions.

### 4. Retention and customer success

The product already has operational hooks for lead follow-up, referrals and review requests. The missing layer is a simple view of whether businesses continue receiving value: active usage, connected channel, unanswered items, assistant handoffs, appointments, adoption of key workflows, support friction, cancellation reason and cohort retention.

**Recommendation:** begin with a small rule-based customer health review and founder check-ins. Do not add predictive churn AI or complex lifecycle automation before there are enough real accounts.

### 5. Technical SEO and content measurement

The public site has page-specific titles, descriptions, canonical URLs, Open Graph metadata and a root `robots.txt`. The help center and pricing/calculator pages provide useful content surfaces.

The reviewed tree and configuration did not show an Astro sitemap integration or a committed `sitemap.xml` / `llms.txt`. The shared layout inspected did not show structured-data JSON-LD. I also did not find a verified Search Console reporting workflow in the reviewed files.

**Recommendation:** verify the deployed site first, then close technical SEO gaps (sitemap, structured data where appropriate, Search Console, indexation). Publish a small number of genuinely useful pages from buyer questions; do not generate location or specialty pages at scale without distinct, reviewed information.

### 6. Proof and trust assets

The business correctly prohibits invented testimonials and metrics. The key asset is a documented pilot case with explicit consent, baseline, observed outcomes, and limitations.

**Recommendation:** prepare a case-study capture template now, but publish only after the pilot owner approves the claims and source material.

## Module selection

| Foundry module | Decision | Why |
|---|---|---|
| Business validation | Recommended now | Simulated research is not real purchase evidence |
| Analytics instrumentation | Recommended now | Critical metrics exist in docs but need reliable sources and journey linkage |
| Sales pipeline | Recommended now | Current channels are founder-led and need a measurable process |
| Launch and distribution | Recommended now | Execute the existing narrow channel plan; do not add more channels yet |
| Activation and onboarding | Recommended now | First-value definition and conversion path need measurement |
| Retention and customer success | Recommended now | Establish learning and support cadence during the pilot |
| SEO and content | After basic measurement | Site foundations exist; prioritise indexation and high-intent content |
| Referrals and partnerships | After initial proof | Referral primitives exist; reward and repeatability still need validation |
| Competitor intelligence | On demand | Research exists; refresh only to answer a pricing or positioning decision |
| Opportunity intelligence | Not applicable for current product | Do not reopen ideation for an existing product |
| Product design | Already satisfied at strategy level | Product has detailed `DESIGN.md` and surface contracts |
| Engineering quality | Already has substantial foundations | Strong CI, tests and security practices are documented; use normal project workflow for gaps |
| Pricing and unit economics | Already satisfied as hypothesis | Reopen after real trials, payment and cost data |

## Next decision

Run the first Foundry cycle as a **measurement + sales execution sprint**, not a code-feature sprint:

1. Inventory existing event sources and dashboard queries.
2. Agree on the event taxonomy and activation definition.
3. Record the next 10 real prospects through the existing founder-led channels.
4. Capture the demo → WhatsApp connected → first value → paid path.
5. Review the evidence before changing pricing, ICP, offer or channels.
