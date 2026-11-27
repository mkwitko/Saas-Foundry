# Evidence standard

SaaS Foundry must make the difference between what is known and what is merely plausible visible.

## Evidence classes

| Class | Meaning | Example |
|---|---|---|
| E1 — Direct behaviour | Observed in production or a reproducible environment | A signup event recorded in analytics |
| E2 — Direct buyer evidence | Real buyer action or statement with context | Paid pilot, signed LOI, completed interview |
| E3 — Primary source | Official product, policy, filing, documentation or repository evidence | Official pricing page, source code |
| E4 — Secondary source | Credible research or third-party reporting | Industry report, review corpus |
| E5 — Internal estimate | Explicit model or calculation with assumptions | Bottom-up TAM, unit economics forecast |
| E6 — Synthetic / model output | Simulated buyer, AI-generated hypothesis, synthetic benchmark | Persona panel or generated scoring |
| E0 — Unknown | Not checked or not supported | Assumed conversion rate |

E1-E4 are not interchangeable. A repository implementation (E3) is not proof that real customers use it (E1/E2). Synthetic output (E6) can generate hypotheses but cannot validate demand.

## Claim record

For any material claim, capture:

- claim;
- class;
- source URL or repository path;
- observed / published / verified date;
- relevant quote or minimal excerpt, when allowed;
- geography and segment;
- sample size and selection method where applicable;
- confidence and known bias;
- what would falsify the claim;
- next action.

## Decision record

Strategic decisions should include:
- decision and owner;
- date;
- evidence reviewed;
- alternatives considered;
- expected result;
- review date or trigger;
- status: proposed, accepted, rejected, superseded.

Do not silently rewrite an accepted decision. Create a new decision and link the superseded one.

## Customer research

- Record the interviewee's buyer role and segment only as permitted.
- Separate verbatim statements from summaries and researcher interpretation.
- Do not turn a single anecdote into a universal market claim.
- Avoid leading questions and hypotheticals such as "would you buy this?"
- Ask about the last occurrence, current workaround, frequency, cost, budget, authority, and what they have already tried.
- Ask for a concrete next commitment: data access, pilot, introduction, procurement step, or payment.

## Metrics

Every metric needs:
- name and plain-language definition;
- numerator / denominator;
- event or table source;
- time window and timezone;
- segment/cohort;
- exclusions;
- owner;
- data quality status.

Small samples must show counts next to rates. Do not report a percentage without its denominator.

## External research freshness

Store source URL and checked date. Give volatile facts (prices, policies, platform requirements, competitor offers, availability) a short review interval. Never present a cached dataset as live market data.


## Persistent evidence ledger and freshness

Each bootstrapped project receives `.foundry/evidence.yaml` and `.foundry/evidence-ledger.schema.json`. Keep material claims, decisions and experiments there instead of scattering contradictory facts across reports.

A claim record must retain its evidence class, source type, exact source/path, checked date, segment, sample size where relevant, confidence, limitations, falsifier and review interval. Use stable IDs so decisions and experiments can refer back to claims.

### Freshness rules

Freshness is computed from `checked_at + review_after_days`; a manually written `current` label never overrides an expired review date.

Suggested starting intervals (shorten them in volatile markets):
- E1 production behaviour / telemetry: 7–30 days, depending on the decision.
- E2 buyer interviews and purchase behaviour: 30–90 days; recheck immediately after a material segment or offer change.
- E3 official pricing, platform policies, API documentation and repository state: 30–90 days; recheck before implementation or purchase decisions.
- E4 secondary research and competitor commentary: 90–180 days.
- E5 internal cost, demand and market estimates: 30 days or whenever an input changes.
- E6 simulations and generated hypotheses: never count as validation; rerun only when inputs or the offer change.
- E0 unknown: no freshness interval makes it evidence. It remains unknown until sourced.

Mark evidence stale when its review date passes, the source disappears, the product/offer/segment changes, or an invalidation trigger occurs. Do not delete stale claims: preserve them for audit and supersede them with a new claim linked to the new source.

### Decision and experiment linkage

- Every accepted strategic decision should cite the evidence IDs it relied on, the alternatives rejected, the expected outcome and a review date or trigger.
- Do not silently rewrite accepted decisions. Mark them superseded and create a new decision record when evidence changes.
- Experiments must define a hypothesis, segment, intervention, primary metric, guardrails, owner and decision date before launch.
- On completion, record the observed result and the decision: keep, change, stop or investigate.
- A run should refresh only claims relevant to its selected task. Do not re-research everything on every execution.
- When evidence is stale but cannot be refreshed, lower confidence and state the decision risk instead of inventing an updated fact.

The ledger is an index and audit trail, not a reason to store raw customer messages, personal information, credentials or patient data. Store only sanitized summaries and source references with appropriate permission.
