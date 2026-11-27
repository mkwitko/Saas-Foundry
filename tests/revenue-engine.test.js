import test from "node:test";
import assert from "node:assert/strict";
import { buildRevenueReport, validateRevenuePipeline } from "../src/revenue-engine.js";

const pipeline = () => ({
  schema_version: "0.1",
  leads: [
    { id: "clinic-a", organization: "Clinic A", segment: "independent clinic", fit: "high", pain_evidence: "reported", buying_role: "owner", contact_permission: "explicit", stage: "conversation" },
    { id: "clinic-b", organization: "Clinic B", segment: "independent clinic", fit: "high", pain_evidence: "hypothesis", buying_role: "owner", contact_permission: "unknown", stage: "researched" },
    { id: "clinic-c", organization: "Clinic C", segment: "independent clinic", fit: "medium", pain_evidence: "reported", buying_role: "practice manager", contact_permission: "unknown", stage: "qualified" }
  ],
  channels: [{ id: "referrals", channel: "warm referrals", hypothesis: "Trusted introductions will create qualified conversations.", status: "proposed", primary_metric: "qualified conversations" }]
});

test("validates company-level pipeline records and rejects personal contact fields", () => {
  const data = pipeline();
  assert.equal(validateRevenuePipeline(data), data);
  data.leads[0].email = "person@example.com";
  assert.throws(() => validateRevenuePipeline(data), /prohibited personal-data field/);
});

test("calculates stage counts and qualifies only fit plus real pain evidence and buying role", () => {
  const report = buildRevenueReport({ pipeline: pipeline(), now: new Date("2026-11-27T12:00:00Z") });
  assert.equal(report.summary.total_leads, 3);
  assert.equal(report.summary.qualified_leads, 2);
  assert.equal(report.stage_counts.conversation, 1);
  assert.equal(report.summary.low_sample, true);
});

test("flags contact permission violations and never recommends outreach without permission", () => {
  const data = pipeline();
  data.leads[0].contact_permission = "unknown";
  const report = buildRevenueReport({ pipeline: data, now: new Date("2026-11-27T12:00:00Z") });
  assert.equal(report.summary.permission_issues, 1);
  assert.ok(report.permission_issues.some(item => item.organization === "Clinic A"));
  assert.ok(report.next_actions.every(item => !item.action.toLowerCase().includes("send")));
});

test("identifies buyer access as the bottleneck when qualified leads lack permission", () => {
  const data = pipeline();
  data.leads[0].stage = "researched";
  data.leads[0].contact_permission = "unknown";
  data.leads[2].stage = "qualified";
  const report = buildRevenueReport({ pipeline: data });
  assert.equal(report.bottleneck.stage, "buyer_access");
});

test("uses complete stage history only when calculating reached-stage counts", () => {
  const data = pipeline();
  data.leads[0].stage_history = [
    { stage: "identified", entered_at: "2026-10-01T00:00:00Z" },
    { stage: "researched", entered_at: "2026-10-02T00:00:00Z" },
    { stage: "qualified", entered_at: "2026-10-03T00:00:00Z" },
    { stage: "permissioned", entered_at: "2026-10-04T00:00:00Z" },
    { stage: "contacted", entered_at: "2026-10-05T00:00:00Z" },
    { stage: "conversation", entered_at: "2026-10-06T00:00:00Z" }
  ];
  const report = buildRevenueReport({ pipeline: data });
  assert.ok(report.funnel_history);
  assert.equal(report.funnel_history.find(item => item.stage === "conversation").reached, 1);
  assert.match(report.funnel_history_note, /not inferred/);
});

test("does not infer funnel rates when stage history is absent", () => {
  const report = buildRevenueReport({ pipeline: pipeline() });
  assert.equal(report.funnel_history, null);
  assert.match(report.funnel_history_note, /unknown/);
});

test("rejects invalid stage, permission and channel status", () => {
  const data = pipeline();
  data.leads[0].contact_permission = "assumed";
  assert.throws(() => validateRevenuePipeline(data), /contact_permission/);
  data.leads[0].contact_permission = "explicit";
  data.channels[0].status = "launched";
  assert.throws(() => validateRevenuePipeline(data), /channel.status/);
});
