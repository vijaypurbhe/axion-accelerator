import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Database, PlugZap, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { MetaPill } from "@/components/enterprise/Badges";

import { useToast } from "@/hooks/use-toast";
import { useAxion } from "@/context/AxionContext";
import { useActor } from "@/hooks/useWorkspace";
import { useActiveInitiativeId, useSaveDataProduct } from "@/hooks/usePhase3";
import { CONNECTORS, connectorById, fetchConnectorMetadata } from "@/data/connectorCatalog";
import { useClients } from "@/hooks/useWorkspace";
import { normalizeConnectorPayload, toDataProductDraft } from "@/services/metadataNormalizer";
import type { ConnectorId, NormalizationResult, NormalizedEntity, NormalizedField } from "@/domain/metadataImport";
import { cn } from "@/lib/utils";

type Step = "connect" | "select" | "normalize" | "import";

const STEPS: readonly { readonly id: Step; readonly label: string; readonly description: string }[] = [
  { id: "connect", label: "Connect", description: "Choose a platform and supply read-only metadata credentials." },
  { id: "select", label: "Discover", description: "Select the objects or tables to ingest." },
  { id: "normalize", label: "Normalize", description: "Review the canonical mapping, inferred types and sensitivity." },
  { id: "import", label: "Import", description: "Create draft data products in the active initiative." },
];

const MetadataImportWizardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const actor = useActor();
  const { activeClientId } = useAxion();
  const initiativeId = useActiveInitiativeId();
  const saveProduct = useSaveDataProduct();
  const { data: clients = [] } = useClients();
  const activeIndustry = clients.find((client) => client.id === activeClientId)?.industry;
  const isSimulation = clients.find((client) => client.id === activeClientId)?.isSimulation ?? false;

  const [step, setStep] = useState<Step>("connect");
  const [connectorId, setConnectorId] = useState<ConnectorId>("salesforce");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<NormalizationResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<readonly string[]>([]);

  const connector = connectorById(connectorId);
  const stepIndex = STEPS.findIndex((entry) => entry.id === step);

  const entities = result?.entities ?? [];
  const selectedEntities = useMemo(() => entities.filter((entity) => selected.has(entity.key)), [entities, selected]);

  const missingCredentials = connector.credentialFields
    .filter((field) => !field.optional && !(credentials[field.name] ?? "").trim())
    .map((field) => field.label);

  const connect = async () => {
    setConnecting(true);
    try {
      const payload = await fetchConnectorMetadata(connectorId);
      const normalized = normalizeConnectorPayload(payload);
      setResult(normalized);
      setSelected(new Set(normalized.entities.map((entity) => entity.key)));
      setStep("select");
      toast({
        title: `${connector.name} metadata retrieved`,
        description: `${normalized.entities.length} object(s) · ${normalized.fieldCount} field(s) normalized.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Metadata read failed",
        description: error instanceof Error ? error.message : "Unknown connector error.",
      });
    } finally {
      setConnecting(false);
    }
  };

  const runImport = async () => {
    const created: string[] = [];
    for (const entity of selectedEntities) {
      const product = toDataProductDraft(entity, {
        initiativeId,
        clientId: activeClientId,
        industry: activeIndustry,
        actor: actor.actor,
      });
      await saveProduct.mutateAsync({ product, isNew: true });
      created.push(product.name);
    }
    setImported(created);
    setStep("import");
    toast({ title: "Import complete", description: `${created.length} draft data product(s) created.` });
  };

  const entityColumns: DataTableColumn<NormalizedEntity>[] = [
    {
      key: "select",
      header: "",
      render: (entity) => (
        <Checkbox
          checked={selected.has(entity.key)}
          aria-label={`Select ${entity.label}`}
          onCheckedChange={(checked) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(entity.key);
              else next.delete(entity.key);
              return next;
            })
          }
        />
      ),
    },
    {
      key: "object",
      header: "Source object",
      render: (entity) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{entity.label}</p>
          <p className="text-xs text-muted-foreground">
            {entity.namespace} · {entity.sourceName}
          </p>
        </div>
      ),
    },
    { key: "domain", header: "Inferred domain", render: (entity) => <MetaPill>{entity.domain}</MetaPill> },
    { key: "fields", header: "Fields", align: "right", render: (entity) => <span className="tabular-nums text-xs">{entity.fields.length}</span> },
    {
      key: "records",
      header: "Records",
      align: "right",
      render: (entity) => <span className="tabular-nums text-xs">{entity.recordCount.toLocaleString()}</span>,
    },
    {
      key: "notes",
      header: "Normalization notes",
      render: (entity) =>
        entity.notes.length === 0 ? (
          <span className="text-xs text-muted-foreground">Clean mapping</span>
        ) : (
          <span className="text-xs text-warning-foreground">{entity.notes.length} note(s)</span>
        ),
    },
  ];

  const fieldColumns: DataTableColumn<NormalizedField & { entity: string }>[] = [
    { key: "entity", header: "Object", render: (field) => <span className="text-xs text-muted-foreground">{field.entity}</span> },
    {
      key: "source",
      header: "Source field",
      render: (field) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">{field.sourceName}</p>
          <p className="text-[11px] text-muted-foreground">{field.nativeType}</p>
        </div>
      ),
    },
    {
      key: "canonical",
      header: "Canonical attribute",
      render: (field) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">{field.name}</p>
          <p className="text-[11px] text-muted-foreground">{field.label}</p>
        </div>
      ),
    },
    { key: "type", header: "Canonical type", render: (field) => <MetaPill>{field.dataType}</MetaPill> },
    {
      key: "sensitivity",
      header: "Sensitivity",
      render: (field) => (
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            (field.sensitivity === "pii" || field.sensitivity === "financial-pii") && "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {field.sensitivity.replace(/-/g, " ")}
        </Badge>
      ),
    },
    {
      key: "constraints",
      header: "Constraints",
      render: (field) => (
        <span className="text-xs text-muted-foreground">
          {field.primaryKey ? "Key · " : ""}
          {field.nullable ? "Nullable" : "Required"}
        </span>
      ),
    },
  ];

  const normalizedFieldRows = selectedEntities.flatMap((entity) =>
    entity.fields.map((field) => ({ ...field, entity: entity.label })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Design & Build"
        title="Metadata import wizard"
        description="Connect SAP, Snowflake, Salesforce or Oracle, normalize their native metadata into the Axion canonical data product format, and create draft data products for mapping."
        actions={
          <Button variant="outline" onClick={() => navigate("/data-products")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Data products
          </Button>
        }
      />

      <ol className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-4">
        {STEPS.map((entry, index) => {
          const state = index < stepIndex ? "complete" : index === stepIndex ? "current" : "upcoming";
          return (
            <li key={entry.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  state === "complete" && "border-success bg-success/10 text-success",
                  state === "current" && "border-brand bg-brand text-brand-foreground",
                  state === "upcoming" && "border-border text-muted-foreground",
                )}
              >
                {state === "complete" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              <div className="space-y-0.5">
                <p className={cn("text-sm font-semibold", state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                  {entry.label}
                </p>
                <p className="text-xs text-muted-foreground">{entry.description}</p>
              </div>
            </li>
          );
        })}
      </ol>


      {step === "connect" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <SectionCard title="Source platform" description="Each connector reads metadata only — no customer records are copied.">
            <div className="space-y-2">
              {CONNECTORS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setConnectorId(entry.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition",
                    entry.id === connectorId ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand/40",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.metadataDialect}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={`${connector.name} connection`}
            description={connector.summary}
            actions={
              <Button onClick={connect} disabled={connecting || missingCredentials.length > 0}>
                <PlugZap className="mr-2 h-4 w-4" />
                {connecting ? "Reading metadata…" : "Connect & read metadata"}
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {connector.credentialFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={`cred-${field.name}`}>
                    {field.label}
                    {field.optional ? <span className="ml-1 text-xs text-muted-foreground">(optional)</span> : null}
                  </Label>
                  <Input
                    id={`cred-${field.name}`}
                    type={field.secret ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={credentials[field.name] ?? ""}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {connector.capabilities.map((capability) => (
                <MetaPill key={capability}>{capability}</MetaPill>
              ))}
            </div>
            {missingCredentials.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Required: {missingCredentials.join(", ")}.</p>
            ) : null}
            {!isSimulation ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Live connector reads are not enabled in this workspace yet. Sample metadata for each platform is
                available inside a simulation / training workspace.
              </p>
            ) : null}

          </SectionCard>
        </div>
      ) : null}

      {step === "select" && result ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile label="Objects discovered" value={entities.length} hint={connector.name} />
            <StatTile label="Fields normalized" value={result.fieldCount} hint="Canonical attributes" />
            <StatTile label="Selected" value={selected.size} hint="Will become draft data products" />
            <StatTile label="Normalization notes" value={result.notes.length} hint="Steward review required" />
          </div>
          <SectionCard title="Discovered metadata" description="Domains, field counts and record volumes are read from the source dictionary.">
            <DataTable columns={entityColumns} rows={entities} rowKey={(entity) => entity.key} emptyTitle="Nothing discovered" />
          </SectionCard>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("connect")}>
              Back
            </Button>
            <Button disabled={selected.size === 0} onClick={() => setStep("normalize")}>
              Review normalization
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "normalize" && result ? (
        <div className="space-y-4">
          <SectionCard
            title="Canonical schema mapping"
            description="Native types are coerced to Axion canonical types, and sensitivity is inferred from field naming and comments."
          >
            <DataTable
              columns={fieldColumns}
              rows={normalizedFieldRows}
              rowKey={(field) => `${field.entity}-${field.sourceName}`}
              emptyTitle="No fields selected"
            />
          </SectionCard>

          <SectionCard title="Normalization notes" description="Every inference the layer made, for steward review before import.">
            {selectedEntities.every((entity) => entity.notes.length === 0) ? (
              <p className="text-sm text-muted-foreground">No inference notes — all fields mapped cleanly.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEntities.flatMap((entity) =>
                  entity.notes.map((note) => (
                    <li
                      key={`${entity.key}-${note}`}
                      className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground"
                    >
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-brand" aria-hidden />
                      <span>
                        <span className="font-medium text-foreground">{entity.label}</span> — {note}
                      </span>
                    </li>
                  )),
                )}
              </ul>
            )}
          </SectionCard>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button disabled={saveProduct.isPending} onClick={() => void runImport()}>
              <Database className="mr-2 h-4 w-4" />
              {saveProduct.isPending ? "Importing…" : `Import ${selectedEntities.length} data product(s)`}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "import" ? (
        <SectionCard title="Import complete" description="Draft data products were created in the active initiative and recorded in the audit trail.">
          <ul className="space-y-2">
            {imported.map((name) => (
              <li key={name} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                {name}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("connect")}>
              Import another source
            </Button>
            <Button onClick={() => navigate("/mapping")}>
              Open mapping workbench
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
};

export default MetadataImportWizardPage;
