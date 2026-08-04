import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState } from "@/components/enterprise/States";
import { AuditTrailPanel } from "@/components/enterprise/AuditTrailPanel";
import { useAxion } from "@/context/AxionContext";
import { useAuditTrail } from "@/hooks/useAxionData";

const AuditPage = () => {
  const { activeTenantId } = useAxion();
  const auditQuery = useAuditTrail(activeTenantId, 100);

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
