import { Link } from "react-router-dom";
import { Building2, GitBranch, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRole } from "@/domain/rbac";
import type { Client, Initiative, RoleId } from "@/domain/models";
import { MetaPill, RiskBadge } from "./Badges";

export const WorkspaceContextBanner = ({
  client,
  initiative,
  role,
  className,
}: {
  client?: Client | null;
  initiative?: Initiative | null;
  role: RoleId;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface/70 px-4 py-3",
      className,
    )}
  >
    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Building2 className="h-4 w-4 text-primary" aria-hidden />
      {client?.name ?? "No client selected"}
    </span>
    {client ? (
      <MetaPill>
        {client.industry} · {client.subsegments.join(" / ")}
      </MetaPill>
    ) : null}
    {initiative ? (
      <>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
        <Link
          to={`/initiatives/${initiative.id}`}
          className="flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <GitBranch className="h-4 w-4 text-brand-blue" aria-hidden />
          {initiative.name}
        </Link>
        <MetaPill>Stage: {initiative.currentStage}</MetaPill>
        <MetaPill>Release {initiative.activeRelease}</MetaPill>
        <RiskBadge level={initiative.riskLevel} />
      </>
    ) : (
      <MetaPill>No initiative in context</MetaPill>
    )}
    <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      Acting as {getRole(role)?.name ?? role}
    </span>
  </div>
);
