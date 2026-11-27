import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { fileURLToPath } from "node:url";
import { FOUNDRY_TASKS, buildWorkflowPrompt, agentArgs } from "../src/run.js";
import { initializeProject } from "../src/init.js";

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
