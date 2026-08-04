import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { activityService } from "@/services/workspace";
import { connectivityService, identityService } from "@/services/phase4";
import { acceptOrOverrideConnectivityDecision, type ConnectivityAdrContext } from "@/services/connectivityAdr";
import { evaluateConnectivity } from "@/services/connectivityEngine";
import { runSimulation, deriveExceptions } from "@/services/identityEngine";
import { INITIATIVE_C360 } from "@/data/bfsiSeed";
import { recordsForSet } from "@/data/identityTemplates";
import type {
  ConnectivityAssessment,
  ConnectivityPolicy,
  ExceptionAction,
  ExceptionStatus,
  IdentityAiSuggestion,
  IdentityPolicy,
  MatchRule,
  NormalizationRule,
  SurvivorshipRule,
} from "@/domain/phase4";

/** Active initiative, falling back to the seeded BFSI flagship initiative — mirrors usePhase2. */
export const useActivePhase4InitiativeId = (): string => {
  const { activeInitiativeId } = useAxion();
  return activeInitiativeId ?? INITIATIVE_C360;
};

const useAudit = () => {
  const actor = useActor();
  const { activeClientId } = useAxion();
  const initiativeId = useActivePhase4InitiativeId();
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

const useInvalidatePhase4 = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      "connectivity-policy",
      "connectivity-assessments",
      "connectivity-decisions",
      "identity-policies",
      "identity-runs",
      "identity-exceptions",
      "identity-suggestions",
      "adrs",
      "activity",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

/* ----------------------------- connectivity -------------------------------- */

export const useConnectivityPolicy = (clientId: string) =>
  useQuery({ queryKey: ["connectivity-policy", clientId], queryFn: () => connectivityService.getPolicy(clientId) });

export const useSaveConnectivityPolicy = () => {
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (policy: ConnectivityPolicy) => {
      const saved = await connectivityService.savePolicy(policy);
      await audit({
        action: "connectivity.policy.saved",
        objectType: "connectivity-policy",
        objectId: saved.clientId,
        summary: `Weights and minimum confidence updated for ${saved.clientId}`,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useConnectivityAssessments = (initiativeId: string) =>
  useQuery({
    queryKey: ["connectivity-assessments", initiativeId],
    queryFn: () => connectivityService.listAssessments(initiativeId),
  });

export const useCreateConnectivityAssessment = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (
      input: Pick<ConnectivityAssessment, "initiativeId" | "sourceSystemId" | "dataProductId" | "name"> &
        Partial<Pick<ConnectivityAssessment, "answers" | "sourceObjectId">>,
    ) => {
      const created = await connectivityService.createAssessment(input, actor);
      await audit({
        action: "connectivity.assessment.created",
        objectType: "connectivity-assessment",
        objectId: created.id,
        summary: `${created.name} assessment started`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateConnectivityAssessment = () => {
  const actor = useActor();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: (input: { id: string; patch: Partial<ConnectivityAssessment> }) =>
      connectivityService.updateAssessment(input.id, input.patch, actor),
    onSuccess: invalidate,
  });
};

export const useConnectivityDecisions = (initiativeId: string) =>
  useQuery({
    queryKey: ["connectivity-decisions", initiativeId],
    queryFn: () => connectivityService.listDecisions(initiativeId),
  });

/** Runs the deterministic scoring engine. Kept as a hook so pages can memoise consistently, but the
 * computation itself is synchronous and side-effect free. */
export const useConnectivityEvaluation = (
  assessment: ConnectivityAssessment | undefined,
  policy: ConnectivityPolicy | undefined,
  platform?: string,
) => (assessment ? evaluateConnectivity(assessment, { policy, platform }) : undefined);

export const useDecideConnectivity = () => {
  const actor = useActor();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: (ctx: ConnectivityAdrContext) => acceptOrOverrideConnectivityDecision(ctx, actor),
    onSuccess: invalidate,
  });
};

/* ------------------------------- identity ----------------------------------- */

export const useIdentityPolicies = (initiativeId: string) =>
  useQuery({ queryKey: ["identity-policies", initiativeId], queryFn: () => identityService.listPolicies(initiativeId) });

export const useCreateIdentityPolicyFromTemplate = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (input: { templateId: string; initiativeId: string }) => {
      const created = await identityService.createFromTemplate(input.templateId, input.initiativeId, actor);
      await audit({
        action: "identity.policy.created",
        objectType: "identity-policy",
        objectId: created.id,
        summary: `${created.name} policy created from template`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateIdentityPolicy = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<IdentityPolicy>; summary: string }) => {
      const updated = await identityService.updatePolicy(input.id, input.patch, actor);
      await audit({
        action: "identity.policy.updated",
        objectType: "identity-policy",
        objectId: updated.id,
        summary: input.summary,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useUpsertNormalizationRule = () => {
  const update = useUpdateIdentityPolicy();
  return {
    ...update,
    mutate: (input: { policy: IdentityPolicy; rule: NormalizationRule }) => {
      const exists = input.policy.normalizationRules.some((entry) => entry.id === input.rule.id);
      const normalizationRules = exists
        ? input.policy.normalizationRules.map((entry) => (entry.id === input.rule.id ? input.rule : entry))
        : [...input.policy.normalizationRules, input.rule];
      update.mutate({
        id: input.policy.id,
        patch: { normalizationRules },
        summary: `Normalisation rule ${input.rule.field} ${exists ? "updated" : "added"}`,
      });
    },
  };
};

export const useUpsertMatchRule = () => {
  const update = useUpdateIdentityPolicy();
  return {
    ...update,
    mutate: (input: { policy: IdentityPolicy; rule: MatchRule }) => {
      const exists = input.policy.matchRules.some((entry) => entry.id === input.rule.id);
      const matchRules = exists
        ? input.policy.matchRules.map((entry) => (entry.id === input.rule.id ? input.rule : entry))
        : [...input.policy.matchRules, input.rule];
      update.mutate({
        id: input.policy.id,
        patch: { matchRules },
        summary: `Match rule ${input.rule.name} ${exists ? "updated" : "added"}`,
      });
    },
  };
};

export const useUpsertSurvivorshipRule = () => {
  const update = useUpdateIdentityPolicy();
  return {
    ...update,
    mutate: (input: { policy: IdentityPolicy; rule: SurvivorshipRule }) => {
      const exists = input.policy.survivorshipRules.some((entry) => entry.id === input.rule.id);
      const survivorshipRules = exists
        ? input.policy.survivorshipRules.map((entry) => (entry.id === input.rule.id ? input.rule : entry))
        : [...input.policy.survivorshipRules, input.rule];
      update.mutate({
        id: input.policy.id,
        patch: { survivorshipRules },
        summary: `Survivorship rule for ${input.rule.attribute} ${exists ? "updated" : "added"}`,
      });
    },
  };
};

export const useIdentityRuns = (initiativeId: string) =>
  useQuery({ queryKey: ["identity-runs", initiativeId], queryFn: () => identityService.listRuns(initiativeId) });

export const useRunIdentitySimulation = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (input: { policy: IdentityPolicy; setId: string; initiativeId: string; thresholdShift?: number }) => {
      const records = recordsForSet(input.setId);
      const run = runSimulation({
        policy: input.policy,
        records,
        setId: input.setId,
        initiativeId: input.initiativeId,
        runBy: actor.actor,
        thresholdShift: input.thresholdShift,
      });
      const saved = await identityService.saveRun(run);
      const exceptions = deriveExceptions(saved, input.policy, records);
      await identityService.addExceptions(exceptions);
      await audit({
        action: "identity.simulation.run",
        objectType: "identity-run",
        objectId: saved.id,
        summary: `${saved.matchedClusters} clusters, ${saved.autoMatched} auto-matched, ${exceptions.length} exceptions raised`,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useIdentityExceptions = (initiativeId: string) =>
  useQuery({
    queryKey: ["identity-exceptions", initiativeId],
    queryFn: () => identityService.listExceptions(initiativeId),
  });

export const useResolveIdentityException = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: ExceptionAction;
      status: ExceptionStatus;
      resolution: string;
      comment?: string;
    }) => {
      const updated = await identityService.resolveException(
        input.id,
        { action: input.action, status: input.status, resolution: input.resolution, comment: input.comment },
        actor,
      );
      await audit({
        action: `identity.exception.${input.status}`,
        objectType: "identity-exception",
        objectId: updated.id,
        summary: `${updated.type} — ${input.action} (${input.status})`,
        after: input.resolution,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useIdentitySuggestions = (initiativeId: string) =>
  useQuery({
    queryKey: ["identity-suggestions", initiativeId],
    queryFn: () => identityService.listSuggestions(initiativeId),
  });

export const useDecideIdentitySuggestion = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase4();
  return useMutation({
    mutationFn: async (input: {
      suggestion: IdentityAiSuggestion;
      status: Exclude<IdentityAiSuggestion["status"], "pending">;
      payload?: Record<string, unknown>;
    }) => {
      const updated = await identityService.decideSuggestion(input.suggestion.id, input.status, actor, input.payload);
      await audit({
        action: `ai.suggestion.${input.status}`,
        objectType: "identity-suggestion",
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
