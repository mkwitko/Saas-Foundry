# SaaS Foundry CLI v0.4 — resource lifecycle

v0.4 adds a local, provenance-pinned lifecycle for installing reviewed text-based skills, templates, workflows and playbooks from a Git checkout.

## Commands

List catalog entries:

```bash
foundry resources
```

Preview an install (no files are written):

```bash
foundry install ../ia-chat \
  --resource impeccable \
  --from /path/to/impeccable-checkout \
  --source-path . \
  --commit <40-character-reviewed-commit> \
  --license <reviewed-license-id> \
  --target .agents/skills/impeccable \
  --reviewed
```

Execute only after reviewing the file list, hashes, license and source:

```bash
foundry install ../ia-chat --resource impeccable --from /path/to/impeccable-checkout \
  --commit <sha> --license MIT --target .agents/skills/impeccable --reviewed --execute
```

Inspect local drift:

```bash
foundry drift ../ia-chat
foundry drift ../ia-chat --resource impeccable
```

Preview and execute an update from a newer reviewed checkout:

```bash
foundry update ../ia-chat --resource impeccable --from /path/to/new-checkout \
  --commit <new-sha> --license MIT --reviewed
foundry update ../ia-chat --resource impeccable --from /path/to/new-checkout \
  --commit <new-sha> --license MIT --reviewed --execute
```

Preview and execute rollback of the last update:

```bash
foundry rollback-resource ../ia-chat --resource impeccable
foundry rollback-resource ../ia-chat --resource impeccable --execute
```

Uninstall only a clean, unchanged resource:

```bash
foundry uninstall ../ia-chat --resource impeccable
foundry uninstall ../ia-chat --resource impeccable --execute
```

## Provenance and lockfile

Successful installs create `.foundry/resources.lock.yaml`. Each entry records:
- catalog ID and resource type;
- canonical source URL and Git origin;
- exact 40-character source commit and selected source path;
- destination adapter path;
- explicit license attestation and human-review flag;
- script-review flag, per-file SHA-256 hashes and byte sizes;
- install timestamp.

The lockfile is the ownership boundary for drift, update, rollback and uninstall. Files not listed in it are never considered Foundry-owned.

## Supported artifact adapters

Install destinations are restricted to:
- `.foundry/resources/<resource-id>/` — quarantined project-local copy, not auto-loaded by an agent;
- `.agents/skills/<resource-id>/`;
- `.claude/skills/<resource-id>/`;
- `.opencode/skills/<resource-id>/`;
- `.codex/skills/<resource-id>/`.

The default is the quarantined `.foundry/resources/<resource-id>/`. Choose an agent adapter only when you intend that agent to discover the resource.

Only catalog types `skill`, `skill_collection`, `template`, `workflow`, and `playbook_collection` are installable. Datasets, directories, integrations and vendor products remain reference-only.

## Review and safety requirements

- The operator must supply `--reviewed` and an explicit `--license` attestation. This is a human assertion, not automated legal advice.
- Git origin must match the catalog source, and `--commit` must equal the checkout's exact HEAD.
- Default install accepts text files only, at most 200 files and 2 MiB total, with each file at most 512 KiB.
- Symlinks, binary files, unsupported extensions, path traversal and writes outside approved adapter roots are rejected.
- Script-like files (`.js`, `.ts`, `.py`, `.sh`) are blocked unless `--allow-scripts` is supplied after review. Files are copied, never executed by Foundry.
- Install, update, uninstall and update rollback are dry-run by default. `--execute` is required for writes.
- Existing files are never overwritten during initial installation.
- Update is allowed only when installed files match the previous lock. The prior snapshot is retained under `.foundry/resource-history/`.
- Drift blocks update, rollback and uninstall. Reconcile local changes manually before proceeding.
- Uninstall removes only unchanged files recorded in the lock. Untracked and modified files are preserved.
- Foundry does not fetch remote repositories, install packages, invoke external APIs, edit project instruction files, publish, message customers, spend money or deploy.

## Limits

v0.4 uses a local Git checkout supplied by the operator; it does not clone or download upstream repositories. It validates Git origin and commit, but it cannot independently certify the publisher's identity, license interpretation, security, or suitability. The human reviewer remains responsible for inspecting the source before attesting `--reviewed`.
