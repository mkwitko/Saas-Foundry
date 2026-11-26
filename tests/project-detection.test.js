import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectProject, resolveNewWorkspace, slugifyProjectName } from "../src/project-detection.js";

test("detects an existing repository from git metadata or project manifests", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-detect-"));
  try {
    assert.equal(detectProject(root).recommendation, "new");
    fs.mkdirSync(path.join(root, ".git"));
    assert.equal(detectProject(root).existing, true);
    assert.equal(detectProject(root).confidence, "high");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("does not classify a README-only folder as an existing software project", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-readme-"));
  try {
    fs.writeFileSync(path.join(root, "README.md"), "# Notes\n");
    assert.equal(detectProject(root).recommendation, "new");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("detects project manifests and safe package metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-package-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }));
    const result = detectProject(root);
    assert.equal(result.recommendation, "existing");
    assert.equal(result.signals.package.name, "demo");
    assert.deepEqual(result.signals.package.scripts, ["test"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("creates a child workspace without moving or overwriting the current project", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-workspace-"));
  try {
    fs.writeFileSync(path.join(root, "README.md"), "Keep me");
    const destination = resolveNewWorkspace({ cwd: root, name: "Minha Ideia SaaS" });
    assert.equal(destination, path.join(root, "minha-ideia-saas"));
    assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "Keep me");
    assert.equal(slugifyProjectName("  Clínica São José  "), "clinica-sao-jose");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
