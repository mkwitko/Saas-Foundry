import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse as parseYaml } from "yaml";

const MAX_TEXT_BYTES = 256 * 1024;
const MAX_FILES = 5000;
const MAX_DEPTH = 9;
const SKIP_DIRS = new Set([
  ".git", ".next", ".nuxt", ".output", ".turbo", ".vercel", ".cache",
  "node_modules", "vendor", "dist", "build", "coverage", "playwright-report",
  "test-results", ".venv", "venv", "__pycache__", ".idea", ".vscode",
  "uploads", "storage", "backups", "tmp", "temp"
]);
const SENSITIVE_NAME = /(^\.env($|\.)|secret|credential|token|private.?key|\.pem$|\.p12$|\.pfx$|\.key$|\.dump$|\.sql$|\.sqlite|\.db$|backup|patient|medical.?record|message.?body|attachment)/i;
const TEXT_DOC = /^(README|AGENTS|CLAUDE|PRODUCT|DESIGN|ROADMAP|CONTRIBUTING|SECURITY|PRIVACY|CHANGELOG)(\.[^.]+)?$/i;
const SAFE_DOC_EXT = new Set([".md", ".mdx", ".txt"]);
const STATUS_KEYS = ["enabled", "deferred", "blocked", "already_satisfied", "not_applicable", "specialist_required"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function readText(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > MAX_TEXT_BYTES) return null;
  return fs.readFileSync(file, "utf8");
}
function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}
function walk(root) {
  const files = [];
  const skipped = new Set();
  function visit(dir, depth) {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { skipped.add(path.relative(root, dir) || "."); return; }
    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (SENSITIVE_NAME.test(entry.name)) {
        skipped.add(relative);
        continue;
      }
      if (entry.isSymbolicLink()) {
        skipped.add(relative + " (symlink)");
        continue;
      }
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".foundry")) {
          skipped.add(relative + "/");
          continue;
        }
        visit(absolute, depth + 1);
      } else if (entry.isFile()) {
        files.push({ path: relative, ext: path.extname(entry.name).toLowerCase(), name: entry.name, size: safeSize(absolute) });
      }
    }
  }
  visit(root, 0);
  return { files: files.sort((a,b)=>a.path.localeCompare(b.path)), skipped: [...skipped].sort() };
}
function safeSize(file) {
  try { return fs.statSync(file).size; } catch { return 0; }
}
function loadManifest(root) {
  const candidates = [".foundry/project.yaml", ".foundry/project.yml"];
  for (const relative of candidates) {
    const absolute = path.join(root, relative);
    if (fs.existsSync(absolute) && isInside(root, absolute)) {
      const raw = readText(absolute);
      if (raw === null) throw new Error("Project manifest is too large or unreadable.");
      return { path: relative, raw, data: parseYaml(raw) };
    }
  }
  return null;
}
function getPackageJson(root, files) {
  const packages = [];
  for (const file of files.filter(x => x.name === "package.json" && !x.path.split("/").some(p => SKIP_DIRS.has(p))).slice(0, 80)) {
    const absolute = path.join(root, file.path);
    try {
      const raw = readText(absolute);
      if (!raw) continue;
      const pkg = JSON.parse(raw);
      packages.push({
        path: file.path,
        name: typeof pkg.name === "string" ? pkg.name : null,
        private: pkg.private === true,
        packageManager: pkg.packageManager ?? null,
        engines: pkg.engines ?? {},
        scripts: Object.keys(pkg.scripts ?? {}),
        dependencies: Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) })
      });
    } catch {
      packages.push({ path: file.path, parse_error: true });
    }
  }
  return packages;
}
function detectSignals(files, packages, safeDocs) {
  const paths = files.map(x => x.path.toLowerCase());
  const packageNames = packages.flatMap(x => x.dependencies ?? []).map(x => x.toLowerCase());
  const docText = safeDocs.map(x => x.content).join("\n").toLowerCase();
  const hasPath = (...patterns) => paths.some(p => patterns.some(pattern => pattern.test(p)));
  const hasPkg = (...names) => packageNames.some(p => names.some(n => p.includes(n)));
  const hasText = (...terms) => terms.some(term => docText.includes(term));
  return {
    monorepo: hasPath(/pnpm-workspace\.yaml$/, /turbo\.json$/, /nx\.json$/) || packages.length > 2,
    tests: hasPath(/(^|\/)(test|tests|__tests__|spec)(\/|\.)/, /\.(test|spec)\.[cm]?[jt]sx?$/) || packages.some(p => p.scripts?.some(s => /test|vitest|jest|playwright|cypress/.test(s))),
    ci: hasPath(/^\.github\/workflows\//, /^\.gitlab-ci\.yml$/, /^\.circleci\//),
    public_site: hasPath(/(^|\/)(astro\.config\.|next\.config\.|vite\.config\.)/, /(^|\/)(pages|app|website|site)\//, /sitemap\.xml$/),
    seo: hasPath(/sitemap\.xml$/, /robots\.txt$/, /(^|\/)(astro\.config\.|next\.config\.)/) || hasText("search console", "seo", "structured data", "schema.org"),
    analytics: hasPkg("posthog", "plausible", "umami", "amplitude", "mixpanel", "segment") || hasText("analytics event", "event taxonomy", "metric dictionary"),
    billing: hasPkg("stripe", "paddle", "lemonsqueezy") || hasText("subscription", "billing provider", "payment webhook"),
    auth: hasPkg("auth", "clerk", "better-auth", "lucia", "passport", "next-auth") || hasPath(/auth|login|session|permission/),
    database: hasPkg("prisma", "drizzle", "typeorm", "sequelize", "knex", "pg", "postgres", "mongodb") || hasPath(/schema\.prisma$/, /migrations\//),
    integrations: hasPath(/webhook|integration|provider|adapter/),
    onboarding: hasPath(/onboarding|invite|waitlist|activation|setup/),
    sales_assets: hasPath(/sales|prospect|demo|proposal|crm|pipeline/) || hasText("sales process", "demo script", "sales pipeline"),
    pricing_assets: hasPath(/pricing|billing|plans?\.(md|mdx|json|ya?ml)$/) || hasText("unit economics", "pricing strategy", "pricing model"),
    product_docs: hasPath(/(^|\/)(product|prd|spec|requirements|roadmap)(\.|\/|$)/) || hasText("product requirements", "product strategy"),
    privacy_docs: hasPath(/privacy|security|data.?protection|lgpd/) || hasText("privacy policy", "data protection", "lgpd"),
    support_assets: hasPath(/support|help.?center|faq|status.?page/),
    retention_assets: hasPath(/retention|churn|customer.?success|lifecycle/),
    customer_research: hasPath(/interview|customer.?research|voice.?of.?customer|feedback/),
    content_assets: hasPath(/(^|\/)(blog|content|articles?)\//),
    referral_assets: hasPath(/referral|affiliate|partner|ambassador/),
    observability: hasPkg("sentry", "datadog", "opentelemetry", "langfuse", "axiom") || hasPath(/monitoring|observability|telemetry/)
  };
}

export function scanRepository(inputPath) {
  const root = fs.realpathSync(path.resolve(inputPath));
  if (!fs.statSync(root).isDirectory()) throw new Error("Scan target must be a directory.");
  const { files, skipped } = walk(root);
  const manifest = loadManifest(root);
  const packages = getPackageJson(root, files);
  const docs = [];
  for (const file of files) {
    const base = path.basename(file.path);
    const allowedNamedDoc = TEXT_DOC.test(base);
    const allowedProjectDoc = file.path.startsWith("docs/") && SAFE_DOC_EXT.has(file.ext);
    if (!(allowedNamedDoc || allowedProjectDoc)) continue;
    const content = readText(path.join(root, file.path));
    if (content === null) continue;
    docs.push({ path: file.path, content });
  }
  const signals = detectSignals(files, packages, docs);
  const publicFiles = files.map(({path,size,ext})=>({path,size,ext}));
  const evidence = [];
  const add = (capability, present, refs, note) => evidence.push({
    capability, status: present ? "present" : "unknown",
    evidence: refs.slice(0, 8), confidence: present ? "medium" : "low",
    note: present ? note : "No matching evidence found in the inspected repository scope; absence is not proof that the capability does not exist."
  });
  add("automated_tests", signals.tests, files.filter(x => /(^|\/)(test|tests|__tests__|spec)(\/|\.)|\.(test|spec)\./i.test(x.path)).map(x=>x.path), "Test files or test scripts are present; execution and coverage were not verified.");
  add("continuous_integration", signals.ci, files.filter(x=>x.path.startsWith(".github/workflows/")||x.path===".gitlab-ci.yml").map(x=>x.path), "CI configuration is present; workflow health was not checked.");
  add("analytics", signals.analytics, packages.filter(x=>x.dependencies?.some(d=>/posthog|plausible|umami|amplitude|mixpanel|segment/i.test(d))).map(x=>x.path), "Analytics dependency or documented metric artifacts detected; event quality and delivery were not verified.");
  add("billing", signals.billing, packages.filter(x=>x.dependencies?.some(d=>/stripe|paddle|lemonsqueezy/i.test(d))).map(x=>x.path), "Billing dependency or subscription documentation detected; live payment flow was not tested.");
  add("sales_assets", signals.sales_assets, files.filter(x=>/sales|prospect|demo|proposal|crm|pipeline/i.test(x.path)).map(x=>x.path), "Sales-related assets detected; real pipeline activity was not verified.");
  add("customer_lifecycle", signals.onboarding||signals.retention_assets||signals.support_assets, files.filter(x=>/onboarding|invite|waitlist|activation|support|retention|churn/i.test(x.path)).map(x=>x.path), "Lifecycle-related assets detected; customer outcomes were not verified.");
  const safeDocsMeta = docs.map(({path,content})=>({path,bytes:Buffer.byteLength(content),sha256:sha256(content)}));
  const manifestMeta = manifest ? { path: manifest.path, sha256: sha256(manifest.raw), parse_ok: !!manifest.data && typeof manifest.data === "object" } : null;
  return {
    scanner_version: "0.2.0",
    scanned_at: new Date().toISOString(),
    root,
    summary: {
      files_inspected: files.length,
      safe_documents_read: docs.length,
      package_manifests: packages.length,
      skipped_paths: skipped.length,
      truncated: files.length >= MAX_FILES
    },
    manifest: manifestMeta,
    packages,
    signals,
    evidence,
    inventory: publicFiles,
    documents: safeDocsMeta,
    exclusions: {
      policy: "Metadata-first. No source-code bodies, environment files, secrets, databases, production logs, customer content or uploaded files are read.",
      skipped_paths: skipped,
      sensitive_name_rule: SENSITIVE_NAME.toString(),
      max_text_bytes: MAX_TEXT_BYTES,
      max_files: MAX_FILES,
      max_depth: MAX_DEPTH
    },
    limitations: [
      "A file, dependency or route name is evidence of presence only, not proof of working or production behaviour.",
      "No tests, builds, runtime endpoints, cloud accounts, billing providers or production systems were accessed.",
      "No customer, patient, message, attachment, database or secret content was inspected.",
      "The scanner is deterministic and does not infer market demand, willingness to pay or customer satisfaction."
    ]
  };
}

function moduleStatusMap(manifest) {
  const map = new Map();
  for (const key of STATUS_KEYS) {
    for (const id of manifest?.modules?.[key] ?? []) map.set(id, key);
  }
  return map;
}
function moduleEvidence(id, signals) {
  const mapping = {
    "analytics-instrumentation": ["analytics"],
    "sales-pipeline": ["sales_assets"],
    "seo-and-content": ["seo", "public_site"],
    "activation-and-onboarding": ["onboarding"],
    "retention-and-customer-success": ["retention_assets", "support_assets"],
    "customer-support-loop": ["support_assets"],
    "customer-research-loop": ["customer_research"],
    "referrals-and-partnerships": ["referral_assets"],
    "pricing-and-unit-economics": ["pricing_assets", "billing"],
    "engineering-quality": ["tests", "ci"],
    "legal-and-compliance-review": ["privacy_docs"]
  };
  return (mapping[id] ?? []).filter(key => signals[key] === true);
}
function riskOrder(risk) {
  return ({ low: 1, medium: 2, high: 3, critical: 4 })[risk] ?? 2;
}
export function buildPlan(scan, manifest, registry) {
  if (!manifest || typeof manifest !== "object") throw new Error("A valid .foundry/project.yaml is required to create a plan.");
  const modules = registry?.modules;
  if (!Array.isArray(modules)) throw new Error("catalog/modules.yaml must contain a modules array.");
  const statuses = moduleStatusMap(manifest);
  const signals = scan?.signals ?? {};
  const entries = modules.map(mod => {
    const status = statuses.get(mod.id);
    const refs = moduleEvidence(mod.id, signals);
    const configured = status ?? (mod.ia_chat === "already_satisfied" ? "already_satisfied" : mod.ia_chat === "specialist_required" ? "specialist_required" : null);
    let decision, reason;
    if (configured === "already_satisfied") {
      decision = "already_satisfied"; reason = "The project manifest marks this capability as already satisfied; reopen only if new evidence invalidates it.";
    } else if (configured === "not_applicable") {
      decision = "not_applicable"; reason = "The project owner explicitly marked this module as not applicable.";
    } else if (configured === "blocked") {
      decision = "blocked"; reason = "The project manifest marks this module as blocked.";
    } else if (configured === "specialist_required" || riskOrder(mod.risk) === 4) {
      decision = "needs_specialist"; reason = "This capability requires qualified specialist review; the Foundry cannot certify compliance or replace professional advice.";
    } else if (configured === "enabled") {
      decision = "recommended_now"; reason = "The project manifest explicitly enables this module.";
    } else if (configured === "deferred") {
      decision = "optional_later"; reason = "The project manifest defers this module.";
    } else if (configured) {
      decision = "optional_later"; reason = "The project manifest contains a status not understood by this CLI; owner review is required.";
    } else {
      decision = "needs_owner_decision"; reason = "No explicit project decision exists for this module; the scanner will not enable it automatically.";
    }
    const evidenceNote = refs.length ? ` Repository signals: ${refs.join(", ")}.` : "";
    return {
      id: mod.id, group: mod.group, risk: mod.risk ?? "medium", decision,
      purpose: mod.purpose, requires: mod.requires ?? [], evidence_signals: refs,
      reason: reason + evidenceNote,
      outputs: mod.outputs ?? [],
      owner_action: decision === "needs_specialist" ? "Assign a qualified professional and record the scope of review." : decision === "recommended_now" ? "Confirm owner, scope and acceptance criteria before execution." : "No action until the owner changes the project decision."
    };
  });
  const byId = new Map(entries.map(x=>[x.id,x]));
  for (const entry of entries) {
    const unresolved = entry.requires.filter(dep => {
      const target = byId.get(dep);
      return !target || !["already_satisfied","recommended_now"].includes(target.decision);
    });
    if (entry.decision === "recommended_now" && unresolved.length) {
      entry.decision = "blocked";
      entry.reason += ` Missing or unresolved dependencies: ${unresolved.join(", ")}.`;
    }
  }
  const rank = { recommended_now: 0, needs_specialist: 1, blocked: 2, needs_owner_decision: 3, optional_later: 4, already_satisfied: 5, not_applicable: 6 };
  entries.sort((a,b)=>(rank[a.decision]-rank[b.decision]) || riskOrder(b.risk)-riskOrder(a.risk) || a.id.localeCompare(b.id));
  return {
    planner_version: "0.2.0",
    generated_at: new Date().toISOString(),
    project: { id: manifest.project?.id ?? "unknown", name: manifest.project?.name ?? "Unnamed project" },
    source_scan: { scanned_at: scan?.scanned_at ?? null, root: scan?.root ?? null },
    summary: Object.fromEntries(Object.keys(rank).map(k=>[k,entries.filter(x=>x.decision===k).length])),
    principles: [
      "This is a deterministic recommendation based on the manifest and repository signals, not an autonomous business decision.",
      "Do not install modules or contact customers from a plan command.",
      "A specialist-required module is not a compliance certification."
    ],
    modules: entries
  };
}

export function validateProject(manifest, registry) {
  const errors = [];
  const warnings = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return { valid: false, errors: ["Manifest must be a YAML object."], warnings };
  for (const key of ["schema_version","project","business","product","technology","goals"]) {
    if (!(key in manifest)) errors.push(`Missing required top-level field: ${key}`);
  }
  if (manifest.schema_version !== "0.1") errors.push("schema_version must be 0.1 for this CLI.");
  const p = manifest.project ?? {};
  for (const key of ["id","name","repository","mode","stage"]) if (!p[key]) errors.push(`project.${key} is required.`);
  if (p.id && !/^[a-z0-9-]+$/.test(p.id)) errors.push("project.id must use lowercase letters, digits and hyphens.");
  if (p.mode && !["new","adopt","upgrade"].includes(p.mode)) errors.push("project.mode must be new, adopt or upgrade.");
  for (const [section, keys] of [["business",["model","market","geography","icp"]],["product",["category","value_proposition","maturity"]],["technology",["languages","frameworks","data_sensitivity"]],["goals",["primary","success_signals"]]]) {
    for (const key of keys) if (manifest[section]?.[key] === undefined || manifest[section]?.[key] === null) errors.push(`${section}.${key} is required.`);
  }
  const known = new Set((registry?.modules ?? []).map(m=>m.id));
  const seen = new Map();
  for (const status of STATUS_KEYS) {
    for (const id of manifest.modules?.[status] ?? []) {
      if (!known.has(id)) errors.push(`Unknown module in modules.${status}: ${id}`);
      if (seen.has(id)) errors.push(`Module ${id} appears in both modules.${seen.get(id)} and modules.${status}.`);
      seen.set(id,status);
    }
  }
  for (const mod of registry?.modules ?? []) {
    for (const dep of mod.requires ?? []) if (!known.has(dep)) errors.push(`Registry module ${mod.id} requires unknown module ${dep}.`);
  }
  const moduleById = new Map((registry?.modules ?? []).map(m=>[m.id,m]));
  for (const [id,status] of seen) {
    if (status !== "enabled") continue;
    const mod=moduleById.get(id);
    for (const dep of mod?.requires ?? []) {
      if (!seen.has(dep) || !["enabled","already_satisfied"].includes(seen.get(dep))) warnings.push(`Enabled module ${id} depends on ${dep}, which is not enabled or marked already_satisfied.`);
    }
  }
  if (!manifest.modules) warnings.push("No module decisions are recorded; planner will require owner decisions.");
  return { valid: errors.length===0, errors, warnings, module_count: known.size, classified_module_count: seen.size };
}

export function loadFoundryContext(projectPath, foundryPath) {
  const projectRoot = fs.realpathSync(path.resolve(projectPath));
  const manifestPath = path.join(projectRoot, ".foundry", "project.yaml");
  if (!fs.existsSync(manifestPath)) throw new Error("No .foundry/project.yaml found in target. Run 'foundry init' is not available yet; create the manifest first.");
  const manifestRaw = readText(manifestPath);
  if (manifestRaw === null) throw new Error("Project manifest is too large or unreadable.");
  const manifest = parseYaml(manifestRaw);
  const catalogPath = path.join(foundryPath, "catalog", "modules.yaml");
  const catalogRaw = readText(catalogPath);
  if (catalogRaw === null) throw new Error("Could not read Foundry catalog/modules.yaml.");
  const registry = parseYaml(catalogRaw);
  return { projectRoot, manifest, registry };
}

export function formatMarkdownScan(scan) {
  const rows = scan.evidence.map(x=>`| ${x.capability} | ${x.status} | ${x.evidence.join(", ") || "—"} |`).join("\n");
  return `# Repository scan\n\n- **Root:** ${scan.root}\n- **Scanned:** ${scan.scanned_at}\n- **Files inventoried:** ${scan.summary.files_inspected}\n- **Safe documents read:** ${scan.summary.safe_documents_read}\n- **Package manifests:** ${scan.summary.package_manifests}\n- **Skipped paths:** ${scan.summary.skipped_paths}\n\n## Capability evidence\n\n| Capability | Status | Evidence paths |\n|---|---|---|\n${rows}\n\n## Signals\n\n${Object.entries(scan.signals).map(([k,v])=>`- ${k}: ${v ? "detected" : "not detected"}`).join("\n")}\n\n## Safety limits\n\n${scan.limitations.map(x=>`- ${x}`).join("\n")}\n\nSkipped paths are listed in the JSON report.\n`;
}
export function formatMarkdownPlan(plan) {
  const rows=plan.modules.map(m=>`| ${m.id} | ${m.decision} | ${m.risk} | ${m.reason.replaceAll("|","\\|")} |`).join("\n");
  return `# Foundry plan: ${plan.project.name}\n\nGenerated: ${plan.generated_at}\n\n## Summary\n\n${Object.entries(plan.summary).map(([k,v])=>`- ${k}: ${v}`).join("\n")}\n\n## Module decisions\n\n| Module | Decision | Risk | Reason |\n|---|---|---|---|\n${rows}\n\n## Guardrails\n\n${plan.principles.map(x=>`- ${x}`).join("\n")}\n`;
}
