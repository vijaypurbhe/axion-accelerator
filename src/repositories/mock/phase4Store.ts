import { DEFAULT_WEIGHTS } from "@/data/connectivityCatalog";
import { DATA_PRODUCT_TEMPLATES } from "@/data/dataProductLibrary";
import { IDENTITY_TEMPLATES } from "@/data/identityTemplates";
import { INITIATIVE_C360, CLIENT_NORTHSTAR } from "@/data/bfsiSeed";
import type { RoleId } from "@/domain/models";
import type {
  ConnectivityAssessment,
  ConnectivityDecision,
  ConnectivityOverride,
  ConnectivityPolicy,
  ExceptionAction,
  ExceptionStatus,
  IdentityAiSuggestion,
  IdentityException,
  IdentityPolicy,
  IdentityTemplate,
  SimulationRun,
} from "@/domain/phase4";

/** Phase 4 mock persistence. Mirrors the Phase 2/3 store pattern so a live adapter can replace it. */

const STORE_KEY = "axion.phase4.v1";
const LATENCY = 110;

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

export interface ActorLike {
  readonly actor: string;
  readonly role: RoleId;
}

interface Phase4Store {
  policies: ConnectivityPolicy[];
  assessments: ConnectivityAssessment[];
  decisions: ConnectivityDecision[];
  identityPolicies: IdentityPolicy[];
  runs: SimulationRun[];
  exceptions: IdentityException[];
  suggestions: IdentityAiSuggestion[];
}

const productId = (index: number) => DATA_PRODUCT_TEMPLATES[index]?.id ?? "dp-party";

const seedAssessments = (): ConnectivityAssessment[] => [
  {
    id: "ca-snowflake-transactions",
    initiativeId: INITIATIVE_C360,
    sourceSystemId: "src-snowflake",
    dataProductId: productId(3),
    name: "Snowflake analytics history → interaction data product",
    answers: {
      "source-platform": "lakehouse",
      "data-volume": "very-large",
      "record-growth": "high",
      "update-frequency": "hourly",
      freshness: "hours",
      latency: "relaxed",
      "query-frequency": "moderate",
      concurrency: "low",
      "transformation-complexity": "passthrough",
      persistence: "none",
      history: "current",
      "source-performance": "ample",
      "source-availability": "high",
      residency: "same-region",
      "cross-border": "contractual",
      sensitivity: "internal",
      "compliance-obligations": "standard",
      "cost-sensitivity": "high",
      egress: "negligible",
      activation: "analytics",
      "identity-resolution": "none",
      "operational-model": "shared",
      "business-criticality": "important",
    },
    weightOverrides: {},
    status: "evaluated",
    createdAt: now(),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ca-core-banking-party",
    initiativeId: INITIATIVE_C360,
    sourceSystemId: "src-core-banking",
    dataProductId: productId(0),
    name: "Core banking customer master → party data product",
    answers: {
      "source-platform": "core-banking",
      "data-volume": "medium",
      "record-growth": "low",
      "update-frequency": "daily",
      freshness: "t1",
      latency: "agent",
      "query-frequency": "high",
      concurrency: "high",
      "transformation-complexity": "complex",
      persistence: "required",
      history: "full",
      "source-performance": "constrained",
      "source-availability": "business-hours",
      residency: "none",
      "cross-border": "none",
      sensitivity: "financial-pii",
      "compliance-obligations": "regulated-retention",
      "cost-sensitivity": "balanced",
      egress: "moderate",
      activation: "agent",
      "identity-resolution": "match-keys",
      "operational-model": "mature",
      "business-criticality": "critical",
    },
    weightOverrides: {},
    status: "evaluated",
    createdAt: now(),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ca-commerce-orders",
    initiativeId: INITIATIVE_C360,
    sourceSystemId: "src-commerce",
    dataProductId: productId(1),
    name: "Commerce order events → customer data product",
    answers: {
      "source-platform": "saas",
      "data-volume": "large",
      "record-growth": "high",
      "update-frequency": "continuous",
      freshness: "minutes",
      latency: "interactive",
      "query-frequency": "high",
      concurrency: "medium",
      "transformation-complexity": "moderate",
      persistence: "optional",
      history: "limited",
      "source-performance": "limited",
      "source-availability": "high",
      residency: "same-region",
      "cross-border": "contractual",
      sensitivity: "pii",
      "compliance-obligations": "gdpr",
      "cost-sensitivity": "balanced",
      egress: "moderate",
      activation: "mixed",
      "identity-resolution": "attributes",
      "operational-model": "shared",
      "business-criticality": "important",
    },
    weightOverrides: {},
    status: "evaluated",
    createdAt: now(),
    updatedAt: now(),
    updatedBy: "seed",
  },
];

const fromTemplate = (template: IdentityTemplate, initiativeId: string): IdentityPolicy => ({
  id: `ip-${template.id}`,
  initiativeId,
  templateId: template.id,
  name: template.name,
  entity: template.entity,
  description: template.description,
  normalizationRules: template.normalizationRules,
  matchRules: template.matchRules,
  survivorshipRules: template.survivorshipRules,
  reconciliationNotes: template.reconciliationNotes,
  status: "draft",
  version: 1,
  createdAt: now(),
  updatedAt: now(),
  updatedBy: "seed",
});

const seedSuggestions = (policyId: string): IdentityAiSuggestion[] => [
  {
    id: "ias-1",
    initiativeId: INITIATIVE_C360,
    policyId,
    kind: "match-key",
    title: "Add loyalty member identifier as a deterministic match key",
    detail: "Introduce a deterministic rule on memberId with a 97 auto-link threshold.",
    rationale:
      "Loyalty records carry a stable member identifier that appears in 71% of digital profiles and never collides across the sample set.",
    confidence: 84,
    payload: { field: "memberId", comparison: "normalized-exact", weight: 100 },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ias-2",
    initiativeId: INITIATIVE_C360,
    policyId,
    kind: "threshold",
    title: "Raise the fuzzy name auto-link threshold to 95",
    detail: "Fuzzy name and phone pairs are auto-linking at 93 with two negative-evidence cases.",
    rationale:
      "Two auto-linked pairs in the retail sample carry conflicting dates of birth. Raising the threshold moves them to steward review.",
    confidence: 78,
    payload: { ruleId: "mr-fuzzy-name-phone", autoLinkThreshold: 95 },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ias-3",
    initiativeId: INITIATIVE_C360,
    policyId,
    kind: "survivorship",
    title: "Use verified-value survivorship for phone",
    detail: "Prefer the OTP-verified mobile number over the most recently updated value.",
    rationale: "Marketing sourced phone values are unverified and overwrite verified core banking numbers 34% of the time.",
    confidence: 81,
    payload: { attribute: "phone", strategy: "verified-value" },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ias-4",
    initiativeId: INITIATIVE_C360,
    policyId,
    kind: "quality-issue",
    title: "Date of birth missing on marketing sourced records",
    detail: "17% of marketing records have no date of birth, weakening the weighted name rule.",
    rationale: "Blocking on postcode alone raises false-positive risk when date of birth is absent.",
    confidence: 88,
    payload: { field: "dob", source: "src-marketing" },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ias-5",
    initiativeId: INITIATIVE_C360,
    policyId,
    kind: "normalization-rule",
    title: "Normalise apostrophes and spacing in surnames",
    detail: "Add a name normalisation rule that removes apostrophes and collapses internal spacing.",
    rationale: "O'Connor variants appear as three distinct surnames across CRM, core banking and marketing.",
    confidence: 92,
    payload: { field: "lastName", type: "name" },
    status: "pending",
    createdAt: now(),
  },
];

const seed = (): Phase4Store => {
  const identityPolicies = [
    fromTemplate(IDENTITY_TEMPLATES[0], INITIATIVE_C360),
    fromTemplate(IDENTITY_TEMPLATES[1], INITIATIVE_C360),
    fromTemplate(IDENTITY_TEMPLATES[2], INITIATIVE_C360),
  ];
  return {
    policies: [
      {
        clientId: CLIENT_NORTHSTAR,
        weights: { ...DEFAULT_WEIGHTS },
        minimumConfidence: 70,
        overrideRequiresApproval: true,
        bannedPatterns: [],
        updatedAt: now(),
        updatedBy: "seed",
      },
    ],
    assessments: seedAssessments(),
    decisions: [],
    identityPolicies,
    runs: [],
    exceptions: [],
    suggestions: seedSuggestions(identityPolicies[0].id),
  };
};

const load = (): Phase4Store => {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Phase4Store;
    return { ...seed(), ...parsed };
  } catch {
    return seed();
  }
};

let store: Phase4Store = load();

const persist = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — in-memory state still serves the session */
  }
};

export const resetPhase4Store = () => {
  store = seed();
  persist();
};

/* ------------------------------- connectivity ------------------------------ */

export const phase4Connectivity = {
  getPolicy: (clientId: string) =>
    delay(
      store.policies.find((policy) => policy.clientId === clientId) ?? {
        clientId,
        weights: { ...DEFAULT_WEIGHTS },
        minimumConfidence: 70,
        overrideRequiresApproval: true,
        bannedPatterns: [] as ConnectivityPolicy["bannedPatterns"],
        updatedAt: now(),
        updatedBy: "default",
      },
    ),

  savePolicy: (policy: ConnectivityPolicy) => {
    store.policies = [policy, ...store.policies.filter((entry) => entry.clientId !== policy.clientId)];
    persist();
    return delay(policy);
  },

  listAssessments: (initiativeId: string) =>
    delay(store.assessments.filter((assessment) => assessment.initiativeId === initiativeId)),

  createAssessment: (
    input: Pick<ConnectivityAssessment, "initiativeId" | "sourceSystemId" | "dataProductId" | "name"> &
      Partial<Pick<ConnectivityAssessment, "answers" | "sourceObjectId">>,
    actor: ActorLike,
  ) => {
    const assessment: ConnectivityAssessment = {
      id: uid("ca"),
      initiativeId: input.initiativeId,
      sourceSystemId: input.sourceSystemId,
      sourceObjectId: input.sourceObjectId,
      dataProductId: input.dataProductId,
      name: input.name,
      answers: input.answers ?? {},
      weightOverrides: {},
      status: "draft",
      createdAt: now(),
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    store.assessments = [assessment, ...store.assessments];
    persist();
    return delay(assessment);
  },

  updateAssessment: (id: string, patch: Partial<ConnectivityAssessment>, actor: ActorLike) => {
    const existing = store.assessments.find((assessment) => assessment.id === id);
    if (!existing) return Promise.reject(new Error("Assessment not found."));
    const updated: ConnectivityAssessment = { ...existing, ...patch, updatedAt: now(), updatedBy: actor.actor };
    store.assessments = store.assessments.map((assessment) => (assessment.id === id ? updated : assessment));
    persist();
    return delay(updated);
  },

  listDecisions: (initiativeId: string) =>
    delay(store.decisions.filter((decision) => decision.initiativeId === initiativeId)),

  recordDecision: (decision: ConnectivityDecision, override?: ConnectivityOverride) => {
    const entry: ConnectivityDecision = { ...decision, override };
    store.decisions = [entry, ...store.decisions.filter((existing) => existing.assessmentId !== decision.assessmentId)];
    store.assessments = store.assessments.map((assessment) =>
      assessment.id === decision.assessmentId
        ? { ...assessment, status: override ? "overridden" : "decided", updatedAt: now() }
        : assessment,
    );
    persist();
    return delay(entry);
  },
};

/* --------------------------------- identity -------------------------------- */

export const phase4Identity = {
  listPolicies: (initiativeId: string) =>
    delay(store.identityPolicies.filter((policy) => policy.initiativeId === initiativeId)),

  createFromTemplate: (templateId: string, initiativeId: string, actor: ActorLike) => {
    const template = IDENTITY_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return Promise.reject(new Error("Identity template not found."));
    const policy: IdentityPolicy = { ...fromTemplate(template, initiativeId), id: uid("ip"), updatedBy: actor.actor };
    store.identityPolicies = [policy, ...store.identityPolicies];
    persist();
    return delay(policy);
  },

  updatePolicy: (id: string, patch: Partial<IdentityPolicy>, actor: ActorLike) => {
    const existing = store.identityPolicies.find((policy) => policy.id === id);
    if (!existing) return Promise.reject(new Error("Identity policy not found."));
    const updated: IdentityPolicy = {
      ...existing,
      ...patch,
      version: existing.version + 1,
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    store.identityPolicies = store.identityPolicies.map((policy) => (policy.id === id ? updated : policy));
    persist();
    return delay(updated);
  },

  listRuns: (initiativeId: string) => delay(store.runs.filter((run) => run.initiativeId === initiativeId)),

  saveRun: (run: SimulationRun) => {
    store.runs = [run, ...store.runs].slice(0, 10);
    persist();
    return delay(run);
  },

  listExceptions: (initiativeId: string) =>
    delay(store.exceptions.filter((exception) => exception.initiativeId === initiativeId)),

  addExceptions: (exceptions: readonly IdentityException[]) => {
    const existingIds = new Set(store.exceptions.map((exception) => exception.id));
    store.exceptions = [...exceptions.filter((exception) => !existingIds.has(exception.id)), ...store.exceptions];
    persist();
    return delay(store.exceptions);
  },

  resolveException: (
    id: string,
    input: { action: ExceptionAction; status: ExceptionStatus; resolution: string; comment?: string },
    actor: ActorLike,
  ) => {
    const existing = store.exceptions.find((exception) => exception.id === id);
    if (!existing) return Promise.reject(new Error("Exception not found."));
    const timestamp = now();
    const updated: IdentityException = {
      ...existing,
      status: input.status,
      resolvedAction: input.action,
      resolution: input.resolution,
      comments: input.comment
        ? [
            ...existing.comments,
            { id: uid("cmt"), author: actor.actor, role: actor.role, body: input.comment, createdAt: timestamp },
          ]
        : existing.comments,
      history: [
        ...existing.history,
        {
          id: uid("hist"),
          action: input.action,
          actor: actor.actor,
          at: timestamp,
          detail: input.resolution,
        },
      ],
      updatedAt: timestamp,
    };
    store.exceptions = store.exceptions.map((exception) => (exception.id === id ? updated : exception));
    persist();
    return delay(updated);
  },

  listSuggestions: (initiativeId: string) =>
    delay(store.suggestions.filter((suggestion) => suggestion.initiativeId === initiativeId)),

  decideSuggestion: (
    id: string,
    status: Exclude<IdentityAiSuggestion["status"], "pending">,
    actor: ActorLike,
    payload?: Record<string, unknown>,
  ) => {
    const existing = store.suggestions.find((suggestion) => suggestion.id === id);
    if (!existing) return Promise.reject(new Error("Suggestion not found."));
    const updated: IdentityAiSuggestion = {
      ...existing,
      status,
      payload: payload ?? existing.payload,
      decidedAt: now(),
      decidedBy: actor.actor,
    };
    store.suggestions = store.suggestions.map((suggestion) => (suggestion.id === id ? updated : suggestion));
    persist();
    return delay(updated);
  },
};
