/**
 * Phase 1 workspace domain models.
 * Every persisted record carries tenancy + provenance metadata.
 */

import type { EntityStatus, Industry, LifecycleStageId, PersonaId } from "./types";

/** Roles reuse the persona identifiers so login, dashboards and permissions stay aligned. */
export type RoleId = PersonaId;

export type Permission =
  | "view"
  | "create"
  | "edit"
  | "approve"
  | "reject"
  | "export"
  | "administer"
  | "manage-templates"
  | "manage-controls"
  | "deploy";

export interface Role {
  readonly id: RoleId;
  readonly name: string;
  readonly summary: string;
  readonly permissions: readonly Permission[];
}

export interface AuditableRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly status: string;
  readonly version?: number;
}

export interface User extends AuditableRecord {
  readonly name: string;
  readonly email: string;
  readonly role: RoleId;
  readonly title: string;
  readonly initials: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalState = "not-required" | "draft" | "submitted" | "approved" | "rejected";
export type DataQualityState = "unknown" | "healthy" | "watch" | "breach";

export interface Client extends AuditableRecord {
  readonly name: string;
  readonly industry: Industry;
  readonly subsegments: readonly string[];
  readonly geography: string;
  readonly jurisdictions: readonly string[];
  readonly accountOwner: string;
  readonly executiveSponsor: string;
  readonly description: string;
  readonly status: "active" | "prospect" | "archived";
  readonly brandingAccent: string;
  /** True for training/simulation workspaces that carry demonstration content. */
  readonly isSimulation?: boolean;
}


export interface Initiative extends AuditableRecord {
  readonly clientId: string;
  readonly name: string;
  readonly description: string;
  readonly businessObjective: string;
  readonly primaryDomain: string;
  readonly useCases: readonly string[];
  readonly currentStage: LifecycleStageId;
  readonly owners: readonly { readonly role: RoleId; readonly userId: string }[];
  readonly startDate: string;
  readonly targetDate: string;
  readonly riskLevel: RiskLevel;
  readonly readinessScore: number;
  readonly approvalStatus: ApprovalState;
  readonly activeRelease: string;
  readonly status: "planning" | "active" | "on-hold" | "archived";
}

export interface StageTask extends AuditableRecord {
  readonly initiativeId: string;
  readonly stage: LifecycleStageId;
  readonly name: string;
  readonly owner: RoleId;
  readonly dueDate: string;
  readonly status: EntityStatus;
}

export interface Milestone extends AuditableRecord {
  readonly initiativeId: string;
  readonly name: string;
  readonly date: string;
  readonly status: EntityStatus;
}

export interface RiskItem extends AuditableRecord {
  readonly initiativeId: string;
  readonly title: string;
  readonly category: "data" | "architecture" | "governance" | "delivery" | "regulatory";
  readonly level: RiskLevel;
  readonly likelihood: RiskLevel;
  readonly impact: RiskLevel;
  readonly mitigation: string;
  readonly owner: RoleId;
  readonly status: "open" | "mitigating" | "closed";
}

export interface Approval extends AuditableRecord {
  readonly initiativeId: string;
  readonly objectType: string;
  readonly objectId: string;
  readonly title: string;
  readonly stage: LifecycleStageId;
  readonly requestedBy: RoleId;
  readonly approverRole: RoleId;
  readonly state: ApprovalState;
  readonly decidedAt?: string;
  readonly notes?: string;
}

export interface Comment extends AuditableRecord {
  readonly initiativeId: string;
  readonly objectRef: string;
  readonly author: string;
  readonly authorRole: RoleId;
  readonly body: string;
}

export interface ActivityLog extends AuditableRecord {
  readonly initiativeId?: string;
  readonly clientId?: string;
  readonly actor: string;
  readonly role: RoleId;
  readonly action: string;
  readonly objectType: string;
  readonly objectId: string;
  readonly oldValueSummary?: string;
  readonly newValueSummary?: string;
  readonly timestamp: string;
}

export interface Notification extends AuditableRecord {
  readonly title: string;
  readonly body: string;
  readonly severity: "info" | "warning" | "critical";
  readonly initiativeId?: string;
  readonly read: boolean;
}

export interface Artifact extends AuditableRecord {
  readonly initiativeId: string;
  readonly name: string;
  readonly kind: "blueprint" | "mapping" | "assessment" | "runbook" | "test-report" | "release-notes";
  readonly stage: LifecycleStageId;
  readonly format: "pdf" | "xlsx" | "json" | "md";
  readonly generatedBy: RoleId;
}

export interface Template extends AuditableRecord {
  readonly name: string;
  readonly industry: Industry;
  readonly scope: "initiative" | "assessment" | "data-product" | "agent" | "control-set";
  readonly description: string;
  readonly usageCount: number;
}

export interface IntegrationConnection extends AuditableRecord {
  readonly initiativeId: string;
  readonly platform: string;
  readonly pattern: "physical" | "zero-copy" | "cached-acceleration" | "streaming";
  readonly environment: "dev" | "uat" | "prod";
  readonly health: DataQualityState;
  readonly owner: RoleId;
}

export interface DataProduct extends AuditableRecord {
  readonly initiativeId: string;
  readonly name: string;
  readonly domain: string;
  readonly steward: RoleId;
  readonly completeness: number;
  readonly quality: DataQualityState;
  readonly mappedSources: number;
}

export interface AgentDesign extends AuditableRecord {
  readonly initiativeId: string;
  readonly name: string;
  readonly topics: number;
  readonly actions: number;
  readonly testsPassing: number;
  readonly testsTotal: number;
  readonly readiness: number;
}

export interface AssessmentScore extends AuditableRecord {
  readonly initiativeId: string;
  readonly dimension: string;
  readonly score: number;
  readonly target: number;
  readonly note: string;
}

export interface ArchitectureDecision extends AuditableRecord {
  readonly initiativeId: string;
  readonly title: string;
  readonly decision: string;
  readonly rationale: string;
  readonly approval: ApprovalState;
  readonly owner: RoleId;
}

/** Input payloads used by the creation wizards. */
export type NewClientInput = Pick<
  Client,
  | "name"
  | "industry"
  | "subsegments"
  | "geography"
  | "jurisdictions"
  | "accountOwner"
  | "executiveSponsor"
  | "description"
>;

export type NewInitiativeInput = Pick<
  Initiative,
  "clientId" | "name" | "description" | "businessObjective" | "primaryDomain" | "useCases" | "targetDate" | "riskLevel"
> & { readonly templateId?: string };
