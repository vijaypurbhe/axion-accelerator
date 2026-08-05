import type { AgentDesignRecord } from "@/domain/phase6";
import { buildTraceability, computeConsumption, evaluateAgentReadiness } from "@/services/agentforceEngine";
import { AGENT_STATUS_LABEL } from "@/domain/phase6";

/** Phase 6 output generation: design specification (Markdown) and traceability (CSV). */

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export const traceabilityCsv = (agent: AgentDesignRecord): string => {
  const rows = buildTraceability(agent);
  const header = ["Agent", "Topic", "Action", "Data product", "Source", "Control"];
  return [
    header.join(","),
    ...rows.map((row) =>
      [row.agent, row.topic, row.action, row.dataProduct, row.source, row.control].map(csvCell).join(","),
    ),
  ].join("\n");
};

export const agentSpecificationMarkdown = (agent: AgentDesignRecord): string => {
  const readiness = evaluateAgentReadiness(agent);
  const scenarios = computeConsumption(agent.consumption);
  const o = agent.overview;

  const lines: string[] = [
    `# ${o.name} — Agentforce design specification`,
    "",
    `**Reference:** ${agent.reference} · **Version:** ${agent.version} · **Status:** ${AGENT_STATUS_LABEL[agent.status]}`,
    `**Readiness:** ${readiness.overall}% · **Risk:** ${agent.riskRating} · **Release:** ${agent.release}`,
    "",
    "## 1. Overview",
    `- Description: ${o.description}`,
    `- Business objective: ${o.businessObjective}`,
    `- Target outcome: ${o.businessOutcome}`,
    `- Persona / users: ${o.targetPersona} — ${o.targetUsers}`,
    `- Channels: ${o.channels.join(", ")}`,
    `- Automation level: ${o.automationLevel}`,
    `- Environment: ${o.environment} · Hours: ${o.hoursOfOperation}`,
    `- Expected volume: ${o.expectedVolume}`,
    `- Expected impact: ${o.expectedBusinessImpact}`,
    "",
    "### Success metrics",
    ...(o.successMetrics.length === 0
      ? ["- None defined"]
      : o.successMetrics.map((m) => `- ${m.name}: ${m.baseline} → ${m.target} (${m.measurement})`)),
    "",
    "### Out of scope",
    ...(o.outOfScope.length === 0 ? ["- Not declared"] : o.outOfScope.map((item) => `- ${item}`)),
    "",
    "## 2. Topics",
    ...agent.topics.flatMap((topic) => [
      `### ${topic.name} (${topic.status}, ${topic.priority} priority)`,
      `- Classification: ${topic.classificationDescription}`,
      `- Scope: ${topic.scope}`,
      `- Utterances: ${topic.sampleUtterances.join(" | ") || "none"}`,
      `- Instructions: ${topic.instructions.join(" ") || "none"}`,
      `- Permitted actions: ${topic.permittedActionIds.join(", ") || "none"}`,
      `- Prohibited: ${topic.prohibitedActions.join(", ") || "none"}`,
      `- Data products: ${topic.requiredDataProductIds.join(", ") || "none"}`,
      `- Escalation: ${topic.escalationConditions.join("; ") || "none"}`,
      "",
    ]),
    "## 3. Actions",
    "| Action | Type | System | Risk | Confirmation | Controls | Test |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...agent.actions.map(
      (a) =>
        `| ${a.name} | ${a.actionType} | ${a.system} | ${a.riskRating} | ${a.requiresConfirmation ? "Yes" : "No"} | ${
          a.controlIds.join(", ") || "Unmapped"
        } | ${a.testStatus} |`,
    ),
    "",
    "## 4. Grounding",
    "| Source | Type | Retrieval | Freshness | Identity | Citation | Classification |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...agent.grounding.map(
      (g) =>
        `| ${g.name} | ${g.sourceType} | ${g.retrievalPattern} | ${g.freshness} | ${g.identityRequirement} | ${
          g.citationRequired ? "Required" : "Optional"
        } | ${g.dataClassification} |`,
    ),
    "",
    "## 5. Instructions",
    ...Object.entries(agent.instructions).flatMap(([key, values]) => [
      `### ${key}`,
      ...(values as readonly string[]).map((value) => `- ${value}`),
      "",
    ]),
    "## 6. Guardrails",
    "| Category | Statement | Enforcement | Severity | Controls |",
    "| --- | --- | --- | --- | --- |",
    ...agent.guardrails.map(
      (g) =>
        `| ${g.category} | ${g.statement} | ${g.enforcement} | ${g.severity} | ${g.controlIds.join(", ") || "Unmapped"} |`,
    ),
    "",
    "## 7. Human escalation",
    ...agent.escalations.map(
      (e) => `- ${e.trigger} → ${e.destinationRole} (SLA ${e.slaMinutes} min). ${e.summaryRequirements}`,
    ),
    "",
    "## 8. Deterministic process boundaries",
    "| # | Step | Mode | Deterministic logic | Approval |",
    "| --- | --- | --- | --- | --- |",
    ...[...agent.boundaries]
      .sort((a, b) => a.sequence - b.sequence)
      .map((b) => `| ${b.sequence} | ${b.step} | ${b.mode} | ${b.deterministicLogic} | ${b.approvalRequirement} |`),
    "",
    "## 9. Consumption and cost",
    "| Scenario | Conversations/mo | Actions/mo | Retrievals/mo | Credits/mo | Monthly cost | Year 1 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...scenarios.map(
      (s) =>
        `| ${s.label} | ${s.conversationsPerMonth} | ${s.actionsPerMonth} | ${s.retrievalsPerMonth} | ${s.creditsPerMonth} | ${s.estimatedMonthlyCost} | ${s.year1WithGrowth} |`,
    ),
    "",
    "## 10. Readiness and blockers",
    ...readiness.dimensions.map((d) => `- ${d.label}: ${d.score}% — ${d.note}`),
    ...(readiness.blockers.length === 0 ? ["- No blockers"] : readiness.blockers.map((b) => `- BLOCKER: ${b}`)),
    "",
    "## 11. Approvals",
    ...(agent.reviews.length === 0
      ? ["- No reviews recorded"]
      : agent.reviews.map((r) => `- ${r.stage}: ${r.outcome} (${r.reviewerRole}) ${r.comments}`)),
  ];

  return lines.join("\n");
};

export const downloadTextFile = (filename: string, content: string, mime = "text/plain") => {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
