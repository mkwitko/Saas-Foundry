import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { initializeProject } from "../src/init.js";
import { buildWorkflowPrompt, runFoundry } from "../src/run.js";

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
