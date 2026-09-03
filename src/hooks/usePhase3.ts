import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { activityService } from "@/services/workspace";
import {
  dataAiSuggestionService,
  dataProductService,
  fieldMappingService,
  sourceCatalogService,
} from "@/services/phase3";
import { useActiveInitiativeId } from "@/hooks/usePhase2";
import type { RoleId } from "@/domain/models";
import { useActiveIndustry } from "@/hooks/useIndustry";
import type {
  DataAiSuggestion,
  DataProduct,
  DataProductVersion,
  FieldMapping,
  MappingStatus,
} from "@/domain/dataProducts";

export { useActiveInitiativeId };

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

const useInvalidatePhase3 = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      "data-product-templates",
      "data-products",
      "data-product",
      "field-mappings",
      "source-systems",
      "source-objects",
      "data-ai-suggestions",
      "activity",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

/* ------------------------------- data products ------------------------------ */

/** Templates scoped to the active client's vertical (cross-industry templates always included). */
export const useDataProductTemplates = () => {
  const { industry } = useActiveIndustry();
  return useQuery({
    queryKey: ["data-product-templates", industry],
    queryFn: async () => {
      const all = await dataProductService.listTemplates();
      return all.filter((product) => {
        if (product.industry === "cross-industry") return true;
        if (industry === "AUTO") return product.industry === "AUTO" || product.industry === "MFG";
        return product.industry === industry;
      });
    },
  });
};

export const useDataProducts = (initiativeId: string) =>
  useQuery({ queryKey: ["data-products", initiativeId], queryFn: () => dataProductService.list(initiativeId) });

export const useDataProduct = (productId: string | undefined) =>
  useQuery({
    queryKey: ["data-product", productId],
    queryFn: () => dataProductService.get(productId as string),
    enabled: Boolean(productId),
  });

export const useSaveDataProduct = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (input: { product: DataProduct; isNew: boolean }) => {
      const saved = await dataProductService.upsert(input.product, actor);
      await audit({
        action: input.isNew ? "data-product.created" : "data-product.updated",
        objectType: "data-product",
        objectId: saved.id,
        summary: `${saved.name} ${input.isNew ? "created" : "updated"} (${saved.state})`,
        after: saved.state,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useRemoveDataProduct = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (product: DataProduct) => {
      await dataProductService.remove(product.id);
      await audit({
        action: "data-product.removed",
        objectType: "data-product",
        objectId: product.id,
        summary: `${product.name} removed`,
        before: product.state,
      });
      return true;
    },
    onSuccess: invalidate,
  });
};

export const useSubmitProductApproval = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (input: { productId: string; approverRole: RoleId }) => {
      const updated = await dataProductService.submitApproval(input.productId, input.approverRole, actor);
      await audit({
        action: "data-product.approval.submitted",
        objectType: "data-product",
        objectId: updated.id,
        summary: `${updated.name} routed to ${input.approverRole} for approval`,
        after: "in-review",
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useDecideProductApproval = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (input: { productId: string; approvalId: string; approve: boolean; comments?: string }) => {
      const updated = await dataProductService.decideApproval(
        input.productId,
        input.approvalId,
        input.approve,
        actor,
        input.comments,
      );
      await audit({
        action: input.approve ? "data-product.approval.approved" : "data-product.approval.rejected",
        objectType: "data-product",
        objectId: updated.id,
        summary: `${updated.name} approval ${input.approve ? "approved" : "rejected"}`,
        after: updated.state,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const usePublishProductVersion = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (input: { productId: string; summary: string; changes: DataProductVersion["changes"] }) => {
      const updated = await dataProductService.publishVersion(
        input.productId,
        { summary: input.summary, changes: input.changes },
        actor,
      );
      await audit({
        action: "data-product.version.published",
        objectType: "data-product",
        objectId: updated.id,
        summary: `${updated.name} published as v${updated.version}`,
        after: updated.version,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

/* --------------------------------- mappings ---------------------------------- */

export const useFieldMappings = (initiativeId: string) =>
  useQuery({ queryKey: ["field-mappings", initiativeId], queryFn: () => fieldMappingService.list(initiativeId) });

export const useSaveFieldMapping = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (mapping: FieldMapping) => {
      const saved = await fieldMappingService.upsert(mapping);
      await audit({
        action: "field-mapping.saved",
        objectType: "field-mapping",
        objectId: saved.id,
        summary: `Mapping saved for ${saved.targetProductId} (${saved.status})`,
        after: saved.status,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateMappingStatus = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (input: { id: string; status: MappingStatus }) => {
      const updated = await fieldMappingService.updateStatus(input.id, input.status);
      await audit({
        action: "field-mapping.status-changed",
        objectType: "field-mapping",
        objectId: updated.id,
        summary: `Mapping status set to ${updated.status}`,
        after: updated.status,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useRemoveFieldMapping = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (mapping: FieldMapping) => {
      await fieldMappingService.remove(mapping.id);
      await audit({
        action: "field-mapping.removed",
        objectType: "field-mapping",
        objectId: mapping.id,
        summary: `Mapping removed for ${mapping.targetProductId}`,
      });
      return true;
    },
    onSuccess: invalidate,
  });
};

/* ------------------------------ source catalog -------------------------------- */

export const useSourceSystems = () =>
  useQuery({ queryKey: ["source-systems"], queryFn: () => sourceCatalogService.listSystems() });

export const useSourceObjects = (systemId?: string) =>
  useQuery({ queryKey: ["source-objects", systemId ?? "all"], queryFn: () => sourceCatalogService.listObjects(systemId) });

/* ------------------------------ AI suggestions -------------------------------- */

export const useDataAiSuggestions = (initiativeId: string) =>
  useQuery({ queryKey: ["data-ai-suggestions", initiativeId], queryFn: () => dataAiSuggestionService.list(initiativeId) });

export const useDecideDataAiSuggestion = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase3();
  return useMutation({
    mutationFn: async (input: {
      suggestion: DataAiSuggestion;
      status: "accepted" | "edited" | "rejected";
      editedPayload?: Record<string, unknown>;
    }) => {
      const updated = await dataAiSuggestionService.decide(
        input.suggestion.id,
        input.status,
        actor,
        input.editedPayload,
      );
      await audit({
        action: `ai.suggestion.${input.status}`,
        objectType: "data-ai-suggestion",
        objectId: updated.id,
        summary: `${updated.title} — ${input.status}`,
        before: "pending",
        after: input.status,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};
