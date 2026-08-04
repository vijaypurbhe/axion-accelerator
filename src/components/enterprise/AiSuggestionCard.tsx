import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getStage } from "@/domain/catalogs";
import type { AiSuggestion } from "@/domain/types";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AiSuggestionCardProps {
  suggestion: AiSuggestion;
  disabled?: boolean;
  onDecide: (decision: { status: "accepted" | "edited" | "rejected"; editedValue?: unknown }) => void;
}

const asText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

const STATUS_STYLES: Record<AiSuggestion["status"], string> = {
  pending: "border-brand/30 bg-brand/10 text-brand",
  accepted: "border-success/30 bg-success/10 text-success",
  edited: "border-warning/40 bg-warning/10 text-warning-foreground",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
};

/**
 * Every AI recommendation in Axion renders through this card: it always shows the
 * "AI Suggested" label, the rationale, confidence when available, and requires an
 * explicit accept / edit / reject decision.
 */
export const AiSuggestionCard = ({ suggestion, disabled, onDecide }: AiSuggestionCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => asText(suggestion.value));
  const stage = getStage(suggestion.stage);
  const decided = suggestion.status !== "pending";

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
              AI Suggested
            </Badge>
            {stage ? <Badge variant="outline">{stage.name}</Badge> : null}
            {decided ? (
              <Badge variant="outline" className={cn(STATUS_STYLES[suggestion.status])}>
                {suggestion.status}
              </Badge>
            ) : null}
          </div>
          <h3 className="text-sm font-semibold text-foreground">{suggestion.title}</h3>
        </div>
        {typeof suggestion.confidence === "number" ? (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Confidence</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {Math.round(suggestion.confidence * 100)}%
            </p>
          </div>
        ) : null}
      </div>

      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggested value</dt>
          <dd className="mt-1">
            {editing ? (
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                aria-label="Edit suggested value"
                className="font-mono text-xs"
              />
            ) : (
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground">
                {asText(suggestion.value)}
              </pre>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Rationale</dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{suggestion.rationale}</dd>
        </div>
      </dl>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          {decided && suggestion.decidedAt
            ? `Decided ${dateTime(suggestion.decidedAt)}`
            : `Generated ${dateTime(suggestion.createdAt)}`}
        </p>
        {decided ? null : (
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={disabled}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => onDecide({ status: "edited", editedValue: draft })} disabled={disabled}>
                  Save and accept
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDecide({ status: "rejected" })}
                  disabled={disabled}
                >
                  <X className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={disabled}>
                  <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Edit
                </Button>
                <Button size="sm" onClick={() => onDecide({ status: "accepted" })} disabled={disabled}>
                  <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Accept
                </Button>
              </>
            )}
          </div>
        )}
      </footer>
    </article>
  );
};
