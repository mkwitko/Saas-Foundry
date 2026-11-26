import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/init.js";

test("init bootstraps an empty greenfield project with a project-local Claude skill", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-new-"));
  try {
    const result = initializeProject({ projectPath: root });
    assert.equal(result.project_mode, "new");
    assert.equal(fs.existsSync(path.join(root, ".claude/skills/foundry-run/SKILL.md")), true);
    assert.equal(fs.existsSync(path.join(root, ".foundry/state.yaml")), true);
    assert.match(fs.readFileSync(path.join(root, ".foundry/state.yaml"), "utf8"), /project_mode: new/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("init detects existing projects and preserves user-owned files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-existing-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), '{"name":"existing-app"}\n');
    fs.mkdirSync(path.join(root, ".claude/skills/foundry-run"), { recursive: true });
    fs.writeFileSync(path.join(root, ".claude/skills/foundry-run/SKILL.md"), "user-owned skill\n");
    fs.mkdirSync(path.join(root, ".foundry"), { recursive: true });
    fs.writeFileSync(path.join(root, ".foundry/state.yaml"), "owner_state: keep\n");
    const result = initializeProject({ projectPath: root });
    assert.equal(result.project_mode, "existing");
    assert.equal(fs.readFileSync(path.join(root, ".claude/skills/foundry-run/SKILL.md"), "utf8"), "user-owned skill\n");
    assert.equal(fs.readFileSync(path.join(root, ".foundry/state.yaml"), "utf8"), "owner_state: keep\n");
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
