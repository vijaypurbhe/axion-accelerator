/**
 * Axion core domain model.
 * Hierarchy: Tenant/Client -> Program/Initiative -> Domain/Workstream -> Use Case -> Release/Version
 */

export type Industry = "BFSI" | "MFG" | "AUTO" | "HLS" | "RCPG";

export type PersonaId =
  | "executive-sponsor"
  | "enterprise-architect"
  | "data360-architect"
  | "data-steward"
  | "data-engineer"
  | "agentforce-architect";

export type LifecycleStageId =
  | "discover"
  | "assess"
  | "design"
  | "configure"
  | "validate"
  | "approve"
  | "deploy"
  | "monitor"
  | "improve";

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export type EntityStatus = "not-started" | "in-progress" | "in-review" | "approved" | "blocked";

export interface Persona {
  readonly id: PersonaId;
  readonly name: string;
  readonly summary: string;
  /** Lifecycle stages this persona is primarily accountable for. */
  readonly stages: readonly LifecycleStageId[];
}

export interface LifecycleStage {
  readonly id: LifecycleStageId;
  readonly order: number;
  readonly name: string;
  readonly purpose: string;
  /** Phase of the Axion roadmap that delivers this stage's functionality. */
  readonly deliveredInPhase: number;
}

export type SalesforceProductId =
  | "data-360"
  | "agentforce"
  | "sales-cloud"
  | "service-cloud"
  | "marketing-cloud"
  | "financial-services-cloud"
  | "manufacturing-cloud"
  | "automotive-cloud"
  | "field-service"
  | "revenue-cloud"
  | "health-cloud"
  | "consumer-goods-cloud"
  | "loyalty-management"
  | "tableau"
  | "shield";

export interface SalesforceProduct {
  readonly id: SalesforceProductId;
  readonly name: string;
  readonly category: "data" | "agent" | "crm" | "engagement" | "analytics" | "security";
  readonly industries: readonly Industry[];
}

export interface ExcludedProduct {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
}

export type SourcePlatformId =
  | "salesforce"
  | "snowflake"
  | "databricks"
  | "aws"
  | "azure"
  | "sap"
  | "oracle"
  | "core-banking"
  | "commerce"
  | "loyalty"
  | "mes"
  | "scada-historian"
  | "plm"
  | "eam-cmms"
  | "iot-platform"
  | "telematics"
  | "dealer-management"
  | "warranty"
  | "parts-catalog"
  | "supplier-portal";

export type IngestionPattern = "physical" | "zero-copy" | "cached-acceleration" | "streaming";

export interface SourcePlatform {
  readonly id: SourcePlatformId;
  readonly name: string;
  readonly category: "crm" | "lakehouse" | "cloud" | "erp" | "industry" | "engagement";
  readonly supportedPatterns: readonly IngestionPattern[];
}

export type ConceptGroup =
  | "blueprinting"
  | "modeling"
  | "integration"
  | "identity"
  | "activation"
  | "agent"
  | "governance"
  | "release"
  | "operations";

export interface PlatformConcept {
  readonly id: string;
  readonly name: string;
  readonly group: ConceptGroup;
  readonly description: string;
  readonly stages: readonly LifecycleStageId[];
}

/* ---------------------------------- Tenancy --------------------------------- */

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly industry: Industry;
  readonly region: string;
  readonly segment: string;
  readonly createdAt: string;
}

export interface Program {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly objective: string;
  readonly executiveSponsor: string;
  readonly status: EntityStatus;
  readonly currentStage: LifecycleStageId;
  readonly startDate: string;
  readonly targetGoLive: string;
}

export interface Workstream {
  readonly id: string;
  readonly tenantId: string;
  readonly programId: string;
  readonly name: string;
  readonly domain: string;
  readonly owner: PersonaId;
  readonly status: EntityStatus;
}

export interface UseCase {
  readonly id: string;
  readonly tenantId: string;
  readonly programId: string;
  readonly workstreamId: string;
  readonly name: string;
  readonly outcome: string;
  readonly products: readonly SalesforceProductId[];
  readonly status: EntityStatus;
  readonly businessValue: "high" | "medium" | "low";
  readonly complexity: "high" | "medium" | "low";
}

export interface Release {
  readonly id: string;
  readonly tenantId: string;
  readonly programId: string;
  readonly version: string;
  readonly name: string;
  readonly status: EntityStatus;
  readonly plannedDate: string;
  readonly useCaseIds: readonly string[];
}

/* ------------------------------ AI + audit core ----------------------------- */

export type AiSuggestionStatus = "pending" | "accepted" | "edited" | "rejected";

export interface AiSuggestion<TValue = unknown> {
  readonly id: string;
  readonly tenantId: string;
  /** Entity the suggestion applies to, e.g. "use-case:uc-001". */
  readonly targetRef: string;
  readonly stage: LifecycleStageId;
  readonly title: string;
  readonly value: TValue;
  readonly rationale: string;
  /** 0-1; omitted when the model does not express calibrated confidence. */
  readonly confidence?: number;
  readonly status: AiSuggestionStatus;
  readonly createdAt: string;
  readonly decidedAt?: string;
  readonly decidedBy?: PersonaId;
}

export type AuditAction =
  | "ai.suggestion.accepted"
  | "ai.suggestion.edited"
  | "ai.suggestion.rejected"
  | "entity.created"
  | "entity.updated"
  | "session.signed-in"
  | "session.signed-out";

export interface AuditEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly actor: string;
  readonly persona: PersonaId;
  readonly action: AuditAction;
  readonly entityRef: string;
  readonly summary: string;
  readonly before?: string;
  readonly after?: string;
  readonly timestamp: string;
}

/* --------------------------------- Session ---------------------------------- */

export interface Session {
  readonly email: string;
  readonly displayName: string;
  readonly persona: PersonaId;
  readonly signedInAt: string;
}
