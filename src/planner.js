import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const SATISFIED = new Set(["already_satisfied", "not_applicable"]);
const CHECK_RESULTS = new Set(["passed", "failed", "not_run", "not_applicable"]);

export function buildDependencyPlan({ registry, requested, completed = [], statuses = {} }) {
  if (!Array.isArray(registry?.modules)) throw new Error("Module registry must contain a modules array.");
  if (!Array.isArray(requested) || requested.length === 0) throw new Error("Select at least one module with --module.");
  const byId = new Map(registry.modules.map(module => [module.id, module]));
  const unknown = requested.filter(id => !byId.has(id));
  if (unknown.length) throw new Error("Unknown module id(s): " + unknown.join(", "));
  const done = new Set(completed);
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  const blocked = [];

  function visit(id, requestedBy) {
    if (done.has(id) || SATISFIED.has(statuses[id])) return;
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error("Dependency cycle detected at module: " + id);
    const module = byId.get(id);
    if (!module) {
      blocked.push({ module: requestedBy, dependency: id, reason: "Dependency is missing from the module registry." });
      return;
    }
    if (statuses[id] === "blocked" || statuses[id] === "specialist_required") {
      blocked.push({ module: requestedBy, dependency: id, reason: "Dependency is marked " + statuses[id] + "." });
      return;
    }
    visiting.add(id);
    const blockedBefore = blocked.length;
    for (const dependency of module.requires ?? []) visit(dependency, id);
    visiting.delete(id);
    visited.add(id);
    if (blocked.length > blockedBefore) return;
    ordered.push({ id, group: module.group ?? null, purpose: module.purpose ?? "", requested: requested.includes(id), dependencies: module.requires ?? [], outputs: module.outputs ?? [] });
  }

  for (const id of requested) visit(id, id);
  return {
    generated_at: new Date().toISOString(),
    requested,
    already_satisfied: [...new Set([...completed, ...Object.keys(statuses).filter(id => SATISFIED.has(statuses[id]))])].filter(id => byId.has(id)),
    execution_order: ordered,
    blocked,
    ready: blocked.length === 0,
    note: "Dependency order is deterministic. This plan does not prove module completion or authorize external actions."
  };
}

function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return "record must be an object";
  if (typeof record.id !== "string" || !record.id.trim()) return "id is required";
  if (typeof record.outcome !== "string" || !record.outcome.trim()) return "outcome is required";
  if (typeof record.evidence !== "string" || !record.evidence.trim()) return "evidence is required";
  if (!Array.isArray(record.artifacts) || !Array.isArray(record.checks) || !Array.isArray(record.risks)) return "artifacts, checks and risks must be arrays";
  if (typeof record.rollback !== "string" || !record.rollback.trim()) return "rollback must describe a reversal path or say not_applicable";
  if (typeof record.next_action !== "string" || !record.next_action.trim()) return "next_action is required";
  if (typeof record.owner !== "string" || !record.owner.trim()) return "owner is required";
  for (const check of record.checks) {
    if (!check || typeof check.name !== "string" || !CHECK_RESULTS.has(check.result)) return "each check needs a name and result: " + [...CHECK_RESULTS].join(", ");
  }
  return null;
}

export function verifyDefinitionOfDone(projectRoot, { requiredModules = [] } = {}) {
  const file = path.join(path.resolve(projectRoot), ".foundry", "acceptance.yaml");
  if (!fs.existsSync(file)) {
    return { valid: false, file: ".foundry/acceptance.yaml", missing_file: true, modules: [], missing_modules: requiredModules, summary: { required: requiredModules.length, done: 0, incomplete: requiredModules.length } };
  }
  let ledger;
  try { ledger = parseYaml(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error("Could not parse .foundry/acceptance.yaml; original file preserved: " + error.message); }
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger) || ledger.schema_version !== "0.1" || !Array.isArray(ledger.modules)) {
    throw new Error(".foundry/acceptance.yaml must contain schema_version 0.1 and a modules array.");
  }
  const ids = new Set();
  const records = ledger.modules.map(record => {
    const errors = [];
    const invalid = validateRecord(record);
    if (invalid) errors.push(invalid);
    if (ids.has(record?.id)) errors.push("duplicate module record");
    ids.add(record?.id);
    const failedChecks = (record?.checks ?? []).filter(check => check.result === "failed");
    const pendingChecks = (record?.checks ?? []).filter(check => check.result === "not_run");
    const done = errors.length === 0 && failedChecks.length === 0 && pendingChecks.length === 0 &&
      (record.checks ?? []).every(check => check.result === "passed" || check.result === "not_applicable");
    return { id: record?.id ?? null, done, errors, failed_checks: failedChecks.map(x => x.name), pending_checks: pendingChecks.map(x => x.name), outcome: record?.outcome ?? null, owner: record?.owner ?? null };
  });
  const missing = requiredModules.filter(id => !ids.has(id));
  const incomplete = records.filter(record => !record.done);
  return {
    valid: missing.length === 0 && incomplete.length === 0,
    file: ".foundry/acceptance.yaml",
    missing_file: false,
    modules: records,
    missing_modules: missing,
    summary: { required: requiredModules.length || records.length, recorded: records.length, done: records.filter(x => x.done).length, incomplete: incomplete.length + missing.length }
  };
}
