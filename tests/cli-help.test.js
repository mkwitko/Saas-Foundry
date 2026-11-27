import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("CLI help renders each workflow command on its own line", () => {
  const output = execFileSync(process.execPath, ["bin/foundry.js", "--help"], { encoding: "utf8" });
  assert.match(output, /foundry artifacts validate\|status/);
  assert.match(output, /foundry improve report/);
  assert.match(output, /foundry revenue report/);
  assert.doesNotMatch(output, /\\n  foundry artifacts/);
});
