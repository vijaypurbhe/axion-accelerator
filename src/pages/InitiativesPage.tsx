import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { MetricCard } from "@/components/enterprise/Metrics";
import { ApprovalBadge, MetaPill, RiskBadge } from "@/components/enterprise/Badges";
import { FilterBar } from "@/components/enterprise/FilterBar";
import { DataTable } from "@/components/enterprise/DataTable";
import { WorkspaceContextBanner } from "@/components/enterprise/WorkspaceContextBanner";
import { EmptyState, ErrorState, LoadingState } from "@/components/enterprise/States";
import NewInitiativeWizard from "@/features/workspace/NewInitiativeWizard";
import { useAxion } from "@/context/AxionContext";
import { useClient, useInitiatives } from "@/hooks/useWorkspace";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import { roleCan } from "@/domain/rbac";
import { shortDate } from "@/lib/format";

const InitiativesPage = () => {
  const { activeClientId, activeInitiativeId, persona, setActiveInitiativeId } = useAxion();
  const { data: client } = useClient(activeClientId);
  const initiatives = useInitiatives(activeClientId);

  const [wizard, setWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      (initiatives.data ?? []).filter((initiative) => {
        if (search && !initiative.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (stage !== "all" && initiative.currentStage !== stage) return false;
        if (status !== "all" && initiative.status !== status) return false;
        return true;
      }),
    [initiatives.data, search, stage, status],
  );

  if (initiatives.isLoading) return <LoadingState label="Loading initiatives" rows={5} />;
  if (initiatives.isError)
    return <ErrorState message="Initiatives could not be loaded." onRetry={() => initiatives.refetch()} />;

  const all = initiatives.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Initiatives"
        description={`Delivery initiatives inside ${client?.name ?? "the active client workspace"}.`}
        actions={
          roleCan(persona, "create") ? (
            <Button onClick={() => setWizard(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden /> New initiative
            </Button>
          ) : (
            <MetaPill>Read-only for this role</MetaPill>
          )
        }
      />

      <WorkspaceContextBanner
        client={client}
        initiative={all.find((initiative) => initiative.id === activeInitiativeId)}
        role={persona}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total initiatives" value={all.length} />
        <MetricCard label="Active" value={all.filter((i) => i.status === "active").length} />
        <MetricCard label="Awaiting approval" value={all.filter((i) => i.approvalStatus === "submitted").length} />
        <MetricCard
          label="High or critical risk"
          value={all.filter((i) => i.riskLevel === "high" || i.riskLevel === "critical").length}
        />
      </div>

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search initiatives" }}
        filters={[
          {
            id: "stage",
            label: "Stages",
            value: stage,
            onChange: setStage,
            options: LIFECYCLE_STAGES.map((item) => ({ value: item.id, label: item.name })),
          },
          {
            id: "status",
            label: "Statuses",
            value: status,
            onChange: setStatus,
            options: [
              { value: "planning", label: "Planning" },
              { value: "active", label: "Active" },
              { value: "on-hold", label: "On hold" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
      />

      <SectionCard title="Initiative register">
        {rows.length === 0 ? (
          <EmptyState
            title="No initiatives match the filters"
            description="Adjust the filters, or create a new initiative for this client."
          />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(initiative) => initiative.id}
            columns={[
              {
                key: "name",
                header: "Initiative",
                render: (initiative) => (
                  <Link
                    to={`/initiatives/${initiative.id}`}
                    onClick={() => setActiveInitiativeId(initiative.id)}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {initiative.name}
                  </Link>
                ),
              },
              { key: "domain", header: "Primary domain", render: (i) => i.primaryDomain },
              { key: "stage", header: "Stage", render: (i) => <MetaPill>{i.currentStage}</MetaPill> },
              { key: "readiness", header: "Readiness", align: "right", render: (i) => `${i.readinessScore}%` },
              { key: "risk", header: "Risk", render: (i) => <RiskBadge level={i.riskLevel} /> },
              { key: "approval", header: "Approval", render: (i) => <ApprovalBadge state={i.approvalStatus} /> },
              { key: "target", header: "Target", align: "right", render: (i) => shortDate(i.targetDate) },
            ]}
          />
        )}
      </SectionCard>

      <NewInitiativeWizard open={wizard} onOpenChange={setWizard} />
    </div>
  );
};

export default InitiativesPage;
