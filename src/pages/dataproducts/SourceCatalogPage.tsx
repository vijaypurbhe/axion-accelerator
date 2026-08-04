import { useMemo, useState } from "react";
import { ArrowLeft, Database } from "lucide-react";
import { PageHeader, SectionCard, StatTile, KeyValue } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { FilterBar } from "@/components/enterprise/FilterBar";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOMAIN_LABELS, SENSITIVITY_LABELS } from "@/domain/dataProducts";
import type { SourceField, SourceObject, SourceSystem } from "@/domain/dataProducts";
import { useSourceObjects, useSourceSystems } from "@/hooks/usePhase3";

const CONNECTION_VARIANT: Record<SourceSystem["connectionStatus"], string> = {
  connected: "border-success/30 bg-success/10 text-success",
  pending: "border-warning/40 bg-warning/10 text-warning-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  "not-configured": "border-border bg-muted text-muted-foreground",
};

/**
 * Source metadata catalog: browse source systems, then drill into a source object's
 * field-level metadata with sensitivity tagging, filters and search.
 */
const SourceCatalogPage = () => {
  const systems = useSourceSystems();
  const objects = useSourceObjects();

  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState("");

  const isLoading = systems.isLoading || objects.isLoading;
  const isError = systems.isError || objects.isError;

  const objectCountBySystem = useMemo(() => {
    const counts = new Map<string, number>();
    for (const object of objects.data ?? []) {
      counts.set(object.systemId, (counts.get(object.systemId) ?? 0) + 1);
    }
    return counts;
  }, [objects.data]);

  const domains = Array.from(new Set((systems.data ?? []).flatMap((system) => system.domains)));

  const filteredSystems = (systems.data ?? []).filter((system) => {
    const matchesSearch =
      !search ||
      system.name.toLowerCase().includes(search.toLowerCase()) ||
      system.platform.toLowerCase().includes(search.toLowerCase());
    const matchesDomain = domainFilter === "all" || system.domains.includes(domainFilter as SourceSystem["domains"][number]);
    const matchesStatus = statusFilter === "all" || system.connectionStatus === statusFilter;
    return matchesSearch && matchesDomain && matchesStatus;
  });

  const selectedSystem = (systems.data ?? []).find((system) => system.id === selectedSystemId);
  const systemObjects = (objects.data ?? []).filter((object) => object.systemId === selectedSystemId);
  const selectedObject = systemObjects.find((object) => object.id === selectedObjectId);

  const filteredFields = (selectedObject?.fields ?? []).filter(
    (field) =>
      !fieldSearch ||
      field.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      field.description.toLowerCase().includes(fieldSearch.toLowerCase()),
  );

  const systemColumns: readonly DataTableColumn<SourceSystem>[] = [
    {
      key: "name",
      header: "Source system",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.platform}</p>
        </div>
      ),
    },
    {
      key: "domains",
      header: "Domains",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.domains.slice(0, 3).map((domain) => (
            <Badge key={domain} variant="outline">
              {DOMAIN_LABELS[domain]}
            </Badge>
          ))}
          {row.domains.length > 3 ? <Badge variant="outline">+{row.domains.length - 3}</Badge> : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Connection",
      render: (row) => <Badge variant="outline" className={CONNECTION_VARIANT[row.connectionStatus]}>{row.connectionStatus}</Badge>,
    },
    { key: "objects", header: "Objects", render: (row) => objectCountBySystem.get(row.id) ?? 0, align: "right" },
    { key: "sensitivity", header: "Sensitivity", render: (row) => SENSITIVITY_LABELS[row.sensitivity] },
    { key: "refresh", header: "Refresh", render: (row) => row.refreshFrequency },
  ];

  const objectColumns: readonly DataTableColumn<SourceObject>[] = [
    {
      key: "name",
      header: "Object",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.label}</p>
        </div>
      ),
    },
    { key: "domain", header: "Domain", render: (row) => DOMAIN_LABELS[row.domain] },
    { key: "records", header: "Records", render: (row) => row.recordCount.toLocaleString(), align: "right" },
    { key: "refresh", header: "Refresh", render: (row) => row.refreshFrequency },
    { key: "fields", header: "Fields", render: (row) => row.fields.length, align: "right" },
  ];

  const fieldColumns: readonly DataTableColumn<SourceField>[] = [
    { key: "name", header: "Field", render: (row) => <code className="text-xs">{row.name}</code> },
    { key: "type", header: "Type", render: (row) => row.dataType },
    { key: "nullable", header: "Nullable", render: (row) => (row.nullable ? "Yes" : "No") },
    { key: "sensitivity", header: "Sensitivity", render: (row) => <Badge variant="outline">{SENSITIVITY_LABELS[row.sensitivity]}</Badge> },
    { key: "sample", header: "Sample value", render: (row) => <code className="text-xs text-muted-foreground">{row.sampleValue ?? "—"}</code> },
    { key: "description", header: "Description", render: (row) => row.description },
  ];

  if (isLoading) return <LoadingState label="Loading the source metadata catalog" />;
  if (isError) return <ErrorState message="Unable to load the source metadata catalog." />;

  if (selectedSystem) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Data Product Ecosystem"
          title={selectedSystem.name}
          description={`${selectedSystem.platform} · ${selectedSystem.geography}`}
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSystemId(null);
                setSelectedObjectId(null);
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to source systems
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatTile label="Connection" value={selectedSystem.connectionStatus} />
          <StatTile label="Objects" value={systemObjects.length} />
          <StatTile label="Sensitivity" value={SENSITIVITY_LABELS[selectedSystem.sensitivity]} />
          <StatTile label="Availability" value={selectedSystem.availability} />
        </div>

        <SectionCard title="System metadata">
          <dl className="grid gap-4 sm:grid-cols-3">
            <KeyValue label="System owner" value={selectedSystem.systemOwner} />
            <KeyValue label="Data owner" value={selectedSystem.dataOwner} />
            <KeyValue label="Data residency" value={selectedSystem.dataResidency} />
            <KeyValue label="Estimated volume" value={selectedSystem.estimatedVolume} />
            <KeyValue label="Supported patterns" value={selectedSystem.supportedPatterns.join(", ")} />
            <KeyValue label="Metadata synced" value={new Date(selectedSystem.metadataSyncedAt).toLocaleString()} />
          </dl>
        </SectionCard>

        {selectedObject ? (
          <SectionCard
            title={`${selectedObject.name} field metadata`}
            description={selectedObject.label}
            actions={
              <Button size="sm" variant="outline" onClick={() => setSelectedObjectId(null)}>
                Back to objects
              </Button>
            }
          >
            <FilterBar search={{ value: fieldSearch, onChange: setFieldSearch, placeholder: "Search fields" }} className="mb-4" />
            {filteredFields.length === 0 ? (
              <EmptyState title="No fields match" message="Adjust the field search." icon={<Database className="h-5 w-5" aria-hidden />} />
            ) : (
              <DataTable columns={fieldColumns} rows={filteredFields} rowKey={(row) => row.id} />
            )}
          </SectionCard>
        ) : (
          <SectionCard title="Source objects" description={`${systemObjects.length} objects`}>
            {systemObjects.length === 0 ? (
              <EmptyState title="No objects registered" message="No source objects have been catalogued for this system yet." />
            ) : (
              <DataTable
                columns={objectColumns}
                rows={systemObjects}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedObjectId(row.id)}
                emptyTitle="No objects"
                emptyMessage="No source objects catalogued."
              />
            )}
          </SectionCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Product Ecosystem"
        title="Source metadata catalog"
        description="Registered source systems with connection health, domains and drill-down into field-level metadata."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Source systems" value={systems.data?.length ?? 0} />
        <StatTile label="Source objects" value={objects.data?.length ?? 0} />
        <StatTile
          label="Connected"
          value={(systems.data ?? []).filter((system) => system.connectionStatus === "connected").length}
        />
        <StatTile
          label="Needs attention"
          value={(systems.data ?? []).filter((system) => system.connectionStatus === "error" || system.connectionStatus === "pending").length}
        />
      </div>

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search source systems" }}
        filters={[
          {
            id: "domain",
            label: "Domain",
            value: domainFilter,
            onChange: setDomainFilter,
            options: domains.map((value) => ({ value, label: DOMAIN_LABELS[value] })),
          },
          {
            id: "status",
            label: "Connection",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "connected", label: "Connected" },
              { value: "pending", label: "Pending" },
              { value: "error", label: "Error" },
              { value: "not-configured", label: "Not configured" },
            ],
          },
        ]}
      />

      <SectionCard title="Source systems" description={`${filteredSystems.length} of ${systems.data?.length ?? 0} systems`}>
        {filteredSystems.length === 0 ? (
          <EmptyState title="No source systems match" message="Adjust search or filters." icon={<Database className="h-5 w-5" aria-hidden />} />
        ) : (
          <DataTable
            columns={systemColumns}
            rows={filteredSystems}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedSystemId(row.id)}
            emptyTitle="No source systems"
            emptyMessage="No source systems catalogued."
          />
        )}
      </SectionCard>
    </div>
  );
};

export default SourceCatalogPage;
