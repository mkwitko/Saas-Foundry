# Foundry operator experience and automation

## Goal

Make the full Foundry capability available through one understandable entry point without loading every skill, repeating discovery, or asking the founder to coordinate modules manually.

## Run modes

Use the interactive launcher for the first run:

```bash
npx -y github:mkwitko/Saas-Foundry
```

After setup, use focused runs from the project root:

```bash
npx -y github:mkwitko/Saas-Foundry run . --task auto
npx -y github:mkwitko/Saas-Foundry run . --task product
npx -y github:mkwitko/Saas-Foundry run . --task sales
npx -y github:mkwitko/Saas-Foundry run . --task growth
npx -y github:mkwitko/Saas-Foundry status .
npx -y github:mkwitko/Saas-Foundry runs . --limit 10
npx -y github:mkwitko/Saas-Foundry sequence . --module landing-page,sales-pipeline
npx -y github:mkwitko/Saas-Foundry verify . --module landing-page,sales-pipeline
```

| Task | Use when | Expected scope |
|---|---|---|
| `auto` | Unsure what to do next | Inspect state, identify the highest-value bottleneck, select only relevant modules |
| `full` | New business or deliberate lifecycle reset | Review all lifecycle stages, skip satisfied capabilities, produce one sequenced plan |
| `idea` | Exploring a new SaaS opportunity | Buyer/problem, alternatives, demand evidence, offer, pricing hypotheses and validation |
| `product` | Product quality is the constraint | Product strategy, UI/UX, React/Node architecture, reliability and delivery |
| `sales` | Leads or demos are not converting | ICP, qualification, pipeline, demo, objections, offer and follow-up |
| `growth` | Product has users or customers | Acquisition, activation, retention, referrals, unit economics and one experiment |
| `review` | Need a diagnosis before changes | Read-only assessment and prioritized plan; no implementation |

For new projects, the interactive launcher defaults to `idea`; for existing projects it defaults to `auto`. The founder can override the default.

## Module routing

`catalog/workflow-routing.yaml` is the routing source of truth. It maps each module to:
- primary upstream skills;
- supporting references;
- built-in Foundry fallbacks;
- templates where useful;
- installation and data-use policy.

The router must:
1. Read the project's existing skills and instructions first.
2. Reuse a verified installed skill before considering another install.
3. Load only the relevant upstream skill sections for selected modules.
4. Check the resource catalog, provenance, exact revision, license and install policy.
5. Ask before installing unreviewed third-party code.
6. Use the Foundry fallback if a resource is unavailable or not approved.
7. Record which resources were actually used; a catalog entry is not proof of installation.

## Execution loop

### Runner-owned lifecycle

Writable tasks are tracked by the CLI, not left entirely to the agent:

- Before launch, the runner records a unique run ID, task, agent, start time, PID, current branch and starting commit in `.foundry/state.yaml`.
- A second writable run is refused while the previous runner process is still active.
- If a prior CLI process disappeared before recording completion, the next run marks that execution interrupted before starting a new one.
- After exit, the runner records success/failure, exit code, signal, final branch/commit and a JSON receipt under `.foundry/runs/<run-id>.json`.
- Agent-written module progress, blockers and a meaningful next action are preserved. The runner only supplies a fallback next action when none was recorded.
- If state was concurrently replaced or corrupted, the runner reports a tracking error rather than silently overwriting it.

The `review` task is different: it does not bootstrap the project, write run state or create a run receipt. It is intended for read-only diagnosis.

### Execution loop

Every writable run follows the same short control loop:

1. **Resume:** read `.foundry/state.yaml`, `.foundry/evidence.yaml`, the last run report, accepted decisions and open experiments.
2. **Inspect:** refresh only evidence relevant to the requested task; record scan scope and exclusions.
3. **Select:** choose one primary bottleneck and at most two supporting modules unless `full` was explicitly selected.
4. **Plan:** state the expected customer/business outcome, evidence required, effort, risk and acceptance criteria.
5. **Execute:** complete safe research, drafting and local implementation; keep external actions approval-gated.
6. **Verify:** run relevant tests, checks, accessibility and UX reviews, and confirm observed behaviour where possible.
7. **Learn:** update evidence, decisions, experiment outcomes and project state.
8. **Handoff:** leave one next action, its owner, and any approval needed.

A process exit code of zero means only that the agent process exited successfully; it does not prove that the business task is complete. A run is operationally complete only when the selected work has a verifiable outcome or a clearly recorded blocker. Review the run receipt together with the agent's evidence and changed files.

## Customer value and satisfaction loop

Do not optimize for feature count or vanity metrics. For each customer segment, identify:
- the job the customer hired the product to do;
- the first event that proves value;
- time from signup or kickoff to that event;
- recurring value event and expected frequency;
- common failure or support moments;
- reasons for cancellation or non-renewal;
- the outcome the customer would miss if the product disappeared.

Use support, interviews and product telemetry as complementary evidence. Never send raw messages, patient information or other sensitive customer data to external models without explicit authorization and a lawful basis.

For low-volume B2B products, review individual cases rather than pretending small samples are statistically significant. Show counts and denominators with rates.

## Definition of done

Each module must state:
- customer/business outcome;
- evidence and confidence;
- files/artifacts changed;
- tests/checks run and results;
- remaining risks and limitations;
- rollback or reversal path for code changes;
- next action and owner.

A feature is not accepted solely because it compiles. Product work must also pass relevant user-flow, responsive, accessibility, error/empty/loading state and trust checks. Commercial work must distinguish hypotheses from real buyer commitments.

## Human approval

The agent can autonomously inspect, research, draft and make scoped local changes. Explicit approval remains mandatory for outreach, publishing, directory submission, spend, deployment, production changes, sensitive data access, security-sensitive changes and third-party installation.


## Failure recovery and auditability

- Keep one active writable Foundry run per project at a time.
- Never infer success from a missing error message; check the exit code and verification evidence.
- Treat an interrupted run as incomplete. Inspect partial changes and the latest receipt before resuming.
- Do not automatically revert agent changes after a failed run. First inspect the diff; rollback can destroy valid partial work.
- Run receipts contain execution metadata and concise module outcomes, not secrets, raw customer conversations or patient data.
- Preserve previous run receipts. Use the latest state as a pointer, not as the only history.

## Dependency sequencing and module acceptance

Use `sequence` to expand selected capabilities into a topologically ordered execution plan. Prerequisites already marked completed, `already_satisfied`, or `not_applicable` are not repeated. A blocked or specialist-required prerequisite blocks the dependent module. The command is read-only and never starts an agent:

```bash
npx -y github:mkwitko/Saas-Foundry sequence . --module conversion-optimization
```

Use `verify` to check whether selected modules have complete acceptance records:

```bash
npx -y github:mkwitko/Saas-Foundry verify . --module product-design,engineering-quality
```

The project-local `.foundry/acceptance.yaml` ledger records one entry per completed module: outcome, evidence, artifacts, checks and their results, risks, rollback path, next action and owner. A missing ledger, missing required module, failed check, or unrun check returns an incomplete result and a non-zero CLI exit code. `not_applicable` is allowed only as an explicit check result; it must not be used to hide an unverified requirement.

The verifier checks record completeness and declared check outcomes. It does not execute tests, independently validate evidence, inspect whether a rollback works, or certify business impact. Those remain part of the agent's verification and human review. Keep acceptance records free of secrets and raw customer or patient data.


## Automated visual audit

The visual audit is opt-in and project-local. It reuses an existing browser suite when available. Otherwise, initialize a Foundry Playwright harness:

```bash
foundry visual-audit init . --base-url http://127.0.0.1:3000
```

Edit `.foundry/visual-audit/config.json` to enumerate routes and readiness selectors. The bootstrap preserves existing files and never installs packages. If Playwright is not already installed, add it explicitly with the project's package manager (npm example: `npm install -D @playwright/test`) and install Chromium (`npx playwright install chromium`). For axe accessibility checks, optionally install `@axe-core/playwright`.

Start the local application yourself, then run:

```bash
foundry visual-audit run .
foundry visual-audit report .
```

The default harness checks mobile, tablet and desktop layouts, navigation status, horizontal overflow, broken images and browser errors. It captures screenshots and can run axe WCAG 2.1 A/AA checks when the optional package is present. It does not compare screenshots to approved visual baselines, automatically discover every route, start a server, or prove the UI is usable. Extend the generated suite with assertions for the product's actual critical journeys and inspect screenshots manually.

Reports are written to `.foundry/reports/visual-audit.playwright.json`; screenshots and traces are stored under `.foundry/artifacts/visual-audit/`. Keep artifacts free of customer, patient and other sensitive information. Record report path, route/viewport coverage, skipped checks and human review in the acceptance ledger.


## Customer intelligence report

For products with customer activity, use existing analytics and support sources first. Export only aggregate or sanitized summaries; never ingest raw conversations, contact details, patient data or production logs.

Create `.foundry/customer-intelligence/summary.json` from `templates/customer-intelligence-summary.json`, following `schemas/customer-intelligence.schema.json`, then run:

```bash
foundry customer-intel report .
foundry customer-intel report . --input ./exports/sanitized-summary.json --format json
```

The report computes descriptive activation, active, retention and cancellation rates only when denominators exist, flags fewer than 10 eligible accounts, and orders declared support/negative-feedback signals by severity and affected accounts. This is a triage aid, not churn prediction, statistical inference or causal analysis. Use [Customer Intelligence Loop](customer-intelligence-loop.md) to define event semantics, cohorts, privacy boundaries and the weekly decision cycle.
