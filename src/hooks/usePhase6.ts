import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { activityService } from "@/services/workspace";
import { agentDesignService } from "@/services/phase6";
import {
  analyseChangeImpact,
  buildTraceability,
  computeConsumption,
  diagnoseTopics,
  evaluateAgentReadiness,
  generateAgentSuggestions,
} from "@/services/agentforceEngine";
import { AGENT_PATTERNS, defaultConsumption, defaultInstructions } from "@/data/agentforceSeed";
import { INITIATIVE_C360 } from "@/data/bfsiSeed";
import type {
  AgentDesignRecord,
  AgentLifecycleStatus,
  AgentReview,
  AgentSuggestion,
  ConsumptionAssumptions,
} from "@/domain/phase6";

/** Active initiative, falling back to the seeded BFSI flagship initiative — mirrors usePhase2/4/5. */
export const useActivePhase6InitiativeId = (): string => {
  const { activeInitiativeId } = useAxion();
  return activeInitiativeId ?? INITIATIVE_C360;
};

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

const useInvalidatePhase6 = () => {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ["agents"] });
    void client.invalidateQueries({ queryKey: ["agent"] });
    void client.invalidateQueries({ queryKey: ["agent-suggestion-decisions"] });
    void client.invalidateQueries({ queryKey: ["activity"] });
  };
};

/* -------------------------------- queries ---------------------------------- */

export const useAgents = (initiativeId: string) =>
  useQuery({ queryKey: ["agents", initiativeId], queryFn: () => agentDesignService.list(initiativeId) });

export const useAgent = (agentId: string | undefined) =>
  useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => agentDesignService.get(agentId as string),
    enabled: Boolean(agentId),
  });

export const useSuggestionDecisions = (agentId: string | undefined) =>
  useQuery({
    queryKey: ["agent-suggestion-decisions", agentId],
    queryFn: () => agentDesignService.suggestionDecisions(agentId as string),
    enabled: Boolean(agentId),
  });

export const useAgentPatterns = () => AGENT_PATTERNS;

/* ------------------------------ derived views ------------------------------ */

export const useAgentReadiness = (agent: AgentDesignRecord | null | undefined) =>
  useMemo(() => (agent ? evaluateAgentReadiness(agent) : null), [agent]);

export const useTopicDiagnostics = (agent: AgentDesignRecord | null | undefined) =>
  useMemo(() => (agent ? diagnoseTopics(agent) : []), [agent]);

export const useAgentTraceability = (agent: AgentDesignRecord | null | undefined) =>
  useMemo(() => (agent ? buildTraceability(agent) : []), [agent]);

export const useAgentSuggestions = (agent: AgentDesignRecord | null | undefined) =>
  useMemo(() => (agent ? generateAgentSuggestions(agent) : []), [agent]);

export const useAgentChangeImpact = (agent: AgentDesignRecord | null | undefined) =>
  useMemo(() => (agent ? analyseChangeImpact(agent) : []), [agent]);

export const useConsumptionScenarios = (assumptions: ConsumptionAssumptions | undefined) =>
  useMemo(() => (assumptions ? computeConsumption(assumptions) : []), [assumptions]);

/** Portfolio roll-up across every agent in the initiative. */
export const useAgentPortfolioSummary = (agents: readonly AgentDesignRecord[] | undefined) =>
  useMemo(() => {
    const list = agents ?? [];
    const readiness = list.map((agent) => evaluateAgentReadiness(agent).overall);
    return {
      total: list.length,
      deployed: list.filter((a) => a.status === "deployed").length,
      inReview: list.filter((a) => a.status.endsWith("review")).length,
      blocked: list.filter((a) => evaluateAgentReadiness(a).blockers.length > 0).length,
      averageReadiness: readiness.length === 0 ? 0 : Math.round(readiness.reduce((a, b) => a + b, 0) / readiness.length),
      topics: list.reduce((sum, a) => sum + a.topics.length, 0),
      actions: list.reduce((sum, a) => sum + a.actions.length, 0),
      guardrails: list.reduce((sum, a) => sum + a.guardrails.length, 0),
    };
  }, [agents]);

/* -------------------------------- mutations -------------------------------- */

export interface NewAgentInput {
  readonly name: string;
  readonly description: string;
  readonly businessObjective: string;
  readonly businessOutcome: string;
  readonly targetPersona: string;
  readonly targetUsers: string;
  readonly domain: string;
  readonly useCase: string;
  readonly patternId: string;
  readonly channels: AgentDesignRecord["overview"]["channels"];
  readonly automationLevel: AgentDesignRecord["overview"]["automationLevel"];
  readonly environment: AgentDesignRecord["overview"]["environment"];
  readonly expectedVolume: string;
  readonly expectedBusinessImpact: string;
  readonly owner: AgentDesignRecord["overview"]["owner"];
}

export const useCreateAgent = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase6();
  const initiativeId = useActivePhase6InitiativeId();

  return useMutation({
    mutationFn: async (input: NewAgentInput) => {
      const created = await agentDesignService.create(
        {
          initiativeId,
          status: "draft",
          version: "0.1",
          release: "Unassigned",
          riskRating: "medium",
          testStatus: "not-started",
          lifecycleStage: "design",
          overview: {
            name: input.name,
            description: input.description,
            businessObjective: input.businessObjective,
            businessOutcome: input.businessOutcome,
            targetPersona: input.targetPersona,
            targetUsers: input.targetUsers,
            channels: input.channels,
            industry: "BFSI",
            domain: input.domain,
            useCase: input.useCase,
            patternId: input.patternId,
            owner: input.owner,
            environment: input.environment,
            languages: ["English (US)"],
            hoursOfOperation: "24x7",
            automationLevel: input.automationLevel,
            expectedVolume: input.expectedVolume,
            expectedBusinessImpact: input.expectedBusinessImpact,
            successMetrics: [],
            outOfScope: [],
            adoptionTarget: 60,
          },
          topics: [],
          actions: [],
          grounding: [],
          instructions: defaultInstructions(),
          guardrails: [],
          escalations: [],
          boundaries: [],
          consumption: defaultConsumption(),
          testCases: [],
          backlog: [],
          monitoring: [],
          reviews: [],
          versions: [],
          linkedRiskIds: [],
          linkedDecisionIds: [],
        },
        actor,
      );
      await audit({
        action: "agentforce.agent.created",
        objectType: "agent-design",
        objectId: created.id,
        summary: `Agent "${created.overview.name}" created from the ${input.patternId} pattern`,
      });
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateAgent = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase6();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<AgentDesignRecord>; summary: string }) => {
      const updated = await agentDesignService.update(input.id, input.patch, actor);
      await audit({
        action: "agentforce.agent.updated",
        objectType: "agent-design",
        objectId: updated.id,
        summary: input.summary,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useAdvanceAgentStatus = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase6();
  return useMutation({
    mutationFn: async (input: { agent: AgentDesignRecord; status: AgentLifecycleStatus }) => {
      const updated = await agentDesignService.update(input.agent.id, { status: input.status }, actor);
      await audit({
        action: "agentforce.agent.status-changed",
        objectType: "agent-design",
        objectId: updated.id,
        summary: `${updated.overview.name} moved to ${input.status}`,
        before: input.agent.status,
        after: input.status,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useSnapshotAgentVersion = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase6();
  return useMutation({
    mutationFn: async (input: { agent: AgentDesignRecord; version: string; summary: string }) => {
      const updated = await agentDesignService.snapshotVersion(input.agent.id, input.version, input.summary, actor);
      await audit({
        action: "agentforce.agent.version-snapshot",
        objectType: "agent-design",
        objectId: updated.id,
        summary: `Version ${input.version} captured — ${input.summary}`,
        before: input.agent.version,
        after: input.version,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useRecordAgentReview = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase6();
  return useMutation({
    mutationFn: async (input: { agent: AgentDesignRecord; review: AgentReview }) => {
      const updated = await agentDesignService.recordReview(input.agent.id, input.review, actor);
      await audit({
        action: `agentforce.review.${input.review.outcome}`,
        objectType: "agent-design",
        objectId: updated.id,
        summary: `${input.review.stage} outcome ${input.review.outcome} by ${input.review.reviewerRole}`,
      });
      return updated;
    },
    onSuccess: invalidate,
  });
};

export const useDecideAgentSuggestion = () => {
  const actor = useActor();
  const audit = useAudit();
  const invalidate = useInvalidatePhase6();
  return useMutation({
    mutationFn: async (input: {
      agent: AgentDesignRecord;
      suggestion: AgentSuggestion;
      decision: "accepted" | "edited" | "rejected";
    }) => {
      const recorded = await agentDesignService.decideSuggestion(
        input.agent.id,
        input.suggestion,
        input.decision,
        actor,
      );
      await audit({
        action: `ai.suggestion.${input.decision}`,
        objectType: "agent-suggestion",
        objectId: input.suggestion.id,
        summary: `${input.suggestion.title} ${input.decision} (${input.suggestion.origin}, ${Math.round(
          input.suggestion.confidence * 100,
        )}% confidence)`,
        after: input.decision,
      });
      return recorded;
    },
    onSuccess: invalidate,
  });
};
