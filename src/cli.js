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

const FOUNDRY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [command, ...rest] = process.argv.slice(2);

function usage() {
  return `SaaS Foundry CLI v0.7.0

Usage:
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
  foundry uninstall <project-path> --resource <id> [--execute]\n  foundry init <project-path> [--mode auto|new|existing] [--agent claude|codex|opencode|all]\n  foundry agent-audit <project-path> [--agent claude|codex] [--timeout-ms <ms>] [--format json] [--out <file>]

Options:
  --format   Output format (default: md for scan/plan, json for doctor)
  --out      Write output to a file instead of stdout
  --scan     Use a previously generated scan JSON for planning
  --strict   Treat manifest warnings as errors
  --foundry  Path to a SaaS Foundry checkout (default: this CLI's checkout)

Safety:
  scan is read-only. It inventories paths and selected metadata/documents only.
  plan, doctor, select, context, evidence, diff, resources and drift are read-only.
  install and uninstall are dry-run by default; --execute is required to write.
  install requires an explicit --reviewed attestation and never executes resource files.
`;
}
function parseArgs(args) {
  const positional=[];
  const options={};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==="--strict" || arg==="--execute" || arg==="--reviewed" || arg==="--allow-scripts"){ options[arg.slice(2)]=true; continue; }
    if(["--format","--out","--scan","--foundry","--previous","--module","--stage","--bottleneck","--capacity","--resource","--from","--source-path","--target","--commit","--license","--agent","--timeout-ms","--mode"].includes(arg)){
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
  const payload=value?.data ?? value;
  const output=format==="json" ? JSON.stringify(payload,null,2)+"\n" : (value.kind==="scan" ? formatMarkdownScan(value.data) : value.kind==="plan" ? formatMarkdownPlan(value.data) : JSON.stringify(value.data,null,2)+"\n");
  if(options.out){
    const destination=path.resolve(options.out);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,output,{encoding:"utf8",flag:"w"});
    process.stdout.write(`Wrote ${destination}\n`);
  } else process.stdout.write(output);
}
function loadJson(file){
  const raw=fs.readFileSync(path.resolve(file),"utf8");
  return JSON.parse(raw);
}
async function main(){
  if(!command || command==="help" || command==="--help" || command==="-h"){
    process.stdout.write(usage()); return;
  }
  const {positional,options}=parseArgs(rest);
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
  process.stderr.write(`foundry: ${error.message}\n`);
  process.exitCode=1;
});
