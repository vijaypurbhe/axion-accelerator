import type { RoleId } from "@/domain/models";
import type { Industry } from "@/domain/types";
import type { IngestionPatternId } from "@/domain/dataProducts";

/**
 * Phase 4 domain: connectivity decision engine (physical / zero-copy / cached acceleration)
 * and the identity resolution studio (normalization, matching, survivorship, simulation, exceptions).
 */

/* --------------------------------------------------------------------------
 * Connectivity
 * ------------------------------------------------------------------------ */

/** Phase 4 evaluates three implementation patterns; streaming stays out of scope. */
export type ConnectivityPatternId = Exclude<IngestionPatternId, "streaming">;

export const CONNECTIVITY_PATTERNS: readonly ConnectivityPatternId[] = [
  "physical",
  "zero-copy",
  "cached-acceleration",
];

export type CriterionGroup =
  | "profile"
  | "performance"
  | "operational"
  | "compliance"
  | "commercial"
  | "downstream";

export interface CriterionOption {
  readonly value: string;
  readonly label: string;
  /** Contribution per pattern, -2 (strongly against) to +2 (strongly for). */
  readonly scores: Record<ConnectivityPatternId, number>;
  /** Patterns this answer rules out entirely. */
  readonly disqualifies?: readonly ConnectivityPatternId[];
  readonly note?: string;
}

export interface DecisionCriterion {
  readonly id: string;
  readonly label: string;
  readonly group: CriterionGroup;
  readonly question: string;
  readonly helpText: string;
  /** Organisation default weight, 1-5. */
  readonly defaultWeight: number;
  readonly options: readonly CriterionOption[];
}

/** Client-level overrides on top of the organisation default weights and thresholds. */
export interface ConnectivityPolicy {
  readonly clientId: string;
  readonly weights: Record<string, number>;
  readonly minimumConfidence: number;
  readonly overrideRequiresApproval: boolean;
  readonly bannedPatterns: readonly ConnectivityPatternId[];
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface PatternGuidance {
  readonly pattern: ConnectivityPatternId;
  readonly name: string;
  readonly summary: string;
  readonly benefits: readonly string[];
  readonly limitations: readonly string[];
  readonly risks: readonly string[];
  readonly prerequisites: readonly string[];
  readonly costConsiderations: readonly string[];
  readonly complianceConsiderations: readonly string[];
  readonly architectureImpact: readonly string[];
}

export interface PlatformConnectivityGuidance {
  readonly platform: string;
  readonly supported: readonly ConnectivityPatternId[];
  readonly preferred: ConnectivityPatternId;
  readonly connectorNotes: string;
  readonly considerations: readonly string[];
  readonly egressNotes: string;
  readonly identityNotes: string;
}

export type ConnectivityAssessmentStatus = "draft" | "evaluated" | "decided" | "overridden";

export interface ConnectivityAssessment {
  readonly id: string;
  readonly initiativeId: string;
  readonly sourceSystemId: string;
  readonly sourceObjectId?: string;
  readonly dataProductId: string;
  readonly name: string;
  readonly answers: Record<string, string>;
  readonly weightOverrides: Record<string, number>;
  readonly status: ConnectivityAssessmentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface CriterionContribution {
  readonly criterionId: string;
  readonly label: string
  readonly group: CriterionGroup;
  readonly answerLabel: string;
  readonly weight: number;
  readonly rawScore: number;
  readonly weighted: number;
}

export interface PatternScore {
  readonly pattern: ConnectivityPatternId;
  /** Normalised 0-100. */
  readonly score: number;
  readonly disqualified: boolean;
  readonly disqualifiedBy: readonly string[];
  readonly contributions: readonly CriterionContribution[];
}

export interface ConnectivityDecisionResult {
  readonly assessmentId: string;
  readonly recommended: ConnectivityPatternId;
  readonly fallback?: ConnectivityPatternId;
  readonly confidence: number;
  readonly answeredCount: number;
  readonly criteriaCount: number;
  readonly scores: readonly PatternScore[];
  readonly rationale: readonly string[];
  readonly assumptions: readonly string[];
  readonly guidance: PatternGuidance;
  readonly platformGuidance?: PlatformConnectivityGuidance;
}

export interface ConnectivityOverride {
  readonly pattern: ConnectivityPatternId;
  readonly rationale: string;
  readonly risks: string;
  readonly mitigation: string;
  readonly approverRole: RoleId;
  readonly effectiveDate: string;
  readonly decidedBy: string;
  readonly decidedAt: string;
}

export interface ConnectivityDecision {
  readonly id: string;
  readonly assessmentId: string;
  readonly initiativeId: string;
  readonly recommended: ConnectivityPatternId;
  readonly selected: ConnectivityPatternId;
  readonly confidence: number;
  readonly rationale: readonly string[];
  readonly override?: ConnectivityOverride;
  readonly adrId?: string;
  readonly adrReference?: string;
  readonly decidedBy: string;
  readonly decidedAt: string;
}

/* --------------------------------------------------------------------------
 * Identity resolution
 * ------------------------------------------------------------------------ */

export type IdentityEntity =
  | "individual"
  | "household"
  | "business"
  | "account-relationship"
  | "advisor-relationship"
  | "asset"
  | "vehicle"
  | "supplier"
  | "dealer-relationship";

export type NormalizationType =
  | "name"
  | "address"
  | "email"
  | "phone"
  | "national-id"
  | "tax-id"
  | "account-id"
  | "business-id"
  | "date-of-birth"
  | "organization-name"
  | "serial-number"
  | "part-number"
  | "site-code"
  | "vin"
  | "license-plate"
  | "device-id";

export type NullHandling = "ignore" | "treat-as-blank" | "block-match" | "flag-exception";

export interface NormalizationRule {
  readonly id: string;
  readonly field: string;
  readonly type: NormalizationType;
  readonly inputPattern: string;
  readonly outputPattern: string;
  readonly locale: string;
  readonly sequence: number;
  readonly nullHandling: NullHandling;
  readonly active: boolean;
  readonly aiSuggested?: boolean;
}

export type MatchRuleKind =
  | "deterministic-exact"
  | "deterministic-normalized"
  | "fuzzy"
  | "phonetic"
  | "weighted"
  | "composite"
  | "exclusion"
  | "negative";

export type ComparisonMethod =
  | "exact"
  | "normalized-exact"
  | "fuzzy"
  | "phonetic"
  | "numeric-tolerance"
  | "date-tolerance";

export interface MatchFieldWeight {
  readonly field: string;
  readonly comparison: ComparisonMethod;
  readonly weight: number;
}

export interface MatchRule {
  readonly id: string;
  readonly name: string;
  readonly entity: IdentityEntity;
  readonly kind: MatchRuleKind;
  readonly fields: readonly MatchFieldWeight[];
  readonly threshold: number;
  readonly priority: number;
  readonly blocking: readonly string[];
  readonly positiveEvidence: readonly string[];
  readonly negativeEvidence: readonly string[];
  readonly autoLinkThreshold: number;
  readonly manualReviewThreshold: number;
  readonly noMatchThreshold: number;
  readonly active: boolean;
  readonly aiSuggested?: boolean;
  readonly notes?: string;
}

export type SurvivorshipStrategy =
  | "source-priority"
  | "most-recent"
  | "most-complete"
  | "verified-value"
  | "trusted-source"
  | "non-null-preference"
  | "manual-override"
  | "custom-logic";

export interface SurvivorshipRule {
  readonly id: string;
  readonly attribute: string;
  readonly strategy: SurvivorshipStrategy;
  readonly sourcePriority: readonly string[];
  readonly expression?: string;
  readonly notes: string;
  readonly aiSuggested?: boolean;
}

export interface IdentityPolicy {
  readonly id: string;
  readonly initiativeId: string;
  readonly templateId?: string;
  readonly name: string;
  readonly entity: IdentityEntity;
  readonly description: string;
  readonly normalizationRules: readonly NormalizationRule[];
  readonly matchRules: readonly MatchRule[];
  readonly survivorshipRules: readonly SurvivorshipRule[];
  readonly reconciliationNotes: string;
  readonly status: "draft" | "in-review" | "approved";
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface IdentityTemplate {
  readonly id: string;
  readonly name: string;
  readonly entity: IdentityEntity;
  /** Verticals the template is written for. Omitted means cross-industry. */
  readonly industries?: readonly Industry[];
  readonly description: string;
  readonly useCases: readonly string[];
  readonly normalizationRules: readonly NormalizationRule[];
  readonly matchRules: readonly MatchRule[];
  readonly survivorshipRules: readonly SurvivorshipRule[];
  readonly reconciliationNotes: string;
}

export interface SampleIdentityRecord {
  readonly id: string;
  readonly setId: string;
  readonly entity: IdentityEntity;
  readonly sourceSystemId: string;
  readonly sourceLabel: string;
  readonly updatedAt: string;
  readonly verified: boolean;
  readonly attributes: Record<string, string>;
}

export interface SampleRecordSet {
  readonly id: string;
  readonly name: string;
  readonly entity: IdentityEntity;
  readonly description: string;
  readonly recordCount: number;
}

export type PairOutcome = "auto-link" | "manual-review" | "no-match" | "excluded";

export interface FieldComparison {
  readonly field: string;
  readonly comparison: ComparisonMethod;
  readonly leftValue: string;
  readonly rightValue: string;
  readonly similarity: number;
  readonly weight: number;
  readonly contribution: number;
}

export interface CandidatePair {
  readonly id: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly ruleId: string;
  readonly ruleName: string;
  readonly score: number;
  readonly outcome: PairOutcome;
  readonly comparisons: readonly FieldComparison[];
  readonly positiveEvidence: readonly string[];
  readonly negativeEvidence: readonly string[];
  readonly falsePositiveRisk: "low" | "medium" | "high";
  readonly falseNegativeRisk: "low" | "medium" | "high";
}

export interface GoldenAttribute {
  readonly attribute: string;
  readonly value: string;
  readonly sourceRecordId: string;
  readonly sourceLabel: string;
  readonly strategy: SurvivorshipStrategy;
  readonly confidence: number;
  readonly conflicts: readonly { readonly value: string; readonly sourceLabel: string }[];
  readonly exception: boolean;
}

export interface UnifiedProfile {
  readonly clusterId: string;
  readonly entity: IdentityEntity;
  readonly recordIds: readonly string[];
  readonly attributes: readonly GoldenAttribute[];
  readonly confidence: number;
  readonly exceptionCount: number;
}

export interface RulePerformance {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly pairsEvaluated: number;
  readonly autoLinked: number;
  readonly manualReview: number;
  readonly noMatch: number;
  readonly averageScore: number;
}

export interface SimulationRun {
  readonly id: string;
  readonly policyId: string;
  readonly setId: string;
  readonly initiativeId: string;
  readonly runAt: string;
  readonly runBy: string;
  readonly thresholdShift: number;
  readonly totalRecords: number;
  readonly matchedClusters: number;
  readonly autoMatched: number;
  readonly manualReview: number;
  readonly unmatched: number;
  readonly potentialDuplicates: number;
  readonly confidenceDistribution: readonly { readonly bucket: string; readonly count: number }[];
  readonly rulePerformance: readonly RulePerformance[];
  readonly pairs: readonly CandidatePair[];
  readonly profiles: readonly UnifiedProfile[];
  readonly falsePositiveRisk: number;
  readonly falseNegativeRisk: number;
}

export type ExceptionType =
  | "ambiguous-match"
  | "conflicting-attribute"
  | "possible-duplicate"
  | "negative-evidence"
  | "missing-identifier"
  | "survivorship-conflict";

export type ExceptionStatus = "open" | "in-review" | "resolved" | "deferred" | "escalated";

export type ExceptionAction =
  | "merge"
  | "link-no-merge"
  | "keep-separate"
  | "defer"
  | "escalate"
  | "rule-recommendation";

export interface ExceptionComment {
  readonly id: string;
  readonly author: string;
  readonly role: RoleId;
  readonly body: string;
  readonly createdAt: string;
}

export interface ExceptionAuditEntry {
  readonly id: string;
  readonly action: string;
  readonly actor: string;
  readonly at: string;
  readonly detail: string;
}

export interface IdentityException {
  readonly id: string;
  readonly initiativeId: string;
  readonly policyId: string;
  readonly runId?: string;
  readonly type: ExceptionType;
  readonly entity: IdentityEntity;
  readonly affectedRecordIds: readonly string[];
  readonly affectedLabels: readonly string[];
  readonly matchConfidence: number;
  readonly conflictingAttributes: readonly { readonly attribute: string; readonly values: readonly string[] }[];
  readonly recommendedAction: ExceptionAction;
  readonly recommendationRationale: string;
  readonly recommendationConfidence: number;
  readonly assignedTo: RoleId;
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly slaDueAt: string;
  readonly status: ExceptionStatus;
  readonly resolution?: string;
  readonly resolvedAction?: ExceptionAction;
  readonly comments: readonly ExceptionComment[];
  readonly history: readonly ExceptionAuditEntry[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* ------------------------------- AI layer ---------------------------------- */

export type IdentityAiSuggestionKind =
  | "normalization-rule"
  | "match-key"
  | "field-weights"
  | "threshold"
  | "survivorship"
  | "exception-action"
  | "quality-issue";

export interface IdentityAiSuggestion {
  readonly id: string;
  readonly initiativeId: string;
  readonly policyId: string;
  readonly kind: IdentityAiSuggestionKind;
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

/* -------------------------------- labels ---------------------------------- */

export const PATTERN_LABELS: Record<ConnectivityPatternId, string> = {
  physical: "Physical ingest",
  "zero-copy": "Zero-copy live query",
  "cached-acceleration": "Cached acceleration",
};

export const CRITERION_GROUP_LABELS: Record<CriterionGroup, string> = {
  profile: "Source profile",
  performance: "Performance & freshness",
  operational: "Operational model",
  compliance: "Residency & compliance",
  commercial: "Cost & commercial",
  downstream: "Downstream usage",
};

export const ENTITY_LABELS: Record<IdentityEntity, string> = {
  individual: "Individual identity",
  household: "Household identity",
  business: "Business identity",
  "account-relationship": "Account relationship",
  "advisor-relationship": "Advisor / banker relationship",
  asset: "Asset / installed base",
  vehicle: "Vehicle identity",
  supplier: "Supplier & site identity",
  "dealer-relationship": "Dealer / owner relationship",
};

export const MATCH_KIND_LABELS: Record<MatchRuleKind, string> = {
  "deterministic-exact": "Deterministic exact",
  "deterministic-normalized": "Deterministic normalized",
  fuzzy: "Fuzzy",
  phonetic: "Phonetic",
  weighted: "Weighted",
  composite: "Composite",
  exclusion: "Exclusion",
  negative: "Negative match",
};

export const SURVIVORSHIP_LABELS: Record<SurvivorshipStrategy, string> = {
  "source-priority": "Source priority",
  "most-recent": "Most recent",
  "most-complete": "Most complete",
  "verified-value": "Verified value",
  "trusted-source": "Trusted source",
  "non-null-preference": "Non-null preference",
  "manual-override": "Manual override",
  "custom-logic": "Attribute custom logic",
};

export const NORMALIZATION_LABELS: Record<NormalizationType, string> = {
  name: "Name",
  address: "Address",
  email: "Email",
  phone: "Phone",
  "national-id": "National identifier",
  "tax-id": "Tax identifier",
  "account-id": "Account identifier",
  "business-id": "Business identifier",
  "date-of-birth": "Date of birth",
  "organization-name": "Organisation name",
};

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  "ambiguous-match": "Ambiguous match",
  "conflicting-attribute": "Conflicting attribute",
  "possible-duplicate": "Possible duplicate",
  "negative-evidence": "Negative evidence conflict",
  "missing-identifier": "Missing identifier",
  "survivorship-conflict": "Survivorship conflict",
};

export const EXCEPTION_ACTION_LABELS: Record<ExceptionAction, string> = {
  merge: "Merge",
  "link-no-merge": "Link without merge",
  "keep-separate": "Keep separate",
  defer: "Defer",
  escalate: "Escalate",
  "rule-recommendation": "Raise rule recommendation",
};
