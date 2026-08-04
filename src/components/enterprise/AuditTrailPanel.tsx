import { getPersona } from "@/domain/catalogs";
import type { AuditEntry } from "@/domain/types";
import { dateTime } from "@/lib/format";
import { EmptyState } from "./States";

export const AuditTrailPanel = ({ entries }: { entries: readonly AuditEntry[] }) => {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No audit activity yet"
        message="Decisions, edits and AI recommendation outcomes are recorded here as work progresses."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-foreground">{entry.summary}</p>
            <p className="text-xs text-muted-foreground">
              {getPersona(entry.persona)?.name ?? entry.persona} · {entry.actor} · {dateTime(entry.timestamp)}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {entry.action} · {entry.entityRef}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
};
