import { useMemo } from "react";
import { CheckCircle2, Lock, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { MetaPill, RiskBadge } from "@/components/enterprise/Badges";
import { useToast } from "@/hooks/use-toast";
import { useActor } from "@/hooks/useWorkspace";
import { getRole } from "@/domain/rbac";
import {
  APPROVAL_STAGES,
  APPROVAL_STAGE_LABEL,
  canAuthorizeAction,
  canDecideStage,
  evaluateStageGate,
  raciFor,
  type ApprovalStage,
} from "@/services/agentApprovals";
import {
  useActionAuthorizations,
  useApprovalRequests,
  useCloseApprovalRequest,
  useRequestApproval,
  useSetActionAuthorization,
} from "@/hooks/useAgentDesign";
import { useRecordAgentReview } from "@/hooks/usePhase6";
import type { AgentAction, AgentDesignRecord, AgentReadiness } from "@/domain/phase6";
import type { ActionAuthorization } from "@/repositories/supabase/agentDesignStore";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const AUTH_TONE: Record<ActionAuthorization["state"], string> = {
  authorized: "border-success/30 bg-success/10 text-success",
  pending: "border-warning/40 bg-warning/10 text-foreground",
  unauthorized: "border-destructive/30 bg-destructive/5 text-destructive",
};

/**
 * RACI approval workflow: per-stage accountability, enforced sequential stage
 * gates, and role-based authorization of each agent action before it may execute.
 */
export const ApprovalWorkflowPanel = ({
  agent,
  readiness,
}: {
  readonly agent: AgentDesignRecord;
  readonly readiness: AgentReadiness | null;
}) => {
  const { toast } = useToast();
  const { role } = useActor();
  const { data: authorizations } = useActionAuthorizations(agent.id);
  const { data: requests } = useApprovalRequests(agent.id);
  const setAuthorization = useSetActionAuthorization();
  const requestApproval = useRequestApproval();
  const closeRequest = useCloseApprovalRequest();
  const recordReview = useRecordAgentReview();

  const authList = authorizations ?? [];
  const mayAuthorize = canAuthorizeAction(role);
  const roleName = getRole(role)?.name ?? role;

  const verdicts = useMemo(
    () => APPROVAL_STAGES.map((stage) => evaluateStageGate(agent, stage, readiness, authList)),
    [agent, readiness, authList],
  );

  const approvedStages = useMemo(
    () => new Set(agent.reviews.filter((entry) => entry.outcome === "approved").map((entry) => entry.stage)),
    [agent.reviews],
  );

  const decide = (stage: ApprovalStage, outcome: "approved" | "changes-requested") => {
    recordReview.mutate(
      {
        agent,
        review: {
          id: `rv-${stage}-${Date.now().toString(36)}`,
          stage,
          reviewerRole: role,
          outcome,
          comments: `${APPROVAL_STAGE_LABEL[stage]} ${outcome} by ${roleName} at readiness ${readiness?.overall ?? 0}%`,
          decidedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          const open = (requests ?? []).find((entry) => entry.stage === stage && entry.state === "open");
          if (open) {
            closeRequest.mutate({
              agentId: agent.id,
              requestId: open.id,
              stage,
              state: outcome === "approved" ? "approved" : "rejected",
            });
          }
          toast({ title: `${APPROVAL_STAGE_LABEL[stage]} ${outcome}`, description: "Recorded in the audit trail." });
        },
      },
    );
  };

  const actionColumns: DataTableColumn<AgentAction>[] = [
    {
      key: "action",
      header: "Action",
      render: (action) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{action.name}</p>
          <p className="text-xs text-muted-foreground">{action.system}</p>
        </div>
      ),
    },
    { key: "risk", header: "Risk", render: (action) => <RiskBadge level={action.riskRating} /> },
    {
      key: "gates",
      header: "Human gates",
      render: (action) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>{action.requiresConfirmation ? "Confirmation required" : "No confirmation"}</p>
          <p>{action.requiresHumanReview ? "Human review" : "No human review"}</p>
        </div>
      ),
    },
    {
      key: "state",
      header: "Authorization",
      render: (action) => {
        const entry = authList.find((item) => item.actionId === action.id);
        const state = entry?.state ?? "unauthorized";
        return (
          <div className="space-y-1">
            <Badge variant="outline" className={cn("capitalize", AUTH_TONE[state])}>
              {state}
            </Badge>
            {entry?.authorizedBy ? (
              <p className="text-[11px] text-muted-foreground">
                {entry.authorizedBy}
                {entry.authorizedAt ? ` · ${dateTime(entry.authorizedAt)}` : ""}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "controls",
      header: "",
      align: "right",
      render: (action) => {
        const state = authList.find((item) => item.actionId === action.id)?.state ?? "unauthorized";
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={!mayAuthorize || state === "authorized" || setAuthorization.isPending}
              onClick={() =>
                setAuthorization.mutate(
                  { agentId: agent.id, actionId: action.id, actionName: action.name, state: "authorized" },
                  { onSuccess: () => toast({ title: "Action authorized", description: action.name }) },
                )
              }
            >
              Authorize
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!mayAuthorize || state === "unauthorized" || setAuthorization.isPending}
              onClick={() =>
                setAuthorization.mutate(
                  { agentId: agent.id, actionId: action.id, actionName: action.name, state: "unauthorized" },
                  { onSuccess: () => toast({ title: "Authorization revoked", description: action.name }) },
                )
              }
            >
              Revoke
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title="Stage gates and RACI"
        description={`Gates are sequential — design → risk → business. You are acting as ${roleName}; only the accountable role may record a decision.`}
      >
        <div className="space-y-3">
          {verdicts.map((verdict) => {
            const raci = raciFor(verdict.stage);
            const approved = approvedStages.has(verdict.stage);
            const mayDecide = canDecideStage(role, verdict.stage);
            const open = (requests ?? []).find((entry) => entry.stage === verdict.stage && entry.state === "open");

            return (
              <div key={verdict.stage} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{APPROVAL_STAGE_LABEL[verdict.stage]}</p>
                      {approved ? (
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                          Approved
                        </Badge>
                      ) : verdict.open ? (
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                          Gate open
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
                          <Lock className="mr-1 h-3 w-3" aria-hidden />
                          Gate blocked
                        </Badge>
                      )}
                      {open ? <MetaPill>Approval requested</MetaPill> : null}
                    </div>
                    <p className="max-w-3xl text-xs text-muted-foreground">{raci.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(open) || approved || requestApproval.isPending}
                      onClick={() =>
                        requestApproval.mutate(
                          { agentId: agent.id, stage: verdict.stage, requiredRoles: raci.accountable },
                          { onSuccess: () => toast({ title: "Approval requested", description: APPROVAL_STAGE_LABEL[verdict.stage] }) },
                        )
                      }
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Request approval
                    </Button>
                    <Button
                      size="sm"
                      disabled={!mayDecide || !verdict.open || approved || recordReview.isPending}
                      onClick={() => decide(verdict.stage, "approved")}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!mayDecide || recordReview.isPending}
                      onClick={() => decide(verdict.stage, "changes-requested")}
                    >
                      Request changes
                    </Button>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  {(
                    [
                      ["Accountable", raci.accountable],
                      ["Responsible", raci.responsible],
                      ["Consulted", raci.consulted],
                      ["Informed", raci.informed],
                    ] as const
                  ).map(([label, roles]) => (
                    <div key={label}>
                      <dt className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                      <dd className="mt-1 flex flex-wrap gap-1">
                        {roles.map((entry) => (
                          <MetaPill key={entry} className={entry === role ? "border-brand/40 bg-brand/10 text-brand" : undefined}>
                            {getRole(entry)?.name ?? entry}
                          </MetaPill>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>

                {!verdict.open && !approved ? (
                  <ul className="mt-3 space-y-1">
                    {verdict.blockers.map((blocker) => (
                      <li key={blocker} className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-foreground">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {!mayDecide && !approved ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {getRole(raci.accountable[0])?.name ?? raci.accountable[0]} must record this decision.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Agent action authorization"
        description="Elevated-risk actions must be explicitly authorized before the risk gate can open. Only approvers, Agentforce Architects and Data Stewards may change authorization."
      >
        <DataTable
          columns={actionColumns}
          rows={agent.actions}
          rowKey={(action) => action.id}
          emptyTitle="No actions to authorize"
        />
        {!mayAuthorize ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {roleName} cannot change action authorization — switch to an approving persona to act.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Approval request log">
        {(requests ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No approval requests raised yet.</p>
        ) : (
          <ul className="space-y-2">
            {(requests ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-xs"
              >
                <span className="capitalize text-foreground">{entry.stage.replace(/-/g, " ")}</span>
                <span className="text-muted-foreground">
                  {entry.state} · requested by {entry.requestedBy} · {dateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};

export default ApprovalWorkflowPanel;
