import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("acquisition source catalogue has provenance and safe approval gates", () => {
  const raw = fs.readFileSync(path.join(root, "catalog/acquisition-sources.yaml"), "utf8");
  const catalog = parse(raw);
  assert.equal(catalog.schema_version, "0.1");
  assert.equal(catalog.sources.length, 3);
  const ids = new Set();
  for (const source of catalog.sources) {
    assert.ok(source.id);
    assert.ok(source.repository.startsWith("https://github.com/"));
    assert.ok(source.license);
    assert.ok(source.role);
    assert.ok(source.trust);
    assert.ok(Array.isArray(source.constraints) && source.constraints.length > 0);
    assert.ok(!ids.has(source.id), "source IDs must be unique");
    ids.add(source.id);
  }
  for (const gate of ["outreach", "public_posting", "directory_submission", "paid_listing", "ad_spend", "production_change"]) {
    assert.ok(catalog.approval_gates.includes(gate), `missing approval gate: ${gate}`);
  }
});

test("foundry-run skill covers end-to-end phases and preserves human approval gates", () => {
  const skill = fs.readFileSync(path.join(root, "skills/foundry-run/SKILL.md"), "utf8");
  for (const section of [
    "Phase 0 — Intake and current state",
    "Phase 1 — Product and engineering intelligence",
    "Phase 2 — Market, buyer and competitor research",
    "Phase 3 — ICP, positioning, offer and pricing",
    "Phase 4 — Acquisition and lead intelligence",
    "Phase 5 — Validation and sales system",
    "Phase 6 — Product and conversion improvements",
    "Phase 7 — Measurement and operating loop",
    "Phase 8 — Run summary and continuation"
  ]) assert.ok(skill.includes(section), `missing workflow section: ${section}`);
  for (const guardrail of ["Explicit approval required", "Never mass-message", "Do not read .env*", "Create a feature branch"]) {
    assert.ok(skill.includes(guardrail), `missing guardrail: ${guardrail}`);
  }
});

test("one-prompt guide includes the GitHub-only entry point", () => {
  const guide = fs.readFileSync(path.join(root, "docs/one-prompt-workflow.md"), "utf8");
  assert.ok(guide.includes("https://github.com/OWNER/REPOSITORY"));
  assert.ok(guide.includes("foundry-run"));
  assert.ok(guide.includes("Do not send outreach"));
});
