import type { AgentDesignRecord, AgentReview } from "@/domain/phase6";
import type { AgentReadiness } from "@/domain/phase6";
import type { RoleId } from "@/domain/models";
import { roleCan } from "@/domain/rbac";
import type { ActionAuthorization } from "@/repositories/supabase/agentDesignStore";

/**
 * RACI and stage-gate rules for the Agentforce approval workflow.
 * Deterministic and side-effect free so the UI, exports and audit trail all
 * derive the same verdict for a given agent state.
 */

export type ApprovalStage = AgentReview["stage"];

export const APPROVAL_STAGES: readonly ApprovalStage[] = ["design-review", "risk-review", "business-review"];

export const APPROVAL_STAGE_LABEL: Record<ApprovalStage, string> = {
  "design-review": "Design review",
  "risk-review": "Risk & compliance review",
  "business-review": "Business review",
};

export interface RaciAssignment {
  readonly stage: ApprovalStage;
  readonly description: string;
  /** Roles that may record the approval decision. */
  readonly accountable: readonly RoleId[];
  readonly responsible: readonly RoleId[];
  readonly consulted: readonly RoleId[];
  readonly informed: readonly RoleId[];
}

export const RACI_MATRIX: readonly RaciAssignment[] = [
  {
    stage: "design-review",
    description: "Topic, action, grounding and instruction design is complete, traceable and technically sound.",
    accountable: ["enterprise-architect"],
    responsible: ["agentforce-architect", "data360-architect"],
    consulted: ["data-engineer"],
    informed: ["executive-sponsor", "data-steward"],
  },
  {
    stage: "risk-review",
    description: "Guardrails, escalation paths and data access map to Trust Layer controls and regulatory obligations.",
    accountable: ["data-steward"],
    responsible: ["enterprise-architect"],
    consulted: ["agentforce-architect", "data360-architect"],
    informed: ["executive-sponsor"],
  },
  {
    stage: "business-review",
    description: "Business outcome, adoption target and consumption cost are accepted by the sponsor.",
    accountable: ["executive-sponsor"],
    responsible: ["enterprise-architect"],
    consulted: ["agentforce-architect"],
    informed: ["data-steward", "data-engineer"],
  },
];

export const raciFor = (stage: ApprovalStage): RaciAssignment =>
  RACI_MATRIX.find((entry) => entry.stage === stage) ?? RACI_MATRIX[0];

/** Only the accountable role (holding the approve permission) may decide a stage. */
export const canDecideStage = (role: RoleId, stage: ApprovalStage): boolean =>
  raciFor(stage).accountable.includes(role) && roleCan(role, "approve");

export interface StageGateVerdict {
  readonly stage: ApprovalStage;
  readonly open: boolean;
  readonly blockers: readonly string[];
  readonly prerequisiteStage: ApprovalStage | null;
}

const approvedStages = (agent: AgentDesignRecord): ReadonlySet<ApprovalStage> =>
  new Set(agent.reviews.filter((review) => review.outcome === "approved").map((review) => review.stage));

/**
 * Stage gates are sequential: design → risk → business. Each stage adds its own
 * completeness checks on top of the readiness score and action authorization state.
 */
export const evaluateStageGate = (
  agent: AgentDesignRecord,
  stage: ApprovalStage,
  readiness: AgentReadiness | null,
  authorizations: readonly ActionAuthorization[] = [],
): StageGateVerdict => {
  const done = approvedStages(agent);
  const index = APPROVAL_STAGES.indexOf(stage);
  const prerequisiteStage = index > 0 ? APPROVAL_STAGES[index - 1] : null;
  const blockers: string[] = [];

  if (prerequisiteStage && !done.has(prerequisiteStage)) {
    blockers.push(`${APPROVAL_STAGE_LABEL[prerequisiteStage]} must be approved first.`);
  }

  if (stage === "design-review") {
    if (agent.topics.length === 0) blockers.push("No topics defined.");
    if (agent.actions.length === 0) blockers.push("No actions defined.");
    if (agent.grounding.length === 0) blockers.push("No grounding sources defined.");
    const unbound = agent.topics.filter((topic) => topic.permittedActionIds.length === 0);
    if (unbound.length > 0) blockers.push(`${unbound.length} topic(s) have no permitted actions bound.`);
  }

  if (stage === "risk-review") {
    if (agent.guardrails.length === 0) blockers.push("No guardrails defined.");
    const unmappedGuardrails = agent.guardrails.filter((guardrail) => guardrail.controlIds.length === 0);
    if (unmappedGuardrails.length > 0)
      blockers.push(`${unmappedGuardrails.length} guardrail(s) are not mapped to a Trust Layer control.`);
    if (agent.escalations.length === 0) blockers.push("No human escalation path defined.");
    const unauthorized = agent.actions.filter((action) => {
      const state = authorizations.find((entry) => entry.actionId === action.id)?.state ?? "unauthorized";
      return action.riskRating !== "low" && state !== "authorized";
    });
    if (unauthorized.length > 0)
      blockers.push(`${unauthorized.length} elevated-risk action(s) are not authorized for execution.`);
  }

  if (stage === "business-review") {
    if (agent.overview.successMetrics.length === 0) blockers.push("No success metrics defined.");
    if ((readiness?.overall ?? 0) < 70) blockers.push(`Readiness is ${readiness?.overall ?? 0}% — 70% required.`);
    if ((readiness?.blockers.length ?? 0) > 0)
      blockers.push(`${readiness?.blockers.length} readiness blocker(s) outstanding.`);
  }

  return { stage, open: blockers.length === 0, blockers, prerequisiteStage };
};

/** An action may be executed only when authorized and its human gates are declared. */
export const canAuthorizeAction = (role: RoleId): boolean =>
  roleCan(role, "approve") || role === "agentforce-architect" || role === "data-steward";
