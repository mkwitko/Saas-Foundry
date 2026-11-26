import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const LOCK_PATH = ".foundry/resources.lock.yaml";
const HISTORY_ROOT = ".foundry/resource-history";
const MAX_FILE_BYTES = 512 * 1024;
const ALLOWED_TARGET_ROOTS = [".foundry/resources", ".agents/skills", ".claude/skills", ".opencode/skills", ".codex/skills"];
const ALLOWED_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".yaml", ".yml", ".json", ".toml", ".csv", ".tsv", ".html", ".css", ".svg", ".js", ".ts", ".mjs", ".cjs", ".py", ".sh"]);

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 10000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error("Unable to verify local Git source: " + (result.stderr || result.error?.message || "git command failed").trim());
  return result.stdout.trim();
}
function normalizeRemote(value) {
  return String(value ?? "").trim().replace(/^git@github\.com:/i, "https://github.com/").replace(/\.git$/i, "").replace(/\/$/, "").toLowerCase();
}
function safeRelative(value, label = "path") {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value)) throw new Error("Invalid " + label + ".");
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  const parts = normalized.split("/");
  if (parts.some(x => !x || x === "." || x === "..")) throw new Error("Unsafe " + label + ": " + value);
  return parts.join("/");
}
function inside(root, relative) {
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep)) throw new Error("Path escapes project root.");
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error("Refusing symlink path: " + relative);
  }
  return resolved;
}
function readLock(projectRoot) {
  const file = inside(projectRoot, LOCK_PATH);
  if (!fs.existsSync(file)) return { schema_version: "0.4", resources: {} };
  const parsed = parseYaml(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed.resources !== "object" || Array.isArray(parsed.resources)) throw new Error("Resource lockfile is invalid; refusing to modify it.");
  return parsed;
}
function writeLock(projectRoot, lock) {
  const file = inside(projectRoot, LOCK_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + ".tmp-" + process.pid;
  fs.writeFileSync(temp, stringifyYaml(lock), { flag: "wx", encoding: "utf8" });
  fs.renameSync(temp, file);
}
function collectFiles(sourceRoot, sourcePath, allowScripts) {
  const start = sourcePath === "." ? sourceRoot : inside(sourceRoot, sourcePath);
  if (!fs.existsSync(start) || !fs.statSync(start).isDirectory()) throw new Error("Source path must be an existing directory inside the Git checkout.");
  const files = [];
  function walk(dir, relative) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
      if ([".git", "node_modules", ".venv", "__pycache__"].includes(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      const rel = relative ? relative + "/" + entry.name : entry.name;
      if (entry.isSymbolicLink()) throw new Error("Resource contains a symlink; review and remove it before installation: " + rel);
      if (entry.isDirectory()) walk(absolute, rel);
      else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Unsupported resource file type: " + rel);
        if (!allowScripts && [".js", ".mjs", ".cjs", ".ts", ".py", ".sh"].includes(ext)) throw new Error("Resource contains executable/script-like files. Re-run with --allow-scripts only after reviewing them: " + rel);
        const stat = fs.statSync(absolute);
        if (stat.size > MAX_FILE_BYTES) throw new Error("Resource file exceeds 512 KiB limit: " + rel);
        const content = fs.readFileSync(absolute);
        if (content.includes(0)) throw new Error("Binary files are not supported in v0.4: " + rel);
        files.push({ source_path: rel, content: content.toString("utf8"), bytes: stat.size, sha256: sha256(content) });
      }
    }
  }
  if (fs.statSync(start).isFile()) {
    const ext = path.extname(start).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Unsupported resource file type.");
    const content = fs.readFileSync(start);
    if (content.length > MAX_FILE_BYTES || content.includes(0)) throw new Error("Resource file is binary or exceeds 512 KiB.");
    files.push({ source_path: path.basename(start), content: content.toString("utf8"), bytes: content.length, sha256: sha256(content) });
  } else walk(start, "");
  if (!files.length) throw new Error("No supported files found in selected resource path.");
  if (files.length > 200 || files.reduce((sum, file) => sum + file.bytes, 0) > 2 * 1024 * 1024) throw new Error("Resource exceeds v0.4 limits (200 files / 2 MiB).");
  return files.sort((a,b)=>a.source_path.localeCompare(b.source_path));
}
function inspectGitSource(resource, sourceDir, requestedCommit) {
  const root = runGit(sourceDir, ["rev-parse", "--show-toplevel"]);
  const realRoot = fs.realpathSync(root);
  const head = runGit(realRoot, ["rev-parse", "HEAD"]);
  const remote = runGit(realRoot, ["remote", "get-url", "origin"]);
  if (normalizeRemote(remote) !== normalizeRemote(resource.source)) throw new Error("Git origin does not match catalog source. Expected " + resource.source + ", received " + remote);
  if (!/^[a-f0-9]{40}$/i.test(requestedCommit ?? "") || head.toLowerCase() !== requestedCommit.toLowerCase()) throw new Error("Pin --commit to the exact 40-character HEAD SHA of the reviewed checkout (" + head + ").");
  return { root: realRoot, remote, commit: head };
}
function validateTarget(target, resourceId) {
  const normalized = safeRelative(target, "target");
  const allowed = ALLOWED_TARGET_ROOTS.some(root => normalized.startsWith(root + "/"));
  if (!allowed) throw new Error("Target must be inside one of: " + ALLOWED_TARGET_ROOTS.join(", "));
  if (!normalized.endsWith("/" + resourceId) && !normalized.startsWith(".foundry/resources/" + resourceId + "/")) {
    throw new Error("Target must end in the resource ID to keep ownership and rollback bounded.");
  }
  return normalized;
}
function getCatalogResource(registry, id) {
  const resource = (registry?.resources ?? []).find(x => x.id === id);
  if (!resource) throw new Error("Unknown resource ID: " + id);
  if (!["skill", "skill_collection", "template", "workflow", "playbook_collection"].includes(resource.type)) {
    throw new Error("Resource type is reference-only in v0.4 and cannot be installed: " + resource.type);
  }
  return resource;
}
function planFiles(projectRoot, target, files) {
  return files.map(file => {
    const relative = target + "/" + file.source_path;
    const destination = inside(projectRoot, relative);
    const exists = fs.existsSync(destination);
    const current = exists && fs.statSync(destination).isFile() ? fs.readFileSync(destination) : null;
    return { path: relative, action: !exists ? "create" : sha256(current) === file.sha256 ? "unchanged" : "conflict", sha256: file.sha256, bytes: file.bytes, content: file.content };
  });
}
export function listInstallableResources(registry) {
  return (registry?.resources ?? []).map(r => ({
    id: r.id, type: r.type, source: r.source, license: r.license, status: r.status,
    use: r.use, installable_in_v04: ["skill", "skill_collection", "template", "workflow", "playbook_collection"].includes(r.type)
  }));
}
export function buildResourceInstallPlan({ projectRoot, registry, resourceId, sourceDir, sourcePath = ".", target, commit, license, reviewed = false, allowScripts = false, existingLock }) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const resource = getCatalogResource(registry, resourceId);
  if (!reviewed) throw new Error("A human review attestation is required (--reviewed). Review upstream content, license, scripts and instructions first.");
  if (!license || license.trim().length < 2) throw new Error("An explicit license identifier or review outcome is required (--license).");
  if (resource.license !== "verify_upstream" && resource.license !== "vendor_product" && resource.license !== "vendor_api" && resource.license !== license) {
    throw new Error("License attestation does not match catalog license: expected " + resource.license + ".");
  }
  const git = inspectGitSource(resource, sourceDir, commit);
  const sourceRel = sourcePath === "." ? "." : safeRelative(sourcePath, "source path");
  const files = collectFiles(git.root, sourceRel, allowScripts);
  const dest = validateTarget(target ?? ".foundry/resources/" + resourceId, resourceId);
  const lock = existingLock ?? readLock(root);
  const existing = lock.resources[resourceId];
  if (existing && existing.target !== dest) throw new Error("Resource is already installed at " + existing.target + "; uninstall it before changing target.");
  const targetAbs = inside(root, dest);
  if (fs.existsSync(targetAbs) && !fs.statSync(targetAbs).isDirectory()) throw new Error("Resource target exists and is not a directory.");
  const planned = planFiles(root, dest, files);
  const safe = planned.every(x => x.action !== "conflict");
  return {
    schema_version: "0.4", operation: existing ? "reinstall" : "install", mode: "dry_run", safe,
    project_root: root, resource_id: resourceId, resource_type: resource.type, source: resource.source,
    source_remote: git.remote, source_path: sourceRel, source_commit: git.commit, target: dest,
    license_attestation: license, reviewed, scripts_allowed: allowScripts,
    files: planned, file_count: planned.length,
    policy: "Copies reviewed text artifacts only. Does not execute source files, install dependencies, edit application code or agent instruction files, contact upstream services, or perform external actions."
  };
}
export function executeResourceInstall(plan) {
  if (!plan?.safe || plan.mode !== "dry_run" || !Array.isArray(plan.files)) throw new Error("Invalid or conflicting resource install plan.");
  const root = fs.realpathSync(plan.project_root);
  const target = validateTarget(plan.target, plan.resource_id);
  const lock = readLock(root);
  const prior = lock.resources[plan.resource_id];
  if (prior && prior.source_commit !== plan.source_commit) throw new Error("Resource already has a different pinned version. Use the update workflow, not install.");
  for (const file of plan.files) {
    const destination = inside(root, file.path);
    if (!file.path.startsWith(target + "/") || !["create", "unchanged"].includes(file.action)) throw new Error("Install plan integrity check failed.");
    if (sha256(file.content) !== file.sha256) throw new Error("Install plan content hash mismatch: " + file.path);
    if (file.action === "create" && fs.existsSync(destination)) throw new Error("Destination changed after dry-run: " + file.path);
  }
  const created = [];
  inside(root, LOCK_PATH);
  const tempLock = inside(root, LOCK_PATH + ".tmp-" + process.pid);
  try {
    for (const file of plan.files) {
      if (file.action === "unchanged") continue;
      const destination = inside(root, file.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      inside(root, file.path);
      fs.writeFileSync(destination, file.content, { encoding: "utf8", flag: "wx" });
      created.push(file.path);
    }
    const next = readLock(root);
    next.resources[plan.resource_id] = {
      type: plan.resource_type, source: plan.source, source_path: plan.source_path,
      source_commit: plan.source_commit, target: target, license: plan.license_attestation,
      reviewed: true, scripts_allowed: plan.scripts_allowed, installed_at: new Date().toISOString(),
      files: plan.files.map(f => ({ path: f.path, sha256: f.sha256, bytes: f.bytes }))
    };
    fs.mkdirSync(path.dirname(path.join(root, LOCK_PATH)), { recursive: true });
    fs.writeFileSync(tempLock, stringifyYaml(next), { encoding: "utf8", flag: "wx" });
    fs.renameSync(tempLock, path.join(root, LOCK_PATH));
  } catch (error) {
    if (fs.existsSync(tempLock)) fs.unlinkSync(tempLock);
    for (const relative of created.reverse()) {
      try {
        const destination = inside(root, relative);
        if (fs.existsSync(destination)) fs.unlinkSync(destination);
        try { fs.rmdirSync(path.dirname(destination)); } catch { /* Preserve non-empty directories. */ }
      } catch { /* Never remove a file we cannot prove was created here. */ }
    }
    throw error;
  }
  return { installed: plan.files.filter(f => f.action === "create").map(f => f.path), unchanged: plan.files.filter(f => f.action === "unchanged").map(f => f.path), lockfile: LOCK_PATH };
}
export function inspectResourceDrift(projectRoot, resourceId) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const lock = readLock(root);
  const entries = resourceId ? [[resourceId, lock.resources[resourceId]]] : Object.entries(lock.resources);
  const reports = entries.map(([id, record]) => {
    if (!record) throw new Error("Resource is not in lockfile: " + id);
    validateTarget(record.target, id);
    const expected = new Map((record.files ?? []).map(f => {
      if (!f.path.startsWith(record.target + "/")) throw new Error("Lockfile file path is outside the resource target: " + f.path);
      return [f.path, f];
    }));
    const actual = [];
    for (const [relative, file] of expected) {
      const absolute = inside(root, relative);
      if (!fs.existsSync(absolute)) actual.push({ path: relative, status: "missing" });
      else if (!fs.statSync(absolute).isFile()) actual.push({ path: relative, status: "unsafe" });
      else {
        const current = sha256(fs.readFileSync(absolute));
        if (current !== file.sha256) actual.push({ path: relative, status: "modified", current_sha256: current, locked_sha256: file.sha256 });
      }
    }
    const targetAbs = inside(root, record.target);
    const known = new Set(expected.keys());
    const extra = [];
    if (fs.existsSync(targetAbs)) {
      const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const absolute = path.join(dir, entry.name);
          const rel = path.relative(root, absolute).split(path.sep).join("/");
          if (entry.isSymbolicLink()) { extra.push({ path: rel, status: "unsafe_symlink" }); continue; }
          if (entry.isDirectory()) walk(absolute);
          else if (entry.isFile() && !known.has(rel)) extra.push({ path: rel, status: "untracked" });
        }
      };
      walk(targetAbs);
    }
    return { id, target: record.target, source_commit: record.source_commit, status: actual.length || extra.length ? "drift" : "clean", changed: actual, extra };
  });
  return { checked_at: new Date().toISOString(), resources: reports, summary: { clean: reports.filter(x=>x.status==="clean").length, drifted: reports.filter(x=>x.status==="drift").length } };
}
export function buildResourceUpdatePlan(args) {
  const root = fs.realpathSync(path.resolve(args.projectRoot));
  const lock = readLock(root);
  const previous = lock.resources[args.resourceId];
  if (!previous) throw new Error("Resource is not installed: " + args.resourceId);
  const currentDrift = inspectResourceDrift(root, args.resourceId).resources[0];
  if (currentDrift.status !== "clean") throw new Error("Installed resource has drift; reconcile local changes before updating.");
  const next = buildResourceInstallPlan({ ...args, existingLock: lock });
  if (next.target !== previous.target) throw new Error("Resource update cannot change its target directory.");
  const previousFiles = new Map(previous.files.map(file => [file.path, file]));
  const nextPaths = new Set(next.files.map(file => file.path));
  for (const file of next.files) {
    if (file.action === "conflict") {
      const old = previousFiles.get(file.path);
      if (!old || old.sha256 !== sha256(fs.readFileSync(inside(root, file.path)))) continue;
      file.action = "update";
    }
  }
  next.removed_files = previous.files.filter(file => !nextPaths.has(file.path)).map(file => ({ path: file.path, sha256: file.sha256 }));
  next.previous_version = { source_commit: previous.source_commit, files: previous.files };
  next.operation = "update";
  next.safe = next.files.every(file => ["create", "unchanged", "update"].includes(file.action));
  return next;
}
export function executeResourceUpdate(plan) {
  if (!plan?.safe || plan.operation !== "update") throw new Error("Resource update plan is invalid or contains conflicts.");
  const root = fs.realpathSync(plan.project_root);
  const lock = readLock(root);
  const previous = lock.resources[plan.resource_id];
  if (!previous || previous.source_commit !== plan.previous_version?.source_commit) throw new Error("Resource lock changed since update preview.");
  if (inspectResourceDrift(root, plan.resource_id).resources[0].status !== "clean") throw new Error("Installed resource changed since update preview.");
  const historyRelative = HISTORY_ROOT + "/" + plan.resource_id + "/" + previous.source_commit + ".json";
  const historyFile = inside(root, historyRelative);
  if (fs.existsSync(historyFile)) throw new Error("Update history already exists for this source revision.");
  const history = {
    resource_id: plan.resource_id, record: previous,
    files: previous.files.map(file => ({ path: file.path, content: fs.readFileSync(inside(root, file.path), "utf8") }))
  };
  const created = [];
  const changed = [];
  const tempHistory = historyFile + ".tmp-" + process.pid;
  try {
    fs.mkdirSync(path.dirname(historyFile), { recursive: true });
    fs.writeFileSync(tempHistory, JSON.stringify(history, null, 2), { encoding: "utf8", flag: "wx" });
    fs.renameSync(tempHistory, historyFile);
    for (const file of plan.files) {
      const destination = inside(root, file.path);
      if (file.action === "unchanged") continue;
      if (file.action === "create") {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        inside(root, file.path);
        fs.writeFileSync(destination, file.content, { encoding: "utf8", flag: "wx" });
        created.push(file.path);
      } else if (file.action === "update") {
        const old = fs.readFileSync(destination);
        if (sha256(old) !== plan.previous_version.files.find(x => x.path === file.path)?.sha256) throw new Error("File changed during update: " + file.path);
        const temp = destination + ".foundry-update-" + process.pid;
        fs.writeFileSync(temp, file.content, { encoding: "utf8", flag: "wx" });
        fs.renameSync(temp, destination);
        changed.push(file.path);
      } else throw new Error("Unexpected update action: " + file.action);
    }
    for (const file of plan.removed_files ?? []) {
      const destination = inside(root, file.path);
      if (!fs.existsSync(destination) || sha256(fs.readFileSync(destination)) !== file.sha256) throw new Error("Removed-file precondition failed: " + file.path);
      fs.unlinkSync(destination);
      changed.push(file.path);
    }
    const next = readLock(root);
    next.resources[plan.resource_id] = {
      type: plan.resource_type, source: plan.source, source_path: plan.source_path,
      source_commit: plan.source_commit, target: plan.target, license: plan.license_attestation,
      reviewed: true, scripts_allowed: plan.scripts_allowed, installed_at: new Date().toISOString(),
      files: plan.files.map(file => ({ path: file.path, sha256: file.sha256, bytes: file.bytes })),
      previous_version: historyRelative
    };
    writeLock(root, next);
  } catch (error) {
    if (fs.existsSync(tempHistory)) fs.unlinkSync(tempHistory);
    // Restore the prior snapshot from the immutable history file.
    if (fs.existsSync(historyFile)) {
      const saved = JSON.parse(fs.readFileSync(historyFile, "utf8"));
      for (const file of plan.files) {
        const destination = inside(root, file.path);
        if (fs.existsSync(destination)) {
          const newHash = plan.files.find(x => x.path === file.path)?.sha256;
          if (newHash && sha256(fs.readFileSync(destination)) === newHash && !saved.files.some(x => x.path === file.path)) fs.unlinkSync(destination);
        }
      }
      for (const file of saved.files) {
        const destination = inside(root, file.path);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, file.content, "utf8");
      }
      const restored = readLock(root);
      restored.resources[plan.resource_id] = saved.record;
      writeLock(root, restored);
      fs.unlinkSync(historyFile);
    }
    throw error;
  }
  return { updated: plan.resource_id, from_commit: previous.source_commit, to_commit: plan.source_commit, history: historyRelative };
}
export function rollbackResourceUpdate(projectRoot, resourceId) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const lock = readLock(root);
  const current = lock.resources[resourceId];
  if (!current?.previous_version) throw new Error("No previous version is recorded for this resource.");
  if (inspectResourceDrift(root, resourceId).resources[0].status !== "clean") throw new Error("Current resource has drift; refusing rollback.");
  const historyFile = inside(root, current.previous_version);
  if (!fs.existsSync(historyFile)) throw new Error("Resource update history is missing.");
  const history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  for (const file of current.files) {
    const destination = inside(root, file.path);
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
  }
  for (const file of history.files) {
    const destination = inside(root, file.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, file.content, "utf8");
  }
  lock.resources[resourceId] = history.record;
  writeLock(root, lock);
  return { rolled_back: resourceId, restored_commit: history.record.source_commit, retained_history: current.previous_version };
}
export function buildResourceUninstallPlan(projectRoot, resourceId) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const lock = readLock(root);
  const record = lock.resources[resourceId];
  if (!record) throw new Error("Resource is not installed: " + resourceId);
  const drift = inspectResourceDrift(root, resourceId).resources[0];
  return { schema_version: "0.4", operation: "uninstall", mode: "dry_run", project_root: root, resource_id: resourceId, target: record.target, safe: drift.status === "clean", drift, policy: "Only unchanged files listed in the resource lock may be removed. Modified or untracked files are never deleted." };
}
export function executeResourceUninstall(plan) {
  if (!plan?.safe || plan.mode !== "dry_run") throw new Error("Uninstall is unsafe because drift or conflicts were detected.");
  const root = fs.realpathSync(plan.project_root);
  const lock = readLock(root);
  const record = lock.resources[plan.resource_id];
  if (!record || record.target !== plan.target) throw new Error("Resource lock changed since dry-run.");
  const drift = inspectResourceDrift(root, plan.resource_id).resources[0];
  if (drift.status !== "clean") throw new Error("Resource changed since dry-run; refusing uninstall.");
  for (const file of record.files) {
    const target = inside(root, file.path);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
  const dirs = [...new Set(record.files.map(f=>path.dirname(path.join(root,f.path))))].sort((a,b)=>b.length-a.length);
  for (const dir of dirs) { try { fs.rmdirSync(dir); } catch { /* Preserve non-empty directories. */ } }
  delete lock.resources[plan.resource_id];
  writeLock(root, lock);
  return { removed_resource: plan.resource_id, files_removed: record.files.length, lockfile: LOCK_PATH };
}
