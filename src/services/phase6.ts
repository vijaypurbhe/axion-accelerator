import { agentStore, type ActorLike } from "@/repositories/supabase/agentDesignStore";
import type { AgentDesignRecord, AgentReview, AgentSuggestion } from "@/domain/phase6";

/**
 * Phase 6 service layer — now server-backed.
 * Pages and hooks depend on this module rather than the store, so the transport
 * can change without touching feature code. The tenant is ambient (set by the
 * app shell) so hook signatures stay unchanged.
 */

let tenantId = "";

export const setAgentTenantContext = (id: string) => {
  tenantId = id;
};

const requireTenant = (): string => {
  if (!tenantId) throw new Error("No client workspace is in context.");
  return tenantId;
};

export const agentDesignService = {
  list: (initiativeId: string) => agentStore.list(initiativeId, requireTenant()),
  get: (agentId: string) => agentStore.get(agentId),
  create: (
    input: Omit<AgentDesignRecord, "id" | "reference" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">,
    actor: ActorLike,
  ) => agentStore.create(input, actor, requireTenant()),
  update: (agentId: string, patch: Partial<AgentDesignRecord>, actor: ActorLike) =>
    agentStore.update(agentId, patch, actor),
  snapshotVersion: (agentId: string, version: string, summary: string, actor: ActorLike) =>
    agentStore.snapshotVersion(agentId, version, summary, actor),
  recordReview: (agentId: string, review: AgentReview, actor: ActorLike) =>
    agentStore.recordReview(agentId, review, actor),
  decideSuggestion: (
    agentId: string,
    suggestion: AgentSuggestion,
    decision: "accepted" | "edited" | "rejected",
    actor: ActorLike,
  ) => agentStore.decideSuggestion(agentId, suggestion, decision, actor),
  suggestionDecisions: (agentId: string) => agentStore.suggestionDecisions(agentId),

  /* Inline editing of design objects */
  createChild: agentStore.createChild,
  updateChild: agentStore.updateChild,
  deleteChild: agentStore.deleteChild,

  /* Action authorization + approvals */
  listActionAuthorizations: agentStore.listActionAuthorizations,
  setActionAuthorization: agentStore.setActionAuthorization,
  listApprovalRequests: agentStore.listApprovalRequests,
  requestApproval: agentStore.requestApproval,
  closeApprovalRequest: agentStore.closeApprovalRequest,

  /* Export jobs */
  listExportJobs: agentStore.listExportJobs,
};

export type { ActorLike };
