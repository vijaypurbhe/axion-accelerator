import { CLIENT_NORTHSTAR, INITIATIVE_C360 } from "@/data/bfsiSeed";
import { DATA_PRODUCT_TEMPLATES, getTemplate } from "@/data/dataProductLibrary";
import { SOURCE_OBJECTS, SOURCE_SYSTEMS, getSourceObject, getSourceSystem } from "@/data/sourceCatalog";
import type { RoleId } from "@/domain/models";
import type {
  DataAiSuggestion,
  DataProduct,
  DataProductApproval,
  DataProductVersion,
  FieldMapping,
  MappingStatus,
  TransformationRule,
} from "@/domain/dataProducts";
import type { ActorLike } from "@/repositories/mock/phase2Store";

/**
 * Phase 3 mock store: instantiated (client/initiative) data products cloned from the
 * accelerator library, custom products, field mappings against the source catalog, and
 * pending AI suggestions. Mirrors the phase2Store persistence and seeding conventions.
 */

const STORE_KEY = "axion.phase3.v1";
const LATENCY = 120;

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

interface Phase3Store {
  products: DataProduct[];
  mappings: FieldMapping[];
  suggestions: DataAiSuggestion[];
}

/* --------------------------------- seeding --------------------------------- */

/** Templates instantiated as live, client-scoped data products for the flagship initiative. */
const INSTANTIATED_TEMPLATE_IDS = [
  "dp-party",
  "dp-customer",
  "dp-household",
  "dp-financial-account",
  "dp-financial-transaction",
  "dp-loan",
  "dp-kyc-record",
  "dp-interaction",
  "dp-case",
  "dp-consent",
  "dp-risk-profile",
  "dp-fraud-alert",
];

const instantiate = (templateId: string, clientId: string, initiativeId: string, index: number): DataProduct => {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown data product template: ${templateId}`);
  const id = `dp-inst-${templateId.replace(/^dp-/, "")}`;
  const version: DataProductVersion = {
    id: `${id}-v1`,
    version: "1.0.0",
    state: "published",
    createdAt: template.createdAt,
    createdBy: "Axion accelerator library",
    summary: `Instantiated from the ${template.name} accelerator template for NorthStar C360.`,
    changes: [{ field: "product", change: "added", after: template.name }],
  };
  const approval: DataProductApproval | undefined =
    index % 4 === 0
      ? {
          id: `${id}-appr-1`,
          requestedBy: "priya.nair@techmahindra.com",
          requestedAt: now(),
          approverRole: "enterprise-architect",
          state: "submitted",
        }
      : undefined;
  return {
    ...template,
    id,
    isTemplate: false,
    derivedFromTemplateId: template.id,
    clientId,
    initiativeId,
    state: index % 5 === 0 ? "in-review" : "published",
    reuseCount: 1,
    versions: [version],
    approvals: approval ? [approval] : [],
    updatedBy: "priya.nair@techmahindra.com",
    updatedAt: now(),
  };
};

const seedCustomProduct = (clientId: string, initiativeId: string): DataProduct => {
  const base = getTemplate("dp-financial-goal");
  if (!base) throw new Error("Missing dp-financial-goal template");
  return {
    ...base,
    id: "dp-custom-wealth-milestone",
    name: "Wealth milestone (custom)",
    description: "NorthStar-specific extension tracking advisor-declared wealth milestones beyond the standard financial goal shape.",
    category: "custom",
    isTemplate: false,
    derivedFromTemplateId: base.id,
    clientId,
    initiativeId,
    state: "draft",
    version: "0.2.0",
    reuseCount: 0,
    versions: [
      {
        id: "dp-custom-wealth-milestone-v1",
        version: "0.1.0",
        state: "draft",
        createdAt: "2026-06-02T10:00:00.000Z",
        createdBy: "amelia.chen@techmahindra.com",
        summary: "Initial draft cloned from Financial goal.",
        changes: [{ field: "product", change: "added", after: "Wealth milestone (custom)" }],
      },
      {
        id: "dp-custom-wealth-milestone-v2",
        version: "0.2.0",
        state: "draft",
        createdAt: "2026-06-18T10:00:00.000Z",
        createdBy: "amelia.chen@techmahindra.com",
        summary: "Added advisor sign-off attribute; pending business review.",
        changes: [{ field: "advisor_signoff", change: "added", after: "boolean" }],
      },
    ],
    approvals: [
      {
        id: "dp-custom-wealth-milestone-appr-1",
        requestedBy: "amelia.chen@techmahindra.com",
        requestedAt: "2026-06-18T11:00:00.000Z",
        approverRole: "data-steward",
        state: "submitted",
      },
    ],
    updatedAt: "2026-06-18T11:00:00.000Z",
    updatedBy: "amelia.chen@techmahindra.com",
  };
};

const mapping = (
  id: string,
  initiativeId: string,
  sourceSystemId: string,
  sourceObjectId: string,
  sourceFieldId: string,
  targetProductId: string,
  targetAttributeId: string,
  patch: Partial<FieldMapping> = {},
): FieldMapping => ({
  id,
  initiativeId,
  sourceSystemId,
  sourceObjectId,
  sourceFieldId,
  targetProductId,
  targetAttributeId,
  transformations: [],
  status: "mapped",
  owner: "data-engineer",
  testStatus: "passed",
  aiSuggested: false,
  identityRelevant: false,
  derived: false,
  activationEligible: true,
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-01T09:00:00.000Z",
  ...patch,
});

const rename = (expression: string, notes?: string): TransformationRule => ({
  id: uid("tr"),
  kind: "rename",
  expression,
  notes,
});

const seedMappings = (initiativeId: string): FieldMapping[] => [
  mapping("fm-001", initiativeId, "src-core-banking", "so-core-cif", "cif_no", "dp-inst-party", "party-id", {
    transformations: [rename("CIF_NO -> party_id")],
    conceptualDlo: "party_landing",
    standardizedDmo: "Party",
    keyQualifier: "Primary key",
    identityRelevant: true,
    confidence: 0.97,
  }),
  mapping("fm-002", initiativeId, "src-core-banking", "so-core-cif", "cust_name", "dp-inst-party", "legal-name", {
    transformations: [rename("CUST_NAME -> legal_name"), { id: uid("tr"), kind: "case-normalization", expression: "PROPER(CUST_NAME)", notes: "Source stores upper-case names." }],
    conceptualDlo: "party_landing",
    standardizedDmo: "Party",
    confidence: 0.93,
  }),
  mapping("fm-003", initiativeId, "src-core-banking", "so-core-cif", "dob", "dp-inst-party", "birth-date", {
    transformations: [{ id: uid("tr"), kind: "date-standardization", expression: "TO_DATE(DOB, 'DDMMYYYY')" }],
    conceptualDlo: "party_landing",
    standardizedDmo: "Party",
    testStatus: "warning",
    notes: "3.2% of records fail strict date parsing; investigating legacy 6-digit format.",
    confidence: 0.88,
  }),
  mapping("fm-004", initiativeId, "src-sfdc", "so-sfdc-account", "personemail", "dp-inst-party", "primary-email", {
    transformations: [{ id: uid("tr"), kind: "email-normalization", expression: "LOWER(TRIM(PersonEmail))" }],
    conceptualDlo: "party_landing",
    standardizedDmo: "Party",
    keyQualifier: "Match key",
    identityRelevant: true,
    status: "validated",
    confidence: 0.95,
  }),
  mapping("fm-005", initiativeId, "src-core-banking", "so-core-cif", "cif_no", "dp-inst-customer", "party-id", {
    conceptualDlo: "customer_landing",
    standardizedDmo: "Customer",
    identityRelevant: true,
    confidence: 0.96,
  }),
  mapping("fm-006", initiativeId, "src-core-banking", "so-core-cif", "segment_cd", "dp-inst-customer", "segment", {
    transformations: [{ id: uid("tr"), kind: "code-translation", expression: "SEGMENT_CD -> Mass|Affluent|HNW|SMB|Commercial lookup" }],
    lookup: "ref_segment_code",
    conceptualDlo: "customer_landing",
    standardizedDmo: "Customer",
    confidence: 0.9,
  }),
  mapping("fm-007", initiativeId, "src-snowflake", "so-snow-customer360", "churn_probability", "dp-inst-customer", "churn-risk-score", {
    transformations: [{ id: uid("tr"), kind: "type-conversion", expression: "churn_probability * 100" }],
    derived: true,
    conceptualDlo: "customer_landing",
    standardizedDmo: "Customer",
    confidence: 0.85,
  }),
  mapping("fm-008", initiativeId, "src-core-banking", "so-core-acct", "acct_no", "dp-inst-financial-account", "account-id", {
    conceptualDlo: "financial_account_landing",
    standardizedDmo: "FinancialAccount",
    keyQualifier: "Primary key",
    identityRelevant: true,
    confidence: 0.98,
  }),
  mapping("fm-009", initiativeId, "src-core-banking", "so-core-acct", "ledger_bal", "dp-inst-financial-account", "current-balance", {
    transformations: [{ id: uid("tr"), kind: "currency-normalization", expression: "LEDGER_BAL / 100" }],
    notes: "Source stores minor units; converted to decimal currency.",
    conceptualDlo: "financial_account_landing",
    standardizedDmo: "FinancialAccount",
    confidence: 0.94,
  }),
  mapping("fm-010", initiativeId, "src-core-banking", "so-core-txn", "txn_ref", "dp-inst-financial-transaction", "transaction-id", {
    conceptualDlo: "transaction_landing",
    standardizedDmo: "FinancialTransaction",
    keyQualifier: "Primary key",
    confidence: 0.98,
  }),
  mapping("fm-011", initiativeId, "src-core-banking", "so-core-txn", "amt_minor", "dp-inst-financial-transaction", "amount", {
    transformations: [{ id: uid("tr"), kind: "currency-normalization", expression: "AMT_MINOR / 100" }],
    conceptualDlo: "transaction_landing",
    standardizedDmo: "FinancialTransaction",
    confidence: 0.94,
  }),
  mapping("fm-012", initiativeId, "src-core-banking", "so-core-loan", "loan_ref", "dp-inst-loan", "loan-id", {
    conceptualDlo: "loan_landing",
    standardizedDmo: "Loan",
    keyQualifier: "Primary key",
    confidence: 0.97,
  }),
  mapping("fm-013", initiativeId, "src-databricks", "so-databricks-fraud", "model_score", "dp-inst-fraud-alert", "risk-score", {
    conceptualDlo: "fraud_alert_landing",
    standardizedDmo: "FraudAlert",
    status: "proposed",
    aiSuggested: true,
    confidence: 0.79,
    testStatus: "not-run",
  }),
  mapping("fm-014", initiativeId, "src-sfdc", "so-sfdc-case", "casenumber", "dp-inst-case", "case-number", {
    conceptualDlo: "case_landing",
    standardizedDmo: "Case",
    confidence: 0.92,
  }),
  mapping("fm-015", initiativeId, "src-aws", "so-aws-events", "consent_flags", "dp-inst-consent", "consent-id", {
    status: "draft",
    testStatus: "not-run",
    notes: "Consent flag decomposition pending legal review of granular purposes.",
    conceptualDlo: "consent_landing",
    standardizedDmo: "Consent",
    confidence: 0.6,
  }),
];

const seedSuggestions = (initiativeId: string): DataAiSuggestion[] => [
  {
    id: "ai-sug-001",
    kind: "mapping",
    targetRef: "dp-inst-party:legal-name",
    title: "Map SFDC Account.Name to Party.legal_name",
    detail: "Salesforce person-account Name field appears to be a reliable secondary source for legal_name where core banking is missing.",
    rationale: "Field name and sample values (\"Amara Okafor\") pattern-match legal_name with 91% token similarity, and null rate on core banking CUST_NAME is 4.1% in the current profile.",
    confidence: 0.82,
    payload: {
      sourceSystemId: "src-sfdc",
      sourceObjectId: "so-sfdc-account",
      sourceFieldId: "name",
      targetProductId: "dp-inst-party",
      targetAttributeId: "legal-name",
    },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ai-sug-002",
    kind: "quality-rule",
    targetRef: "dp-inst-financial-account",
    title: "Add balance non-negativity check for savings accounts",
    detail: "Introduce a validity rule requiring LEDGER_BAL >= 0 for ACCT_TYPE_CD = 'SAV', with high severity.",
    rationale: "Historical profiling of ACCT_MASTER shows 0.3% of savings accounts posting negative ledger balances outside an approved overdraft product, indicating a data quality defect rather than a business condition.",
    confidence: 0.74,
    payload: {
      name: "Savings balance non-negativity",
      dimension: "validity",
      expression: "ACCT_TYPE_CD != 'SAV' OR LEDGER_BAL >= 0",
      threshold: 99.5,
      severity: "high",
    },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ai-sug-003",
    kind: "relationship",
    targetRef: "dp-inst-fraud-alert",
    title: "Link Fraud alert to Financial transaction",
    detail: "Add a relationship from Fraud alert to Financial transaction via the transaction reference field.",
    rationale: "80% of sampled fraud alert records carry a populated txn_ref that resolves to an existing transaction posting, suggesting a first-class relationship rather than a free-text reference.",
    confidence: 0.71,
    payload: {
      name: "Alert relates to transaction",
      targetProductId: "dp-inst-financial-transaction",
      cardinality: "M:1",
      description: "Fraud alert raised against a specific transaction posting.",
    },
    status: "pending",
    createdAt: now(),
  },
  {
    id: "ai-sug-004",
    kind: "mapping",
    targetRef: "dp-inst-consent:consent-id",
    title: "Map digital event consent_flags to Consent record",
    detail: "Decompose the consent_flags JSON payload from the digital event stream into discrete Consent records keyed by purpose.",
    rationale: "consent_flags carries structured marketing/servicing keys already aligned to the Consent product's purpose enumeration; a split transformation would remove the current manual reconciliation step.",
    confidence: 0.65,
    payload: {
      sourceSystemId: "src-aws",
      sourceObjectId: "so-aws-events",
      sourceFieldId: "consent_flags",
      targetProductId: "dp-inst-consent",
      targetAttributeId: "consent-id",
    },
    status: "pending",
    createdAt: now(),
  },
];

const seedStore = (): Phase3Store => {
  const products = [
    ...INSTANTIATED_TEMPLATE_IDS.map((templateId, index) => instantiate(templateId, CLIENT_NORTHSTAR, INITIATIVE_C360, index)),
    seedCustomProduct(CLIENT_NORTHSTAR, INITIATIVE_C360),
  ];
  return {
    products,
    mappings: seedMappings(INITIATIVE_C360),
    suggestions: seedSuggestions(INITIATIVE_C360),
  };
};

const emptyStore = (): Phase3Store => ({ products: [], mappings: [], suggestions: [] });

const baseStore = (simulation: boolean): Phase3Store => (simulation ? seedStore() : emptyStore());

const store: Phase3Store = createScopedStore<Phase3Store>((simulation) => {
  if (typeof window === "undefined") return baseStore(simulation);
  try {
    const raw = window.localStorage.getItem(scopedKey(STORE_KEY));
    if (!raw) return baseStore(simulation);
    const parsed = JSON.parse(raw) as Phase3Store;
    return { ...baseStore(simulation), ...parsed };
  } catch {
    return baseStore(simulation);
  }
});

const persist = () => {
  try {
    window.localStorage.setItem(scopedKey(STORE_KEY), JSON.stringify(store));
  } catch {
    /* storage unavailable — session-only state */
  }
};

export const resetPhase3Store = () => {
  const fresh = baseStore(isSimulationScope());
  for (const [key, value] of Object.entries(fresh)) {
    (store as Record<string, unknown>)[key] = value;
  }
  persist();
};


/* -------------------------------- products ---------------------------------- */

export const phase3Products = {
  listTemplates: () => delay(DATA_PRODUCT_TEMPLATES),
  getTemplate: (id: string) => delay(getTemplate(id)),
  list: (initiativeId: string) => delay(store.products.filter((product) => product.initiativeId === initiativeId)),
  get: (id: string) => delay(store.products.find((product) => product.id === id)),
  upsert: (product: DataProduct, actor: ActorLike) => {
    const exists = store.products.some((item) => item.id === product.id);
    const updated: DataProduct = { ...product, updatedAt: now(), updatedBy: actor.actor };
    store.products = exists
      ? store.products.map((item) => (item.id === product.id ? updated : item))
      : [...store.products, updated];
    persist();
    return delay(updated);
  },
  remove: (id: string) => {
    store.products = store.products.filter((product) => product.id !== id);
    store.mappings = store.mappings.filter((mapping) => mapping.targetProductId !== id);
    persist();
    return delay(true);
  },
  submitApproval: (productId: string, approverRole: RoleId, actor: ActorLike) => {
    const existing = store.products.find((product) => product.id === productId);
    if (!existing) return Promise.reject(new Error("Data product not found."));
    const approval: DataProductApproval = {
      id: uid("dpa"),
      requestedBy: actor.actor,
      requestedAt: now(),
      approverRole,
      state: "submitted",
    };
    const updated: DataProduct = {
      ...existing,
      state: "in-review",
      approvals: [approval, ...existing.approvals],
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    store.products = store.products.map((product) => (product.id === productId ? updated : product));
    persist();
    return delay(updated);
  },
  decideApproval: (productId: string, approvalId: string, approve: boolean, actor: ActorLike, comments?: string) => {
    const existing = store.products.find((product) => product.id === productId);
    if (!existing) return Promise.reject(new Error("Data product not found."));
    const approvals = existing.approvals.map((approval) =>
      approval.id === approvalId
        ? { ...approval, state: approve ? ("approved" as const) : ("rejected" as const), decidedAt: now(), decidedBy: actor.actor, comments }
        : approval,
    );
    const updated: DataProduct = {
      ...existing,
      approvals,
      state: approve ? "approved" : "draft",
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    store.products = store.products.map((product) => (product.id === productId ? updated : product));
    persist();
    return delay(updated);
  },
  publishVersion: (
    productId: string,
    input: { summary: string; changes: DataProductVersion["changes"] },
    actor: ActorLike,
  ) => {
    const existing = store.products.find((product) => product.id === productId);
    if (!existing) return Promise.reject(new Error("Data product not found."));
    const parts = existing.version.split(".").map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    const nextVersion = parts.join(".");
    const version: DataProductVersion = {
      id: uid("dpv"),
      version: nextVersion,
      state: "published",
      createdAt: now(),
      createdBy: actor.actor,
      summary: input.summary,
      changes: input.changes,
    };
    const updated: DataProduct = {
      ...existing,
      version: nextVersion,
      state: "published",
      versions: [version, ...existing.versions],
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    store.products = store.products.map((product) => (product.id === productId ? updated : product));
    persist();
    return delay(updated);
  },
};

/* -------------------------------- mappings ----------------------------------- */

export const phase3Mappings = {
  list: (initiativeId: string) => delay(store.mappings.filter((mapping) => mapping.initiativeId === initiativeId)),
  listForProduct: (productId: string) => delay(store.mappings.filter((mapping) => mapping.targetProductId === productId)),
  upsert: (mapping: FieldMapping) => {
    const exists = store.mappings.some((item) => item.id === mapping.id);
    const updated: FieldMapping = { ...mapping, updatedAt: now() };
    store.mappings = exists
      ? store.mappings.map((item) => (item.id === mapping.id ? updated : item))
      : [...store.mappings, updated];
    persist();
    return delay(updated);
  },
  updateStatus: (id: string, status: MappingStatus) => {
    const existing = store.mappings.find((item) => item.id === id);
    if (!existing) return Promise.reject(new Error("Mapping not found."));
    const updated: FieldMapping = { ...existing, status, updatedAt: now() };
    store.mappings = store.mappings.map((item) => (item.id === id ? updated : item));
    persist();
    return delay(updated);
  },
  remove: (id: string) => {
    store.mappings = store.mappings.filter((item) => item.id !== id);
    persist();
    return delay(true);
  },
};

/* ------------------------------ source catalog -------------------------------- */

export const phase3SourceCatalog = {
  listSystems: () => delay(SOURCE_SYSTEMS),
  listObjects: (systemId?: string) =>
    delay(systemId ? SOURCE_OBJECTS.filter((object) => object.systemId === systemId) : SOURCE_OBJECTS),
  getSystem: (id: string) => delay(getSourceSystem(id)),
  getObject: (id: string) => delay(getSourceObject(id)),
};

/* -------------------------------- AI suggestions ------------------------------- */

export const phase3Suggestions = {
  list: (initiativeId: string) => {
    void initiativeId;
    return delay(store.suggestions);
  },
  decide: (id: string, status: "accepted" | "edited" | "rejected", actor: ActorLike, editedPayload?: Record<string, unknown>) => {
    const existing = store.suggestions.find((suggestion) => suggestion.id === id);
    if (!existing) return Promise.reject(new Error("Suggestion not found."));
    const updated: DataAiSuggestion = {
      ...existing,
      status,
      decidedAt: now(),
      decidedBy: actor.actor,
      payload: editedPayload ?? existing.payload,
    };
    store.suggestions = store.suggestions.map((suggestion) => (suggestion.id === id ? updated : suggestion));
    persist();
    return delay(updated);
  },
};
