import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAxion } from "@/context/AxionContext";
import {
  useAgentDesigns,
  useApprovals,
  useArtifacts,
  useAssessmentScores,
  useConnections,
  useDataProducts,
  useDecisions,
  useInitiatives,
  useRisks,
} from "@/hooks/useWorkspace";
import type { PersonaId } from "@/domain/types";
import { trackFor, type ChecklistStep, type WorkspaceSignals } from "./checklists";

export interface OnboardingState {
  readonly chosenRole: PersonaId | null;
  readonly wizardStep: number;
  readonly wizardComplete: boolean;
  readonly completedSteps: readonly string[];
  readonly checklistDismissed: boolean;
}

const EMPTY: OnboardingState = {
  chosenRole: null,
  wizardStep: 0,
  wizardComplete: false,
  completedSteps: [],
  checklistDismissed: false,
};

const ONBOARDING_KEY = ["onboarding"] as const;

/** Reads the signed-in user's onboarding record; absent record means first run. */
export const useOnboardingState = () => {
  const { userId } = useAxion();
  return useQuery({
    queryKey: [...ONBOARDING_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<OnboardingState> => {
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return EMPTY;
      const row = data as Record<string, unknown>;
      return {
        chosenRole: (row.chosen_role as PersonaId | null) ?? null,
        wizardStep: Number(row.wizard_step ?? 0),
        wizardComplete: Boolean(row.wizard_complete),
        completedSteps: (row.completed_steps as string[] | null) ?? [],
        checklistDismissed: Boolean(row.checklist_dismissed),
      };
    },
  });
};

export const useSaveOnboardingState = () => {
  const { userId } = useAxion();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<OnboardingState>) => {
      if (!userId) return;
      const payload: Record<string, unknown> = { user_id: userId };
      if (patch.chosenRole !== undefined) payload.chosen_role = patch.chosenRole;
      if (patch.wizardStep !== undefined) payload.wizard_step = patch.wizardStep;
      if (patch.wizardComplete !== undefined) payload.wizard_complete = patch.wizardComplete;
      if (patch.completedSteps !== undefined) payload.completed_steps = patch.completedSteps;
      if (patch.checklistDismissed !== undefined) payload.checklist_dismissed = patch.checklistDismissed;
      const { error } = await supabase.from("user_onboarding").upsert(payload, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [...ONBOARDING_KEY, userId] });
    },
  });
};

/** Live content counts used to auto-tick checklist steps. */
export const useWorkspaceSignals = (): WorkspaceSignals => {
  const { activeClientId, activeInitiativeId } = useAxion();
  const initiativeId = activeInitiativeId ?? undefined;
  const initiatives = useInitiatives(activeClientId);
  const scores = useAssessmentScores(initiativeId);
  const products = useDataProducts(initiativeId);
  const connections = useConnections(initiativeId);
  const decisions = useDecisions(initiativeId);
  const risks = useRisks(initiativeId);
  const approvals = useApprovals(initiativeId);
  const agents = useAgentDesigns(initiativeId);
  const artifacts = useArtifacts(initiativeId);

  return useMemo(
    () => ({
      initiatives: initiatives.data?.length ?? 0,
      assessmentScores: scores.data?.length ?? 0,
      dataProducts: products.data?.length ?? 0,
      connections: connections.data?.length ?? 0,
      decisions: decisions.data?.length ?? 0,
      risks: risks.data?.length ?? 0,
      approvals: approvals.data?.length ?? 0,
      agents: agents.data?.length ?? 0,
      artifacts: artifacts.data?.length ?? 0,
    }),
    [
      initiatives.data,
      scores.data,
      products.data,
      connections.data,
      decisions.data,
      risks.data,
      approvals.data,
      agents.data,
      artifacts.data,
    ],
  );
};

export interface ResolvedStep extends ChecklistStep {
  readonly done: boolean;
  readonly current: boolean;
}

/** Resolves the role track into ordered steps with the next action highlighted. */
export const useRoleChecklist = (role: PersonaId) => {
  const signals = useWorkspaceSignals();
  const { data: state } = useOnboardingState();
  const manual = state?.completedSteps ?? [];
  const track = trackFor(role);

  const steps: ResolvedStep[] = [];
  let currentAssigned = false;
  for (const step of track.steps) {
    const done = manual.includes(step.id) || step.isDone(signals);
    const current = !done && !currentAssigned;
    if (current) currentAssigned = true;
    steps.push({ ...step, done, current });
  }
  const completed = steps.filter((step) => step.done).length;

  return {
    headline: track.headline,
    steps,
    completed,
    total: steps.length,
    percent: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
};
