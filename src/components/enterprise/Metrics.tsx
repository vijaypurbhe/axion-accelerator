import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const MetricCard = ({
  label,
  value,
  hint,
  delta,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; direction: "up" | "down" };
  icon?: ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-xl border border-border bg-card p-4 shadow-card", className)}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
    </div>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    <div className="mt-1 flex items-center gap-2">
      {delta ? (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium",
            delta.direction === "up" ? "text-success" : "text-destructive",
          )}
        >
          {delta.direction === "up" ? (
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3 w-3" aria-hidden />
          )}
          {delta.value}
        </span>
      ) : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  </div>
);

export const ProgressCard = ({
  label,
  value,
  target,
  caption,
  className,
}: {
  label: string;
  value: number;
  target?: number;
  caption?: string;
  className?: string;
}) => (
  <div className={cn("rounded-xl border border-border bg-card p-4 shadow-card", className)}>
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {value}%{typeof target === "number" ? <span className="text-muted-foreground"> / {target}%</span> : null}
      </p>
    </div>
    <Progress value={value} className="mt-3 h-2" />
    {caption ? <p className="mt-2 text-xs text-muted-foreground">{caption}</p> : null}
  </div>
);

export const SectionHeader = ({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
    <div className="space-y-1">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </div>
);
