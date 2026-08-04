import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { StatusBadge, Pill } from "@/components/enterprise/StatusBadge";
import { LifecycleStepper } from "@/components/enterprise/LifecycleStepper";
import { AuditTrailPanel } from "@/components/enterprise/AuditTrailPanel";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { useAxion } from "@/context/AxionContext";
import {
  useAuditTrail,
  usePrograms,
  useSuggestions,
  useTenants,
  useUseCases,
} from "@/hooks/useAxionData";
import { getStage, INDUSTRIES } from "@/domain/catalogs";
import type { Program, UseCase } from "@/domain/types";
import { shortDate } from "@/lib/format";

const OverviewPage = () => {
  const navigate = useNavigate();
  const { activeTenantId } = useAxion();
  const tenantsQuery = useTenants();
  const programsQuery = usePrograms(activeTenantId);
  const activeProgram = programsQuery.data?.[0];
  const useCasesQuery = useUseCases(activeTenantId, activeProgram?.id);
  const suggestionsQuery = useSuggestions(activeTenantId);
  const auditQuery = useAuditTrail(activeTenantId, 6);

  const tenant = useMemo(
    () => tenantsQuery.data?.find((item) => item.id === activeTenantId),
    [tenantsQuery.data, activeTenantId],
  );

  const pendingSuggestions = (suggestionsQuery.data ?? []).filter((s) => s.status === "pending");

  const programColumns: readonly DataTableColumn<Program>[] = [
    { key: "name", header: "Program", render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "stage", header: "Current stage", render: (row) => <Pill>{getStage(row.currentStage)?.name}</Pill> },
    { key: "sponsor", header: "Executive sponsor", render: (row) => row.executiveSponsor },
    { key: "goLive", header: "Target go-live", render: (row) => shortDate(row.targetGoLive) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  const useCaseColumns: readonly DataTableColumn<UseCase>[] = [
    { key: "name", header: "Use case", render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "outcome", header: "Outcome", render: (row) => <span className="text-muted-foreground">{row.outcome}</span> },
    { key: "value", header: "Value", render: (row) => <Pill>{row.businessValue}</Pill> },
    { key: "complexity", header: "Complexity", render: (row) => <Pill>{row.complexity}</Pill> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Command overview"
        title={tenant ? tenant.name : "Select a client"}
        description={
          tenant
            ? `${INDUSTRIES.find((i) => i.id === tenant.industry)?.name} · ${tenant.segment} · ${tenant.region}`
            : "Choose a client from the top bar to load its programs, use cases and governance activity."
        }
      />

      {tenantsQuery.isLoading ? (
        <LoadingState label="Loading tenants" />
      ) : tenantsQuery.isError ? (
        <ErrorState message="Tenants could not be loaded." onRetry={() => void tenantsQuery.refetch()} />
      ) : !tenant ? (
        <EmptyState title="No client selected" message="Pick a client in the top bar to continue." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Programs" value={programsQuery.data?.length ?? 0} hint="Active initiatives" />
            <StatTile label="Use cases" value={useCasesQuery.data?.length ?? 0} hint="In lead program" />
            <StatTile label="Pending AI suggestions" value={pendingSuggestions.length} hint="Awaiting decision" />
            <StatTile
              label="Lead program stage"
              value={activeProgram ? getStage(activeProgram.currentStage)?.name ?? "—" : "—"}
              hint="Lifecycle position"
            />
          </div>

          {activeProgram ? (
            <SectionCard
              title="Delivery lifecycle"
              description={`${activeProgram.name} — ${activeProgram.objective}`}
            >
              <LifecycleStepper
                currentStage={activeProgram.currentStage}
                onSelect={(stage) => navigate(`/lifecycle/${stage}`)}
              />
            </SectionCard>
          ) : null}

          <SectionCard title="Programs and initiatives" description="Tenant-scoped program portfolio.">
            {programsQuery.isLoading ? (
              <LoadingState label="Loading programs" />
            ) : programsQuery.isError ? (
              <ErrorState message="Programs could not be loaded." onRetry={() => void programsQuery.refetch()} />
            ) : (
              <DataTable
                columns={programColumns}
                rows={programsQuery.data ?? []}
                rowKey={(row) => row.id}
                onRowClick={() => navigate("/programs")}
                emptyTitle="No programs yet"
                emptyMessage="Create a program to start the Discover stage for this client."
              />
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <SectionCard title="Use case portfolio" description="Candidate and in-flight use cases.">
              {useCasesQuery.isLoading ? (
                <LoadingState label="Loading use cases" rows={2} />
              ) : useCasesQuery.isError ? (
                <ErrorState message="Use cases could not be loaded." onRetry={() => void useCasesQuery.refetch()} />
              ) : (
                <DataTable
                  columns={useCaseColumns}
                  rows={useCasesQuery.data ?? []}
                  rowKey={(row) => row.id}
                  emptyTitle="No use cases captured"
                  emptyMessage="Use cases are captured in the Discover stage."
                />
              )}
            </SectionCard>

            <SectionCard title="Recent governance activity" description="Latest audit trail entries.">
              {auditQuery.isLoading ? (
                <LoadingState label="Loading audit trail" rows={2} />
              ) : auditQuery.isError ? (
                <ErrorState message="Audit trail could not be loaded." onRetry={() => void auditQuery.refetch()} />
              ) : (
                <AuditTrailPanel entries={auditQuery.data ?? []} />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
};

export default OverviewPage;
