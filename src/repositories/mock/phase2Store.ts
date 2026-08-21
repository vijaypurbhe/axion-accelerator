import { STAGE_DEFINITIONS } from "@/data/lifecycleDefinitions";
import { COMPONENT_CATALOG } from "@/data/architectureCatalog";
import { INITIATIVE_C360 } from "@/data/bfsiSeed";
import type { LifecycleStageId } from "@/domain/types";
import type { ApprovalState, RoleId } from "@/domain/models";
import type {
  AdrRecord,
  ArchitectureApprovalRequest,
  ArchitectureApproverVote,
  ArchitectureRecommendationResult,
  AssessmentResponse,
  AxionRecommendation,
  BlueprintComponent,
  BlueprintConnection,
  RecommendationStatus,
  StageAdvancementRequest,
  StageComment,
  StageEvent,
  StageEventType,
  StageItem,
  StageWaiver,
} from "@/domain/phase2";

import { createScopedStore, isSimulationScope, scopedKey } from "./simulationScope";

const STORE_KEY = "axion.phase2.v1";
const LATENCY = 120;

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export interface ActorLike {
  readonly actor: string;
  readonly role: RoleId;
}

interface Phase2Store {
  items: StageItem[];
  comments: StageComment[];
  events: StageEvent[];
  waivers: StageWaiver[];
  advancements: StageAdvancementRequest[];
  responses: Record<string, Record<string, AssessmentResponse>>;
  recommendations: AxionRecommendation[];
  components: BlueprintComponent[];
  connections: BlueprintConnection[];
  adrs: AdrRecord[];
  approvals: ArchitectureApprovalRequest[];
  blueprintVersion: Record<string, number>;
}

/* --------------------------------- seeding --------------------------------- */

const seedItemsFor = (initiativeId: string): StageItem[] => {
  const items: StageItem[] = [];
  STAGE_DEFINITIONS.forEach((definition, stageIndex) => {
    const offset = stageIndex * 21;
    const push = (
      kind: StageItem["kind"],
      label: string,
      mandatory: boolean,
      owner: RoleId,
      dueOffset: number,
      status: StageItem["status"],
      extra?: Partial<StageItem>,
    ) => {
      items.push({
        id: `si-${definition.stage}-${kind}-${items.length}`,
        initiativeId,
        stage: definition.stage,
        kind,
        label,
        mandatory,
        owner,
        dueDate: daysFromNow(offset + dueOffset - 40),
        status,
        ...extra,
      });
    };

    const done = stageIndex === 0;
    const partial = stageIndex === 1;
    definition.mandatoryTasks.forEach((task, index) =>
      push(
        "task",
        task,
        true,
        definition.approvers[index % definition.approvers.length],
        index * 4,
        done ? "complete" : partial && index === 0 ? "complete" : partial && index === 1 ? "in-progress" : "not-started",
      ),
    );
    definition.optionalTasks.forEach((task, index) =>
      push("task", task, false, definition.approvers[0], 6 + index * 3, done ? "complete" : "not-started"),
    );
    definition.deliverables.forEach((deliverable, index) =>
      push(
        "deliverable",
        deliverable,
        true,
        definition.approvers[index % definition.approvers.length],
        8 + index * 3,
        done ? "complete" : "not-started",
      ),
    );
    definition.exitCriteria.forEach((criterion, index) =>
      push(
        "exit-criterion",
        criterion.label,
        criterion.mandatory,
        definition.approvers[index % definition.approvers.length],
        12 + index * 2,
        done ? "complete" : partial && index === 0 ? "in-progress" : "not-started",
        partial && index === 1
          ? { status: "blocked", blockerReason: "Core banking change-data feasibility spike not yet scheduled." }
          : undefined,
      ),
    );
  });
  return items;
};

const seedResponses = (): Record<string, AssessmentResponse> => {
  const base = (questionId: string, patch: Partial<AssessmentResponse>): AssessmentResponse => ({
    questionId,
    updatedAt: now(),
    updatedBy: "seed@techmahindra.com",
    ...patch,
  });
  return {
    "q-001": base("q-001", { choice: "managed", evidenceName: "NorthStar_Programme_Charter.pdf" }),
    "q-002": base("q-002", { choices: ["onboarding", "servicing", "relationship"] }),
    "q-003": base("q-003", { numeric: 6 }),
    "q-005": base("q-005", { choice: "defined", evidenceName: "Data_Catalogue_Extract.xlsx" }),
    "q-006": base("q-006", { choice: "partial", comment: "Party-to-account modelled; party-to-party partial." }),
    "q-008": base("q-008", { choice: "partial", evidenceName: "Core_Banking_Interface_Notes.md" }),
    "q-009": base("q-009", { choices: ["salesforce", "core-banking", "snowflake"] }),
    "q-011": base("q-011", { choice: "adhoc" }),
    "q-013": base("q-013", { choice: "defined", evidenceName: "DQ_Profile_Report.pdf" }),
    "q-014": base("q-014", { numeric: 78, evidenceName: "KYC_Completeness.csv" }),
    "q-016": base("q-016", { choice: "adhoc" }),
    "q-017": base("q-017", { choices: ["party-id", "account", "email"] }),
    "q-019": base("q-019", { choice: "defined", evidenceName: "Governance_Charter.pdf" }),
    "q-022": base("q-022", { choices: ["glba", "ccpa", "aml"], evidenceName: "Reg_Obligations_Register.xlsx" }),
    "q-026": base("q-026", { choice: "defined" }),
    "q-028": base("q-028", { choice: "adhoc" }),
    "q-032": base("q-032", { choice: "defined" }),
    "q-034": base("q-034", { choice: "adhoc" }),
  };
};

const seedComponents = (initiativeId: string): BlueprintComponent[] => {
  const pick = (catalogId: string, patch: Partial<BlueprintComponent>): BlueprintComponent => {
    const catalog = COMPONENT_CATALOG.find((component) => component.id === catalogId);
    return {
      id: `bc-seed-${catalogId}`,
      initiativeId,
      catalogId,
      name: catalog?.name ?? catalogId,
      kind: catalog?.kind ?? "logical-service",
      platform: catalog?.platform ?? "Salesforce",
      layer: catalog?.defaultLayer ?? "connectivity",
      purpose: catalog?.purpose ?? "",
      dataDomain: "Party & Household",
      integrationPattern: "physical",
      securityClassification: "confidential",
      owner: "enterprise-architect",
      dependencies: [],
      status: "live",
      assumptions: [],
      risks: [],
      decisionIds: [],
      view: "current",
      physical: true,
      controls: ["Encryption at rest"],
      aiSuggested: false,
      acceptance: "accepted",
      ...patch,
    };
  };
  return [
    pick("src-core-banking", { status: "live", dataDomain: "Accounts & Arrangements", owner: "data-engineer" }),
    pick("src-salesforce", { status: "live", dataDomain: "Customer & Case", owner: "data360-architect" }),
    pick("src-snowflake", { status: "live", integrationPattern: "zero-copy", dataDomain: "Transactions", owner: "data-engineer" }),
    pick("sfdc-data-360", { status: "in-build", layer: "harmonization", integrationPattern: "none", owner: "data360-architect" }),
    pick("svc-identity-resolution", {
      status: "proposed",
      layer: "identity",
      integrationPattern: "none",
      physical: false,
      securityClassification: "regulated-pii",
      owner: "data-steward",
      risks: ["Household rules not yet ratified by governance forum"],
      view: "target",
    }),
    pick("sfdc-fsc", { status: "live", layer: "activation", integrationPattern: "none", owner: "data360-architect" }),
  ];
};

const seedAdrs = (initiativeId: string): AdrRecord[] => [
  {
    id: "adr-001",
    initiativeId,
    reference: "ADR-001",
    title: "Use zero-copy access for Snowflake transaction history",
    status: "approved",
    context:
      "Transaction history exceeds 4 billion rows with a 7-year retention obligation. Full physical replication into Data 360 would breach storage allocation and delay onboarding of priority domains.",
    options: [
      { title: "Physical ingestion", pros: "Simplest operational model", cons: "Storage cost and refresh latency" },
      { title: "Zero-copy access", pros: "No duplication, always current", cons: "Federated query concurrency limits" },
      { title: "Cached acceleration", pros: "Predictable latency", cons: "Additional cache governance overhead" },
    ],
    recommendation: "Adopt zero-copy access with cached acceleration for the 90-day rolling window.",
    rationale: "Balances storage constraints against banker-facing latency expectations in the servicing console.",
    consequences:
      "Federated query limits must be monitored; Snowflake warehouse sizing becomes a shared dependency with the analytics team.",
    risks: ["Concurrency throttling at peak", "Cross-team warehouse cost attribution"],
    approvers: [
      { role: "enterprise-architect", required: true, state: "approved", decidedAt: now() },
      { role: "data360-architect", required: true, state: "approved", decidedAt: now() },
    ],
    componentIds: ["bc-seed-src-snowflake"],
    connectivityDecision: "Zero-copy with 90-day cached acceleration",
    effectiveDate: now(),
    attachments: ["Snowflake_Volumetrics.xlsx"],
    version: 2,
    createdAt: now(),
    updatedAt: now(),
    createdBy: "seed@techmahindra.com",
  },
  {
    id: "adr-002",
    initiativeId,
    reference: "ADR-002",
    title: "Household construction rule set for retail and wealth customers",
    status: "proposed",
    context:
      "Household rollups drive banker relationship views and agent grounding. Retail and wealth lines of business apply conflicting definitions today.",
    options: [
      { title: "Address-based households", pros: "High coverage", cons: "False positives in multi-tenant addresses" },
      { title: "Relationship-declared households", pros: "High precision", cons: "Low coverage without banker input" },
      { title: "Hybrid with confidence threshold", pros: "Balanced precision and coverage", cons: "Requires dispute workflow" },
    ],
    recommendation: "Adopt the hybrid rule set with a stewardship dispute workflow.",
    rationale: "Only the hybrid approach satisfies both wealth advisory precision needs and retail coverage targets.",
    consequences: "Requires a data steward dispute queue and quarterly rule review.",
    risks: ["Disputed rollups visible to customers", "Rule drift without review cadence"],
    approvers: [
      { role: "data-steward", required: true, state: "pending" },
      { role: "data360-architect", required: true, state: "pending" },
      { role: "executive-sponsor", required: false, state: "pending" },
    ],
    componentIds: ["bc-seed-svc-identity-resolution"],
    effectiveDate: daysFromNow(14),
    attachments: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
    createdBy: "seed@techmahindra.com",
  },
];

const seedStore = (): Phase2Store => ({
  items: seedItemsFor(INITIATIVE_C360),
  comments: [
    {
      id: "sc-001",
      initiativeId: INITIATIVE_C360,
      stage: "assess",
      author: "priya.nair@techmahindra.com",
      role: "data-steward",
      body: "KYC completeness is 78%. We need a remediation plan before the Assess gate can be cleared.",
      timestamp: now(),
    },
  ],
  events: [
    {
      id: "se-001",
      initiativeId: INITIATIVE_C360,
      stage: "discover",
      type: "stage-entered",
      actor: "seed@techmahindra.com",
      role: "enterprise-architect",
      note: "Discovery workshops completed and gate approved.",
      timestamp: now(),
    },
  ],
  waivers: [],
  advancements: [],
  responses: { [INITIATIVE_C360]: seedResponses() },
  recommendations: [],
  components: seedComponents(INITIATIVE_C360),
  connections: [
    {
      id: "bcx-seed-1",
      initiativeId: INITIATIVE_C360,
      fromId: "bc-seed-src-core-banking",
      toId: "bc-seed-sfdc-data-360",
      label: "physical",
      pattern: "physical",
      aiSuggested: false,
    },
    {
      id: "bcx-seed-2",
      initiativeId: INITIATIVE_C360,
      fromId: "bc-seed-src-snowflake",
      toId: "bc-seed-sfdc-data-360",
      label: "zero-copy",
      pattern: "zero-copy",
      aiSuggested: false,
    },
    {
      id: "bcx-seed-3",
      initiativeId: INITIATIVE_C360,
      fromId: "bc-seed-sfdc-data-360",
      toId: "bc-seed-svc-identity-resolution",
      label: "resolves",
      pattern: "none",
      aiSuggested: false,
    },
    {
      id: "bcx-seed-4",
      initiativeId: INITIATIVE_C360,
      fromId: "bc-seed-svc-identity-resolution",
      toId: "bc-seed-sfdc-fsc",
      label: "publishes to",
      pattern: "none",
      aiSuggested: false,
    },
  ],
  adrs: seedAdrs(INITIATIVE_C360),
  approvals: [],
  blueprintVersion: { [INITIATIVE_C360]: 3 },
});

const emptyStore = (): Phase2Store => ({
  items: [],
  comments: [],
  events: [],
  waivers: [],
  advancements: [],
  responses: {},
  recommendations: [],
  components: [],
  connections: [],
  adrs: [],
  approvals: [],
  blueprintVersion: {},
});

const baseStore = (simulation: boolean): Phase2Store => (simulation ? seedStore() : emptyStore());

const store: Phase2Store = createScopedStore<Phase2Store>((simulation) => {
  if (typeof window === "undefined") return baseStore(simulation);
  try {
    const raw = window.localStorage.getItem(scopedKey(STORE_KEY));
    if (!raw) return baseStore(simulation);
    return { ...baseStore(simulation), ...(JSON.parse(raw) as Phase2Store) };
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

export const resetPhase2Store = () => {
  const fresh = baseStore(isSimulationScope());
  for (const [key, value] of Object.entries(fresh)) {
    (store as Record<string, unknown>)[key] = value;
  }
  persist();
};


const ensureItems = (initiativeId: string) => {
  if (!store.items.some((item) => item.initiativeId === initiativeId)) {
    store.items = [...store.items, ...seedItemsFor(initiativeId)];
    persist();
  }
};

const addEvent = (
  initiativeId: string,
  stage: LifecycleStageId,
  type: StageEventType,
  actor: ActorLike,
  note?: string,
) => {
  const event: StageEvent = {
    id: uid("se"),
    initiativeId,
    stage,
    type,
    actor: actor.actor,
    role: actor.role,
    note,
    timestamp: now(),
  };
  store.events = [event, ...store.events];
  persist();
  return event;
};

/* ------------------------------- lifecycle API ------------------------------ */

export const phase2Lifecycle = {
  listItems: (initiativeId: string) => {
    ensureItems(initiativeId);
    return delay(store.items.filter((item) => item.initiativeId === initiativeId));
  },
  updateItem: (initiativeId: string, itemId: string, patch: Partial<StageItem>, actor: ActorLike) => {
    const existing = store.items.find((item) => item.id === itemId);
    if (!existing) return Promise.reject(new Error("Stage item not found."));
    const updated: StageItem = { ...existing, ...patch };
    store.items = store.items.map((item) => (item.id === itemId ? updated : item));
    persist();
    addEvent(initiativeId, updated.stage, "item-updated", actor, `${updated.label} → ${updated.status}`);
    return delay(updated);
  },
  listComments: (initiativeId: string) =>
    delay(store.comments.filter((comment) => comment.initiativeId === initiativeId)),
  addComment: (initiativeId: string, stage: LifecycleStageId, body: string, actor: ActorLike) => {
    const comment: StageComment = {
      id: uid("sc"),
      initiativeId,
      stage,
      author: actor.actor,
      role: actor.role,
      body,
      timestamp: now(),
    };
    store.comments = [comment, ...store.comments];
    persist();
    return delay(comment);
  },
  listEvents: (initiativeId: string) => delay(store.events.filter((event) => event.initiativeId === initiativeId)),
  listWaivers: (initiativeId: string) => delay(store.waivers.filter((waiver) => waiver.initiativeId === initiativeId)),
  requestWaiver: (
    initiativeId: string,
    input: { stage: LifecycleStageId; itemId: string; justification: string },
    actor: ActorLike,
  ) => {
    const waiver: StageWaiver = {
      id: uid("sw"),
      initiativeId,
      stage: input.stage,
      itemId: input.itemId,
      justification: input.justification,
      requestedBy: actor.actor,
      requestedRole: actor.role,
      state: "requested",
      createdAt: now(),
    };
    store.waivers = [waiver, ...store.waivers];
    persist();
    addEvent(initiativeId, input.stage, "waiver-requested", actor, input.justification);
    return delay(waiver);
  },
  decideWaiver: (waiverId: string, approve: boolean, actor: ActorLike) => {
    const existing = store.waivers.find((waiver) => waiver.id === waiverId);
    if (!existing) return Promise.reject(new Error("Waiver not found."));
    const updated: StageWaiver = {
      ...existing,
      state: approve ? "approved" : "rejected",
      decidedBy: actor.actor,
      decidedAt: now(),
    };
    store.waivers = store.waivers.map((waiver) => (waiver.id === waiverId ? updated : waiver));
    if (approve) {
      store.items = store.items.map((item) => (item.id === existing.itemId ? { ...item, status: "waived" } : item));
    }
    persist();
    addEvent(
      existing.initiativeId,
      existing.stage,
      approve ? "waiver-approved" : "waiver-rejected",
      actor,
      existing.justification,
    );
    return delay(updated);
  },
  listAdvancements: (initiativeId: string) =>
    delay(store.advancements.filter((request) => request.initiativeId === initiativeId)),
  requestAdvance: (
    initiativeId: string,
    input: {
      fromStage: LifecycleStageId;
      toStage: LifecycleStageId;
      approvers: readonly RoleId[];
      mode: "sequential" | "parallel";
      note?: string;
    },
    actor: ActorLike,
  ) => {
    const request: StageAdvancementRequest = {
      id: uid("sar"),
      initiativeId,
      fromStage: input.fromStage,
      toStage: input.toStage,
      mode: input.mode,
      requestedBy: actor.actor,
      requestedRole: actor.role,
      note: input.note,
      state: "submitted",
      approvals: input.approvers.map((role, index) => ({
        role,
        required: index < 2,
        state: "pending" as const,
      })),
      createdAt: now(),
    };
    store.advancements = [request, ...store.advancements];
    persist();
    addEvent(initiativeId, input.fromStage, "advance-requested", actor, `${input.fromStage} → ${input.toStage}`);
    return delay(request);
  },
  decideAdvance: (requestId: string, approve: boolean, comment: string | undefined, actor: ActorLike) => {
    const existing = store.advancements.find((request) => request.id === requestId);
    if (!existing) return Promise.reject(new Error("Advancement request not found."));

    const approvals: ArchitectureApproverVote[] = existing.approvals.map((vote) =>
      vote.role === actor.role
        ? { ...vote, state: approve ? "approved" : "rejected", comment, decidedAt: now() }
        : vote,
    );
    const rejected = approvals.some((vote) => vote.state === "rejected");
    const requiredApproved = approvals.filter((vote) => vote.required).every((vote) => vote.state === "approved");
    const state: ApprovalState = rejected ? "rejected" : requiredApproved ? "approved" : "submitted";

    const updated: StageAdvancementRequest = {
      ...existing,
      approvals,
      state,
      decidedAt: state === "submitted" ? undefined : now(),
    };
    store.advancements = store.advancements.map((request) => (request.id === requestId ? updated : request));
    persist();
    addEvent(
      existing.initiativeId,
      existing.fromStage,
      approve ? "advance-approved" : "advance-rejected",
      actor,
      comment,
    );
    if (state === "approved") addEvent(existing.initiativeId, existing.toStage, "stage-entered", actor);
    return delay(updated);
  },
};

/* ------------------------------- assessment API ----------------------------- */

export const phase2Assessment = {
  getResponses: (initiativeId: string) => delay(store.responses[initiativeId] ?? {}),
  saveResponse: (initiativeId: string, response: AssessmentResponse) => {
    const current = store.responses[initiativeId] ?? {};
    store.responses = { ...store.responses, [initiativeId]: { ...current, [response.questionId]: response } };
    persist();
    return delay(response);
  },
  clear: (initiativeId: string) => {
    store.responses = { ...store.responses, [initiativeId]: {} };
    persist();
    return delay(true);
  },
};

/* ---------------------------- recommendations API --------------------------- */

export const phase2Recommendations = {
  list: (initiativeId: string) =>
    delay(store.recommendations.filter((recommendation) => recommendation.initiativeId === initiativeId)),
  replaceGenerated: (
    initiativeId: string,
    source: AxionRecommendation["source"],
    drafts: readonly Omit<AxionRecommendation, "id" | "createdAt" | "status">[],
  ) => {
    const decided = store.recommendations.filter(
      (recommendation) =>
        recommendation.initiativeId !== initiativeId ||
        recommendation.source !== source ||
        recommendation.status !== "pending",
    );
    const created: AxionRecommendation[] = drafts.map((draft) => ({
      ...draft,
      id: uid("rec"),
      status: "pending",
      createdAt: now(),
    }));
    store.recommendations = [...created, ...decided];
    persist();
    return delay(created);
  },
  decide: (
    recommendationId: string,
    status: Exclude<RecommendationStatus, "pending">,
    actor: ActorLike,
    editedText?: string,
  ) => {
    const existing = store.recommendations.find((recommendation) => recommendation.id === recommendationId);
    if (!existing) return Promise.reject(new Error("Recommendation not found."));
    const updated: AxionRecommendation = {
      ...existing,
      status,
      editedText: editedText ?? existing.editedText,
      decidedBy: actor.actor,
      decidedAt: now(),
    };
    store.recommendations = store.recommendations.map((recommendation) =>
      recommendation.id === recommendationId ? updated : recommendation,
    );
    persist();
    return delay(updated);
  },
};

/* ----------------------------- architecture API ----------------------------- */

const bumpVersion = (initiativeId: string) => {
  store.blueprintVersion = {
    ...store.blueprintVersion,
    [initiativeId]: (store.blueprintVersion[initiativeId] ?? 1) + 1,
  };
};

export const phase2Architecture = {
  getBlueprint: (initiativeId: string) =>
    delay({
      initiativeId,
      version: store.blueprintVersion[initiativeId] ?? 1,
      components: store.components.filter((component) => component.initiativeId === initiativeId),
      connections: store.connections.filter((connection) => connection.initiativeId === initiativeId),
    }),

  upsertComponent: (component: BlueprintComponent) => {
    const exists = store.components.some((entry) => entry.id === component.id);
    store.components = exists
      ? store.components.map((entry) => (entry.id === component.id ? component : entry))
      : [...store.components, component];
    bumpVersion(component.initiativeId);
    persist();
    return delay(component);
  },

  removeComponent: (initiativeId: string, componentId: string) => {
    store.components = store.components.filter((component) => component.id !== componentId);
    store.connections = store.connections.filter(
      (connection) => connection.fromId !== componentId && connection.toId !== componentId,
    );
    bumpVersion(initiativeId);
    persist();
    return delay(true);
  },

  decideComponent: (componentId: string, acceptance: Exclude<RecommendationStatus, "pending">) => {
    const existing = store.components.find((component) => component.id === componentId);
    if (!existing) return Promise.reject(new Error("Component not found."));
    const updated: BlueprintComponent = {
      ...existing,
      acceptance,
      status: acceptance === "rejected" ? "rejected" : existing.status === "proposed" ? "approved" : existing.status,
    };
    store.components = store.components.map((component) => (component.id === componentId ? updated : component));
    bumpVersion(existing.initiativeId);
    persist();
    return delay(updated);
  },

  addConnection: (connection: BlueprintConnection) => {
    store.connections = [...store.connections, connection];
    bumpVersion(connection.initiativeId);
    persist();
    return delay(connection);
  },

  removeConnection: (initiativeId: string, connectionId: string) => {
    store.connections = store.connections.filter((connection) => connection.id !== connectionId);
    bumpVersion(initiativeId);
    persist();
    return delay(true);
  },

  applyRecommendation: (initiativeId: string, result: ArchitectureRecommendationResult) => {
    /** Regeneration replaces previously generated, still-pending suggestions only. */
    store.components = [
      ...store.components.filter(
        (component) =>
          component.initiativeId !== initiativeId || !component.aiSuggested || component.acceptance !== "pending",
      ),
      ...result.components,
    ];
    store.connections = [
      ...store.connections.filter(
        (connection) => connection.initiativeId !== initiativeId || !connection.aiSuggested,
      ),
      ...result.connections,
    ];
    bumpVersion(initiativeId);
    persist();
    return delay(result);
  },

  listAdrs: (initiativeId: string) => delay(store.adrs.filter((adr) => adr.initiativeId === initiativeId)),

  upsertAdr: (adr: AdrRecord) => {
    const exists = store.adrs.some((entry) => entry.id === adr.id);
    store.adrs = exists ? store.adrs.map((entry) => (entry.id === adr.id ? adr : entry)) : [adr, ...store.adrs];
    persist();
    return delay(adr);
  },

  decideAdr: (adrId: string, approve: boolean, comment: string | undefined, actor: ActorLike) => {
    const existing = store.adrs.find((adr) => adr.id === adrId);
    if (!existing) return Promise.reject(new Error("Decision record not found."));
    const approvers = existing.approvers.map((vote) =>
      vote.role === actor.role
        ? { ...vote, state: approve ? ("approved" as const) : ("rejected" as const), comment, decidedAt: now() }
        : vote,
    );
    const rejected = approvers.some((vote) => vote.state === "rejected");
    const requiredApproved = approvers.filter((vote) => vote.required).every((vote) => vote.state === "approved");
    const updated: AdrRecord = {
      ...existing,
      approvers,
      status: rejected ? "rejected" : requiredApproved ? "approved" : "proposed",
      version: existing.version + 1,
      updatedAt: now(),
    };
    store.adrs = store.adrs.map((adr) => (adr.id === adrId ? updated : adr));
    persist();
    return delay(updated);
  },

  supersedeAdr: (adrId: string, replacement: AdrRecord) => {
    store.adrs = store.adrs.map((adr) => (adr.id === adrId ? { ...adr, status: "superseded" as const } : adr));
    store.adrs = [{ ...replacement, supersedesId: adrId }, ...store.adrs];
    persist();
    return delay(replacement);
  },

  listApprovalRequests: (initiativeId: string) =>
    delay(store.approvals.filter((request) => request.initiativeId === initiativeId)),

  submitApproval: (
    initiativeId: string,
    input: { approvers: readonly RoleId[]; mode: "sequential" | "parallel"; note?: string },
    actor: ActorLike,
  ) => {
    const request: ArchitectureApprovalRequest = {
      id: uid("aar"),
      initiativeId,
      blueprintVersion: store.blueprintVersion[initiativeId] ?? 1,
      mode: input.mode,
      approvers: input.approvers.map((role, index) => ({
        role,
        required: role !== "executive-sponsor",
        state: "pending" as const,
        comment: undefined,
        decidedAt: undefined,
        ...(index === -1 ? {} : {}),
      })),
      state: "submitted",
      submittedBy: actor.actor,
      note: input.note,
      createdAt: now(),
    };
    store.approvals = [request, ...store.approvals];
    persist();
    return delay(request);
  },

  voteApproval: (requestId: string, approve: boolean, comment: string | undefined, actor: ActorLike) => {
    const existing = store.approvals.find((request) => request.id === requestId);
    if (!existing) return Promise.reject(new Error("Approval request not found."));
    const approvers = existing.approvers.map((vote) =>
      vote.role === actor.role
        ? { ...vote, state: approve ? ("approved" as const) : ("rejected" as const), comment, decidedAt: now() }
        : vote,
    );
    const rejected = approvers.some((vote) => vote.state === "rejected");
    const requiredApproved = approvers.filter((vote) => vote.required).every((vote) => vote.state === "approved");
    const state: ApprovalState = rejected ? "rejected" : requiredApproved ? "approved" : "submitted";
    const updated: ArchitectureApprovalRequest = {
      ...existing,
      approvers,
      state,
      decidedAt: state === "submitted" ? undefined : now(),
    };
    store.approvals = store.approvals.map((request) => (request.id === requestId ? updated : request));
    if (state === "approved") {
      store.components = store.components.map((component) =>
        component.initiativeId === existing.initiativeId && component.status === "proposed" && component.acceptance !== "rejected"
          ? { ...component, status: "approved" as const }
          : component,
      );
    }
    persist();
    return delay(updated);
  },
};
