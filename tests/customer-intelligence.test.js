import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildCustomerIntelligenceReport, validateCustomerIntelligence, readCustomerIntelligenceInput, formatCustomerIntelligenceMarkdown } from "../src/customer-intelligence.js";

const sample = {
  schema_version: "0.1",
  period: { start: "2026-11-01", end: "2026-11-30" },
  accounts: { eligible: 8, activated: 5, active: 4, retained: 3, cancelled: 1 },
  events: [{ event: "first_value_reached", count: 5, unique_accounts: 5, measured_at: "2026-11-25T12:00:00Z", source: "PostHog aggregate" }],
  feedback: [{ category: "onboarding", sentiment: "negative", occurrences: 2, affected_accounts: 2, evidence_type: "customer", summary: "Setup instructions were unclear", observed_at: "2026-11-20T12:00:00Z" }],
  support_topics: [{ category: "calendar-sync", count: 3, affected_accounts: 2, severity: "high", summary: "Calendar connection needs manual recovery" }],
  cancellation_reasons: [{ reason: "missing_integration", count: 1, source: "exit survey" }]
};

test("customer intelligence computes descriptive rates and flags small samples", () => {
  const report = buildCustomerIntelligenceReport(sample);
  assert.deepEqual(report.metrics, { activation_rate_percent: 62.5, active_rate_percent: 50, retention_rate_percent: 37.5, cancellation_rate_percent: 12.5 });
  assert.equal(report.sample.low_sample, true);
  assert.equal(report.priority_issues[0].category, "calendar-sync");
  assert.ok(report.interpretation_limits.some(item => item.includes("causality")));
  assert.match(formatCustomerIntelligenceMarkdown(report), /Small sample/);
});

test("customer intelligence reports unknown rates for zero denominators", () => {
  const input = structuredClone(sample);
  input.accounts.eligible = 0;
  input.accounts.activated = 0;
  input.accounts.active = 0;
  input.accounts.retained = 0;
  input.accounts.cancelled = 0;
  input.events[0].unique_accounts = 0;
  input.feedback[0].affected_accounts = 0;
  input.support_topics[0].affected_accounts = 0;
  input.cancellation_reasons[0].count = 0;
  const report = buildCustomerIntelligenceReport(input);
  assert.equal(report.metrics.activation_rate_percent, null);
  assert.equal(report.sample.warning, "Small sample: show individual cases and counts; do not infer statistical significance.");
});

test("customer intelligence rejects PII fields and inconsistent denominators", () => {
  const withPii = structuredClone(sample);
  withPii.feedback[0].email = "person@example.com";
  assert.throws(() => validateCustomerIntelligence(withPii), /prohibited personal-data field/);
  const inconsistent = structuredClone(sample);
  inconsistent.accounts.activated = 9;
  assert.throws(() => validateCustomerIntelligence(inconsistent), /activated cannot exceed eligible/);
  const badCount = structuredClone(sample);
  badCount.support_topics[0].affected_accounts = 9;
  assert.throws(() => validateCustomerIntelligence(badCount), /exceeds eligible/);
});

test("customer intelligence input loader reads only an explicit sanitized aggregate", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-customer-intel-"));
  try {
    const target = path.join(project, "summary.json");
    fs.writeFileSync(target, JSON.stringify(sample));
    const loaded = readCustomerIntelligenceInput(project, target);
    assert.equal(loaded.file, target);
    assert.equal(loaded.report.sample.eligible_accounts, 8);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
