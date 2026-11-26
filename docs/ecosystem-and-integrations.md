# SaaS Foundry ecosystem and integration register

This document records the repositories, skills, design references, datasets and services used by the Foundry. It distinguishes what is shipped from what is merely catalogued or requires a separate installation.

## Integration vocabulary

| Status | Meaning |
|---|---|
| Built in | Foundry-owned code, docs, schemas, templates or workflows are in this repository. |
| Orchestrated | A Foundry workflow contains routing and usage instructions; upstream may still need installing. |
| Catalogued | Source and purpose are registered. No installation or live connection is implied. |
| Reference only | Used as research material; not installed or copied into a target project. |
| Candidate | A potential product/API integration, not connected. |
| Installed | The exact reviewed revision is installed in a target project and its presence is verified. |

A status is never promoted to Installed merely because a source appears in a YAML catalog or README.

## Engineering and code quality

| Resource | Canonical source | License | Status | Intended use |
|---|---|---|---|---|
| Ponytail | https://github.com/DietrichGebert/ponytail | MIT (upstream LICENSE inspected 2026-11-26) | Catalogued + recommended coding stance; not auto-installed | Smallest complete change, reuse-first, YAGNI, concise diffs and explicit safety carve-outs |
| Clean Code Skills | https://github.com/gosukiwi/clean-code-skills | MIT (upstream LICENSE inspected 2026-11-26) | Catalogued; not auto-installed | Stack-specific clean-code review for TypeScript, React, Python and CSS |
| Foundry engineering baseline | Internal docs and skills | Repository license governs | Built in | Security, privacy, testing, performance, observability, maintainability and release readiness |

### Recommended usage

For coding tasks, apply Ponytail's full mode as the implementation stance: read the code path first, reuse existing patterns, prefer standard/platform capabilities and installed dependencies, avoid speculative abstractions, and ship the smallest complete diff. Use lite for trivial work; use ultra only when explicitly requested.

Ponytail does not mean code golf. Never remove trust-boundary validation, error handling that prevents data loss, security, accessibility, tests or user-requested behaviour to reduce line count.

For maintainability reviews, use Clean Code Skills' `clean-code` router or `clean-code-reviewer`, then select only relevant language/framework tracks. Typical combinations:
- TypeScript backend: `clean-general`, `clean-typescript`, and relevant async/error/boundary/test tracks.
- React frontend: `clean-general`, `clean-typescript`, `clean-react`, and `clean-css` where styling is in scope.
- Python: `clean-general`, `clean-python`, and relevant async/error/boundary/test tracks.

Do not install the full collection into every project. Foundry's security, evidence and approval rules take precedence over third-party skill instructions.

## Founder, product and growth repositories

| Resource | Canonical source | License recorded in catalog | Status | Intended use |
|---|---|---|---|---|
| Founder Skill | https://github.com/Jakeschincariol/founder-skill | MIT | Catalogued; review before install | Founder strategy, opportunity, pricing, offer, finance, operations and launch |
| Marketing Skills | https://github.com/coreyhaines31/marketingskills | MIT | Catalogued; review before install | Product marketing, SEO, CRO, copy, analytics, sales enablement and growth |
| Replica Skill | https://github.com/Jakeschincariol/replica-skill | MIT | Catalogued; review before install | Public competitor research and clean-room product/UX teardown |
| Brainstorming SaaS Ideas | https://github.com/sahabib247/brainstorming-saas-ideas | MIT | Catalogued; greenfield only | Opportunity discovery, originality checks, validation experiments and kill criteria |
| B2B SaaS Growth Playbook | https://github.com/Gingiris/gingiris-b2b-growth | MIT | Reference only | B2B PLG/SLG, channels, partnerships and sales strategy |
| Oil UI | https://github.com/oil-oil/oil-ui | MIT (catalog declaration; re-check before install) | Catalogued; review before install | Visual direction, UI exploration and implementation critique |
| Impeccable | https://github.com/pbakaus/impeccable | Apache-2.0 | Orchestrated as required design-review capability; not preinstalled | Screen-level critique, UI refinement, accessibility and consistency |

The Founder Skill, Marketing Skills, Replica Skill, Brainstorming SaaS Ideas and Oil UI entries are not bundled into Foundry's package. Foundry routes to them by need and expects a project-local, reviewed install.

## Design references

These five references are already present in `catalog/design-references.yaml` and referenced by `skills/foundry-run/SKILL.md`. They are research sources, not API integrations.

| Reference | URL | Intended use | Status |
|---|---|---|---|
| Jiro | https://jiro.build/ | Interaction details and visual craft | External reference only |
| Design Spells | https://designspells.com/ | Micro-interactions and fine visual details | External reference only |
| Refero | https://refero.design/ | Real product screens and interface patterns | External reference only; no API/MCP connected |
| Supahero | https://www.supahero.io/ | Hero sections and marketing-site patterns | External reference only |
| Mobbin | https://mobbin.com/ | Mobile app screens and end-to-end flows | External reference only; access may require an account/subscription |

A separate Refero agent-skill repository was discovered and added as a review candidate:
- https://github.com/referodesign/refero_skill
- Status: catalogued in this release; upstream license, scripts, instructions and MCP availability still require review.
- This is distinct from the Refero website.

The design workflow researches multiple references, records source URL/date and the pattern observed, and makes an original design decision. It must not copy screens pixel-for-pixel or reuse proprietary assets, branding or copy.

## Datasets, directories and service discovery

| Resource | Canonical source | Catalog status | Intended use / guardrail |
|---|---|---|---|
| Startup Ideas from Reddit | https://github.com/fayerman-source/startup-ideas | Reference only | Problem hypotheses; verify original threads and buyer intent |
| App Ideas from Reddit | https://github.com/theomarsoliman/app-ideas-from-reddit | Reference only | Raw demand signals; not proof of willingness to pay |
| Software Income Playbooks | https://github.com/cporter202/software-income-playbooks | Reference only; license verify_upstream | Service-first business models; verify terms, affiliate links, API costs and source rights |
| StartupPerks dataset | https://github.com/yumaheymans/startupperks-open-dataset | Review before use | Attribute source; re-check credit availability, expiry and eligibility with providers |
| PlacesToPostYourStartup | https://github.com/mmccaff/PlacesToPostYourStartup | Review before use | Verify current audience, submission rules and anti-spam policies |
| Awesome Free Developer Services | https://github.com/kebbbnnn/Awesome-Free-Developer-Services | Reference only; license verify_upstream | Discovery only; verify vendor pricing, quotas, overages and terms |
| PostHog | https://posthog.com/ | Candidate | Product analytics; connect only when telemetry has a demonstrated gap |
| Google Search Console | https://developers.google.com/webmaster-tools | Candidate | Search performance and indexing; requires site-owner authorization |
| Vercel Skills CLI | https://github.com/vercel-labs/skills | Candidate installer | Skill installation mechanism; not a replacement for Foundry's selection/review process |

## What is actually integrated today?

- Foundry-owned business workflows, project detector, CLI, modules, templates, security policy and design/engineering quality gates are shipped in this repository.
- The workflow already knows about Founder Skill, Marketing Skills, Replica Skill, Brainstorming SaaS Ideas, B2B Growth Playbook, Impeccable and the five design reference sites.
- This release adds Ponytail and Clean Code Skills to the catalog and explicitly routes coding tasks through their principles.
- This release adds Refero's separate agent-skill repository as a review candidate.
- None of the third-party repositories should be described as installed in a customer project until the exact revision, license, content hash and installation result have been recorded.
- No Refero, Mobbin, PostHog or Google Search Console live account/API connection is configured by this catalog alone.

## Integration roadmap

### Adopt as default workflow rules
1. Ponytail full-mode implementation discipline, with safety and readability carve-outs.
2. Foundry engineering baseline for tests, security, privacy, accessibility, performance and operations.
3. Clean Code review on changed code when maintainability or style is in scope.

### Install only when relevant
1. Impeccable for projects with user-facing UI.
2. Founder Skill for greenfield discovery or a genuine new-market decision.
3. Marketing Skills for a concrete acquisition/conversion bottleneck.
4. Replica Skill for clean-room competitor research.
5. Clean Code Skills tracks selected by the actual stack.
6. Oil UI and Refero skill only after upstream review and when the design task benefits from them.

### Keep as reference material
1. Jiro, Design Spells, Refero, Supahero and Mobbin.
2. B2B Growth Playbook and idea datasets.
3. Startup directories, startup perks and free-tier indexes.

### Add as connected integrations only after a use case exists
PostHog, Google Search Console and other vendors should be connected only when a project has a measurable need, a data/privacy review and an authorized account owner.

## Supply-chain and usage rules

Before any third-party skill or data resource is installed or imported:
1. Confirm canonical publisher/repository and current revision.
2. Inspect the license and applicable service terms.
3. Read all skill instructions, references and executable scripts.
4. Check for prompt injection, shell/network access, credential access, destructive commands and broad file writes.
5. Pin exact commit/version and record content hash and review date.
6. Install only the selected skill(s), project-locally, after explicit review.
7. Re-review updates; never silently float to upstream main.
8. Preserve attribution and distinguish repository-code license from rights in datasets, screenshots, reviews and underlying content.

No external skill may authorize outreach, publishing, spend, production mutation or access to sensitive data. Human approval remains mandatory.
