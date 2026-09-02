import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { activityService } from "@/services/workspace";
import {
  architectureStudioService,
  assessmentResponseService,
  lifecycleService,
  recommendationService,
} from "@/services/phase2";
import { buildAssessmentRecommendations, summariseAssessment } from "@/services/scoring";
import { useActiveIndustry } from "@/hooks/useIndustry";
import { recommendArchitecture } from "@/services/architectureRecommender";
import { INITIATIVE_C360 } from "@/data/bfsiSeed";
import type { LifecycleStageId } from "@/domain/types";
import type { RoleId } from "@/domain/models";
import type {
  AdrRecord,
  ArchitectureRecommendationInputs,
  AssessmentResponse,
  AxionRecommendation,
  BlueprintComponent,
  BlueprintConnection,
  RecommendationStatus,
  StageItem,
} from "@/domain/phase2";

/** Active initiative, falling back to the seeded BFSI flagship initiative. */
export const useActiveInitiativeId = (): string => {
  const { activeInitiativeId } = useAxion();
  return activeInitiativeId ?? INITIATIVE_C360;
};

const useAudit = () => {
  const actor = useActor();
  const { activeClientId } = useAxion();
  const initiativeId = useActiveInitiativeId();
  return (input: { action: string; objectType: string; objectId: string; summary: string; before?: string; after?: string }) =>
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

const useInvalidatePhase2 = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      "stage-items",
      "stage-events",
      "stage-comments",
      "stage-waivers",
      "stage-advancements",
      "assessment-responses",
      "axion-recommendations",
      "blueprint",
      "adrs",
      "architecture-approvals",
      "activity",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

/* -------------------------------- lifecycle -------------------------------- */

export const useStageItems = (initiativeId: string) =>
  useQuery({ queryKey: ["stage-items", initiativeId], queryFn: () => lifecycleService.listItems(initiativeId) });

export const useStageEvents = (initiativeId: string) =>
  useQuery({ queryKey: ["stage-events", initiativeId], queryFn: () => lifecycleService.listEvents(initiativeId) });

export const useStageComments = (initiativeId: string) =>
  useQuery({ queryKey: ["stage-comments", initiativeId], queryFn: () => lifecycleService.listComments(initiativeId) });

export const useStageWaivers = (initiativeId: string) =>
  useQuery({ queryKey: ["stage-waivers", initiativeId], queryFn: () => lifecycleService.listWaivers(initiativeId) });

export const useStageAdvancements = (initiativeId: string) =>
  useQuery({
    queryKey: ["stage-advancements", initiativeId],
    queryFn: () => lifecycleService.listAdvancements(initiativeId),
  });

export const useUpdateStageItem = (initiativeId: string) => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { item: StageItem; patch: Partial<StageItem> }) => {
      const updated = await lifecycleService.updateItem(initiativeId, input.item.id, input.patch, actor);
      await audit({
        action: "stage.item.updated",
        objectType: "stage-item",
        objectId: updated.id,
        summary: `${updated.label} set to ${updated.status}`,
        before: input.item.status,
        after: updated.status,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useAddStageComment = (initiativeId: string) => {
  const actor = useActor();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: (input: { stage: LifecycleStageId; body: string }) =>
      lifecycleService.addComment(initiativeId, input.stage, input.body, actor),
    onSuccess: invalidate,
  });
};

export const useRequestWaiver = (initiativeId: string) => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { stage: LifecycleStageId; itemId: string; justification: string }) => {
      const waiver = await lifecycleService.requestWaiver(initiativeId, input, actor);
      await audit({
        action: "stage.waiver.requested",
        objectType: "stage-waiver",
        objectId: waiver.id,
        summary: `Exception requested for ${input.stage}`,
        after: input.justification,
      });
      return waiver;
    },
    onSuccess: invalidate,
  });
};

export const useDecideWaiver = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { waiverId: string; approve: boolean }) => {
      const waiver = await lifecycleService.decideWaiver(input.waiverId, input.approve, actor);
      await audit({
        action: input.approve ? "stage.waiver.approved" : "stage.waiver.rejected",
        objectType: "stage-waiver",
        objectId: waiver.id,
        summary: `Exception ${waiver.state} for ${waiver.stage}`,
        after: waiver.state,
      });
      return waiver;
    },
    onSuccess: invalidate,
  });
};

export const useRequestStageAdvance = (initiativeId: string) => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: {
      fromStage: LifecycleStageId;
      toStage: LifecycleStageId;
      approvers: readonly RoleId[];
      mode: "sequential" | "parallel";
      note?: string;
    }) => {
      const request = await lifecycleService.requestAdvance(initiativeId, input, actor);
      await audit({
        action: "stage.advance.requested",
        objectType: "stage-advancement",
        objectId: request.id,
        summary: `Advance requested ${input.fromStage} → ${input.toStage}`,
        before: input.fromStage,
        after: input.toStage,
      });
      return request;
    },
    onSuccess: invalidate,
  });
};

export const useDecideStageAdvance = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { requestId: string; approve: boolean; comment?: string }) => {
      const request = await lifecycleService.decideAdvance(input.requestId, input.approve, input.comment, actor);
      await audit({
        action: input.approve ? "stage.advance.approved" : "stage.advance.rejected",
        objectType: "stage-advancement",
        objectId: request.id,
        summary: `Gate decision recorded for ${request.fromStage} → ${request.toStage}`,
        after: request.state,
      });
      return request;
    },
    onSuccess: invalidate,
  });
};

/* -------------------------------- assessment ------------------------------- */

export const useAssessmentResponses = (initiativeId: string) =>
  useQuery({
    queryKey: ["assessment-responses", initiativeId],
    queryFn: () => assessmentResponseService.getResponses(initiativeId),
  });

export const useAssessmentSummary = (initiativeId: string) => {
  const { data, isLoading, isError } = useAssessmentResponses(initiativeId);
  const { industry } = useActiveIndustry();
  const summary = useMemo(() => summariseAssessment(data ?? {}, industry), [data, industry]);
  return { summary, responses: data ?? {}, isLoading, isError };
};

export const useSaveAssessmentResponse = (initiativeId: string) => {
  const actor = useActor();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: (input: Omit<AssessmentResponse, "updatedAt" | "updatedBy">) =>
      assessmentResponseService.saveResponse(initiativeId, {
        ...input,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.actor,
      }),
    onSuccess: invalidate,
  });
};

/* ------------------------------ recommendations ---------------------------- */

export const useRecommendations = (initiativeId: string) =>
  useQuery({
    queryKey: ["axion-recommendations", initiativeId],
    queryFn: () => recommendationService.list(initiativeId),
  });

export const useGenerateAssessmentRecommendations = (initiativeId: string) => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { summary: ReturnType<typeof summariseAssessment>; useCases: readonly string[] }) => {
      const drafts = buildAssessmentRecommendations(initiativeId, input.summary, input.useCases);
      const created = await recommendationService.replaceGenerated(initiativeId, "assessment", drafts);
      await audit({
        action: "ai.recommendations.generated",
        objectType: "assessment",
        objectId: initiativeId,
        summary: `${created.length} AI suggested readiness recommendations generated`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useDecideRecommendation = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: {
      recommendation: AxionRecommendation;
      status: Exclude<RecommendationStatus, "pending">;
      editedText?: string;
    }) => {
      const updated = await recommendationService.decide(
        input.recommendation.id,
        input.status,
        actor,
        input.editedText,
      );
      await audit({
        action: `ai.suggestion.${input.status}`,
        objectType: "recommendation",
        objectId: updated.id,
        summary: `${updated.title} — ${input.status}`,
        before: "pending",
        after: input.editedText ?? input.status,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

/* ------------------------------- architecture ------------------------------ */

export const useBlueprint = (initiativeId: string) =>
  useQuery({ queryKey: ["blueprint", initiativeId], queryFn: () => architectureStudioService.getBlueprint(initiativeId) });

export const useUpsertComponent = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (component: BlueprintComponent) => {
      const saved = await architectureStudioService.upsertComponent(component);
      await audit({
        action: "architecture.component.saved",
        objectType: "blueprint-component",
        objectId: saved.id,
        summary: `${saved.name} saved in ${saved.layer} layer`,
        after: saved.status,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useRemoveComponent = (initiativeId: string) => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (component: BlueprintComponent) => {
      await architectureStudioService.removeComponent(initiativeId, component.id);
      await audit({
        action: "architecture.component.removed",
        objectType: "blueprint-component",
        objectId: component.id,
        summary: `${component.name} removed from blueprint`,
        before: component.status,
      });
      return true;
    },
    onSuccess: invalidate,
  });
};

export const useDecideComponent = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: {
      component: BlueprintComponent;
      acceptance: Exclude<RecommendationStatus, "pending">;
    }) => {
      const updated = await architectureStudioService.decideComponent(input.component.id, input.acceptance);
      await audit({
        action: `ai.suggestion.${input.acceptance}`,
        objectType: "blueprint-component",
        objectId: updated.id,
        summary: `AI suggested component ${updated.name} — ${input.acceptance}`,
        before: "pending",
        after: input.acceptance,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useAddConnection = () => {
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: (connection: BlueprintConnection) => architectureStudioService.addConnection(connection),
    onSuccess: invalidate,
  });
};

export const useRemoveConnection = (initiativeId: string) => {
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: (connectionId: string) => architectureStudioService.removeConnection(initiativeId, connectionId),
    onSuccess: invalidate,
  });
};

export const useGenerateArchitecture = (initiativeId: string) => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: {
      inputs: ArchitectureRecommendationInputs;
      summary?: ReturnType<typeof summariseAssessment>;
    }) => {
      const result = recommendArchitecture(initiativeId, input.inputs, input.summary);
      await architectureStudioService.applyRecommendation(initiativeId, result);
      await audit({
        action: "ai.architecture.generated",
        objectType: "blueprint",
        objectId: initiativeId,
        summary: `${result.components.length} AI suggested components proposed across five layers`,
      });
      return result;
    },
    onSuccess: invalidate,
  });
};

export const useAdrs = (initiativeId: string) =>
  useQuery({ queryKey: ["adrs", initiativeId], queryFn: () => architectureStudioService.listAdrs(initiativeId) });

export const useUpsertAdr = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (adr: AdrRecord) => {
      const saved = await architectureStudioService.upsertAdr(adr);
      await audit({
        action: "architecture.decision.saved",
        objectType: "adr",
        objectId: saved.id,
        summary: `${saved.reference} ${saved.title} (${saved.status})`,
        after: saved.status,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useDecideAdr = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { adrId: string; approve: boolean; comment?: string }) => {
      const updated = await architectureStudioService.decideAdr(input.adrId, input.approve, input.comment, actor);
      await audit({
        action: input.approve ? "architecture.decision.approved" : "architecture.decision.rejected",
        objectType: "adr",
        objectId: updated.id,
        summary: `${updated.reference} → ${updated.status} (v${updated.version})`,
        after: updated.status,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useArchitectureApprovals = (initiativeId: string) =>
  useQuery({
    queryKey: ["architecture-approvals", initiativeId],
    queryFn: () => architectureStudioService.listApprovalRequests(initiativeId),
  });

export const useSubmitArchitectureApproval = (initiativeId: string) => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { approvers: readonly RoleId[]; mode: "sequential" | "parallel"; note?: string }) => {
      const request = await architectureStudioService.submitApproval(initiativeId, input, actor);
      await audit({
        action: "architecture.approval.submitted",
        objectType: "architecture-approval",
        objectId: request.id,
        summary: `Blueprint v${request.blueprintVersion} routed for ${input.mode} approval`,
      });
      return request;
    },
    onSuccess: invalidate,
  });
};

export const useVoteArchitectureApproval = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase2();
  return useMutation({
    mutationFn: async (input: { requestId: string; approve: boolean; comment?: string }) => {
      const updated = await architectureStudioService.voteApproval(
        input.requestId,
        input.approve,
        input.comment,
        actor,
      );
      await audit({
        action: input.approve ? "architecture.approval.approved" : "architecture.approval.rejected",
        objectType: "architecture-approval",
        objectId: updated.id,
        summary: `Blueprint v${updated.blueprintVersion} — ${updated.state}`,
        after: updated.state,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};
