import { APPLICABILITY_FACTORS, CONTROL_LIBRARY, controlById } from "@/data/trustControlLibrary";
import type {
  ApplicabilityFactorId,
  ApplicabilityProfile,
  ApplicabilitySuggestion,
  ControlEffectiveness,
  ControlInstance,
  ControlTest,
  EvidenceRecord,
  GateBlocker,
  RiskEntry,
  TrustGateStatus,
  TrustPosture,
} from "@/domain/phase5";
import type { LifecycleStageId } from "@/domain/types";
import type { RiskLevel } from "@/domain/models";
import { FRAMEWORKS } from "@/data/trustControlLibrary";

/* ========================== Applicability engine ============================= */

const factorLabel = (id: ApplicabilityFactorId): string =>
  APPLICABILITY_FACTORS.find((factor) => factor.id === id)?.label ?? id;

const optionLabel = (id: ApplicabilityFactorId, value: string): string =>
  APPLICABILITY_FACTORS.find((factor) => factor.id === id)?.options.find((option) => option.value === value)?.label ?? value;

/**
 * Deterministic, explainable applicability engine. Each control declares triggers; matched triggers
 * raise confidence and produce a rationale. Results are suggestions only — users must decide.
 */
export const evaluateApplicability = (profile: ApplicabilityProfile): readonly ApplicabilitySuggestion[] => {
  const suggestions: ApplicabilitySuggestion[] = [];

  for (const control of CONTROL_LIBRARY) {
    const matched = control.triggers.filter((trigger) =>
      (profile.answers[trigger.factor] ?? []).some((answer) => trigger.values.includes(answer)),
    );
    if (matched.length === 0) continue;

    const industry = (profile.answers.industry ?? [])[0];
    if (industry && !control.industries.includes(industry as never)) continue;

    const coverage = matched.length / Math.max(1, control.triggers.length);
    const confidence = Math.min(97, Math.round(58 + coverage * 32 + (control.critical ? 6 : 0)));
    const triggeredBy = matched.flatMap((trigger) =>
      (profile.answers[trigger.factor] ?? [])
        .filter((answer) => trigger.values.includes(answer))
        .map((answer) => `${factorLabel(trigger.factor)}: ${optionLabel(trigger.factor, answer)}`),
    );

    suggestions.push({
      controlId: control.id,
      // Multi-trigger matches are treated as AI-derived correlation; single triggers are pure rules.
      origin: matched.length > 1 ? "ai-suggested" : "rules-suggested",
      confidence,
      rationale: `${matched.map((trigger) => trigger.rationale).join(" ")} Control targets: ${control.riskAddressed}`,
      triggeredBy: Array.from(new Set(triggeredBy)),
      critical: control.critical,
    });
  }

  return suggestions.sort((a, b) => Number(b.critical) - Number(a.critical) || b.confidence - a.confidence);
};

/* ======================= Effectiveness and evidence ========================== */

const DESIGN_SCORE: Record<ControlInstance["designStatus"], number> = {
  "not-assessed": 0,
  "not-applicable": 0,
  planned: 25,
  "in-progress": 50,
  implemented: 85,
  tested: 95,
  deficient: 30,
  remediating: 45,
  approved: 100,
};

const OPERATING_SCORE: Record<ControlInstance["operatingStatus"], number> = {
  "not-assessed": 0,
  "not-applicable": 0,
  planned: 10,
  "in-progress": 35,
  implemented: 65,
  tested: 90,
  deficient: 20,
  remediating: 40,
  approved: 100,
};

export const isEvidenceValid = (record: EvidenceRecord, now = new Date()): boolean =>
  record.status === "accepted" && new Date(record.validUntil).getTime() > now.getTime();

export const isEvidenceExpiring = (record: EvidenceRecord, days = 45, now = new Date()): boolean => {
  const until = new Date(record.validUntil).getTime();
  return until > now.getTime() && until - now.getTime() < days * 86_400_000;
};

export const evaluateControlEffectiveness = (
  instance: ControlInstance,
  evidence: readonly EvidenceRecord[],
  tests: readonly ControlTest[],
  now = new Date(),
): ControlEffectiveness => {
  const definition = controlById(instance.controlId);
  const required = Math.max(1, definition?.evidenceRequirements.length ?? 1);
  const valid = evidence.filter((record) => record.controlId === instance.controlId && isEvidenceValid(record, now));
  const evidenceCoverage = Math.min(100, Math.round((valid.length / required) * 100));

  const controlTests = tests.filter((test) => test.controlId === instance.controlId);
  const executed = controlTests.filter((test) => test.outcome === "pass" || test.outcome === "fail");
  const passRate = executed.length === 0 ? undefined : Math.round((controlTests.filter((t) => t.outcome === "pass").length / executed.length) * 100);
  const openDeficiencies = controlTests.filter((test) => test.outcome === "fail" && test.approvalState !== "approved").length;

  const designEffectiveness = Math.round(DESIGN_SCORE[instance.designStatus] * 0.7 + evidenceCoverage * 0.3);
  const operatingBase = OPERATING_SCORE[instance.operatingStatus];
  const operatingEffectiveness = Math.round(passRate === undefined ? operatingBase * 0.8 : operatingBase * 0.5 + passRate * 0.5);

  return {
    controlId: instance.controlId,
    designEffectiveness,
    operatingEffectiveness,
    overall: Math.round((designEffectiveness + operatingEffectiveness) / 2),
    evidenceCoverage,
    openDeficiencies,
  };
};

/* ============================== Risk scoring ================================= */

const LEVEL_SCORE: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export const riskScore = (risk: RiskEntry): number => LEVEL_SCORE[risk.likelihood] * LEVEL_SCORE[risk.impact];

export const residualScore = (risk: RiskEntry): number => LEVEL_SCORE[risk.residualRisk] * 25;

export const isRiskOverdue = (risk: RiskEntry, now = new Date()): boolean =>
  risk.status !== "closed" && risk.status !== "accepted" && new Date(risk.dueDate).getTime() < now.getTime();

export const riskHeatmapCells = (risks: readonly RiskEntry[]) => {
  const levels: readonly RiskLevel[] = ["low", "medium", "high", "critical"];
  return levels.map((impact) => ({
    impact,
    cells: levels.map((likelihood) => ({
      likelihood,
      risks: risks.filter((risk) => risk.impact === impact && risk.likelihood === likelihood),
    })),
  }));
};

/* ============================ Stage gate blockers ============================ */

export interface TrustGateInput {
  readonly stage: LifecycleStageId;
  readonly instances: readonly ControlInstance[];
  readonly evidence: readonly EvidenceRecord[];
  readonly tests: readonly ControlTest[];
  readonly risks: readonly RiskEntry[];
  readonly waivedBlockerIds?: readonly string[];
  readonly signals?: {
    readonly architectureReviewComplete?: boolean;
    readonly identitySimulationScore?: number;
    readonly identityThreshold?: number;
    readonly agentSafetyTestsPassed?: boolean;
  };
  readonly now?: Date;
}

const CLEARED_STATUSES: readonly ControlInstance["designStatus"][] = ["implemented", "tested", "approved", "not-applicable"];

/** Derives everything that must clear before an initiative may leave the given stage. */
export const evaluateTrustGate = (input: TrustGateInput): TrustGateStatus => {
  const now = input.now ?? new Date();
  const blockers: GateBlocker[] = [];
  const accepted = input.instances.filter((instance) => instance.applicability === "accepted" || instance.applicability === "edited");

  for (const instance of accepted) {
    const definition = controlById(instance.controlId);
    if (!definition || definition.stageGate !== input.stage) continue;
    const hasApprovedException = instance.exceptions.some((exception) => exception.state === "approved");

    if (definition.critical && !CLEARED_STATUSES.includes(instance.designStatus) && !hasApprovedException) {
      blockers.push({
        id: `blk-critical-${instance.controlId}`,
        kind: "critical-control-not-implemented",
        stage: input.stage,
        severity: "critical",
        title: `${definition.id} — ${definition.title} not implemented`,
        detail: `Critical control is currently ${instance.designStatus.replace(/-/g, " ")}. Implement the control or record an approved exception.`,
        objectType: "control",
        objectId: instance.controlId,
        waivable: true,
      });
    }

    const validEvidence = input.evidence.filter(
      (record) => record.controlId === instance.controlId && isEvidenceValid(record, now),
    );
    const expired = input.evidence.filter(
      (record) => record.controlId === instance.controlId && new Date(record.validUntil).getTime() <= now.getTime(),
    );
    if (definition.evidenceRequirements.length > 0 && validEvidence.length === 0 && !hasApprovedException) {
      blockers.push({
        id: `blk-evidence-${instance.controlId}`,
        kind: expired.length > 0 ? "evidence-expired" : "evidence-missing",
        stage: input.stage,
        severity: definition.critical ? "high" : "medium",
        title: `${definition.id} — ${expired.length > 0 ? "evidence expired" : "evidence missing"}`,
        detail: `Requires: ${definition.evidenceRequirements.join("; ")}.`,
        objectType: "control-evidence",
        objectId: instance.controlId,
        waivable: true,
      });
    }

    const failing = input.tests.filter(
      (test) => test.controlId === instance.controlId && test.outcome === "fail" && test.approvalState !== "approved",
    );
    if (failing.length > 0) {
      blockers.push({
        id: `blk-deficiency-${instance.controlId}`,
        kind: "control-deficiency-open",
        stage: input.stage,
        severity: failing.some((test) => test.deficiencySeverity === "critical") ? "critical" : "high",
        title: `${definition.id} — ${failing.length} unresolved deficiency`,
        detail: failing[0].deficiency ?? "Failed control test without approved remediation.",
        objectType: "control-test",
        objectId: failing[0].id,
        waivable: true,
      });
    }
  }

  for (const risk of input.risks) {
    const unapproved = (risk.residualRisk === "high" || risk.residualRisk === "critical") && !risk.acceptance && risk.status !== "closed";
    if (!unapproved) continue;
    blockers.push({
      id: `blk-risk-${risk.id}`,
      kind: "high-residual-risk-unapproved",
      stage: input.stage,
      severity: risk.residualRisk,
      title: `${risk.reference} — ${risk.residualRisk} residual risk not accepted`,
      detail: risk.statement,
      objectType: "risk",
      objectId: risk.id,
      waivable: false,
    });
  }

  const signals = input.signals ?? {};
  if (signals.architectureReviewComplete === false && (input.stage === "design" || input.stage === "approve")) {
    blockers.push({
      id: "blk-architecture-review",
      kind: "architecture-review-incomplete",
      stage: input.stage,
      severity: "high",
      title: "Architecture review incomplete",
      detail: "Outstanding architecture decision records require Architecture Review Board approval.",
      objectType: "architecture",
      objectId: "adr-set",
      waivable: true,
    });
  }

  const threshold = signals.identityThreshold ?? 92;
  if (typeof signals.identitySimulationScore === "number" && signals.identitySimulationScore < threshold) {
    blockers.push({
      id: "blk-identity-simulation",
      kind: "identity-simulation-below-threshold",
      stage: input.stage,
      severity: "high",
      title: `Identity simulation ${signals.identitySimulationScore}% below ${threshold}% threshold`,
      detail: "Tune match rules and re-run the simulation before progressing.",
      objectType: "identity-run",
      objectId: "latest",
      waivable: true,
    });
  }

  if (signals.agentSafetyTestsPassed === false && (input.stage === "validate" || input.stage === "approve")) {
    blockers.push({
      id: "blk-agent-safety",
      kind: "agent-safety-tests-not-passed",
      stage: input.stage,
      severity: "critical",
      title: "Agent safety tests not passed",
      detail: "Prompt injection and instruction integrity suite has open critical findings.",
      objectType: "agent-test",
      objectId: "safety-suite",
      waivable: false,
    });
  }

  const waived = new Set(input.waivedBlockerIds ?? []);
  return {
    stage: input.stage,
    blockers,
    waivedBlockerIds: input.waivedBlockerIds ?? [],
    clear: blockers.every((blocker) => waived.has(blocker.id)),
  };
};

/* ============================ Executive posture ============================== */

export const buildTrustPosture = (input: {
  readonly instances: readonly ControlInstance[];
  readonly evidence: readonly EvidenceRecord[];
  readonly tests: readonly ControlTest[];
  readonly risks: readonly RiskEntry[];
  readonly blockers: readonly GateBlocker[];
  readonly now?: Date;
}): TrustPosture => {
  const now = input.now ?? new Date();
  const applicable = input.instances.filter((i) => i.applicability === "accepted" || i.applicability === "edited");
  const implemented = applicable.filter((i) => CLEARED_STATUSES.includes(i.designStatus));
  const tested = applicable.filter((i) => i.operatingStatus === "tested" || i.operatingStatus === "approved");

  const requiredEvidence = applicable.reduce(
    (total, instance) => total + Math.max(1, controlById(instance.controlId)?.evidenceRequirements.length ?? 1),
    0,
  );
  const validEvidence = input.evidence.filter((record) => isEvidenceValid(record, now)).length;

  const frameworkCoverage = FRAMEWORKS.filter((f) => f.status === "seeded").map((f) => {
    const mappedControls = CONTROL_LIBRARY.filter((control) =>
      control.frameworkMappings.some((mapping) => mapping.frameworkId === f.id),
    );
    const satisfied = mappedControls.filter((control) =>
      implemented.some((instance) => instance.controlId === control.id),
    );
    return { frameworkId: f.id, mapped: mappedControls.length, satisfied: satisfied.length };
  });

  const periods = Array.from(new Set(input.risks.flatMap((risk) => risk.trend.map((point) => point.period)))).sort();
  const riskTrend = periods.map((period) => {
    const points = input.risks.flatMap((risk) => risk.trend.filter((point) => point.period === period));
    return {
      period,
      score: points.length === 0 ? 0 : Math.round(points.reduce((sum, point) => sum + point.residualScore, 0) / points.length),
    };
  });

  return {
    applicableControls: applicable.length,
    pendingApplicability: input.instances.filter((i) => i.applicability === "pending").length,
    implementedControls: implemented.length,
    testedControls: tested.length,
    openDeficiencies: input.tests.filter((test) => test.outcome === "fail" && test.approvalState !== "approved").length,
    controlCoverage: applicable.length === 0 ? 0 : Math.round((implemented.length / applicable.length) * 100),
    evidenceCompleteness: requiredEvidence === 0 ? 0 : Math.min(100, Math.round((validEvidence / requiredEvidence) * 100)),
    expiringEvidence: input.evidence.filter((record) => isEvidenceExpiring(record, 45, now)).length,
    topRisks: [...input.risks].sort((a, b) => residualScore(b) - residualScore(a) || riskScore(b) - riskScore(a)).slice(0, 5),
    pendingAcceptances: input.risks.filter(
      (risk) => (risk.residualRisk === "high" || risk.residualRisk === "critical") && !risk.acceptance && risk.status !== "closed",
    ),
    riskTrend,
    frameworkCoverage,
    blockers: input.blockers,
  };
};
