const STAGES = ["identified", "researched", "qualified", "permissioned", "contacted", "conversation", "demo", "proposal", "won", "lost", "disqualified"];
const ACTIVE_STAGES = STAGES.slice(0, 9);
const FORBIDDEN_KEYS = /^(contact_name|full_name|email|phone|whatsapp|message_body|transcript|patient_id|customer_id|user_id|cpf|birth_date|address)$/i;
const FIT = new Set(["high", "medium", "low", "unknown"]);
const PAIN = new Set(["observed", "reported", "hypothesis", "unknown"]);
const PERMISSION = new Set(["explicit", "unknown", "denied", "not_required"]);
const CHANNEL_STATUS = new Set(["proposed", "running", "completed", "stopped"]);

function assert(condition, message) {
  if (!condition) throw new Error("Invalid revenue pipeline: " + message);
}
function nonEmpty(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, label + " must be a non-empty string");
}
function optionalDate(value, label) {
  if (value === null || value === undefined) return;
  nonEmpty(value, label);
  assert(!Number.isNaN(Date.parse(value)), label + " must be a valid date");
}
function inspectKeys(value, location = "pipeline") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert(!FORBIDDEN_KEYS.test(key), location + " contains a prohibited personal-data field: " + key);
    if (child && typeof child === "object") inspectKeys(child, location + "." + key);
  }
}

export function validateRevenuePipeline(pipeline) {
  assert(pipeline && typeof pipeline === "object" && !Array.isArray(pipeline), "root must be an object");
  inspectKeys(pipeline);
  assert(pipeline.schema_version === "0.1", "schema_version must be 0.1");
  assert(Array.isArray(pipeline.leads), "leads must be an array");
  assert(Array.isArray(pipeline.channels), "channels must be an array");
  const ids = new Set();
  for (const lead of pipeline.leads) {
    assert(lead && typeof lead === "object" && !Array.isArray(lead), "lead entries must be objects");
    nonEmpty(lead.id, "lead.id");
    assert(!ids.has(lead.id), "duplicate lead id: " + lead.id);
    ids.add(lead.id);
    nonEmpty(lead.organization, "lead.organization");
    nonEmpty(lead.segment, "lead.segment");
    assert(lead.website === null || lead.website === undefined || /^https?:\/\//i.test(lead.website), "lead.website must be an HTTP(S) URL");
    assert(lead.source_url === null || lead.source_url === undefined || /^https?:\/\//i.test(lead.source_url), "lead.source_url must be an HTTP(S) URL");
    assert(FIT.has(lead.fit), "lead.fit is invalid");
    assert(PAIN.has(lead.pain_evidence), "lead.pain_evidence is invalid");
    assert(PERMISSION.has(lead.contact_permission), "lead.contact_permission is invalid");
    assert(STAGES.includes(lead.stage), "lead.stage is invalid");
    if (lead.buying_role !== null && lead.buying_role !== undefined) nonEmpty(lead.buying_role, "lead.buying_role");
    if (lead.next_action !== null && lead.next_action !== undefined) nonEmpty(lead.next_action, "lead.next_action");
    optionalDate(lead.next_action_due, "lead.next_action_due");
    if (lead.stage_history !== undefined) {
      assert(Array.isArray(lead.stage_history), "lead.stage_history must be an array");
      for (const item of lead.stage_history) {
        assert(item && STAGES.includes(item.stage), "stage_history.stage is invalid");
        optionalDate(item.entered_at, "stage_history.entered_at");
        assert(item.entered_at, "stage_history.entered_at is required");
      }
    }
  }
  const channelIds = new Set();
  for (const channel of pipeline.channels) {
    assert(channel && typeof channel === "object", "channel entries must be objects");
    nonEmpty(channel.id, "channel.id");
    assert(!channelIds.has(channel.id), "duplicate channel id: " + channel.id);
    channelIds.add(channel.id);
    nonEmpty(channel.channel, "channel.channel");
    nonEmpty(channel.hypothesis, "channel.hypothesis");
    nonEmpty(channel.primary_metric, "channel.primary_metric");
    assert(CHANNEL_STATUS.has(channel.status), "channel.status is invalid");
  }
  return pipeline;
}

function isQualified(lead) {
  return ["high", "medium"].includes(lead.fit) &&
    ["observed", "reported"].includes(lead.pain_evidence) &&
    Boolean(lead.buying_role);
}
function stageRank(stage) {
  return ACTIVE_STAGES.indexOf(stage);
}
function leadNextAction(lead, now) {
  if (["won", "lost", "disqualified"].includes(lead.stage)) return null;
  const overdue = lead.next_action_due && Date.parse(lead.next_action_due) < now.getTime();
  if (overdue) return { lead_id: lead.id, organization: lead.organization, priority: "high", action: "Review the overdue next action; prepare any follow-up as a draft only.", reason: "next_action_due has passed." };
  if (lead.fit === "unknown" || lead.fit === "low") return { lead_id: lead.id, organization: lead.organization, priority: "medium", action: "Research ICP fit and disqualify quickly if the segment is not a match.", reason: "Fit is unknown or weak." };
  if (!["observed", "reported"].includes(lead.pain_evidence)) return { lead_id: lead.id, organization: lead.organization, priority: "high", action: "Validate the problem and buying trigger with real evidence before pitching.", reason: "Pain is still a hypothesis or unknown." };
  if (!lead.buying_role) return { lead_id: lead.id, organization: lead.organization, priority: "medium", action: "Identify the relevant buying role through a public business source or warm introduction.", reason: "Buying role is not established." };
  if (lead.contact_permission !== "explicit" && lead.contact_permission !== "not_required") return { lead_id: lead.id, organization: lead.organization, priority: "high", action: "Seek a permission-based introduction or record explicit contact permission before outreach.", reason: "Contact permission is not explicit." };
  if (lead.stage === "identified" || lead.stage === "researched" || lead.stage === "qualified" || lead.stage === "permissioned") return { lead_id: lead.id, organization: lead.organization, priority: "medium", action: "Prepare a short, personalized first-contact draft or discovery invitation for human approval.", reason: "Qualified lead has permission for contact but has not entered a conversation." };
  if (lead.stage === "contacted") return { lead_id: lead.id, organization: lead.organization, priority: "medium", action: "Review response status and prepare one relevant follow-up draft if appropriate.", reason: "Lead is contacted but no conversation is recorded." };
  if (lead.stage === "conversation") return { lead_id: lead.id, organization: lead.organization, priority: "medium", action: "Prepare a tailored demo around the buyer's stated workflow and success criteria.", reason: "Discovery conversation is recorded; next step is a focused demo." };
  if (lead.stage === "demo") return { lead_id: lead.id, organization: lead.organization, priority: "medium", action: "Prepare a scoped proposal tied to the buyer's stated outcome, setup effort and objections.", reason: "Demo is recorded; proposal is the next commercial step." };
  if (lead.stage === "proposal") return { lead_id: lead.id, organization: lead.organization, priority: "high", action: "Clarify the decision process, unresolved risk and agreed decision date; draft a follow-up for approval.", reason: "Proposal is open." };
  return { lead_id: lead.id, organization: lead.organization, priority: "low", action: lead.next_action || "Review lead and define one next action.", reason: "No stronger action could be inferred." };
}

export function buildRevenueReport({ pipeline, now = new Date() }) {
  validateRevenuePipeline(pipeline);
  const leads = pipeline.leads;
  const stageCounts = Object.fromEntries(STAGES.map(stage => [stage, leads.filter(lead => lead.stage === stage).length]));
  const qualified = leads.filter(isQualified);
  const active = leads.filter(lead => !["won", "lost", "disqualified"].includes(lead.stage));
  const permissionIssues = leads.filter(lead => stageRank(lead.stage) >= stageRank("contacted") && lead.contact_permission !== "explicit" && lead.contact_permission !== "not_required");
  const nextActions = active.map(lead => leadNextAction(lead, now)).filter(Boolean)
    .sort((a, b) => (a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2) - (b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2));
  const leadsWithHistory = leads.filter(lead => Array.isArray(lead.stage_history) && lead.stage_history.length);
  const funnel = leadsWithHistory.length ? ACTIVE_STAGES.map(stage => ({
    stage,
    reached: leadsWithHistory.filter(lead => lead.stage_history.some(item => stageRank(item.stage) >= 0 && stageRank(item.stage) >= stageRank(stage))).length
  })) : null;
  let bottleneck;
  if (!leads.length) bottleneck = { stage: "prospecting", diagnosis: "No company-level prospects are recorded. Start with a narrow ICP and a small, permission-based prospect list." };
  else if (!qualified.length) bottleneck = { stage: "qualification", diagnosis: "No lead currently has both credible fit and observed/reported pain evidence plus a buying role. Improve qualification before increasing volume." };
  else if (qualified.every(lead => !["explicit", "not_required"].includes(lead.contact_permission))) bottleneck = { stage: "buyer_access", diagnosis: "Qualified prospects exist, but explicit permission or a warm introduction is missing. Do not bypass this gate." };
  else if (!leads.some(lead => ["conversation", "demo", "proposal", "won"].includes(lead.stage))) bottleneck = { stage: "conversations", diagnosis: "The next constraint is converting permissioned, qualified prospects into real discovery conversations." };
  else if (!leads.some(lead => ["proposal", "won"].includes(lead.stage))) bottleneck = { stage: "demo_to_proposal", diagnosis: "Discovery or demos exist, but the path to a concrete, buyer-specific proposal is not yet evidenced." };
  else if (!leads.some(lead => lead.stage === "won")) bottleneck = { stage: "proposal_to_won", diagnosis: "Proposals exist but no won outcome is recorded; inspect value proof, risk, pricing, decision process and timing." };
  else bottleneck = { stage: "repeatability", diagnosis: "At least one win is recorded. Verify delivery outcomes, retention and acquisition economics before scaling channel volume." };

  const channelSummary = pipeline.channels.map(channel => ({
    id: channel.id,
    channel: channel.channel,
    status: channel.status,
    primary_metric: channel.primary_metric,
    hypothesis: channel.hypothesis,
    result: channel.result ?? null
  }));
  return {
    schema_version: "0.1",
    generated_at: now.toISOString(),
    summary: {
      total_leads: leads.length,
      qualified_leads: qualified.length,
      active_leads: active.length,
      wins: stageCounts.won,
      low_sample: leads.length < 10,
      permission_issues: permissionIssues.length
    },
    stage_counts: stageCounts,
    funnel_history: funnel,
    funnel_history_note: funnel ? "Reached-stage counts use only leads with stage_history; conversion rates are not inferred without consistent cohort and timestamp coverage." : "No stage history supplied; conversion rates are unknown.",
    bottleneck,
    permission_issues: permissionIssues.map(lead => ({ id: lead.id, organization: lead.organization, stage: lead.stage, contact_permission: lead.contact_permission })),
    next_actions: nextActions.slice(0, 10),
    channel_experiments: channelSummary,
    measurement_limits: [
      leads.length < 10 ? "Low volume: inspect each account individually; do not infer statistical significance." : "Account count alone does not establish a representative sample.",
      "Current stage counts are not conversion rates. Use complete stage history and consistent cohorts before calculating conversion.",
      "A qualified lead is a fit hypothesis supported by observed/reported pain and a buying role, not a guaranteed buyer.",
      "No personal contact details or raw conversations belong in this pipeline.",
      "The report drafts actions only; it never sends messages or contacts prospects."
    ]
  };
}

export function formatRevenueMarkdown(report) {
  const lines = [
    "# Revenue and acquisition review",
    "",
    "- Generated: " + report.generated_at,
    "- Company prospects: " + report.summary.total_leads,
    "- Qualified: " + report.summary.qualified_leads,
    "- Active: " + report.summary.active_leads,
    "- Wins: " + report.summary.wins,
    "- Permission issues: " + report.summary.permission_issues,
    "",
    "## Current bottleneck",
    "",
    "**" + report.bottleneck.stage + "** — " + report.bottleneck.diagnosis,
    "",
    "## Pipeline stages",
    "",
    "| Stage | Companies |",
    "|---|---:|",
    ...Object.entries(report.stage_counts).map(([stage, count]) => "| " + stage + " | " + count + " |"),
    "",
    "## Next actions",
    ""
  ];
  if (!report.next_actions.length) lines.push("No active lead actions.");
  for (const item of report.next_actions) lines.push("- **" + item.priority + " — " + item.organization + ":** " + item.action + " (" + item.reason + ")");
  lines.push("", "## Channel experiments", "");
  if (!report.channel_experiments.length) lines.push("No channel experiments recorded.");
  for (const channel of report.channel_experiments) lines.push("- " + channel.channel + " [" + channel.status + "]: " + channel.hypothesis + " — metric: " + channel.primary_metric);
  lines.push("", "## Measurement limits", "", ...report.measurement_limits.map(item => "- " + item), "");
  return lines.join("\n");
}
