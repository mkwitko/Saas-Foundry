import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildDependencyPlan, verifyDefinitionOfDone } from "../src/planner.js";

const registry = { modules: [
  { id: "research", group: "strategy", requires: [] },
  { id: "positioning", group: "strategy", requires: ["research"] },
  { id: "landing", group: "growth", requires: ["positioning"] }
] };

test("dependency sequence expands and orders transitive prerequisites once", () => {
  const plan = buildDependencyPlan({ registry, requested: ["landing", "positioning"] });
  assert.deepEqual(plan.execution_order.map(item => item.id), ["research", "positioning", "landing"]);
  assert.equal(plan.ready, true);
});

test("dependency sequence respects satisfied modules and reports blocked dependencies", () => {
  const plan = buildDependencyPlan({ registry, requested: ["landing"], completed: ["research"], statuses: { positioning: "blocked" } });
  assert.deepEqual(plan.execution_order, []);
  assert.equal(plan.ready, false);
  assert.equal(plan.blocked[0].dependency, "positioning");
});

test("dependency sequence rejects unknown modules and cycles", () => {
  assert.throws(() => buildDependencyPlan({ registry, requested: ["missing"] }), /Unknown module/);
  const cyclic = { modules: [{ id: "a", requires: ["b"] }, { id: "b", requires: ["a"] }] };
  assert.throws(() => buildDependencyPlan({ registry: cyclic, requested: ["a"] }), /cycle/i);
});

test("definition of done requires evidence, artifacts, checks and reversal path", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-dod-"));
  try {
    fs.mkdirSync(path.join(root, ".foundry"));
    fs.writeFileSync(path.join(root, ".foundry/acceptance.yaml"), `schema_version: "0.1"
modules:
  - id: product-design
    outcome: "Booking flow is usable on mobile"
    evidence: "Playwright run and manual review on 360px viewport"
    artifacts: ["src/booking/BookingPage.tsx"]
    checks:
      - name: "unit tests"
        result: passed
      - name: "mobile flow"
        result: passed
    risks: ["Calendar provider rate limits"]
    rollback: "Revert commit abc123"
    next_action: "Monitor pilot booking completion"
    owner: "founder"
`);
    const report = verifyDefinitionOfDone(root, { requiredModules: ["product-design", "analytics"] });
    assert.equal(report.valid, false);
    assert.deepEqual(report.missing_modules, ["analytics"]);
    assert.equal(report.modules[0].done, true);
    fs.writeFileSync(path.join(root, ".foundry/acceptance.yaml"), fs.readFileSync(path.join(root, ".foundry/acceptance.yaml"), "utf8").replace("result: passed\n      - name: \"mobile flow\"\n        result: passed", "result: not_run\n      - name: \"mobile flow\"\n        result: passed"));
    const pending = verifyDefinitionOfDone(root, { requiredModules: ["product-design"] });
    assert.equal(pending.valid, false);
    assert.deepEqual(pending.modules[0].pending_checks, ["unit tests"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("missing acceptance ledger is an explicit incomplete result", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-dod-missing-"));
  try {
    const report = verifyDefinitionOfDone(root, { requiredModules: ["sales-pipeline"] });
    assert.equal(report.missing_file, true);
    assert.deepEqual(report.missing_modules, ["sales-pipeline"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
