import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function writeIfAbsent(filePath, content) {
  if (fs.existsSync(filePath)) return { path: filePath, status: "preserved" };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return { path: filePath, status: "created" };
}

const LEGACY_FOUNDRY_SKILL_BLOBS = new Set([
  "25c7bce808785b13f125c321fc5eea45f44ce2fd"
]);

function gitBlobSha(content) {
  const body = Buffer.from(content, "utf8");
  return createHash("sha1").update("blob " + body.length + "\0").update(body).digest("hex");
}

function writeOrUpgradeFoundrySkill(filePath, content) {
  if (!fs.existsSync(filePath)) return writeIfAbsent(filePath, content);
  const existing = fs.readFileSync(filePath, "utf8");
  if (existing === content) return { path: filePath, status: "current" };
  if (LEGACY_FOUNDRY_SKILL_BLOBS.has(gitBlobSha(existing))) {
    fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
    return { path: filePath, status: "updated" };
  }
  return { path: filePath, status: "preserved" };
}

function detectMode(projectRoot) {
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true })
    .filter(entry => ![".git", ".claude", ".foundry", "node_modules"].includes(entry.name));
  if (entries.length === 0) return "new";
  const knownProjectFiles = [
    "package.json", "pnpm-workspace.yaml", "pyproject.toml", "Cargo.toml",
    "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle",
    "src", "app", "apps", "web", "server"
  ];
  return knownProjectFiles.some(name => fs.existsSync(path.join(projectRoot, name))) ? "existing" : "new";
}

export function initializeProject({ projectPath, mode = "auto", agent = "claude" }) {
  const projectRoot = path.resolve(projectPath);
  if (!fs.existsSync(projectRoot)) fs.mkdirSync(projectRoot, { recursive: true });
  if (!fs.statSync(projectRoot).isDirectory()) throw new Error("Project path must be a directory.");
  if (!["auto", "new", "existing"].includes(mode)) throw new Error("--mode must be auto, new, or existing.");
  if (!["claude", "codex", "opencode", "all"].includes(agent)) throw new Error("--agent must be claude, codex, opencode, or all.");

  const resolvedMode = mode === "auto" ? detectMode(projectRoot) : mode;
  const targets = agent === "all"
    ? [".claude/skills/foundry-run/SKILL.md", ".agents/skills/foundry-run/SKILL.md", ".opencode/skills/foundry-run/SKILL.md"]
    : [{
        claude: ".claude/skills/foundry-run/SKILL.md",
        codex: ".agents/skills/foundry-run/SKILL.md",
        opencode: ".opencode/skills/foundry-run/SKILL.md"
      }[agent]];

  const skill = fs.readFileSync(path.join(ROOT, "skills/foundry-run/SKILL.md"), "utf8");
  const routing = fs.readFileSync(path.join(ROOT, "catalog/workflow-routing.yaml"), "utf8");
  const stateSchema = fs.readFileSync(path.join(ROOT, "schemas/foundry-state.schema.json"), "utf8");
  const evidenceSchema = fs.readFileSync(path.join(ROOT, "schemas/evidence-ledger.schema.json"), "utf8");
  const evidenceTemplate = fs.readFileSync(path.join(ROOT, "templates/evidence-ledger.yaml"), "utf8");
  const acceptanceSchema = fs.readFileSync(path.join(ROOT, "schemas/acceptance.schema.json"), "utf8");
  const acceptanceTemplate = fs.readFileSync(path.join(ROOT, "templates/acceptance.yaml"), "utf8");
  const artifactSchema = fs.readFileSync(path.join(ROOT, "schemas/artifact-registry.schema.json"), "utf8");
  const artifactContracts = fs.readFileSync(path.join(ROOT, "catalog/artifact-contracts.yaml"), "utf8");
  const artifactTemplate = fs.readFileSync(path.join(ROOT, "templates/artifact-registry.yaml"), "utf8");
  const artifactGuide = fs.readFileSync(path.join(ROOT, "docs/shared-knowledge-and-artifact-contracts.md"), "utf8");
  const revenueSchema = fs.readFileSync(path.join(ROOT, "schemas/revenue-pipeline.schema.json"), "utf8");
  const revenueTemplate = fs.readFileSync(path.join(ROOT, "templates/revenue-pipeline.yaml"), "utf8");
  const results = targets.map(relative => writeOrUpgradeFoundrySkill(path.join(projectRoot, relative), skill));
  const now = new Date().toISOString();
  const state = `schema_version: "0.1"
project_id: null
repository: null
project_mode: ${resolvedMode}
workflow: foundry-run
initialized_at: ${now}
stage: null
selected_task: null
current_bottleneck: null
status: ready
updated_at: ${now}
last_run: null
next_action:
  title: "Run the selected Foundry workflow"
  reason: "Bootstrap completed; inspect the project and choose the highest-value next step."
  owner: agent
  due_date: null
  requires_approval: false
pending_approvals: []
completed_modules: []
`;
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/state.yaml"), state));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/workflow-routing.yaml"), routing));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/state.schema.json"), stateSchema));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/evidence-ledger.schema.json"), evidenceSchema));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/evidence.yaml"), evidenceTemplate.replace("updated_at: null", "updated_at: " + now)));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/acceptance.schema.json"), acceptanceSchema));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/acceptance.yaml"), acceptanceTemplate));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/artifacts.schema.json"), artifactSchema));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/artifact-contracts.yaml"), artifactContracts));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/artifacts.yaml"), artifactTemplate.replace("updated_at: null", "updated_at: " + now)));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/shared-knowledge-and-artifact-contracts.md"), artifactGuide));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/revenue-pipeline.schema.json"), revenueSchema));
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/revenue/pipeline.yaml"), revenueTemplate.replace("updated_at: null", "updated_at: " + now)));
  const readme = `# SaaS Foundry project workspace

This project has the Foundry workflow installed locally.

- Project mode at bootstrap: ${resolvedMode}
- Agent entry point: ${agent}
- Primary skill: ${targets[0]}.
- Persistent run state: .foundry/state.yaml
- Evidence, decisions and experiments: .foundry/evidence.yaml
- Module routing: .foundry/workflow-routing.yaml
- Shared artifact registry: .foundry/artifacts.yaml
- Shared artifact contracts: .foundry/artifact-contracts.yaml
- Artifact registry schema: .foundry/artifacts.schema.json
- State contract: .foundry/state.schema.json
- Evidence contract: .foundry/evidence-ledger.schema.json
- Module acceptance records: .foundry/acceptance.yaml
- Acceptance contract: .foundry/acceptance.schema.json
- Company-level revenue pipeline: .foundry/revenue/pipeline.yaml
- Revenue pipeline schema: .foundry/revenue-pipeline.schema.json

The artifact registry maps specialist work to canonical project documents. It does not create duplicate business, product, design or marketing documents. Map existing sources of truth before creating new files. See .foundry/shared-knowledge-and-artifact-contracts.md for the operating rules.

Run the foundry-run skill or execute SaaS Foundry with a focused task. The workflow inspects this repository, confirms whether it is greenfield or existing, and reuses the appropriate capabilities. Existing instructions and product documentation are never replaced.
`;
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/README.md"), readme));
  return {
    project_root: projectRoot,
    project_mode: resolvedMode,
    agent,
    skill_entrypoint: targets,
    results,
    next_step: agent === "claude"
      ? "Open Claude Code in this project and invoke /foundry-run, or ask Claude to run the installed Foundry workflow."
      : "Open the selected coding agent in this project and invoke the foundry-run skill."
  };
}
