# SaaS Foundry v0.6 — Claude Code operator workflow

v0.6 adds the Foundry's single entry point for an existing SaaS repository: the foundry-run agent skill.

## Install once for Claude Code

~~~bash
npx skills add mkwitko/Saas-Foundry --skill foundry-run -g -a claude-code
~~~

The -g flag makes the skill available across projects for the current user. Omit it to install only in the current project. Review the skill installation and source before accepting.

## Run against any GitHub repository

In Claude Code, provide the target repository URL and ask it to use the foundry-run skill. The full copyable prompt is in one-prompt-workflow.md.

Claude should:
1. inspect existing instructions, product docs and code;
2. create or update a compact .foundry workspace;
3. audit product and engineering with evidence;
4. research current market, competitors and buyer intent;
5. define ICP, positioning, offer, pricing hypotheses and validation;
6. identify channels, directories, communities, search demand and qualified business prospects;
7. prepare sales, SEO, content and acquisition experiments;
8. implement justified local improvements on a feature branch;
9. run relevant checks and prepare a draft PR where appropriate;
10. persist evidence, decisions, status and next actions.

## What v0.6 does not do

The skill is an orchestration contract for Claude Code, not a remote SaaS agent or a hosted crawler. It does not itself clone a repository, access the web, authenticate GitHub, connect analytics, send messages, publish, submit directories, spend money or deploy. Claude performs supported work using tools available in its session and must record missing capabilities instead of fabricating results.

Human approval is required before outreach, public posting, directory submissions, paid listings, ad spend, production changes and deployments. Repository edits should use a feature branch and relevant tests.

## Acquisition source registry

The curated discovery seeds live in catalog/acquisition-sources.yaml. Their roles, license declarations, trust level, constraints and freshness policy are documented in acquisition-engine.md. They are discovery inputs only; each destination must be verified before use.

## Persistent state

Claude should keep the project's business and execution context under .foundry/. The workspace is project-specific and must not contain credentials, raw customer messages, patient data or production exports. Existing project docs remain authoritative; the skill must not overwrite existing agent instructions or decisions.
