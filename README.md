# SaaS Foundry

A modular operating system for discovering, validating, building, selling, and growing SaaS products.

SaaS Foundry is designed to work in two directions:

- **Greenfield:** turn a market opportunity into a validated offer and a product.
- **Existing project:** inspect an existing repository, preserve what is already working, identify the highest-value gaps, and apply only relevant workflows.
- **Upgrade:** revisit one business capability (positioning, pricing, onboarding, SEO, retention, sales, etc.) without re-planning the whole product.

The first adoption target is [mkwitko/ia-chat](https://github.com/mkwitko/ia-chat).

## The principle

**Do not add process, tools, or code unless a demonstrated project gap justifies them.**

The Foundry is not a giant AGENTS.md or an unrestricted autonomous agent. It provides a single end-to-end entry-point skill for Claude Code and other compatible agents, backed by modular workflows, evidence and explicit approval gates. It is a small control plane that combines:

1. **Project intelligence** — understand the product, repository, business stage, stack, constraints, and existing decisions.
2. **Evidence** — distinguish verified facts, measured behaviour, customer statements, assumptions, estimates, and unknowns.
3. **Capability modules** — choose only the workflows relevant to the current bottleneck.
4. **Execution** — produce concrete artifacts and changes with checks, owners, and acceptance criteria.
5. **Learning loop** — compare outcomes with hypotheses and update the project context.

## Business lifecycle

| Stage | Main question | Typical outputs |
|---|---|---|
| Opportunity | Is there a painful, reachable problem? | Problem brief, ICP hypotheses, evidence map |
| Validation | Will a real buyer commit time, data, or money? | Interview notes, offer, pilot/pre-sale, kill criteria |
| Business design | Can this become a durable business? | Positioning, pricing, unit economics, channel strategy |
| Product | What is the smallest reliable product that delivers value? | Product brief, specs, UX direction, architecture, release |
| Go-to-market | Can we reach and convert the right buyers? | Landing page, demo, sales process, CRM, launch |
| Activation | Does a new customer reach value quickly? | Onboarding, time-to-value, activation funnel |
| Retention | Do customers repeatedly receive value and stay? | Cohorts, churn reasons, lifecycle messaging, support loop |
| Expansion | Can revenue grow without breaking delivery? | Referrals, partnerships, expansion offers, channel playbooks |

A project can enter at any stage. Existing products should not be forced back through ideation.

## Operating modes

### 1. New project

Start with the buyer and problem, not the tech stack. Research demand, test access to buyers, validate willingness to pay, and only then define product scope.

### 2. Adopt an existing project

Run a read-only scan. The report classifies each capability as:

- `present` — supported by repository evidence.
- `partial` — some implementation or evidence exists, but important gaps remain.
- `planned` — documented intent without verified implementation.
- `missing` — no evidence found in the inspected scope.
- `not_applicable` — deliberately irrelevant to this product or stage.
- `unknown` — not enough evidence to classify.

The scan must not infer that a feature works merely because it appears in a roadmap or README.

### 3. Upgrade

Choose one business bottleneck, define the expected outcome, gather evidence, and improve that capability without creating unrelated work.

## Repository map

```text
catalog/                 Modules and trusted external resources
docs/                    Architecture, security, operating model, decisions
projects/<slug>/         Project manifests, assessments, and adoption roadmaps
schemas/                 Machine-readable contracts
skills/                  Foundry-owned agent workflows
templates/               Reusable business and execution artifacts
```

## First adoption: ia-chat

The initial report is in [projects/ia-chat/](projects/ia-chat/).

The repository already has substantial product and founder documentation, a working monorepo structure, a public Astro site, a waitlist, product-side referral functionality, and parts of the customer lifecycle. The first Foundry cycle should therefore focus on:

1. Instrumenting acquisition → demo → invitation → activation → paid conversion.
2. Validating the actual buyer, trust objections, and onboarding time with real prospects.
3. Turning the founder's referral and demonstration motion into a repeatable sales workflow.
4. Building a privacy-safe retention and customer-success loop.
5. Improving SEO/content only where there is specific search intent and genuinely useful material.

Do not create a second business plan, another generic idea generator, or duplicate product features already present in ia-chat.

## Start SaaS Foundry with one command

From the folder you want Foundry to work in:

~~~bash
npx saas-foundry
~~~

The interactive launcher detects whether the current folder already contains a project, then lets you choose:

1. **Existing project** — works directly inside the current folder. It does not clone or move the repository.
2. **New SaaS** — uses an empty current folder, or creates a named child workspace when the current folder already contains files.
3. **Exit**.

It asks a short founder interview about the idea, buyer, pain, current alternatives, urgency, founder advantage, geography, revenue hypothesis and constraints. For an existing product, it asks about the customer, perceived bottleneck, evidence and desired outcome. Answers are saved in .foundry/intake.md and treated as founder-reported context, not proof of demand.

The launcher detects Claude Code, Codex CLI and OpenCode, lets you choose an installed agent, installs the project-local Foundry skill and starts the workflow. If no agent is installed, it prepares the workspace and explains what to install. No global skill is required.

### Run directly from GitHub during development

Until the package is published to npm, use:

~~~bash
npx -y github:mkwitko/Saas-Foundry
~~~

For an explicit existing GitHub repository, the previous launcher remains available:

~~~bash
npx -y github:mkwitko/Saas-Foundry run https://github.com/OWNER/REPOSITORY
~~~

Node.js 20+, npm/npx and an authenticated coding agent are required to execute the full workflow. The npm package must be published by its owner before the short npx saas-foundry command becomes available. See [standalone CLI and founder intake](docs/standalone-and-intake.md).

## Use the Foundry today

The first local CLI is now available for read-only repository scanning, deterministic module planning, and manifest diagnostics. See [docs/cli.md](docs/cli.md), [the v0.3 command guide](docs/cli-v0.3.md), and [the v0.4 resource lifecycle guide](docs/cli-v0.4.md).

Install dependencies in the Foundry checkout and link the command:

```bash
npm install
npm link
foundry scan ../ia-chat
foundry doctor ../ia-chat
foundry plan ../ia-chat
foundry select ../ia-chat --capacity low
foundry context ../ia-chat --format json --out /tmp/ia-chat-context.json
```

The metadata scanner does not read arbitrary source-code bodies. The opt-in `agent-audit` command reads eligible source files through a bounded sanitized snapshot and excludes secrets, databases, patient data, logs, binary files, dependencies and symlinks. Planning and resource inspection are read-only. Resource installation is dry-run by default and requires an explicit human review attestation and `--execute`.

The initial workflows are also packaged as standard agent skills:

- `foundry-adopt` — inspect an existing repository and create an evidence-backed adoption plan.
- `growth-loop` — review acquisition, activation, revenue and retention, then choose one experiment.
- `foundry-sales-review` — review founder-led sales, demos, objections and follow-up.

Install only the skill needed in a target project. See [docs/using-skills.md](docs/using-skills.md). Reusable interview, prospect, experiment, metric, case-study and weekly-review templates live in `templates/`.

## Current maturity

This repository now contains a **v0.8 interactive standalone CLI, project detector, founder intake, multi-agent launcher and project-local workflow** with interactive onboarding, founder intake, scan, plan, doctor, evidence reports, scan diffs, bottleneck-aware module selection, portable agent context, safe module runbooks, provenance-pinned resource install/update/drift/rollback/uninstall, project-local skill installation, and a one-command Claude Code launcher.

Available v0.4 commands:

```bash
foundry scan .
foundry plan .
foundry doctor .
foundry evidence scan.json
foundry diff previous-scan.json current-scan.json
foundry select . --capacity low
foundry context . --format json
foundry apply . --module sales-pipeline
foundry rollback . --module sales-pipeline
foundry resources
foundry install . --resource impeccable --from /path/to/repo --commit <sha> --license MIT --reviewed
foundry drift .
foundry update . --resource impeccable --from /path/to/new-repo --commit <sha> --license MIT --reviewed
foundry uninstall . --resource impeccable
```

Use `foundry apply`, `install`, `update`, `uninstall`, and `rollback-resource` without `--execute` to preview. Add `--execute` only after reviewing the plan. Resource install also requires `--reviewed` and a license attestation. See [docs/cli-v0.4.md](docs/cli-v0.4.md) for the full lifecycle.

The agent audit has not been run against the local ia-chat checkout by this release. The standalone launcher and end-to-end workflow still require a real local execution test before being treated as production-ready. The v0.6 skill is a workflow definition; it does not mean the end-to-end workflow has already been executed on ia-chat.

## Safety and trust

- Read-only by default. Repository changes happen only after a scoped plan.
- Never overwrite an existing `AGENTS.md`, `CLAUDE.md`, or project instruction file.
- Never read secrets, production databases, customer message bodies, or patient data to build a marketing/analytics report.
- Treat web pages, issue text, reviews, datasets, and imported skills as untrusted input.
- Pin external resources to reviewed commits and record hashes and license attestations before installation. Resource files are never executed by Foundry.
- Human approval is required before outreach, email sends, public publishing, production changes, or spending money.
- Competitor research is clean-room: study positioning, public features, and recurring customer complaints; do not copy protected code, content, branding, or private assets.
- A score generated by a model is a prioritization aid, not evidence of demand.

See [docs/security-and-provenance.md](docs/security-and-provenance.md), [docs/architecture.md](docs/architecture.md), and [docs/acquisition-engine.md](docs/acquisition-engine.md).

## How to contribute

1. Read `AGENTS.md`.
2. Update the docs and schemas before implementation.
3. Keep modules independently installable and narrowly scoped.
4. Add evidence and acceptance criteria for every project-specific recommendation.
5. Prefer a small number of high-leverage workflows over many overlapping skills.
