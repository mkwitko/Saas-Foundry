#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  scanRepository, buildPlan, validateProject, loadFoundryContext,
  formatMarkdownScan, formatMarkdownPlan
} from "./core.js";
import { buildEvidenceReport, diffScans, selectModules, buildAgentContext, buildApplyPlan, executeApplyPlan, rollbackAppliedModule } from "./v3.js";
import { listInstallableResources, buildResourceInstallPlan, executeResourceInstall, inspectResourceDrift, buildResourceUninstallPlan, executeResourceUninstall, buildResourceUpdatePlan, executeResourceUpdate, buildResourceRollbackPlan, rollbackResourceUpdate } from "./v4.js";
import { runCodeAudit } from "./agents.js";
import { initializeProject } from "./init.js";
import { runFoundry, getFoundryStatus, listFoundryRuns } from "./run.js";
import { runInteractive } from "./interactive.js";
import { buildDependencyPlan, verifyDefinitionOfDone } from "./planner.js";
import { initializeVisualAudit, runVisualAudit, readVisualAuditReport } from "./visual-audit.js";\nimport { readCustomerIntelligenceInput, formatCustomerIntelligenceMarkdown } from "./customer-intelligence.js";

const FOUNDRY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [command, ...rest] = process.argv.slice(2);

function usage() {
  return `SaaS Foundry CLI v0.10.0

Usage:
  foundry [interactive]
  foundry run <project-path|github-url> [--task auto|full|idea|product|sales|growth|review] [--dir <path>] [--mode auto|new|existing] [--agent claude|codex|opencode]
  foundry status <project-path> [--format json|md]
  foundry runs <project-path> [--limit 10] [--format json|md]
  foundry scan <project-path> [--format json|md] [--out <file>]
  foundry plan <project-path> [--scan <scan.json>] [--format json|md] [--out <file>]
  foundry doctor <project-path> [--strict]
  foundry evidence <scan.json> [--format json|md] [--out <file>]
  foundry diff <previous-scan.json> <current-scan.json> [--format json|md]
  foundry context <project-path> [--stage <stage>] [--bottleneck <name>] [--capacity low|medium|high]
  foundry select <project-path> [--stage <stage>] [--bottleneck <name>] [--capacity low|medium|high]
  foundry apply <project-path> --module <id[,id...]> [--execute]
  foundry rollback <project-path> --module <id>
  foundry resources [--format json|md]
  foundry install <project-path> --resource <id> --from <git-checkout> --commit <sha> --license <id> --reviewed [--source-path <path>] [--target <path>] [--allow-scripts] [--execute]
  foundry drift <project-path> [--resource <id>]
  foundry update <project-path> --resource <id> --from <git-checkout> --commit <sha> --license <id> --reviewed [--source-path <path>] [--allow-scripts] [--execute]
  foundry rollback-resource <project-path> --resource <id> [--execute]
  foundry uninstall <project-path> --resource <id> [--execute]
  foundry init <project-path> [--mode auto|new|existing] [--agent claude|codex|opencode|all]
  foundry agent-audit <project-path> [--agent claude|codex] [--timeout-ms <ms>] [--format json] [--out <file>]
  foundry customer-intel report <project-path> [--input <sanitized-summary.json>] [--format json|md]

Run tasks:
  auto     Find the highest-value bottleneck (default)
  full     Review the complete SaaS lifecycle
  idea     Validate a new SaaS opportunity
  product  Review UX, React/Node engineering and product quality
  sales    Improve founder-led sales and paid conversion
  growth   Improve acquisition, activation, retention and referrals
  review   Read-only diagnosis; no implementation

Safety:
  scan, plan, doctor, select, context, evidence, diff, resources, drift, status, runs, sequence, verify and visual-audit report are read-only. visual-audit init creates only missing audit files; visual-audit run writes reports and screenshots.
  Resource install/update/uninstall are dry-run by default; --execute is required to write.
  Outreach, publishing, paid spend, deployment and production changes require explicit approval.
`;
}
function parseArgs(args) {
  const positional=[];
  const options={};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==="--strict" || arg==="--execute" || arg==="--reviewed" || arg==="--allow-scripts"){ options[arg.slice(2)]=true; continue; }
    if(["--format","--out","--scan","--foundry","--previous","--module","--stage","--bottleneck","--capacity","--resource","--from","--source-path","--target","--commit","--license","--agent","--timeout-ms","--mode","--dir","--task","--limit","--base-url","--input"].includes(arg)){
      if(!args[i+1] || args[i+1].startsWith("--")) throw new Error(`Option ${arg} requires a value.`);
      options[arg.slice(2)]=args[++i];
      continue;
    }
    if(arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }
  return {positional,options};
}
function emit(value, options, defaultFormat="md") {
  const format=options.format ?? defaultFormat;
  if(!["json","md"].includes(format)) throw new Error("--format must be json or md.");
  const output=format==="json" ? JSON.stringify(value?.data ?? value,null,2)+"\n" : (value.kind==="scan" ? formatMarkdownScan(value.data) : value.kind==="plan" ? formatMarkdownPlan(value.data) : value.kind==="status" ? formatMarkdownStatus(value.data) : value.kind==="runs" ? formatMarkdownRuns(value.data) : JSON.stringify(value.data,null,2)+"\n");
  if(options.out){
    const destination=path.resolve(options.out);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,output,{encoding:"utf8",flag:"w"});
    process.stdout.write(`Wrote ${destination}\n`);
  } else process.stdout.write(output);
}
function formatMarkdownStatus(status) {
  const lines = [
    "# SaaS Foundry status",
    "",
    "- Project mode: " + status.project_mode,
    "- Status: " + status.status,
    "- Stage: " + (status.stage ?? "not defined"),
    "- Selected task: " + (status.selected_task ?? "none"),
    "- Current bottleneck: " + (status.current_bottleneck ?? "not identified"),
    "",
    "",
    "## Evidence freshness",
    "- Claims: " + status.evidence.total_claims,
    "- Stale claims: " + status.evidence.stale_claims.length,
    "- Unvalidated / synthetic claims: " + status.evidence.unvalidated_claims,
    "- Decisions: " + status.evidence.decisions,
    "- Active experiments: " + status.evidence.active_experiments,
    ...status.evidence.stale_claims.map(item => "- Stale: " + item.id + " — " + item.claim),
    "",
    "## Last run"
  ];
  if (status.last_run) {
    lines.push(
      "- Task: " + status.last_run.task,
      "- Agent: " + status.last_run.agent,
      "- Result: " + status.last_run.status,
      "- Started: " + status.last_run.started_at,
      "- Completed: " + (status.last_run.completed_at ?? "in progress"),
      "- Modules: " + status.last_run.modules_completed.length + "/" + status.last_run.modules_selected.length,
      "- Blockers: " + (status.last_run.blockers.join("; ") || "none")
    );
  } else lines.push("- No runs recorded.");
  lines.push("", "## Next action", status.next_action ? "- " + status.next_action.title + " (owner: " + status.next_action.owner + ")" : "- Not defined");
  lines.push("", "## Pending approvals", status.pending_approvals.length ? status.pending_approvals.map(item => "- " + item).join("\n") : "- None");
  return lines.join("\n") + "\n";
}
function formatMarkdownRuns(runs) {
  if (!runs.length) return "No Foundry runs recorded yet.\n";
  const lines = ["# SaaS Foundry run history", "", "| Started | Task | Agent | Outcome | Modules |", "|---|---|---|---|---|"];
  for (const run of runs) {
    lines.push("| " + (run.started_at ?? "") + " | " + (run.task ?? "") + " | " + (run.agent ?? "") + " | " + (run.outcome ?? run.status ?? "") + " | " + (run.modules_completed?.length ?? 0) + "/" + (run.modules_selected?.length ?? 0) + " |");
  }
  return lines.join("\n") + "\n";
}
function loadJson(file){
  const raw=fs.readFileSync(path.resolve(file),"utf8");
  return JSON.parse(raw);
}
async function main(){
  if(!command || command==="interactive") {
    await runInteractive({ cwd: process.cwd() }); return;
  }
  if(command==="help" || command==="--help" || command==="-h"){
    process.stdout.write(usage()); return;
  }
  const {positional,options}=parseArgs(rest);
  if(command==="customer-intel") {
    const [action, projectPath, ...extra] = positional;
    if(action !== "report" || !projectPath || extra.length) throw new Error("Usage: customer-intel report <project-path> [--input <sanitized-summary.json>].");
    const {file, report} = readCustomerIntelligenceInput(projectPath, options.input);
    const format = options.format ?? "md";
    if(!["json","md"].includes(format)) throw new Error("--format must be json or md.");
    const output = format === "json" ? JSON.stringify({source:file, ...report}, null, 2) + "\n" : formatCustomerIntelligenceMarkdown(report);
    if(options.out) {
      const destination=path.resolve(options.out);
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      fs.writeFileSync(destination,output,{encoding:"utf8",flag:"w"});
      process.stdout.write("Wrote " + destination + "\n");
    } else process.stdout.write(output + (output.endsWith("\n") ? "" : "\n"));
    return;
  }
  if(command==="visual-audit") {
    const [action, projectPath, ...extra] = positional;
    if(!["init","run","report"].includes(action)) throw new Error("visual-audit action must be init, run or report.");
    if(!projectPath || extra.length) throw new Error("Usage: visual-audit <init|run|report> <project-path>.");
    if(action==="init") {
      const result=initializeVisualAudit(projectPath,{baseURL:options["base-url"]});
      emit({kind:"visual-audit-init",data:result},options,"json");
      return;
    }
    if(action==="report") {
      const report=readVisualAuditReport(projectPath);
      emit({kind:"visual-audit-report",data:report},options,"json");
      if(report.available && report.summary.failed>0) process.exitCode=1;
      return;
    }
    const result=runVisualAudit(projectPath);
    emit({kind:"visual-audit-run",data:result},options,"json");
    if(result.exit_code!==0 || result.report?.summary?.failed>0) process.exitCode=1;
    return;
  }
  if(command==="verify") {
    if(positional.length!==1) throw new Error("verify requires exactly one project path.");
    const requiredModules=options.module ? options.module.split(",").map(x=>x.trim()).filter(Boolean) : [];
    const report=verifyDefinitionOfDone(positional[0],{requiredModules});
    emit({kind:"definition-of-done",data:report},options,"json");
    if(!report.valid) process.exitCode=1;
    return;
  }
  if(command==="sequence") {
    if(positional.length!==1) throw new Error("sequence requires exactly one project path.");
    if(!options.module) throw new Error("sequence requires --module <id[,id...]>.");
    const {projectRoot,manifest,registry}=loadFoundryContext(positional[0],FOUNDRY_ROOT);
    const statePath=path.join(projectRoot,".foundry","state.yaml");
    const state=fs.existsSync(statePath) ? parseYaml(fs.readFileSync(statePath,"utf8")) : {};
    const statuses={};
    for(const [status,ids] of Object.entries(manifest.modules ?? {})) for(const id of ids ?? []) statuses[id]=status;
    const plan=buildDependencyPlan({registry,requested:options.module.split(",").map(x=>x.trim()).filter(Boolean),completed:state.completed_modules ?? [],statuses});
    emit({kind:"dependency-sequence",data:plan},options,"json");
    if(!plan.ready) process.exitCode=1;
    return;
  }
  if(command==="status") {
    if(positional.length!==1) throw new Error("status requires exactly one project path.");
    emit({kind:"status",data:getFoundryStatus(positional[0])},options,"md"); return;
  }
  if(command==="runs") {
    if(positional.length!==1) throw new Error("runs requires exactly one project path.");
    const limit=options.limit === undefined ? 10 : Number(options.limit);
    if(!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("--limit must be an integer from 1 to 100.");
    emit({kind:"runs",data:listFoundryRuns(positional[0],limit)},options,"md"); return;
  }
  if(command==="run") {
    if(positional.length!==1) throw new Error("run requires exactly one project path or GitHub URL.");
    const result=await runFoundry({target:positional[0],destination:options.dir,mode:options.mode ?? "auto",agent:options.agent ?? "claude",task:options.task ?? "auto"});
    process.stdout.write(JSON.stringify(result,null,2)+"\n"); return;
  }
  if(command==="init") {
    if(positional.length!==1) throw new Error("init requires exactly one project path.");
    const result=initializeProject({projectPath:positional[0],mode:options.mode ?? "auto",agent:options.agent ?? "claude"});
    emit({kind:"init",data:result},options,"json"); return;
  }
  if(command==="agent-audit") {
    if(positional.length!==1) throw new Error("agent-audit requires exactly one project path.");
    const timeoutMs=options["timeout-ms"] === undefined ? undefined : Number(options["timeout-ms"]);
    if(timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000)) throw new Error("--timeout-ms must be an integer from 1000 to 600000.");
    const report=runCodeAudit({projectRoot:positional[0],agent:options.agent ?? "claude",timeoutMs});
    emit({kind:"agent-audit",data:report},options,"json"); return;
  }
  if(command==="resources"){
    const registry=parseYaml(fs.readFileSync(path.join(path.resolve(options.foundry ?? FOUNDRY_ROOT),"catalog/resources.yaml"),"utf8"));
    emit({kind:"resources",data:listInstallableResources(registry)},options,"json"); return;
  }
  if(command==="evidence"){
    if(positional.length!==1) throw new Error("evidence requires one scan JSON file.");
    const report=buildEvidenceReport(loadJson(positional[0]));
    emit({kind:"evidence",data:report},options,"json"); return;
  }
  if(command==="diff"){
    if(positional.length!==2) throw new Error("diff requires previous and current scan JSON files.");
    const report=diffScans(loadJson(positional[0]),loadJson(positional[1]));
    emit({kind:"diff",data:report},options,"json"); return;
  }
  if(command==="scan"){
    if(positional.length!==1) throw new Error("scan requires exactly one project path.");
    const result=scanRepository(positional[0]);
    emit({kind:"scan",data:result},options);
    return;
  }
  if(["plan","doctor","context","select","apply","rollback","install","drift","uninstall","update","rollback-resource"].includes(command)){
    if(positional.length!==1) throw new Error(`${command} requires exactly one project path.`);
    const foundryRoot=path.resolve(options.foundry ?? FOUNDRY_ROOT);
    const {projectRoot,manifest,registry}=loadFoundryContext(positional[0],foundryRoot);
    const resourceRegistry=parseYaml(fs.readFileSync(path.join(foundryRoot,"catalog/resources.yaml"),"utf8"));
    const validation=validateProject(manifest,registry);
    if(command==="doctor"){
      const report={kind:"doctor",data:{
        checked_at:new Date().toISOString(),
        project:{id:manifest.project?.id??null,name:manifest.project?.name??null,root:projectRoot},
        valid:validation.valid && !(options.strict && validation.warnings.length),
        validation,
        catalog:{module_count:validation.module_count},
        checks:{manifest_parsed:true,catalog_parsed:true,module_references_valid:validation.errors.every(x=>!x.includes("Unknown module")),dependencies_checked:true}
      }};
      emit(report,options,"json");
      if(!report.data.valid) process.exitCode=1;
      return;
    }
    if(!validation.valid) throw new Error("Project manifest/catalog validation failed. Run doctor to inspect the manifest.");
    if(command==="drift"){
      const report=inspectResourceDrift(projectRoot,options.resource);
      emit({kind:"resource-drift",data:report},options,"json"); return;
    }
    if(command==="rollback-resource"){
      if(!options.resource) throw new Error("rollback-resource requires --resource <id>.");
      const plan=buildResourceRollbackPlan(projectRoot,options.resource);
      if(options.execute){
        const result=rollbackResourceUpdate(projectRoot,options.resource);
        emit({kind:"resource-rollback",data:{plan,result}},options,"json");
      } else emit({kind:"resource-rollback",data:plan},options,"json");
      return;
    }
    if(command==="update"){
      for(const key of ["resource","from","commit","license"]) if(!options[key]) throw new Error("update requires --"+key+" <value>.");
      const plan=buildResourceUpdatePlan({
        projectRoot, registry:resourceRegistry, resourceId:options.resource, sourceDir:options.from,
        sourcePath:options["source-path"] ?? ".", target:options.target, commit:options.commit,
        license:options.license, reviewed:options.reviewed, allowScripts:options["allow-scripts"]
      });
      if(options.execute){
        const result=executeResourceUpdate(plan);
        emit({kind:"resource-update",data:{plan,result}},options,"json");
      } else emit({kind:"resource-update",data:plan},options,"json");
      return;
    }
    if(command==="uninstall"){
      if(!options.resource) throw new Error("uninstall requires --resource <id>.");
      const plan=buildResourceUninstallPlan(projectRoot,options.resource);
      if(options.execute){
        const result=executeResourceUninstall(plan);
        emit({kind:"resource-uninstall",data:{plan,result}},options,"json");
      } else emit({kind:"resource-uninstall",data:plan},options,"json");
      return;
    }
    if(command==="install"){
      for(const key of ["resource","from","commit","license"]) if(!options[key]) throw new Error("install requires --"+key+" <value>.");
      const plan=buildResourceInstallPlan({
        projectRoot, registry:resourceRegistry, resourceId:options.resource, sourceDir:options.from,
        sourcePath:options["source-path"] ?? ".", target:options.target, commit:options.commit,
        license:options.license, reviewed:options.reviewed, allowScripts:options["allow-scripts"]
      });
      if(options.execute){
        const result=executeResourceInstall(plan);
        emit({kind:"resource-install",data:{plan,result}},options,"json");
      } else emit({kind:"resource-install",data:plan},options,"json");
      return;
    }
    if(command==="rollback"){
      if(!options.module) throw new Error("rollback requires --module <id>.");
      const result=rollbackAppliedModule(projectRoot,options.module);
      emit({kind:"rollback",data:result},options,"json"); return;
    }
    if(command==="select" || command==="context"){
      const scan=options.scan ? loadJson(options.scan) : scanRepository(projectRoot);
      const selection=selectModules(manifest,registry,scan,{stage:options.stage,bottleneck:options.bottleneck,capacity:options.capacity});
      if(command==="select") emit({kind:"selection",data:selection},options,"json");
      else emit({kind:"context",data:buildAgentContext(manifest,scan,selection)},options,"json");
      return;
    }
    if(command==="apply"){
      if(!options.module) throw new Error("apply requires --module <id[,id...]>.");
      const ids=options.module.split(",").map(x=>x.trim()).filter(Boolean);
      const plan=buildApplyPlan(projectRoot,ids,registry);
      if(options.execute){
        const result=executeApplyPlan(plan);
        emit({kind:"apply",data:{plan,result}},options,"json");
      } else emit({kind:"apply",data:plan},options,"json");
      return;
    }
    let scan;
    if(options.scan) scan=loadJson(options.scan);
    else scan=scanRepository(projectRoot);
    const plan=buildPlan(scan,manifest,registry);
    emit({kind:"plan",data:plan},options);
    return;
  }
  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}
main().catch(error=>{
  process.stderr.write("Error: "+error.message+"\n");
  process.exitCode=1;
});
