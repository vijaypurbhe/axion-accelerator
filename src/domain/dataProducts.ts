import type { Industry, LifecycleStageId } from "@/domain/types";
import type { RoleId } from "@/domain/models";

/**
 * Phase 3 domain: data product library, source metadata catalog, field-level mapping,
 * harmonization rules, data quality framework, versioning and approval.
 */

/* ------------------------------- shared enums ------------------------------- */

export type DataProductCategory =
  | "common"
  | "bfsi"
  | "mfg"
  | "auto"
  | "custom"
  | "hls"
  | "rcpg";

export type DataProductLifecycleState =
  | "draft"
  | "in-review"
  | "approved"
  | "published"
  | "deprecated";

export type DataDomain =
  | "party"
  | "customer"
  | "household"
  | "product"
  | "account"
  | "transaction"
  | "investment"
  | "lending"
  | "insurance"
  | "servicing"
  | "engagement"
  | "consent"
  | "risk"
  | "compliance"
  | "org"
  | "location"
  | "workforce"
  /* manufacturing & automotive domains */
  | "asset"
  | "bom"
  | "supplier"
  | "order"
  | "production"
  | "quality"
  | "service"
  | "parts"
  | "vehicle"
  | "dealer"
  | "warranty"
  | "telemetry"
  | "finance";

export type Sensitivity = "public" | "internal" | "confidential" | "restricted" | "pii" | "financial-pii";

export type DataType =
  | "string"
  | "text"
  | "number"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "enum"
  | "reference"
  | "currency"
  | "percent"
  | "json";

export type QualityDimension =
  | "completeness"
  | "accuracy"
  | "consistency"
  | "validity"
  | "uniqueness"
  | "timeliness"
  | "integrity";

export type Severity = "low" | "medium" | "high" | "critical";

export type RelationshipCardinality = "1:1" | "1:M" | "M:1" | "M:M";

export type TransformationKind =
  | "rename"
  | "type-conversion"
  | "date-standardization"
  | "currency-normalization"
  | "code-translation"
  | "reference-lookup"
  | "concatenation"
  | "split"
  | "trim"
  | "case-normalization"
  | "address-standardization"
  | "phone-normalization"
  | "email-normalization"
  | "null-handling"
  | "defaulting"
  | "dedup-preparation"
  | "custom-expression";

export type MappingStatus = "unmapped" | "draft" | "proposed" | "mapped" | "validated" | "rejected";

export type TestStatus = "not-run" | "passed" | "failed" | "warning";

export type IngestionPatternId = "physical" | "zero-copy" | "cached-acceleration" | "streaming";

/* ------------------------------ data products ------------------------------ */

export interface DataProductAttribute {
  readonly id: string;
  readonly businessName: string;
  readonly technicalName: string;
  readonly description: string;
  readonly dataType: DataType;
  readonly format?: string;
  readonly required: boolean;
  readonly primaryKey?: boolean;
  readonly alternateKey?: boolean;
  readonly sensitivity: Sensitivity;
  readonly businessDefinition: string;
  readonly example?: string;
  readonly validValues?: readonly string[];
  readonly defaultValue?: string;
  readonly derivation?: string;
  readonly sourceOfTruth?: string;
  readonly qualityExpectations?: string;
}

export interface DataProductIdentifier {
  readonly id: string;
  readonly name: string;
  readonly kind: "primary" | "alternate" | "natural" | "external" | "match";
  readonly attributeIds: readonly string[];
  readonly description: string;
  readonly identityRelevant: boolean;
}

export interface DataProductRelationship {
  readonly id: string;
  readonly name: string;
  readonly targetProductId: string;
  readonly cardinality: RelationshipCardinality;
  readonly viaAttributeId?: string;
  readonly description: string;
  readonly required?: boolean;
}

export interface QualityRule {
  readonly id: string;
  readonly name: string;
  readonly dimension: QualityDimension;
  readonly description: string;
  readonly attributeId?: string;
  readonly expression: string;
  readonly threshold: number;
  readonly severity: Severity;
  readonly owner: RoleId;
  readonly remediation: string;
  readonly cadence: "real-time" | "hourly" | "daily" | "weekly" | "monthly";
  readonly status: "active" | "draft" | "retired";
}

export interface ClassificationControls {
  readonly sensitivity: Sensitivity;
  readonly classifications: readonly string[];
  readonly regulatory: readonly string[];
  readonly retention: string;
  readonly consentImplications: string;
  readonly encryptionRequired: boolean;
  readonly maskingRequired: boolean;
  readonly residency: string;
}

export interface SampleSourceMapping {
  readonly sourceSystem: string;
  readonly sourceObject: string;
  readonly notes: string;
}

export interface DataProductVersion {
  readonly id: string;
  readonly version: string;
  readonly state: DataProductLifecycleState;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly summary: string;
  readonly changes: readonly {
    readonly field: string;
    readonly change: "added" | "removed" | "changed";
    readonly before?: string;
    readonly after?: string;
  }[];
  readonly snapshot?: string;
}

export interface DataProductApproval {
  readonly id: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly approverRole: RoleId;
  readonly state: "submitted" | "approved" | "rejected";
  readonly decidedAt?: string;
  readonly decidedBy?: string;
  readonly comments?: string;
}

export interface DataProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly businessPurpose: string;
  readonly category: DataProductCategory;
  readonly domain: DataDomain;
  readonly industry: Industry | "cross-industry";
  readonly businessOwnerRole: RoleId;
  readonly technicalOwnerRole: RoleId;
  readonly isTemplate: boolean;
  readonly derivedFromTemplateId?: string;
  readonly clientId?: string;
  readonly initiativeId?: string;
  readonly state: DataProductLifecycleState;
  readonly version: string;
  readonly reuseCount: number;
  readonly attributes: readonly DataProductAttribute[];
  readonly identifiers: readonly DataProductIdentifier[];
  readonly relationships: readonly DataProductRelationship[];
  readonly qualityRules: readonly QualityRule[];
  readonly controls: ClassificationControls;
  readonly sampleSourceMappings: readonly SampleSourceMapping[];
  readonly salesforceAlignment: string;
  readonly conceptualDlo?: string;
  readonly standardizedDmo?: string;
  readonly applicableUseCases: readonly string[];
  readonly stages: readonly LifecycleStageId[];
  readonly versions: readonly DataProductVersion[];
  readonly approvals: readonly DataProductApproval[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy?: string;
}

/* --------------------------- source metadata catalog ------------------------ */

export interface SourceField {
  readonly id: string;
  readonly name: string;
  readonly dataType: DataType;
  readonly nullable: boolean;
  readonly description: string;
  readonly sampleValue?: string;
  readonly sensitivity: Sensitivity;
}

export interface SourceObject {
  readonly id: string;
  readonly systemId: string;
  readonly name: string;
  readonly label: string;
  readonly domain: DataDomain;
  readonly recordCount: number;
  readonly refreshFrequency: string;
  readonly fields: readonly SourceField[];
}

export interface SourceSystem {
  readonly id: string;
  readonly platform: string;
  readonly name: string;
  readonly environment: "dev" | "uat" | "prod";
  readonly systemOwner: string;
  readonly dataOwner: string;
  readonly connectionStatus: "connected" | "pending" | "error" | "not-configured";
  readonly supportedPatterns: readonly IngestionPatternId[];
  readonly domains: readonly DataDomain[];
  readonly refreshFrequency: string;
  readonly geography: string;
  readonly dataResidency: string;
  readonly sensitivity: Sensitivity;
  readonly estimatedVolume: string;
  readonly availability: string;
  readonly metadataSyncedAt: string;
}

/* --------------------------------- mapping --------------------------------- */

export interface TransformationRule {
  readonly id: string;
  readonly kind: TransformationKind;
  readonly expression: string;
  readonly notes?: string;
}

export interface FieldMapping {
  readonly id: string;
  readonly initiativeId: string;
  readonly sourceSystemId: string;
  readonly sourceObjectId: string;
  readonly sourceFieldId: string;
  readonly targetProductId: string;
  readonly targetAttributeId: string;
  readonly transformations: readonly TransformationRule[];
  readonly normalization?: string;
  readonly lookup?: string;
  readonly defaultValue?: string;
  readonly validation?: string;
  readonly status: MappingStatus;
  readonly owner: RoleId;
  readonly confidence?: number;
  readonly notes?: string;
  readonly testStatus: TestStatus;
  readonly aiSuggested: boolean;
  readonly conceptualDlo?: string;
  readonly standardizedDmo?: string;
  readonly relationship?: string;
  readonly keyQualifier?: string;
  readonly identityRelevant: boolean;
  readonly derived: boolean;
  readonly activationEligible: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* -------------------------------- AI layer --------------------------------- */

export type AiSuggestionKind =
  | "attribute"
  | "model-extension"
  | "relationship"
  | "mapping"
  | "transformation"
  | "quality-rule"
  | "sensitivity"
  | "regulatory";

export interface DataAiSuggestion {
  readonly id: string;
  readonly kind: AiSuggestionKind;
  readonly targetRef: string;
  readonly title: string;
  readonly detail: string;
  readonly rationale: string;
  readonly confidence: number;
  readonly payload: Record<string, unknown>;
  readonly status: "pending" | "accepted" | "edited" | "rejected";
  readonly createdAt: string;
  readonly decidedAt?: string;
  readonly decidedBy?: string;
}

/* ------------------------------- scorecards -------------------------------- */

export interface QualityScorecard {
  readonly productId: string;
  readonly completeness: number;
  readonly mappingCoverage: number;
  readonly qualityScore: number;
  readonly byDimension: readonly { readonly dimension: QualityDimension; readonly score: number; readonly rules: number }[];
  readonly criticalIssues: readonly {
    readonly id: string;
    readonly title: string;
    readonly severity: Severity;
    readonly detail: string;
  }[];
}

export interface RuleSimulationResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly dimension: QualityDimension;
  readonly recordsEvaluated: number;
  readonly recordsPassed: number;
  readonly passRate: number;
  readonly threshold: number;
  readonly outcome: "pass" | "fail";
  readonly failedSamples: readonly string[];
}

/* --------------------------------- labels ---------------------------------- */

export const CATEGORY_LABELS: Record<DataProductCategory, string> = {
  common: "Common enterprise",
  bfsi: "BFSI",
  mfg: "Manufacturing",
  auto: "Automotive",
  custom: "Client custom",
  hls: "HLS (extension ready)",
  rcpg: "RCPG (extension ready)",
};

export const STATE_LABELS: Record<DataProductLifecycleState, string> = {
  draft: "Draft",
  "in-review": "In review",
  approved: "Approved",
  published: "Published",
  deprecated: "Deprecated",
};

export const DOMAIN_LABELS: Record<DataDomain, string> = {
  party: "Party",
  customer: "Customer",
  household: "Household",
  product: "Product",
  account: "Account",
  transaction: "Transaction",
  investment: "Investment",
  lending: "Lending",
  insurance: "Insurance",
  servicing: "Servicing",
  engagement: "Engagement",
  consent: "Consent",
  risk: "Risk",
  compliance: "Compliance",
  org: "Organisation",
  location: "Location",
  workforce: "Workforce",
  asset: "Asset & Installed Base",
  bom: "Bill of Materials",
  supplier: "Supplier",
  order: "Order & Fulfilment",
  production: "Production",
  quality: "Quality",
  service: "Service",
  parts: "Parts & Aftermarket",
  vehicle: "Vehicle",
  dealer: "Dealer & Network",
  warranty: "Warranty & Claims",
  telemetry: "Telemetry & Connected",
  finance: "Finance & Contracts",
};

export const DIMENSION_LABELS: Record<QualityDimension, string> = {
  completeness: "Completeness",
  accuracy: "Accuracy",
  consistency: "Consistency",
  validity: "Validity",
  uniqueness: "Uniqueness",
  timeliness: "Timeliness",
  integrity: "Integrity",
};

export const TRANSFORMATION_LABELS: Record<TransformationKind, string> = {
  rename: "Rename",
  "type-conversion": "Type conversion",
  "date-standardization": "Date standardization",
  "currency-normalization": "Currency normalization",
  "code-translation": "Code translation",
  "reference-lookup": "Reference lookup",
  concatenation: "Concatenation",
  split: "Split",
  trim: "Trim",
  "case-normalization": "Case normalization",
  "address-standardization": "Address standardization",
  "phone-normalization": "Phone normalization",
  "email-normalization": "Email normalization",
  "null-handling": "Null handling",
  defaulting: "Defaulting",
  "dedup-preparation": "Deduplication preparation",
  "custom-expression": "Custom expression",
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  unmapped: "Unmapped",
  draft: "Draft",
  proposed: "AI proposed",
  mapped: "Mapped",
  validated: "Validated",
  rejected: "Rejected",
};

export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
  pii: "Personal data",
  "financial-pii": "Financial personal data",
};

/** Business-friendly glossary for Data 360 terminology used in the mapping workbench. */
export const DATA360_GLOSSARY: Record<string, string> = {
  "conceptual DLO": "Landing object — the raw shape of data as it arrives from the source system.",
  "standardized object": "Harmonized business object that source data is mapped into (Data 360 DMO).",
  "key qualifier": "The identifier role a field plays when records are matched or linked.",
  "identity relevance": "Whether the field participates in resolving records to a single unified profile.",
  "activation eligibility": "Whether the field may be used downstream for segmentation, journeys or agents.",
};
