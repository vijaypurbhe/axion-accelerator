import { CLIENT_NORTHSTAR, INITIATIVE_C360 } from "@/data/bfsiSeed";
import { seedApplicabilityProfile, seedGovernanceBodies, seedRaci, seedRisks } from "@/data/governanceSeed";
import { APPLICABILITY_FACTORS, CONTROL_LIBRARY, controlById } from "@/data/trustControlLibrary";
import { evaluateApplicability } from "@/services/trustEngine";
import type { RoleId } from "@/domain/models";
import type {
  ApplicabilityProfile,
  ControlInstance,
  ControlTest,
  EvidenceRecord,
  GovernanceBody,
  RaciEntry,
  RiskEntry,
  TrustGateWaiver,
} from "@/domain/phase5";
import type { LifecycleStageId } from "@/domain/types";

/** Phase 5 mock persistence. Mirrors the Phase 2/3/4 store pattern so a live adapter can replace it. */

import { isSimulationScope, scopedKey } from "./simulationScope";

const STORE_KEY = "axion.phase5.v1";
const LATENCY = 110;

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export interface ActorLike {
  readonly actor: string;
  readonly role: RoleId;
}

interface Phase5Store {
  instances: ControlInstance[];
  profiles: ApplicabilityProfile[];
  evidence: EvidenceRecord[];
  tests: ControlTest[];
  bodies: GovernanceBody[];
  raci: RaciEntry[];
  risks: RiskEntry[];
  waivers: TrustGateWaiver[];
}

const DESIGN_BY_ID: Record<string, ControlInstance["designStatus"]> = {
  "TLC-001": "approved",
  "TLC-002": "implemented",
  "TLC-003": "implemented",
  "TLC-004": "in-progress",
  "TLC-005": "deficient",
  "TLC-006": "in-progress",
  "TLC-007": "implemented",
  "TLC-008": "planned",
  "TLC-009": "tested",
  "TLC-010": "implemented",
  "TLC-011": "tested",
  "TLC-012": "planned",
  "TLC-013": "in-progress",
  "TLC-014": "planned",
  "TLC-015": "implemented",
  "TLC-016": "in-progress",
  "TLC-017": "planned",
  "TLC-019": "deficient",
  "TLC-022": "implemented",
  "TLC-024": "in-progress",
};

const OPERATING_BY_ID: Record<string, ControlInstance["operatingStatus"]> = {
  "TLC-001": "tested",
  "TLC-002": "implemented",
  "TLC-003": "tested",
  "TLC-005": "deficient",
  "TLC-009": "tested",
  "TLC-011": "tested",
  "TLC-015": "implemented",
  "TLC-019": "deficient",
  "TLC-022": "implemented",
};

const RESIDUAL_BY_ID: Record<string, ControlInstance["residualRisk"]> = {
  "TLC-005": "high",
  "TLC-008": "high",
  "TLC-014": "high",
  "TLC-016": "high",
  "TLC-019": "high",
  "TLC-006": "medium",
  "TLC-013": "medium",
};

const seedInstances = (): ControlInstance[] => {
  const suggestions = evaluateApplicability(seedApplicabilityProfile());
  return suggestions.map((suggestion, index) => {
    const definition = controlById(suggestion.controlId)!;
    // Leave a slice pending so the applicability review queue is demonstrable.
    const applicability = index % 7 === 6 ? "pending" : "accepted";
    return {
      id: `ci-${definition.id.toLowerCase()}`,
      initiativeId: INITIATIVE_C360,
      controlId: definition.id,
      applicability,
      origin: suggestion.origin,
      confidence: suggestion.confidence,
      rationale: suggestion.rationale,
      designStatus: applicability === "pending" ? "not-assessed" : DESIGN_BY_ID[definition.id] ?? "planned",
      operatingStatus: applicability === "pending" ? "not-assessed" : OPERATING_BY_ID[definition.id] ?? "not-assessed",
      residualRisk: RESIDUAL_BY_ID[definition.id] ?? "low",
      controlOwner: definition.controlOwner,
      implementationOwner: definition.implementationOwner,
      reviewer: definition.reviewer,
      exceptions: [],
      remediationActions:
        definition.id === "TLC-005"
          ? [
              {
                id: "rem-tlc005",
                description: "Publish product-terms grounding source and enable citation enforcement.",
                owner: "agentforce-architect",
                dueDate: addDays(21),
                status: "in-progress",
              },
            ]
          : definition.id === "TLC-019"
            ? [
                {
                  id: "rem-tlc019",
                  description: "Resolve consent attributes onto the party identity graph.",
                  owner: "data360-architect",
                  dueDate: addDays(14),
                  status: "open",
                },
              ]
            : [],
      decidedBy: applicability === "accepted" ? "seed" : undefined,
      decidedAt: applicability === "accepted" ? now() : undefined,
      createdAt: now(),
      updatedAt: now(),
      updatedBy: "seed",
    } satisfies ControlInstance;
  });
};

const seedEvidence = (): EvidenceRecord[] => [
  {
    id: "ev-001",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-001",
    type: "policy",
    title: "Northstar data classification standard v4.2",
    description: "Enterprise classification scheme applied to Data 360 DLOs and DMOs.",
    attachmentName: "classification-standard-v4.2.pdf",
    referenceUrl: "https://intranet.northstar.example/standards/classification",
    owner: "data-steward",
    collectedOn: addDays(-40),
    validUntil: addDays(320),
    reviewer: "enterprise-architect",
    reviewOutcome: "accepted",
    comments: "Applies to all customer data domains.",
    version: 2,
    status: "accepted",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-002",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-001",
    type: "configuration-screenshot",
    title: "DMO field tagging — Party and Financial Account",
    description: "Field-level classification tags for the two critical data products.",
    attachmentName: "dmo-tagging.png",
    owner: "data-engineer",
    collectedOn: addDays(-18),
    validUntil: addDays(72),
    reviewer: "data-steward",
    reviewOutcome: "accepted",
    version: 1,
    status: "accepted",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-003",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-002",
    type: "configuration-screenshot",
    title: "Shield platform encryption policy export",
    description: "Encrypted field inventory for regulated attributes.",
    attachmentName: "shield-policy.csv",
    owner: "data-engineer",
    collectedOn: addDays(-60),
    validUntil: addDays(30),
    reviewer: "data360-architect",
    reviewOutcome: "accepted",
    version: 1,
    status: "accepted",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-004",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-003",
    type: "approval-record",
    title: "Q2 access recertification sign-off",
    description: "Entitlement recertification for profile access across personas.",
    owner: "enterprise-architect",
    collectedOn: addDays(-95),
    validUntil: addDays(-5),
    reviewer: "data-steward",
    reviewOutcome: "accepted",
    comments: "Superseded by Q3 cycle — renewal outstanding.",
    version: 1,
    status: "expired",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-005",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-009",
    type: "architecture-artifact",
    title: "Audit event schema and retention configuration",
    description: "Event taxonomy spanning ingestion, resolution, activation and agent decisions.",
    owner: "data-engineer",
    collectedOn: addDays(-25),
    validUntil: addDays(155),
    reviewer: "executive-sponsor",
    reviewOutcome: "accepted",
    version: 3,
    status: "accepted",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-006",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-006",
    type: "test-result",
    title: "Prompt injection red-team run R3",
    description: "Injection, jailbreak and exfiltration suite against release candidate 3.",
    attachmentName: "redteam-r3.json",
    owner: "agentforce-architect",
    collectedOn: addDays(-6),
    validUntil: addDays(84),
    reviewer: "enterprise-architect",
    version: 1,
    status: "under-review",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-007",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-015",
    type: "test-result",
    title: "Weekly data quality run — week 29",
    description: "Completeness, validity and timeliness results for critical data products.",
    owner: "data-steward",
    collectedOn: addDays(-4),
    validUntil: addDays(24),
    reviewer: "data360-architect",
    reviewOutcome: "accepted",
    version: 1,
    status: "accepted",
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ev-008",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-022",
    type: "third-party-report",
    title: "Enrichment provider SOC 2 Type II",
    description: "Supplier assurance report for the external enrichment feed.",
    owner: "enterprise-architect",
    collectedOn: addDays(-200),
    validUntil: addDays(20),
    reviewer: "data-steward",
    reviewOutcome: "accepted",
    version: 1,
    status: "accepted",
    updatedAt: now(),
    updatedBy: "seed",
  },
];

const seedTests = (): ControlTest[] => [
  {
    id: "ct-001",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-001",
    procedure: controlById("TLC-001")!.testingProcedure,
    testOwner: "data-steward",
    sample: "15 DMO attributes across Party, Financial Account and Consent",
    expectedResult: "All sampled attributes carry an approved classification with matching downstream handling.",
    observedResult: "15 of 15 attributes correctly classified.",
    outcome: "pass",
    approver: "enterprise-architect",
    approvalState: "approved",
    scheduledFor: addDays(-20),
    executedOn: addDays(-18),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ct-002",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-005",
    procedure: controlById("TLC-005")!.testingProcedure,
    testOwner: "agentforce-architect",
    sample: "25 servicing conversations from the pilot cohort",
    expectedResult: "Every substantive answer carries a resolvable citation to an approved grounding source.",
    observedResult: "6 of 25 answers on product fees had no citation; product-terms source not yet published.",
    outcome: "fail",
    deficiency: "Grounding source register incomplete for product terms; citations absent on fee questions.",
    deficiencySeverity: "high",
    remediation: "Publish product-terms grounding source and enable citation enforcement before pilot expansion.",
    retestDate: addDays(18),
    approver: "enterprise-architect",
    approvalState: "submitted",
    scheduledFor: addDays(-9),
    executedOn: addDays(-7),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ct-003",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-019",
    procedure: controlById("TLC-019")!.testingProcedure,
    testOwner: "data360-architect",
    sample: "40 opted-out customers across three activation targets",
    expectedResult: "No opted-out customer appears in any activation target or outreach topic.",
    observedResult: "3 opted-out customers present in the lifecycle marketing segment after profile resolution.",
    outcome: "fail",
    deficiency: "Consent attributes not resolved onto the unified identity graph.",
    deficiencySeverity: "critical",
    remediation: "Re-key consent resolution and add suppression assertions to the activation test pack.",
    retestDate: addDays(12),
    approver: "executive-sponsor",
    approvalState: "submitted",
    scheduledFor: addDays(-14),
    executedOn: addDays(-12),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ct-004",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-003",
    procedure: controlById("TLC-003")!.testingProcedure,
    testOwner: "enterprise-architect",
    sample: "5 users per persona across 6 personas",
    expectedResult: "Effective access matches the approved entitlement matrix.",
    observedResult: "All sampled users matched the matrix; shared integration principal noted as an observation.",
    outcome: "pass",
    approver: "data-steward",
    approvalState: "approved",
    scheduledFor: addDays(-30),
    executedOn: addDays(-29),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ct-005",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-016",
    procedure: controlById("TLC-016")!.testingProcedure,
    testOwner: "data-steward",
    sample: "Latest identity simulation run over the BFSI party record set",
    expectedResult: "Match precision at or above 92% with all critical exceptions dispositioned.",
    outcome: "not-started",
    approver: "enterprise-architect",
    approvalState: "draft",
    scheduledFor: addDays(9),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ct-006",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-006",
    procedure: controlById("TLC-006")!.testingProcedure,
    testOwner: "agentforce-architect",
    sample: "Injection suite v4 — 180 adversarial prompts",
    expectedResult: "Zero critical findings open at release.",
    outcome: "in-progress",
    approver: "enterprise-architect",
    approvalState: "draft",
    scheduledFor: addDays(4),
    updatedAt: now(),
    updatedBy: "seed",
  },
  {
    id: "ct-007",
    initiativeId: INITIATIVE_C360,
    controlId: "TLC-009",
    procedure: controlById("TLC-009")!.testingProcedure,
    testOwner: "data-engineer",
    sample: "3 end-to-end scenarios traced from source to agent outcome",
    expectedResult: "Each scenario fully reconstructable from audit data.",
    observedResult: "All three scenarios reconstructed successfully.",
    outcome: "pass",
    approver: "executive-sponsor",
    approvalState: "approved",
    scheduledFor: addDays(-40),
    executedOn: addDays(-38),
    updatedAt: now(),
    updatedBy: "seed",
  },
];

const createSeed = (): Phase5Store => ({
  instances: seedInstances(),
  profiles: [seedApplicabilityProfile()],
  evidence: seedEvidence(),
  tests: seedTests(),
  bodies: seedGovernanceBodies(),
  raci: seedRaci(),
  risks: seedRisks(),
  waivers: [],
});

/** Blank questionnaire answers for delivery workspaces. */
const emptyAnswers = (): ApplicabilityProfile["answers"] =>
  Object.fromEntries(
    APPLICABILITY_FACTORS.map((factor) => [factor.id, [] as readonly string[]]),
  ) as unknown as ApplicabilityProfile["answers"];

const createEmpty = (): Phase5Store => ({
  instances: [],
  profiles: [],
  evidence: [],
  tests: [],
  bodies: [],
  raci: [],
  risks: [],
  waivers: [],
});

const baseStore = (): Phase5Store => (isSimulationScope() ? createSeed() : createEmpty());

let store: Phase5Store | null = null;
let storeScope: boolean | null = null;

const persist = () => {
  if (typeof window === "undefined" || !store) return;
  try {
    window.localStorage.setItem(scopedKey(STORE_KEY), JSON.stringify(store));
  } catch {
    /* storage unavailable — in-memory only */
  }
};

const read = (): Phase5Store => {
  const simulation = isSimulationScope();
  if (store && storeScope === simulation) return store;
  storeScope = simulation;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(scopedKey(STORE_KEY));
      if (raw) {
        store = JSON.parse(raw) as Phase5Store;
        return store;
      }
    } catch {
      /* fall through to seed */
    }
  }
  store = baseStore();
  persist();
  return store;
};

export const resetPhase5Store = () => {
  storeScope = isSimulationScope();
  store = baseStore();
  persist();
};


const touch = <T extends { updatedAt: string; updatedBy: string }>(value: T, actor: ActorLike): T => ({
  ...value,
  updatedAt: now(),
  updatedBy: actor.actor,
});

/* ================================= Controls ================================== */

export const phase5Controls = {
  listInstances: (initiativeId: string) => delay(read().instances.filter((i) => i.initiativeId === initiativeId)),

  getProfile: (initiativeId: string) => {
    const db = read();
    const existing = db.profiles.find((p) => p.initiativeId === initiativeId);
    if (existing) return delay(existing);
    const created: ApplicabilityProfile = {
      ...(isSimulationScope() ? seedApplicabilityProfile() : { answers: emptyAnswers() }),
      initiativeId,
      updatedAt: now(),
      updatedBy: "system",
    };

    db.profiles.push(created);
    persist();
    return delay(created);
  },

  saveProfile: (profile: ApplicabilityProfile, actor: ActorLike) => {
    const db = read();
    const next: ApplicabilityProfile = { ...profile, updatedAt: now(), updatedBy: actor.actor };
    const index = db.profiles.findIndex((p) => p.initiativeId === profile.initiativeId);
    if (index >= 0) db.profiles[index] = next;
    else db.profiles.push(next);
    persist();
    return delay(next);
  },

  /** Creates instances for suggestions that have no instance yet; existing decisions are preserved. */
  syncSuggestions: (
    initiativeId: string,
    suggestions: readonly { controlId: string; origin: ControlInstance["origin"]; confidence: number; rationale: string }[],
  ) => {
    const db = read();
    for (const suggestion of suggestions) {
      if (db.instances.some((i) => i.initiativeId === initiativeId && i.controlId === suggestion.controlId)) continue;
      const definition = controlById(suggestion.controlId);
      if (!definition) continue;
      db.instances.push({
        id: uid("ci"),
        initiativeId,
        controlId: definition.id,
        applicability: "pending",
        origin: suggestion.origin,
        confidence: suggestion.confidence,
        rationale: suggestion.rationale,
        designStatus: "not-assessed",
        operatingStatus: "not-assessed",
        residualRisk: "medium",
        controlOwner: definition.controlOwner,
        implementationOwner: definition.implementationOwner,
        reviewer: definition.reviewer,
        exceptions: [],
        remediationActions: [],
        createdAt: now(),
        updatedAt: now(),
        updatedBy: "system",
      });
    }
    persist();
    return delay(db.instances.filter((i) => i.initiativeId === initiativeId));
  },

  updateInstance: (id: string, patch: Partial<ControlInstance>, actor: ActorLike) => {
    const db = read();
    const index = db.instances.findIndex((i) => i.id === id);
    if (index < 0) return Promise.reject(new Error(`Control instance ${id} not found`));
    db.instances[index] = touch({ ...db.instances[index], ...patch }, actor);
    persist();
    return delay(db.instances[index]);
  },

  addException: (id: string, exception: ControlInstance["exceptions"][number], actor: ActorLike) => {
    const db = read();
    const index = db.instances.findIndex((i) => i.id === id);
    if (index < 0) return Promise.reject(new Error(`Control instance ${id} not found`));
    db.instances[index] = touch(
      { ...db.instances[index], exceptions: [...db.instances[index].exceptions, exception] },
      actor,
    );
    persist();
    return delay(db.instances[index]);
  },
};

/* ================================= Evidence ================================== */

export const phase5Evidence = {
  list: (initiativeId: string) => delay(read().evidence.filter((e) => e.initiativeId === initiativeId)),

  create: (input: Omit<EvidenceRecord, "id" | "version" | "updatedAt" | "updatedBy">, actor: ActorLike) => {
    const db = read();
    const record: EvidenceRecord = { ...input, id: uid("ev"), version: 1, updatedAt: now(), updatedBy: actor.actor };
    db.evidence.push(record);
    persist();
    return delay(record);
  },

  update: (id: string, patch: Partial<EvidenceRecord>, actor: ActorLike) => {
    const db = read();
    const index = db.evidence.findIndex((e) => e.id === id);
    if (index < 0) return Promise.reject(new Error(`Evidence ${id} not found`));
    db.evidence[index] = touch({ ...db.evidence[index], ...patch, version: db.evidence[index].version + 1 }, actor);
    persist();
    return delay(db.evidence[index]);
  },
};

/* ================================== Testing ================================== */

export const phase5Tests = {
  list: (initiativeId: string) => delay(read().tests.filter((t) => t.initiativeId === initiativeId)),

  create: (input: Omit<ControlTest, "id" | "updatedAt" | "updatedBy">, actor: ActorLike) => {
    const db = read();
    const test: ControlTest = { ...input, id: uid("ct"), updatedAt: now(), updatedBy: actor.actor };
    db.tests.push(test);
    persist();
    return delay(test);
  },

  update: (id: string, patch: Partial<ControlTest>, actor: ActorLike) => {
    const db = read();
    const index = db.tests.findIndex((t) => t.id === id);
    if (index < 0) return Promise.reject(new Error(`Control test ${id} not found`));
    db.tests[index] = touch({ ...db.tests[index], ...patch }, actor);
    persist();
    return delay(db.tests[index]);
  },
};

/* ================================ Governance ================================= */

export const phase5Governance = {
  listBodies: (clientId: string) =>
    delay(read().bodies.filter((b) => b.clientId === clientId || b.clientId === CLIENT_NORTHSTAR)),

  saveBody: (body: GovernanceBody, actor: ActorLike) => {
    const db = read();
    const index = db.bodies.findIndex((b) => b.id === body.id);
    const next = touch(body, actor);
    if (index >= 0) db.bodies[index] = next;
    else db.bodies.push({ ...next, id: next.id || uid("gb") });
    persist();
    return delay(next);
  },

  createBody: (input: Omit<GovernanceBody, "id" | "updatedAt" | "updatedBy">, actor: ActorLike) => {
    const db = read();
    const body: GovernanceBody = { ...input, id: uid("gb"), updatedAt: now(), updatedBy: actor.actor };
    db.bodies.push(body);
    persist();
    return delay(body);
  },

  listRaci: (clientId: string) =>
    delay(read().raci.filter((r) => r.clientId === clientId || r.clientId === CLIENT_NORTHSTAR)),

  saveRaci: (entry: RaciEntry, actor: ActorLike) => {
    const db = read();
    const index = db.raci.findIndex((r) => r.id === entry.id);
    const next = touch(entry, actor);
    if (index >= 0) db.raci[index] = next;
    else db.raci.push(next);
    persist();
    return delay(next);
  },
};

/* ================================== Risks ==================================== */

export const phase5Risks = {
  list: (initiativeId: string) => delay(read().risks.filter((r) => r.initiativeId === initiativeId)),

  create: (input: Omit<RiskEntry, "id" | "reference" | "createdAt" | "updatedAt" | "updatedBy">, actor: ActorLike) => {
    const db = read();
    const reference = `RSK-${String(db.risks.length + 1).padStart(3, "0")}`;
    const risk: RiskEntry = {
      ...input,
      id: uid("risk"),
      reference,
      createdAt: now(),
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    db.risks.push(risk);
    persist();
    return delay(risk);
  },

  update: (id: string, patch: Partial<RiskEntry>, actor: ActorLike) => {
    const db = read();
    const index = db.risks.findIndex((r) => r.id === id);
    if (index < 0) return Promise.reject(new Error(`Risk ${id} not found`));
    db.risks[index] = touch({ ...db.risks[index], ...patch }, actor);
    persist();
    return delay(db.risks[index]);
  },
};

/* ============================== Gate waivers ================================= */

export const phase5Waivers = {
  list: (initiativeId: string) => delay(read().waivers.filter((w) => w.initiativeId === initiativeId)),

  request: (
    input: {
      initiativeId: string;
      stage: LifecycleStageId;
      blockerId: string;
      justification: string;
      expiresOn: string;
    },
    actor: ActorLike,
  ) => {
    const db = read();
    const waiver: TrustGateWaiver = {
      ...input,
      id: uid("wv"),
      requestedBy: actor.actor,
      requestedRole: actor.role,
      state: "requested",
      createdAt: now(),
    };
    db.waivers.push(waiver);
    persist();
    return delay(waiver);
  },

  decide: (id: string, state: "approved" | "rejected", actor: ActorLike) => {
    const db = read();
    const index = db.waivers.findIndex((w) => w.id === id);
    if (index < 0) return Promise.reject(new Error(`Waiver ${id} not found`));
    db.waivers[index] = { ...db.waivers[index], state, decidedBy: actor.actor, decidedAt: now() };
    persist();
    return delay(db.waivers[index]);
  },
};

export const CONTROL_LIBRARY_SIZE = CONTROL_LIBRARY.length;
