# SaaS metrics and event design playbook

The purpose of measurement is to make a decision. Do not instrument a metric merely because another SaaS company reports it.

## 1. Pick one outcome metric

A useful north-star metric should represent repeated customer value and be difficult to inflate with superficial activity.

Examples:
- Scheduling SaaS: completed appointments originating from the product, not raw calendar events.
- B2B workflow SaaS: customer workflows completed successfully, not logins.
- Developer SaaS: successful builds or deployments, not dashboard visits.

The exact definition must reflect what the customer hires the product to do.

## 2. Map the business journey

### Acquisition
- qualified traffic by source;
- engaged demo starts;
- qualified leads;
- cost per qualified lead when spend exists.

### Conversion
- demo-to-trial;
- invitation-to-activation;
- trial-to-paid;
- sales cycle length;
- lost reasons.

### Activation
- activation rate by cohort and segment;
- time to first value;
- percentage reaching the meaningful outcome;
- founder-assisted versus self-serve activation.

### Retention
- logo retention;
- gross revenue retention;
- net revenue retention when expansion exists;
- cohort activity and repeat value;
- cancellation reasons and time-to-churn.

### Economics
- MRR and cash collected shown separately;
- average revenue per account;
- gross margin / contribution margin;
- variable cost per active account;
- CAC by channel when acquisition cost can be measured;
- CAC payback only with observed acquisition and margin data.

### Expansion and advocacy
- upgrade / seat / usage expansion;
- referrals generated and converted;
- verified reviews and customer proof;
- partner-sourced pipeline.

## 3. Define metrics before events

A metric definition must include:
- business question;
- name and plain-language meaning;
- numerator and denominator;
- eligible population;
- time window and timezone;
- cohort and segment;
- source table or events;
- exclusions and deduplication;
- owner and review cadence;
- privacy class and retention.

Avoid ambiguous labels such as "active user" without stating what action qualifies.

## 4. Event design principles

- Use past-tense business events: `trial_started`, `appointment_booked`, `subscription_cancelled`.
- Events describe facts, not model interpretations.
- Track one occurrence once, with an idempotency key where needed.
- Use controlled enums and bounded properties.
- Store timestamps in UTC; render in the business's timezone.
- Version the event schema and document changes.
- Prefer server-side events for payments, subscription changes, appointments and activation state.
- Do not emit personal or sensitive content to analytics.
- Do not send every button click to an external analytics provider by default.

## 5. Privacy-first instrumentation

For each property, ask whether it is necessary to answer a business question.

Prefer:
- pseudonymous account ID;
- plan ID;
- broad segment enum;
- source / campaign category;
- event timestamp;
- bounded duration bucket;
- coarse outcome status.

Avoid:
- names, emails, phone numbers;
- full URLs containing personal identifiers;
- free-text fields;
- message bodies, transcripts, audio or attachments;
- health, financial or other sensitive attributes.

Separate analytics access from production support access. Define retention and deletion behaviour. Confirm legal basis, consent and vendor processing terms before adding a third-party SDK.

## 6. Early-stage interpretation

- Always display count and denominator beside percentages.
- With very small samples, review cases individually.
- Do not call a 1- or 2-customer difference a trend.
- Do not optimise a metric that can be gamed at the expense of trust or customer outcome.
- Record data quality gaps before drawing conclusions.
- A metric without a decision owner is usually dashboard decoration.

## 7. Experiment rules

Before an experiment begins, write:
- hypothesis;
- target cohort;
- intervention;
- primary metric;
- guardrails;
- evidence threshold;
- stop condition;
- owner;
- decision date.

For low-volume B2B SaaS, qualitative evidence and sequential tests often matter more than pretending tiny samples provide statistical certainty.

## 8. Review cadence

Weekly: pipeline, activation blockers, customer issues, usage and costs.

Monthly: retention cohorts, channel quality, pricing, gross margin and capacity.

Quarterly or at a major strategic change: ICP, positioning, market expansion and product thesis.
