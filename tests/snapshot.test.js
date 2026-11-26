import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSanitizedSnapshot } from "../src/snapshot.js";

test("sanitized snapshot copies source text and excludes secrets, dependencies, binaries and symlinks", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-snapshot-test-"));
  let snapshot;
  try {
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true });
    fs.mkdirSync(path.join(root, "secrets"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "index.ts"), "export const ok = true;\n");
    fs.writeFileSync(path.join(root, ".env"), "API_KEY=do-not-copy\n");
    fs.writeFileSync(path.join(root, "secrets", "credentials.json"), "{\"token\":\"do-not-copy\"}");
    fs.writeFileSync(path.join(root, "node_modules", "pkg", "index.js"), "not source");
    fs.writeFileSync(path.join(root, "image.png"), Buffer.from([0, 1, 2, 3]));
    try { fs.symlinkSync(path.join(root, "src", "index.ts"), path.join(root, "linked.ts")); } catch { /* Windows may disallow symlink creation. */ }

    snapshot = createSanitizedSnapshot(root);
    assert.equal(fs.readFileSync(path.join(snapshot.root, "src", "index.ts"), "utf8"), "export const ok = true;\n");
    assert.equal(fs.existsSync(path.join(snapshot.root, ".env")), false);
    assert.equal(fs.existsSync(path.join(snapshot.root, "secrets", "credentials.json")), false);
    assert.equal(fs.existsSync(path.join(snapshot.root, "node_modules")), false);
    assert.equal(fs.existsSync(path.join(snapshot.root, "image.png")), false);
    assert.ok(snapshot.skippedCount >= 4);
  } finally {
    if (snapshot?.root) fs.rmSync(snapshot.root, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("snapshot rejects non-existent source paths", () => {
  assert.throws(() => createSanitizedSnapshot(path.join(os.tmpdir(), "foundry-does-not-exist")), /ENOENT/);
});
