import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { fileURLToPath } from "node:url";
import { FOUNDRY_TASKS, buildWorkflowPrompt, agentArgs } from "../src/run.js";
import { initializeProject } from "../src/init.js";
import { initializeVisualAudit, readVisualAuditConfig, readVisualAuditReport } from "../src/visual-audit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("workflow routing covers every module exactly once and references known resources", () => {
  const modules = parseYaml(fs.readFileSync(path.join(root, "catalog/modules.yaml"), "utf8")).modules;
  const resources = parseYaml(fs.readFileSync(path.join(root, "catalog/resources.yaml"), "utf8")).resources;
  const routing = parseYaml(fs.readFileSync(path.join(root, "catalog/workflow-routing.yaml"), "utf8"));
  const moduleIds = new Set(modules.map(item => item.id));
  const resourceIds = new Set(resources.map(item => item.id));
  const routed = routing.routes.map(item => item.module);
  assert.equal(new Set(routed).size, routed.length, "each module must have one route");
  assert.deepEqual([...routed].sort(), [...moduleIds].sort(), "routing must cover the complete module catalogue");
  for (const route of routing.routes) {
    for (const resource of [...(route.primary ?? []), ...(route.supporting ?? [])]) {
      assert.ok(resourceIds.has(resource), route.module + " references unknown resource " + resource);
    }
  }
});

test("task profiles are explicit and build scoped prompts", () => {
  assert.deepEqual(Object.keys(FOUNDRY_TASKS), ["auto", "full", "idea", "product", "sales", "growth", "review"]);
  for (const task of Object.keys(FOUNDRY_TASKS)) {
    const prompt = buildWorkflowPrompt(task);
    assert.ok(prompt.includes("Selected task: " + task));
    assert.ok(prompt.includes(".foundry/state.yaml"));
    assert.ok(prompt.includes(".foundry/workflow-routing.yaml"));
    assert.ok(prompt.includes(".foundry/evidence.yaml"));
  }
  assert.throws(() => buildWorkflowPrompt("unknown"), /task must be one of/);
  assert.deepEqual(agentArgs("opencode", "prompt"), ["mini", "--prompt", "prompt"]);
});

test("bootstrap installs routing and state contracts without overwriting project files", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-operator-"));
  try {
    fs.writeFileSync(path.join(projectRoot, "README.md"), "Project-owned README\n");
    const result = initializeProject({ projectPath: projectRoot, mode: "existing", agent: "claude" });
    assert.ok(result.results.some(item => item.path.endsWith(".foundry/workflow-routing.yaml") && item.status === "created"));
    assert.ok(fs.existsSync(path.join(projectRoot, ".foundry/state.schema.json")));
    assert.ok(fs.existsSync(path.join(projectRoot, ".foundry/evidence-ledger.schema.json")));
    assert.ok(fs.existsSync(path.join(projectRoot, ".foundry/acceptance.yaml")));
    assert.ok(fs.existsSync(path.join(projectRoot, ".foundry/acceptance.schema.json")));
    assert.deepEqual(parseYaml(fs.readFileSync(path.join(projectRoot, ".foundry/acceptance.yaml"), "utf8")), { schema_version: "0.1", modules: [] });
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(projectRoot, ".foundry/acceptance.schema.json"), "utf8")));
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(projectRoot, ".foundry/evidence-ledger.schema.json"), "utf8")));
    const evidence = parseYaml(fs.readFileSync(path.join(projectRoot, ".foundry/evidence.yaml"), "utf8"));
    assert.equal(evidence.schema_version, "0.1");
    assert.ok(evidence.updated_at);
    assert.deepEqual(evidence.claims, []);
    assert.deepEqual(evidence.decisions, []);
    assert.deepEqual(evidence.experiments, []);
    assert.ok(fs.existsSync(path.join(projectRoot, ".foundry/workflow-routing.yaml")));
    const state = parseYaml(fs.readFileSync(path.join(projectRoot, ".foundry/state.yaml"), "utf8"));
    assert.equal(state.schema_version, "0.1");
    assert.equal(state.project_mode, "existing");
    assert.equal(state.status, "ready");
    assert.equal(state.next_action.owner, "agent");
    assert.equal(fs.readFileSync(path.join(projectRoot, "README.md"), "utf8"), "Project-owned README\n");
    const rerun = initializeProject({ projectPath: projectRoot, mode: "existing", agent: "claude" });
    assert.ok(rerun.results.some(item => item.path.endsWith(".foundry/state.yaml") && item.status === "preserved"));
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("visual audit bootstrap creates portable Playwright files without overwriting project config", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-visual-"));
  try {
    const result = initializeVisualAudit(projectRoot, { baseURL: "http://127.0.0.1:4173" });
    assert.equal(result.results.length, 3);
    assert.ok(result.results.every(item => item.status === "created"));
    const configPath = path.join(projectRoot, ".foundry/visual-audit/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    assert.equal(config.baseURL, "http://127.0.0.1:4173");
    assert.deepEqual(config.viewports.map(item => item.name), ["mobile", "tablet", "desktop"]);\n    assert.equal(readVisualAuditConfig(projectRoot).allowRemote, false);
    const specPath = path.join(projectRoot, ".foundry/visual-audit/visual-audit.spec.cjs");
    const configJsPath = path.join(projectRoot, ".foundry/visual-audit/playwright.config.cjs");
    assert.equal(spawnSync(process.execPath, ["--check", specPath]).status, 0);
    assert.equal(spawnSync(process.execPath, ["--check", configJsPath]).status, 0);
    fs.writeFileSync(configPath, '{"project_owned":true}\n');
    const rerun = initializeVisualAudit(projectRoot);
    assert.ok(rerun.results.every(item => item.status === "preserved"));
    assert.equal(fs.readFileSync(configPath, "utf8"), '{"project_owned":true}\n');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("visual audit report summarizes pass fail skip and flaky outcomes", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-visual-report-"));
  try {
    const reportDir = path.join(projectRoot, ".foundry/reports");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "visual-audit.playwright.json"), JSON.stringify({
      stats: { startTime: "2026-11-27T00:00:00.000Z" },
      suites: [{ title: "visual-audit.spec.cjs", specs: [
        { title: "home responsive: mobile", tests: [{ results: [{ status: "passed", duration: 100 }] }] },
        { title: "home responsive: tablet", tests: [{ results: [{ status: "failed", duration: 80 }] }] },
        { title: "home accessibility", tests: [{ results: [{ status: "skipped", duration: 0 }] }] },
        { title: "home responsive: desktop", tests: [{ results: [{ status: "failed" }, { status: "passed", duration: 150 }] }] }
      ] }]
    }));
    const report = readVisualAuditReport(projectRoot);
    assert.deepEqual(report.summary, { total: 4, passed: 2, failed: 1, skipped: 1, flaky: 1 });
    assert.equal(report.tests[3].flaky, true);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("visual audit report clearly reports when no browser run exists", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-visual-empty-"));
  try {
    const report = readVisualAuditReport(projectRoot);
    assert.equal(report.available, false);
    assert.equal(report.summary.total, 0);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("visual audit rejects remote URLs and unsafe route definitions by default", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-visual-safety-"));
  try {
    initializeVisualAudit(projectRoot);
    const configPath = path.join(projectRoot, ".foundry/visual-audit/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config.baseURL = "https://production.example.com";
    fs.writeFileSync(configPath, JSON.stringify(config));
    assert.throws(() => readVisualAuditConfig(projectRoot), /Remote visual audits are disabled/);
    config.allowRemote = true;
    config.baseURL = "https://staging.example.com";
    config.routes[0].path = "//attacker.example";
    fs.writeFileSync(configPath, JSON.stringify(config));
    assert.throws(() => readVisualAuditConfig(projectRoot), /path beginning with a single/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
