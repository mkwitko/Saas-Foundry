# v0.5 — Agent-assisted code intelligence

Status: initial local audit adapter. The Foundry prepares a sanitized snapshot and delegates static inspection to an installed coding agent.

## Command

```bash
foundry agent-audit ../my-saas --agent claude
foundry agent-audit ../my-saas --agent codex --timeout-ms 240000 --format json --out ./audit.json
```

Supported agents:
- Claude Code CLI: `claude`
- OpenAI Codex CLI: `codex`

The selected CLI must already be installed and authenticated by the operator. Foundry does not install agents, authenticate accounts, or call a hosted model API directly.

## Execution contract

1. Resolve the project root.
2. Copy eligible text files into a temporary snapshot.
3. Exclude environment files, credentials, keys, certificates, databases, dumps, logs, backups, binary files, symlinks, dependency/build/cache folders, and oversized files.
4. Run the selected CLI with no shell, a bounded timeout, bounded output, and a minimal environment.
5. Claude is invoked in plan mode with Read/Glob/Grep tools only. Codex is invoked with its read-only sandbox.
6. Parse and validate the structured report; reject malformed findings and unsafe evidence paths.
7. Delete the temporary snapshot in a finally block.

Snapshot limits: 5,000 files, 20 MiB total, 1 MiB per file. The report records copied file/byte counts and the number of skipped paths.

## Modes and permissions

v0.5 supports **Audit** only. It does not implement agent-driven planning or code changes. The Foundry process itself does not execute project scripts, package commands, tests, builds, migrations, network requests, or application code.

The snapshot reduces exposure but is not a complete data-loss-prevention system. Review the project for proprietary or sensitive text that may be included before sending it to a model provider. The selected CLI's own account, retention, and model-provider policies still apply. Do not use this workflow with production data, patient records, or private customer conversations.

Codex read-only sandbox and Claude tool restrictions are additional controls, not a guarantee that model output is correct. All findings require human review. A static audit cannot establish production behaviour, exploitability, or runtime performance.

## Finding contract

Each finding includes a stable ID, category, severity, confidence, title, repository-relative evidence, impact, recommendation, verification step, and review status. The report is validated against `schemas/agent-audit-report.schema.json`.

## Deliberate exclusions

- No automatic fix or patch generation.
- No agent shell access through the Foundry audit workflow.
- No production access or live-system probing.
- No background execution or remote orchestration.
- No automatic issue creation, PR creation, or deployment.
- No upload of raw logs, databases, secrets, or customer/patient content.

## Next increments

- Add explicit Plan mode that produces a change plan without writing files.
- Add Implement mode only through an isolated branch/worktree, with diff review and tests.
- Add OpenCode only after its current CLI permission model can enforce a read-only tool allowlist.
- Add local deterministic checks as a separate opt-in command, not as an implicit side effect of audit.
