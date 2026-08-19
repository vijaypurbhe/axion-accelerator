import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { activityService } from "@/services/workspace";
import { agentDesignService } from "@/services/phase6";
import { useActivePhase6InitiativeId } from "@/hooks/usePhase6";
import { DESIGN_OBJECT_LABEL, DESIGN_OBJECT_TABLE, type DesignObjectKind } from "@/services/agentDesignSchemas";
import type { ActionAuthorization } from "@/repositories/supabase/agentDesignStore";
import type { ApprovalStage } from "@/services/agentApprovals";

/**
 * Inline editing, action authorization and approval-request mutations for the
 * Agentforce workbench. Every mutation writes an audit entry and invalidates the
 * agent aggregate so readiness and diagnostics recompute from server state.
 */

const useAudit = () => {
  const actor = useActor();
  const { activeClientId } = useAxion();
  const initiativeId = useActivePhase6InitiativeId();
  return (input: {
    action: string;
    objectType: string;
    objectId: string;
    summary: string;
    before?: string;
    after?: string;
  }) =>
    activityService.record(actor, {
      tenantId: activeClientId,
      clientId: activeClientId,
      initiativeId,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      summary: input.summary,
      oldValueSummary: input.before,
      newValueSummary: input.after,
    });
};

const useInvalidateAgent = () => {
  const client = useQueryClient();
  return (agentId: string) => {
    void client.invalidateQueries({ queryKey: ["agent", agentId] });
    void client.invalidateQueries({ queryKey: ["agents"] });
    void client.invalidateQueries({ queryKey: ["agent-authorizations", agentId] });
    void client.invalidateQueries({ queryKey: ["agent-approvals", agentId] });
    void client.invalidateQueries({ queryKey: ["activity"] });
  };
};

export interface SaveDesignObjectInput {
  readonly agentId: string;
  readonly kind: DesignObjectKind;
  /** Undefined for a new object. */
  readonly objectId?: string;
  readonly data: Record<string, unknown>;
  readonly label: string;
}

export const useSaveDesignObject = () => {
  const audit = useAudit();
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: async (input: SaveDesignObjectInput) => {
      const table = DESIGN_OBJECT_TABLE[input.kind];
      const { id: _ignored, ...payload } = input.data as { id?: string };
      if (input.objectId) {
        await agentDesignService.updateChild(table, input.objectId, payload);
      } else {
        await agentDesignService.createChild(table, input.agentId, payload);
      }
      await audit({
        action: input.objectId ? "agentforce.design.updated" : "agentforce.design.created",
        objectType: input.kind,
        objectId: input.objectId ?? input.label,
        summary: `${DESIGN_OBJECT_LABEL[input.kind]} "${input.label}" ${input.objectId ? "updated" : "created"}`,
      });
      return true;
    },
    onSuccess: (_result, input) => invalidate(input.agentId),
  });
};

export const useDeleteDesignObject = () => {
  const audit = useAudit();
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: async (input: { agentId: string; kind: DesignObjectKind; objectId: string; label: string }) => {
      await agentDesignService.deleteChild(DESIGN_OBJECT_TABLE[input.kind], input.objectId);
      await audit({
        action: "agentforce.design.deleted",
        objectType: input.kind,
        objectId: input.objectId,
        summary: `${DESIGN_OBJECT_LABEL[input.kind]} "${input.label}" removed`,
      });
      return true;
    },
    onSuccess: (_result, input) => invalidate(input.agentId),
  });
};

/* --------------------------- action authorization --------------------------- */

export const useActionAuthorizations = (agentId: string | undefined) =>
  useQuery({
    queryKey: ["agent-authorizations", agentId],
    queryFn: () => agentDesignService.listActionAuthorizations(agentId as string),
    enabled: Boolean(agentId),
  });

export const useSetActionAuthorization = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: async (input: {
      agentId: string;
      actionId: string;
      actionName: string;
      state: ActionAuthorization["state"];
    }) => {
      await agentDesignService.setActionAuthorization(input.actionId, input.state, actor);
      await audit({
        action: `agentforce.action.${input.state}`,
        objectType: "agent-action",
        objectId: input.actionId,
        summary: `Action "${input.actionName}" set to ${input.state} by ${actor.role}`,
        after: input.state,
      });
      return true;
    },
    onSuccess: (_result, input) => invalidate(input.agentId),
  });
};

/* ---------------------------- approval requests ----------------------------- */

export const useApprovalRequests = (agentId: string | undefined) =>
  useQuery({
    queryKey: ["agent-approvals", agentId],
    queryFn: () => agentDesignService.listApprovalRequests(agentId as string),
    enabled: Boolean(agentId),
  });

export const useRequestApproval = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: async (input: {
      agentId: string;
      stage: ApprovalStage;
      requiredRoles: readonly string[];
      dueBy?: string;
    }) => {
      await agentDesignService.requestApproval(input.agentId, input.stage, input.requiredRoles, actor, input.dueBy);
      await audit({
        action: "agentforce.approval.requested",
        objectType: "approval-request",
        objectId: `${input.agentId}:${input.stage}`,
        summary: `${input.stage} approval requested from ${input.requiredRoles.join(", ")}`,
      });
      return true;
    },
    onSuccess: (_result, input) => invalidate(input.agentId),
  });
};

export const useCloseApprovalRequest = () => {
  const audit = useAudit();
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: async (input: {
      agentId: string;
      requestId: string;
      stage: string;
      state: "approved" | "rejected" | "withdrawn";
    }) => {
      await agentDesignService.closeApprovalRequest(input.requestId, input.state);
      await audit({
        action: `agentforce.approval.${input.state}`,
        objectType: "approval-request",
        objectId: input.requestId,
        summary: `${input.stage} approval request ${input.state}`,
        after: input.state,
      });
      return true;
    },
    onSuccess: (_result, input) => invalidate(input.agentId),
  });
};
