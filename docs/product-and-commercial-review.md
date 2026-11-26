# Product and Commercial Review

This playbook is the Foundry's decision framework for evaluating a new SaaS idea, improving an existing product, and deciding whether a real buyer would plausibly pay. It is intentionally skeptical. The objective is to reduce wasted build effort and improve the probability of a commercially useful product.

## Operating principles

1. **Buyer before feature.** Identify the user, economic buyer, authority and budget.
2. **Evidence before certainty.** Separate observed, measured, reported, external, hypothesis, estimate and unknown.
3. **Disconfirm before confirm.** Search for reasons the idea should not be built.
4. **Alternatives include doing nothing.** A competitor's feature list is not the buyer's full choice set.
5. **A simulated buyer is not a customer.** Role-play is useful for finding objections, never for proving demand.
6. **Price is a business hypothesis.** Validate it through commitments and purchases, not model intuition.
7. **Features need a business outcome.** Do not build parity features without evidence they affect buying, activation or retention.
8. **The founder makes the investment decision.** The Foundry provides a reasoned recommendation, evidence and uncertainty.

## 1. Idea brief

Before scoring, write:
- Product in one sentence.
- Primary user, economic buyer and decision-maker.
- Situation/job-to-be-done and trigger.
- Pain, frequency, severity, urgency and cost of inaction.
- Current alternatives: competitor, manual process, internal tool or no action.
- Proposed outcome and mechanism.
- Founder advantage and access to buyers.
- Geography, regulatory/privacy context and integration dependencies.
- Business model, price hypothesis and constraints.

Reject descriptions that are only technology or features. Reframe "AI assistant for clinics" as a concrete job, buyer, workflow and outcome.

## 2. Market and competitor research

Research direct, indirect and non-software alternatives. Capture:
- Buyer and use case.
- Promise and positioning.
- Core workflow and time-to-value.
- Public feature set and limitations.
- Pricing, packaging, usage limits and implementation fees.
- Proof, customer references and integrations.
- Onboarding and support model.
- Complaints, negative reviews, churn signals and unresolved jobs.
- Distribution advantage, switching costs and likely response to a new entrant.

Every claim needs a source and date. Prefer official pricing/product docs, first-party reviews, public customer statements and direct buyer evidence. Record gaps instead of filling them with assumptions.

### Reasons to reject or reshape an idea

- Problem is infrequent or inexpensive to ignore.
- User likes it but buyer has no authority/budget.
- Existing workflow is good enough and switching is difficult.
- Buyer acquisition is too expensive for the contract value.
- Differentiation is cosmetic or can be bundled by an incumbent.
- The product depends on unavailable data, APIs, platform permissions or trust.
- Variable AI/API/support/onboarding costs destroy gross margin.
- Security, privacy, compliance or liability burden is disproportionate.
- The product is a feature, not a repeatable business.

## 3. Opportunity scorecard

Score 0–5 with evidence, confidence and missing proof.

| Dimension | 0 | 3 | 5 |
|---|---|---|---|
| Pain severity | No clear pain | Recognized inconvenience | Material recurring cost/risk |
| Urgency | No trigger | Periodic priority | Active trigger / must solve now |
| Buyer/budget | No buyer identified | Buyer plausible, budget unknown | Authority, budget and purchase path evidenced |
| Reachability | No viable access | Some reachable channels | Repeatable low-cost access to ICP |
| Willingness to pay | No signal | Verbal interest | Paid pilot, purchase, deposit or strong commitment |
| Alternatives gap | No unmet need | Specific gaps | High-value unmet job competitors underserve |
| Differentiation | Easily copied | Some workflow advantage | Defensible outcome, distribution, data or trust |
| Retention | One-off novelty | Repeat use plausible | Recurring workflow and demonstrated retention |
| Unit economics | Costs exceed price | Plausible but assumptions | Positive margin evidenced at realistic usage |
| Feasibility/risk | Critical blocker | Workable with risk | Deliverable with accessible tech and manageable support |

Decision bands (heuristic, not probabilities):
- 40–50: candidate for paid validation, not automatic approval to build.
- 30–39: narrow segment/offer and test weakest assumptions.
- 20–29: substantial discovery or repositioning required.
- 0–19: park/kill unless new evidence materially changes the case.

A critically weak buyer, urgent pain, willingness-to-pay or feasibility dimension blocks a full build regardless of total score. Keep confidence separate from score.

## 4. Skeptical buyer simulation: "would I buy?"

Create 3–5 segment-grounded buyer perspectives, not generic personas. For each:
- Role, organization context and purchase authority.
- Current workflow and alternative.
- Trigger, job and cost of inaction.
- What the offer promises and what proof is missing.
- Objections: price, trust, security, migration, integrations, timing, support, switching and ROI.
- Verdict: **buy now / consider after proof / use existing alternative / do not buy**.
- What exact evidence or product change could change the verdict.

Then answer plainly: "If I were this buyer, I would / would not buy because..." Name the strongest reason against buying and the next question to ask a real buyer.

Label all outputs:
- **Simulation:** reasoned model prediction.
- **Observed:** real interview, trial, proposal, payment, renewal or cancellation.
- **Unknown:** not established.

Never invent buyer quotes or describe role-play as customer validation. Real buyer actions outrank simulated preference.

## 5. Pricing and packaging

Evaluate value metric, outcome, budget, alternatives, competitor pricing, buyer willingness to pay, implementation effort and total variable cost. Include AI tokens, messaging, API, storage, payment fees, onboarding and support.

Produce up to three packaging hypotheses only when segments justify them:
- Entry: narrow use case, limits and ideal buyer.
- Core: primary recurring outcome and likely default.
- Premium/usage-based: higher volume, additional workflow, team or service needs.

For each, show price hypothesis, included outcome, boundaries/limits, upgrade trigger, variable cost, gross margin assumptions, heavy-user risk and objections. Model low/base/high scenarios and expose the assumptions that dominate.

Recommend a stage-appropriate test: price interview, clearly disclosed fake door, paid pilot, proposal, refundable deposit, pre-sale or plan experiment. A stated preference is weaker evidence than a real commitment. Never label a price validated without observed purchase behaviour.

## 6. Feature portfolio and roadmap

For every candidate feature record user problem, segment, frequency, severity, evidence/confidence, expected impact, effort, ongoing maintenance/support, dependencies and risk.

Classify:
- Blocker: prevents trust, purchase, activation or core task.
- Table stakes: required to be considered.
- Differentiator: improves outcome in a way buyers value.
- Retention driver: makes recurring value stronger.
- Expansion: supports a higher-value segment or usage.
- Nice-to-have: low near-term impact.
- Distraction: weak evidence or no strategic fit.

Prioritize expected outcome × evidence confidence × strategic fit against delivery/maintenance cost and risk. Include a "not building now" list. Competitor parity is not a sufficient reason.

## 7. Buyer-centred UX and conversion

Review the entire path: first impression → understanding → trust → evaluation → commitment → onboarding → first value → repeat value.

### Marketing site and offer
- In five seconds, can the ICP identify what it does, who it is for and the result?
- Is the problem specific and recognizable?
- Is the offer concrete, including scope, limits, setup effort and next step?
- Are proof and claims real, current and attributable?
- Are trust objections answered near the decision?
- Is pricing understandable and differentiated by value?
- Is the primary CTA obvious and measurable?
- Does the demo/trial/checkout work on mobile and recover from errors?

### In-product experience
- Can a new user complete the core job without founder intervention?
- What setup, permission, import or integration blocks first value?
- Are defaults useful and advanced settings progressive?
- Are empty, loading, error, success and permission states actionable?
- Are AI/system actions, limits and data sources transparent?
- Are billing, destructive actions and privacy understandable?
- Can users perceive value before an upgrade prompt?

For each issue record journey step, user intent, friction, severity, evidence, affected segment, business impact, recommendation and verification. Separate usability observation from heuristic opinion and simulated buyer feedback.

## 8. Sales system and acquisition

Build the sales process for the product's actual ACV and buyer:
- Qualified ICP and disqualifiers.
- Trigger and reason to act now.
- Offer, proof and buying path.
- Lead source, fit rationale and public business contact route.
- Discovery questions, demo, ROI model, objections and proposal.
- Follow-up cadence and next action.
- Pipeline stages and conversion measures.
- Founder-led sales, referrals and partnerships for early B2B where suitable.
- Self-serve activation and lifecycle for low-ticket products.
- Paid acquisition only after offer, tracking and conversion path are ready.

Track source → qualified lead → conversation → demo/trial → proposal/checkout → paid → activated → retained → referred. Measure paid conversion, time-to-close, CAC, gross margin, payback and retained revenue where data exists. Meetings, clicks and compliments are not revenue.

No outreach, posting, ad spend or directory submission without explicit approval.

## 9. Investment decision and validation experiment

Choose one:
- Proceed to validation.
- Proceed to prototype to test a specific assumption.
- Proceed to MVP with a tightly bounded scope.
- Pivot buyer/problem/offer/channel/model.
- Park or kill.

Specify the next experiment, real target buyers, sample/source, time and cash ceiling, success/failure thresholds, evidence to collect, decision date and owner. Do not default to building software if a manual pilot, paid service or landing-page test is cheaper and more informative.

## 10. React + Node default engineering profile

For a new web SaaS, prefer React + TypeScript and Node.js + TypeScript; Fastify is the default API framework when there is no existing constraint. Do not migrate an existing working product without a measurable reason.

### React
- Keep the existing Next.js/Vite framework; do not introduce a second framework.
- Semantic HTML, accessible primitives, keyboard support and responsive behaviour.
- Explicit loading, empty, error, success, disabled and permission states.
- Minimal client state; no Redux by default.
- Zod/shared schemas at input boundaries where practical.
- Reusable components for actual repeated product patterns, not premature abstraction.
- Playwright/Cypress coverage for critical purchase, onboarding and core-product journeys.
- Measure Web Vitals, route bundle size, hydration and interaction latency.

### Node/Fastify
- Vertical slice: route/schema → authz → use case/service → repository → tests.
- Validate untrusted input at the boundary; keep API contracts/OpenAPI consistent.
- PostgreSQL by default for relational/transactional needs.
- Review SQL, indexes, N+1, pooling, transactions and race conditions.
- Enforce tenant/object access on the server and test IDOR/cross-tenant denial.
- Idempotent retryable writes, webhook signature checks and rate limits.
- Modular monolith first; Redis, queues and services only when justified.

### Quality gates
Typecheck, lint, unit/integration/E2E, security and accessibility checks; measured performance; backup/restore and rollback plan; no unresolved critical/high defects in security, data integrity, tenant isolation or purchase-critical flows.

## 11. Required output format

Every full review must end with:
1. Verdict and confidence.
2. Strongest evidence in favour.
3. Strongest reasons not to build/buy.
4. Primary ICP and economic buyer.
5. Competitor and alternative comparison.
6. Buyer simulation verdicts (clearly labelled simulation).
7. Price/packaging hypotheses and unit economics.
8. Feature priorities and explicit non-goals.
9. UI/UX and conversion blockers.
10. Sales/acquisition plan.
11. Next real-world experiment and kill criteria.
12. What is unknown and what requires founder decision.
