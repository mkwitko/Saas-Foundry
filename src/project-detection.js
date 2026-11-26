import fs from "node:fs";
import path from "node:path";

const PROJECT_MARKERS = [
  "package.json", "pnpm-workspace.yaml", "yarn.lock", "pnpm-lock.yaml",
  "package-lock.json", "pyproject.toml", "requirements.txt", "Cargo.toml",
  "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle",
  "deno.json", "bun.lockb", "bun.lock", "mix.exs", "pubspec.yaml",
  "Dockerfile", "docker-compose.yml", "compose.yaml", "Makefile",
  "src", "app", "apps", "web", "server", "client", "api"
];

function readPackageSummary(root) {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      name: typeof pkg.name === "string" ? pkg.name : null,
      description: typeof pkg.description === "string" ? pkg.description : null,
      scripts: Object.keys(pkg.scripts ?? {}),
      dependencies: Object.keys(pkg.dependencies ?? {}).length,
      devDependencies: Object.keys(pkg.devDependencies ?? {}).length
    };
  } catch {
    return { invalid: true };
  }
}

export function detectProject(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("The current working directory must exist and be a directory.");
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const names = new Set(entries.map(entry => entry.name));
  const markers = PROJECT_MARKERS.filter(name => names.has(name));
  const gitRepository = names.has(".git");
  const foundryWorkspace = names.has(".foundry");
  const packageSummary = readPackageSummary(root);
  const existing = gitRepository || foundryWorkspace || markers.length > 0;
  return {
    root,
    existing,
    confidence: gitRepository || markers.length >= 2 || foundryWorkspace ? "high" : markers.length === 1 ? "medium" : "low",
    signals: { git_repository: gitRepository, foundry_workspace: foundryWorkspace, markers, package: packageSummary },
    recommendation: existing ? "existing" : "new"
  };
}

export function slugifyProjectName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function resolveNewWorkspace({ cwd = process.cwd(), name }) {
  const root = path.resolve(cwd);
  const slug = slugifyProjectName(name);
  if (!slug) throw new Error("Project name must contain at least one letter or number.");
  const entries = fs.readdirSync(root).filter(entry => entry !== ".DS_Store");
  if (entries.length === 0) return root;
  const destination = path.join(root, slug);
  if (fs.existsSync(destination)) throw new Error("Workspace already exists: " + destination);
  fs.mkdirSync(destination, { recursive: true });
  return destination;
}
