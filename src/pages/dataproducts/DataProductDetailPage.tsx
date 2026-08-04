import { useParams, useNavigate } from "react-router-dom";
import { PageHeader, SectionCard, KeyValue } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { ApprovalBadge } from "@/components/enterprise/Badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { CATEGORY_LABELS, DOMAIN_LABELS, STATE_LABELS, SENSITIVITY_LABELS } from "@/domain/dataProducts";
import { buildScorecard } from "@/services/dataQuality";
import {
  useActiveInitiativeId,
  useDataProduct,
  useDataProducts,
  useDataProductTemplates,
  useFieldMappings,
} from "@/hooks/usePhase3";
import { getSourceObject, getSourceSystem } from "@/data/sourceCatalog";
import type {
  DataProductAttribute,
  DataProductIdentifier,
  DataProductRelationship,
  QualityRule,
  FieldMapping,
} from "@/domain/dataProducts";

const DataProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const initiativeId = useActiveInitiativeId();
  const direct = useDataProduct(productId);
  const templates = useDataProductTemplates();
  const products = useDataProducts(initiativeId);
  const mappings = useFieldMappings(initiativeId);

  const isLoading = direct.isLoading || templates.isLoading || products.isLoading;
  const isError = direct.isError || templates.isError || products.isError;

  const product =
    direct.data ??
    products.data?.find((item) => item.id === productId) ??
    templates.data?.find((item) => item.id === productId);

  if (isLoading) return <LoadingState label="Loading data product" />;
  if (isError) return <ErrorState message="Unable to load this data product." />;
  if (!product) return <EmptyState title="Data product not found" message="It may have been removed or renamed." />;

  const scorecard = buildScorecard(product, mappings.data ?? []);
  const productMappings = (mappings.data ?? []).filter((mapping) => mapping.targetProductId === product.id);

  const attributeColumns: readonly DataTableColumn<DataProductAttribute>[] = [
    { key: "businessName", header: "Business name", render: (row) => row.businessName },
    { key: "technicalName", header: "Technical name", render: (row) => <code className="text-xs">{row.technicalName}</code> },
    { key: "dataType", header: "Type", render: (row) => row.dataType },
    {
      key: "flags",
      header: "Flags",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.primaryKey ? <Badge variant="outline">PK</Badge> : null}
          {row.alternateKey ? <Badge variant="outline">AK</Badge> : null}
          {row.required ? <Badge variant="outline">Required</Badge> : null}
        </div>
      ),
    },
    { key: "sensitivity", header: "Sensitivity", render: (row) => SENSITIVITY_LABELS[row.sensitivity] },
  ];

  const identifierColumns: readonly DataTableColumn<DataProductIdentifier>[] = [
    { key: "name", header: "Identifier", render: (row) => row.name },
    { key: "kind", header: "Kind", render: (row) => row.kind },
    { key: "identityRelevant", header: "Identity relevant", render: (row) => (row.identityRelevant ? "Yes" : "No") },
    { key: "description", header: "Description", render: (row) => row.description },
  ];

  const relationshipColumns: readonly DataTableColumn<DataProductRelationship>[] = [
    { key: "name", header: "Relationship", render: (row) => row.name },
    { key: "target", header: "Target product", render: (row) => row.targetProductId },
    { key: "cardinality", header: "Cardinality", render: (row) => row.cardinality },
    { key: "description", header: "Description", render: (row) => row.description },
  ];

  const ruleColumns: readonly DataTableColumn<QualityRule>[] = [
    { key: "name", header: "Rule", render: (row) => row.name },
    { key: "dimension", header: "Dimension", render: (row) => row.dimension },
    { key: "threshold", header: "Threshold", render: (row) => `${row.threshold}%`, align: "right" },
    { key: "severity", header: "Severity", render: (row) => <Badge variant="outline">{row.severity}</Badge> },
    { key: "status", header: "Status", render: (row) => row.status },
  ];

  const mappingColumns: readonly DataTableColumn<FieldMapping>[] = [
    {
      key: "source",
      header: "Source",
      render: (row) => {
        const system = getSourceSystem(row.sourceSystemId);
        const object = getSourceObject(row.sourceObjectId);
        return (
          <span className="text-xs text-muted-foreground">
            {system?.platform ?? row.sourceSystemId} · {object?.name ?? row.sourceObjectId}.{row.sourceFieldId}
          </span>
        );
      },
    },
    {
      key: "target",
      header: "Target attribute",
      render: (row) => product.attributes.find((attribute) => attribute.id === row.targetAttributeId)?.businessName ?? row.targetAttributeId,
    },
    { key: "status", header: "Status", render: (row) => row.status },
    { key: "confidence", header: "Confidence", render: (row) => (row.confidence ? `${Math.round(row.confidence * 100)}%` : "—"), align: "right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={CATEGORY_LABELS[product.category]}
        title={product.name}
        description={product.description}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/data-products")}>
              Back to library
            </Button>
            <Button onClick={() => navigate(`/data-products/mapping-workbench?productId=${product.id}`)}>
              Open mapping workbench
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">State</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{STATE_LABELS[product.state]}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Definition completeness</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{scorecard.completeness}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mapping coverage</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{scorecard.mappingCoverage}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quality score</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{scorecard.qualityScore}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
          <TabsTrigger value="versions">Versions & approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <SectionCard title="Business context">
            <dl className="grid gap-4 sm:grid-cols-2">
              <KeyValue label="Business purpose" value={product.businessPurpose} />
              <KeyValue label="Domain" value={DOMAIN_LABELS[product.domain]} />
              <KeyValue label="Business owner" value={product.businessOwnerRole} />
              <KeyValue label="Technical owner" value={product.technicalOwnerRole} />
              <KeyValue label="Conceptual DLO" value={product.conceptualDlo ?? "Not defined"} />
              <KeyValue label="Standardized DMO" value={product.standardizedDmo ?? "Not defined"} />
              <KeyValue label="Salesforce alignment" value={product.salesforceAlignment} />
              <KeyValue
                label="Applicable use cases"
                value={product.applicableUseCases.length ? product.applicableUseCases.join(", ") : "None recorded"}
              />
            </dl>
          </SectionCard>
          <SectionCard title="Classification and controls">
            <dl className="grid gap-4 sm:grid-cols-2">
              <KeyValue label="Sensitivity" value={SENSITIVITY_LABELS[product.controls.sensitivity]} />
              <KeyValue label="Regulatory" value={product.controls.regulatory.join(", ") || "None"} />
              <KeyValue label="Retention" value={product.controls.retention} />
              <KeyValue label="Residency" value={product.controls.residency} />
              <KeyValue label="Encryption required" value={product.controls.encryptionRequired ? "Yes" : "No"} />
              <KeyValue label="Masking required" value={product.controls.maskingRequired ? "Yes" : "No"} />
            </dl>
          </SectionCard>
        </TabsContent>

        <TabsContent value="attributes" className="mt-4">
          <SectionCard title="Attributes" description={`${product.attributes.length} attributes`}>
            <DataTable columns={attributeColumns} rows={product.attributes} rowKey={(row) => row.id} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="identifiers" className="mt-4">
          <SectionCard title="Identifiers">
            <DataTable columns={identifierColumns} rows={product.identifiers} rowKey={(row) => row.id} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="relationships" className="mt-4">
          <SectionCard title="Relationships">
            <DataTable columns={relationshipColumns} rows={product.relationships} rowKey={(row) => row.id} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="quality" className="mt-4 space-y-4">
          <SectionCard title="Quality rules">
            <DataTable columns={ruleColumns} rows={product.qualityRules} rowKey={(row) => row.id} />
          </SectionCard>
          {scorecard.criticalIssues.length > 0 ? (
            <SectionCard title="Critical issues">
              <ul className="space-y-2 text-sm">
                {scorecard.criticalIssues.map((issue) => (
                  <li key={issue.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="font-medium text-foreground">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">{issue.detail}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </TabsContent>

        <TabsContent value="mappings" className="mt-4">
          <SectionCard
            title="Field mappings"
            description={`${productMappings.length} mappings from source systems`}
            actions={
              <Button size="sm" variant="outline" onClick={() => navigate(`/data-products/mapping-workbench?productId=${product.id}`)}>
                Open workbench
              </Button>
            }
          >
            <DataTable columns={mappingColumns} rows={productMappings} rowKey={(row) => row.id} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="versions" className="mt-4 space-y-4">
          <SectionCard title="Versions">
            <ul className="space-y-3">
              {product.versions.map((version) => (
                <li key={version.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">v{version.version}</p>
                    <Badge variant="outline">{version.state}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{version.summary}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {version.createdBy} · {new Date(version.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Approvals">
            {product.approvals.length === 0 ? (
              <EmptyState title="No approvals requested" message="Submit this data product for approval from the builder or detail actions." />
            ) : (
              <ul className="space-y-3">
                {product.approvals.map((approval) => (
                  <li key={approval.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm text-foreground">Requested by {approval.requestedBy}</p>
                      <p className="text-xs text-muted-foreground">Approver: {approval.approverRole}</p>
                    </div>
                    <ApprovalBadge state={approval.state === "submitted" ? "submitted" : approval.state} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataProductDetailPage;
