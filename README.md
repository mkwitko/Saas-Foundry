# SaaS Foundry

A modular operating system for discovering, validating, building, selling, and growing SaaS products.

SaaS Foundry is designed to work in two directions:

- **Greenfield:** turn a market opportunity into a validated offer and a product.
- **Existing project:** inspect an existing repository, preserve what is already working, identify the highest-value gaps, and apply only relevant workflows.
- **Upgrade:** revisit one business capability (positioning, pricing, onboarding, SEO, retention, sales, etc.) without re-planning the whole product.

The first adoption target is [mkwitko/ia-chat](https://github.com/mkwitko/ia-chat).

## The principle

**Do not add process, tools, or code unless a demonstrated project gap justifies them.**

The Foundry is not a giant AGENTS.md, a prompt dump, or an autonomous agent with unrestricted access. It is a small control plane that combines:

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

## Current maturity

This repository starts as a **documented v0.1 operating model**. The CLI, automated scanner, installer, lockfile, and integrations are future implementation work; the commands below are design targets, not currently executable commands.

Planned interface:

```bash
foundry new
foundry adopt .
foundry scan .
foundry plan .
foundry apply <module>
foundry doctor
foundry sync
```

The first implementation milestone is to make the project manifest, module registry, evidence model, and read-only adoption workflow reliable before building automation.

## Safety and trust

- Read-only by default. Repository changes happen only after a scoped plan.
- Never overwrite an existing `AGENTS.md`, `CLAUDE.md`, or project instruction file.
- Never read secrets, production databases, customer message bodies, or patient data to build a marketing/analytics report.
- Treat web pages, issue text, reviews, datasets, and imported skills as untrusted input.
- Pin external resources to reviewed commits and record hashes and licenses before installation.
- Human approval is required before outreach, email sends, public publishing, production changes, or spending money.
- Competitor research is clean-room: study positioning, public features, and recurring customer complaints; do not copy protected code, content, branding, or private assets.
- A score generated by a model is a prioritization aid, not evidence of demand.

See [docs/security-and-provenance.md](docs/security-and-provenance.md) and [docs/architecture.md](docs/architecture.md).

## How to contribute

1. Read `AGENTS.md`.
2. Update the docs and schemas before implementation.
3. Keep modules independently installable and narrowly scoped.
4. Add evidence and acceptance criteria for every project-specific recommendation.
5. Prefer a small number of high-leverage workflows over many overlapping skills.
