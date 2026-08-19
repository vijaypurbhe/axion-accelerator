import { supabase } from "@/integrations/supabase/client";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import type { Json } from "@/integrations/supabase/types";
import type {
  ActivityLog,
  AgentDesign,
  Approval,
  ApprovalState,
  ArchitectureDecision,
  Artifact,
  AssessmentScore,
  Client,
  Comment,
  DataProduct,
  Initiative,
  IntegrationConnection,
  Milestone,
  NewClientInput,
  NewInitiativeInput,
  Notification,
  RiskItem,
  StageTask,
  Template,
  User,
} from "@/domain/models";
import {
  seedActivity,
  seedAgentDesigns,
  seedApprovals,
  seedArtifacts,
  seedAssessmentScores,
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

/**
 * Server-backed persistence for the Phase 1 workspace.
 * Clients live in `public.clients`; every other workspace object is one row in
 * `public.workspace_records`, typed by `kind` and scoped to a client workspace.
 * Row-level security limits every read and write to workspaces the signed-in
 * user is an active member of, so tenant isolation is enforced by the database.
 */

type Kind =
  | "initiative"
  | "stage_task"
  | "milestone"
  | "risk"
  | "approval"
  | "comment"
  | "notification"
  | "artifact"
  | "template"
  | "assessment_score"
  | "data_product"
  | "connection"
  | "decision"
  | "agent_design";

interface RecordRow {
  id: string;
  client_id: string;
  initiative_id: string | null;
  kind: string;
  data: Json;
  created_at: string;
  updated_at: string;
}

const fail = (context: string, error: { message: string } | null): never => {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
};

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const toRecord = <T,>(row: RecordRow): T => ({ ...(row.data as object), id: row.id }) as T;

const provenance = (actor: ActorContext) => ({
  createdAt: now(),
  createdBy: actor.actor,
  updatedAt: now(),
  updatedBy: actor.actor,
});

const insertRecord = async <T extends { id: string }>(
  kind: Kind,
  clientId: string,
  initiativeId: string | null,
  record: T,
  actor?: ActorContext,
  isSeed = false,
): Promise<T> => {
  const { error } = await supabase.from("workspace_records").insert({
    id: record.id,
    client_id: clientId,
    initiative_id: initiativeId,
    kind,
    data: record as unknown as Json,
    is_seed: isSeed,
    created_by: actor?.actor ?? "seed",
    updated_by: actor?.actor ?? "seed",
  });
  if (error) fail(`Could not save ${kind}`, error);
  return record;
};

const listRecords = async <T,>(
  kind: Kind,
  filter: { clientId?: string; initiativeId?: string },
): Promise<T[]> => {
  let query = supabase.from("workspace_records").select("*").eq("kind", kind);
  if (filter.clientId) query = query.eq("client_id", filter.clientId);
  if (filter.initiativeId) query = query.eq("initiative_id", filter.initiativeId);
  const { data, error } = await query;
  if (error) fail(`Could not load ${kind} records`, error);
  return ((data ?? []) as RecordRow[]).map((row) => toRecord<T>(row));
};

const getRecord = async <T,>(kind: Kind, id: string): Promise<T | null> => {
  const { data, error } = await supabase
    .from("workspace_records")
    .select("*")
    .eq("kind", kind)
    .eq("id", id)
    .maybeSingle();
  if (error) fail(`Could not load ${kind}`, error);
  return data ? toRecord<T>(data as RecordRow) : null;
};

const updateRecord = async <T extends { id: string }>(
  kind: Kind,
  record: T,
  actor: ActorContext,
): Promise<T> => {
  const { error } = await supabase
    .from("workspace_records")
    .update({ data: record as unknown as Json, updated_by: actor.actor })
    .eq("kind", kind)
    .eq("id", record.id);
  if (error) fail(`Could not update ${kind}`, error);
  return record;
};

/* --------------------------------- clients -------------------------------- */

const clientFromRow = (row: Record<string, unknown>): Client => ({
  id: String(row.id),
  tenantId: String(row.id),
  name: String(row.name),
  industry: String(row.industry) as Client["industry"],
  subsegments: (row.subsegments as string[] | null) ?? [],
  geography: String(row.geography ?? ""),
  jurisdictions: (row.jurisdictions as string[] | null) ?? [],
  accountOwner: String(row.account_owner ?? ""),
  executiveSponsor: String(row.executive_sponsor ?? ""),
  description: String(row.description ?? ""),
  brandingAccent: String(row.branding_accent ?? "#E23125"),
  status: String(row.status ?? "active") as Client["status"],
  createdAt: String(row.created_at),
  createdBy: String(row.created_by ?? ""),
  updatedAt: String(row.updated_at),
  updatedBy: String(row.created_by ?? ""),
  version: 1,
});

/* --------------------------- one-time demo seeding -------------------------- */

const seededClients = new Set<string>();

/**
 * Demo workspaces open with the BFSI walkthrough content. Seeding runs once per
 * client workspace and is idempotent: a marker record is written first, so a
 * second browser or tab does not duplicate rows.
 */
const ensureSeeded = async (clientId: string): Promise<void> => {
  if (seededClients.has(clientId)) return;
  seededClients.add(clientId);

  const { data: marker } = await supabase
    .from("workspace_records")
    .select("id")
    .eq("id", `seed-marker-${clientId}`)
    .maybeSingle();
  if (marker) return;

  const { error: markerError } = await supabase.from("workspace_records").insert({
    id: `seed-marker-${clientId}`,
    client_id: clientId,
    kind: "seed_marker",
    data: { seededAt: now() } as unknown as Json,
    is_seed: true,
  });
  if (markerError) return; /* another session seeded first */

  const byClient = <T extends { tenantId: string }>(rows: readonly T[]) =>
    rows.filter((row) => row.tenantId === clientId);
  const initiativesForClient = seedInitiatives.filter((i) => i.clientId === clientId);
  const initiativeIds = new Set(initiativesForClient.map((i) => i.id));
  const forInitiatives = <T extends { initiativeId: string }>(rows: readonly T[]) =>
    rows.filter((row) => initiativeIds.has(row.initiativeId));

  const payload: {
    id: string;
    client_id: string;
    initiative_id: string | null;
    kind: Kind;
    data: Json;
    is_seed: boolean;
  }[] = [];

  const push = (kind: Kind, rows: readonly { id: string }[], initiativeOf?: (row: never) => string | null) => {
    rows.forEach((row) => {
      payload.push({
        id: row.id,
        client_id: clientId,
        initiative_id: initiativeOf ? initiativeOf(row as never) : null,
        kind,
        data: row as unknown as Json,
        is_seed: true,
      });
    });
  };

  const initiativeKey = (row: { initiativeId: string }) => row.initiativeId;

  push("initiative", initiativesForClient, (row: Initiative) => row.id);
  push("stage_task", forInitiatives(seedStageTasks), initiativeKey as never);
  push("milestone", forInitiatives(seedMilestones), initiativeKey as never);
  push("risk", forInitiatives(seedRisks), initiativeKey as never);
  push("approval", forInitiatives(seedApprovals), initiativeKey as never);
  push("comment", forInitiatives(seedComments), initiativeKey as never);
  push("artifact", forInitiatives(seedArtifacts), initiativeKey as never);
  push("assessment_score", forInitiatives(seedAssessmentScores), initiativeKey as never);
  push("data_product", forInitiatives(seedDataProducts), initiativeKey as never);
  push("connection", forInitiatives(seedConnections), initiativeKey as never);
  push("decision", forInitiatives(seedDecisions), initiativeKey as never);
  push("agent_design", forInitiatives(seedAgentDesigns), initiativeKey as never);
  push("notification", byClient(seedNotifications));
  push("template", seedTemplates);

  if (payload.length > 0) {
    await supabase.from("workspace_records").insert(payload);
  }

  const activityRows = byClient(seedActivity).map((entry) => ({
    tenant_id: clientId,
    initiative_id: entry.initiativeId ?? null,
    actor: entry.actor,
    role: entry.role,
    action: entry.action,
    object_type: entry.objectType,
    object_id: entry.objectId,
    summary: entry.status,
    old_value_summary: entry.oldValueSummary ?? null,
    new_value_summary: entry.newValueSummary ?? null,
  }));
  if (activityRows.length > 0) {
    await supabase.from("activity_log").insert(activityRows);
  }
};

/* ------------------------------- audit trail ------------------------------- */

const activityFromRow = (row: Record<string, unknown>): ActivityLog => ({
  id: String(row.id),
  tenantId: String(row.tenant_id),
  clientId: String(row.tenant_id),
  initiativeId: (row.initiative_id as string | null) ?? undefined,
  actor: String(row.actor),
  role: String(row.role) as ActivityLog["role"],
  action: String(row.action),
  objectType: String(row.object_type),
  objectId: String(row.object_id),
  oldValueSummary: (row.old_value_summary as string | null) ?? undefined,
  newValueSummary: (row.new_value_summary as string | null) ?? undefined,
  status: String(row.summary ?? ""),
  timestamp: String(row.created_at),
  createdAt: String(row.created_at),
  createdBy: String(row.actor),
  updatedAt: String(row.created_at),
  updatedBy: String(row.actor),
});

const recordActivity = async (
  entry: Omit<ActivityLog, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "timestamp">,
): Promise<ActivityLog> => {
  const { data, error } = await supabase
    .from("activity_log")
    .insert({
      tenant_id: entry.tenantId,
      initiative_id: entry.initiativeId ?? null,
      actor: entry.actor,
      role: entry.role,
      action: entry.action,
      object_type: entry.objectType,
      object_id: entry.objectId,
      summary: entry.status,
      old_value_summary: entry.oldValueSummary ?? null,
      new_value_summary: entry.newValueSummary ?? null,
    })
    .select()
    .maybeSingle();
  if (error || !data) fail("Could not write the audit entry", error);
  return activityFromRow(data as Record<string, unknown>);
};

/* -------------------------------- adapter --------------------------------- */

export const supabaseIntegrationAdapter: IntegrationAdapter = {
  kind: "rest",

  auth: {
    /** Identity is owned by AxionContext / Lovable Cloud auth, not this adapter. */
    currentUser: async () => null,
    signIn: async () => {
      throw new Error("Sign-in is handled by the authentication provider, not the workspace adapter.");
    },
    signOut: async () => undefined,
    switchRole: async () => null,
    listDemoUsers: async () => seedUsers,
  },

  workspaces: {
    listClients: async () => {
      const { data, error } = await supabase.from("clients").select("*").neq("status", "archived");
      if (error) fail("Could not load client workspaces", error);
      const clients = ((data ?? []) as Record<string, unknown>[]).map(clientFromRow);
      await Promise.all(clients.map((client) => ensureSeeded(client.id)));
      return clients;
    },
    getClient: async (clientId) => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
      if (error) fail("Could not load the client workspace", error);
      return data ? clientFromRow(data as Record<string, unknown>) : null;
    },
    createClient: async (input: NewClientInput, actor) => {
      const id = newId("cli");
      const { data, error } = await supabase
        .from("clients")
        .insert({
          id,
          name: input.name,
          industry: input.industry,
          geography: input.geography,
          description: input.description,
          created_by: actor.actor,
        })
        .select()
        .maybeSingle();
      if (error || !data) fail("Could not create the client workspace", error);
      const client: Client = {
        ...clientFromRow(data as Record<string, unknown>),
        subsegments: input.subsegments,
        jurisdictions: input.jurisdictions,
        accountOwner: input.accountOwner,
        executiveSponsor: input.executiveSponsor,
      };
      /** The creator becomes the first member and administrator of the workspace. */
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        await supabase.from("client_members").insert({
          client_id: id,
          user_id: authData.user.id,
          role: actor.role,
          is_client_admin: true,
          invited_by: actor.actor,
        });
      }
      await recordActivity({
        tenantId: id,
        clientId: id,
        actor: actor.actor,
        role: actor.role,
        action: "workspace.created",
        objectType: "client",
        objectId: id,
        newValueSummary: client.name,
        status: "Client workspace created",
      });
      return client;
    },
    listUsers: async (clientId) => {
      const { data, error } = await supabase
        .from("client_members")
        .select("user_id, role, profiles:profiles(id, email, display_name)")
        .eq("client_id", clientId)
        .eq("status", "active");
      if (error) fail("Could not load workspace members", error);
      const rows = (data ?? []) as Record<string, unknown>[];
      const seen = new Set<string>();
      const users: User[] = [];
      rows.forEach((row) => {
        const profile = row.profiles as { id: string; email: string; display_name: string } | null;
        const userId = String(row.user_id);
        if (!profile || seen.has(userId)) return;
        seen.add(userId);
        const name = profile.display_name || profile.email;
        users.push({
          id: userId,
          tenantId: clientId,
          name,
          email: profile.email,
          role: String(row.role) as User["role"],
          title: String(row.role).replace(/-/g, " "),
          initials: name
            .split(" ")
            .map((part) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join(""),
          status: "active",
          createdAt: now(),
          createdBy: "system",
          updatedAt: now(),
          updatedBy: "system",
        });
      });
      return users;
    },
  },

  initiatives: {
    listByClient: async (clientId) => {
      await ensureSeeded(clientId);
      return listRecords<Initiative>("initiative", { clientId });
    },
    listAll: async () => listRecords<Initiative>("initiative", {}),
    get: async (initiativeId) => getRecord<Initiative>("initiative", initiativeId),

    create: async (input: NewInitiativeInput, actor) => {
      const record: Initiative = {
        id: newId("ini"),
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
      await insertRecord("initiative", input.clientId, record.id, record, actor);
      await recordActivity({
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
      return record;
    },

    update: async (initiativeId, patch, actor) => {
      const existing = await getRecord<Initiative>("initiative", initiativeId);
      if (!existing) throw new Error("Initiative not found.");
      const updated: Initiative = {
        ...existing,
        ...patch,
        updatedAt: now(),
        updatedBy: actor.actor,
        version: (existing.version ?? 1) + 1,
      };
      await updateRecord("initiative", updated, actor);
      await recordActivity({
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
      return updated;
    },

    archive: async (initiativeId, actor) =>
      supabaseIntegrationAdapter.initiatives.update(initiativeId, { status: "archived" }, actor),

    setStage: async (initiativeId, stage, actor) => {
      const existing = await getRecord<Initiative>("initiative", initiativeId);
      if (!existing) throw new Error("Initiative not found.");
      const updated: Initiative = {
        ...existing,
        currentStage: stage,
        updatedAt: now(),
        updatedBy: actor.actor,
        version: (existing.version ?? 1) + 1,
      };
      await updateRecord("initiative", updated, actor);
      await recordActivity({
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
      return updated;
    },

    cloneFromTemplate: async (templateId, input, actor) => {
      const created = await supabaseIntegrationAdapter.initiatives.create(input, actor);
      await recordActivity({
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
    },

    listTasks: async (initiativeId) => listRecords<StageTask>("stage_task", { initiativeId }),
    listMilestones: async (initiativeId) => listRecords<Milestone>("milestone", { initiativeId }),
    listRisks: async (initiativeId) =>
      initiativeId ? listRecords<RiskItem>("risk", { initiativeId }) : listRecords<RiskItem>("risk", {}),
    listApprovals: async (initiativeId) =>
      initiativeId ? listRecords<Approval>("approval", { initiativeId }) : listRecords<Approval>("approval", {}),

    decideApproval: async (approvalId, state: ApprovalState, actor, notes) => {
      const existing = await getRecord<Approval>("approval", approvalId);
      if (!existing) throw new Error("Approval not found.");
      /** Only the nominated approver role may record a decision. */
      if (existing.approverRole !== actor.role) {
        throw new Error(
          `This approval must be decided by the ${existing.approverRole.replace(/-/g, " ")} role.`,
        );
      }
      const updated: Approval = {
        ...existing,
        state,
        status: state,
        notes,
        decidedAt: now(),
        updatedAt: now(),
        updatedBy: actor.actor,
      };
      await updateRecord("approval", updated, actor);
      await recordActivity({
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
      return updated;
    },

    listComments: async (initiativeId) => listRecords<Comment>("comment", { initiativeId }),
  },

  assessments: {
    listScores: async (initiativeId) => listRecords<AssessmentScore>("assessment_score", { initiativeId }),
  },

  dataProducts: {
    listByInitiative: async (initiativeId) => listRecords<DataProduct>("data_product", { initiativeId }),
    listConnections: async (initiativeId) => listRecords<IntegrationConnection>("connection", { initiativeId }),
  },

  architecture: {
    listDecisions: async (initiativeId) => listRecords<ArchitectureDecision>("decision", { initiativeId }),
    listAgentDesigns: async (initiativeId) => listRecords<AgentDesign>("agent_design", { initiativeId }),
  },

  audit: {
    list: async ({ clientId, initiativeId, limit = 50 }) => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (clientId) query = query.eq("tenant_id", clientId);
      if (initiativeId) query = query.eq("initiative_id", initiativeId);
      const { data, error } = await query;
      if (error) fail("Could not load the audit trail", error);
      return ((data ?? []) as Record<string, unknown>[]).map(activityFromRow);
    },
    record: recordActivity,
  },

  exports: {
    listArtifacts: async (initiativeId) => listRecords<Artifact>("artifact", { initiativeId }),
    generate: async (initiativeId, input, actor) => {
      const initiative = await getRecord<Initiative>("initiative", initiativeId);
      const clientId = initiative?.clientId ?? initiative?.tenantId ?? "";
      if (!clientId) throw new Error("Initiative not found.");
      const record: Artifact = {
        ...input,
        ...provenance(actor),
        id: newId("art"),
        tenantId: clientId,
        initiativeId,
        generatedBy: actor.role,
        status: "generated",
        version: 1,
      };
      await insertRecord("artifact", clientId, initiativeId, record, actor);
      await recordActivity({
        tenantId: clientId,
        initiativeId,
        actor: actor.actor,
        role: actor.role,
        action: "artifact.generated",
        objectType: "artifact",
        objectId: record.id,
        newValueSummary: `${record.name} (${record.format})`,
        status: "Artifact generated",
      });
      return record;
    },
  },

  recommendations: {
    listPending: async (clientId) =>
      clientId
        ? [
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
              rationale: "Banker assist latency targets are not met by pure federation at current lakehouse volumes.",
              confidence: 0.66,
              stage: "design",
            },
          ]
        : [],
  },

  templates: {
    list: async () => {
      const rows = await listRecords<Template>("template", {});
      return rows.length > 0 ? rows : seedTemplates;
    },
  },

  notifications: {
    list: async (clientId) => {
      await ensureSeeded(clientId);
      return listRecords<Notification>("notification", { clientId });
    },
    markAllRead: async (clientId) => {
      const rows = await listRecords<Notification>("notification", { clientId });
      const updated = rows.map((row) => ({ ...row, read: true, status: "read" }));
      await Promise.all(
        updated.map((row) =>
          supabase
            .from("workspace_records")
            .update({ data: row as unknown as Json })
            .eq("kind", "notification")
            .eq("id", row.id),
        ),
      );
      return updated;
    },
  },
};

export const LIFECYCLE_ORDER = LIFECYCLE_STAGES.map((s) => s.id);
