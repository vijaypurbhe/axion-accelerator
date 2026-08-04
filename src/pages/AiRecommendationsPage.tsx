import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { AiSuggestionCard } from "@/components/enterprise/AiSuggestionCard";
import { useAxion } from "@/context/AxionContext";
import { useSuggestionDecision, useSuggestions } from "@/hooks/useAxionData";

const AiRecommendationsPage = () => {
  const { activeTenantId } = useAxion();
  const suggestionsQuery = useSuggestions(activeTenantId);
  const decision = useSuggestionDecision();

  const suggestions = suggestionsQuery.data ?? [];
  const pending = suggestions.filter((item) => item.status === "pending");
  const decided = suggestions.filter((item) => item.status !== "pending");

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="AI recommendations"
        description="Every AI suggestion is labelled, explained, scored where possible, and requires an explicit human decision that is written to the audit trail."
      />

      {suggestionsQuery.isLoading ? (
        <LoadingState label="Loading recommendations" />
      ) : suggestionsQuery.isError ? (
        <ErrorState message="Recommendations could not be loaded." onRetry={() => void suggestionsQuery.refetch()} />
      ) : (
        <>
          <SectionCard title={`Awaiting decision (${pending.length})`}>
            {pending.length === 0 ? (
              <EmptyState
                title="Nothing awaiting decision"
                message="New recommendations appear here as stage workbenches generate them."
              />
            ) : (
              <div className="space-y-3">
                {pending.map((suggestion) => (
                  <AiSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    disabled={decision.isPending}
                    onDecide={({ status, editedValue }) => decision.mutate({ suggestion, status, editedValue })}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Decision history (${decided.length})`}>
            {decided.length === 0 ? (
              <EmptyState title="No decisions recorded" message="Accepted, edited and rejected suggestions are listed here." />
            ) : (
              <div className="space-y-3">
                {decided.map((suggestion) => (
                  <AiSuggestionCard key={suggestion.id} suggestion={suggestion} onDecide={() => undefined} />
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
};

export default AiRecommendationsPage;
