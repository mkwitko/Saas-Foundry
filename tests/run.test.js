import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { initializeProject } from "../src/init.js";
import { buildWorkflowPrompt, getFoundryStatus, listFoundryRuns, runFoundry } from "../src/run.js";

test("review task is read-only and does not bootstrap or write project state", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-review-"));
  try {
    fs.writeFileSync(path.join(projectRoot, "README.md"), "Existing product\n");
    const result = await runFoundry({ target: projectRoot, task: "review", launch: false });
    assert.equal(result.initialized, null);
    assert.equal(fs.existsSync(path.join(projectRoot, ".foundry")), false);
    const prompt = buildWorkflowPrompt("review");
    assert.match(prompt, /strict read-only run/i);
    assert.match(prompt, /Do not write a run report/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("writable runs persist lifecycle metadata and a run receipt", { skip: process.platform === "win32" }, async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-run-"));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-agent-"));
  const previousPath = process.env.PATH;
  try {
    initializeProject({ projectPath: projectRoot, mode: "new", agent: "claude" });
    const fakeAgent = path.join(bin, "claude");
    fs.writeFileSync(fakeAgent, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    fs.chmodSync(fakeAgent, 0o700);
    process.env.PATH = bin + path.delimiter + previousPath;
    const result = await runFoundry({ target: projectRoot, mode: "existing", agent: "claude", task: "product" });
    assert.equal(result.launched, true);
    assert.equal(result.exit_code, 0);
    assert.equal(result.run_report.outcome, "completed");
    assert.ok(result.run_report.run_id);
    const state = parseYaml(fs.readFileSync(path.join(projectRoot, ".foundry/state.yaml"), "utf8"));
    assert.equal(state.status, "completed");
    assert.equal(state.selected_task, "product");
    assert.equal(state.last_run.status, "completed");
    assert.equal(state.last_run.exit_code, 0);
    const receipt = path.join(projectRoot, ".foundry/runs", state.last_run.run_id + ".json");
    assert.ok(fs.existsSync(receipt));
    assert.equal(JSON.parse(fs.readFileSync(receipt, "utf8")).outcome, "completed");
  } finally {
    process.env.PATH = previousPath;
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});


test("runner prevents overlapping writable executions", { skip: process.platform === "win32" }, async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-concurrent-"));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-agent-"));
  const previousPath = process.env.PATH;
  try {
    initializeProject({ projectPath: projectRoot, mode: "new", agent: "claude" });
    const fakeAgent = path.join(bin, "claude");
    fs.writeFileSync(fakeAgent, "#!/bin/sh\nsleep 1\nexit 0\n", { mode: 0o700 });
    fs.chmodSync(fakeAgent, 0o700);
    process.env.PATH = bin + path.delimiter + (previousPath ?? "");
    const firstRun = runFoundry({ target: projectRoot, mode: "existing", agent: "claude", task: "product" });
    await assert.rejects(
      runFoundry({ target: projectRoot, mode: "existing", agent: "claude", task: "sales" }),
      /already active/
    );
    const result = await firstRun;
    assert.equal(result.exit_code, 0);
    const state = parseYaml(fs.readFileSync(path.join(projectRoot, ".foundry/state.yaml"), "utf8"));
    assert.equal(state.selected_task, "product");
    assert.equal(state.last_run.status, "completed");
  } finally {
    process.env.PATH = previousPath;
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});


test("failed agent exits become blocked runs with an inspectable receipt", { skip: process.platform === "win32" }, async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-failed-"));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-agent-"));
  const previousPath = process.env.PATH;
  try {
    initializeProject({ projectPath: projectRoot, mode: "new", agent: "claude" });
    const fakeAgent = path.join(bin, "claude");
    fs.writeFileSync(fakeAgent, "#!/bin/sh\nexit 7\n", { mode: 0o700 });
    fs.chmodSync(fakeAgent, 0o700);
    process.env.PATH = bin + path.delimiter + (previousPath ?? "");
    const result = await runFoundry({ target: projectRoot, mode: "existing", agent: "claude", task: "sales" });
    assert.equal(result.exit_code, 7);
    assert.equal(result.run_report.outcome, "failed");
    const state = parseYaml(fs.readFileSync(path.join(projectRoot, ".foundry/state.yaml"), "utf8"));
    assert.equal(state.status, "blocked");
    assert.equal(state.last_run.status, "failed");
    assert.equal(state.last_run.exit_code, 7);
  } finally {
    process.env.PATH = previousPath;
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});

test("invalid persistent state is preserved and blocks a writable run", { skip: process.platform === "win32" }, async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-invalid-state-"));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-agent-"));
  const previousPath = process.env.PATH;
  try {
    const fakeAgent = path.join(bin, "claude");
    fs.writeFileSync(fakeAgent, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    fs.chmodSync(fakeAgent, 0o700);
    process.env.PATH = bin + path.delimiter + (previousPath ?? "");
    fs.mkdirSync(path.join(projectRoot, ".foundry"), { recursive: true });
    const statePath = path.join(projectRoot, ".foundry/state.yaml");
    const original = "schema_version: 99\nworkflow: unknown\n";
    fs.writeFileSync(statePath, original);
    await assert.rejects(
      runFoundry({ target: projectRoot, task: "product", launch: true }),
      /Unsupported .foundry\/state.yaml contract/
    );
    assert.equal(fs.readFileSync(statePath, "utf8"), original);
  } finally {
    process.env.PATH = previousPath;
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});


test("status and run history expose concise, read-only project progress", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-status-"));
  try {
    initializeProject({ projectPath: projectRoot, mode: "new", agent: "claude" });
    const status = getFoundryStatus(projectRoot);
    assert.equal(status.status, "ready");
    assert.equal(status.project_mode, "new");
    assert.deepEqual(listFoundryRuns(projectRoot), []);
    assert.throws(() => listFoundryRuns(projectRoot, 101), /1 to 100/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});


test("project status calculates evidence freshness from checked date and review interval", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-evidence-status-"));
  try {
    initializeProject({ projectPath: projectRoot, mode: "new", agent: "claude" });
    const ledger = `schema_version: "0.1"
updated_at: "2026-01-01T00:00:00.000Z"
claims:
  - id: competitor-price-1
    claim: "Competitor plan price is $49 per month"
    evidence_class: E3
    status: current
    source_type: web
    source: "https://example.com/pricing"
    checked_at: "2026-01-01T00:00:00.000Z"
    confidence: high
    limitations: []
    review_after_days: 30
decisions: []
experiments: []
`;
    fs.writeFileSync(path.join(projectRoot, ".foundry/evidence.yaml"), ledger);
    const status = getFoundryStatus(projectRoot);
    assert.equal(status.evidence.total_claims, 1);
    assert.equal(status.evidence.stale_claims.length, 1);
    assert.equal(status.evidence.stale_claims[0].id, "competitor-price-1");
    assert.equal(status.evidence.current_claims, 0);
    assert.equal(status.evidence.unvalidated_claims, 0);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});


test("next run preserves an interrupted run receipt before continuing", { skip: process.platform === "win32" }, async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-interrupted-"));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-agent-"));
  const previousPath = process.env.PATH;
  const interruptedId = "00000000-0000-4000-8000-000000000001";
  try {
    initializeProject({ projectPath: projectRoot, mode: "new", agent: "claude" });
    const statePath = path.join(projectRoot, ".foundry/state.yaml");
    const state = parseYaml(fs.readFileSync(statePath, "utf8"));
    state.status = "running";
    state.last_run = {
      run_id: interruptedId,
      started_at: "2026-01-01T00:00:00.000Z",
      status: "running",
      task: "product",
      agent: "claude",
      runner_pid: 999999999,
      branch: null,
      commit: null,
      summary_path: ".foundry/runs/" + interruptedId + ".json",
      modules_selected: ["product-design"],
      modules_completed: [],
      blockers: []
    };
    fs.writeFileSync(statePath, stringifyYaml(state));
    const fakeAgent = path.join(bin, "claude");
    fs.writeFileSync(fakeAgent, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    fs.chmodSync(fakeAgent, 0o700);
    process.env.PATH = bin + path.delimiter + (previousPath ?? "");
    const result = await runFoundry({ target: projectRoot, mode: "existing", agent: "claude", task: "auto" });
    assert.equal(result.exit_code, 0);
    const oldReceiptPath = path.join(projectRoot, ".foundry/runs", interruptedId + ".json");
    const oldReceipt = JSON.parse(fs.readFileSync(oldReceiptPath, "utf8"));
    assert.equal(oldReceipt.outcome, "failed");
    assert.ok(oldReceipt.blockers.some(item => item.includes("Previous CLI process ended")));
    const finalState = parseYaml(fs.readFileSync(statePath, "utf8"));
    assert.notEqual(finalState.last_run.run_id, interruptedId);
    assert.equal(finalState.last_run.status, "completed");
  } finally {
    process.env.PATH = previousPath;
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});
