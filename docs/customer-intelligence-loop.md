# Customer intelligence loop

## Purpose

Connect product telemetry, customer feedback, support patterns, activation and retention to one evidence-backed improvement loop. The goal is not to collect more data; it is to identify where customers fail to receive recurring value and choose the smallest useful intervention.

## Evidence sources

Keep source types distinct:
- **Product events:** observed aggregate counts, event definitions, unique-account counts, source and measurement date.
- **Customer feedback:** categorized, permissioned summaries; retain whether the signal came from a customer statement, interview, support case or analytics.
- **Support topics:** issue category, severity, occurrence count and affected-account count. Repeated tickets from one account must not be counted as multiple affected accounts.
- **Cancellations:** reason counts with source and period. Unknown reasons remain unknown.
- **Lifecycle cohorts:** eligible, activated, active, retained and cancelled account counts with explicit cohort and period definitions.

Do not mix user-level and account-level denominators. Define activation and active/retained windows per product before comparing periods. A customer opening the app is not necessarily receiving value.

## Minimum event taxonomy

Start with events tied to customer outcomes, not every click:
- `account_created`
- `onboarding_started`
- `first_value_reached` (the product-specific activation event)
- `core_value_completed` (the recurring value event)
- `integration_connected` (when relevant)
- `support_requested`
- `subscription_started`
- `subscription_cancelled`

Every event definition must specify trigger, actor scope (account or user), required properties, deduplication/idempotency rule, source, retention period and owner. Avoid event properties containing message bodies, names, emails, phone numbers, patient data, free-text inputs or other identifiers.

## Weekly operating loop

1. **Collect:** use existing product analytics and support systems first. Export only aggregate or sanitized data; do not create a second tracking stack by default.
2. **Check quality:** validate event definitions, time windows, unique-account denominators, missing data, duplicate events and cohort consistency.
3. **Listen:** group feedback and support into recurring themes. Preserve source type, date, count, affected accounts and a short sanitized summary.
4. **Diagnose:** inspect activation failures, time-to-first-value, recurring-value frequency, unresolved support, retention and cancellation reasons. Compare cohorts only when definitions match.
5. **Prioritize:** rank customer pain by severity, affected accounts, recurrence, revenue/customer risk and confidence. Keep the underlying evidence visible; do not hide it behind a pseudo-precise score.
6. **Decide:** choose one intervention, record alternatives, owner, expected outcome, primary metric, guardrails and review date.
7. **Verify:** after the observation window, compare the result to the baseline, report counts and denominators, note confounders, and keep/change/stop/investigate.
8. **Update:** refresh evidence claims and supersede old decisions rather than silently rewriting history.

For low-volume B2B, inspect each account and case individually. Do not infer statistical significance from tiny samples. Show absolute counts with percentages and label missing denominators as unknown.

## Privacy and consent

- Do not import raw conversations, transcripts, contact details, patient records, private messages or production logs into Foundry.
- Summaries must be de-identified and permissioned; remove details that could identify a person or reveal sensitive attributes.
- Use data minimization, purpose limitation, access controls and documented retention/deletion rules.
- Do not send customer data to external models or analytics vendors without explicit approval and a lawful basis.
- Health, financial, legal and other sensitive sectors require a qualified privacy/compliance review. This workflow is not legal advice or a compliance certification.
- Never use sensitive health or other special-category data for marketing segmentation.

## CLI report

Create a sanitized aggregate JSON file at `.foundry/customer-intelligence/summary.json` using `templates/customer-intelligence-summary.json` and `schemas/customer-intelligence.schema.json`. Then run:

```bash
foundry customer-intel report .
foundry customer-intel report . --input ./exports/sanitized-summary.json --format json
```

The report calculates descriptive rates only where a denominator exists, flags small samples (fewer than 10 eligible accounts), and orders supplied issues by declared severity and affected accounts. It does not infer causality, statistical significance, sentiment from raw text, churn probability or customer health from missing data. The CLI accepts aggregate summaries, not raw CRM/WhatsApp/support exports.
