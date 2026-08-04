import { clients } from "@/data/clients";
import { projects, greenGrid } from "@/data/projects";
import { conditions } from "@/data/diligence";
import { riskSignals } from "@/data/risk";
import { currency, shortDate } from "@/lib/format";

export interface AssistantSource {
  label: string;
  detail: string;
  route: string;
}

export interface AssistantAnswer {
  text: string;
  sources: AssistantSource[];
  confidence: number;
  followUps: string[];
}

const summariseGreenGrid = (): AssistantAnswer => ({
  text: [
    `**${greenGrid.name}** (${greenGrid.code}) is at the ${greenGrid.stage} stage with a proposed commitment of ${currency(greenGrid.proposedCommitmentUsd, { compact: true })} against a total project cost of ${currency(greenGrid.totalProjectCostUsd, { compact: true })}.`,
    "",
    `Approval readiness is ${greenGrid.approvalReadiness}% and documentation completeness is ${greenGrid.documentationCompleteness}%. ${greenGrid.conditionsComplete} of ${greenGrid.conditionsTotal} conditions are satisfied.`,
    "",
    `The critical constraint is the environmental and social workstream. Revision C of the assessment carries two unresolved critical findings, and the predicted delay is ${greenGrid.predictedDelayDays} days against an expected approval date of ${shortDate(greenGrid.expectedApproval)}.`,
  ].join("\n"),
  sources: [
    { label: "Project record", detail: `${greenGrid.code} lifecycle and readiness`, route: `/projects/${greenGrid.id}` },
    { label: "Environmental and social assessment", detail: "Revision C, findings on pages 92 and 151", route: "/documents/doc-002" },
    { label: "Conditions register", detail: "Outstanding conditions precedent", route: "/approvals" },
  ],
  confidence: 94,
  followUps: ["What is blocking approval?", "Who should I contact at the sponsor?", "Show me the conditions at risk"],
});

const blockers = (): AssistantAnswer => {
  const open = conditions.filter((c) => c.status === "Overdue" || c.status === "Escalated").slice(0, 4);
  return {
    text: [
      "Three items are on the critical path to approval:",
      "",
      "1. **Environmental and social review** — specialist review is unresolved with two critical findings, including a biodiversity offset gap on the Nakuru corridor.",
      "2. **Resettlement consultation records** — sponsor documentation for the Sokoni and Kiambogo settlements remains outstanding.",
      "3. **Risk review escalation** — the risk node is escalated pending integrity re-screening.",
      "",
      open.length ? `Currently ${open.length} conditions are overdue or escalated across the portfolio.` : "",
    ].join("\n"),
    sources: [
      { label: "Due diligence workstreams", detail: "Environmental and social review status", route: "/due-diligence" },
      { label: "Approvals and conditions", detail: "Escalated approval nodes", route: "/approvals" },
    ],
    confidence: 91,
    followUps: ["Draft a follow-up note to the sponsor", "What is the delay impact?", "Show the approval chain"],
  };
};

const riskAnswer = (): AssistantAnswer => {
  const critical = riskSignals.filter((s) => s.severity === "Critical").slice(0, 3);
  return {
    text: [
      `The early-warning engine has ${riskSignals.length} active signals, of which ${riskSignals.filter((s) => s.severity === "Critical").length} are critical.`,
      "",
      ...critical.map((s) => `- **${s.title}** (${s.category}) — ${s.evidence} Recommended action: ${s.recommendedAction}`),
    ].join("\n"),
    sources: [
      { label: "Risk signals", detail: "Unified early-warning feed", route: "/exposure" },
      { label: "Covenant compliance", detail: "Quarterly covenant test results", route: "/exposure" },
    ],
    confidence: 90,
    followUps: ["Show the covenant breaches", "Which clients drive concentration?", "Escalate the top signal"],
  };
};

const portfolioAnswer = (): AssistantAnswer => {
  const committed = clients.reduce((s, c) => s + c.totalExposureUsd, 0);
  const pipeline = clients.reduce((s, c) => s + c.pipelineValueUsd, 0);
  return {
    text: [
      `Across ${clients.length} client relationships the platform tracks ${currency(committed, { compact: true })} of committed exposure and ${currency(pipeline, { compact: true })} of pipeline value over ${projects.length} active projects.`,
      "",
      `${projects.filter((p) => p.health === "At Risk" || p.health === "Critical").length} projects are at risk or critical, and ${projects.filter((p) => p.delayRisk === "High").length} carry a high predicted delay risk.`,
    ].join("\n"),
    sources: [
      { label: "Portfolio analytics", detail: "Committed and pipeline aggregation", route: "/analytics" },
      { label: "Project register", detail: "Health and delay indicators", route: "/projects" },
    ],
    confidence: 96,
    followUps: ["Which sectors are growing?", "Show at-risk projects", "Where is approval time longest?"],
  };
};

const relationshipAnswer = (): AssistantAnswer => {
  const meridian = clients.find((c) => c.id === "cl-meridian");
  return {
    text: [
      `**${meridian?.name}** is a ${meridian?.relationshipTier?.toLowerCase()}-tier relationship with ${currency(meridian?.totalExposureUsd ?? 0, { compact: true })} committed and ${currency(meridian?.pipelineValueUsd ?? 0, { compact: true })} in pipeline.`,
      "",
      "Engagement quality has weakened: technical interactions have declined over 60 days and the sector specialist seat on the coverage team has been vacant since 2 May. Two sponsor commitments remain open.",
      "",
      "Recommended next step: convene the coverage team before the Nairobi executive meeting and close the sponsor equity confirmation.",
    ].join("\n"),
    sources: [
      { label: "Relationship intelligence", detail: "Coverage strength and engagement trend", route: "/relationships" },
      { label: "Client 360", detail: "Open commitments and interaction history", route: "/clients/cl-meridian" },
    ],
    confidence: 88,
    followUps: ["Generate a meeting briefing", "Who are the decision makers?", "What commitments are open?"],
  };
};

const draftAnswer = (): AssistantAnswer => ({
  text: [
    "Suggested note to the sponsor:",
    "",
    "> Further to our review of Revision C of the environmental and social assessment, two matters remain outstanding ahead of committee: the biodiversity offset plan for the Nakuru critical-habitat segment, and the consultation records for the Sokoni and Kiambogo settlements.",
    ">",
    "> We would be grateful to receive both by 1 August so that specialist review can conclude without affecting the October board date.",
    "",
    "This draft is grounded in the document findings and the conditions register. Review before sending.",
  ].join("\n"),
  sources: [
    { label: "Document findings", detail: "Critical findings on pages 92 and 151", route: "/documents/doc-002" },
    { label: "Conditions register", detail: "Condition precedent evidence", route: "/approvals" },
  ],
  confidence: 85,
  followUps: ["Show the findings", "What is the committee date?", "Log this as a task"],
});

const fallback = (q: string): AssistantAnswer => ({
  text: [
    `I can answer from the client, project, diligence, exposure, document and service records held in the platform. I could not ground a specific answer for "${q}".`,
    "",
    "Try asking about a project's approval readiness, portfolio exposure, early-warning signals, relationship coverage, or outstanding conditions.",
  ].join("\n"),
  sources: [],
  confidence: 42,
  followUps: ["Summarise the GreenGrid project", "What are today's portfolio risks?", "Show open conditions"],
});

export const answerFor = (question: string): AssistantAnswer => {
  const q = question.toLowerCase();
  if (/(draft|write|note|email|letter|respond)/.test(q)) return draftAnswer();
  if (/(block|delay|approval|conditions?|committee)/.test(q)) return blockers();
  if (/(risk|covenant|breach|warning|exposure|concentration)/.test(q)) return riskAnswer();
  if (/(relationship|coverage|contact|meeting|briefing|sponsor|client)/.test(q)) return relationshipAnswer();
  if (/(greengrid|green grid|phx-2026-1048|project)/.test(q)) return summariseGreenGrid();
  if (/(portfolio|pipeline|overall|summary|health)/.test(q)) return portfolioAnswer();
  return fallback(question);
};

export const SUGGESTED_PROMPTS = [
  "Summarise the GreenGrid Renewable Energy Expansion",
  "What is blocking approval on the flagship project?",
  "Show today's portfolio risk signals",
  "Prepare me for the Meridian executive meeting",
];
