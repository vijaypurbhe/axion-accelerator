import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import {
  auditService,
  programService,
  releaseService,
  suggestionService,
  tenantService,
  useCaseService,
  workstreamService,
  type AuditContext,
} from "@/services";
import type { AiSuggestion } from "@/domain/types";

export const useTenants = () => useQuery({ queryKey: ["tenants"], queryFn: tenantService.list });

export const usePrograms = (tenantId: string) =>
  useQuery({
    queryKey: ["programs", tenantId],
    queryFn: () => programService.listByTenant(tenantId),
    enabled: Boolean(tenantId),
  });

export const useProgram = (tenantId: string, programId: string | undefined) =>
  useQuery({
    queryKey: ["program", tenantId, programId],
    queryFn: () => programService.get(tenantId, programId as string),
    enabled: Boolean(tenantId && programId),
  });

export const useWorkstreams = (tenantId: string, programId: string | undefined) =>
  useQuery({
    queryKey: ["workstreams", tenantId, programId],
    queryFn: () => workstreamService.listByProgram(tenantId, programId as string),
    enabled: Boolean(tenantId && programId),
  });

export const useUseCases = (tenantId: string, programId: string | undefined) =>
  useQuery({
    queryKey: ["use-cases", tenantId, programId],
    queryFn: () => useCaseService.listByProgram(tenantId, programId as string),
    enabled: Boolean(tenantId && programId),
  });

export const useReleases = (tenantId: string, programId: string | undefined) =>
  useQuery({
    queryKey: ["releases", tenantId, programId],
    queryFn: () => releaseService.listByProgram(tenantId, programId as string),
    enabled: Boolean(tenantId && programId),
  });

export const useAuditTrail = (tenantId: string, limit = 25) =>
  useQuery({
    queryKey: ["audit", tenantId, limit],
    queryFn: () => auditService.list(tenantId, limit),
    enabled: Boolean(tenantId),
  });

export const useSuggestions = (tenantId: string) =>
  useQuery({
    queryKey: ["suggestions", tenantId],
    queryFn: () => suggestionService.list(tenantId),
    enabled: Boolean(tenantId),
  });

/** Audit context derived from the active session and tenant. */
export const useAuditContext = (): AuditContext => {
  const { session, persona, activeTenantId } = useAxion();
  return { tenantId: activeTenantId, actor: session?.email ?? "unknown", persona };
};

export const useSuggestionDecision = () => {
  const queryClient = useQueryClient();
  const context = useAuditContext();

  return useMutation({
    mutationFn: (input: {
      suggestion: AiSuggestion;
      status: "accepted" | "edited" | "rejected";
      editedValue?: unknown;
    }) => suggestionService.decide(context, input.suggestion, { status: input.status, editedValue: input.editedValue }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suggestions", context.tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["audit", context.tenantId] });
    },
  });
};
