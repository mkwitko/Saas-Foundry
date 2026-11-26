import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", "vendor", "dist", "build", "coverage",
  ".next", ".turbo", ".cache", ".venv", "venv", "__pycache__",
  ".idea", ".vscode", ".ssh", ".aws", ".azure", ".gnupg", ".kube"
]);
const EXCLUDED_FILES = /(^\.env($|\.)|.*(secret|credential|token|private.?key|firebase-adminsdk).*|^\.npmrc$|^\.netrc$|^\.pypirc$|^id_(rsa|ed25519)$|\.(tfstate|tfvars|pem|key|p12|pfx|crt|cer|sqlite|sqlite3|db|dump|log|bak|backup))$/i;
const MAX_FILES = 5000;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;

export function createSanitizedSnapshot(sourceRoot) {
  const snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), "saas-foundry-audit-"));
  let copiedFiles = 0;
  let copiedBytes = 0;
  let skippedCount = 0;
  const walk = (source, relative = "") => {
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const rel = path.posix.join(relative, entry.name);
      if (rel.split("/").some(segment => EXCLUDED_DIRS.has(segment)) || EXCLUDED_FILES.test(entry.name)) {
        skippedCount++;
        continue;
      }
      const from = path.join(source, entry.name);
      const to = path.join(snapshotRoot, rel);
      if (entry.isSymbolicLink()) { skippedCount++; continue; }
      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        walk(from, rel);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = fs.statSync(from);
      if (stat.size > MAX_FILE_BYTES || copiedFiles >= MAX_FILES || copiedBytes + stat.size > MAX_BYTES) {
        skippedCount++;
        continue;
      }
      const data = fs.readFileSync(from);
      if (data.includes(0)) { skippedCount++; continue; }
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.writeFileSync(to, data, { flag: "wx" });
      copiedFiles++;
      copiedBytes += data.length;
    }
  };
  try {
    walk(fs.realpathSync(sourceRoot));
    return { root: snapshotRoot, copiedFiles, copiedBytes, skippedCount };
  } catch (error) {
    fs.rmSync(snapshotRoot, { recursive: true, force: true });
    throw error;
  }
}
