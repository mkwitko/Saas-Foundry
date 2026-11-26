import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { buildEvidenceReport, diffScans, selectModules, buildAgentContext, buildApplyPlan, executeApplyPlan, rollbackAppliedModule } from "../src/v3.js";

const registry = parseYaml(fs.readFileSync(new URL("../catalog/modules.yaml", import.meta.url), "utf8"));
const manifest = {
  project: { id: "sample", name: "Sample", stage: "pilot" },
  business: { current_bottleneck: "sales" },
  modules: { already_satisfied: ["positioning-and-offer"], enabled: ["sales-pipeline"] }
};
const scan = (files, signals = {}, scanned_at = "2026-11-20T12:00:00.000Z") => ({
  scanner_version: "0.2.0", scanned_at, root: "/tmp/sample",
  inventory: files.map(p => ({ path: p, size: 1, ext: path.extname(p) })),
  signals,
  evidence: [{ capability: "analytics", status: signals.analytics ? "present" : "unknown", evidence: signals.analytics ? ["package.json", "docs/metrics.md"] : [] }]
});

test("evidence report scores confidence and freshness without claiming runtime proof", () => {
  const report = buildEvidenceReport(scan(["package.json"], { analytics: true }), new Date("2026-11-26T12:00:00Z"));
  assert.equal(report.items[0].confidence, "high");
  assert.equal(report.freshness.status, "fresh");
  assert.match(report.policy, /not proof of production use/);
});

test("scan diff reports file, signal and evidence changes", () => {
  const diff = diffScans(scan(["README.md"], { analytics: false }), scan(["README.md", "src/app.ts"], { analytics: true }));
  assert.deepEqual(diff.files.added, ["src/app.ts"]);
  assert.equal(diff.summary.signals_changed, 1);
  assert.equal(diff.summary.evidence_changed, 1);
});

test("smart selection respects explicit decisions and founder capacity", () => {
  const result = selectModules(manifest, registry, scan(["README.md"], {}), { bottleneck: "sales", capacity: "low" });
  assert.ok(result.selected.some(x => x.id === "sales-pipeline"));
  assert.ok(result.selected.length <= 2);
  assert.equal(result.policy.includes("not authorization"), true);
});

test("apply is dry-run by default, creates only generated runbooks, and rollback checks hashes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-v3-"));
  fs.mkdirSync(path.join(root, ".foundry"), { recursive: true });
  try {
    const plan = buildApplyPlan(root, ["sales-pipeline"], registry);
    assert.equal(plan.mode, "dry_run");
    assert.equal(plan.modules[0].action, "create");
    assert.equal(fs.existsSync(path.join(root, plan.modules[0].path)), false);
    const result = executeApplyPlan(plan);
    assert.equal(result.applied.length, 1);
    const rollback = rollbackAppliedModule(root, "sales-pipeline");
    assert.equal(rollback.preserved_modified_files, true);
    assert.equal(fs.existsSync(path.join(root, plan.modules[0].path)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("apply refuses to overwrite a pre-existing runbook", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-v3-conflict-"));
  const target = path.join(root, ".foundry/modules/sales-pipeline/README.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "user content");
  try {
    const plan = buildApplyPlan(root, ["sales-pipeline"], registry);
    assert.equal(plan.safe, false);
    assert.equal(plan.modules[0].action, "conflict");
    assert.throws(() => executeApplyPlan(plan), /conflicts/);
    assert.equal(fs.readFileSync(target, "utf8"), "user content");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("agent context is compact, agent-neutral and includes operating guardrails", () => {
  const result = selectModules(manifest, registry, scan(["README.md"], {}), { bottleneck: "Real buyer proof and demos", capacity: "medium" });
  const context = buildAgentContext(manifest, scan(["README.md"], {}), result);
  assert.equal(context.context_version, "0.3.0");
  assert.ok(context.recommended_modules.some(x => x.id === "sales-pipeline"));
  assert.ok(context.operating_rules.some(x => x.includes("explicit human approval")));
  assert.equal(JSON.stringify(context).includes("patient_message_body"), false);
});

test("apply rejects symlinked artifact directories", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-v3-symlink-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-v3-outside-"));
  fs.mkdirSync(path.join(root, ".foundry"), { recursive: true });
  try {
    fs.symlinkSync(outside, path.join(root, ".foundry", "modules"), "dir");
    assert.throws(() => buildApplyPlan(root, ["sales-pipeline"], registry), /symlink/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
