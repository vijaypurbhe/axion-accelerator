/**
 * Phase 6 Agentforce engine: deterministic readiness scoring, topic diagnostics,
 * traceability composition, consumption planning, change-impact and explainable
 * design suggestions. All suggestions are labelled and require human acceptance.
 */

import { getTemplate } from "@/data/dataProductLibrary";
import { getSourceSystem } from "@/data/sourceCatalog";
import { controlById } from "@/data/trustControlLibrary";
import { patternById } from "@/data/agentforceSeed";
import type { RiskLevel } from "@/domain/models";
import type {
  AgentDesignRecord,
  AgentReadiness,
  AgentSuggestion,
  ChangeImpact,
  ConsumptionAssumptions,
  ConsumptionScenario,
  TopicDiagnostic,
  TraceabilityRow,
} from "@/domain/phase6";

/* ============================== Readiness ==================================== */

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const ratio = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator);

export const evaluateAgentReadiness = (agent: AgentDesignRecord): AgentReadiness => {
  const topics = agent.topics;
  const actions = agent.actions;
  const approvedTopics = topics.filter((t) => t.status === "approved").length;
  const topicsWithUtterances = topics.filter((t) => t.sampleUtterances.length >= 2).length;
  const actionsWithControls = actions.filter((a) => a.controlIds.length > 0).length;
  const groundedTopics = topics.filter((t) => t.requiredDataProductIds.length > 0).length;
  const guardrailsReviewed = agent.guardrails.filter((g) => g.reviewed).length;
  const guardrailsMapped = agent.guardrails.filter((g) => g.controlIds.length > 0).length;
  const testsPassing = agent.testCases.filter((t) => t.status === "passing").length;
  const humanSteps = agent.boundaries.filter((b) => b.mode === "human-led").length;

  const dimensions = [
    {
      id: "topic-design",
      label: "Topic design",
      weight: 0.18,
      score: clamp(
        (ratio(approvedTopics, topics.length) * 60 + ratio(topicsWithUtterances, topics.length) * 40) || 0,
      ),
      note: `${approvedTopics}/${topics.length} topics approved, ${topicsWithUtterances} with training utterances`,
    },
    {
      id: "action-design",
      label: "Action design",
      weight: 0.18,
      score: clamp(
        (ratio(actionsWithControls, actions.length) * 55 +
          ratio(actions.filter((a) => a.validation.length > 0).length, actions.length) * 45) || 0,
      ),
      note: `${actionsWithControls}/${actions.length} actions mapped to controls`,
    },
    {
      id: "grounding",
      label: "Grounding coverage",
      weight: 0.16,
      score: clamp(
        (ratio(groundedTopics, topics.length) * 50 +
          ratio(agent.grounding.filter((g) => g.citationRequired).length, Math.max(1, agent.grounding.length)) * 50) || 0,
      ),
      note: `${agent.grounding.length} grounding sources, ${groundedTopics} topics with declared data needs`,
    },
    {
      id: "guardrails",
      label: "Guardrails and controls",
      weight: 0.18,
      score: clamp(
        (ratio(guardrailsReviewed, Math.max(1, agent.guardrails.length)) * 50 +
          ratio(guardrailsMapped, Math.max(1, agent.guardrails.length)) * 50) || 0,
      ),
      note: `${guardrailsMapped}/${agent.guardrails.length} guardrails mapped to trust controls`,
    },
    {
      id: "escalation",
      label: "Human escalation",
      weight: 0.12,
      score: clamp(agent.escalations.length === 0 ? 0 : Math.min(100, agent.escalations.length * 28 + humanSteps * 8)),
      note: `${agent.escalations.length} escalation paths, ${humanSteps} human-led process steps`,
    },
    {
      id: "testing",
      label: "Test readiness",
      weight: 0.18,
      score: clamp(ratio(testsPassing, Math.max(1, agent.testCases.length)) * 100),
      note: `${testsPassing}/${agent.testCases.length} test cases passing`,
    },
  ];

  const overall = clamp(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0));

  const blockers: string[] = [];
  if (agent.escalations.length === 0) blockers.push("No human escalation path is modelled.");
  if (agent.guardrails.length === 0) blockers.push("No guardrails defined.");
  if (guardrailsMapped < agent.guardrails.length)
    blockers.push(`${agent.guardrails.length - guardrailsMapped} guardrails are not mapped to a trust control.`);
  if (actions.some((a) => a.riskRating === "critical" && a.testStatus !== "passing"))
    blockers.push("A critical-risk action has no passing test.");
  if (agent.boundaries.length === 0) blockers.push("Deterministic process boundaries are not defined.");
  if (topics.some((t) => t.permittedActionIds.length === 0))
    blockers.push("At least one topic has no permitted actions.");

  return { overall, dimensions, blockers };
};

/* =========================== Topic diagnostics =============================== */

const tokenise = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3);

const jaccard = (a: readonly string[], b: readonly string[]): number => {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
};

export const diagnoseTopics = (agent: AgentDesignRecord): TopicDiagnostic[] => {
  const diagnostics: TopicDiagnostic[] = [];
  const topics = agent.topics;

  for (let i = 0; i < topics.length; i += 1) {
    for (let j = i + 1; j < topics.length; j += 1) {
      const a = topics[i];
      const b = topics[j];
      const similarity = jaccard(
        tokenise(`${a.name} ${a.classificationDescription} ${a.sampleUtterances.join(" ")}`),
        tokenise(`${b.name} ${b.classificationDescription} ${b.sampleUtterances.join(" ")}`),
      );
      if (similarity >= 0.5) {
        diagnostics.push({
          kind: "duplicate",
          severity: "high",
          topicIds: [a.id, b.id],
          message: `"${a.name}" and "${b.name}" look like duplicates (${Math.round(similarity * 100)}% descriptor overlap). Merge or re-scope.`,
        });
      } else if (similarity >= 0.3) {
        diagnostics.push({
          kind: "overlap",
          severity: "medium",
          topicIds: [a.id, b.id],
          message: `"${a.name}" and "${b.name}" overlap (${Math.round(similarity * 100)}%). Classification may be ambiguous at runtime.`,
        });
      }

      const conflicting = a.permittedActionIds.filter((actionId) => b.prohibitedActions.length > 0 && b.permittedActionIds.includes(actionId) === false && a.name !== b.name && false);
      if (conflicting.length > 0) {
        diagnostics.push({
          kind: "conflict",
          severity: "high",
          topicIds: [a.id, b.id],
          message: `Conflicting action permissions between "${a.name}" and "${b.name}".`,
        });
      }
    }
  }

  // Instruction conflicts: same action permitted in one topic and prohibited by name in another.
  for (const topic of topics) {
    for (const prohibited of topic.prohibitedActions) {
      const match = agent.actions.find((action) => action.name.toLowerCase() === prohibited.toLowerCase());
      if (match && topic.permittedActionIds.includes(match.id)) {
        diagnostics.push({
          kind: "conflict",
          severity: "critical",
          topicIds: [topic.id],
          message: `Topic "${topic.name}" both permits and prohibits action "${match.name}".`,
        });
      }
    }
    if (topic.permittedActionIds.length === 0) {
      diagnostics.push({
        kind: "coverage",
        severity: "medium",
        topicIds: [topic.id],
        message: `Topic "${topic.name}" has no permitted actions and cannot complete a task.`,
      });
    }
    if (topic.sampleUtterances.length < 2) {
      diagnostics.push({
        kind: "coverage",
        severity: "medium",
        topicIds: [topic.id],
        message: `Topic "${topic.name}" needs at least two sample utterances for reliable classification.`,
      });
    }
    if (topic.escalationConditions.length === 0) {
      diagnostics.push({
        kind: "coverage",
        severity: "low",
        topicIds: [topic.id],
        message: `Topic "${topic.name}" declares no escalation conditions.`,
      });
    }
    if (!topic.useCaseRef) {
      diagnostics.push({
        kind: "traceability",
        severity: "low",
        topicIds: [topic.id],
        message: `Topic "${topic.name}" is not traced to a use case.`,
      });
    }
    for (const dataProductId of topic.requiredDataProductIds) {
      const grounded = agent.grounding.some((source) => source.dataProductId === dataProductId);
      if (!grounded) {
        diagnostics.push({
          kind: "traceability",
          severity: "high",
          topicIds: [topic.id],
          message: `Topic "${topic.name}" requires data product ${dataProductId} with no matching grounding source.`,
        });
      }
    }
  }

  return diagnostics;
};

/* ============================== Traceability ================================= */

export const buildTraceability = (agent: AgentDesignRecord): TraceabilityRow[] => {
  const rows: TraceabilityRow[] = [];
  for (const topic of agent.topics) {
    const actions = topic.permittedActionIds
      .map((id) => agent.actions.find((action) => action.id === id))
      .filter((action): action is NonNullable<typeof action> => Boolean(action));
    const targetActions = actions.length > 0 ? actions : [undefined];

    for (const action of targetActions) {
      const dataProductIds = topic.requiredDataProductIds.length > 0 ? topic.requiredDataProductIds : ["—"];
      for (const dataProductId of dataProductIds) {
        const source = agent.grounding.find((g) => g.dataProductId === dataProductId);
        const controlIds = [...new Set([...(action?.controlIds ?? []), ...(source?.controlIds ?? [])])];
        rows.push({
          agent: agent.overview.name,
          topic: topic.name,
          action: action ? action.name : "No action bound",
          dataProduct: getTemplate(dataProductId)?.name ?? dataProductId,
          source: source?.sourceSystemId
            ? getSourceSystem(source.sourceSystemId)?.name ?? source.sourceSystemId
            : source?.name ?? "Not grounded",
          control: controlIds.length > 0 ? controlIds.map((id) => controlById(id)?.id ?? id).join(", ") : "Unmapped",
        });
      }
    }
  }
  return rows;
};

/* ============================ Consumption model ============================== */

export const computeConsumption = (assumptions: ConsumptionAssumptions): ConsumptionScenario[] => {
  const conversations =
    assumptions.expectedUsers * assumptions.sessionsPerUserPerMonth * assumptions.conversationsPerSession;

  const build = (label: ConsumptionScenario["label"], factor: number): ConsumptionScenario => {
    const conversationsPerMonth = Math.round(conversations * factor);
    const actionsPerMonth = Math.round(conversationsPerMonth * assumptions.actionsPerConversation);
    const retrievalsPerMonth = Math.round(conversationsPerMonth * assumptions.retrievalCallsPerConversation);
    const credits =
      conversationsPerMonth * assumptions.creditsPerConversation +
      actionsPerMonth * assumptions.creditsPerAction +
      retrievalsPerMonth * assumptions.creditsPerRetrieval;
    const monthlyCost = credits * assumptions.costPerCredit;
    const growthMultiplier =
      assumptions.monthlyGrowthRate === 0
        ? 12
        : ((1 + assumptions.monthlyGrowthRate) ** 12 - 1) / assumptions.monthlyGrowthRate;
    return {
      label,
      conversationsPerMonth,
      actionsPerMonth,
      retrievalsPerMonth,
      peakConversationsPerHour: Math.round(
        (conversationsPerMonth / 22 / 8) * Math.max(1, assumptions.peakConcurrencyFactor),
      ),
      creditsPerMonth: Math.round(credits),
      estimatedMonthlyCost: Math.round(monthlyCost),
      annualisedCost: Math.round(monthlyCost * 12),
      year1WithGrowth: Math.round(monthlyCost * growthMultiplier),
    };
  };

  return [
    build("Low", assumptions.lowVarianceFactor),
    build("Base", 1),
    build("High", assumptions.highVarianceFactor),
  ];
};

/* ============================== Change impact ================================ */

export const analyseChangeImpact = (agent: AgentDesignRecord): ChangeImpact[] => {
  const latest = agent.versions[agent.versions.length - 1];
  const previous = agent.versions[agent.versions.length - 2];
  const impacts: ChangeImpact[] = [];

  if (latest && previous) {
    const delta = (key: keyof typeof latest.counts) => latest.counts[key] - previous.counts[key];
    const areas: [keyof typeof latest.counts, string, string][] = [
      ["topics", "Topics", "Retrain classification and refresh the test pack"],
      ["actions", "Actions", "Re-test authorisation, validation and rollback behaviour"],
      ["grounding", "Grounding", "Re-verify permitted fields, freshness and citation coverage"],
      ["guardrails", "Guardrails", "Re-map to the trust control library and re-run guardrail tests"],
      ["escalations", "Escalations", "Update routing configuration and specialist runbooks"],
    ];
    for (const [key, area, impact] of areas) {
      const change = delta(key);
      if (change !== 0) {
        impacts.push({
          area,
          change: `${change > 0 ? "+" : ""}${change} between v${previous.version} and v${latest.version}`,
          impact,
          severity: Math.abs(change) >= 3 ? "high" : Math.abs(change) >= 2 ? "medium" : "low",
        });
      }
    }
  }

  const unmappedGuardrails = agent.guardrails.filter((g) => g.controlIds.length === 0).length;
  if (unmappedGuardrails > 0) {
    impacts.push({
      area: "Control mapping",
      change: `${unmappedGuardrails} guardrails without a control mapping`,
      impact: "Trust posture cannot be evidenced at the approval gate",
      severity: "high",
    });
  }

  const untestedCritical = agent.actions.filter((a) => a.riskRating === "critical" && a.testStatus !== "passing");
  if (untestedCritical.length > 0) {
    impacts.push({
      area: "Validation",
      change: `${untestedCritical.length} critical actions without a passing test`,
      impact: "Blocks Ready for Deployment",
      severity: "critical",
    });
  }

  return impacts;
};

/* ============================= AI-assisted design ============================ */

let suggestionCounter = 0;
const nextId = () => {
  suggestionCounter += 1;
  return `sg-${suggestionCounter}-${Math.random().toString(36).slice(2, 6)}`;
};

const suggestion = (
  kind: AgentSuggestion["kind"],
  title: string,
  detail: string,
  rationale: string,
  confidence: number,
  origin: AgentSuggestion["origin"] = "ai-suggested",
): AgentSuggestion => ({ id: nextId(), kind, title, detail, rationale, confidence, origin });

/**
 * Deterministic, explainable suggestion generation. Nothing here mutates the design —
 * every item must be explicitly accepted, edited or rejected by a human.
 */
export const generateAgentSuggestions = (agent: AgentDesignRecord): AgentSuggestion[] => {
  const out: AgentSuggestion[] = [];
  const pattern = patternById(agent.overview.patternId);
  const topicNames = new Set(agent.topics.map((t) => t.name.toLowerCase()));

  for (const candidate of pattern?.suggestedTopics ?? []) {
    if (!topicNames.has(candidate.toLowerCase())) {
      out.push(
        suggestion(
          "topic",
          candidate,
          `Add a "${candidate}" topic with classification description, scope, utterances and permitted actions.`,
          `The ${pattern?.name} pattern normally includes this topic and it is absent from the current design.`,
          0.72,
        ),
      );
    }
  }

  for (const topic of agent.topics) {
    if (topic.sampleUtterances.length < 3) {
      out.push(
        suggestion(
          "intent",
          `Expand utterances for "${topic.name}"`,
          "Add at least three varied utterances covering direct, indirect and abbreviated phrasing.",
          `Only ${topic.sampleUtterances.length} utterance(s) present; classification confidence will be unstable.`,
          0.68,
          "rules-suggested",
        ),
      );
    }
    if (topic.escalationConditions.length === 0) {
      out.push(
        suggestion(
          "escalation",
          `Escalation condition for "${topic.name}"`,
          "Define a low-confidence escalation path to a named human destination with an SLA.",
          "Topics without escalation conditions strand users when grounding fails.",
          0.75,
          "rules-suggested",
        ),
      );
    }
  }

  const actionNames = new Set(agent.actions.map((a) => a.name.toLowerCase()));
  for (const candidate of pattern?.suggestedActions ?? []) {
    if (!actionNames.has(candidate.toLowerCase())) {
      out.push(
        suggestion(
          "action",
          candidate,
          `Define the "${candidate}" action with inputs, outputs, authorisation, validation and rollback.`,
          `Pattern ${pattern?.name} typically requires this action to complete its topics.`,
          0.66,
        ),
      );
    }
  }

  const presentCategories = new Set(agent.guardrails.map((g) => g.category));
  for (const category of pattern?.suggestedGuardrails ?? []) {
    if (!presentCategories.has(category)) {
      out.push(
        suggestion(
          "guardrail",
          `Add a ${category.replace(/-/g, " ")} guardrail`,
          `Author an enforceable ${category.replace(/-/g, " ")} guardrail and map it to the trust control library.`,
          `No guardrail exists in the ${category.replace(/-/g, " ")} category for a ${pattern?.name}.`,
          0.78,
        ),
      );
    }
  }

  if (agent.overview.automationLevel !== "assistive" && !presentCategories.has("authorization")) {
    out.push(
      suggestion(
        "guardrail",
        "Authorisation guardrail for autonomous behaviour",
        "Require explicit permission checks before any action that changes a system of record.",
        `Automation level "${agent.overview.automationLevel}" exceeds assistive without an authorisation guardrail.`,
        0.86,
        "rules-suggested",
      ),
    );
  }

  for (const action of agent.actions) {
    if (action.controlIds.length === 0) {
      out.push(
        suggestion(
          "control",
          `Map controls to "${action.name}"`,
          "Attach the relevant trust controls covering audit, classification and authorisation.",
          "Actions without control mappings cannot be evidenced at the risk review gate.",
          0.8,
          "rules-suggested",
        ),
      );
    }
    if (action.riskRating === "critical" && action.testStatus !== "passing") {
      out.push(
        suggestion(
          "test-case",
          `Guardrail test for "${action.name}"`,
          "Author a negative test proving the action cannot execute outside its authorisation boundary.",
          "Critical-risk actions must have a passing guardrail test before deployment readiness.",
          0.88,
          "rules-suggested",
        ),
      );
    }
    if (action.actionType === "record-update" && !action.requiresConfirmation) {
      out.push(
        suggestion(
          "instruction",
          `Confirmation requirement for "${action.name}"`,
          "Add an explicit user confirmation step before the record update executes.",
          "Record updates without confirmation create unreviewable system-of-record changes.",
          0.82,
          "rules-suggested",
        ),
      );
    }
  }

  const ungrounded = agent.topics.filter((t) => t.requiredDataProductIds.length === 0);
  if (ungrounded.length > 0) {
    out.push(
      suggestion(
        "dependency",
        "Declare data dependencies",
        `Bind data products to: ${ungrounded.map((t) => t.name).join(", ")}.`,
        "Topics without declared data products cannot be traced from agent to source.",
        0.74,
        "rules-suggested",
      ),
    );
  }

  const riskCandidates: [boolean, string, string, RiskLevel][] = [
    [
      agent.grounding.some((g) => !g.citationRequired && g.dataClassification === "regulated"),
      "Uncited regulated grounding",
      "Regulated data is used for grounding without a citation requirement, weakening explainability.",
      "high",
    ],
    [
      agent.escalations.length < 2 && agent.overview.channels.some((c) => c !== "internal-console"),
      "Thin escalation coverage on customer channels",
      "Customer-facing channels need multiple escalation paths including vulnerability and authentication failure.",
      "high",
    ],
    [
      agent.actions.some((a) => a.actionType === "external-api" && a.retryBehavior.toLowerCase().includes("no retry")),
      "External dependency fragility",
      "External API actions with no retry create conversation failures on transient errors.",
      "medium",
    ],
  ];
  for (const [condition, title, detail, severity] of riskCandidates) {
    if (condition) {
      out.push(
        suggestion(
          "risk",
          title,
          detail,
          `Detected from the current design; suggested severity ${severity}. Add to the risk register for ownership.`,
          0.7,
        ),
      );
    }
  }

  if (agent.overview.successMetrics.length < 3) {
    out.push(
      suggestion(
        "metric",
        "Add a containment or quality metric",
        "Track cited-response rate, escalation rate and containment alongside the business metric.",
        "Fewer than three success metrics makes benefit realisation unverifiable at Monitor stage.",
        0.64,
      ),
    );
  }

  return out;
};
