# SaaS Foundry CLI v0.2

The first CLI release implements three local commands. It is intentionally deterministic and read-only.

## Requirements

- Node.js 20 or newer.
- npm (or another compatible package manager).
- A local checkout of SaaS Foundry.
- A target project with `.foundry/project.yaml` for `plan` and `doctor`.

## Install for local development

From the SaaS Foundry checkout:

```bash
npm install
npm link
foundry --help
```

Or invoke without linking:

```bash
node bin/foundry.js --help
```

## Scan

```bash
foundry scan ../ia-chat
foundry scan ../ia-chat --format json --out /tmp/ia-chat-scan.json
```

The scanner inventories file paths and sizes, reads package manifests, and reads selected project documentation. It does not read arbitrary source-code bodies.

It skips dependency/build folders, symlinks, hidden Foundry state, files with sensitive names, and common secret/database/export patterns. It never reads `.env*`, private keys, production databases, message bodies, patient data, attachments or raw logs. The scan output records the exclusions and limitations.

The scanner detects repository signals; it cannot prove that a dependency is configured, a route works, a payment is live, a test passes, or a feature is used by customers.

## Plan

```bash
foundry plan ../ia-chat
foundry plan ../ia-chat --scan /tmp/ia-chat-scan.json --format json --out /tmp/ia-chat-plan.json
```

The planner combines the project manifest, module registry and scanner signals. Explicit manifest decisions take precedence. Dependencies are checked; a recommended module with an unresolved dependency is marked blocked.

The planner does not install skills, write files, call an LLM, contact customers, publish content or spend money. Unclassified modules remain owner decisions.

## Doctor

```bash
foundry doctor ../ia-chat
foundry doctor ../ia-chat --strict
```

Doctor checks required manifest fields, known module IDs, duplicate classifications and module dependencies. `--strict` also returns a failing exit code when warnings exist.

## Output

- Markdown is the default for scan and plan.
- JSON is available with `--format json`.
- `--out` writes the report to the requested path. It does not modify the target project unless the output path is deliberately placed there.

## Current limitations

- No automatic module installation or project mutation.
- No source-code semantic analysis or runtime verification.
- No automatic discovery of the Foundry checkout; use `--foundry <path>` if running the CLI outside this repository.
- No generated scan history or freshness cache yet.
- No JSON Schema engine; doctor currently validates the core manifest contract and module references directly.
- No tests were run against a production project or production data.
