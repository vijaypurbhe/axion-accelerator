import { Check } from "lucide-react";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import type { LifecycleStageId } from "@/domain/types";
import { cn } from "@/lib/utils";

/**
 * Compact lifecycle stepper for Discover → Improve.
 * Stages before the active stage render as complete.
 */
export const StageStepper = ({
  current,
  onSelect,
  className,
}: {
  current: LifecycleStageId;
  onSelect?: (stage: LifecycleStageId) => void;
  className?: string;
}) => {
  const currentOrder = LIFECYCLE_STAGES.find((stage) => stage.id === current)?.order ?? 1;

  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {LIFECYCLE_STAGES.map((stage) => {
        const state = stage.order < currentOrder ? "complete" : stage.order === currentOrder ? "active" : "pending";
        const content = (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              state === "complete" && "border-success/30 bg-success/10 text-success",
              state === "active" && "border-primary bg-primary text-primary-foreground",
              state === "pending" && "border-border bg-surface text-muted-foreground",
              onSelect && "cursor-pointer hover:border-primary/50",
            )}
          >
            {state === "complete" ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <span className="tabular-nums opacity-70">{stage.order}</span>
            )}
            {stage.name}
          </span>
        );

        return (
          <li key={stage.id} aria-current={state === "active" ? "step" : undefined}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(stage.id)} aria-label={`Set stage to ${stage.name}`}>
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default StageStepper;
