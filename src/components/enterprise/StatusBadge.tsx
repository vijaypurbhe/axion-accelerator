import { Badge } from "@/components/ui/badge";
import type { EntityStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<EntityStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "in-review": "In review",
  approved: "Approved",
  blocked: "Blocked",
};

const STATUS_CLASS: Record<EntityStatus, string> = {
  "not-started": "border-border bg-surface text-muted-foreground",
  "in-progress": "border-brand/30 bg-brand/10 text-brand",
  "in-review": "border-warning/40 bg-warning/10 text-warning-foreground",
  approved: "border-success/30 bg-success/10 text-success",
  blocked: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const StatusBadge = ({ status, className }: { status: EntityStatus; className?: string }) => (
  <Badge variant="outline" className={cn("font-medium", STATUS_CLASS[status], className)}>
    {STATUS_LABEL[status]}
  </Badge>
);

export const Pill = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
      className,
    )}
  >
    {children}
  </span>
);
