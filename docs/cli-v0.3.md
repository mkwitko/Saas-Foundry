# SaaS Foundry CLI v0.3

v0.3 adds evidence scoring, scan-to-scan diffs, bottleneck-aware module shortlists, portable agent context, and a guarded module-runbook apply/rollback workflow.

## Commands

```bash
foundry scan ../ia-chat --format json --out /tmp/ia-chat-current.json
foundry evidence /tmp/ia-chat-current.json
foundry diff /tmp/ia-chat-previous.json /tmp/ia-chat-current.json
foundry select ../ia-chat --capacity low
foundry context ../ia-chat --format json --out /tmp/ia-chat-context.json
foundry apply ../ia-chat --module sales-pipeline,analytics-instrumentation
foundry apply ../ia-chat --module sales-pipeline --execute
foundry rollback ../ia-chat --module sales-pipeline
```

## Evidence Engine

`foundry evidence` creates stable IDs for findings, classifies repository findings as E3 evidence, reports reference count as confidence, and marks scan freshness (fresh ≤30 days, aging ≤90 days, stale thereafter). Confidence is about the inspected repository evidence only; it does not prove production use, demand, or outcomes.

## Project Diff

`foundry diff` compares two scan JSON snapshots. It reports added/removed inventory paths, changed signals, and capability evidence status changes. It does not infer that a feature was removed or that customer behaviour changed.

## Smart Module Selection

`foundry select` ranks modules using the declared business stage, current bottleneck, explicit module decisions, detected repository signals, dependencies, risk, and founder capacity. Supported capacity values are `low`, `medium`, and `high`. The output is a shortlist for owner review; it does not mutate the manifest or enable modules.

The optional flags `--stage` and `--bottleneck` override the project manifest for a one-off selection.

## Agent context

`foundry context` exports a compact, agent-neutral JSON package with project metadata, stack, data sensitivity, repository signals, evidence references, recommended modules, and operating guardrails. It deliberately excludes arbitrary source-code content, secrets, customer messages, and patient data. The output can be passed to Claude Code, OpenCode, Codex, or another agent without loading the entire Foundry repository.

## Apply Engine

`foundry apply` is dry-run by default. It generates project-specific module runbooks under `.foundry/modules/<module-id>/README.md` from the trusted module registry.

- Add `--execute` to create the runbooks.
- Existing files are never overwritten.
- Symlinked destinations and path traversal are rejected.
- A content-hash lock is written to `.foundry/applied-modules.json`.
- `foundry rollback` removes only an unchanged artifact whose hash matches the lock.
- Modified artifacts are preserved; rollback refuses to delete them.

This v0.3 apply engine installs Foundry-generated runbooks, not third-party skills, connectors, datasets, dependencies, or application code. Those require separately reviewed artifact adapters in a later release.

## Safety and limits

- All commands are local; no LLM, cloud account, production service, customer, or external API is contacted.
- `--execute` is an explicit local file-write action. Review the dry-run first.
- No existing `AGENTS.md`, `CLAUDE.md`, or other project instruction file is edited.
- Apply does not send messages, publish content, spend money, or deploy.
- Scanner limitations from v0.2 still apply.
- The module selector is a transparent heuristic, not a validated business scoring model.
