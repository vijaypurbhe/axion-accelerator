import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Boxes, Plus, ShieldAlert, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { MetricCard, ProgressCard, SectionHeader } from "@/components/enterprise/Metrics";
import { AiSuggestedBadge, ApprovalBadge, MetaPill, RiskBadge } from "@/components/enterprise/Badges";
import { FilterBar } from "@/components/enterprise/FilterBar";
import { DataTable } from "@/components/enterprise/DataTable";
import { ActivityTimeline, TimelineShell } from "@/components/enterprise/ActivityTimeline";
import { LoadingState, ErrorState } from "@/components/enterprise/States";
import { WorkspaceContextBanner } from "@/components/enterprise/WorkspaceContextBanner";
import NewClientWizard from "@/features/workspace/NewClientWizard";
import NewInitiativeWizard from "@/features/workspace/NewInitiativeWizard";
import RoleDashboard from "@/features/dashboards/RoleDashboard";
import RoleChecklist from "@/features/onboarding/RoleChecklist";

import { useAxion } from "@/context/AxionContext";
import {
  useActivity,
  useAllInitiatives,
  useApprovals,
  useClient,
  useClients,
  useDecideApproval,
  useRecommendations,
  useRisks,
} from "@/hooks/useWorkspace";
import { INDUSTRIES, LIFECYCLE_STAGES } from "@/domain/catalogs";
import { roleCan } from "@/domain/rbac";
import { shortDate } from "@/lib/format";
import type { Client, Initiative, RiskLevel } from "@/domain/models";

const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high", "critical"];

const PortfolioPage = () => {
  const { activeClientId, activeInitiativeId, persona, setActiveTenantId, setActiveInitiativeId } = useAxion();
  const clients = useClients();
  const initiatives = useAllInitiatives();
  const risks = useRisks();
  const approvals = useApprovals();
  const activity = useActivity({ limit: 12 });
  const recommendations = useRecommendations(activeClientId);
  const { data: activeClient } = useClient(activeClientId);
  const decide = useDecideApproval();

  const [clientWizard, setClientWizard] = useState(false);
  const [initiativeWizard, setInitiativeWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const clientList: Client[] = clients.data ?? [];
  const initiativeList: Initiative[] = initiatives.data ?? [];

  const clientById = useMemo(
    () => new Map(clientList.map((client) => [client.id, client])),
    [clientList],
  );

  const filteredInitiatives = useMemo(
    () =>
      initiativeList.filter((initiative) => {
        const client = clientById.get(initiative.clientId);
        if (search && !`${initiative.name} ${client?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (clientFilter !== "all" && initiative.clientId !== clientFilter) return false;
        if (industryFilter !== "all" && client?.industry !== industryFilter) return false;
        if (stageFilter !== "all" && initiative.currentStage !== stageFilter) return false;
        if (riskFilter !== "all" && initiative.riskLevel !== riskFilter) return false;
        if (statusFilter !== "all" && initiative.status !== statusFilter) return false;
        return true;
      }),
    [initiativeList, clientById, search, clientFilter, industryFilter, stageFilter, riskFilter, statusFilter],
  );

  const stageChart = useMemo(
    () =>
      LIFECYCLE_STAGES.map((stage) => ({
        stage: stage.name,
        initiatives: filteredInitiatives.filter((initiative) => initiative.currentStage === stage.id).length,
      })),
    [filteredInitiatives],
  );

  const openRisks = (risks.data ?? []).filter((risk) => risk.status !== "closed");
  const pendingApprovals = (approvals.data ?? []).filter((approval) => approval.state === "submitted");
  const avgReadiness = filteredInitiatives.length
    ? Math.round(filteredInitiatives.reduce((sum, i) => sum + i.readinessScore, 0) / filteredInitiatives.length)
    : 0;

  const heatmap = useMemo(() => {
    const grid = new Map<string, number>();
    openRisks.forEach((risk) => {
      const key = `${risk.likelihood}|${risk.impact}`;
      grid.set(key, (grid.get(key) ?? 0) + 1);
    });
    return grid;
  }, [openRisks]);

  if (clients.isLoading || initiatives.isLoading) return <LoadingState label="Loading portfolio" rows={6} />;
  if (clients.isError) return <ErrorState message="The client portfolio could not be loaded." onRetry={() => clients.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Portfolio"
        description="Every client workspace, initiative and stage gate across the Axion delivery estate."
        actions={
          <>
            {roleCan(persona, "create") ? (
              <>
                <Button variant="outline" onClick={() => setClientWizard(true)}>
                  <Building2 className="mr-2 h-4 w-4" aria-hidden /> New client
                </Button>
                <Button onClick={() => setInitiativeWizard(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> New initiative
                </Button>
              </>
            ) : (
              <MetaPill>Read-only for this role</MetaPill>
            )}
          </>
        }
      />

      <WorkspaceContextBanner client={activeClient} initiative={initiativeList.find((i) => i.id === activeInitiativeId)} role={persona} />

      <RoleChecklist role={persona} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active clients" value={clientList.length} icon={<Building2 className="h-4 w-4" />} hint="Logically isolated workspaces" />
        <MetricCard label="Active initiatives" value={initiativeList.filter((i) => i.status === "active").length} icon={<Boxes className="h-4 w-4" />} />
        <MetricCard label="Open risks" value={openRisks.length} icon={<ShieldAlert className="h-4 w-4" />} hint={`${openRisks.filter((r) => r.level === "critical").length} critical`} />
        <MetricCard label="Pending approvals" value={pendingApprovals.length} />
        <MetricCard label="AI recommendations" value={(recommendations.data ?? []).length} icon={<Sparkles className="h-4 w-4" />} hint="Awaiting human decision" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <ProgressCard label="Overall readiness" value={avgReadiness} target={85} caption="Weighted mean across filtered initiatives" />
        <ProgressCard label="Data products defined" value={62} target={100} caption="5 products in the BFSI foundation" />
        <ProgressCard label="Agent designs in progress" value={38} target={100} caption="3 agents drafted for banker assist" />
        <ProgressCard label="Control completion" value={54} target={100} caption="GLBA and CCPA control evidence" />
      </div>

      <RoleDashboard role={persona} />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search initiatives or clients" }}
        filters={[
          {
            id: "client",
            label: "Clients",
            value: clientFilter,
            onChange: setClientFilter,
            options: clientList.map((client) => ({ value: client.id, label: client.name })),
          },
          {
            id: "industry",
            label: "Industries",
            value: industryFilter,
            onChange: setIndustryFilter,
            options: INDUSTRIES.map((industry) => ({ value: industry.id, label: industry.id })),
          },
          {
            id: "stage",
            label: "Stages",
            value: stageFilter,
            onChange: setStageFilter,
            options: LIFECYCLE_STAGES.map((stage) => ({ value: stage.id, label: stage.name })),
          },
          {
            id: "risk",
            label: "Risk levels",
            value: riskFilter,
            onChange: setRiskFilter,
            options: RISK_LEVELS.map((level) => ({ value: level, label: level })),
          },
          {
            id: "status",
            label: "Statuses",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "planning", label: "Planning" },
              { value: "active", label: "Active" },
              { value: "on-hold", label: "On hold" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Initiatives by lifecycle stage" className="xl:col-span-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChart} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-20} dy={8} height={48} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ReTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="initiatives" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Risk heatmap" description="Open risks by likelihood and impact.">
          <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1 text-xs">
            <span />
            {RISK_LEVELS.map((impact) => (
              <span key={impact} className="pb-1 text-center font-medium capitalize text-muted-foreground">
                {impact}
              </span>
            ))}
            {RISK_LEVELS.map((likelihood) => (
              <div key={likelihood} className="contents">
                <span className="pr-2 text-right font-medium capitalize text-muted-foreground">{likelihood}</span>
                {RISK_LEVELS.map((impact) => {
                  const count = heatmap.get(`${likelihood}|${impact}`) ?? 0;
                  const intensity = count === 0 ? 0 : Math.min(0.15 + count * 0.25, 0.85);
                  return (
                    <div
                      key={impact}
                      className="flex h-11 items-center justify-center rounded border border-border tabular-nums"
                      style={{ backgroundColor: `hsl(var(--primary) / ${intensity})` }}
                      title={`Likelihood ${likelihood} · impact ${impact}: ${count} risk(s)`}
                    >
                      {count || ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Rows are likelihood, columns are impact.</p>
        </SectionCard>
      </div>

      <SectionCard title="Client portfolio" description="Switch context to work inside a client workspace.">
        <DataTable
          rows={clientList}
          rowKey={(client) => client.id}
          onRowClick={(client) => setActiveTenantId(client.id)}
          columns={[
            { key: "name", header: "Client", render: (client) => <span className="font-medium text-foreground">{client.name}</span> },
            { key: "industry", header: "Industry", render: (client) => `${client.industry} · ${client.subsegments.join(" / ")}` },
            { key: "geo", header: "Geography", render: (client) => client.geography },
            { key: "jur", header: "Jurisdictions", render: (client) => client.jurisdictions.join(", ") },
            { key: "owner", header: "Account owner", render: (client) => client.accountOwner },
            {
              key: "initiatives",
              header: "Initiatives",
              align: "right",
              render: (client) => initiativeList.filter((i) => i.clientId === client.id).length,
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="Initiatives" description="Filtered portfolio view with readiness and approval posture.">
        <DataTable
          rows={filteredInitiatives}
          rowKey={(initiative) => initiative.id}
          columns={[
            {
              key: "name",
              header: "Initiative",
              render: (initiative) => (
                <Link
                  to={`/initiatives/${initiative.id}`}
                  onClick={() => {
                    setActiveTenantId(initiative.clientId);
                    setActiveInitiativeId(initiative.id);
                  }}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {initiative.name}
                </Link>
              ),
            },
            { key: "client", header: "Client", render: (i) => clientById.get(i.clientId)?.name ?? "—" },
            { key: "stage", header: "Stage", render: (i) => <MetaPill>{i.currentStage}</MetaPill> },
            { key: "readiness", header: "Readiness", align: "right", render: (i) => `${i.readinessScore}%` },
            { key: "risk", header: "Risk", render: (i) => <RiskBadge level={i.riskLevel} /> },
            { key: "approval", header: "Approval", render: (i) => <ApprovalBadge state={i.approvalStatus} /> },
            { key: "target", header: "Target", align: "right", render: (i) => shortDate(i.targetDate) },
          ]}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Approval queue" description="Submitted items awaiting a decision.">
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approvals are waiting.</p>
          ) : (
            <ul className="space-y-3">
              {pendingApprovals.map((approval) => (
                <li key={approval.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{approval.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approval.objectType} · stage {approval.stage} · requested by {approval.requestedBy}
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
                  {!roleCan(persona, "approve") ? (
                    <p className="mt-2 text-xs text-muted-foreground">Your role cannot decide approvals.</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="AI recommendations pending review">
          <ul className="space-y-3">
            {(recommendations.data ?? []).map((recommendation) => (
              <li key={recommendation.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{recommendation.title}</p>
                  <AiSuggestedBadge />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{recommendation.rationale}</p>
                {typeof recommendation.confidence === "number" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confidence {Math.round(recommendation.confidence * 100)}%
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link to="/ai-recommendations">Open recommendation governance</Link>
          </Button>
        </SectionCard>

        <SectionCard title="Recent activity">
          <TimelineShell>
            <ActivityTimeline entries={activity.data ?? []} />
          </TimelineShell>
        </SectionCard>
      </div>

      <SectionHeader title="Upcoming milestones" description="Next four milestones across the active client." />
      <SectionCard>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Design authority review", "2026-08-21T00:00:00Z"],
            ["Party data product baseline", "2026-09-11T00:00:00Z"],
            ["Banker assist agent pilot", "2026-11-06T00:00:00Z"],
            ["Release R1.2 promotion", "2026-12-11T00:00:00Z"],
          ].map(([name, date]) => (
            <li key={name} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{shortDate(date)}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <NewClientWizard open={clientWizard} onOpenChange={setClientWizard} />
      <NewInitiativeWizard open={initiativeWizard} onOpenChange={setInitiativeWizard} />
    </div>
  );
};

export default PortfolioPage;
