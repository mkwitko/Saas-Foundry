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
