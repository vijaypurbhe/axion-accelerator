import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RiskBadge } from "@/components/enterprise/Badges";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import { roleLabelFor } from "@/services/workspace";
import type { AxionRecommendation, RecommendationStatus } from "@/domain/phase2";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<RecommendationStatus, string> = {
  pending: "border-brand/40 bg-brand/5 text-brand",
  accepted: "border-success/30 bg-success/10 text-success",
  edited: "border-accent/40 bg-accent/10 text-accent-foreground",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

export interface RecommendationCardProps {
  recommendation: AxionRecommendation;
  onDecide: (input: { status: Exclude<RecommendationStatus, "pending">; editedText?: string }) => void;
  disabled?: boolean;
}

/**
 * Renders an AI suggestion with rationale, confidence and mandatory human decision.
 * Every decision is written to the audit trail by the calling hook.
 */
export const RecommendationCard = ({ recommendation, onDecide, disabled }: RecommendationCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(recommendation.editedText ?? recommendation.title);
  const stage = LIFECYCLE_STAGES.find((entry) => entry.id === recommendation.stage);
  const decided = recommendation.status !== "pending";

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-brand/40 bg-brand/5 font-medium text-brand">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden /> AI Suggested
            </Badge>
            <Badge variant="outline" className={cn("font-medium capitalize", STATUS_CLASS[recommendation.status])}>
              {recommendation.status}
            </Badge>
            <RiskBadge level={recommendation.urgency} />
            <span className="text-xs text-muted-foreground">
              Confidence {Math.round(recommendation.confidence * 100)}%
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {recommendation.editedText ?? recommendation.title}
          </h3>
        </div>
      </header>

      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium uppercase tracking-wider text-muted-foreground">Identified gap</dt>
          <dd className="mt-0.5 text-foreground">{recommendation.gap}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wider text-muted-foreground">Impact</dt>
          <dd className="mt-0.5 text-foreground">{recommendation.impact}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium uppercase tracking-wider text-muted-foreground">Rationale</dt>
          <dd className="mt-0.5 text-muted-foreground">{recommendation.rationale}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wider text-muted-foreground">Suggested owner</dt>
          <dd className="mt-0.5 capitalize text-foreground">{roleLabelFor(recommendation.suggestedOwner)}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wider text-muted-foreground">Related stage</dt>
          <dd className="mt-0.5 text-foreground">{stage?.name ?? recommendation.stage}</dd>
        </div>
        {recommendation.useCases.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="font-medium uppercase tracking-wider text-muted-foreground">Affected use cases</dt>
            <dd className="mt-0.5 text-foreground">{recommendation.useCases.join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onDecide({ status: "edited", editedText: draft });
                setEditing(false);
              }}
            >
              Save edited recommendation
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <footer className="mt-4 flex flex-wrap items-center gap-2">
          {decided ? (
            <p className="text-xs text-muted-foreground">
              {recommendation.status} by {recommendation.decidedBy} · recorded in the audit trail
            </p>
          ) : (
            <>
              <Button size="sm" disabled={disabled} onClick={() => onDecide({ status: "accepted" })}>
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Accept
              </Button>
              <Button size="sm" variant="outline" disabled={disabled} onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => onDecide({ status: "rejected" })}
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Reject
              </Button>
            </>
          )}
        </footer>
      )}
    </article>
  );
};

export default RecommendationCard;
