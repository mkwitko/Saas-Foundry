import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function writeIfAbsent(filePath, content) {
  if (fs.existsSync(filePath)) return { path: filePath, status: "preserved" };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: "utf8", flag: "wx" });
  return { path: filePath, status: "created" };
}

function detectMode(projectRoot) {
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true })
    .filter(entry => ![".git", ".claude", ".foundry", "node_modules"].includes(entry.name));
  if (entries.length === 0) return "new";
  const knownProjectFiles = [
    "package.json", "pnpm-workspace.yaml", "pyproject.toml", "Cargo.toml",
    "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle",
    "README.md", "src", "app", "apps", "web", "server"
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
  const results = targets.map(relative => writeIfAbsent(path.join(projectRoot, relative), skill));
  const state = `schema_version: "0.1"
project_mode: ${resolvedMode}
initialized_at: ${new Date().toISOString()}
workflow: foundry-run
status: ready
last_run: null
next_action: "Start the foundry-run skill in the coding agent."
`;
  results.push(writeIfAbsent(path.join(projectRoot, ".foundry/state.yaml"), state));
  const readme = `# SaaS Foundry project workspace

This project has the Foundry workflow installed locally.

- Project mode at bootstrap: ${resolvedMode}
- Agent entry point: ${agent}
- Primary skill: `.claude/skills/foundry-run/SKILL.md` (Claude Code) or the corresponding agent skill directory.
- Persistent run state: `.foundry/state.yaml`

Start the `foundry-run` skill. It will inspect this repository, confirm whether the project is greenfield or existing, and run the same end-to-end lifecycle with the appropriate branch. Do not replace existing project instructions or product documentation.
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
