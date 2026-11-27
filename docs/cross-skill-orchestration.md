# Cross-skill orchestration

The artifact registry is now executable as a read-only impact and freshness engine.

## Commands

```bash
foundry artifacts validate <project-path>
foundry artifacts status <project-path> [--format json|md]
foundry artifacts plan <project-path> --changed <artifact-id[,artifact-id...]>
```

- `validate` checks schema version, unique IDs, known contracts, safe repository-relative paths, known dependencies and dependency cycles.
- `status` checks whether canonical files exist, whether review intervals have expired, and whether upstream dependencies make a downstream artifact stale.
- `plan` walks transitive artifact dependencies and produces the capability handoffs affected by a proposed change.

## Operating contract

The engine is deliberately read-only. It does not edit canonical documents, change registry status, create tasks in external systems, send notifications, or approve owner-controlled changes. The Foundry agent reads the impact plan, prepares proposals, and follows each artifact's change policy. The artifact owner remains authoritative.

A stale dependency is a review trigger, not proof that the dependent document is wrong. Revalidate only the affected outputs and preserve the existing decision/evidence history.
