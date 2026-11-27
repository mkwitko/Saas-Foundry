import fs from "node:fs";
import path from "node:path";

const severities = { low: 1, medium: 2, high: 3, critical: 4 };
const sentiments = new Set(["positive", "neutral", "negative"]);
const evidenceTypes = new Set(["customer", "interview", "support", "analytics"]);
const forbiddenKeys = /^(name|email|phone|address|message|content|transcript|customer_id|user_id|patient_id|document|cpf|birth_date)$/i;
const allowedKeys = {
  root: ["schema_version", "period", "accounts", "events", "feedback", "support_topics", "cancellation_reasons"],
  period: ["start", "end"],
  accounts: ["eligible", "activated", "active", "retained", "cancelled"],
  "events item": ["event", "count", "unique_accounts", "measured_at", "source"],
  "feedback item": ["category", "sentiment", "occurrences", "affected_accounts", "evidence_type", "summary", "observed_at"],
  "support_topics item": ["category", "count", "affected_accounts", "severity", "summary"],
  "cancellation_reasons item": ["reason", "count", "source"]
};

function assert(condition, message) {
  if (!condition) throw new Error("Invalid customer intelligence input: " + message);
}
function safeObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), label + " must be an object");
  for (const key of Object.keys(value)) {
    assert(!forbiddenKeys.test(key), label + " contains a prohibited personal-data field: " + key);
    assert((allowedKeys[label] ?? []).includes(key), label + " contains an unsupported field: " + key);
  }
}
function count(value, label) {
  assert(Number.isInteger(value) && value >= 0, label + " must be a non-negative integer");
}
function text(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, label + " must be a non-empty string");
}
function date(value, label) {
  text(value, label);
  assert(!Number.isNaN(Date.parse(value)), label + " must be a valid date");
}

export function validateCustomerIntelligence(input) {
  safeObject(input, "root");
  assert(input.schema_version === "0.1", "schema_version must be 0.1");
  safeObject(input.period, "period");
  date(input.period.start, "period.start");
  date(input.period.end, "period.end");
  assert(Date.parse(input.period.start) <= Date.parse(input.period.end), "period.start must not be after period.end");
  safeObject(input.accounts, "accounts");
  for (const key of ["eligible", "activated", "active", "retained", "cancelled"]) count(input.accounts[key], "accounts." + key);
  assert(input.accounts.activated <= input.accounts.eligible, "activated cannot exceed eligible");
  assert(input.accounts.active <= input.accounts.eligible, "active cannot exceed eligible");
  assert(input.accounts.retained <= input.accounts.eligible, "retained cannot exceed eligible");
  assert(input.accounts.cancelled <= input.accounts.eligible, "cancelled cannot exceed eligible");
  for (const key of ["events", "feedback", "support_topics", "cancellation_reasons"]) {
    assert(Array.isArray(input[key]), key + " must be an array");
    for (const item of input[key]) safeObject(item, key + " item");
  }
  for (const item of input.events) {
    text(item.event, "events.event"); count(item.count, "events.count"); count(item.unique_accounts, "events.unique_accounts"); date(item.measured_at, "events.measured_at"); text(item.source, "events.source");
    assert(item.unique_accounts <= input.accounts.eligible, "event unique_accounts exceeds eligible accounts");
  }
  for (const item of input.feedback) {
    text(item.category, "feedback.category"); text(item.summary, "feedback.summary");
    assert(sentiments.has(item.sentiment), "feedback.sentiment is invalid");
    assert(evidenceTypes.has(item.evidence_type), "feedback.evidence_type is invalid");
    count(item.occurrences, "feedback.occurrences"); count(item.affected_accounts, "feedback.affected_accounts");
    assert(item.affected_accounts <= input.accounts.eligible, "feedback affected_accounts exceeds eligible");
    date(item.observed_at, "feedback.observed_at");
  }
  for (const item of input.support_topics) {
    text(item.category, "support_topics.category"); text(item.summary, "support_topics.summary");
    assert(Object.hasOwn(severities, item.severity), "support_topics.severity is invalid");
    count(item.count, "support_topics.count"); count(item.affected_accounts, "support_topics.affected_accounts");
    assert(item.affected_accounts <= input.accounts.eligible, "support affected_accounts exceeds eligible");
  }
  for (const item of input.cancellation_reasons) {
    text(item.reason, "cancellation_reasons.reason"); count(item.count, "cancellation_reasons.count"); text(item.source, "cancellation_reasons.source");
    assert(item.count <= input.accounts.cancelled, "cancellation reason count exceeds cancellations");
  }
  return input;
}

const rate = (numerator, denominator) => denominator > 0 ? Number((numerator / denominator * 100).toFixed(1)) : null;

export function buildCustomerIntelligenceReport(input) {
  validateCustomerIntelligence(input);
  const { accounts } = input;
  const lowSample = accounts.eligible < 10;
  const issues = [
    ...input.support_topics.map(item => ({ type: "support", ...item, priority: severities[item.severity] })),
    ...input.feedback.filter(item => item.sentiment === "negative").map(item => ({ type: "feedback", ...item, severity: "unspecified", priority: 0 }))
  ].sort((a, b) => b.priority - a.priority || b.affected_accounts - a.affected_accounts || b.count - a.count || b.occurrences - a.occurrences);
  return {
    schema_version: "0.1",
    period: input.period,
    sample: { eligible_accounts: accounts.eligible, low_sample: lowSample, warning: lowSample ? "Small sample: show individual cases and counts; do not infer statistical significance." : null },
    metrics: {
      activation_rate_percent: rate(accounts.activated, accounts.eligible),
      active_rate_percent: rate(accounts.active, accounts.eligible),
      retention_rate_percent: rate(accounts.retained, accounts.eligible),
      cancellation_rate_percent: rate(accounts.cancelled, accounts.eligible)
    },
    event_summary: input.events,
    customer_voice: input.feedback,
    priority_issues: issues,
    cancellation_reasons: input.cancellation_reasons,
    interpretation_limits: [
      "Aggregated counts do not establish causality.",
      "A missing event or denominator is unknown, not zero.",
      "Retention and cancellation rates are only comparable when cohort and period definitions match.",
      "Support volume can reflect reporting behaviour as well as product quality.",
      "Feedback frequency is not a representative survey unless sampling is documented."
    ]
  };
}

export function readCustomerIntelligenceInput(projectRoot, inputPath) {
  const file = inputPath ? path.resolve(inputPath) : path.join(path.resolve(projectRoot), ".foundry", "customer-intelligence", "summary.json");
  if (!fs.existsSync(file)) throw new Error("Customer intelligence input not found: " + file + ". Create a sanitized aggregate using templates/customer-intelligence-summary.json.");
  let input;
  try { input = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { throw new Error("Customer intelligence input must be valid JSON: " + file); }
  return { file, report: buildCustomerIntelligenceReport(input) };
}

export function formatCustomerIntelligenceMarkdown(report) {
  const lines = [
    "# Customer intelligence",
    "",
    "- Period: " + report.period.start + " to " + report.period.end,
    "- Eligible accounts: " + report.sample.eligible_accounts,
    report.sample.warning ? "- Sample warning: " + report.sample.warning : "- Sample: at least 10 eligible accounts; still inspect segment and cohort sizes.",
    "",
    "## Lifecycle metrics",
    "",
    "| Metric | Result |",
    "|---|---:|",
    ...Object.entries(report.metrics).map(([key, value]) => "| " + key.replaceAll("_", " ") + " | " + (value === null ? "unknown (no denominator)" : value + "%") + " |"),
    "",
    "## Priority issues",
    ""
  ];
  if (!report.priority_issues.length) lines.push("No negative feedback or support topics supplied.");
  else for (const item of report.priority_issues) lines.push("- **" + item.type + ": " + (item.category ?? "uncategorized") + "** — " + (item.summary ?? "") + " (affected accounts: " + item.affected_accounts + "; severity: " + (item.severity ?? "unspecified") + ")");
  lines.push("", "## Customer voice", "");
  for (const item of report.customer_voice) lines.push("- " + item.category + " (" + item.sentiment + ", " + item.evidence_type + ", n=" + item.occurrences + "): " + item.summary);
  lines.push("", "## Interpretation limits", "", ...report.interpretation_limits.map(item => "- " + item), "");
  return lines.join("\n");
}
