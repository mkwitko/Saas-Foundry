# Project bootstrap and one-command workflow

The Foundry must work the same way for an existing SaaS and a new project. It is installed locally in the target repository; a global Claude Code skill is optional, not required.

## One command: existing GitHub repository

From the parent directory, run:

~~~bash
npx -y github:mkwitko/Saas-Foundry run https://github.com/OWNER/REPOSITORY
~~~

The command clones the repository into a folder named after the repository, installs the project-local skill and state without overwriting existing files, then launches Claude Code in that directory with the full Foundry workflow prompt.

To choose a destination:

~~~bash
npx -y github:mkwitko/Saas-Foundry run https://github.com/OWNER/REPOSITORY --dir ./my-project
~~~

For a private repository, Git must already have access through the user's normal GitHub authentication.

## One command: existing local checkout

Run from the root of the repository:

~~~bash
npx -y github:mkwitko/Saas-Foundry run .
~~~

This detects the existing project, installs the local skill, and launches Claude Code in the repository.

## One command: brand-new project

Create a directory and run:

~~~bash
mkdir my-saas
cd my-saas
npx -y github:mkwitko/Saas-Foundry run . --mode new
~~~

This installs the same skill and starts Claude Code. The workflow detects the greenfield state and begins with buyer/problem discovery, demand research, validation, positioning and offer design. It must not pretend that a product, customers, traction or architecture already exist. It creates a product brief and validation artifacts before building a first implementation slice.

## Install only, without launching Claude

~~~bash
npx -y github:mkwitko/Saas-Foundry init . --mode auto
~~~

Then open Claude Code in the project and invoke /foundry-run. Use --agent codex, --agent opencode, or --agent all with init to install the corresponding standard skill directories.

## What the bootstrap writes

- .claude/skills/foundry-run/SKILL.md — project-local Claude Code entry point.
- .foundry/state.yaml — minimal bootstrap state, not fabricated project facts.
- .foundry/README.md — explains how the local workflow is used.

The installer is non-destructive: it never overwrites existing files. If a destination already contains a Foundry skill or state file, it preserves it and reports that fact. The workflow itself must inspect existing instructions and docs before changing anything.

## Requirements and limits

- Node.js 20+, Git, npm/npx, and Claude Code CLI installed and authenticated.
- Public GitHub repositories can be cloned directly. Private repositories require existing Git authentication.
- The command does not pass --dangerously-skip-permissions or bypass Claude Code permission controls.
- Claude uses its normal tool availability and permission model. Web research requires a web/search tool available in that Claude Code session.
- Sending outreach, publishing, directory submissions, paid campaigns, deployments and production changes remain explicit approval gates.
- A GitHub URL pasted into a Claude session with no Foundry skill available cannot magically load this workflow. Use the one-command launcher above, or install the skill once globally if you want URL-only invocation in future sessions.