# SaaS Foundry CLI v0.5 — agent-assisted code audit

v0.5 adds an opt-in static code audit using a locally installed coding agent.

## Usage

```bash
foundry agent-audit ../my-saas --agent claude
foundry agent-audit ../my-saas --agent codex --timeout-ms 240000 --format json --out ./audit.json
```

- `--agent`: `claude` (default) or `codex`.
- `--timeout-ms`: 1,000–600,000; default 180,000.
- `--format json`: structured report; JSON is the default.
- `--out`: optional output file.

The CLI executable must already be installed and authenticated. Foundry does not install it or access a provider API directly.

## What happens

Foundry creates a temporary sanitized source snapshot, then runs:
- Claude Code with plan mode and Read/Glob/Grep tools.
- Codex with its read-only sandbox.

The snapshot excludes secrets and environment files, credential/key stores, databases, dumps, logs, backups, binary files, symlinks, dependency/build/cache directories and oversized files. Limits are 5,000 files, 20 MiB total, and 1 MiB per file. The temporary snapshot is removed after execution, including on failure.

The report follows `schemas/agent-audit-report.schema.json` and includes evidence, severity, confidence, impact, recommendation and verification steps.

## Important limitations

- This is static inspection, not runtime testing.
- No shell commands, project scripts, tests, builds, migrations, network calls, production access or file modifications are performed by Foundry.
- The snapshot is a minimization control, not a complete DLP guarantee. Review what source material may be sent to the model provider and that provider's retention/data controls.
- Agent output is untrusted and can be wrong. Review every finding.
- OpenCode is not yet supported because the Foundry does not yet enforce a verified read-only tool allowlist for its current CLI integration.
- No Plan or Implement mode is included in v0.5.

See [agent-code-intelligence.md](agent-code-intelligence.md) for the complete contract and roadmap.
