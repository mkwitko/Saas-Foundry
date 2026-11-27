import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/init.js";

test("init bootstraps an empty greenfield project with a project-local Claude skill and shared artifact contracts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-new-"));
  try {
    const result = initializeProject({ projectPath: root });
    assert.equal(result.project_mode, "new");
    assert.equal(fs.existsSync(path.join(root, ".claude/skills/foundry-run/SKILL.md")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/state.yaml")), true);
    assert.match(fs.readFileSync(path.join(root, ".foundry/state.yaml"), "utf8"), /project_mode: new/);
    assert.equal(fs.existsSync(path.join(root, ".foundry/artifacts.yaml")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/artifact-contracts.yaml")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/artifacts.schema.json")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/shared-knowledge-and-artifact-contracts.md")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/revenue/pipeline.yaml")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/revenue-pipeline.schema.json")), true);
    const artifactSchema = JSON.parse(fs.readFileSync(path.join(root, ".foundry/artifacts.schema.json"), "utf8"));
    assert.equal(artifactSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
    const registry = fs.readFileSync(path.join(root, ".foundry/artifacts.yaml"), "utf8");
    assert.match(registry, /id: icp-and-buyer/);
    assert.match(registry, /id: design-system-and-ux/);
    assert.match(registry, /path: null/);
    assert.match(fs.readFileSync(path.join(root, ".foundry/README.md"), "utf8"), /Shared artifact registry/);
    assert.ok(result.results.some(item => item.path.endsWith(".foundry/artifacts.yaml") && item.status === "created"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("init detects existing projects and preserves user-owned files and artifact registries", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-existing-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), '{"name":"existing-app"}\n');
    fs.mkdirSync(path.join(root, ".claude/skills/foundry-run"), { recursive: true });
    fs.writeFileSync(path.join(root, ".claude/skills/foundry-run/SKILL.md"), "user-owned skill\n");
    fs.mkdirSync(path.join(root, ".foundry"), { recursive: true });
    fs.writeFileSync(path.join(root, ".foundry/state.yaml"), "owner_state: keep\n");
    fs.writeFileSync(path.join(root, ".foundry/artifacts.yaml"), "owner_artifacts: keep\n");
    fs.writeFileSync(path.join(root, ".foundry/artifact-contracts.yaml"), "owner_contracts: keep\n");
    fs.writeFileSync(path.join(root, ".foundry/artifacts.schema.json"), "{\\\"owner\\\":true}\\n");
    fs.writeFileSync(path.join(root, ".foundry/shared-knowledge-and-artifact-contracts.md"), "owner_guide: keep\n");
    const result = initializeProject({ projectPath: root });
    assert.equal(result.project_mode, "existing");
    assert.equal(fs.readFileSync(path.join(root, ".claude/skills/foundry-run/SKILL.md"), "utf8"), "user-owned skill\n");
    assert.equal(fs.readFileSync(path.join(root, ".foundry/state.yaml"), "utf8"), "owner_state: keep\n");
    assert.equal(fs.readFileSync(path.join(root, ".foundry/artifacts.yaml"), "utf8"), "owner_artifacts: keep\n");
    assert.equal(fs.readFileSync(path.join(root, ".foundry/artifact-contracts.yaml"), "utf8"), "owner_contracts: keep\n");
    assert.equal(fs.readFileSync(path.join(root, ".foundry/artifacts.schema.json"), "utf8"), "{\\\"owner\\\":true}\\n");
    assert.equal(fs.readFileSync(path.join(root, ".foundry/shared-knowledge-and-artifact-contracts.md"), "utf8"), "owner_guide: keep\n");
    assert.ok(result.results.every(item => item.status === "preserved" || item.status === "created"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("init supports Codex and OpenCode skill locations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-agents-"));
  try {
    initializeProject({ projectPath: root, agent: "all", mode: "new" });
    for (const relative of [
      ".claude/skills/foundry-run/SKILL.md",
      ".agents/skills/foundry-run/SKILL.md",
      ".opencode/skills/foundry-run/SKILL.md"
    ]) assert.ok(fs.existsSync(path.join(root, relative)), relative);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
