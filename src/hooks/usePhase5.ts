import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { activityService } from "@/services/workspace";
import {
  controlService,
  controlTestService,
  evidenceService,
  gateWaiverService,
  governanceService,
  riskService,
} from "@/services/phase5";
import {
  buildTrustPosture,
  evaluateApplicability,
  evaluateControlEffectiveness,
  evaluateTrustGate,
} from "@/services/trustEngine";
import { INITIATIVE_C360 } from "@/data/bfsiSeed";
import type {
  ApplicabilityDecision,
  ApplicabilityProfile,
  ControlInstance,
  ControlTest,
  EvidenceRecord,
  GovernanceBody,
  RaciEntry,
  RiskAcceptance,
  RiskEntry,
  TrustPosture,
} from "@/domain/phase5";
import type { LifecycleStageId } from "@/domain/types";

/** Active initiative, falling back to the seeded BFSI flagship initiative — mirrors usePhase2/4. */
export const useActivePhase5InitiativeId = (): string => {
  const { activeInitiativeId } = useAxion();
  return activeInitiativeId ?? INITIATIVE_C360;
};

const useAudit = () => {
  const actor = useActor();
  const { activeClientId } = useAxion();
  const initiativeId = useActivePhase5InitiativeId();
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

const useInvalidatePhase5 = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      "trust-instances",
      "trust-profile",
      "trust-evidence",
      "trust-tests",
      "governance-bodies",
      "governance-raci",
      "trust-risks",
      "trust-waivers",
      "activity",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

/* ------------------------------- queries ----------------------------------- */

export const useControlInstances = (initiativeId: string) =>
  useQuery({ queryKey: ["trust-instances", initiativeId], queryFn: () => controlService.listInstances(initiativeId) });

export const useApplicabilityProfile = (initiativeId: string) =>
  useQuery({ queryKey: ["trust-profile", initiativeId], queryFn: () => controlService.getProfile(initiativeId) });

export const useEvidence = (initiativeId: string) =>
  useQuery({ queryKey: ["trust-evidence", initiativeId], queryFn: () => evidenceService.list(initiativeId) });

export const useControlTests = (initiativeId: string) =>
  useQuery({ queryKey: ["trust-tests", initiativeId], queryFn: () => controlTestService.list(initiativeId) });

export const useGovernanceBodies = (clientId: string) =>
  useQuery({ queryKey: ["governance-bodies", clientId], queryFn: () => governanceService.listBodies(clientId) });

export const useRaciMatrix = (clientId: string) =>
  useQuery({ queryKey: ["governance-raci", clientId], queryFn: () => governanceService.listRaci(clientId) });

export const useTrustRisks = (initiativeId: string) =>
  useQuery({ queryKey: ["trust-risks", initiativeId], queryFn: () => riskService.list(initiativeId) });

export const useGateWaivers = (initiativeId: string) =>
  useQuery({ queryKey: ["trust-waivers", initiativeId], queryFn: () => gateWaiverService.list(initiativeId) });

/** Deterministic applicability suggestions for the current profile. */
export const useApplicabilitySuggestions = (profile: ApplicabilityProfile | undefined) =>
  useMemo(() => (profile ? evaluateApplicability(profile) : []), [profile]);

/* ------------------------------ mutations ---------------------------------- */

export const useSaveApplicabilityProfile = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (profile: ApplicabilityProfile) => {
      const saved = await controlService.saveProfile(profile, actor);
      const suggestions = evaluateApplicability(saved);
      await controlService.syncSuggestions(
        saved.initiativeId,
        suggestions.map((s) => ({
          controlId: s.controlId,
          origin: s.origin,
          confidence: s.confidence,
          rationale: s.rationale,
        })),
      );
      await audit({
        action: "trust.applicability.assessed",
        objectType: "applicability-profile",
        objectId: saved.initiativeId,
        summary: `Applicability profile saved — ${suggestions.length} controls suggested`,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useDecideControlApplicability = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: {
      instance: ControlInstance;
      decision: Exclude<ApplicabilityDecision, "pending">;
      notes?: string;
    }) => {
      const updated = await controlService.updateInstance(
        input.instance.id,
        {
          applicability: input.decision,
          notes: input.notes ?? input.instance.notes,
          designStatus: input.decision === "rejected" ? "not-applicable" : input.instance.designStatus,
          decidedBy: actor.actor,
          decidedAt: new Date().toISOString(),
        },
        actor,
      );
      await audit({
        action: `ai.suggestion.${input.decision}`,
        objectType: "control-instance",
        objectId: updated.controlId,
        summary: `${updated.controlId} applicability ${input.decision} (${updated.origin}, ${updated.confidence ?? 0}% confidence)`,
        before: input.instance.applicability,
        after: input.decision,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateControlInstance = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ControlInstance>; summary: string }) => {
      const updated = await controlService.updateInstance(input.id, input.patch, actor);
      await audit({
        action: "trust.control.updated",
        objectType: "control-instance",
        objectId: updated.controlId,
        summary: input.summary,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useAddControlException = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: { id: string; controlId: string; justification: string; expiresOn: string }) => {
      const updated = await controlService.addException(
        input.id,
        {
          id: `exc-${Date.now().toString(36)}`,
          justification: input.justification,
          requestedBy: actor.actor,
          expiresOn: input.expiresOn,
          state: "requested",
        },
        actor,
      );
      await audit({
        action: "trust.control.exception.requested",
        objectType: "control-instance",
        objectId: input.controlId,
        summary: `Exception requested for ${input.controlId}`,
        after: input.justification,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useCreateEvidence = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: Omit<EvidenceRecord, "id" | "version" | "updatedAt" | "updatedBy">) => {
      const created = await evidenceService.create(input, actor);
      await audit({
        action: "trust.evidence.submitted",
        objectType: "control-evidence",
        objectId: created.id,
        summary: `${created.title} submitted for ${created.controlId}`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useReviewEvidence = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      outcome: NonNullable<EvidenceRecord["reviewOutcome"]>;
      comments?: string;
    }) => {
      const status: EvidenceRecord["status"] =
        input.outcome === "accepted" ? "accepted" : input.outcome === "rejected" ? "rejected" : "under-review";
      const updated = await evidenceService.update(input.id, { reviewOutcome: input.outcome, status, comments: input.comments }, actor);
      await audit({
        action: `trust.evidence.${input.outcome}`,
        objectType: "control-evidence",
        objectId: updated.id,
        summary: `${updated.title} — ${input.outcome}`,
        after: input.comments,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useCreateControlTest = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: Omit<ControlTest, "id" | "updatedAt" | "updatedBy">) => {
      const created = await controlTestService.create(input, actor);
      await audit({
        action: "trust.test.scheduled",
        objectType: "control-test",
        objectId: created.id,
        summary: `Test scheduled for ${created.controlId}`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateControlTest = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ControlTest>; summary: string }) => {
      const updated = await controlTestService.update(input.id, input.patch, actor);
      await audit({
        action: "trust.test.updated",
        objectType: "control-test",
        objectId: updated.id,
        summary: input.summary,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useCreateRisk = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: Omit<RiskEntry, "id" | "reference" | "createdAt" | "updatedAt" | "updatedBy">) => {
      const created = await riskService.create(input, actor);
      await audit({
        action: "risk.created",
        objectType: "risk",
        objectId: created.id,
        summary: `${created.reference} raised — ${created.statement}`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateRisk = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<RiskEntry>; summary: string }) => {
      const updated = await riskService.update(input.id, input.patch, actor);
      await audit({
        action: "risk.updated",
        objectType: "risk",
        objectId: updated.id,
        summary: input.summary,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useAcceptRisk = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: { risk: RiskEntry; justification: string; reviewOn: string }) => {
      const acceptance: RiskAcceptance = {
        acceptedBy: actor.actor,
        acceptedRole: actor.role,
        justification: input.justification,
        reviewOn: input.reviewOn,
        acceptedAt: new Date().toISOString(),
      };
      const updated = await riskService.update(input.risk.id, { acceptance, status: "accepted" }, actor);
      await audit({
        action: "risk.accepted",
        objectType: "risk",
        objectId: updated.id,
        summary: `${updated.reference} residual ${updated.residualRisk} risk accepted by ${actor.role}`,
        after: input.justification,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useSaveGovernanceBody = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (body: GovernanceBody) => {
      const saved = await governanceService.saveBody(body, actor);
      await audit({
        action: "governance.body.updated",
        objectType: "governance-body",
        objectId: saved.id,
        summary: `${saved.name} charter updated`,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useCreateGovernanceBody = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: Omit<GovernanceBody, "id" | "updatedAt" | "updatedBy">) => {
      const created = await governanceService.createBody(input, actor);
      await audit({
        action: "governance.body.created",
        objectType: "governance-body",
        objectId: created.id,
        summary: `${created.name} established`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useSaveRaciEntry = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (entry: RaciEntry) => {
      const saved = await governanceService.saveRaci(entry, actor);
      await audit({
        action: "governance.raci.updated",
        objectType: "raci-entry",
        objectId: saved.id,
        summary: `RACI updated for ${saved.activity}`,
      });
      return saved;
    },
    onSuccess: invalidate,
  });
};

export const useRequestGateWaiver = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: {
      initiativeId: string;
      stage: LifecycleStageId;
      blockerId: string;
      justification: string;
      expiresOn: string;
    }) => {
      const waiver = await gateWaiverService.request(input, actor);
      await audit({
        action: "gate.waiver.requested",
        objectType: "gate-waiver",
        objectId: waiver.id,
        summary: `Waiver requested for ${input.blockerId} at ${input.stage}`,
        after: input.justification,
      });
      return waiver;
    },
    onSuccess: invalidate,
  });
};

export const useDecideGateWaiver = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase5();
  return useMutation({
    mutationFn: async (input: { id: string; state: "approved" | "rejected" }) => {
      const waiver = await gateWaiverService.decide(input.id, input.state, actor);
      await audit({
        action: `gate.waiver.${input.state}`,
        objectType: "gate-waiver",
        objectId: waiver.id,
        summary: `Waiver for ${waiver.blockerId} ${input.state}`,
      });
      return waiver;
    },
    onSuccess: invalidate,
  });
};

/* --------------------------- derived read models ---------------------------- */

export interface TrustWorkspace {
  readonly instances: readonly ControlInstance[];
  readonly evidence: readonly EvidenceRecord[];
  readonly tests: readonly ControlTest[];
  readonly risks: readonly RiskEntry[];
  readonly posture: TrustPosture;
  readonly gate: ReturnType<typeof evaluateTrustGate>;
  readonly effectiveness: ReturnType<typeof evaluateControlEffectiveness>[];
  readonly isLoading: boolean;
  readonly isError: boolean;
}

/** Single composition point used by the Trust & Compliance and Governance & Risk pages. */
export const useTrustWorkspace = (initiativeId: string, stage: LifecycleStageId): TrustWorkspace => {
  const instances = useControlInstances(initiativeId);
  const evidence = useEvidence(initiativeId);
  const tests = useControlTests(initiativeId);
  const risks = useTrustRisks(initiativeId);
  const waivers = useGateWaivers(initiativeId);

  const instanceList = instances.data ?? [];
  const evidenceList = evidence.data ?? [];
  const testList = tests.data ?? [];
  const riskList = risks.data ?? [];
  const waivedBlockerIds = (waivers.data ?? []).filter((w) => w.state === "approved").map((w) => w.blockerId);

  const gate = useMemo(
    () =>
      evaluateTrustGate({
        stage,
        instances: instanceList,
        evidence: evidenceList,
        tests: testList,
        risks: riskList,
        waivedBlockerIds,
      }),
    [stage, instanceList, evidenceList, testList, riskList, waivedBlockerIds],
  );

  const posture = useMemo(
    () =>
      buildTrustPosture({
        instances: instanceList,
        evidence: evidenceList,
        tests: testList,
        risks: riskList,
        blockers: gate.blockers,
      }),
    [instanceList, evidenceList, testList, riskList, gate.blockers],
  );

  const effectiveness = useMemo(
    () => instanceList.map((instance) => evaluateControlEffectiveness(instance, evidenceList, testList)),
    [instanceList, evidenceList, testList],
  );

  return {
    instances: instanceList,
    evidence: evidenceList,
    tests: testList,
    risks: riskList,
    posture,
    gate,
    effectiveness,
    isLoading: instances.isLoading || evidence.isLoading || tests.isLoading || risks.isLoading,
    isError: instances.isError || evidence.isError || tests.isError || risks.isError,
  };
};
