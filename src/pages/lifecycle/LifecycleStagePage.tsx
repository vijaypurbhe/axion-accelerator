import { useParams, Navigate } from "react-router-dom";
import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { EmptyState, LoadingState, ErrorState } from "@/components/enterprise/States";
import { LifecycleStepper } from "@/components/enterprise/LifecycleStepper";
import { AiSuggestionCard } from "@/components/enterprise/AiSuggestionCard";
import { Pill } from "@/components/enterprise/StatusBadge";
import { getStage, LIFECYCLE_STAGES, PERSONAS } from "@/domain/catalogs";
import type { LifecycleStageId } from "@/domain/types";
import { useAxion } from "@/context/AxionContext";
import { usePrograms, useSuggestionDecision, useSuggestions } from "@/hooks/useAxionData";

const isStageId = (value: string | undefined): value is LifecycleStageId =>
  LIFECYCLE_STAGES.some((stage) => stage.id === value);

const LifecycleStagePage = () => {
  const { stageId } = useParams<{ stageId: string }>();
  const { activeTenantId } = useAxion();
  const programsQuery = usePrograms(activeTenantId);
  const suggestionsQuery = useSuggestions(activeTenantId);
  const decision = useSuggestionDecision();

  if (!isStageId(stageId)) return <Navigate to="/lifecycle/discover" replace />;

  const stage = getStage(stageId);
  const owners = PERSONAS.filter((persona) => persona.stages.includes(stageId));
  const stageSuggestions = (suggestionsQuery.data ?? []).filter((item) => item.stage === stageId);
  const program = programsQuery.data?.[0];

  return (
    <>
      <PageHeader
        eyebrow={`Lifecycle stage ${stage?.order} of ${LIFECYCLE_STAGES.length}`}
        title={stage?.name ?? "Stage"}
        description={stage?.purpose}
      />

      <SectionCard title="Lifecycle position">
        <LifecycleStepper currentStage={stageId} />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Accountable personas" description="Primary owners for this stage.">
          <ul className="space-y-3">
            {owners.map((persona) => (
              <li key={persona.id} className="rounded-lg border border-border bg-surface/60 p-3">
                <p className="text-sm font-medium text-foreground">{persona.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{persona.summary}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="AI suggested inputs"
          description="Each recommendation must be accepted, edited or rejected before it affects the blueprint."
        >
          {suggestionsQuery.isLoading ? (
            <LoadingState label="Loading recommendations" rows={2} />
          ) : suggestionsQuery.isError ? (
            <ErrorState message="Recommendations could not be loaded." onRetry={() => void suggestionsQuery.refetch()} />
          ) : stageSuggestions.length === 0 ? (
            <EmptyState
              title="No recommendations for this stage yet"
              message="Recommendations appear here once the stage workbench for this phase is enabled."
            />
          ) : (
            <div className="space-y-3">
              {stageSuggestions.map((suggestion) => (
                <AiSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  disabled={decision.isPending}
                  onDecide={({ status, editedValue }) =>
                    decision.mutate({ suggestion, status, editedValue })
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Stage workbench"
        description={`Delivered in Axion phase ${stage?.deliveredInPhase ?? "—"}.`}
      >
        <EmptyState
          title={`${stage?.name} workbench not yet enabled`}
          message={
            program
              ? `Foundation is in place for ${program.name}. The detailed ${stage?.name.toLowerCase()} workbench is delivered in a later Axion phase.`
              : "Select a client with an active program to work in this stage."
          }
          action={<Pill>Phase {stage?.deliveredInPhase} scope</Pill>}
        />
      </SectionCard>
    </>
  );
};

export default LifecycleStagePage;
