import { Check, ChevronRight, Info, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePhoenix } from "@/context/PhoenixContext";
import { shortDate } from "@/lib/format";
import type { AIRecommendation } from "@/types";
import { ConfidenceTag, Pill, statusTone } from "./Primitives";

export function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const navigate = useNavigate();
  const { acceptRecommendation, dismissRecommendation, acceptedRecommendations, dismissedRecommendations, askAssistant } = usePhoenix();
  const accepted = acceptedRecommendations.includes(rec.id);
  const dismissed = dismissedRecommendations.includes(rec.id);

  return (
    <article className="card-surface card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={statusTone(rec.urgency)}>{rec.urgency}</Pill>
            <span className="text-xs text-muted-foreground">Due {shortDate(rec.dueDate)}</span>
          </div>
          <h3 className="mt-2.5 text-base font-semibold leading-snug text-foreground">{rec.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rec.detail}</p>
        </div>
        <ConfidenceTag value={rec.confidence} />
      </div>


      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="label-caps">Business impact</dt>
          <dd className="mt-0.5 text-sm text-foreground">{rec.impact}</dd>
        </div>
        <div>
          <dt className="label-caps">Recommended owner</dt>
          <dd className="mt-0.5 text-sm text-foreground">{rec.recommendedOwner}</dd>
        </div>
      </dl>

      <Collapsible className="mt-3">
        <CollapsibleTrigger className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
          <Info className="h-3.5 w-3.5" />
          Why this recommendation
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-md border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
          {rec.rationale}
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => navigate(rec.actionRoute)}>
          {rec.actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => acceptRecommendation(rec.id)}
          disabled={accepted}
        >
          <Check className="h-4 w-4" />
          {accepted ? "Accepted" : "Accept"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dismissRecommendation(rec.id)} disabled={dismissed}>
          <X className="h-4 w-4" />
          {dismissed ? "Dismissed" : "Dismiss"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => askAssistant({ prompt: `Explain the recommendation: ${rec.title}`, contextLabel: rec.title })}
        >
          Ask Phoenix
        </Button>
      </div>
    </article>
  );
}
