import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApprovalState, DataQualityState, RiskLevel } from "@/domain/models";

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "border-success/30 bg-success/10 text-success",
  medium: "border-warning/40 bg-warning/10 text-warning-foreground",
  high: "border-primary/30 bg-primary/10 text-primary",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const RiskBadge = ({ level, className }: { level: RiskLevel; className?: string }) => (
  <Badge variant="outline" className={cn("font-medium", RISK_CLASS[level], className)}>
    {RISK_LABEL[level]} risk
  </Badge>
);

const APPROVAL_LABEL: Record<ApprovalState, string> = {
  "not-required": "Not required",
  draft: "Draft",
  submitted: "Awaiting decision",
  approved: "Approved",
  rejected: "Rejected",
};

const APPROVAL_CLASS: Record<ApprovalState, string> = {
  "not-required": "border-border bg-surface text-muted-foreground",
  draft: "border-border bg-surface text-muted-foreground",
  submitted: "border-warning/40 bg-warning/10 text-warning-foreground",
  approved: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const ApprovalBadge = ({ state, className }: { state: ApprovalState; className?: string }) => (
  <Badge variant="outline" className={cn("font-medium", APPROVAL_CLASS[state], className)}>
    {APPROVAL_LABEL[state]}
  </Badge>
);

const QUALITY_LABEL: Record<DataQualityState, string> = {
  unknown: "Not profiled",
  healthy: "Healthy",
  watch: "Watch",
  breach: "Breach",
};

const QUALITY_CLASS: Record<DataQualityState, string> = {
  unknown: "border-border bg-surface text-muted-foreground",
  healthy: "border-success/30 bg-success/10 text-success",
  watch: "border-warning/40 bg-warning/10 text-warning-foreground",
  breach: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const DataQualityBadge = ({ state, className }: { state: DataQualityState; className?: string }) => (
  <Badge variant="outline" className={cn("font-medium", QUALITY_CLASS[state], className)}>
    {QUALITY_LABEL[state]}
  </Badge>
);

export const AiSuggestedBadge = ({ className }: { className?: string }) => (
  <Badge
    variant="outline"
    className={cn("border-brand-blue/30 bg-brand-blue/10 font-medium text-brand-blue", className)}
  >
    AI Suggested
  </Badge>
);

export const MetaPill = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
      className,
    )}
  >
    {children}
  </span>
);
