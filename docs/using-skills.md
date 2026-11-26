# Using Foundry skills

The Foundry keeps its skills in the standard `SKILL.md` format. A skill is a focused workflow; do not install the whole catalogue into every project.

## Install into a project

From the target repository, install only the workflow needed for the current task:

```bash
npx skills add mkwitko/Saas-Foundry --skill foundry-adopt
```

For the initial `ia-chat` adoption cycle, the optional next workflows are:

```bash
npx skills add mkwitko/Saas-Foundry --skill growth-loop
npx skills add mkwitko/Saas-Foundry --skill foundry-sales-review
```

Run the installer interactively and confirm the intended agent and project-local scope. Do not use a global install for project-specific rules. Review the files that will be installed before accepting.

The Vercel Skills CLI supports installation from GitHub repositories and multiple coding agents, including Claude Code, Codex and OpenCode. See the [official introduction](https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem) and [Skills FAQ](https://vercel.com/blog/agent-skills-explained-an-faq).

## What to install first

| Project state | Recommended skill |
|---|---|
| Existing repository with unclear business / technical gaps | `foundry-adopt` |
| Funnel data and a growth question are available | `growth-loop` |
| Founder-led B2B pipeline and real demos exist | `foundry-sales-review` |

Do not install opportunity generation into an existing project unless the owner is actively exploring a new market or product.

## Scope

- Project-local installation is preferred.
- Keep `AGENTS.md` and `CLAUDE.md` as the host project's top-level instructions.
- Review skill updates before accepting them.
- A skill does not grant permission to send messages, publish, spend, or access production data.
- The CLI is an installer, not the Foundry planner. Module selection and project-specific decisions remain in the Foundry manifest and adoption report.
