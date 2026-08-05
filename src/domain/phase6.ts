/**
 * Phase 6 domain model: Agentforce implementation design and configuration workbench.
 * Extends Phase 0-5 primitives — nothing here replaces existing models.
 */

import type { Industry, LifecycleStageId } from "./types";
import type { RiskLevel, RoleId } from "./models";

/* ================================ Patterns =================================== */

export type AgentPatternId =
  | "banker-assist"
  | "customer-service"
  | "knowledge"
  | "triage"
  | "case-summarization"
  | "next-best-action"
  | "process-automation"
  | "kyc-support"
  | "complaint-management"
  | (string & {});

export interface AgentPattern {
  readonly id: AgentPatternId;
  readonly name: string;
  readonly summary: string;
  readonly primaryChannel: AgentChannel;
  readonly automationLevel: AutomationLevel;
  readonly industries: readonly Industry[];
  readonly custom?: boolean;
  readonly suggestedTopics: readonly string[];
  readonly suggestedActions: readonly string[];
  readonly suggestedGuardrails: readonly GuardrailCategory[];
}

/* ============================== Overview model =============================== */

export type AgentChannel =
  | "internal-console"
  | "web-chat"
  | "mobile-app"
  | "voice"
  | "email"
  | "sms"
  | "whatsapp"
  | "slack-teams"
  | "branch-kiosk";

export const AGENT_CHANNELS: readonly AgentChannel[] = [
  "internal-console",
  "web-chat",
  "mobile-app",
  "voice",
  "email",
  "sms",
  "whatsapp",
  "slack-teams",
  "branch-kiosk",
];

export type AutomationLevel = "assistive" | "supervised" | "semi-autonomous" | "autonomous";

export const AUTOMATION_LEVELS: readonly AutomationLevel[] = [
  "assistive",
  "supervised",
  "semi-autonomous",
  "autonomous",
];

export type AgentEnvironment = "sandbox" | "dev" | "uat" | "prod";

export type AgentLifecycleStatus =
  | "draft"
  | "design-review"
  | "risk-review"
  | "business-review"
  | "approved"
  | "ready-for-validation"
  | "ready-for-deployment"
  | "deployed"
  | "retired";

export const AGENT_STATUSES: readonly AgentLifecycleStatus[] = [
  "draft",
  "design-review",
  "risk-review",
  "business-review",
  "approved",
  "ready-for-validation",
  "ready-for-deployment",
  "deployed",
  "retired",
];

export const AGENT_STATUS_LABEL: Record<AgentLifecycleStatus, string> = {
  draft: "Draft",
  "design-review": "Design Review",
  "risk-review": "Risk Review",
  "business-review": "Business Review",
  approved: "Approved",
  "ready-for-validation": "Ready for Validation",
  "ready-for-deployment": "Ready for Deployment",
  deployed: "Deployed",
  retired: "Retired",
};

export type TestStatus = "not-started" | "in-progress" | "passing" | "failing" | "blocked";

export interface SuccessMetric {
  readonly id: string;
  readonly name: string;
  readonly baseline: string;
  readonly target: string;
  readonly measurement: string;
}

export interface AgentOverview {
  readonly name: string;
  readonly description: string;
  readonly businessObjective: string;
  readonly businessOutcome: string;
  readonly targetPersona: string;
  readonly targetUsers: string;
  readonly channels: readonly AgentChannel[];
  readonly industry: Industry;
  readonly domain: string;
  readonly useCase: string;
  readonly useCaseRef?: string;
  readonly patternId: AgentPatternId;
  readonly owner: RoleId;
  readonly environment: AgentEnvironment;
  readonly languages: readonly string[];
  readonly hoursOfOperation: string;
  readonly automationLevel: AutomationLevel;
  readonly expectedVolume: string;
  readonly expectedBusinessImpact: string;
  readonly successMetrics: readonly SuccessMetric[];
  readonly outOfScope: readonly string[];
  readonly adoptionTarget: number;
}

/* ============================ Topics and intents ============================= */

export type TopicStatus = "draft" | "in-review" | "approved" | "deferred";

export interface AgentTopic {
  readonly id: string;
  readonly name: string;
  readonly parentTopicId?: string;
  readonly classificationDescription: string;
  readonly scope: string;
  readonly sampleUtterances: readonly string[];
  readonly instructions: readonly string[];
  readonly permittedActionIds: readonly string[];
  readonly prohibitedActions: readonly string[];
  readonly requiredDataProductIds: readonly string[];
  readonly escalationConditions: readonly string[];
  readonly priority: "high" | "medium" | "low";
  readonly status: TopicStatus;
  readonly owner: RoleId;
  readonly useCaseRef?: string;
  readonly origin: DesignOrigin;
  readonly rationale?: string;
  readonly confidence?: number;
}

/* =============================== Action catalog ============================== */

export type AgentActionType =
  | "flow"
  | "apex"
  | "record-query"
  | "record-update"
  | "knowledge-retrieval"
  | "external-api"
  | "orchestration"
  | "human-task"
  | "notification"
  | "calculation"
  | "approval-request";

export const AGENT_ACTION_TYPES: readonly AgentActionType[] = [
  "flow",
  "apex",
  "record-query",
  "record-update",
  "knowledge-retrieval",
  "external-api",
  "orchestration",
  "human-task",
  "notification",
  "calculation",
  "approval-request",
];

export const AGENT_ACTION_TYPE_LABEL: Record<AgentActionType, string> = {
  flow: "Salesforce Flow",
  apex: "Apex / custom action",
  "record-query": "Record query",
  "record-update": "Record update",
  "knowledge-retrieval": "Knowledge retrieval",
  "external-api": "External API",
  orchestration: "Orchestration",
  "human-task": "Human task",
  notification: "Notification",
  calculation: "Calculation",
  "approval-request": "Approval request",
};

export type DataClassification = "public" | "internal" | "confidential" | "restricted" | "regulated";

export interface ActionParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
}

export interface AgentAction {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly actionType: AgentActionType;
  readonly system: string;
  readonly reference: string;
  readonly inputs: readonly ActionParameter[];
  readonly outputs: readonly ActionParameter[];
  readonly authentication: string;
  readonly authorization: string;
  readonly timeoutSeconds: number;
  readonly retryBehavior: string;
  readonly validation: readonly string[];
  readonly sideEffects: readonly string[];
  readonly rollback: string;
  readonly auditRequirement: string;
  readonly dataClassification: DataClassification;
  readonly controlIds: readonly string[];
  readonly riskRating: RiskLevel;
  readonly testStatus: TestStatus;
  readonly requiresConfirmation: boolean;
  readonly requiresHumanReview: boolean;
  readonly origin: DesignOrigin;
  readonly rationale?: string;
}

/* ============================ Grounding and data ============================= */

export type GroundingSourceType =
  | "salesforce-crm"
  | "unified-profile"
  | "knowledge"
  | "data-product"
  | "calculated-insight"
  | "external-data"
  | "approved-document"
  | "api-response";

export const GROUNDING_SOURCE_TYPES: readonly GroundingSourceType[] = [
  "salesforce-crm",
  "unified-profile",
  "knowledge",
  "data-product",
  "calculated-insight",
  "external-data",
  "approved-document",
  "api-response",
];

export const GROUNDING_SOURCE_LABEL: Record<GroundingSourceType, string> = {
  "salesforce-crm": "Salesforce CRM data",
  "unified-profile": "Data 360 unified profile",
  knowledge: "Knowledge",
  "data-product": "Data product",
  "calculated-insight": "Calculated insight",
  "external-data": "External data source",
  "approved-document": "Approved document",
  "api-response": "API response",
};

export type RetrievalPattern = "semantic-search" | "direct-lookup" | "filtered-query" | "aggregate" | "stream";

export interface GroundingSource {
  readonly id: string;
  readonly name: string;
  readonly sourceType: GroundingSourceType;
  readonly dataProductId?: string;
  readonly sourceSystemId?: string;
  readonly permittedFields: readonly string[];
  readonly retrievalPattern: RetrievalPattern;
  readonly freshness: string;
  readonly identityRequirement: "none" | "verified-party" | "authenticated-user" | "step-up-verified";
  readonly accessPolicy: string;
  readonly dataClassification: DataClassification;
  readonly citationRequired: boolean;
  readonly fallback: string;
  readonly controlIds: readonly string[];
  readonly origin: DesignOrigin;
}

/* ========================= Instructions and guardrails ======================= */

export type GuardrailCategory =
  | "security"
  | "privacy"
  | "compliance"
  | "safety"
  | "financial-impact"
  | "customer-communication"
  | "hallucination-prevention"
  | "grounding"
  | "identity-verification"
  | "authorization"
  | "prohibited-actions";

export const GUARDRAIL_CATEGORIES: readonly GuardrailCategory[] = [
  "security",
  "privacy",
  "compliance",
  "safety",
  "financial-impact",
  "customer-communication",
  "hallucination-prevention",
  "grounding",
  "identity-verification",
  "authorization",
  "prohibited-actions",
];

export const GUARDRAIL_CATEGORY_LABEL: Record<GuardrailCategory, string> = {
  security: "Security",
  privacy: "Privacy",
  compliance: "Compliance",
  safety: "Safety",
  "financial-impact": "Financial impact",
  "customer-communication": "Customer communication",
  "hallucination-prevention": "Hallucination prevention",
  grounding: "Grounding",
  "identity-verification": "Identity verification",
  authorization: "Authorization",
  "prohibited-actions": "Prohibited actions",
};

export type GuardrailEnforcement = "prompt-instruction" | "platform-config" | "deterministic-rule" | "human-review";

export interface Guardrail {
  readonly id: string;
  readonly category: GuardrailCategory;
  readonly statement: string;
  readonly enforcement: GuardrailEnforcement;
  readonly appliesToTopicIds: readonly string[];
  readonly appliesToActionIds: readonly string[];
  readonly controlIds: readonly string[];
  readonly severity: RiskLevel;
  readonly testable: boolean;
  readonly origin: DesignOrigin;
  readonly rationale?: string;
  readonly reviewed: boolean;
}

export interface AgentInstructions {
  readonly global: readonly string[];
  readonly prohibitedBehavior: readonly string[];
  readonly requiredDisclosures: readonly string[];
  readonly decisionBoundaries: readonly string[];
  readonly restrictedData: readonly string[];
  readonly sensitiveActions: readonly string[];
  readonly confirmationRequirements: readonly string[];
  readonly humanReviewRequirements: readonly string[];
  readonly responseFormatting: readonly string[];
  readonly citationRequirements: readonly string[];
  readonly uncertaintyBehavior: readonly string[];
  readonly escalationBehavior: readonly string[];
}

/* ============================== Human escalation ============================= */

export interface EscalationRule {
  readonly id: string;
  readonly trigger: string;
  readonly triggerType:
    | "low-confidence"
    | "authentication-failure"
    | "high-risk-transaction"
    | "complaint"
    | "regulatory-request"
    | "customer-vulnerability"
    | "policy-exception"
    | "unsupported-request"
    | "suspected-fraud"
    | "custom";
  readonly destinationRole: string;
  readonly contextToTransfer: readonly string[];
  readonly summaryRequirements: string;
  readonly slaMinutes: number;
  readonly customerMessaging: string;
  readonly retryFallback: string;
  readonly overridePermission: string;
  readonly closureProcess: string;
  readonly origin: DesignOrigin;
}

/* ======================= Deterministic process boundaries ==================== */

export type ResponsibilityMode = "agent-led" | "rule-led" | "workflow-led" | "human-led";

export const RESPONSIBILITY_MODES: readonly ResponsibilityMode[] = [
  "agent-led",
  "rule-led",
  "workflow-led",
  "human-led",
];

export const RESPONSIBILITY_LABEL: Record<ResponsibilityMode, string> = {
  "agent-led": "Agent-led",
  "rule-led": "Rule-led",
  "workflow-led": "Workflow-led",
  "human-led": "Human-led",
};

export interface ProcessBoundaryStep {
  readonly id: string;
  readonly sequence: number;
  readonly step: string;
  readonly mode: ResponsibilityMode;
  readonly reasoningScope: string;
  readonly deterministicLogic: string;
  readonly validationRules: readonly string[];
  readonly approvalRequirement: string;
  readonly systemOfRecordUpdate: string;
  readonly prohibitedAutonomy: string;
}

/* ========================== Consumption / cost model ========================= */

export interface ConsumptionAssumptions {
  readonly expectedUsers: number;
  readonly sessionsPerUserPerMonth: number;
  readonly conversationsPerSession: number;
  readonly actionsPerConversation: number;
  readonly retrievalCallsPerConversation: number;
  readonly peakConcurrencyFactor: number;
  readonly monthlyGrowthRate: number;
  readonly creditsPerConversation: number;
  readonly creditsPerAction: number;
  readonly creditsPerRetrieval: number;
  readonly costPerCredit: number;
  readonly lowVarianceFactor: number;
  readonly highVarianceFactor: number;
}

export interface ConsumptionScenario {
  readonly label: "Low" | "Base" | "High";
  readonly conversationsPerMonth: number;
  readonly actionsPerMonth: number;
  readonly retrievalsPerMonth: number;
  readonly peakConversationsPerHour: number;
  readonly creditsPerMonth: number;
  readonly estimatedMonthlyCost: number;
  readonly annualisedCost: number;
  readonly year1WithGrowth: number;
}

/* ============================ Versioning + approval ========================== */

export type ReviewOutcome = "pending" | "approved" | "changes-requested" | "rejected";

export interface AgentReview {
  readonly id: string;
  readonly stage: "design-review" | "risk-review" | "business-review";
  readonly reviewerRole: RoleId;
  readonly outcome: ReviewOutcome;
  readonly comments: string;
  readonly decidedAt?: string;
  readonly decidedBy?: string;
}

export interface AgentVersionSnapshot {
  readonly id: string;
  readonly version: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly status: AgentLifecycleStatus;
  readonly summary: string;
  readonly counts: {
    readonly topics: number;
    readonly actions: number;
    readonly grounding: number;
    readonly guardrails: number;
    readonly escalations: number;
  };
}

export interface ChangeImpact {
  readonly area: string;
  readonly change: string;
  readonly impact: string;
  readonly severity: RiskLevel;
}

/* ============================== Test + backlog =============================== */

export interface AgentTestCase {
  readonly id: string;
  readonly name: string;
  readonly topicId?: string;
  readonly type: "happy-path" | "negative" | "guardrail" | "escalation" | "grounding" | "regression";
  readonly given: string;
  readonly expected: string;
  readonly status: TestStatus;
  readonly origin: DesignOrigin;
}

export interface BacklogItem {
  readonly id: string;
  readonly title: string;
  readonly type: "config" | "development" | "data" | "governance" | "testing";
  readonly owner: RoleId;
  readonly stage: LifecycleStageId;
  readonly estimateDays: number;
  readonly dependsOn: readonly string[];
  readonly status: "open" | "in-progress" | "done";
}

export interface MonitoringPlanItem {
  readonly id: string;
  readonly signal: string;
  readonly metric: string;
  readonly threshold: string;
  readonly owner: RoleId;
  readonly cadence: string;
}

/* ================================ Aggregate ================================== */

export type DesignOrigin = "seed" | "manual" | "ai-suggested" | "pattern-template";

export interface AgentDesignRecord {
  readonly id: string;
  readonly initiativeId: string;
  readonly reference: string;
  readonly overview: AgentOverview;
  readonly status: AgentLifecycleStatus;
  readonly version: string;
  readonly release: string;
  readonly riskRating: RiskLevel;
  readonly testStatus: TestStatus;
  readonly topics: readonly AgentTopic[];
  readonly actions: readonly AgentAction[];
  readonly grounding: readonly GroundingSource[];
  readonly instructions: AgentInstructions;
  readonly guardrails: readonly Guardrail[];
  readonly escalations: readonly EscalationRule[];
  readonly boundaries: readonly ProcessBoundaryStep[];
  readonly consumption: ConsumptionAssumptions;
  readonly testCases: readonly AgentTestCase[];
  readonly backlog: readonly BacklogItem[];
  readonly monitoring: readonly MonitoringPlanItem[];
  readonly reviews: readonly AgentReview[];
  readonly versions: readonly AgentVersionSnapshot[];
  readonly linkedRiskIds: readonly string[];
  readonly linkedDecisionIds: readonly string[];
  readonly identityPolicyId?: string;
  readonly lifecycleStage: LifecycleStageId;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/* ============================== Derived shapes =============================== */

export interface AgentReadiness {
  readonly overall: number;
  readonly dimensions: readonly {
    readonly id: string;
    readonly label: string;
    readonly score: number;
    readonly weight: number;
    readonly note: string;
  }[];
  readonly blockers: readonly string[];
}

export interface TopicDiagnostic {
  readonly kind: "overlap" | "duplicate" | "conflict" | "coverage" | "traceability";
  readonly severity: RiskLevel;
  readonly topicIds: readonly string[];
  readonly message: string;
}

export interface TraceabilityRow {
  readonly agent: string;
  readonly topic: string;
  readonly action: string;
  readonly dataProduct: string;
  readonly source: string;
  readonly control: string;
}

export interface AgentSuggestion {
  readonly id: string;
  readonly kind:
    | "topic"
    | "intent"
    | "action"
    | "instruction"
    | "guardrail"
    | "escalation"
    | "test-case"
    | "risk"
    | "control"
    | "dependency"
    | "metric";
  readonly title: string;
  readonly detail: string;
  readonly rationale: string;
  readonly confidence: number;
  readonly origin: "ai-suggested" | "rules-suggested";
}
