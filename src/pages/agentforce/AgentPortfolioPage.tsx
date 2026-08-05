import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { RiskBadge, MetaPill } from "@/components/enterprise/Badges";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { FilterBar } from "@/components/enterprise/FilterBar";
import {
  useAgentPortfolioSummary,
  useAgents,
  useActivePhase6InitiativeId,
} from "@/hooks/usePhase6";
import { evaluateAgentReadiness } from "@/services/agentforceEngine";
import { AGENT_STATUS_LABEL, type AgentDesignRecord, type AgentLifecycleStatus } from "@/domain/phase6";
import { patternById } from "@/data/agentforceSeed";
import { shortDate } from "@/lib/format";

const STATUS_TONE: Record<string, string> = {
  deployed: "border-success/30 bg-success/10 text-success",
  approved: "border-success/30 bg-success/10 text-success",
  retired: "border-border bg-surface text-muted-foreground",
};

const AgentPortfolioPage = () => {
  const navigate = useNavigate();
  const initiativeId = useActivePhase6InitiativeId();
  const { data: agents, isLoading, isError, refetch } = useAgents(initiativeId);
  const summary = useAgentPortfolioSummary(agents);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const list = agents ?? [];
    return list.filter((agent) => {
      const matchStatus = statusFilter === "all" || agent.status === statusFilter;
      const term = search.trim().toLowerCase();
      const matchSearch =
        term.length === 0 ||
        agent.overview.name.toLowerCase().includes(term) ||
        agent.overview.domain.toLowerCase().includes(term) ||
        agent.overview.useCase.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [agents, statusFilter, search]);

  const columns: DataTableColumn<AgentDesignRecord>[] = [
    {
      key: "agent",
      header: "Agent",
      render: (agent) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{agent.overview.name}</p>
          <p className="text-xs text-muted-foreground">
            {agent.reference} · {patternById(agent.overview.patternId)?.name ?? agent.overview.patternId}
          </p>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Domain / use case",
      render: (agent) => (
        <div className="space-y-1 text-xs">
          <p className="text-foreground">{agent.overview.domain}</p>
          <p className="text-muted-foreground">{agent.overview.useCase}</p>
        </div>
      ),
    },
    {
      key: "channels",
      header: "Channels",
      render: (agent) => (
        <div className="flex flex-wrap gap-1">
          {agent.overview.channels.map((channel) => (
            <MetaPill key={channel}>{channel.replace(/-/g, " ")}</MetaPill>
          ))}
        </div>
      ),
    },
    {
      key: "automation",
      header: "Automation",
      render: (agent) => <span className="text-xs capitalize">{agent.overview.automationLevel.replace(/-/g, " ")}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (agent) => (
        <Badge variant="outline" className={STATUS_TONE[agent.status] ?? "border-brand/30 bg-brand/10 text-brand"}>
          {AGENT_STATUS_LABEL[agent.status]}
        </Badge>
      ),
    },
    { key: "risk", header: "Risk", render: (agent) => <RiskBadge level={agent.riskRating} /> },
    {
      key: "readiness",
      header: "Readiness",
      align: "right",
      render: (agent) => {
        const readiness = evaluateAgentReadiness(agent);
        return (
          <div className="ml-auto w-28 space-y-1 text-right">
            <p className="text-sm font-semibold tabular-nums">{readiness.overall}%</p>
            <Progress value={readiness.overall} className="h-1.5" />
            {readiness.blockers.length > 0 ? (
              <p className="text-[11px] text-destructive">{readiness.blockers.length} blocker(s)</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "updated",
      header: "Updated",
      render: (agent) => <span className="text-xs text-muted-foreground">{shortDate(agent.updatedAt)}</span>,
    },
  ];

  if (isLoading) return <LoadingState label="Loading agent portfolio" rows={5} />;
  if (isError) return <ErrorState title="Agent portfolio unavailable" onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Design & Build"
        title="Agentforce Studio"
        description="Design, ground, guardrail and approve Agentforce agents with full traceability into data products, controls and lifecycle gates."
        actions={
          <Button onClick={() => navigate("/agentforce-studio/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New agent
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Agents" value={summary.total} hint={`${summary.deployed} deployed`} />
        <StatTile label="In review" value={summary.inReview} hint="Design, risk or business review" />
        <StatTile label="With blockers" value={summary.blocked} hint="Readiness blockers outstanding" />
        <StatTile label="Avg readiness" value={`${summary.averageReadiness}%`} hint="Weighted across 6 dimensions" />
        <StatTile label="Topics" value={summary.topics} hint="Across the portfolio" />
        <StatTile label="Actions / guardrails" value={`${summary.actions} / ${summary.guardrails}`} />
      </div>

      <SectionCard
        title="Agent portfolio"
        description="Select an agent to open the design workbench."
        actions={
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: "Search agents" }}
            filters={[
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: "All statuses" },
                  ...(Object.keys(AGENT_STATUS_LABEL) as AgentLifecycleStatus[]).map((status) => ({
                    value: status,
                    label: AGENT_STATUS_LABEL[status],
                  })),
                ],
              },
            ]}
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No agents yet"
            message="Create an agent from a BFSI pattern to start designing topics, actions and guardrails."
            icon={<Bot className="h-5 w-5" aria-hidden />}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(agent) => agent.id}
            onRowClick={(agent) => navigate(`/agentforce-studio/${agent.id}`)}
          />
        )}
      </SectionCard>
    </div>
  );
};

export default AgentPortfolioPage;
