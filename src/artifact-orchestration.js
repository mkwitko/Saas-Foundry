import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

function readYaml(file, label) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${label}: ${file}`);
  try { return parseYaml(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`Invalid YAML in ${label}: ${error.message}`); }
}

function safeRelativePath(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (path.isAbsolute(value) || value.includes("\0")) return false;
  return value.replaceAll("\\", "/").split("/").every(part => part && part !== "." && part !== "..");
}

function daysBetween(iso, now) {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 86_400_000;
}

export function loadArtifactWorkspace(projectPath) {
  const root = path.resolve(projectPath);
  const foundry = path.join(root, ".foundry");
  const registry = readYaml(path.join(foundry, "artifacts.yaml"), "artifact registry");
  const contracts = readYaml(path.join(foundry, "artifact-contracts.yaml"), "artifact contracts");
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.artifacts)) {
    throw new Error("Artifact registry must contain an artifacts array.");
  }
  if (!contracts || typeof contracts !== "object" || !Array.isArray(contracts.artifacts)) {
    throw new Error("Artifact contracts must contain an artifacts array.");
  }
  return { root, registry, contracts };
}

export function validateArtifactWorkspace({ registry, contracts }) {
  const errors = [];
  const warnings = [];
  if (registry.schema_version !== "1.0") errors.push("Unsupported artifact registry schema_version.");
  if (contracts.schema_version !== "1.0") errors.push("Unsupported artifact contracts schema_version.");
  const contractIds = new Set(contracts.artifacts.map(item => item?.id).filter(Boolean));
  const ids = new Set();
  for (const item of registry.artifacts) {
    if (!item || typeof item !== "object") { errors.push("Artifact entries must be objects."); continue; }
    if (!item.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) errors.push("Artifact has an invalid id.");
    else if (ids.has(item.id)) errors.push(`Duplicate artifact id: ${item.id}`);
    else ids.add(item.id);
    if (!item.contract_id || !contractIds.has(item.contract_id)) errors.push(`Artifact ${item.id ?? "(unknown)"} references an unknown contract.`);
    if (item.path !== null && item.path !== undefined && !safeRelativePath(item.path)) errors.push(`Artifact ${item.id} has an unsafe repository-relative path.`);
    if (!Array.isArray(item.depends_on ?? [])) errors.push(`Artifact ${item.id} depends_on must be an array.`);
    if (!Array.isArray(item.consumers ?? [])) errors.push(`Artifact ${item.id} consumers must be an array.`);
    if (!Number.isInteger(item.review_after_days) || item.review_after_days < 1) warnings.push(`Artifact ${item.id} has no valid review_after_days.`);
  }
  for (const item of registry.artifacts) {
    for (const dependency of item?.depends_on ?? []) {
      if (!registry.artifacts.some(candidate => candidate?.id === dependency)) {
        errors.push(`Artifact ${item.id} depends on unknown artifact ${dependency}.`);
      }
    }
  }
  const byId = new Map(registry.artifacts.filter(item => item?.id).map(item => [item.id, item]));
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`Artifact dependency cycle includes ${id}.`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.depends_on ?? []) if (byId.has(dependency)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings };
}

export function buildArtifactStatus({ root, registry, contracts, now = new Date() }) {
  const validation = validateArtifactWorkspace({ registry, contracts });
  if (!validation.valid) return { valid: false, validation, artifacts: [] };
  const contractById = new Map(contracts.artifacts.map(item => [item.id, item]));
  const byId = new Map(registry.artifacts.map(item => [item.id, item]));
  const computed = new Map();
  function resolve(item) {
    if (computed.has(item.id)) return computed.get(item.id);
    let status = item.status ?? "unknown";
    let reason = null;
    if (status === "current") {
      if (!item.path) { status = "unknown"; reason = "canonical_path_unmapped"; }
      else if (!fs.existsSync(path.resolve(root, item.path))) { status = "missing"; reason = "canonical_file_missing"; }
      else if (!item.updated_at) { status = "unknown"; reason = "updated_at_missing"; }
      else if (Number.isInteger(item.review_after_days) && daysBetween(item.updated_at, now) > item.review_after_days) {
        status = "stale"; reason = "review_interval_expired";
      }
    }
    if (status === "current") {
      const staleDependencies = (item.depends_on ?? []).filter(id => resolve(byId.get(id)).status !== "current");
      if (staleDependencies.length) { status = "stale"; reason = "stale_dependencies"; }
    }
    const result = {
      id: item.id,
      contract_id: item.contract_id,
      path: item.path ?? null,
      owner: item.owner ?? "unassigned",
      status,
      reason,
      stale_dependencies: status === "stale" && reason === "stale_dependencies"
        ? (item.depends_on ?? []).filter(id => resolve(byId.get(id)).status !== "current")
        : [],
      consumers: [...new Set([...(item.consumers ?? []), ...(contractById.get(item.contract_id)?.consumers ?? [])])]
    };
    computed.set(item.id, result);
    return result;
  }
  const artifacts = registry.artifacts.map(resolve);
  return {
    valid: true,
    validation,
    summary: {
      total: artifacts.length,
      current: artifacts.filter(item => item.status === "current").length,
      stale: artifacts.filter(item => item.status === "stale").length,
      missing: artifacts.filter(item => item.status === "missing").length,
      unmapped: artifacts.filter(item => item.status === "unknown").length
    },
    artifacts
  };
}

export function buildArtifactHandoffPlan({ registry, contracts, changedArtifactIds }) {
  const validation = validateArtifactWorkspace({ registry, contracts });
  if (!validation.valid) return { ready: false, validation, changed: [], affected_artifacts: [], capability_handoffs: [] };
  const byId = new Map(registry.artifacts.map(item => [item.id, item]));
  const contractById = new Map(contracts.artifacts.map(item => [item.id, item]));
  const changed = [...new Set(changedArtifactIds ?? [])];
  const unknown = changed.filter(id => !byId.has(id));
  if (!changed.length || unknown.length) {
    return { ready: false, validation, errors: unknown.map(id => `Unknown changed artifact: ${id}`), changed, affected_artifacts: [], capability_handoffs: [] };
  }
  const affected = new Map();
  const handoffs = new Map();
  const queue = changed.map(id => ({ id, source: id }));
  const visitedPairs = new Set();
  while (queue.length) {
    const { id, source } = queue.shift();
    const pair = source + "->" + id;
    if (visitedPairs.has(pair)) continue;
    visitedPairs.add(pair);
    const artifact = byId.get(id);
    const contract = contractById.get(artifact.contract_id);
    if (id !== source) affected.set(id, { id, owner: artifact.owner ?? "unassigned", path: artifact.path ?? null, depends_on: artifact.depends_on ?? [], affected_by: [...new Set([...(affected.get(id)?.affected_by ?? []), source])] });
    const consumers = [...new Set([...(artifact.consumers ?? []), ...(contract?.consumers ?? [])])];
    for (const capability of consumers) {
      if (!handoffs.has(capability)) handoffs.set(capability, new Set());
      handoffs.get(capability).add(id);
    }
    for (const dependent of registry.artifacts.filter(candidate => (candidate.depends_on ?? []).includes(id))) {
      queue.push({ id: dependent.id, source });
    }
  }
  return {
    ready: true,
    changed,
    affected_artifacts: [...affected.values()],
    capability_handoffs: [...handoffs.entries()].map(([capability, artifacts]) => ({ capability, triggered_by: [...artifacts] })).sort((a, b) => a.capability.localeCompare(b.capability)),
    policy: "proposal_only",
    note: "This is an impact plan only. It does not edit canonical artifacts, notify external systems, or approve owner-controlled changes."
  };
}

export function getArtifactWorkspaceReport(projectPath, now = new Date()) {
  const workspace = loadArtifactWorkspace(projectPath);
  const validation = validateArtifactWorkspace(workspace);
  const status = buildArtifactStatus({ ...workspace, now });
  return { project_root: workspace.root, validation, status };
}
