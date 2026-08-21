import { Link } from "react-router-dom";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/enterprise/Layout";
import { cn } from "@/lib/utils";
import { getRole } from "@/domain/rbac";
import type { PersonaId } from "@/domain/types";
import { useOnboardingState, useRoleChecklist, useSaveOnboardingState } from "./useOnboarding";

/**
 * Persistent build-out path for the active persona. Steps tick themselves as real
 * workspace content lands, so the checklist doubles as a readiness indicator.
 */
export const RoleChecklist = ({ role }: { role: PersonaId }) => {
  const { headline, steps, completed, total, percent } = useRoleChecklist(role);
  const { data: state } = useOnboardingState();
  const save = useSaveOnboardingState();

  if (state?.checklistDismissed) return null;

  const roleName = getRole(role)?.name ?? role;

  return (
    <SectionCard
      title={`Your path as ${roleName}`}
      description={headline}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => save.mutate({ checklistDismissed: true })}
        >
          Hide
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={percent} className="h-2" />
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {completed} of {total} complete
          </span>
        </div>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border bg-surface px-3 py-2.5",
                step.current && "border-primary/50 bg-primary/[0.04]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done ? "bg-primary/10 text-primary" : "border border-border text-muted-foreground",
                )}
                aria-hidden
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    step.done ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{step.detail}</span>
              </span>
              {step.done ? (
                <Circle className="mt-1.5 h-3 w-3 shrink-0 fill-primary/20 text-primary/40" aria-hidden />
              ) : (
                <Button asChild size="sm" variant={step.current ? "default" : "outline"}>
                  <Link to={step.to}>
                    {step.current ? "Start" : "Open"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </SectionCard>
  );
};

export default RoleChecklist;
