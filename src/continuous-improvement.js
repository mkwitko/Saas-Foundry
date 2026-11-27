function dateAgeDays(value, now) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? (now.getTime() - time) / 86_400_000 : null;
}

function unique(items) {
  return [...new Set(items)];
}

export function buildImprovementReport({ ledger, customerIntelligence = null, now = new Date(), runningExperimentDays = 30 }) {
  if (!ledger || typeof ledger !== "object" || !Array.isArray(ledger.claims) || !Array.isArray(ledger.decisions) || !Array.isArray(ledger.experiments)) {
    throw new Error("Evidence ledger must contain claims, decisions and experiments arrays.");
  }
  if (!Number.isInteger(runningExperimentDays) || runningExperimentDays < 1) {
    throw new Error("runningExperimentDays must be a positive integer.");
  }

  const staleClaims = ledger.claims.filter(claim => {
    if (claim.status === "stale") return true;
    if (claim.status !== "current") return false;
    const age = dateAgeDays(claim.checked_at, now);
    return age !== null && Number.isInteger(claim.review_after_days) && claim.review_after_days >= 0 && age > claim.review_after_days;
  }).map(claim => ({
    id: claim.id,
    claim: claim.claim,
    evidence_class: claim.evidence_class,
    confidence: claim.confidence,
    checked_at: claim.checked_at,
    review_after_days: claim.review_after_days
  }));

  const decisionsDue = ledger.decisions.filter(decision =>
    decision.status === "accepted" && decision.review_on && Date.parse(decision.review_on) <= now.getTime()
  ).map(decision => ({
    id: decision.id,
    decision: decision.decision,
    owner: decision.owner,
    review_on: decision.review_on,
    evidence_ids: decision.evidence_ids ?? []
  }));

  const incompleteExperiments = ledger.experiments.filter(experiment =>
    experiment.status === "completed" && (!experiment.result || !experiment.decision)
  ).map(experiment => ({ id: experiment.id, hypothesis: experiment.hypothesis, owner: experiment.owner }));

  const overdueExperiments = ledger.experiments.filter(experiment => {
    if (experiment.status !== "running") return false;
    const age = dateAgeDays(experiment.started_at, now);
    return age !== null && age > runningExperimentDays;
  }).map(experiment => ({
    id: experiment.id,
    hypothesis: experiment.hypothesis,
    owner: experiment.owner,
    started_at: experiment.started_at,
    age_days: Math.floor(dateAgeDays(experiment.started_at, now))
  }));

  const runningExperiments = ledger.experiments.filter(experiment => experiment.status === "running");
  const proposedExperiments = ledger.experiments.filter(experiment => experiment.status === "proposed");
  const customerIssues = (customerIntelligence?.priority_issues ?? []).filter(issue =>
    issue && typeof issue === "object" && typeof issue.category === "string" &&
    Number.isInteger(issue.affected_accounts) && issue.affected_accounts > 0
  ).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.affected_accounts - a.affected_accounts);

  let nextAction;
  if (incompleteExperiments.length) {
    nextAction = {
      priority: "high",
      type: "complete_experiment_record",
      title: "Record the outcome and decision for completed experiments",
      reason: "Completed experiments without a result and explicit decision cannot update the evidence base.",
      items: incompleteExperiments.map(item => item.id)
    };
  } else if (overdueExperiments.length) {
    nextAction = {
      priority: "high",
      type: "review_overdue_experiments",
      title: "Review running experiments that exceeded the observation window",
      reason: "Close, extend with a reason, or redesign each overdue experiment; do not leave it running indefinitely.",
      items: overdueExperiments.map(item => item.id)
    };
  } else if (staleClaims.length) {
    nextAction = {
      priority: "high",
      type: "revalidate_evidence",
      title: "Revalidate stale evidence before using it for product or growth decisions",
      reason: "Expired or explicitly stale claims should not silently support current strategy.",
      items: staleClaims.map(item => item.id)
    };
  } else if (decisionsDue.length) {
    nextAction = {
      priority: "medium",
      type: "review_decisions",
      title: "Review accepted decisions whose review date has arrived",
      reason: "Confirm whether the assumptions and evidence behind these decisions still hold.",
      items: decisionsDue.map(item => item.id)
    };
  } else if (customerIssues.length) {
    const issue = customerIssues[0];
    nextAction = {
      priority: "medium",
      type: "design_customer_experiment",
      title: "Design a small experiment around the highest-priority observed customer pain",
      reason: "Use the supplied sanitized feedback/support aggregate; validate the pain with affected customers before broad claims.",
      source_issue: issue.category,
      affected_accounts: issue.affected_accounts,
      proposed_experiment: {
        hypothesis: `If we address the reported ${issue.category} issue, affected accounts should experience fewer occurrences of that issue in the next comparable observation window.`,
        target_segment: "Affected existing accounts; confirm eligibility before outreach.",
        intervention: "Draft the smallest reversible product, onboarding or support change that addresses the reported issue.",
        primary_metric: `Affected accounts reporting ${issue.category}`,
        baseline: "unknown_until_measured",
        guardrails: ["Compare the same cohort and observation window.", "Do not use sensitive customer or patient data for targeting.", "Do not contact customers without approval."]
      }
    };
  } else if (proposedExperiments.length) {
    nextAction = {
      priority: "medium",
      type: "select_experiment",
      title: "Select one proposed experiment and define its observation window",
      reason: "Keep the active work-in-progress limit small and define the metric and guardrails before starting.",
      items: proposedExperiments.map(item => item.id)
    };
  } else if (runningExperiments.length) {
    nextAction = {
      priority: "low",
      type: "check_experiment_progress",
      title: "Check progress against the active experiment's observation window",
      reason: "Review the metric and guardrails without changing the experiment mid-flight.",
      items: runningExperiments.map(item => item.id)
    };
  } else {
    nextAction = {
      priority: "medium",
      type: "collect_baseline",
      title: "Collect a privacy-safe baseline before choosing the next improvement",
      reason: "No stale evidence, due decisions or active experiments were found; use real customer outcomes and comparable metrics to choose the next bet.",
      items: []
    };
  }

  return {
    schema_version: "0.1",
    generated_at: now.toISOString(),
    summary: {
      claims: ledger.claims.length,
      stale_claims: staleClaims.length,
      decisions_due: decisionsDue.length,
      experiments: ledger.experiments.length,
      incomplete_experiments: incompleteExperiments.length,
      overdue_experiments: overdueExperiments.length,
      running_experiments: runningExperiments.length,
      proposed_experiments: proposedExperiments.length,
      customer_issues_considered: customerIssues.length
    },
    stale_claims: staleClaims,
    decisions_due: decisionsDue,
    incomplete_experiments: incompleteExperiments,
    overdue_experiments: overdueExperiments,
    next_action: nextAction,
    operating_rules: [
      "Treat real customer evidence, measured analytics, founder reports, estimates and simulations as distinct evidence classes.",
      "Do not infer causality from correlation or statistical significance from small samples.",
      "Keep one primary improvement experiment active unless capacity and measurement justify more.",
      "Require a baseline, primary metric, observation window, guardrails, owner and decision date before starting an experiment.",
      "External outreach, publishing, paid spend and production changes remain approval-gated."
    ]
  };
}

export function formatImprovementMarkdown(report) {
  const lines = [
    "# Continuous improvement review",
    "",
    "- Generated: " + report.generated_at,
    "- Claims: " + report.summary.claims + " (" + report.summary.stale_claims + " stale)",
    "- Decisions due: " + report.summary.decisions_due,
    "- Experiments: " + report.summary.experiments + " (" + report.summary.running_experiments + " running, " + report.summary.proposed_experiments + " proposed)",
    "",
    "## Next action",
    "",
    "**" + report.next_action.priority.toUpperCase() + " — " + report.next_action.title + "**",
    report.next_action.reason,
    "",
    "## Evidence requiring attention",
    ""
  ];
  if (!report.stale_claims.length) lines.push("No stale claims detected.");
  else for (const claim of report.stale_claims) lines.push("- " + claim.id + ": " + claim.claim + " (" + claim.evidence_class + ", " + claim.confidence + ")");
  lines.push("", "## Experiments requiring attention", "");
  if (!report.incomplete_experiments.length && !report.overdue_experiments.length) lines.push("No incomplete or overdue experiment records.");
  for (const experiment of report.incomplete_experiments) lines.push("- Complete result/decision for " + experiment.id + ": " + experiment.hypothesis);
  for (const experiment of report.overdue_experiments) lines.push("- Review " + experiment.id + " (" + experiment.age_days + " days running): " + experiment.hypothesis);
  if (report.next_action.proposed_experiment) {
    lines.push("", "## Draft experiment", "", "- Hypothesis: " + report.next_action.proposed_experiment.hypothesis, "- Primary metric: " + report.next_action.proposed_experiment.primary_metric, "- Baseline: " + report.next_action.proposed_experiment.baseline, "- Intervention: " + report.next_action.proposed_experiment.intervention);
  }
  lines.push("", "## Operating rules", "", ...report.operating_rules.map(rule => "- " + rule), "");
  return lines.join("\n");
}
