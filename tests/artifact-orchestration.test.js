import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildArtifactHandoffPlan,
  buildArtifactStatus,
  validateArtifactWorkspace
} from "../src/artifact-orchestration.js";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-artifacts-"));
  const registry = {
    schema_version: "1.0",
    artifacts: [
      { id: "strategy", contract_id: "strategy", path: "docs/strategy.md", owner: "founder", status: "current", version: 1, updated_at: "2026-01-01T00:00:00.000Z", review_after_days: 3650, depends_on: [], consumers: ["product"] },
      { id: "product-brief", contract_id: "product-brief", path: "docs/product.md", owner: "product", status: "current", version: 1, updated_at: "2026-01-01T00:00:00.000Z", review_after_days: 3650, depends_on: ["strategy"], consumers: ["design"] },
      { id: "design", contract_id: "design", path: null, owner: "design", status: "unknown", version: 0, updated_at: null, review_after_days: 30, depends_on: ["product-brief"], consumers: ["engineering"] }
    ]
  };
  const contracts = { schema_version: "1.0", artifacts: [
    { id: "strategy", consumers: ["sales"] },
    { id: "product-brief", consumers: ["marketing"] },
    { id: "design", consumers: ["qa"] }
  ] };
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/strategy.md"), "strategy");
  fs.writeFileSync(path.join(root, "docs/product.md"), "product");
  return { root, registry, contracts, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test("validates artifact IDs, contracts, safe paths and dependencies", () => {
  const f = fixture();
  try {
    assert.equal(validateArtifactWorkspace(f).valid, true);
    f.registry.artifacts[0].path = "../secret";
    const result = validateArtifactWorkspace(f);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes("unsafe")));
  } finally { f.cleanup(); }
});

test("detects missing canonical files and stale review intervals", () => {
  const f = fixture();
  try {
    f.registry.artifacts[0].updated_at = "2020-01-01T00:00:00.000Z";
    f.registry.artifacts[0].review_after_days = 10;
    const result = buildArtifactStatus({ ...f, now: new Date("2026-11-27T00:00:00.000Z") });
    assert.equal(result.summary.stale, 1);
    assert.equal(result.artifacts[0].reason, "review_interval_expired");
    assert.equal(result.artifacts[1].status, "stale");
    assert.deepEqual(result.artifacts[1].stale_dependencies, ["strategy"]);
  } finally { f.cleanup(); }
});

test("builds cross-capability handoffs through transitive artifact dependencies", () => {
  const f = fixture();
  try {
    const result = buildArtifactHandoffPlan({ ...f, changedArtifactIds: ["strategy"] });
    assert.equal(result.ready, true);
    assert.deepEqual(result.affected_artifacts.map(item => item.id), ["product-brief", "design"]);
    assert.ok(result.capability_handoffs.some(item => item.capability === "sales"));
    assert.ok(result.capability_handoffs.some(item => item.capability === "qa"));
    assert.equal(result.policy, "proposal_only");
  } finally { f.cleanup(); }
});

test("rejects unknown changed artifacts and dependency cycles", () => {
  const f = fixture();
  try {
    assert.equal(buildArtifactHandoffPlan({ ...f, changedArtifactIds: ["missing"] }).ready, false);
    f.registry.artifacts[0].depends_on = ["design"];
    assert.equal(validateArtifactWorkspace(f).valid, false);
  } finally { f.cleanup(); }
});
