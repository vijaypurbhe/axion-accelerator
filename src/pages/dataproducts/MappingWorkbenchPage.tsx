import { useMemo, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAPPING_STATUS_LABELS, TRANSFORMATION_LABELS } from "@/domain/dataProducts";
import type { FieldMapping, SourceField, TransformationKind } from "@/domain/dataProducts";
import { mappingCoverage, mappingsToCsv } from "@/services/dataQuality";
import {
  useActiveInitiativeId,
  useDataAiSuggestions,
  useDataProducts,
  useDecideDataAiSuggestion,
  useFieldMappings,
  useSaveFieldMapping,
  useSourceObjects,
  useSourceSystems,
} from "@/hooks/usePhase3";
import { getSourceObject, getSourceSystem } from "@/data/sourceCatalog";

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const TRANSFORMATION_KINDS = Object.keys(TRANSFORMATION_LABELS) as TransformationKind[];

/**
 * Source-to-canonical field mapping workbench: pick a source object and a data product,
 * map fields with transformations, Data 360 DLO/DMO alignment and identity relevance,
 * see live coverage scoring, and review/accept AI suggested mappings.
 */
const MappingWorkbenchPage = () => {
  const initiativeId = useActiveInitiativeId();
  const systems = useSourceSystems();
  const objects = useSourceObjects();
  const products = useDataProducts(initiativeId);
  const mappings = useFieldMappings(initiativeId);
  const suggestions = useDataAiSuggestions(initiativeId);
  const saveMapping = useSaveFieldMapping();
  const decideSuggestion = useDecideDataAiSuggestion();

  const [systemId, setSystemId] = useState<string>("");
  const [objectId, setObjectId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [targetAttributeId, setTargetAttributeId] = useState<string>("");
  const [transformationKind, setTransformationKind] = useState<TransformationKind>("rename");
  const [expression, setExpression] = useState("");
  const [notes, setNotes] = useState("");
  const [identityRelevant, setIdentityRelevant] = useState(false);

  const isLoading = systems.isLoading || objects.isLoading || products.isLoading || mappings.isLoading || suggestions.isLoading;
  const isError = systems.isError || objects.isError || products.isError || mappings.isError || suggestions.isError;

  const objectsForSystem = (objects.data ?? []).filter((object) => object.systemId === systemId);
  const selectedObject = objectsForSystem.find((object) => object.id === objectId);
  const selectedProduct = (products.data ?? []).find((product) => product.id === productId);

  const productMappings = (mappings.data ?? []).filter((mapping) => mapping.targetProductId === productId);
  const coverage = selectedProduct ? mappingCoverage(selectedProduct, mappings.data ?? []) : 0;

  const relevantSuggestions = (suggestions.data ?? []).filter(
    (suggestion) => suggestion.kind === "mapping" && suggestion.status === "pending",
  );

  const resolveSource = (mapping: FieldMapping) => {
    const system = getSourceSystem(mapping.sourceSystemId);
    const object = getSourceObject(mapping.sourceObjectId);
    return { system: system?.platform ?? mapping.sourceSystemId, object: object?.name ?? mapping.sourceObjectId, field: mapping.sourceFieldId };
  };

  const handleExportCsv = () => {
    if (!selectedProduct) return;
    const csv = mappingsToCsv(selectedProduct, mappings.data ?? [], resolveSource);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedProduct.id}-field-mappings.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveMapping = () => {
    if (!selectedObject || !selectedFieldId || !selectedProduct || !targetAttributeId) return;
    const nowIso = new Date().toISOString();
    const mapping: FieldMapping = {
      id: uid("fm"),
      initiativeId,
      sourceSystemId: selectedObject.systemId,
      sourceObjectId: selectedObject.id,
      sourceFieldId: selectedFieldId,
      targetProductId: selectedProduct.id,
      targetAttributeId,
      transformations: expression
        ? [{ id: uid("tr"), kind: transformationKind, expression, notes: notes || undefined }]
        : [],
      status: "mapped",
      owner: "data-engineer",
      testStatus: "not-run",
      aiSuggested: false,
      identityRelevant,
      derived: false,
      activationEligible: true,
      conceptualDlo: `${selectedProduct.domain}_landing`,
      standardizedDmo: selectedProduct.standardizedDmo,
      notes: notes || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    saveMapping.mutate(mapping, {
      onSuccess: () => {
        setSelectedFieldId(null);
        setTargetAttributeId("");
        setExpression("");
        setNotes("");
        setIdentityRelevant(false);
      },
    });
  };

  const mappingColumns: readonly DataTableColumn<FieldMapping>[] = [
    {
      key: "source",
      header: "Source field",
      render: (row) => {
        const source = resolveSource(row);
        return (
          <span className="text-xs text-muted-foreground">
            {source.system} · {source.object}.{source.field}
          </span>
        );
      },
    },
    {
      key: "target",
      header: "Target attribute",
      render: (row) => selectedProduct?.attributes.find((attribute) => attribute.id === row.targetAttributeId)?.businessName ?? row.targetAttributeId,
    },
    {
      key: "transform",
      header: "Transformation",
      render: (row) => (row.transformations.length ? TRANSFORMATION_LABELS[row.transformations[0].kind] : "None"),
    },
    { key: "dlo", header: "Landing (DLO)", render: (row) => row.conceptualDlo ?? "—" },
    { key: "dmo", header: "Standardized (DMO)", render: (row) => row.standardizedDmo ?? "—" },
    { key: "identity", header: "Identity relevant", render: (row) => (row.identityRelevant ? "Yes" : "No") },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="outline" className={row.aiSuggested ? "border-brand/40 bg-brand/10 text-brand" : undefined}>
          {row.aiSuggested ? <Sparkles className="mr-1 h-3 w-3" aria-hidden /> : null}
          {MAPPING_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    { key: "confidence", header: "Confidence", render: (row) => (row.confidence ? `${Math.round(row.confidence * 100)}%` : "—"), align: "right" },
  ];

  const unmappedRequired = useMemo(() => {
    if (!selectedProduct) return [] as string[];
    const mappedIds = new Set(productMappings.filter((mapping) => mapping.status !== "rejected").map((mapping) => mapping.targetAttributeId));
    return selectedProduct.attributes.filter((attribute) => attribute.required && !mappedIds.has(attribute.id)).map((attribute) => attribute.businessName);
  }, [selectedProduct, productMappings]);

  if (isLoading) return <LoadingState label="Loading the mapping workbench" />;
  if (isError) return <ErrorState message="Unable to load mapping workbench data." />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Product Ecosystem"
        title="Mapping workbench"
        description="Map source fields to canonical data product attributes with Data 360 DLO/DMO alignment, identity relevance and live coverage scoring."
        actions={
          <Button variant="outline" onClick={handleExportCsv} disabled={!selectedProduct}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden /> Export mapping CSV
          </Button>
        }
      />

      <SectionCard title="Select source and target">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            value={systemId}
            onValueChange={(value) => {
              setSystemId(value);
              setObjectId("");
              setSelectedFieldId(null);
            }}
          >
            <SelectTrigger aria-label="Source system">
              <SelectValue placeholder="Source system" />
            </SelectTrigger>
            <SelectContent>
              {(systems.data ?? []).map((system) => (
                <SelectItem key={system.id} value={system.id}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={objectId} onValueChange={(value) => { setObjectId(value); setSelectedFieldId(null); }} disabled={!systemId}>
            <SelectTrigger aria-label="Source object">
              <SelectValue placeholder="Source object" />
            </SelectTrigger>
            <SelectContent>
              {objectsForSystem.map((object) => (
                <SelectItem key={object.id} value={object.id}>
                  {object.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger aria-label="Target data product">
              <SelectValue placeholder="Target data product" />
            </SelectTrigger>
            <SelectContent>
              {(products.data ?? []).map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {!selectedObject || !selectedProduct ? (
        <EmptyState title="Choose a source object and target data product" message="Select both to begin mapping fields." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile label="Coverage" value={`${coverage}%`} hint={`${productMappings.length} mappings defined`} />
            <StatTile label="Source fields" value={selectedObject.fields.length} />
            <StatTile label="Target attributes" value={selectedProduct.attributes.length} />
            <StatTile label="Required unmapped" value={unmappedRequired.length} hint={unmappedRequired.slice(0, 2).join(", ") || "None"} />
          </div>

          <SectionCard title="New mapping" description={`Map a field from ${selectedObject.name} to ${selectedProduct.name}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={selectedFieldId ?? ""} onValueChange={setSelectedFieldId}>
                <SelectTrigger aria-label="Source field">
                  <SelectValue placeholder="Source field" />
                </SelectTrigger>
                <SelectContent>
                  {selectedObject.fields.map((field: SourceField) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name} ({field.dataType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={targetAttributeId} onValueChange={setTargetAttributeId}>
                <SelectTrigger aria-label="Target attribute">
                  <SelectValue placeholder="Target attribute" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.attributes.map((attribute) => (
                    <SelectItem key={attribute.id} value={attribute.id}>
                      {attribute.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={transformationKind} onValueChange={(value) => setTransformationKind(value as TransformationKind)}>
                <SelectTrigger aria-label="Transformation kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFORMATION_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {TRANSFORMATION_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Transformation expression" value={expression} rows={1} onChange={(event) => setExpression(event.target.value)} />
              <Textarea className="sm:col-span-2" placeholder="Notes" value={notes} rows={1} onChange={(event) => setNotes(event.target.value)} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={identityRelevant} onChange={(event) => setIdentityRelevant(event.target.checked)} />
                Identity relevant
              </label>
              <div className="flex justify-end">
                <Button onClick={handleSaveMapping} disabled={!selectedFieldId || !targetAttributeId || saveMapping.isPending}>
                  {saveMapping.isPending ? "Saving…" : "Save mapping"}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Existing mappings" description={`${productMappings.length} mappings for ${selectedProduct.name}`}>
            {productMappings.length === 0 ? (
              <EmptyState title="No mappings yet" message="Create the first mapping above." />
            ) : (
              <DataTable columns={mappingColumns} rows={productMappings} rowKey={(row) => row.id} />
            )}
          </SectionCard>
        </>
      )}

      <SectionCard title="AI suggested mappings" description="Pending suggestions grounded in field-name and profiling similarity.">
        {relevantSuggestions.length === 0 ? (
          <EmptyState title="No pending AI suggestions" message="New mapping suggestions will appear here for review." icon={<Sparkles className="h-5 w-5" aria-hidden />} />
        ) : (
          <div className="space-y-3">
            {relevantSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                        <Sparkles className="mr-1 h-3 w-3" aria-hidden />
                        AI Suggested
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{suggestion.title}</h3>
                    <p className="text-sm text-muted-foreground">{suggestion.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Confidence</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">{Math.round(suggestion.confidence * 100)}%</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{suggestion.rationale}</p>
                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decideSuggestion.mutate({ suggestion, status: "rejected" })}
                    disabled={decideSuggestion.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const payload = suggestion.payload as Record<string, string>;
                      setSystemId(payload.sourceSystemId ?? systemId);
                      setObjectId(payload.sourceObjectId ?? objectId);
                      setProductId(payload.targetProductId ?? productId);
                      setSelectedFieldId(payload.sourceFieldId ?? null);
                      setTargetAttributeId(payload.targetAttributeId ?? "");
                      decideSuggestion.mutate({ suggestion, status: "edited", editedPayload: payload });
                    }}
                    disabled={decideSuggestion.isPending}
                  >
                    Edit in workbench
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const payload = suggestion.payload as {
                        sourceSystemId: string;
                        sourceObjectId: string;
                        sourceFieldId: string;
                        targetProductId: string;
                        targetAttributeId: string;
                      };
                      const nowIso = new Date().toISOString();
                      const mapping: FieldMapping = {
                        id: uid("fm"),
                        initiativeId,
                        sourceSystemId: payload.sourceSystemId,
                        sourceObjectId: payload.sourceObjectId,
                        sourceFieldId: payload.sourceFieldId,
                        targetProductId: payload.targetProductId,
                        targetAttributeId: payload.targetAttributeId,
                        transformations: [],
                        status: "mapped",
                        owner: "data-engineer",
                        testStatus: "not-run",
                        aiSuggested: true,
                        identityRelevant: false,
                        derived: false,
                        activationEligible: true,
                        confidence: suggestion.confidence,
                        createdAt: nowIso,
                        updatedAt: nowIso,
                      };
                      saveMapping.mutate(mapping);
                      decideSuggestion.mutate({ suggestion, status: "accepted" });
                    }}
                    disabled={decideSuggestion.isPending}
                  >
                    Accept
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default MappingWorkbenchPage;
