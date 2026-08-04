import { architectureStudioService } from "@/services/phase2";
import { connectivityService } from "@/services/phase4";
import { activityService } from "@/services/workspace";
import { decisionReportMarkdown } from "@/services/connectivityEngine";
import { PATTERN_LABELS } from "@/domain/phase4";
import type {
  ConnectivityAssessment,
  ConnectivityDecision,
  ConnectivityDecisionResult,
  ConnectivityOverride,
  ConnectivityPatternId,
} from "@/domain/phase4";
import type { AdrOption, AdrRecord, ArchitectureApproverVote } from "@/domain/phase2";
import type { RoleId } from "@/domain/models";
import type { ActorContext } from "@/repositories/contracts";

/**
 * Glue between the connectivity decision engine and the existing Phase 2 ADR store.
 * Accepting a recommendation, or overriding it, always produces (or updates) an ADR and an
 * audit trail entry so the architecture record of decision stays authoritative for connectivity.
 */

export interface ConnectivityAdrContext {
  readonly assessment: ConnectivityAssessment;
  readonly result: ConnectivityDecisionResult;
  readonly selected: ConnectivityPatternId;
  readonly sourceName: string;
  readonly productName: string;
  readonly override?: {
    readonly rationale: string;
    readonly risks: string;
    readonly mitigation: string;
    readonly approverRole: RoleId;
    readonly effectiveDate: string;
  };
}

const APPROVAL_ROLES: readonly RoleId[] = ["enterprise-architect", "data360-architect"];

const adrIdFor = (assessmentId: string) => `adr-conn-${assessmentId}`;

const buildAdrOptions = (result: ConnectivityDecisionResult): AdrOption[] =>
  result.scores.map((score) => ({
    title: `${PATTERN_LABELS[score.pattern]} — ${score.score}/100${score.disqualified ? " (disqualified)" : ""}`,
    pros: score.contributions
      .filter((entry) => entry.rawScore > 0)
      .slice(0, 3)
      .map((entry) => `${entry.label}: ${entry.answerLabel}`)
      .join("; ") || "No strongly favourable criteria answered yet.",
    cons: score.disqualified
      ? score.disqualifiedBy.join("; ")
      : score.contributions
          .filter((entry) => entry.rawScore < 0)
          .slice(0, 3)
          .map((entry) => `${entry.label}: ${entry.answerLabel}`)
          .join("; ") || "No strongly unfavourable criteria answered yet.",
  }));

const buildAdr = (ctx: ConnectivityAdrContext, actor: ActorContext, existing?: AdrRecord): AdrRecord => {
  const overridden = Boolean(ctx.override);
  const nowIso = new Date().toISOString();
  const approvers: ArchitectureApproverVote[] = overridden
    ? APPROVAL_ROLES.map((role) => ({ role, required: true, state: "pending" as const }))
    : [{ role: actor.role, required: false, state: "approved" as const, decidedAt: nowIso }];

  return {
    id: existing?.id ?? adrIdFor(ctx.assessment.id),
    initiativeId: ctx.assessment.initiativeId,
    reference: existing?.reference ?? `ADR-CONN-${ctx.assessment.id.slice(-6).toUpperCase()}`,
    title: `Connectivity pattern for ${ctx.sourceName} → ${ctx.productName}`,
    status: overridden ? "proposed" : "approved",
    context: `The connectivity decision engine evaluated ${ctx.result.criteriaCount} criteria (${ctx.result.answeredCount} answered) for "${ctx.assessment.name}". Recommended pattern: ${PATTERN_LABELS[ctx.result.recommended]} at ${ctx.result.confidence}% confidence.`,
    options: buildAdrOptions(ctx.result),
    recommendation: overridden
      ? `Selected ${PATTERN_LABELS[ctx.selected]}, overriding the recommended ${PATTERN_LABELS[ctx.result.recommended]}.`
      : `Adopted the recommended pattern: ${PATTERN_LABELS[ctx.selected]}.`,
    rationale: overridden ? ctx.override!.rationale : ctx.result.rationale.join(" "),
    consequences: overridden
      ? `Risks: ${ctx.override!.risks}. Mitigation: ${ctx.override!.mitigation}.`
      : ctx.result.guidance.limitations.concat(ctx.result.guidance.risks).join(" "),
    risks: overridden ? [ctx.override!.risks] : [...ctx.result.guidance.risks],
    approvers,
    componentIds: [],
    connectivityDecision: ctx.selected,
    effectiveDate: ctx.override?.effectiveDate ?? nowIso,
    supersedesId: existing?.id !== adrIdFor(ctx.assessment.id) ? existing?.id : undefined,
    attachments: [],
    version: (existing?.version ?? 0) + 1,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
};

/** Records the accepted or overridden connectivity decision, generates/updates its ADR, and audits both. */
export const acceptOrOverrideConnectivityDecision = async (
  ctx: ConnectivityAdrContext,
  actor: ActorContext,
): Promise<{ decision: ConnectivityDecision; adr: AdrRecord }> => {
  const existingAdrs = await architectureStudioService.listAdrs(ctx.assessment.initiativeId);
  const existing = existingAdrs.find((entry) => entry.id === adrIdFor(ctx.assessment.id));
  const adr = buildAdr(ctx, actor, existing);
  const savedAdr = await architectureStudioService.upsertAdr(adr);

  const override: ConnectivityOverride | undefined = ctx.override
    ? {
        pattern: ctx.selected,
        rationale: ctx.override.rationale,
        risks: ctx.override.risks,
        mitigation: ctx.override.mitigation,
        approverRole: ctx.override.approverRole,
        effectiveDate: ctx.override.effectiveDate,
        decidedBy: actor.actor,
        decidedAt: new Date().toISOString(),
      }
    : undefined;

  const decision: ConnectivityDecision = {
    id: `cd-${ctx.assessment.id}`,
    assessmentId: ctx.assessment.id,
    initiativeId: ctx.assessment.initiativeId,
    recommended: ctx.result.recommended,
    selected: ctx.selected,
    confidence: ctx.result.confidence,
    rationale: ctx.result.rationale,
    override,
    adrId: savedAdr.id,
    adrReference: savedAdr.reference,
    decidedBy: actor.actor,
    decidedAt: new Date().toISOString(),
  };
  const savedDecision = await connectivityService.recordDecision(decision, override);

  await activityService.record(actor, {
    tenantId: ctx.assessment.initiativeId,
    initiativeId: ctx.assessment.initiativeId,
    action: override ? "connectivity.decision.overridden" : "connectivity.decision.accepted",
    objectType: "connectivity-assessment",
    objectId: ctx.assessment.id,
    summary: `${ctx.assessment.name} → ${PATTERN_LABELS[ctx.selected]}${override ? " (override)" : ""}`,
    oldValueSummary: PATTERN_LABELS[ctx.result.recommended],
    newValueSummary: PATTERN_LABELS[ctx.selected],
  });
  await activityService.record(actor, {
    tenantId: ctx.assessment.initiativeId,
    initiativeId: ctx.assessment.initiativeId,
    action: "architecture.decision.saved",
    objectType: "adr",
    objectId: savedAdr.id,
    summary: `${savedAdr.reference} ${savedAdr.title} (${savedAdr.status})`,
    newValueSummary: savedAdr.status,
  });

  return { decision: savedDecision, adr: savedAdr };
};

export const connectivityDecisionReport = decisionReportMarkdown;
