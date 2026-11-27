# Continuous improvement engine

Run a repeatable learning cycle from the project's existing evidence ledger and optional sanitized customer-intelligence aggregate:

```bash
foundry improve report .
foundry improve report . --input ./exports/sanitized-summary.json --format md
```

The report checks:
- claims whose review interval expired or whose status is already stale;
- accepted decisions whose review date has arrived;
- completed experiments missing a result or explicit decision;
- running experiments that exceeded the configured observation window;
- active/proposed work and the next highest-value learning action.

When sanitized customer intelligence is supplied, the engine can draft (not launch) a small experiment around a reported support or feedback issue. Baselines remain explicitly unknown until measured. The engine does not infer causality, statistical significance, churn probability or customer sentiment from raw text.

## Weekly cycle

1. Collect privacy-safe aggregates and real customer evidence.
2. Validate source, cohort, time window, denominator and evidence class.
3. Close completed experiments with result and keep/change/stop/investigate decision.
4. Revalidate stale claims and review due decisions.
5. Select one improvement hypothesis, owner, metric, baseline, guardrails and observation window.
6. Obtain approval for outreach or production changes.
7. Measure the result, preserve limitations, and update the evidence ledger.

The CLI is read-only. It produces a prioritized review and draft experiment; it does not edit the ledger or contact customers.
