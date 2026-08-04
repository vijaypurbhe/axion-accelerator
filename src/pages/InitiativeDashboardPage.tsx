import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { MetricCard, ProgressCard } from "@/components/enterprise/Metrics";
import { ApprovalBadge, MetaPill, RiskBadge } from "@/components/enterprise/Badges";
import { DataTable } from "@/components/enterprise/DataTable";
import { StageStepper } from "@/components/enterprise/StageStepper";
import { ActivityTimeline, TimelineShell } from "@/components/enterprise/ActivityTimeline";
import { WorkspaceContextBanner } from "@/components/enterprise/WorkspaceContextBanner";
import { EmptyState, ErrorState, LoadingState } from "@/components/enterprise/States";
import RoleDashboard from "@/features/dashboards/RoleDashboard";
import { useAxion } from "@/context/AxionContext";
import {
  useActivity,
  useApprovals,
  useClient,
  useDecideApproval,
  useInitiative,
  useMilestones,
  useRisks,
  useSetInitiativeStage,
  useStageTasks,
} from "@/hooks/useWorkspace";
import { roleCan } from "@/domain/rbac";
import { shortDate } from "@/lib/format";

const InitiativeDashboardPage = () => {
  const { initiativeId } = useParams<{ initiativeId: string }>();
  const { persona, setActiveInitiativeId, setActiveTenantId } = useAxion();

  const initiative = useInitiative(initiativeId);
  const { data: client } = useClient(initiative.data?.clientId ?? "");
  const tasks = useStageTasks(initiativeId);
  const milestones = useMilestones(initiativeId);
  const risks = useRisks(initiativeId);
  const approvals = useApprovals(initiativeId);
  const activity = useActivity({ initiativeId, limit: 12 });
  const setStage = useSetInitiativeStage();
  const decide = useDecideApproval();

  useEffect(() => {
    if (initiative.data) {
      setActiveInitiativeId(initiative.data.id);
      setActiveTenantId(initiative.data.clientId);
    }
  }, [initiative.data, setActiveInitiativeId, setActiveTenantId]);

  if (initiative.isLoading) return <LoadingState label="Loading initiative" rows={6} />;
  if (initiative.isError)
    return <ErrorState message="The initiative could not be loaded." onRetry={() => initiative.refetch()} />;

  const record = initiative.data;
  if (!record)
    return (
      <EmptyState
        title="Initiative not found"
        message="It may have been archived or belongs to another client workspace."
        action={
          <Button asChild variant="outline">
            <Link to="/initiatives">Back to initiatives</Link>
          </Button>
        }
      />
    );

  const openRisks = (risks.data ?? []).filter((risk) => risk.status !== "closed");
  const pendingApprovals = (approvals.data ?? []).filter((approval) => approval.state === "submitted");
  const stageTasks = tasks.data ?? [];
  const doneTasks = stageTasks.filter((task) => task.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={client?.name ?? "Client"}
        title={record.name}
        description={record.businessObjective || record.description}
        actions={
          <>
            <MetaPill>{record.status}</MetaPill>
            <RiskBadge level={record.riskLevel} />
            <ApprovalBadge state={record.approvalStatus} />
          </>
        }
      />

      <WorkspaceContextBanner client={client} initiative={record} role={persona} />

      <SectionCard
        title="Lifecycle position"
        description="Advance the initiative only when the stage exit criteria are met."
      >
        <StageStepper
          current={record.currentStage}
          onSelect={
            roleCan(persona, "edit")
              ? (stageId) => setStage.mutate({ initiativeId: record.id, stage: stageId })
              : undefined
          }
        />
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Readiness score" value={`${record.readinessScore}%`} />
        <MetricCard label="Stage tasks complete" value={`${doneTasks}/${stageTasks.length}`} />
        <MetricCard label="Open risks" value={openRisks.length} hint={`${openRisks.filter((r) => r.level === "critical").length} critical`} />
        <MetricCard label="Pending approvals" value={pendingApprovals.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ProgressCard label="Readiness" value={record.readinessScore} target={85} caption="Target for stage exit" />
        <ProgressCard
          label="Stage task completion"
          value={stageTasks.length ? Math.round((doneTasks / stageTasks.length) * 100) : 0}
          target={100}
        />
        <ProgressCard label="Use case coverage" value={Math.min(record.useCases.length * 20, 100)} target={100} caption={`${record.useCases.length} use cases in scope`} />
      </div>

      <RoleDashboard role={persona} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Stage tasks" description="Work items for the current and adjacent stages.">
          <DataTable
            rows={stageTasks}
            rowKey={(task) => task.id}
            columns={[
              { key: "name", header: "Task", render: (task) => <span className="font-medium text-foreground">{task.name}</span> },
              { key: "stage", header: "Stage", render: (task) => <MetaPill>{task.stage}</MetaPill> },
              { key: "owner", header: "Owner role", render: (task) => task.owner },
              { key: "status", header: "Status", render: (task) => task.status },
              { key: "due", header: "Due", align: "right", render: (task) => shortDate(task.dueDate) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Milestones">
          <DataTable
            rows={milestones.data ?? []}
            rowKey={(milestone) => milestone.id}
            columns={[
              { key: "name", header: "Milestone", render: (m) => <span className="font-medium text-foreground">{m.name}</span> },
                            { key: "status", header: "Status", render: (m) => m.status },
              { key: "date", header: "Date", align: "right", render: (m) => shortDate(m.date) },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Risk register" className="xl:col-span-2">
          <DataTable
            rows={openRisks}
            rowKey={(risk) => risk.id}
            columns={[
              { key: "title", header: "Risk", render: (risk) => <span className="font-medium text-foreground">{risk.title}</span> },
              { key: "level", header: "Level", render: (risk) => <RiskBadge level={risk.level} /> },
              { key: "likelihood", header: "Likelihood", render: (risk) => risk.likelihood },
              { key: "impact", header: "Impact", render: (risk) => risk.impact },
              { key: "owner", header: "Owner", render: (risk) => risk.owner },
              { key: "status", header: "Status", render: (risk) => risk.status },
            ]}
          />
        </SectionCard>

        <SectionCard title="Approvals">
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing awaiting a decision.</p>
          ) : (
            <ul className="space-y-3">
              {pendingApprovals.map((approval) => (
                <li key={approval.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{approval.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approval.objectType} · stage {approval.stage}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={!roleCan(persona, "approve") || decide.isPending}
                      onClick={() => decide.mutate({ approvalId: approval.id, state: "approved" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!roleCan(persona, "reject") || decide.isPending}
                      onClick={() => decide.mutate({ approvalId: approval.id, state: "rejected" })}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Initiative activity" description="Immutable audit records scoped to this initiative.">
        <TimelineShell>
          <ActivityTimeline entries={activity.data ?? []} />
        </TimelineShell>
      </SectionCard>
    </div>
  );
};

export default InitiativeDashboardPage;
