import { Check } from "lucide-react";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import type { LifecycleStageId } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface LifecycleStepperProps {
  currentStage: LifecycleStageId;
  onSelect?: (stage: LifecycleStageId) => void;
  className?: string;
}

export const LifecycleStepper = ({ currentStage, onSelect, className }: LifecycleStepperProps) => {
  const currentOrder = LIFECYCLE_STAGES.find((s) => s.id === currentStage)?.order ?? 1;

  return (
    <ol className={cn("flex w-full items-stretch gap-1 overflow-x-auto", className)}>
      {LIFECYCLE_STAGES.map((stage) => {
        const done = stage.order < currentOrder;
        const active = stage.id === currentStage;
        return (
          <li key={stage.id} className="min-w-[7.5rem] flex-1">
            <button
              type="button"
              onClick={onSelect ? () => onSelect(stage.id) : undefined}
              aria-current={active ? "step" : undefined}
              className={cn(
                "group flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                onSelect ? "cursor-pointer hover:border-brand/40 hover:bg-brand/5" : "cursor-default",
                active
                  ? "border-primary/50 bg-primary/5"
                  : done
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-card",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-success text-success-foreground"
                        : "bg-surface text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : stage.order}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-semibold",
                    active ? "text-primary" : "text-foreground",
                  )}
                >
                  {stage.name}
                </span>
              </span>
              <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{stage.purpose}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};
