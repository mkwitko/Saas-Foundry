# One-repository SaaS Foundry workflow

The intended experience is to give Claude Code one GitHub repository URL and have it run the complete Foundry workflow, not just a code audit.

## Install the entry-point skill once

From a Claude Code terminal, install the foundry-run skill from this repository using the Skills CLI:

~~~bash
npx skills add mkwitko/Saas-Foundry --skill foundry-run -g -a claude-code
~~~

Review the installation prompt and the -g flag makes it available across your projects; omit -g if you prefer to install only in the current project. The skill contains the operating procedure; it does not grant external permissions.

If the Skills CLI is unavailable, open skills/foundry-run/SKILL.md from this repository and add it to Claude Code's available skills manually. Do not overwrite the target project's existing CLAUDE.md or AGENTS.md.

## The one-message prompt

After installing the skill, give Claude Code only the target repository URL:

~~~text
Run the complete SaaS Foundry workflow on this repository:
https://github.com/OWNER/REPOSITORY

Use the foundry-run skill. Work autonomously through repository and business discovery, code/architecture audit, current market and competitor research, ICP and offer review, pricing hypotheses, acquisition channels, qualified lead discovery, validation plan, SEO/content opportunities, funnel measurement, and a prioritized implementation cycle.

Create or update the .foundry workspace in this repository and preserve existing project instructions and decisions. Use evidence and dated sources; distinguish facts, measurements, hypotheses and unknowns. Implement safe, justified local improvements on a feature branch, run relevant checks, and prepare a draft PR if appropriate.

Do not send outreach, publish, submit listings, launch ads, spend money, deploy, change production, or access sensitive customer data without asking me first. Do not invent customer evidence, leads, metrics or market facts.

Do not stop after writing a report. Continue through the highest-value work that can be completed safely, then leave a measurable next-action plan and persistent state so the next run can continue without repeating discovery.
~~~

Replace the URL. No other project briefing is required to begin.

## What Claude should deliver

- A project and business assessment grounded in the actual repository.
- Technical audit with evidence and safe checks.
- Market map and competitor/alternative matrix.
- ICP, positioning, offer, pricing and validation hypotheses.
- Acquisition channel scorecard and a small, evidence-backed prospect shortlist.
- SEO/search-intent and content opportunities where justified.
- Funnel and metric definitions using existing telemetry first.
- A prioritized roadmap and experiment backlog.
- Safe local improvements on a feature branch, with tests and a draft PR when justified.
- A persistent .foundry workspace and run log.

## Important operating boundary

Autonomous means Claude should do research, analysis, drafting, local implementation, verification and state maintenance without asking for permission at every small step. It does not mean silently contacting people, publishing, spending, deploying, or changing production. Those actions remain explicit approval gates.

Actual research coverage depends on tools available in the Claude Code session (web search, browser, GitHub and other connectors). If a tool is unavailable, Claude must record the limitation and continue with what it can verify rather than inventing results.
