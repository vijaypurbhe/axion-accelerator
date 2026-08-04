import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePhoenix } from "@/context/PhoenixContext";
import { RecommendationService } from "@/services";
import { KpiCard, PageHeader, SectionCard } from "@/components/common/Primitives";
import { RecommendationCard } from "@/components/common/RecommendationCard";
import { personaKpis } from "@/lib/personaKpis";

export default function Home() {
  const { persona, dismissedRecommendations } = usePhoenix();
  const navigate = useNavigate();

  const kpis = useMemo(() => personaKpis(persona.homeKpis), [persona.homeKpis]);

  const recs = useMemo(
    () => RecommendationService.forPersona(persona.id).filter((r) => !dismissedRecommendations.includes(r.id)),
    [persona.id, dismissedRecommendations],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${persona.title} · ${persona.unit}`}
        title={`Good morning, ${persona.name.split(" ")[0]}`}
        description={persona.greeting}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            hint={k.hint}
            delta={k.delta}
            tone={k.tone}
            onClick={k.route ? () => navigate(k.route!) : undefined}
          />
        ))}
      </div>

      <SectionCard
        title="Recommended actions"
        description={`Prioritised for ${persona.title} · ${persona.focus}`}
      >
        {recs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open recommendations for this persona right now.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {recs.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
