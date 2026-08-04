import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import type { ActivityLog } from "@/domain/models";
import { getRole } from "@/domain/rbac";
import { EmptyState } from "./States";

export const ActivityTimeline = ({
  entries,
  className,
  emptyMessage = "No activity has been recorded for this workspace yet.",
}: {
  entries: readonly ActivityLog[];
  className?: string;
  emptyMessage?: string;
}) => {
  if (entries.length === 0) return <EmptyState title="No activity" message={emptyMessage} />;

  return (
    <ol className={cn("relative space-y-4 border-l border-border pl-5", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background"
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-medium text-foreground">{entry.status}</p>
            <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted-foreground">{entry.action}</code>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.actor} · {getRole(entry.role)?.name ?? entry.role} · {relativeTime(entry.timestamp)}
          </p>
          {entry.oldValueSummary || entry.newValueSummary ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="line-through">{entry.oldValueSummary ?? "—"}</span>
              {" → "}
              <span className="font-medium text-foreground">{entry.newValueSummary ?? "—"}</span>
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

export const TimelineShell = ({ children }: { children: ReactNode }) => (
  <div className="max-h-[420px] overflow-y-auto pr-2">{children}</div>
);
