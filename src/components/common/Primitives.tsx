import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-5 shadow-card">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-brand to-teal" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="label-caps mb-1.5">{eyebrow}</p>}
          <h1 className="text-[1.75rem] font-semibold leading-tight text-foreground">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card-surface overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/50 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}


const toneMap: Record<string, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  brand: "bg-teal-soft text-teal-soft-foreground border-teal/25",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
};

export type Tone = keyof typeof toneMap;

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", toneMap[tone], className)}>
      {children}
    </span>
  );
}

export const statusTone = (status: string): Tone => {
  const s = status.toLowerCase();
  if (["critical", "breach", "failed", "rejected", "overdue", "at risk", "high", "escalated"].some((k) => s.includes(k))) return "danger";
  if (["watch", "medium", "pending", "in review", "in progress", "retrying", "degraded", "elevated", "awaiting", "returned", "waiver"].some((k) => s.includes(k))) return "warning";
  if (["on track", "complete", "approved", "satisfied", "compliant", "healthy", "delivered", "resolved", "low", "met", "exceeding", "live", "passed"].some((k) => s.includes(k))) return "success";
  if (["new", "moderate", "acknowledged", "planned", "not started"].some((k) => s.includes(k))) return "info";
  return "neutral";
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Pill tone={statusTone(status)} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Pill>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "card-surface card-hover group relative w-full overflow-hidden p-5 text-left",
        onClick && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-teal opacity-70" />
      <p className="label-caps">{label}</p>
      <p className="kpi-value mt-2.5 text-foreground">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {delta && <Pill tone={tone}>{delta}</Pill>}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Comp>
  );
}


export function MetricBar({ value, tone = "brand", label }: { value: number; tone?: Tone; label?: string }) {
  const bar: Record<string, string> = {
    neutral: "bg-muted-foreground",
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    info: "bg-info",
  };
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label && <span>{label}</span>}
        <span className="num font-medium text-foreground">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", bar[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="label-caps">{item.label}</dt>
          <dd className="mt-1 text-sm text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConfidenceTag({
  value,
  source,
  size = "lg",
}: {
  value: number;
  source?: string;
  size?: "sm" | "lg";
}) {
  const tone: Tone = value >= 90 ? "success" : value >= 75 ? "info" : "warning";
  const ring: Record<string, string> = {
    success: "text-success border-success/30 bg-success/10",
    info: "text-info border-info/30 bg-info/10",
    warning: "text-warning-foreground border-warning/40 bg-warning/15",
    neutral: "",
    brand: "",
    danger: "",
  };
  if (size === "sm") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1", ring[tone])}>
        <span className="num text-sm font-semibold leading-none">{value}%</span>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] opacity-80">conf.</span>
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex min-w-[6.75rem] shrink-0 flex-col items-center justify-center rounded-xl border px-3.5 py-2.5 text-center",
        ring[tone],
      )}
    >
      <span className="num text-2xl font-semibold leading-none tracking-[-0.02em]">{value}%</span>
      <span className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] opacity-80">Confidence</span>
      {source && <span className="mt-0.5 max-w-[9rem] text-[0.6875rem] leading-tight opacity-70">{source}</span>}
    </div>
  );


}
