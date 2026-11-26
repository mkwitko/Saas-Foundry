import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildResourceInstallPlan, executeResourceInstall, inspectResourceDrift,
  buildResourceUninstallPlan, executeResourceUninstall,
  buildResourceUpdatePlan, executeResourceUpdate, rollbackResourceUpdate
} from "../src/v4.js";

function git(cwd, args) {
  const r=spawnSync("git",args,{cwd,encoding:"utf8"});
  if(r.status!==0) throw new Error(r.stderr);
  return r.stdout.trim();
}
function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"foundry-resource-"));
  const project=path.join(root,"project");
  const source=path.join(root,"source");
  fs.mkdirSync(project); fs.mkdirSync(source);
  git(source,["init"]);
  git(source,["config","user.email","foundry-test@example.com"]);
  git(source,["config","user.name","Foundry Test"]);
  git(source,["remote","add","origin","https://github.com/acme/demo-skill.git"]);
  fs.writeFileSync(path.join(source,"SKILL.md"),"# Demo skill\n\nVersion one.\n");
  git(source,["add","SKILL.md"]); git(source,["commit","-m","v1"]);
  const registry={resources:[{id:"demo-skill",type:"skill",source:"https://github.com/acme/demo-skill",license:"MIT",status:"review_before_install"}]};
  const commit=()=>git(source,["rev-parse","HEAD"]);
  const args=()=>({projectRoot:project,registry,resourceId:"demo-skill",sourceDir:source,sourcePath:".",target:".agents/skills/demo-skill",commit:commit(),license:"MIT",reviewed:true});
  return {root,project,source,registry,args,commit};
}

test("resource install is dry-run by default, pinned to origin/commit and reproducible",()=>{
  const f=fixture();
  try {
    const plan=buildResourceInstallPlan(f.args());
    assert.equal(plan.safe,true);
    assert.equal(plan.mode,"dry_run");
    assert.equal(fs.existsSync(path.join(f.project,".agents/skills/demo-skill/SKILL.md")),false);
    const result=executeResourceInstall(plan);
    assert.equal(result.installed.length,1);
    assert.equal(inspectResourceDrift(f.project,"demo-skill").resources[0].status,"clean");
  } finally { fs.rmSync(f.root,{recursive:true,force:true}); }
});

test("drift blocks uninstall and modified files are preserved",()=>{
  const f=fixture();
  try {
    executeResourceInstall(buildResourceInstallPlan(f.args()));
    const file=path.join(f.project,".agents/skills/demo-skill/SKILL.md");
    fs.appendFileSync(file,"Local edit\n");
    assert.equal(inspectResourceDrift(f.project,"demo-skill").resources[0].status,"drift");
    const plan=buildResourceUninstallPlan(f.project,"demo-skill");
    assert.equal(plan.safe,false);
    assert.throws(()=>executeResourceUninstall(plan),/unsafe/);
    assert.match(fs.readFileSync(file,"utf8"),/Local edit/);
  } finally { fs.rmSync(f.root,{recursive:true,force:true}); }
});

test("safe uninstall removes only lock-owned unchanged files",()=>{
  const f=fixture();
  try {
    executeResourceInstall(buildResourceInstallPlan(f.args()));
    const plan=buildResourceUninstallPlan(f.project,"demo-skill");
    const result=executeResourceUninstall(plan);
    assert.equal(result.files_removed,1);
    assert.equal(fs.existsSync(path.join(f.project,".agents/skills/demo-skill/SKILL.md")),false);
  } finally { fs.rmSync(f.root,{recursive:true,force:true}); }
});

test("update snapshots previous content and rollback restores it",()=>{
  const f=fixture();
  try {
    executeResourceInstall(buildResourceInstallPlan(f.args()));
    fs.writeFileSync(path.join(f.source,"SKILL.md"),"# Demo skill\n\nVersion two.\n");
    git(f.source,["add","SKILL.md"]); git(f.source,["commit","-m","v2"]);
    const plan=buildResourceUpdatePlan(f.args());
    assert.equal(plan.safe,true);
    assert.equal(plan.files[0].action,"update");
    executeResourceUpdate(plan);
    const file=path.join(f.project,".agents/skills/demo-skill/SKILL.md");
    assert.match(fs.readFileSync(file,"utf8"),/Version two/);
    const result=rollbackResourceUpdate(f.project,"demo-skill");
    assert.match(result.restored_commit,/^[a-f0-9]{40}$/);
    assert.match(fs.readFileSync(file,"utf8"),/Version one/);
    assert.equal(inspectResourceDrift(f.project,"demo-skill").resources[0].status,"clean");
  } finally { fs.rmSync(f.root,{recursive:true,force:true}); }
});

test("installer rejects unreviewed sources, mismatched remotes and scripts by default",()=>{
  const f=fixture();
  try {
    assert.throws(()=>buildResourceInstallPlan({...f.args(),reviewed:false}),/review attestation/);
    fs.writeFileSync(path.join(f.source,"install.sh"),"echo unsafe\n");
    git(f.source,["add","install.sh"]); git(f.source,["commit","-m","script"]);
    assert.throws(()=>buildResourceInstallPlan(f.args()),/allow-scripts/);
    assert.throws(()=>buildResourceInstallPlan({...f.args(),sourceDir:f.project}),/Git source/);
  } finally { fs.rmSync(f.root,{recursive:true,force:true}); }
});

test("installer rejects symlinked resource files",()=>{
  const f=fixture();
  const outside=path.join(f.root,"outside.md");
  fs.writeFileSync(outside,"outside");
  fs.symlinkSync(outside,path.join(f.source,"linked.md"));
  try { assert.throws(()=>buildResourceInstallPlan(f.args()),/symlink/); }
  finally { fs.rmSync(f.root,{recursive:true,force:true}); }
});
