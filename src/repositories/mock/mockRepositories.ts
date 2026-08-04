import { config } from "@/config";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import type {
  ActivityLog,
  Approval,
  ApprovalState,
  Artifact,
  Client,
  Initiative,
  NewClientInput,
  NewInitiativeInput,
  Notification,
  RoleId,
} from "@/domain/models";
import {
  seedActivity,
  seedAgentDesigns,
  seedApprovals,
  seedArtifacts,
  seedAssessmentScores,
  seedClients,
  seedComments,
  seedConnections,
  seedDataProducts,
  seedDecisions,
  seedInitiatives,
  seedMilestones,
  seedNotifications,
  seedRisks,
  seedStageTasks,
  seedTemplates,
  seedUsers,
} from "@/data/bfsiSeed";
import type { ActorContext, IntegrationAdapter } from "../contracts";

const LATENCY = 140;
const STORE_KEY = "axion.workspace.v1";

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

interface Store {
  clients: Client[];
  initiatives: Initiative[];
  approvals: Approval[];
  activity: ActivityLog[];
  artifacts: Artifact[];
  notifications: Notification[];
  currentUserId: string | null;
}

const seedStore = (): Store => ({
  clients: structuredClone(seedClients),
  initiatives: structuredClone(seedInitiatives),
  approvals: structuredClone(seedApprovals),
  activity: structuredClone(seedActivity),
  artifacts: structuredClone(seedArtifacts),
  notifications: structuredClone(seedNotifications),
  currentUserId: null,
});

const load = (): Store => {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return seedStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { ...seedStore(), ...parsed };
  } catch {
    return seedStore();
  }
};

let store: Store = load();

const persist = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — session-only state */
  }
};

export const resetWorkspaceStore = () => {
  store = seedStore();
  persist();
};

const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

const provenance = (actor: ActorContext) => ({
  createdAt: now(),
  createdBy: actor.actor,
  updatedAt: now(),
  updatedBy: actor.actor,
});

const appendActivity = (entry: Omit<ActivityLog, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "timestamp">) => {
  const record: ActivityLog = {
    ...entry,
    id: id("act"),
    createdAt: now(),
    createdBy: entry.actor,
    updatedAt: now(),
    updatedBy: entry.actor,
    timestamp: now(),
  };
  store.activity = [record, ...store.activity];
  persist();
  return record;
};

export const mockIntegrationAdapter: IntegrationAdapter = {
  kind: "mock",

  auth: {
    currentUser: () => delay(seedUsers.find((u) => u.id === store.currentUserId) ?? null),
    signIn: ({ email, role }) => {
      const template = seedUsers.find((u) => u.role === role) ?? seedUsers[0];
      const user = { ...template, email: email || template.email };
      store.currentUserId = template.id;
      persist();
      return delay(user);
    },
    signOut: () => {
      store.currentUserId = null;
      persist();
      return delay(undefined);
    },
    switchRole: (role: RoleId) => {
      const next = seedUsers.find((u) => u.role === role) ?? null;
      store.currentUserId = next?.id ?? null;
      persist();
      return delay(next);
    },
    listDemoUsers: () => delay(seedUsers),
  },

  workspaces: {
    listClients: () => delay(store.clients.filter((c) => c.status !== "archived")),
    getClient: (clientId) => delay(store.clients.find((c) => c.id === clientId) ?? null),
    createClient: (input: NewClientInput, actor) => {
      const client: Client = {
        ...input,
        ...provenance(actor),
        id: id("cli"),
        tenantId: "",
        status: "active",
        brandingAccent: "#E23125",
        version: 1,
      };
      const withTenant: Client = { ...client, tenantId: client.id };
      store.clients = [...store.clients, withTenant];
      persist();
      appendActivity({
        tenantId: withTenant.id,
        clientId: withTenant.id,
        actor: actor.actor,
        role: actor.role,
        action: "workspace.created",
        objectType: "client",
        objectId: withTenant.id,
        newValueSummary: withTenant.name,
        status: "Client workspace created",
      });
      return delay(withTenant);
    },
    listUsers: (clientId) => delay(seedUsers.map((u) => ({ ...u, tenantId: clientId }))),
  },

  initiatives: {
    listByClient: (clientId) => delay(store.initiatives.filter((i) => i.clientId === clientId)),
    listAll: () => delay(store.initiatives),
    get: (initiativeId) => delay(store.initiatives.find((i) => i.id === initiativeId) ?? null),

    create: (input: NewInitiativeInput, actor) => {
      const record: Initiative = {
        id: id("ini"),
        tenantId: input.clientId,
        clientId: input.clientId,
        ...provenance(actor),
        name: input.name,
        description: input.description,
        businessObjective: input.businessObjective,
        primaryDomain: input.primaryDomain,
        useCases: input.useCases,
        currentStage: "discover",
        owners: [{ role: actor.role, userId: actor.userId }],
        startDate: now(),
        targetDate: input.targetDate,
        riskLevel: input.riskLevel,
        readinessScore: 0,
        approvalStatus: "draft",
        activeRelease: "R0.1",
        status: "planning",
        version: 1,
      };
      store.initiatives = [...store.initiatives, record];
      persist();
      appendActivity({
        tenantId: record.tenantId,
        clientId: record.clientId,
        initiativeId: record.id,
        actor: actor.actor,
        role: actor.role,
        action: "initiative.created",
        objectType: "initiative",
        objectId: record.id,
        newValueSummary: record.name,
        status: "Initiative created",
      });
      return delay(record);
    },

    update: (initiativeId, patch, actor) => {
      const existing = store.initiatives.find((i) => i.id === initiativeId);
      if (!existing) return Promise.reject(new Error("Initiative not found."));
      const updated: Initiative = {
        ...existing,
        ...patch,
        updatedAt: now(),
        updatedBy: actor.actor,
        version: (existing.version ?? 1) + 1,
      };
      store.initiatives = store.initiatives.map((i) => (i.id === initiativeId ? updated : i));
      persist();
      appendActivity({
        tenantId: updated.tenantId,
        clientId: updated.clientId,
        initiativeId: updated.id,
        actor: actor.actor,
        role: actor.role,
        action: "initiative.updated",
        objectType: "initiative",
        objectId: updated.id,
        oldValueSummary: `v${existing.version ?? 1}`,
        newValueSummary: `v${updated.version ?? 1}`,
        status: "Initiative updated",
      });
      return delay(updated);
    },

    archive: (initiativeId, actor) =>
      mockIntegrationAdapter.initiatives.update(initiativeId, { status: "archived" }, actor),

    setStage: (initiativeId, stage, actor) => {
      const existing = store.initiatives.find((i) => i.id === initiativeId);
      if (!existing) return Promise.reject(new Error("Initiative not found."));
      const updated: Initiative = {
        ...existing,
        currentStage: stage,
        updatedAt: now(),
        updatedBy: actor.actor,
        version: (existing.version ?? 1) + 1,
      };
      store.initiatives = store.initiatives.map((i) => (i.id === initiativeId ? updated : i));
      persist();
      appendActivity({
        tenantId: updated.tenantId,
        clientId: updated.clientId,
        initiativeId: updated.id,
        actor: actor.actor,
        role: actor.role,
        action: "stage.changed",
        objectType: "initiative",
        objectId: updated.id,
        oldValueSummary: existing.currentStage,
        newValueSummary: stage,
        status: "Lifecycle stage changed",
      });
      return delay(updated);
    },

    cloneFromTemplate: (templateId, input, actor) =>
      mockIntegrationAdapter.initiatives.create(input, actor).then((created) => {
        appendActivity({
          tenantId: created.tenantId,
          clientId: created.clientId,
          initiativeId: created.id,
          actor: actor.actor,
          role: actor.role,
          action: "initiative.cloned",
          objectType: "template",
          objectId: templateId,
          newValueSummary: created.name,
          status: "Initiative cloned from template",
        });
        return created;
      }),

    listTasks: (initiativeId) => delay(seedStageTasks.filter((t) => t.initiativeId === initiativeId)),
    listMilestones: (initiativeId) => delay(seedMilestones.filter((m) => m.initiativeId === initiativeId)),
    listRisks: (initiativeId) =>
      delay(initiativeId ? seedRisks.filter((r) => r.initiativeId === initiativeId) : seedRisks),
    listApprovals: (initiativeId) =>
      delay(initiativeId ? store.approvals.filter((a) => a.initiativeId === initiativeId) : store.approvals),

    decideApproval: (approvalId, state: ApprovalState, actor, notes) => {
      const existing = store.approvals.find((a) => a.id === approvalId);
      if (!existing) return Promise.reject(new Error("Approval not found."));
      const updated: Approval = {
        ...existing,
        state,
        status: state,
        notes,
        decidedAt: now(),
        updatedAt: now(),
        updatedBy: actor.actor,
      };
      store.approvals = store.approvals.map((a) => (a.id === approvalId ? updated : a));
      persist();
      appendActivity({
        tenantId: updated.tenantId,
        initiativeId: updated.initiativeId,
        actor: actor.actor,
        role: actor.role,
        action: "approval.completed",
        objectType: updated.objectType,
        objectId: updated.objectId,
        oldValueSummary: existing.state,
        newValueSummary: state,
        status: `Approval ${state}`,
      });
      return delay(updated);
    },

    listComments: (initiativeId) => delay(seedComments.filter((c) => c.initiativeId === initiativeId)),
  },

  assessments: {
    listScores: (initiativeId) => delay(seedAssessmentScores.filter((s) => s.initiativeId === initiativeId)),
  },

  dataProducts: {
    listByInitiative: (initiativeId) => delay(seedDataProducts.filter((d) => d.initiativeId === initiativeId)),
    listConnections: (initiativeId) => delay(seedConnections.filter((c) => c.initiativeId === initiativeId)),
  },

  architecture: {
    listDecisions: (initiativeId) => delay(seedDecisions.filter((d) => d.initiativeId === initiativeId)),
    listAgentDesigns: (initiativeId) => delay(seedAgentDesigns.filter((a) => a.initiativeId === initiativeId)),
  },

  audit: {
    list: ({ clientId, initiativeId, limit = 50 }) => {
      let rows = [...store.activity];
      if (clientId) rows = rows.filter((r) => r.tenantId === clientId || r.clientId === clientId);
      if (initiativeId) rows = rows.filter((r) => r.initiativeId === initiativeId);
      rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return delay(rows.slice(0, limit));
    },
    record: (entry) => delay(appendActivity(entry)),
  },

  exports: {
    listArtifacts: (initiativeId) => delay(store.artifacts.filter((a) => a.initiativeId === initiativeId)),
    generate: (initiativeId, input, actor) => {
      const initiative = store.initiatives.find((i) => i.id === initiativeId);
      const record: Artifact = {
        ...input,
        ...provenance(actor),
        id: id("art"),
        tenantId: initiative?.tenantId ?? initiativeId,
        initiativeId,
        generatedBy: actor.role,
        status: "generated",
        version: 1,
      };
      store.artifacts = [record, ...store.artifacts];
      persist();
      appendActivity({
        tenantId: record.tenantId,
        initiativeId,
        actor: actor.actor,
        role: actor.role,
        action: "artifact.generated",
        objectType: "artifact",
        objectId: record.id,
        newValueSummary: `${record.name} (${record.format})`,
        status: "Artifact generated",
      });
      return delay(record);
    },
  },

  recommendations: {
    listPending: (clientId) =>
      delay(
        [
          {
            id: "rec-1",
            title: "Sequence Household 360 after Party 360 baseline",
            rationale:
              "Household grouping depends on resolved party identifiers; sequencing avoids rework in the grouping rules.",
            confidence: 0.79,
            stage: "design",
          },
          {
            id: "rec-2",
            title: "Use cached acceleration for the 90-day transaction window",
            rationale:
              "Banker assist latency targets are not met by pure federation at current lakehouse volumes.",
            confidence: 0.66,
            stage: "design",
          },
        ].filter(() => Boolean(clientId)),
      ),
  },

  templates: {
    list: () => delay(seedTemplates),
  },

  notifications: {
    list: (clientId) => delay(store.notifications.filter((n) => n.tenantId === clientId)),
    markAllRead: (clientId) => {
      store.notifications = store.notifications.map((n) =>
        n.tenantId === clientId ? { ...n, read: true, status: "read" } : n,
      );
      persist();
      return delay(store.notifications.filter((n) => n.tenantId === clientId));
    },
  },
};

/** REST adapter placeholder — wired by environment configuration in a later phase. */
export const restIntegrationAdapter: IntegrationAdapter = new Proxy({} as IntegrationAdapter, {
  get: () => {
    throw new Error(
      `Live REST adapter is not implemented yet. Configure VITE_AXION_API_BASE_URL and implement restIntegrationAdapter (base: ${config.apiBaseUrl ?? "unset"}).`,
    );
  },
});

export const LIFECYCLE_ORDER = LIFECYCLE_STAGES.map((s) => s.id);
