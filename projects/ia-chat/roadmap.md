# ia-chat — Foundry adoption roadmap

The objective is to reduce the biggest commercial uncertainty without distracting the project from its current pilot and engineering gates.

## Operating rule

**No new growth feature until the team can explain where prospects come from, where they stop, who pays, and whether customers keep receiving value.**

Reuse the current product schema, operator panel, customer workflow, referral primitives, business docs and observability. Do not install a second CRM or analytics SDK by default.

## Sprint 0 — Establish the baseline

### Work

1. Read the latest code and migration state for:
   - waitlist and invitation;
   - onboarding progress;
   - WhatsApp connection;
   - simulator and activation;
   - trial start / expiry;
   - billing and subscription;
   - contacts / lead stage / source;
   - referral attribution;
   - cancellation and support.
2. Map the metric definitions in `docs/spec/11-pequenos-negocios.md` to actual database fields, routes and queries.
3. Separate operational telemetry from product analytics.
4. Define a privacy-safe event contract. Prefer existing first-party data where reliable; introduce an event table only for milestones not captured elsewhere.
5. Confirm whether the public site is indexed and whether sitemap / JSON-LD / Search Console are live.

### Initial event candidates

| Event | Trigger | Allowed properties (examples) |
|---|---|---|
| `marketing_page_view` | Public page viewed, if consent/policy permits | route, referrer class, campaign tags |
| `demo_started` | Prospect starts the public demonstration | demo version, source |
| `waitlist_submitted` | Valid waitlist signup | specialty category, referral code present |
| `invite_created` | Operator creates an invitation | cohort, source |
| `invite_accepted` | Invitation is redeemed | cohort |
| `onboarding_started` | New business enters setup | template id |
| `onboarding_step_completed` | Business completes a setup step | step id, duration bucket |
| `whatsapp_connected` | Channel becomes connected | channel type, connection method |
| `simulation_completed` | Owner finishes the setup simulator | pass / needs-adjustment counts |
| `assistant_activated` | Owner explicitly activates the assistant | autonomy mode |
| `first_assistant_reply_approved` | First useful reply is approved/sent | elapsed-time bucket |
| `first_assistant_booking` | First appointment created by assistant | elapsed-time bucket; no customer attributes |
| `trial_started` | Trial starts at the defined trigger | plan |
| `subscription_started` | First successful paid subscription | plan, price variant |
| `subscription_cancelled` | Subscription is cancelled | reason enum, tenure bucket |

Event names are candidates, not a request to emit all events blindly. Finalise names, retention, legal basis, consent and access policy before implementation.

### Privacy contract

Never emit:
- message text, audio, image, transcript or attachment;
- symptoms, diagnosis, medication, clinical notes or free-text patient questions;
- patient name, phone, email or appointment notes;
- raw request bodies, auth tokens, cookies or provider payloads.

Use a pseudonymous tenant/business identifier, aggregate where possible, constrain properties, and document retention. Marketing site analytics must respect applicable consent and privacy requirements.

### Acceptance

- Every agreed metric maps to an existing source or a new, tested event.
- Funnel definitions include denominator, time window, stage and exclusions.
- No sensitive message or clinical data enters product analytics.
- The report identifies which funnel steps cannot yet be measured.

## Sprint 1 — Validate real buyers and run the founder sales process

### Work

Use the existing founder channel plan; do not add paid acquisition.

For each of the next 10 real prospects, record:
- source and referring person (where permission allows);
- segment and business type;
- last time the problem happened;
- current workaround and cost;
- buyer role and decision authority;
- demo date and whether the prospect completed it;
- strongest objection in the buyer's own words;
- offer and price shown (R$ 247 or R$ 297, if that test is still approved);
- next commitment and date;
- outcome: declined, not now, trial connected, paid, or lost reason.

Ask about real past behaviour, not hypothetical purchase intent. No automated messages to referred businesses without their permission.

### Acceptance

- Ten real prospect records are complete or marked with the exact missing information.
- All demonstrations have a recorded outcome and next step.
- Every objection is mapped to an existing proof point or a missing product/business capability.
- Simulated panel results remain labelled as synthetic and are not mixed with real conversion metrics.

## Sprint 2 — Measure activation and first value

### Work

1. Define one leading activation event and one outcome event with the pilot owner.
2. Measure time from invitation to WhatsApp connected, setup approved, assistant activated, first useful response, and first assistant-created booking.
3. Record where the customer needed founder intervention.
4. Review failed and abandoned onboarding steps weekly.
5. Compare onboarding completion and time-to-value by acquisition source only when sample size permits.

Potential first-value choices:
- **Leading:** WhatsApp connected + profile/services/hours approved + assistant activated in approval mode.
- **Outcome:** first useful assistant-handled interaction, ideally first booking made without the owner typing.

The outcome event is stronger but may not occur in every early cohort. Do not optimise only for booking count if the customer has low enquiry volume.

### Acceptance

- First value has an owner-approved definition.
- Every pilot business can be placed in the funnel.
- Time-to-value is measured, not estimated after the fact.
- Founder-assisted work is recorded separately from self-serve completion.

## Sprint 3 — Retention and customer-success loop

### Work

Start with a weekly manual review. A small, deterministic health view is sufficient:

- WhatsApp connected / disconnected;
- assistant active / paused;
- incoming conversations and unanswered conversations;
- approval backlog and human handoff count;
- appointments created and completed (when those statuses are supported);
- last meaningful product use;
- support issues, time to resolution, and root cause;
- billing state and cancellation intent.

Keep patient content out of this review. Use counts and reason enums.

Set founder check-ins at activation, a few days after activation, end of trial, and after the first paid month. Treat the timing as a proposed cadence and tune it with the pilot.

### Acceptance

- Every active pilot account has a weekly status.
- Every cancellation or serious support issue has a structured reason and owner.
- The review produces at most three product or operational actions per week.
- No predictive churn score is introduced before sufficient history exists.

## Sprint 4 — SEO and distribution after measurement

### Work

1. Verify the deployed sitemap, canonical URLs, robots directives and indexation.
2. Add or repair sitemap generation and appropriate structured data if absent.
3. Connect Google Search Console with owner-authorized access.
4. Use actual search queries and buyer questions to select a few high-intent topics.
5. Expand the help center where support questions repeat.
6. Test partnerships only after the pilot can supply a credible, permissioned proof asset.
7. Keep paid ads deferred until an acquisition channel and activation path have observed conversion and unit economics.

### Acceptance

- Search Console reports indexed priority pages and meaningful queries.
- Each new content page has a distinct buyer question and original useful information.
- No bulk-generated location pages or unsupported comparison claims.
- Referral and partner activity has an owner, consent path and measurable next step.

## Weekly founder review

Keep the review to these questions:

1. How many qualified prospects entered each stage?
2. Where did they stop, and what did they say?
3. How many connected WhatsApp and reached first value?
4. How many started paying, and at what price?
5. What is the actual variable cost and founder time per active account?
6. Which customers are at risk of receiving no value?
7. What are the top three actions for the next week?

Always show counts with percentages. With fewer than 10 accounts, prefer case-level evidence and direct feedback over cohort claims.

## Explicitly defer

- A new idea-generation cycle for this product.
- A second CRM.
- A new analytics vendor before the instrumentation audit.
- Complex lead scoring, predictive churn or AI-generated customer health.
- Paid ads before real conversion and cost data.
- Mass programmatic SEO.
- New verticals before the initial segment has credible paid retention.
- Automated cold outreach or mass directory submissions.
