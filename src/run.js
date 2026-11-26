import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { initializeProject } from "./init.js";

function parseGitHubUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
  const parts = url.pathname.replace(/\\.git$/, "").split("/").filter(Boolean);
  if (parts.length !== 2 || parts.some(part => part === "." || part === "..")) {
    throw new Error("GitHub URL must have the form https://github.com/OWNER/REPOSITORY.");
  }
  return { owner: parts[0], repo: parts[1] };
}

function resolveTarget(target, destination) {
  const remote = parseGitHubUrl(target);
  if (!remote) return path.resolve(target);
  const projectRoot = path.resolve(destination ?? remote.repo);
  if (fs.existsSync(projectRoot)) throw new Error(`Destination already exists; refusing to overwrite: ${projectRoot}`);
  const clone = spawnSync("git", ["clone", "--", `https://github.com/${remote.owner}/${remote.repo}.git`, projectRoot], { stdio: "inherit" });
  if (clone.error) throw new Error(`Could not run git clone: ${clone.error.message}`);
  if (clone.status !== 0) throw new Error("git clone failed. Check repository visibility and GitHub authentication.");
  return projectRoot;
}

export function runFoundry({ target, destination, mode = "auto", launch = true }) {
  if (!target) throw new Error("run requires a project path or GitHub repository URL.");
  const projectRoot = resolveTarget(target, destination);
  const initialized = initializeProject({ projectPath: projectRoot, mode, agent: "claude" });
  if (!launch) return { project_root: projectRoot, initialized, launched: false };
  const prompt = "Use the project-local foundry-run skill and execute the complete SaaS Foundry workflow now. First classify this repository as greenfield or existing from inspected evidence. Follow all evidence, privacy, safety, and approval gates. Do not stop at a report: complete all safe research, local implementation, verification, and persistent state updates.";
  const child = spawn("claude", [prompt], { cwd: projectRoot, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.once("error", error => reject(new Error(`Could not launch Claude Code: ${error.message}. The Foundry skill was installed at ${projectRoot}; open Claude Code there and invoke /foundry-run.`)));
    child.once("exit", (code, signal) => resolve({ project_root: projectRoot, initialized, launched: true, exit_code: code, signal }));
  });
}
