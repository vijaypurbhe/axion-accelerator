import { useQuery } from "@tanstack/react-query";
import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState } from "@/components/enterprise/States";
import { AuditTrailPanel } from "@/components/enterprise/AuditTrailPanel";
import { useAxion } from "@/context/AxionContext";
import { activityService } from "@/services/workspace";
import type { AuditAction, AuditEntry, PersonaId } from "@/domain/types";

/** The server activity log is projected onto the audit entry shape the panel renders. */
const toAuditEntry = (row: Awaited<ReturnType<typeof activityService.list>>[number]): AuditEntry => ({
  id: row.id,
  tenantId: row.tenantId,
  actor: row.actor,
  persona: row.role as PersonaId,
  action: row.action as AuditAction,
  entityRef: `${row.objectType}:${row.objectId}`,
  summary: row.status,
  before: row.oldValueSummary,
  after: row.newValueSummary,
  timestamp: row.timestamp,
});

const AuditPage = () => {
  const { activeTenantId } = useAxion();

  const auditQuery = useQuery({
    queryKey: ["activity-log", activeTenantId],
    queryFn: async () => {
      const rows = await activityService.list({ clientId: activeTenantId, limit: 200 });
      return rows.map(toAuditEntry);
    },
    enabled: Boolean(activeTenantId),
  });

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="Immutable record of decisions, edits and AI recommendation outcomes for the active client."
      />
      <SectionCard title="Activity">
        {auditQuery.isLoading ? (
          <LoadingState label="Loading audit trail" />
        ) : auditQuery.isError ? (
          <ErrorState message="Audit trail could not be loaded." onRetry={() => void auditQuery.refetch()} />
        ) : (
          <AuditTrailPanel entries={auditQuery.data ?? []} />
        )}
      </SectionCard>
    </>
  );
};

export default AuditPage;
