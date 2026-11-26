#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  scanRepository, buildPlan, validateProject, loadFoundryContext,
  formatMarkdownScan, formatMarkdownPlan
} from "./core.js";

const FOUNDRY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [command, ...rest] = process.argv.slice(2);

function usage() {
  return `SaaS Foundry CLI v0.2.0

Usage:
  foundry scan <project-path> [--format json|md] [--out <file>]
  foundry plan <project-path> [--scan <scan.json>] [--format json|md] [--out <file>]
  foundry doctor <project-path> [--strict]

Options:
  --format   Output format (default: md for scan/plan, json for doctor)
  --out      Write output to a file instead of stdout
  --scan     Use a previously generated scan JSON for planning
  --strict   Treat manifest warnings as errors
  --foundry  Path to a SaaS Foundry checkout (default: this CLI's checkout)

Safety:
  scan is read-only. It inventories paths and selected metadata/documents only.
  plan and doctor do not modify the target project or execute project code.
`;
}
function parseArgs(args) {
  const positional=[];
  const options={};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==="--strict"){ options.strict=true; continue; }
    if(["--format","--out","--scan","--foundry"].includes(arg)){
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
  const payload=value?.data ?? value;\n  const output=format==="json" ? JSON.stringify(payload,null,2)+"\n" : (value.kind==="scan" ? formatMarkdownScan(value.data) : value.kind==="plan" ? formatMarkdownPlan(value.data) : JSON.stringify(value.data,null,2)+"\n");
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
  if(command==="scan"){
    if(positional.length!==1) throw new Error("scan requires exactly one project path.");
    const result=scanRepository(positional[0]);
    emit({kind:"scan",data:result},options);
    return;
  }
  if(command==="plan" || command==="doctor"){
    if(positional.length!==1) throw new Error(`${command} requires exactly one project path.`);
    const foundryRoot=path.resolve(options.foundry ?? FOUNDRY_ROOT);
    const {projectRoot,manifest,registry}=loadFoundryContext(positional[0],foundryRoot);
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
    if(!validation.valid) throw new Error("Project manifest/catalog validation failed. Run 'foundry doctor <path>' for details.");
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
