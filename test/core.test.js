import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { scanRepository, buildPlan, validateProject } from "../src/core.js";

const registry=parseYaml(fs.readFileSync(new URL("../catalog/modules.yaml",import.meta.url),"utf8"));
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"foundry-test-"));
  fs.mkdirSync(path.join(root,".foundry"),{recursive:true});
  fs.mkdirSync(path.join(root,"src"),{recursive:true});
  fs.writeFileSync(path.join(root,"README.md"),"# Example\nA small SaaS product.\n");
  fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({name:"example",dependencies:{fastify:"^5.0.0",posthog:"^1.0.0"},scripts:{test:"node --test"}}));
  fs.writeFileSync(path.join(root,"src","billing.ts"),"// billing adapter");
  fs.writeFileSync(path.join(root,".env"),"SHOULD_NOT_BE_READ=secret-value");
  fs.writeFileSync(path.join(root,".foundry","project.yaml"),`schema_version: "0.1"
project:
  id: example
  name: Example
  repository: https://example.com/repo
  mode: adopt
  stage: pilot
business:
  model: B2B SaaS
  market: Example
  geography: [Brazil]
  icp: [Small businesses]
product:
  category: SaaS
  value_proposition: Save time
  maturity: Pilot
technology:
  languages: [TypeScript]
  frameworks: [Fastify]
  data_sensitivity: personal
goals:
  primary: Validate
  success_signals: [Paid pilot]
modules:
  enabled: [analytics-instrumentation]
  deferred: [seo-and-content]
  already_satisfied: [positioning-and-offer]
`);
  return root;
}
test("scanner inventories metadata and never reads environment values",()=>{
  const root=fixture();
  try{
    const result=scanRepository(root);
    assert.equal(result.signals.analytics,true);
    assert.equal(result.signals.tests,true);
    assert.equal(result.summary.package_manifests,1);
    assert.ok(result.exclusions.skipped_paths.includes(".env"));
    assert.equal(JSON.stringify(result).includes("secret-value"),false);
    assert.equal(JSON.stringify(result).includes("SHOULD_NOT_BE_READ"),false);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test("manifest validation checks module references and dependencies",()=>{
  const root=fixture();
  try{
    const raw=fs.readFileSync(path.join(root,".foundry","project.yaml"),"utf8");
    const manifest=parseYaml(raw);
    const result=validateProject(manifest,registry);
    assert.equal(result.valid,true);
    assert.equal(result.module_count,registry.modules.length);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test("planner respects explicit project decisions and does not enable unknown modules",()=>{
  const root=fixture();
  try{
    const manifest=parseYaml(fs.readFileSync(path.join(root,".foundry","project.yaml"),"utf8"));
    const scan=scanRepository(root);
    const plan=buildPlan(scan,manifest,registry);
    const byId=new Map(plan.modules.map(m=>[m.id,m]));
    assert.equal(byId.get("analytics-instrumentation").decision,"recommended_now");
    assert.equal(byId.get("seo-and-content").decision,"optional_later");
    assert.equal(byId.get("positioning-and-offer").decision,"already_satisfied");
    assert.equal(byId.get("legal-and-compliance-review").decision,"needs_specialist");
    assert.ok(plan.modules.every(m=>m.decision!=="auto_install"));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
