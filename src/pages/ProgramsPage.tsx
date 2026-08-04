import { PageHeader, SectionCard, KeyValue } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState } from "@/components/enterprise/States";
import { StatusBadge, Pill } from "@/components/enterprise/StatusBadge";
import { LifecycleStepper } from "@/components/enterprise/LifecycleStepper";
import { useAxion } from "@/context/AxionContext";
import {
  usePrograms,
  useReleases,
  useTenants,
  useUseCases,
  useWorkstreams,
} from "@/hooks/useAxionData";
import { getPersona, getProduct, INDUSTRIES } from "@/domain/catalogs";
import { shortDate } from "@/lib/format";

const ProgramsPage = () => {
  const { activeTenantId } = useAxion();
  const tenantsQuery = useTenants();
  const programsQuery = usePrograms(activeTenantId);
  const tenant = tenantsQuery.data?.find((item) => item.id === activeTenantId);

  return (
    <>
      <PageHeader
        eyebrow="Clients and programs"
        title="Program structure"
        description="Tenant → program → workstream → use case → release. All records are scoped to the active client."
      />

      {tenant ? (
        <SectionCard title="Client profile">
          <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <KeyValue label="Client" value={tenant.name} />
            <KeyValue label="Industry" value={INDUSTRIES.find((i) => i.id === tenant.industry)?.name} />
            <KeyValue label="Segment" value={tenant.segment} />
            <KeyValue label="Region" value={tenant.region} />
          </dl>
        </SectionCard>
      ) : null}

      {programsQuery.isLoading ? (
        <LoadingState label="Loading programs" />
      ) : programsQuery.isError ? (
        <ErrorState message="Programs could not be loaded." onRetry={() => void programsQuery.refetch()} />
      ) : (
        (programsQuery.data ?? []).map((program) => (
          <ProgramDetail key={program.id} tenantId={activeTenantId} programId={program.id} />
        ))
      )}
    </>
  );
};

const ProgramDetail = ({ tenantId, programId }: { tenantId: string; programId: string }) => {
  const programsQuery = usePrograms(tenantId);
  const program = programsQuery.data?.find((item) => item.id === programId);
  const workstreamsQuery = useWorkstreams(tenantId, programId);
  const useCasesQuery = useUseCases(tenantId, programId);
  const releasesQuery = useReleases(tenantId, programId);

  if (!program) return null;

  return (
    <SectionCard
      title={program.name}
      description={program.objective}
      actions={<StatusBadge status={program.status} />}
    >
      <div className="space-y-6">
        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KeyValue label="Executive sponsor" value={program.executiveSponsor} />
          <KeyValue label="Start date" value={shortDate(program.startDate)} />
          <KeyValue label="Target go-live" value={shortDate(program.targetGoLive)} />
          <KeyValue label="Current stage" value={<Pill>{program.currentStage}</Pill>} />
        </dl>

        <LifecycleStepper currentStage={program.currentStage} />

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workstreams</h3>
            {workstreamsQuery.isLoading ? (
              <LoadingState label="Loading" rows={2} />
            ) : (
              <ul className="space-y-2">
                {(workstreamsQuery.data ?? []).map((ws) => (
                  <li key={ws.id} className="rounded-lg border border-border bg-surface/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{ws.name}</p>
                      <StatusBadge status={ws.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ws.domain} · Owner: {getPersona(ws.owner)?.name ?? ws.owner}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Use cases</h3>
            {useCasesQuery.isLoading ? (
              <LoadingState label="Loading" rows={2} />
            ) : (
              <ul className="space-y-2">
                {(useCasesQuery.data ?? []).map((uc) => (
                  <li key={uc.id} className="rounded-lg border border-border bg-surface/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{uc.name}</p>
                      <StatusBadge status={uc.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{uc.outcome}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {uc.products.map((productId) => (
                        <Pill key={productId}>{getProduct(productId)?.name ?? productId}</Pill>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Releases</h3>
            {releasesQuery.isLoading ? (
              <LoadingState label="Loading" rows={2} />
            ) : (
              <ul className="space-y-2">
                {(releasesQuery.data ?? []).map((release) => (
                  <li key={release.id} className="rounded-lg border border-border bg-surface/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {release.version} · {release.name}
                      </p>
                      <StatusBadge status={release.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Planned {shortDate(release.plannedDate)} · {release.useCaseIds.length} use case(s)
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default ProgramsPage;
