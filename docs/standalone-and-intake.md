# Standalone CLI and founder intake

## One-command entry point

Run this from the directory you want Foundry to work in:

~~~bash
npx saas-foundry
~~~

The CLI inspects only the current directory's immediate entries and selected project manifests. It does not recursively scan the home directory. It then offers:

- **Use this existing project:** keeps the current working directory as the project root. No clone, move, or duplicate checkout.
- **Create a new SaaS:** uses the current directory when it is empty; otherwise creates a named child workspace without touching existing files.
- **Exit.**

A README by itself is not sufficient evidence that a software project already exists. Git metadata, source directories, known manifests, or Foundry state are stronger signals. The owner can always override the recommendation.

## Founder interview

The CLI collects optional context before starting the agent. Greenfield prompts cover:

- initial idea or hypothesis;
- user and economic buyer;
- concrete pain, frequency, urgency and cost of inaction;
- current alternatives and workarounds;
- founder access or unfair advantage;
- target geography and language;
- revenue hypothesis;
- budget, time and constraints.

Existing-project prompts cover product/customer, perceived bottleneck, available evidence, target outcome and constraints.

Answers are saved to .foundry/intake.md with restrictive local file permissions. They are hypotheses and founder-reported context, not customer validation. The agent must challenge assumptions, ask follow-up questions when useful, research external evidence and design real validation tests. Do not collect secrets, credentials, patient records or unnecessary personal data.

## Agent selection

The launcher detects locally installed Claude Code, Codex CLI and OpenCode commands. It offers available agents and installs the matching project-local skill. If no supported agent is installed, it prepares the workspace and explains the next step instead of failing after writing files.

The Foundry is the orchestrator; the selected coding agent is the executor. Project state, evidence, decisions and experiments remain in .foundry/ and are not tied to one agent's memory.

## Requirements

- Node.js 20 or newer.
- npm/npx.
- At least one supported coding agent installed and authenticated to execute the workflow.
- Git only when using Git-based features or a GitHub URL.

The repository must be published to the npm registry before the short npx saas-foundry command is available publicly. A GitHub-sourced invocation remains possible during development:

~~~bash
npx -y github:mkwitko/Saas-Foundry
~~~

## Privacy and safety

The detector reads directory names and selected project manifests only. It does not read .env*, secrets, databases, production data, customer conversations, patient records, private attachments or raw logs. The interview should not solicit those data.

The coding agent retains its normal permission controls. The Foundry does not bypass approval gates for outreach, publishing, paid spend, deployment, production mutations or sensitive data access.
