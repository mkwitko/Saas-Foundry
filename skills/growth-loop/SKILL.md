---
name: foundry-growth-loop
description: Diagnose SaaS acquisition, activation, revenue, retention and referral using metric definitions and observed evidence. Use for weekly growth reviews or when a product has traffic but weak conversion or retention.
---

# Foundry: SaaS growth loop

## Objective

Find the highest-leverage constraint in the customer journey and design one measurable improvement. Do not propose more channels or features by default.

## Inputs

- ICP and offer.
- Customer journey and funnel definitions.
- Metric dictionary and event sources.
- Cohort and channel data, if available.
- Qualitative buyer/customer feedback.
- Cost and founder-capacity constraints.
- Privacy and consent requirements.

## Workflow

### 1. Validate the data

For each metric, confirm:
- exact definition and denominator;
- date range, timezone and cohort;
- source table or event;
- duplicate / missing-event behaviour;
- segment and acquisition channel;
- whether the sample is large enough for a rate.

Mark unavailable or unreliable measures. Never silently fill gaps with estimates.

### 2. Build the journey

Use the relevant steps, not every possible step:

`Reach → Qualified conversation → Demo → Trial → Activation → Paid → Retained → Referred`

For each transition, report:
- count entering;
- count progressing;
- count lost;
- conversion rate with denominator;
- median time to progress;
- dominant observed reason for loss.

### 3. Combine quantitative and qualitative evidence

Use both:
- funnel drop-offs and cohorts;
- actual interviews, objections, support topics and cancellation reasons.

Do not equate correlation with cause. A low conversion rate is a symptom; find out why customers stopped.

### 4. Choose one bottleneck

Rank candidate constraints by:
- impact on revenue or retention;
- evidence strength;
- speed of learning;
- effort;
- risk;
- founder capacity.

Choose one main constraint and, at most, one supporting task.

### 5. Design an experiment

State:
- falsifiable hypothesis;
- target segment;
- intervention;
- primary metric;
- guardrail metrics;
- minimum useful evidence;
- duration or stopping event;
- owner;
- follow-up decision for positive, negative and inconclusive outcomes.

For small samples, use a case review and sequential learning. Do not claim statistical significance from tiny samples.

### 6. Protect customer trust

For health or other sensitive products:
- use aggregate or pseudonymous data;
- do not include raw messages, health details, names, phone numbers or email in events;
- respect opt-in, opt-out and channel policies;
- do not use clinical claims or fabricated testimonials.

### 7. Close the loop

At the review date:
- record what happened;
- update the evidence ledger;
- accept, reject or revise the hypothesis;
- keep, revert or expand the intervention;
- select the next bottleneck.

## Output

A one-page growth review:
- current funnel;
- strongest signal;
- weakest transition;
- customer evidence;
- primary bottleneck;
- one experiment;
- guardrails;
- decision date.
