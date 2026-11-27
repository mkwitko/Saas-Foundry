import test from "node:test";
import assert from "node:assert/strict";
import { buildImprovementReport } from "../src/continuous-improvement.js";

const now = new Date("2026-11-27T12:00:00.000Z");
const baseLedger = () => ({
  claims: [],
  decisions: [],
  experiments: []
});

test("prioritizes closing completed experiments missing an explicit result or decision", () => {
  const ledger = baseLedger();
  ledger.experiments.push({ id: "exp-1", hypothesis: "Test onboarding", status: "completed", owner: "founder", result: null, decision: null });
  const report = buildImprovementReport({ ledger, now });
  assert.equal(report.next_action.type, "complete_experiment_record");
  assert.deepEqual(report.next_action.items, ["exp-1"]);
});

test("detects overdue experiments and stale evidence with stable priority ordering", () => {
  const ledger = baseLedger();
  ledger.experiments.push({ id: "exp-1", hypothesis: "Improve activation", status: "running", owner: "founder", started_at: "2026-10-01T00:00:00.000Z" });
  ledger.claims.push({ id: "claim-1", claim: "Old pricing", status: "current", checked_at: "2026-01-01T00:00:00.000Z", review_after_days: 30 });
  const report = buildImprovementReport({ ledger, now });
  assert.equal(report.next_action.type, "review_overdue_experiments");
  assert.equal(report.summary.stale_claims, 1);
  assert.equal(report.summary.overdue_experiments, 1);
});

test("flags accepted decisions whose review date has arrived", () => {
  const ledger = baseLedger();
  ledger.decisions.push({ id: "decision-1", decision: "Keep current plan", status: "accepted", owner: "founder", review_on: "2026-11-01", evidence_ids: ["claim-1"] });
  const report = buildImprovementReport({ ledger, now });
  assert.equal(report.next_action.type, "review_decisions");
  assert.deepEqual(report.next_action.items, ["decision-1"]);
});

test("drafts an experiment from sanitized customer issues without inventing a baseline", () => {
  const ledger = baseLedger();
  const customerIntelligence = { priority_issues: [{ category: "booking confusion", affected_accounts: 2, priority: 3, summary: "Customers are unsure whether booking is confirmed." }] };
  const report = buildImprovementReport({ ledger, customerIntelligence, now });
  assert.equal(report.next_action.type, "design_customer_experiment");
  assert.equal(report.next_action.affected_accounts, 2);
  assert.equal(report.next_action.proposed_experiment.baseline, "unknown_until_measured");
  assert.match(report.next_action.proposed_experiment.hypothesis, /booking confusion/);
});

test("uses proposed experiments only after evidence and decision work is clear", () => {
  const ledger = baseLedger();
  ledger.experiments.push({ id: "exp-1", hypothesis: "Improve time to value", status: "proposed", owner: "founder" });
  const report = buildImprovementReport({ ledger, now });
  assert.equal(report.next_action.type, "select_experiment");
});

test("rejects malformed ledgers and invalid observation windows", () => {
  assert.throws(() => buildImprovementReport({ ledger: { claims: [] }, now }), /arrays/);
  assert.throws(() => buildImprovementReport({ ledger: baseLedger(), now, runningExperimentDays: 0 }), /positive integer/);
});
