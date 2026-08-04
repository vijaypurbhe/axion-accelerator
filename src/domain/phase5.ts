/**
 * Phase 5 domain model: trust layer controls, regulatory/framework mapping, evidence,
 * control testing, governance operating model, RACI and the enterprise risk register.
 * Extends Phase 0-4 primitives — nothing here replaces existing models.
 */

import type { Industry, LifecycleStageId } from "./types";
import type { ApprovalState, RiskLevel, RoleId } from "./models";
import type { BlueprintLayerId } from "./phase2";

/* ============================== Control domains ============================== */

export type ControlDomainId =
  | "data-security"
  | "data-privacy"
  | "access-control"
  | "encryption"
  | "sensitive-data"
  | "grounding-retrieval"
  | "prompt-safety"
  | "agent-authorization"
  | "human-oversight"
  | "auditability"
  | "explainability"
  | "logging"
  | "monitoring"
  | "bias-fairness"
  | "model-risk"
  | "data-quality"
  | "identity-integrity"
  | "retention"
  | "residency"
  | "consent"
  | "incident-management"
  | "business-continuity"
  | "third-party-risk";

export interface ControlDomain {
  readonly id: ControlDomainId;
  readonly name: string;
  readonly summary: string;
  readonly pillar: "Data trust" | "Agent trust" | "Operational trust";
}

/* ============================ Frameworks / regulatory ======================== */

export type FrameworkStatus = "seeded" | "extension-ready";

export interface RegulatoryFramework {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly authority: string;
  readonly industries: readonly Industry[];
  readonly status: FrameworkStatus;
  readonly summary: string;
}

export interface FrameworkMapping {
  readonly frameworkId: string;
  /** Clause, control or function reference within the framework. */
  readonly reference: string;
  readonly interpretation: string;
}

/* ================================ Controls =================================== */

export type ControlDesignStatus =
  | "not-assessed"
  | "not-applicable"
  | "planned"
  | "in-progress"
  | "implemented"
  | "tested"
  | "deficient"
  | "remediating"
  | "approved";

export type ControlOperatingStatus = ControlDesignStatus;

export const CONTROL_STATUSES: readonly ControlDesignStatus[] = [
  "not-assessed",
  "not-applicable",
  "planned",
  "in-progress",
  "implemented",
  "tested",
  "deficient",
  "remediating",
  "approved",
];

export const CONTROL_STATUS_LABEL: Record<ControlDesignStatus, string> = {
  "not-assessed": "Not Assessed",
  "not-applicable": "Not Applicable",
  planned: "Planned",
  "in-progress": "In Progress",
  implemented: "Implemented",
  tested: "Tested",
  deficient: "Deficient",
  remediating: "Remediating",
  approved: "Approved",
};

export type SuggestionOrigin = "ai-suggested" | "rules-suggested" | "manual";
export type ApplicabilityDecision = "pending" | "accepted" | "edited" | "rejected";

export interface ControlException {
  readonly id: string;
  readonly justification: string;
  readonly requestedBy: string;
  readonly approvedBy?: string;
  readonly expiresOn: string;
  readonly state: "requested" | "approved" | "rejected";
}

export interface RemediationAction {
  readonly id: string;
  readonly description: string;
  readonly owner: RoleId;
  readonly dueDate: string;
  readonly status: "open" | "in-progress" | "complete" | "overdue";
}

/** Library definition of a trust layer control (client agnostic). */
export interface ControlDefinition {
  readonly id: string;
  readonly title: string;
  readonly domain: ControlDomainId;
  readonly objective: string;
  readonly description: string;
  readonly riskAddressed: string;
  readonly frameworkMappings: readonly FrameworkMapping[];
  readonly industries: readonly Industry[];
  readonly useCases: readonly string[];
  readonly layers: readonly BlueprintLayerId[];
  readonly dataProductTags: readonly string[];
  readonly agentComponents: readonly string[];
  readonly controlOwner: RoleId;
  readonly implementationOwner: RoleId;
  readonly reviewer: RoleId;
  readonly frequency: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "semi-annual" | "annual" | "event-driven";
  readonly evidenceRequirements: readonly string[];
  readonly testingProcedure: string;
  readonly critical: boolean;
  readonly stageGate: LifecycleStageId;
  /** Applicability triggers evaluated by the rules engine. */
  readonly triggers: readonly ControlTrigger[];
}

export interface ControlTrigger {
  readonly factor: ApplicabilityFactorId;
  readonly values: readonly string[];
  readonly rationale: string;
}

/** Initiative-scoped instance of a control. */
export interface ControlInstance {
  readonly id: string;
  readonly initiativeId: string;
  readonly controlId: string;
  readonly applicability: ApplicabilityDecision;
  readonly origin: SuggestionOrigin;
  readonly confidence?: number;
  readonly rationale: string;
  readonly designStatus: ControlDesignStatus;
  readonly operatingStatus: ControlOperatingStatus;
  readonly residualRisk: RiskLevel;
  readonly controlOwner: RoleId;
  readonly implementationOwner: RoleId;
  readonly reviewer: RoleId;
  readonly exceptions: readonly ControlException[];
  readonly remediationActions: readonly RemediationAction[];
  readonly notes?: string;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/* ========================= Applicability assessment ========================== */

export type ApplicabilityFactorId =
  | "industry"
  | "jurisdiction"
  | "use-case"
  | "data-classification"
  | "source-systems"
  | "identity-design"
  | "agent-capabilities"
  | "external-actions"
  | "audience"
  | "automation-level"
  | "human-oversight"
  | "financial-impact";

export interface ApplicabilityFactor {
  readonly id: ApplicabilityFactorId;
  readonly label: string;
  readonly help: string;
  readonly multi: boolean;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

export interface ApplicabilityProfile {
  readonly initiativeId: string;
  readonly answers: Readonly<Record<ApplicabilityFactorId, readonly string[]>>;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface ApplicabilitySuggestion {
  readonly controlId: string;
  readonly origin: SuggestionOrigin;
  readonly confidence: number;
  readonly rationale: string;
  readonly triggeredBy: readonly string[];
  readonly critical: boolean;
}

/* ============================ Evidence management ============================ */

export type EvidenceType =
  | "policy"
  | "configuration-screenshot"
  | "log-extract"
  | "test-result"
  | "approval-record"
  | "architecture-artifact"
  | "training-record"
  | "third-party-report";

export type EvidenceStatus = "draft" | "submitted" | "under-review" | "accepted" | "rejected" | "expired";

export interface EvidenceRecord {
  readonly id: string;
  readonly initiativeId: string;
  readonly controlId: string;
  readonly type: EvidenceType;
  readonly title: string;
  readonly description: string;
  readonly attachmentName?: string;
  readonly referenceUrl?: string;
  readonly owner: RoleId;
  readonly collectedOn: string;
  readonly validUntil: string;
  readonly reviewer: RoleId;
  readonly reviewOutcome?: "accepted" | "rejected" | "more-information";
  readonly comments?: string;
  readonly version: number;
  readonly status: EvidenceStatus;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/* ============================== Control testing ============================== */

export interface ControlTest {
  readonly id: string;
  readonly initiativeId: string;
  readonly controlId: string;
  readonly procedure: string;
  readonly testOwner: RoleId;
  readonly sample: string;
  readonly expectedResult: string;
  readonly observedResult?: string;
  readonly outcome: "not-started" | "in-progress" | "pass" | "fail";
  readonly deficiency?: string;
  readonly deficiencySeverity?: RiskLevel;
  readonly remediation?: string;
  readonly retestDate?: string;
  readonly approver: RoleId;
  readonly approvalState: ApprovalState;
  readonly scheduledFor: string;
  readonly executedOn?: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface ControlEffectiveness {
  readonly controlId: string;
  readonly designEffectiveness: number;
  readonly operatingEffectiveness: number;
  readonly overall: number;
  readonly evidenceCoverage: number;
  readonly openDeficiencies: number;
}

/* ========================= Governance operating model ======================== */

export type GovernancePhaseId = "design" | "build" | "validate" | "deploy" | "monitor" | "improve";

export interface GovernancePhase {
  readonly id: GovernancePhaseId;
  readonly order: number;
  readonly name: string;
  readonly purpose: string;
  readonly stages: readonly LifecycleStageId[];
}

export interface GovernanceMember {
  readonly name: string;
  readonly role: RoleId | "client-executive" | "risk-officer" | "compliance-officer" | "business-owner";
  readonly title: string;
  readonly voting: boolean;
}

export interface GovernanceBody {
  readonly id: string;
  readonly clientId: string;
  readonly name: string;
  readonly charter: string;
  readonly scope: readonly string[];
  readonly members: readonly GovernanceMember[];
  readonly decisionRights: readonly string[];
  readonly cadence: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "event-driven";
  readonly escalatesTo?: string;
  readonly requiredArtifacts: readonly string[];
  readonly approvalResponsibilities: readonly { readonly phase: GovernancePhaseId; readonly decision: string }[];
  readonly custom: boolean;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/* ==================================== RACI =================================== */

export type RaciDimension = "lifecycle-stage" | "workstream" | "artifact" | "control" | "risk" | "approval" | "deployment";
export type RaciLetter = "R" | "A" | "C" | "I" | "-";

export interface RaciAssignment {
  readonly role: RoleId | "risk-officer" | "compliance-officer" | "business-owner";
  readonly letter: RaciLetter;
  readonly namedIndividual?: string;
}

export interface RaciEntry {
  readonly id: string;
  readonly clientId: string;
  readonly dimension: RaciDimension;
  readonly activity: string;
  readonly assignments: readonly RaciAssignment[];
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/* ================================ Risk register ============================== */

export type RiskCategoryId =
  | "data"
  | "identity"
  | "security"
  | "privacy"
  | "regulatory"
  | "ai-safety"
  | "model-risk"
  | "operational"
  | "integration"
  | "adoption"
  | "financial"
  | "reputational"
  | "third-party";

export type RiskStatus = "open" | "mitigating" | "monitoring" | "accepted" | "closed";

export interface RiskEntry {
  readonly id: string;
  readonly initiativeId: string;
  readonly reference: string;
  readonly category: RiskCategoryId;
  readonly statement: string;
  readonly cause: string;
  readonly impactDescription: string;
  readonly likelihood: RiskLevel;
  readonly impact: RiskLevel;
  readonly inherentRisk: RiskLevel;
  readonly controlIds: readonly string[];
  readonly mitigation: string;
  readonly owner: RoleId;
  readonly dueDate: string;
  readonly residualRisk: RiskLevel;
  readonly status: RiskStatus;
  readonly escalated: boolean;
  readonly escalatedTo?: string;
  readonly acceptance?: RiskAcceptance;
  readonly relatedUseCase?: string;
  readonly relatedDataProductId?: string;
  readonly relatedAgentComponent?: string;
  readonly relatedComponentId?: string;
  readonly trend: readonly { readonly period: string; readonly residualScore: number }[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface RiskAcceptance {
  readonly acceptedBy: string;
  readonly acceptedRole: RoleId;
  readonly justification: string;
  readonly reviewOn: string;
  readonly acceptedAt: string;
}

/* =========================== Stage-gate integration ========================== */

export type GateBlockerKind =
  | "critical-control-not-implemented"
  | "evidence-missing"
  | "evidence-expired"
  | "high-residual-risk-unapproved"
  | "architecture-review-incomplete"
  | "identity-simulation-below-threshold"
  | "agent-safety-tests-not-passed"
  | "control-deficiency-open";

export interface GateBlocker {
  readonly id: string;
  readonly kind: GateBlockerKind;
  readonly stage: LifecycleStageId;
  readonly severity: RiskLevel;
  readonly title: string;
  readonly detail: string;
  readonly objectType: string;
  readonly objectId: string;
  readonly waivable: boolean;
}

export interface TrustGateWaiver {
  readonly id: string;
  readonly initiativeId: string;
  readonly stage: LifecycleStageId;
  readonly blockerId: string;
  readonly justification: string;
  readonly requestedBy: string;
  readonly requestedRole: RoleId;
  readonly state: "requested" | "approved" | "rejected";
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly expiresOn: string;
  readonly createdAt: string;
}

export interface TrustGateStatus {
  readonly stage: LifecycleStageId;
  readonly blockers: readonly GateBlocker[];
  readonly waivedBlockerIds: readonly string[];
  readonly clear: boolean;
}

/* ============================ Executive dashboard ============================ */

export interface TrustPosture {
  readonly applicableControls: number;
  readonly pendingApplicability: number;
  readonly implementedControls: number;
  readonly testedControls: number;
  readonly openDeficiencies: number;
  readonly controlCoverage: number;
  readonly evidenceCompleteness: number;
  readonly expiringEvidence: number;
  readonly topRisks: readonly RiskEntry[];
  readonly pendingAcceptances: readonly RiskEntry[];
  readonly riskTrend: readonly { readonly period: string; readonly score: number }[];
  readonly frameworkCoverage: readonly { readonly frameworkId: string; readonly mapped: number; readonly satisfied: number }[];
  readonly blockers: readonly GateBlocker[];
}
