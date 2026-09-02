/**
 * Phase 2 domain model: engagement lifecycle manager, readiness assessment,
 * maturity scoring, architecture blueprint studio, decision records and approvals.
 * Extends the Phase 0/1 primitives — nothing here replaces existing models.
 */

import type { IngestionPattern, LifecycleStageId, MaturityLevel, SalesforceProductId } from "./types";
import type { ApprovalState, RiskLevel, RoleId } from "./models";

/* ============================== Lifecycle manager ============================= */

export interface StageCriterion {
  readonly id: string;
  readonly label: string;
  readonly mandatory: boolean;
}

export interface StageDefinition {
  readonly stage: LifecycleStageId;
  readonly objective: string;
  readonly entryCriteria: readonly string[];
  readonly mandatoryTasks: readonly string[];
  readonly optionalTasks: readonly string[];
  readonly deliverables: readonly string[];
  readonly exitCriteria: readonly StageCriterion[];
  readonly approvers: readonly RoleId[];
  readonly dependsOn?: LifecycleStageId;
}

export type StageItemKind = "task" | "deliverable" | "exit-criterion";
export type StageItemStatus = "not-started" | "in-progress" | "complete" | "blocked" | "waived";

export interface StageItem {
  readonly id: string;
  readonly initiativeId: string;
  readonly stage: LifecycleStageId;
  readonly kind: StageItemKind;
  readonly label: string;
  readonly mandatory: boolean;
  readonly owner: RoleId;
  readonly dueDate: string;
  readonly status: StageItemStatus;
  readonly dependsOn?: string;
  readonly blockerReason?: string;
  readonly note?: string;
}

export interface StageComment {
  readonly id: string;
  readonly initiativeId: string;
  readonly stage: LifecycleStageId;
  readonly author: string;
  readonly role: RoleId;
  readonly body: string;
  readonly timestamp: string;
}

export type StageEventType =
  | "item-updated"
  | "advance-requested"
  | "advance-approved"
  | "advance-rejected"
  | "waiver-requested"
  | "waiver-approved"
  | "waiver-rejected"
  | "stage-entered";

export interface StageEvent {
  readonly id: string;
  readonly initiativeId: string;
  readonly stage: LifecycleStageId;
  readonly type: StageEventType;
  readonly actor: string;
  readonly role: RoleId;
  readonly note?: string;
  readonly timestamp: string;
}

export interface StageWaiver {
  readonly id: string;
  readonly initiativeId: string;
  readonly stage: LifecycleStageId;
  readonly itemId: string;
  readonly justification: string;
  readonly requestedBy: string;
  readonly requestedRole: RoleId;
  readonly state: "requested" | "approved" | "rejected";
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly createdAt: string;
}

export interface StageApprovalVote {
  readonly role: RoleId;
  readonly required: boolean;
  readonly state: "pending" | "approved" | "rejected";
  readonly comment?: string;
  readonly decidedAt?: string;
}

export interface StageAdvancementRequest {
  readonly id: string;
  readonly initiativeId: string;
  readonly fromStage: LifecycleStageId;
  readonly toStage: LifecycleStageId;
  readonly mode: "sequential" | "parallel";
  readonly requestedBy: string;
  readonly requestedRole: RoleId;
  readonly note?: string;
  readonly state: ApprovalState;
  readonly approvals: readonly StageApprovalVote[];
  readonly createdAt: string;
  readonly decidedAt?: string;
}

export interface StageGateStatus {
  readonly stage: LifecycleStageId;
  readonly progress: number;
  readonly totalItems: number;
  readonly completeItems: number;
  readonly overdueItems: number;
  readonly blockedItems: number;
  readonly openMandatory: readonly StageItem[];
  readonly waivedMandatory: readonly StageItem[];
  readonly canRequestAdvance: boolean;
  readonly blockedExplanation?: string;
}

/* ============================= Readiness assessment ========================== */

export type AssessmentCategoryId =
  | "business-strategy"
  | "data-landscape"
  | "source-readiness"
  | "canonical-model"
  | "data-quality"
  | "identity-resolution"
  | "governance"
  | "security-compliance"
  | "activation"
  | "agentforce"
  | "operating-model"
  | "monitoring-support";

export interface AssessmentCategory {
  readonly id: AssessmentCategoryId;
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly stage: LifecycleStageId;
  readonly owner: RoleId;
}

export type QuestionType = "single" | "multi" | "numeric" | "text";

export interface QuestionOption {
  readonly value: string;
  readonly label: string;
  /** 0-100 contribution when selected. */
  readonly score: number;
}

export interface AssessmentQuestion {
  readonly id: string;
  readonly categoryId: AssessmentCategoryId;
  readonly prompt: string;
  readonly type: QuestionType;
  readonly options?: readonly QuestionOption[];
  readonly weight: number;
  readonly mandatory: boolean;
  readonly owner: RoleId;
  readonly guidance?: string;
  readonly evidenceRequired: boolean;
  readonly applicability: IndustryApplicability;
  /** Numeric questions only. */
  readonly max?: number;
}

export interface AssessmentResponse {
  readonly questionId: string;
  readonly choice?: string;
  readonly choices?: readonly string[];
  readonly numeric?: number;
  readonly text?: string;
  readonly comment?: string;
  readonly evidenceName?: string;
  readonly notApplicable?: boolean;
  readonly owner?: RoleId;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export const MATURITY_BANDS: readonly { readonly level: MaturityLevel; readonly name: string; readonly min: number }[] = [
  { level: 1, name: "Initial", min: 0 },
  { level: 2, name: "Emerging", min: 30 },
  { level: 3, name: "Defined", min: 50 },
  { level: 4, name: "Managed", min: 70 },
  { level: 5, name: "Optimized", min: 86 },
];

export interface CategoryScore {
  readonly categoryId: AssessmentCategoryId;
  readonly score: number;
  readonly maturity: MaturityLevel;
  readonly answered: number;
  readonly total: number;
  readonly mandatoryOpen: number;
  readonly evidenceCoverage: number;
}

export interface AssessmentGap {
  readonly id: string;
  readonly categoryId: AssessmentCategoryId;
  readonly title: string;
  readonly severity: RiskLevel;
  readonly score: number;
  readonly critical: boolean;
}

export interface AssessmentSummary {
  readonly overall: number;
  readonly riskAdjusted: number;
  readonly confidence: number;
  readonly maturity: MaturityLevel;
  readonly completion: number;
  readonly categories: readonly CategoryScore[];
  readonly gaps: readonly AssessmentGap[];
  readonly blockers: readonly AssessmentGap[];
  readonly byStage: readonly { readonly stage: LifecycleStageId; readonly score: number }[];
}

/* ============================= AI recommendations ============================ */

export type RecommendationStatus = "pending" | "accepted" | "edited" | "rejected";

export interface AxionRecommendation {
  readonly id: string;
  readonly initiativeId: string;
  readonly source: "assessment" | "architecture";
  readonly title: string;
  readonly gap: string;
  readonly rationale: string;
  readonly impact: string;
  readonly urgency: RiskLevel;
  readonly suggestedOwner: RoleId;
  readonly stage: LifecycleStageId;
  readonly useCases: readonly string[];
  readonly confidence: number;
  readonly status: RecommendationStatus;
  readonly editedText?: string;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly createdAt: string;
}

/* ========================== Architecture blueprint =========================== */

export type BlueprintLayerId = "connectivity" | "harmonization" | "identity" | "activation" | "agentforce";

export interface BlueprintLayer {
  readonly id: BlueprintLayerId;
  readonly order: 1 | 2 | 3 | 4 | 5;
  readonly name: string;
  readonly purpose: string;
}

export type ComponentKind = "source-system" | "salesforce-capability" | "logical-service";

export interface CatalogComponent {
  readonly id: string;
  readonly name: string;
  readonly kind: ComponentKind;
  readonly platform: string;
  readonly defaultLayer: BlueprintLayerId;
  readonly purpose: string;
  readonly patterns?: readonly IngestionPattern[];
  readonly productId?: SalesforceProductId;
}

export type ComponentStatus = "proposed" | "approved" | "in-build" | "live" | "rejected";
export type SecurityClassification = "public" | "internal" | "confidential" | "restricted" | "regulated-pii";
export type ArchitectureView = "current" | "target" | "both";

export interface BlueprintComponent {
  readonly id: string;
  readonly initiativeId: string;
  readonly catalogId?: string;
  readonly name: string;
  readonly kind: ComponentKind;
  readonly platform: string;
  readonly layer: BlueprintLayerId;
  readonly purpose: string;
  readonly dataDomain: string;
  readonly integrationPattern: IngestionPattern | "none";
  readonly securityClassification: SecurityClassification;
  readonly owner: RoleId;
  readonly dependencies: readonly string[];
  readonly status: ComponentStatus;
  readonly assumptions: readonly string[];
  readonly risks: readonly string[];
  readonly decisionIds: readonly string[];
  readonly view: ArchitectureView;
  /** false = logical only; true = present in the physical topology. */
  readonly physical: boolean;
  readonly controls: readonly string[];
  readonly notes?: string;
  readonly aiSuggested: boolean;
  readonly acceptance: RecommendationStatus;
  readonly rationale?: string;
}

export interface BlueprintConnection {
  readonly id: string;
  readonly initiativeId: string;
  readonly fromId: string;
  readonly toId: string;
  readonly label: string;
  readonly pattern: IngestionPattern | "none";
  readonly aiSuggested: boolean;
}

/* ======================= Architecture decision records ======================= */

export type AdrStatus = "draft" | "proposed" | "approved" | "rejected" | "superseded";

export interface AdrOption {
  readonly title: string;
  readonly pros: string;
  readonly cons: string;
}

export interface ArchitectureApproverVote {
  readonly role: RoleId;
  readonly required: boolean;
  readonly state: "pending" | "approved" | "rejected";
  readonly comment?: string;
  readonly decidedAt?: string;
}

export interface AdrRecord {
  readonly id: string;
  readonly initiativeId: string;
  readonly reference: string;
  readonly title: string;
  readonly status: AdrStatus;
  readonly context: string;
  readonly options: readonly AdrOption[];
  readonly recommendation: string;
  readonly rationale: string;
  readonly consequences: string;
  readonly risks: readonly string[];
  readonly approvers: readonly ArchitectureApproverVote[];
  readonly componentIds: readonly string[];
  readonly connectivityDecision?: string;
  readonly effectiveDate: string;
  readonly supersedesId?: string;
  readonly attachments: readonly string[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
}

export interface ArchitectureApprovalRequest {
  readonly id: string;
  readonly initiativeId: string;
  readonly blueprintVersion: number;
  readonly mode: "sequential" | "parallel";
  readonly approvers: readonly ArchitectureApproverVote[];
  readonly state: ApprovalState;
  readonly submittedBy: string;
  readonly note?: string;
  readonly createdAt: string;
  readonly decidedAt?: string;
}

/* ==================== Architecture recommendation workflow =================== */

export interface ArchitectureRecommendationInputs {
  readonly useCaseIds: readonly string[];
  readonly sourcePlatforms: readonly string[];
  readonly latency: "batch" | "near-real-time" | "real-time";
  readonly volume: "low" | "medium" | "high";
  readonly residency: string;
  readonly regulatory: readonly string[];
  readonly activation: readonly string[];
  readonly identityNeeds: readonly string[];
  readonly products: readonly SalesforceProductId[];
}

export interface ArchitectureRecommendationResult {
  readonly components: readonly BlueprintComponent[];
  readonly connections: readonly BlueprintConnection[];
  readonly rationale: readonly string[];
  readonly assumptions: readonly string[];
  readonly gaps: readonly string[];
  readonly dependencies: readonly string[];
  readonly risks: readonly string[];
  readonly requiredDecisions: readonly string[];
}
