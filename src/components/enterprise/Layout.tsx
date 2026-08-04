import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) => (
  <header className={cn("flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5", className)}>
    <div className="max-w-3xl space-y-1.5">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </header>
);

export const SectionCard = ({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn("rounded-xl border border-border bg-card shadow-card", className)}>
    {title ? (
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    ) : null}
    <div className="p-5">{children}</div>
  </section>
);

export const StatTile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4 shadow-card">
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

export const KeyValue = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="space-y-1">
    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{value}</dd>
  </div>
);
