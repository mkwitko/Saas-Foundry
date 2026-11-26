import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { stringify as stringifyYaml } from "yaml";

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const freshnessFor = (date, now) => {
  const ageDays = Math.max(0, (now.getTime() - new Date(date).getTime()) / 86400000);
  return { age_days: Math.round(ageDays * 10) / 10, status: ageDays <= 30 ? "fresh" : ageDays <= 90 ? "aging" : "stale" };
};

export function buildEvidenceReport(scan, now = new Date()) {
  if (!scan || !Array.isArray(scan.evidence)) throw new Error("A scan report with an evidence array is required.");
  const scanDate = new Date(scan.scanned_at);
  const scanFreshness = Number.isNaN(scanDate.getTime()) ? { age_days: null, status: "unknown" } : freshnessFor(scanDate, now);
  const items = scan.evidence.map(item => {
    const refs = Array.isArray(item.evidence) ? item.evidence : [];
    const status = item.status ?? "unknown";
    const confidence = status === "unknown" ? "low" : refs.length >= 2 ? "high" : refs.length === 1 ? "medium" : "low";
    return {
      id: hash([item.capability, status, ...refs].join("|")).slice(0, 16),
      capability: item.capability,
      status,
      confidence,
      evidence_class: "E3",
      references: refs,
      freshness: scanFreshness,
      limitation: item.note ?? "Repository evidence does not prove runtime behaviour or customer outcomes."
    };
  });
  return {
    evidence_version: "0.3.0",
    generated_at: now.toISOString(),
    source: { scanner_version: scan.scanner_version ?? "unknown", scanned_at: scan.scanned_at ?? null, root: scan.root ?? null },
    freshness: scanFreshness,
    summary: {
      total: items.length,
      high_confidence: items.filter(x => x.confidence === "high").length,
      stale: items.filter(x => x.freshness.status === "stale").length,
      unknown: items.filter(x => x.status === "unknown").length
    },
    items,
    policy: "Confidence describes strength of repository evidence only. E3 implementation evidence is not proof of production use, buyer demand, or business outcomes."
  };
}

export function diffScans(previous, current) {
  if (!previous || !current || !Array.isArray(previous.inventory) || !Array.isArray(current.inventory)) {
    throw new Error("Both scan snapshots must include inventory arrays.");
  }
  const before = new Map(previous.inventory.map(x => [x.path, x]));
  const after = new Map(current.inventory.map(x => [x.path, x]));
  const added = [...after.keys()].filter(x => !before.has(x)).sort();
  const removed = [...before.keys()].filter(x => !after.has(x)).sort();
  const changedSignals = [...new Set([...Object.keys(previous.signals ?? {}), ...Object.keys(current.signals ?? {})])]
    .filter(key => (previous.signals ?? {})[key] !== (current.signals ?? {})[key])
    .sort()
    .map(key => ({ signal: key, before: previous.signals?.[key] ?? null, after: current.signals?.[key] ?? null }));
  const evidenceBefore = new Map((previous.evidence ?? []).map(x => [x.capability, x.status]));
  const evidenceAfter = new Map((current.evidence ?? []).map(x => [x.capability, x.status]));
  const changedEvidence = [...new Set([...evidenceBefore.keys(), ...evidenceAfter.keys()])]
    .filter(key => evidenceBefore.get(key) !== evidenceAfter.get(key))
    .sort()
    .map(capability => ({ capability, before: evidenceBefore.get(capability) ?? null, after: evidenceAfter.get(capability) ?? null }));
  return {
    diff_version: "0.3.0",
    generated_at: new Date().toISOString(),
    previous_scanned_at: previous.scanned_at ?? null,
    current_scanned_at: current.scanned_at ?? null,
    summary: { files_added: added.length, files_removed: removed.length, signals_changed: changedSignals.length, evidence_changed: changedEvidence.length },
    files: { added, removed },
    changed_signals: changedSignals,
    changed_evidence: changedEvidence,
    limitations: ["Path and metadata changes do not prove code behaviour or customer impact.", "A missing path can reflect scanner scope or exclusions, not necessarily deletion."]
  };
}

function inferBottleneck(value) {
  const text = String(value ?? "").toLowerCase();
  for (const key of Object.keys(bottleneckTriggers)) if (text.includes(key)) return key;
  if (/buyer|validat|interview|demand|problem|pilot/.test(text)) return "validation";
  if (/lead|prospect|demo|sales|sell|conversion/.test(text)) return "sales";
  if (/traffic|acqui|seo|organic|reach/.test(text)) return "acquisition";
  if (/activat|onboard|setup|first value/.test(text)) return "activation";
  if (/retent|churn|cancel|usage|support/.test(text)) return "retention";
  if (/price|revenue|margin|billing|paid/.test(text)) return "revenue";
  if (/reliab|bug|security|technical|engineering/.test(text)) return "reliability";
  if (/privacy|legal|compliance|health data/.test(text)) return "compliance";
  if (/product|roadmap|ux|usability/.test(text)) return "product";
  return "validation";
}

const bottleneckTriggers = {
  validation: ["business-validation", "customer-research-loop"],
  sales: ["sales-pipeline", "positioning-and-offer", "launch-and-distribution"],
  acquisition: ["launch-and-distribution", "seo-and-content", "conversion-optimization"],
  activation: ["analytics-instrumentation", "activation-and-onboarding"],
  retention: ["analytics-instrumentation", "retention-and-customer-success", "customer-support-loop"],
  revenue: ["pricing-and-unit-economics", "revenue-operations"],
  product: ["product-strategy", "product-design"],
  reliability: ["engineering-quality"],
  compliance: ["legal-and-compliance-review"]
};
const stageBonus = {
  idea: ["opportunity-intelligence", "business-validation", "competitor-intelligence"],
  validation: ["business-validation", "positioning-and-offer", "pricing-and-unit-economics"],
  pilot: ["sales-pipeline", "analytics-instrumentation", "activation-and-onboarding", "customer-research-loop"],
  early_revenue: ["retention-and-customer-success", "revenue-operations", "proof-and-advocacy", "referrals-and-partnerships"],
  growth: ["conversion-optimization", "seo-and-content", "revenue-operations", "founder-operations"]
};

export function selectModules(manifest, registry, scan, options = {}) {
  if (!Array.isArray(registry?.modules)) throw new Error("A module registry is required.");
  const stage = options.stage ?? manifest?.project?.stage ?? "pilot";
  const bottleneck = inferBottleneck(options.bottleneck ?? manifest?.business?.current_bottleneck ?? "validation");
  const capacity = options.capacity ?? "medium";
  const triggers = bottleneckTriggers[bottleneck] ?? [];
  const stageModules = stageBonus[stage] ?? stageBonus.pilot;
  const explicit = new Set(Object.values(manifest?.modules ?? {}).flat().filter(x => typeof x === "string"));
  const signals = scan?.signals ?? {};
  const capacityPenalty = capacity === "low" ? 2 : capacity === "high" ? 0 : 1;
  const candidates = registry.modules.map(mod => {
    const configured = Object.entries(manifest?.modules ?? {}).find(([, ids]) => Array.isArray(ids) && ids.includes(mod.id))?.[0] ?? null;
    let score = 0;
    const reasons = [];
    if (triggers.includes(mod.id)) { score += 5; reasons.push("matches declared bottleneck"); }
    if (stageModules.includes(mod.id)) { score += 3; reasons.push("fits current business stage"); }
    const evidenceMap = {
      "analytics-instrumentation": ["analytics"],
      "sales-pipeline": ["sales_assets"],
      "seo-and-content": ["seo", "public_site"],
      "activation-and-onboarding": ["onboarding"],
      "retention-and-customer-success": ["retention_assets"],
      "customer-support-loop": ["support_assets"],
      "engineering-quality": ["tests", "ci"],
      "legal-and-compliance-review": ["privacy_docs"]
    };
    const detected = (evidenceMap[mod.id] ?? []).filter(k => signals[k] === true);
    if (detected.length) { score -= detected.length * 2; reasons.push("existing repository signals: " + detected.join(", ")); }
    if (mod.risk === "critical") { score -= 10; reasons.push("specialist review cannot be automated"); }
    if (mod.risk === "high") score -= capacityPenalty;
    if (configured === "already_satisfied" || configured === "not_applicable" || configured === "blocked" || configured === "specialist_required") score = -100;
    if (configured === "enabled") { score += 100; reasons.push("explicitly enabled in project manifest"); }
    if (configured === "deferred") { score -= 100; reasons.push("explicitly deferred in project manifest"); }
    return { id: mod.id, group: mod.group, risk: mod.risk ?? "medium", score, configured, reasons, requires: mod.requires ?? [], purpose: mod.purpose };
  });
  const byId = new Map(candidates.map(x => [x.id, x]));
  for (const item of candidates) {
    const unresolved = item.requires.filter(id => {
      const dependency = byId.get(id);
      return !dependency || (dependency.score < 0 && dependency.configured !== "already_satisfied");
    });
    if (unresolved.length && item.score > 0) { item.score = 0; item.reasons.push("dependency not selected: " + unresolved.join(", ")); }
  }
  const selected = candidates.filter(x => x.score > 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
  const limit = capacity === "low" ? 2 : capacity === "high" ? 6 : 4;
  return {
    selection_version: "0.3.0",
    generated_at: new Date().toISOString(),
    inputs: { stage, bottleneck, founder_capacity: capacity },
    selected: selected.slice(0, limit).map(x => ({ ...x, recommendation: "owner_review_required" })),
    deferred: candidates.filter(x => x.score <= 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id)),
    policy: "Selection is a ranked shortlist, not authorization to enable, install, or execute a module. Explicit manifest decisions are respected."
  };
}

export function buildAgentContext(manifest, scan, selection) {
  return {
    context_version: "0.3.0",
    generated_at: new Date().toISOString(),
    project: {
      id: manifest.project?.id ?? null,
      name: manifest.project?.name ?? null,
      mode: manifest.project?.mode ?? null,
      stage: manifest.project?.stage ?? null,
      business_model: manifest.business?.model ?? null,
      market: manifest.business?.market ?? null,
      icp: manifest.business?.icp ?? [],
      bottleneck: manifest.business?.current_bottleneck ?? null,
      value_proposition: manifest.product?.value_proposition ?? null,
      stack: {
        languages: manifest.technology?.languages ?? [],
        frameworks: manifest.technology?.frameworks ?? [],
        infrastructure: manifest.technology?.infrastructure ?? []
      },
      data_sensitivity: manifest.technology?.data_sensitivity ?? "unknown"
    },
    repository: {
      scanned_at: scan.scanned_at ?? null,
      summary: scan.summary ?? {},
      signals: scan.signals ?? {},
      evidence: (scan.evidence ?? []).map(x => ({ capability: x.capability, status: x.status, references: x.evidence ?? [], limitation: x.note ?? null }))
    },
    recommended_modules: (selection.selected ?? []).map(x => ({ id: x.id, purpose: x.purpose, reasons: x.reasons, dependencies: x.requires })),
    operating_rules: [
      "Treat repository signals as evidence of presence, not proof of runtime behaviour or customer outcomes.",
      "Keep assumptions, estimates, direct buyer evidence and observed behaviour separate.",
      "Do not inspect secrets, patient/customer message bodies, production databases or raw logs.",
      "Do not send outreach, publish, spend, or change production without explicit human approval.",
      "Prefer the smallest action that addresses the declared bottleneck."
    ]
  };
}

function assertSafeDestination(root, relative) {
  const parts = relative.split(/[\\/]+/);
  let current = root;
  for (const part of parts) {
    if (!part || part === "." || part === "..") throw new Error("Unsafe apply path.");
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error("Refusing to follow symlink in apply path: " + relative);
  }
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep)) throw new Error("Apply path escapes project root.");
  return resolved;
}

function safeModuleId(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Invalid module id.");
  return id;
}
function moduleArtifact(mod) {
  return [
    "# " + mod.id,
    "",
    mod.purpose ?? "Module workflow",
    "",
    "## Required inputs",
    ...((mod.inputs ?? []).map(x => "- " + x)),
    "",
    "## Expected outputs",
    ...((mod.outputs ?? []).map(x => "- " + x)),
    "",
    "## Dependencies",
    ...((mod.requires ?? []).map(x => "- " + x).length ? (mod.requires ?? []).map(x => "- " + x) : ["- None declared"]),
    "",
    "## Execution checklist",
    "- Confirm the current project bottleneck and owner.",
    "- Gather source-backed evidence; label assumptions and unknowns.",
    "- Define a measurable outcome and acceptance criteria.",
    "- Review privacy, platform, legal and operational risks.",
    "- Obtain explicit approval before external actions, spending, or production changes.",
    "",
    "## Safety",
    "- This runbook is a starting point, not proof of completion.",
    "- Do not read secrets, customer message bodies, patient data, or production exports.",
    "- Do not send outreach, publish, spend, or modify production without separate approval.",
    ""
  ].join("\n");
}

export function buildApplyPlan(projectRoot, moduleIds, registry) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const byId = new Map((registry?.modules ?? []).map(x => [x.id, x]));
  const modules = [...new Set(moduleIds)].map(id => {
    safeModuleId(id);
    const mod = byId.get(id);
    if (!mod) throw new Error("Unknown module: " + id);
    const content = moduleArtifact(mod);
    const relative = ".foundry/modules/" + id + "/README.md";
    const destination = assertSafeDestination(root, relative);
    const exists = fs.existsSync(destination);
    const current = exists && fs.statSync(destination).isFile() ? fs.readFileSync(destination, "utf8") : null;
    return {
      id, path: relative, action: !exists ? "create" : current === content ? "unchanged" : "conflict",
      sha256: hash(content), bytes: Buffer.byteLength(content), content
    };
  });
  return {
    apply_version: "0.3.0",
    project_root: root,
    generated_at: new Date().toISOString(),
    mode: "dry_run",
    modules,
    safe: modules.every(x => x.action !== "conflict"),
    policy: "Only Foundry-generated module runbooks are created. Existing files are never overwritten. No agent instructions, application source, external service, production system, or customer data is modified."
  };
}

export function executeApplyPlan(plan) {
  if (!plan?.safe || !Array.isArray(plan.modules)) throw new Error("Apply plan contains conflicts or is invalid.");
  const root = fs.realpathSync(plan.project_root);
  const lockPath = path.join(root, ".foundry", "applied-modules.json");
  let lock = { schema_version: "0.3", modules: {} };
  if (fs.existsSync(lockPath)) {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (!lock.modules || typeof lock.modules !== "object") throw new Error("Existing apply lock is invalid; refusing to modify it.");
  }
  const created = [];
  for (const item of plan.modules) {
    if (item.action === "unchanged") continue;
    if (item.action !== "create") throw new Error("Refusing to overwrite existing file: " + item.path);
    const destination = assertSafeDestination(root, item.path);
    if (fs.existsSync(destination)) throw new Error("Destination appeared after dry-run: " + item.path);
    const modDir = path.dirname(destination);
    fs.mkdirSync(modDir, { recursive: true });
    const content = moduleArtifactFromPlan(item, plan);
    if (hash(content) !== item.sha256) throw new Error("Generated content hash changed; rerun dry-run.");
    fs.writeFileSync(destination, content, { encoding: "utf8", flag: "wx" });
    lock.modules[item.id] = { path: item.path, sha256: item.sha256, applied_at: new Date().toISOString() };
    created.push(item.path);
  }
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const temp = lockPath + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(lock, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, lockPath);
  return { applied: created, unchanged: plan.modules.filter(x => x.action === "unchanged").map(x => x.path), lockfile: ".foundry/applied-modules.json" };
}

// The plan embeds generated content only through its hash; rebuild from the registry at the CLI boundary.
export function rollbackAppliedModule(projectRoot, moduleId) {
  safeModuleId(moduleId);
  const root = fs.realpathSync(path.resolve(projectRoot));
  const lockPath = path.join(root, ".foundry", "applied-modules.json");
  if (!fs.existsSync(lockPath)) throw new Error("No Foundry apply lock exists.");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const record = lock.modules?.[moduleId];
  if (!record) throw new Error("Module is not recorded as applied: " + moduleId);
  const target = assertSafeDestination(root, record.path);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error("Recorded artifact is missing or unsafe.");
  const content = fs.readFileSync(target, "utf8");
  if (hash(content) !== record.sha256) throw new Error("Artifact changed since apply; refusing destructive rollback.");
  fs.unlinkSync(target);
  try { fs.rmdirSync(path.dirname(target)); } catch { /* Preserve non-empty directories. */ }
  delete lock.modules[moduleId];
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");
  return { removed: record.path, preserved_modified_files: true };
}

function moduleArtifactFromPlan(item, plan) {
  // Apply plans are intentionally self-contained to keep dry-run and execution deterministic.
  return item.content;
}
