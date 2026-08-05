import { supabase } from "@/integrations/supabase/client";
import { seedAgents } from "@/data/agentforceSeed";
import type { RoleId } from "@/domain/models";
import type {
  AgentAction,
  AgentDesignRecord,
  AgentReview,
  AgentSuggestion,
  AgentTopic,
  EscalationRule,
  GroundingSource,
  Guardrail,
  ProcessBoundaryStep,
} from "@/domain/phase6";

/**
 * Server-backed persistence for the Agentforce Studio.
 * The aggregate is stored as one `agents` row plus one row per design object,
 * so inline edits are atomic and independently auditable.
 */

export interface ActorLike {
  readonly actor: string;
  readonly role: RoleId;
}

export type ChildTable =
  | "agent_topics"
  | "agent_actions"
  | "agent_grounding"
  | "agent_guardrails"
  | "agent_escalations"
  | "agent_boundaries";

export interface ActionAuthorization {
  readonly actionId: string;
  readonly state: "unauthorized" | "pending" | "authorized";
  readonly authorizedBy: string | null;
  readonly authorizedAt: string | null;
}

export interface ApprovalRequestRecord {
  readonly id: string;
  readonly agentId: string;
  readonly stage: string;
  readonly requestedBy: string;
  readonly requiredRoles: readonly string[];
  readonly state: string;
  readonly dueBy: string | null;
  readonly createdAt: string;
}

export interface ExportJobRecord {
  readonly id: string;
  readonly agentId: string;
  readonly format: "markdown" | "csv" | "pdf";
  readonly status: "queued" | "running" | "complete" | "failed";
  readonly contentHash: string;
  readonly byteSize: number;
  readonly storagePath: string | null;
  readonly error: string | null;
  readonly requestedBy: string;
  readonly createdAt: string;
}

const fail = (context: string, error: { message: string } | null): never => {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
};

/* ------------------------------- row mapping ------------------------------- */

type Row = Record<string, unknown>;

const rowsToObjects = <T,>(rows: Row[] | null): T[] =>
  (rows ?? [])
    .slice()
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((row) => ({ ...(row.data as object), id: String(row.id) }) as T);

const composeAgent = (
  agent: Row,
  children: {
    topics: Row[] | null;
    actions: Row[] | null;
    grounding: Row[] | null;
    guardrails: Row[] | null;
    escalations: Row[] | null;
    boundaries: Row[] | null;
    reviews: Row[] | null;
    versions: Row[] | null;
  },
): AgentDesignRecord =>
  ({
    id: String(agent.id),
    initiativeId: String(agent.initiative_id),
    reference: String(agent.reference),
    overview: agent.overview as AgentDesignRecord["overview"],
    status: agent.status as AgentDesignRecord["status"],
    version: String(agent.version),
    release: String(agent.release),
    riskRating: agent.risk_rating as AgentDesignRecord["riskRating"],
    testStatus: agent.test_status as AgentDesignRecord["testStatus"],
    topics: rowsToObjects<AgentTopic>(children.topics),
    actions: rowsToObjects<AgentAction>(children.actions),
    grounding: rowsToObjects<GroundingSource>(children.grounding),
    instructions: agent.instructions as AgentDesignRecord["instructions"],
    guardrails: rowsToObjects<Guardrail>(children.guardrails),
    escalations: rowsToObjects<EscalationRule>(children.escalations),
    boundaries: rowsToObjects<ProcessBoundaryStep>(children.boundaries),
    consumption: agent.consumption as AgentDesignRecord["consumption"],
    testCases: (agent.tests ?? []) as AgentDesignRecord["testCases"],
    backlog: (agent.backlog ?? []) as AgentDesignRecord["backlog"],
    monitoring: (agent.monitoring ?? []) as AgentDesignRecord["monitoring"],
    reviews: (children.reviews ?? []).map((row) => ({
      id: String(row.id),
      stage: row.stage as AgentReview["stage"],
      reviewerRole: row.reviewer_role as RoleId,
      outcome: row.outcome as AgentReview["outcome"],
      comments: String(row.comments ?? ""),
      decidedAt: row.decided_at ? String(row.decided_at) : undefined,
      decidedBy: row.reviewer ? String(row.reviewer) : undefined,
    })),
    versions: (children.versions ?? []).map((row) => ({
      id: String(row.id),
      version: String(row.version),
      createdAt: String(row.created_at),
      createdBy: String(row.created_by ?? ""),
      status: row.status as AgentDesignRecord["status"],
      summary: String(row.summary ?? ""),
      counts: row.counts as { topics: number; actions: number; grounding: number; guardrails: number; escalations: number },
    })),
    linkedRiskIds: (agent.linked_risk_ids ?? []) as string[],
    linkedDecisionIds: (agent.linked_decision_ids ?? []) as string[],
    identityPolicyId: (agent.identity_policy_id as string | null) ?? undefined,
    lifecycleStage: agent.lifecycle_stage as AgentDesignRecord["lifecycleStage"],
    createdAt: String(agent.created_at),
    createdBy: String(agent.created_by ?? ""),
    updatedAt: String(agent.updated_at),
    updatedBy: String(agent.updated_by ?? ""),
  }) as AgentDesignRecord;

const agentScalarPatch = (patch: Partial<AgentDesignRecord>, actor: ActorLike): Row => {
  const row: Row = { updated_by: actor.actor };
  if (patch.overview) row.overview = patch.overview;
  if (patch.instructions) row.instructions = patch.instructions;
  if (patch.consumption) row.consumption = patch.consumption;
  if (patch.status) row.status = patch.status;
  if (patch.version) row.version = patch.version;
  if (patch.release !== undefined) row.release = patch.release;
  if (patch.riskRating) row.risk_rating = patch.riskRating;
  if (patch.testStatus) row.test_status = patch.testStatus;
  if (patch.lifecycleStage) row.lifecycle_stage = patch.lifecycleStage;
  if (patch.testCases) row.tests = patch.testCases;
  if (patch.backlog) row.backlog = patch.backlog;
  if (patch.monitoring) row.monitoring = patch.monitoring;
  if (patch.linkedRiskIds) row.linked_risk_ids = patch.linkedRiskIds;
  if (patch.linkedDecisionIds) row.linked_decision_ids = patch.linkedDecisionIds;
  if (patch.identityPolicyId !== undefined) row.identity_policy_id = patch.identityPolicyId ?? null;
  return row;
};

/* --------------------------------- reads ---------------------------------- */

const loadChildren = async (agentIds: string[]) => {
  const tables: ChildTable[] = [
    "agent_topics",
    "agent_actions",
    "agent_grounding",
    "agent_guardrails",
    "agent_escalations",
    "agent_boundaries",
  ];
  const [topics, actions, grounding, guardrails, escalations, boundaries, reviews, versions] = await Promise.all([
    ...tables.map((table) =>
      supabase.from(table).select("*").in("agent_id", agentIds).then((r) => (r.error ? fail(table, r.error) : r.data)),
    ),
    supabase
      .from("agent_reviews")
      .select("*")
      .in("agent_id", agentIds)
      .order("decided_at", { ascending: true })
      .then((r) => (r.error ? fail("agent_reviews", r.error) : r.data)),
    supabase
      .from("agent_versions")
      .select("*")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: true })
      .then((r) => (r.error ? fail("agent_versions", r.error) : r.data)),
  ]);
  const group = (rows: Row[] | null, agentId: string) => (rows ?? []).filter((row) => row.agent_id === agentId);
  return (agentId: string) => ({
    topics: group(topics as Row[], agentId),
    actions: group(actions as Row[], agentId),
    grounding: group(grounding as Row[], agentId),
    guardrails: group(guardrails as Row[], agentId),
    escalations: group(escalations as Row[], agentId),
    boundaries: group(boundaries as Row[], agentId),
    reviews: group(reviews as Row[], agentId),
    versions: group(versions as Row[], agentId),
  });
};

/** Insert the seeded BFSI agents for an initiative the first time it is opened. */
const ensureSeeded = async (initiativeId: string, tenantId: string) => {
  const { count, error } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("initiative_id", initiativeId);
  if (error) fail("agents count", error);
  if ((count ?? 0) > 0) return;

  for (const agent of seedAgents()) {
    await insertAgentAggregate({ ...agent, initiativeId }, tenantId, { actor: "seed@axion", role: agent.overview.owner });
  }
};

const insertAgentAggregate = async (agent: AgentDesignRecord, tenantId: string, actor: ActorLike) => {
  const { data, error } = await supabase
    .from("agents")
    .insert({
      tenant_id: tenantId,
      initiative_id: agent.initiativeId,
      reference: agent.reference,
      pattern_id: agent.overview.patternId,
      status: agent.status,
      version: agent.version,
      risk_rating: agent.riskRating,
      test_status: agent.testStatus,
      release: agent.release,
      origin: "seed",
      lifecycle_stage: agent.lifecycleStage,
      overview: agent.overview as unknown as Json,
      instructions: agent.instructions as unknown as Json,
      consumption: agent.consumption as unknown as Json,
      tests: agent.testCases as unknown as Json,
      backlog: agent.backlog as unknown as Json,
      monitoring: agent.monitoring as unknown as Json,
      linked_risk_ids: [...agent.linkedRiskIds],
      linked_decision_ids: [...agent.linkedDecisionIds],
      identity_policy_id: agent.identityPolicyId ?? null,
      created_by: actor.actor,
      updated_by: actor.actor,
    })

    .select("id")
    .single();
  if (error || !data) fail("agents insert", error);
  const agentId = String((data as Row).id);

  const childInsert = async (table: ChildTable, items: readonly { id: string }[]) => {
    if (items.length === 0) return;
    const rows = items.map((item, index) => ({ agent_id: agentId, position: index, data: item }));
    const { error: childError } = await supabase.from(table).insert(rows);
    if (childError) fail(table, childError);
  };

  await Promise.all([
    childInsert("agent_topics", agent.topics),
    childInsert("agent_actions", agent.actions),
    childInsert("agent_grounding", agent.grounding),
    childInsert("agent_guardrails", agent.guardrails),
    childInsert("agent_escalations", agent.escalations),
    childInsert("agent_boundaries", agent.boundaries),
  ]);

  if (agent.versions.length > 0) {
    await supabase.from("agent_versions").insert(
      agent.versions.map((version) => ({
        agent_id: agentId,
        version: version.version,
        status: version.status,
        summary: version.summary,
        counts: version.counts,
        created_by: version.createdBy,
      })),
    );
  }
  return agentId;
};

export const agentStore = {
  async list(initiativeId: string, tenantId: string): Promise<AgentDesignRecord[]> {
    await ensureSeeded(initiativeId, tenantId);
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("initiative_id", initiativeId)
      .order("reference", { ascending: true });
    if (error) fail("agents list", error);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return [];
    const children = await loadChildren(rows.map((row) => String(row.id)));
    return rows.map((row) => composeAgent(row, children(String(row.id))));
  },

  async get(agentId: string): Promise<AgentDesignRecord | null> {
    const { data, error } = await supabase.from("agents").select("*").eq("id", agentId).maybeSingle();
    if (error) fail("agent get", error);
    if (!data) return null;
    const children = await loadChildren([agentId]);
    return composeAgent(data as Row, children(agentId));
  },

  async create(
    input: Omit<AgentDesignRecord, "id" | "reference" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">,
    actor: ActorLike,
    tenantId: string,
  ): Promise<AgentDesignRecord> {
    const { count } = await supabase.from("agents").select("id", { count: "exact", head: true });
    const reference = `AGT-${String((count ?? 0) + 1).padStart(3, "0")}`;
    const agentId = await insertAgentAggregate(
      { ...(input as AgentDesignRecord), id: "", reference } as AgentDesignRecord,
      tenantId,
      actor,
    );
    await supabase.from("agents").update({ origin: "manual", created_by: actor.actor }).eq("id", agentId);
    const created = await agentStore.get(agentId as string);
    if (!created) throw new Error("Agent could not be read back after creation.");
    return created;
  },

  async update(agentId: string, patch: Partial<AgentDesignRecord>, actor: ActorLike): Promise<AgentDesignRecord> {
    const { error } = await supabase.from("agents").update(agentScalarPatch(patch, actor)).eq("id", agentId);
    if (error) fail("agent update", error);
    const updated = await agentStore.get(agentId);
    if (!updated) throw new Error(`Agent ${agentId} not found`);
    return updated;
  },

  /* ----------------------------- child objects ----------------------------- */

  async createChild(table: ChildTable, agentId: string, data: object): Promise<string> {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);
    const { data: inserted, error } = await supabase
      .from(table)
      .insert({ agent_id: agentId, position: count ?? 0, data })
      .select("id")
      .single();
    if (error || !inserted) fail(`${table} insert`, error);
    return String((inserted as Row).id);
  },

  async updateChild(table: ChildTable, id: string, data: object): Promise<void> {
    const { error } = await supabase.from(table).update({ data }).eq("id", id);
    if (error) fail(`${table} update`, error);
  },

  async deleteChild(table: ChildTable, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) fail(`${table} delete`, error);
  },

  /* ------------------------- action authorization -------------------------- */

  async listActionAuthorizations(agentId: string): Promise<ActionAuthorization[]> {
    const { data, error } = await supabase
      .from("agent_actions")
      .select("id, authorization_state, authorized_by, authorized_at")
      .eq("agent_id", agentId);
    if (error) fail("action authorizations", error);
    return ((data ?? []) as Row[]).map((row) => ({
      actionId: String(row.id),
      state: (row.authorization_state ?? "unauthorized") as ActionAuthorization["state"],
      authorizedBy: (row.authorized_by as string | null) ?? null,
      authorizedAt: (row.authorized_at as string | null) ?? null,
    }));
  },

  async setActionAuthorization(
    actionId: string,
    state: ActionAuthorization["state"],
    actor: ActorLike,
  ): Promise<void> {
    const { error } = await supabase
      .from("agent_actions")
      .update({
        authorization_state: state,
        authorized_by: state === "authorized" ? actor.actor : null,
        authorized_at: state === "authorized" ? new Date().toISOString() : null,
      })
      .eq("id", actionId);
    if (error) fail("action authorization", error);
  },

  /* --------------------------- versions + reviews -------------------------- */

  async snapshotVersion(
    agentId: string,
    version: string,
    summary: string,
    actor: ActorLike,
  ): Promise<AgentDesignRecord> {
    const agent = await agentStore.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const payload = JSON.stringify(agent);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    const contentHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const { error } = await supabase.from("agent_versions").insert({
      agent_id: agentId,
      version,
      status: agent.status,
      summary,
      counts: {
        topics: agent.topics.length,
        actions: agent.actions.length,
        grounding: agent.grounding.length,
        guardrails: agent.guardrails.length,
        escalations: agent.escalations.length,
      },
      payload: JSON.parse(payload),
      content_hash: contentHash,
      created_by: actor.actor,
    });
    if (error) fail("version snapshot", error);
    return agentStore.update(agentId, { version }, actor);
  },

  async recordReview(agentId: string, review: AgentReview, actor: ActorLike): Promise<AgentDesignRecord> {
    const { error } = await supabase.from("agent_reviews").insert({
      agent_id: agentId,
      stage: review.stage,
      reviewer: actor.actor,
      reviewer_role: review.reviewerRole,
      outcome: review.outcome,
      comments: review.comments,
    });
    if (error) {
      throw new Error(
        `Review could not be recorded — you must hold the ${review.reviewerRole} role. (${error.message})`,
      );
    }
    const updated = await agentStore.get(agentId);
    if (!updated) throw new Error(`Agent ${agentId} not found`);
    return updated;
  },

  /* ---------------------------- approval requests -------------------------- */

  async listApprovalRequests(agentId: string): Promise<ApprovalRequestRecord[]> {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) fail("approval requests", error);
    return ((data ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      agentId: String(row.agent_id),
      stage: String(row.stage),
      requestedBy: String(row.requested_by ?? ""),
      requiredRoles: (row.required_roles ?? []) as string[],
      state: String(row.state),
      dueBy: (row.due_by as string | null) ?? null,
      createdAt: String(row.created_at),
    }));
  },

  async requestApproval(
    agentId: string,
    stage: string,
    requiredRoles: readonly string[],
    actor: ActorLike,
    dueBy?: string,
  ): Promise<void> {
    const { error } = await supabase.from("approval_requests").insert({
      agent_id: agentId,
      stage,
      requested_by: actor.actor,
      required_roles: requiredRoles,
      state: "open",
      due_by: dueBy ?? null,
    });
    if (error) fail("approval request", error);
  },

  async closeApprovalRequest(id: string, state: "approved" | "rejected" | "withdrawn"): Promise<void> {
    const { error } = await supabase.from("approval_requests").update({ state }).eq("id", id);
    if (error) fail("approval request update", error);
  },

  /* --------------------------- suggestion decisions ------------------------ */

  async decideSuggestion(
    agentId: string,
    suggestion: AgentSuggestion,
    decision: "accepted" | "edited" | "rejected",
    actor: ActorLike,
  ) {
    const { data, error } = await supabase
      .from("agent_suggestion_decisions")
      .insert({
        agent_id: agentId,
        kind: suggestion.kind,
        title: suggestion.title,
        decision,
        rationale: suggestion.rationale,
        confidence: suggestion.confidence,
        decided_by: actor.actor,
      })
      .select("*")
      .single();
    if (error || !data) fail("suggestion decision", error);
    const row = data as Row;
    return {
      id: String(row.id),
      agentId,
      kind: String(row.kind),
      title: String(row.title),
      decision: String(row.decision),
      decidedBy: String(row.decided_by ?? ""),
      decidedAt: String(row.decided_at),
    };
  },

  async suggestionDecisions(agentId: string) {
    const { data, error } = await supabase
      .from("agent_suggestion_decisions")
      .select("*")
      .eq("agent_id", agentId)
      .order("decided_at", { ascending: false });
    if (error) fail("suggestion decisions", error);
    return ((data ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      agentId,
      kind: String(row.kind),
      title: String(row.title),
      decision: String(row.decision),
      decidedBy: String(row.decided_by ?? ""),
      decidedAt: String(row.decided_at),
    }));
  },

  /* ------------------------------ export jobs ------------------------------ */

  async listExportJobs(agentId: string): Promise<ExportJobRecord[]> {
    const { data, error } = await supabase
      .from("export_jobs")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) fail("export jobs", error);
    return ((data ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      agentId,
      format: row.format as ExportJobRecord["format"],
      status: row.status as ExportJobRecord["status"],
      contentHash: String(row.content_hash ?? ""),
      byteSize: Number(row.byte_size ?? 0),
      storagePath: (row.storage_path as string | null) ?? null,
      error: (row.error as string | null) ?? null,
      requestedBy: String(row.requested_by ?? ""),
      createdAt: String(row.created_at),
    }));
  },
};
