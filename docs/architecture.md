# Architecture

Status: v0.2 local CLI for scan, plan and doctor. Automated installation and runtime verification remain future work.

## Design goals

1. Work with greenfield and existing products.
2. Preserve project-specific decisions and constraints.
3. Select modules based on evidence and business stage.
4. Work with different coding agents and technology stacks.
5. Keep the base lightweight; install optional capabilities only when needed.
6. Make actions reviewable and reversible.

## Layers

### 1. Project context

Each managed project has a small manifest at `.foundry/project.yaml`:

- identity and repository;
- business model, buyer, segment, geography, and stage;
- value proposition and current offer;
- stack, deployment, data sensitivity, and constraints;
- known metrics, hypotheses, evidence links, and current bottleneck;
- enabled modules and review cadence.

The manifest is a summary, not a replacement for the product's own specs or decision records. Link to existing documents instead of copying them.

### 2. Project intelligence

The scanner should inspect metadata first, then selected content:

- root files and package/workspace manifests;
- agent instructions and product docs;
- application/package boundaries and framework fingerprints;
- tests, CI, deployment, databases, auth, billing, integrations;
- marketing site, sitemap, metadata, analytics tags and event calls;
- onboarding, product events, support and customer lifecycle surfaces;
- business artifacts such as positioning, ICP, pricing, offer, sales process and metrics.

Default exclusions: secrets, `.env*`, private keys, tokens, production exports, database dumps, uploaded customer content, message bodies, patient data, build output, dependency folders, and binary assets.

The scan is read-only. A scanner finding must reference the evidence inspected and include its limits.

### 3. Capability registry

A module is a bounded workflow, not necessarily an installable skill. Its contract includes:

- `id`, version, purpose, stage and trigger;
- required inputs and evidence;
- dependencies and conflict rules;
- workflow / skill / template / connector / dataset artifacts;
- outputs and acceptance criteria;
- risk level and approval requirements;
- uninstall or rollback notes where applicable.

Keep resource types separate:
- **Skill:** instructions for an agent or operator.
- **Template:** reusable artifact structure.
- **Connector:** API or application integration.
- **Dataset:** reference data with provenance and freshness.
- **Workflow:** ordered human or automated steps.
- **Tool:** executable code or CLI functionality.

### 4. Planner

The planner compares project evidence with module contracts and produces a plan:

- `already_satisfied`
- `recommended`
- `optional_later`
- `blocked`
- `not_applicable`
- `needs_owner_decision`

It must explain why a module is selected, what existing capability it reuses, and what it will not change.

Prioritization should consider:
- revenue or retention impact;
- strength of evidence;
- time to learn;
- effort and opportunity cost;
- operational, privacy, legal, and platform risk;
- current stage and founder capacity.

Do not let a model-generated score overrule a hard blocker or direct evidence.

### 5. Execution adapters

Adapters translate a module into a specific environment:
- Claude Code / `npx skills`;
- OpenCode;
- Codex;
- GitHub workflows;
- local scripts or a future Foundry CLI.

The registry and project model remain agent-neutral. An adapter may create a local skill pointer or install selected files, but must not rewrite the host project's main instruction file automatically.

## Project modes

| Mode | First action | Avoid |
|---|---|---|
| New | Buyer/problem discovery and validation | Building before access to buyers |
| Adopt | Read-only project and business scan | Rebuilding existing specs or ideation |
| Upgrade | One bottleneck and measurable target | Unrelated cleanup or broad rewrites |

## Evidence model

Every finding has a status, evidence pointer, observation date, confidence, owner, and next step. See [evidence-standard.md](evidence-standard.md).

The scanner must distinguish:
- code present;
- code covered by tests;
- behaviour observed in a running environment;
- capability documented but not implemented;
- external account approval still pending.

Presence of code alone does not prove production readiness.

## Autonomy levels

| Level | Allowed | Examples |
|---|---|---|
| A0 — Inspect | Read repository metadata and selected docs | Inventory, gap report |
| A1 — Draft | Write reports, specs, copy and plans | Offer draft, experiment plan |
| A2 — Local change | Modify files on an isolated branch | Install approved skill, add analytics spec |
| A3 — External action | Only after explicit approval per action | Send outreach, publish content, submit directory listing |
| A4 — Spend / production | Separate explicit approval and verification | Ad spend, production rollout, paid subscription |

A prior approval for one action does not authorize repeated or broader actions.

## Suggested CLI milestones

### v0.1 — Current
- Documented project model and workflows.
- Module and resource registries.
- First existing-project assessment: ia-chat.

### v0.2 — Registry and validation
- JSON Schema / YAML validation.
- Resource provenance lockfile.
- Module dependency and conflict validation.
- Human-readable plan output.

### v0.3 — Read-only scanner
- Repository fingerprinting.
- Evidence-backed capability report.
- Explicit exclusions and scan summary.
- Diffable scan snapshots.

### v0.4 — Safe adoption
- Install selected skills/templates into a project.
- Dry-run, branch, rollback, and drift detection.
- Preserve existing agent instructions.

### v0.5 — Learning loop
- Experiment ledger.
- Metric definitions and source mapping.
- Weekly growth review.
- Connector integrations where the project needs them.

## Non-goals

- A generic autonomous founder that makes strategic decisions without the owner.
- A mega-prompt that loads every capability on every task.
- Automatic cold outreach or mass directory submissions.
- A competitor-cloning tool.
- A product analytics platform that duplicates PostHog or existing product telemetry.
