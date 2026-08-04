import { useMemo, useState } from "react";
import { Download, FileText, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { BlueprintCanvas } from "@/components/architecture/BlueprintCanvas";
import { DataTable } from "@/components/enterprise/DataTable";
import { LoadingState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAxion } from "@/context/AxionContext";
import { BLUEPRINT_LAYERS, COMPONENT_CATALOG, EXCLUDED_FROM_CATALOG, blueprintLayer } from "@/data/architectureCatalog";
import { SALESFORCE_PRODUCTS, SOURCE_PLATFORMS } from "@/domain/catalogs";
import { roleLabelFor } from "@/services/workspace";
import { useInitiative } from "@/hooks/useWorkspace";
import {
  useActiveInitiativeId,
  useAdrs,
  useArchitectureApprovals,
  useAssessmentSummary,
  useBlueprint,
  useDecideAdr,
  useDecideComponent,
  useGenerateArchitecture,
  useRemoveComponent,
  useSubmitArchitectureApproval,
  useUpsertAdr,
  useUpsertComponent,
  useVoteArchitectureApproval,
} from "@/hooks/usePhase2";
import type {
  AdrRecord,
  ArchitectureRecommendationInputs,
  ArchitectureView,
  BlueprintComponent,
  ComponentStatus,
} from "@/domain/phase2";
import type { RoleId } from "@/domain/models";
import type { SalesforceProductId } from "@/domain/types";

const STATUS_OPTIONS: readonly ComponentStatus[] = ["proposed", "approved", "in-build", "live", "rejected"];
const APPROVER_ROLES: readonly RoleId[] = ["enterprise-architect", "data360-architect", "agentforce-architect"];

const ArchitectureStudioPage = () => {
  const { toast } = useToast();
  const { persona } = useAxion();
  const initiativeId = useActiveInitiativeId();
  const initiative = useInitiative(initiativeId);
  const blueprint = useBlueprint(initiativeId);
  const adrs = useAdrs(initiativeId);
  const approvals = useArchitectureApprovals(initiativeId);
  const { summary } = useAssessmentSummary(initiativeId);

  const upsertComponent = useUpsertComponent();
  const removeComponent = useRemoveComponent(initiativeId);
  const decideComponent = useDecideComponent();
  const generate = useGenerateArchitecture(initiativeId);
  const upsertAdr = useUpsertAdr();
  const decideAdr = useDecideAdr();
  const submitApproval = useSubmitArchitectureApproval(initiativeId);
  const voteApproval = useVoteArchitectureApproval();

  const [view, setView] = useState<ArchitectureView>("target");
  const [physicalOnly, setPhysicalOnly] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selected, setSelected] = useState<BlueprintComponent | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [adrDraft, setAdrDraft] = useState<AdrRecord | null>(null);

  const [inputs, setInputs] = useState<ArchitectureRecommendationInputs>({
    useCaseIds: [],
    sourcePlatforms: ["salesforce", "snowflake", "core-banking"],
    latency: "near-real-time",
    volume: "high",
    residency: "EU / UK",
    regulatory: ["GDPR", "DORA"],
    activation: ["Marketing Cloud journeys", "Service Cloud agent console"],
    identityNeeds: ["Party unification across retail and commercial"],
    products: ["data-cloud", "agentforce", "financial-services-cloud"] as SalesforceProductId[],
  });

  const components = blueprint.data?.components ?? [];
  const connections = blueprint.data?.connections ?? [];
  const version = blueprint.data?.version ?? 1;
  const pendingAi = components.filter((component) => component.aiSuggested && component.acceptance === "pending");
  const openApproval = (approvals.data ?? []).find((request) => request.state === "submitted");

  const layerCoverage = useMemo(
    () => BLUEPRINT_LAYERS.map((layer) => ({ layer, count: components.filter((c) => c.layer === layer.id).length })),
    [components],
  );

  const toggle = <T extends string>(list: readonly T[], value: T): T[] =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  const newAdr = (): AdrRecord => ({
    id: `adr-${Date.now()}`,
    initiativeId,
    reference: `ADR-${String((adrs.data?.length ?? 0) + 1).padStart(3, "0")}`,
    title: "",
    status: "draft",
    context: "",
    options: [
      { title: "Option A", pros: "", cons: "" },
      { title: "Option B", pros: "", cons: "" },
    ],
    recommendation: "",
    rationale: "",
    consequences: "",
    risks: [],
    approvers: APPROVER_ROLES.map((role) => ({ role, required: role !== "agentforce-architect", state: "pending" as const })),
    componentIds: [],
    effectiveDate: new Date().toISOString().slice(0, 10),
    attachments: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: persona,
  });

  if (blueprint.isLoading) return <LoadingState label="Loading architecture blueprint" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Architecture Blueprint Studio"
        title="Target architecture and decisions"
        description={`Layered current and target architecture for ${initiative.data?.name ?? "the active initiative"} — blueprint version ${version}.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowExport(true)}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> Export preview
            </Button>
            <Button onClick={() => setShowGenerator(true)}>
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Recommend architecture
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Components" value={components.length} hint={`Across ${BLUEPRINT_LAYERS.length} layers`} />
        <StatTile label="AI awaiting decision" value={pendingAi.length} hint="Accept, edit or reject" />
        <StatTile label="Decision records" value={adrs.data?.length ?? 0} hint={`${(adrs.data ?? []).filter((adr) => adr.status === "approved").length} approved`} />
        <StatTile label="Blueprint version" value={`v${version}`} hint={openApproval ? "Approval in progress" : "No open approval"} />
      </div>

      <Tabs defaultValue="canvas">
        <TabsList>
          <TabsTrigger value="canvas">Blueprint canvas</TabsTrigger>
          <TabsTrigger value="catalog">Component catalog</TabsTrigger>
          <TabsTrigger value="adrs">Decision records</TabsTrigger>
          <TabsTrigger value="approval">Blueprint approval</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="space-y-4 pt-4">
          <SectionCard
            title="View controls"
            actions={
              <div className="flex flex-wrap items-center gap-4">
                <Select value={view} onValueChange={(value) => setView(value as ArchitectureView)}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current" className="text-xs">Current state</SelectItem>
                    <SelectItem value="target" className="text-xs">Target state</SelectItem>
                    <SelectItem value="both" className="text-xs">Current + target</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch id="physical" checked={physicalOnly} onCheckedChange={setPhysicalOnly} />
                  <Label htmlFor="physical" className="text-xs font-normal">Physical only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="controls" checked={showControls} onCheckedChange={setShowControls} />
                  <Label htmlFor="controls" className="text-xs font-normal">Show controls</Label>
                </div>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {layerCoverage.map(({ layer, count }) => (
                <Badge key={layer.id} variant="outline" className="text-[11px]">
                  {layer.name}: {count}
                </Badge>
              ))}
            </div>
          </SectionCard>

          <BlueprintCanvas
            components={components}
            connections={connections}
            view={view}
            physicalOnly={physicalOnly}
            showControls={showControls}
            selectedId={selected?.id}
            onSelect={setSelected}
          />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4 pt-4">
          <SectionCard
            title="Reusable component catalog"
            description="Source systems, Salesforce capabilities and logical services available to the blueprint."
          >
            <DataTable
              rows={COMPONENT_CATALOG}
              rowKey={(row) => row.id}
              columns={[
                { key: "name", header: "Component", render: (row) => <span className="text-sm font-medium">{row.name}</span> },
                { key: "kind", header: "Kind", render: (row) => <span className="text-xs capitalize">{row.kind.replace("-", " ")}</span> },
                { key: "layer", header: "Layer", render: (row) => <span className="text-xs">{blueprintLayer(row.defaultLayer).name}</span> },
                { key: "purpose", header: "Purpose", render: (row) => <span className="text-xs text-muted-foreground">{row.purpose}</span> },
                {
                  key: "add",
                  header: "",
                  align: "right",
                  render: (row) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        upsertComponent.mutate(
                          {
                            id: `cmp-${row.id}-${Date.now()}`,
                            initiativeId,
                            catalogId: row.id,
                            name: row.name,
                            kind: row.kind,
                            platform: row.platform,
                            layer: row.defaultLayer,
                            purpose: row.purpose,
                            dataDomain: "party",
                            integrationPattern: row.patterns?.[0] ?? "none",
                            securityClassification: "confidential",
                            owner: "data360-architect",
                            dependencies: [],
                            status: "proposed",
                            assumptions: [],
                            risks: [],
                            decisionIds: [],
                            view: "target",
                            physical: row.kind !== "logical-service",
                            controls: [],
                            aiSuggested: false,
                            acceptance: "accepted",
                          },
                          { onSuccess: () => toast({ title: `${row.name} added to blueprint` }) },
                        )
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" aria-hidden /> Add
                    </Button>
                  ),
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Out of scope for this release">
            <div className="flex flex-wrap gap-2">
              {EXCLUDED_FROM_CATALOG.map((entry) => (
                <Badge key={entry} variant="outline" className="text-[11px] text-muted-foreground line-through">
                  {entry}
                </Badge>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="adrs" className="space-y-3 pt-4">
          <SectionCard
            title="Architecture decision records"
            description="Versioned decisions with options, rationale, consequences and approver votes."
            actions={
              <Button size="sm" variant="outline" onClick={() => setAdrDraft(newAdr())}>
                <FileText className="mr-1.5 h-4 w-4" aria-hidden /> New ADR
              </Button>
            }
          >
            {(adrs.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No decision records captured yet.</p>
            ) : (
              <div className="space-y-3">
                {(adrs.data ?? []).map((adr) => (
                  <article key={adr.id} className="rounded-lg border border-border p-4">
                    <header className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-brand">{adr.reference} · v{adr.version}</p>
                        <h3 className="text-sm font-semibold text-foreground">{adr.title}</h3>
                      </div>
                      <Badge variant="outline" className="text-[11px] capitalize">{adr.status}</Badge>
                    </header>
                    <p className="mt-2 text-xs text-muted-foreground">{adr.context}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {adr.options.map((option) => (
                        <div key={option.title} className="rounded border border-border bg-surface/60 p-2 text-[11px]">
                          <p className="font-semibold text-foreground">{option.title}</p>
                          <p className="text-success">+ {option.pros}</p>
                          <p className="text-destructive">− {option.cons}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-foreground">
                      <span className="font-semibold">Decision:</span> {adr.recommendation}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Rationale:</span> {adr.rationale}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Consequences:</span> {adr.consequences}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {adr.approvers.map((vote) => (
                        <Badge key={vote.role} variant="outline" className="text-[11px] capitalize">
                          {roleLabelFor(vote.role)}: {vote.state}
                        </Badge>
                      ))}
                      {adr.approvers.some((vote) => vote.role === persona && vote.state === "pending") ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => decideAdr.mutate({ adrId: adr.id, approve: true, comment: "Approved." })}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => decideAdr.mutate({ adrId: adr.id, approve: false, comment: "Rejected." })}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="approval" className="space-y-4 pt-4">
          <SectionCard
            title="Blueprint approval"
            description="Route the current blueprint version to architecture approvers before Configure."
          >
            {openApproval ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Blueprint v{openApproval.blueprintVersion} routed for {openApproval.mode} approval by {openApproval.submittedBy}.
                </p>
                {openApproval.approvers.map((vote) => (
                  <div key={vote.role} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <span className="text-sm capitalize">
                      {roleLabelFor(vote.role)} — {vote.state}
                      {vote.comment ? ` · "${vote.comment}"` : ""}
                    </span>
                    {vote.role === persona && vote.state === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => voteApproval.mutate({ requestId: openApproval.id, approve: true, comment: "Blueprint approved." })}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => voteApproval.mutate({ requestId: openApproval.id, approve: false, comment: "Changes required." })}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAi.length > 0 ? (
                  <p className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-brand">
                    {pendingAi.length} AI suggested component(s) still need a human decision before approval.
                  </p>
                ) : null}
                <Button
                  disabled={pendingAi.length > 0 || submitApproval.isPending}
                  onClick={() =>
                    submitApproval.mutate(
                      { approvers: APPROVER_ROLES, mode: "parallel" },
                      { onSuccess: () => toast({ title: "Blueprint routed for approval" }) },
                    )
                  }
                >
                  Submit blueprint v{version} for approval
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Approval history">
            {(approvals.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No approvals submitted yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {(approvals.data ?? []).map((request) => (
                  <li key={request.id} className="rounded-lg border border-border p-2.5">
                    Blueprint v{request.blueprintVersion} — {request.state} · submitted {new Date(request.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Component inspector */}
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <p className="text-muted-foreground">{selected.purpose}</p>
                {selected.aiSuggested ? (
                  <div className="space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand">AI Suggested</p>
                    {selected.rationale ? <p className="text-xs text-foreground">{selected.rationale}</p> : null}
                    {selected.acceptance === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decideComponent.mutate({ component: selected, acceptance: "accepted" })}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => decideComponent.mutate({ component: selected, acceptance: "rejected" })}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs capitalize text-muted-foreground">Decision: {selected.acceptance}</p>
                    )}
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Data domain</Label>
                    <Input
                      value={selected.dataDomain}
                      onChange={(event) => setSelected({ ...selected, dataDomain: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(value) => setSelected({ ...selected, status: value as ComponentStatus })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      rows={3}
                      value={selected.notes ?? ""}
                      onChange={(event) => setSelected({ ...selected, notes: event.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="component-physical"
                      checked={selected.physical}
                      onCheckedChange={(value) => setSelected({ ...selected, physical: value })}
                    />
                    <Label htmlFor="component-physical" className="text-xs font-normal">Present in physical topology</Label>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                  <div><dt className="text-muted-foreground">Platform</dt><dd>{selected.platform}</dd></div>
                  <div><dt className="text-muted-foreground">Layer</dt><dd>{blueprintLayer(selected.layer).name}</dd></div>
                  <div><dt className="text-muted-foreground">Pattern</dt><dd>{selected.integrationPattern}</dd></div>
                  <div><dt className="text-muted-foreground">Classification</dt><dd>{selected.securityClassification}</dd></div>
                  <div><dt className="text-muted-foreground">Owner</dt><dd className="capitalize">{roleLabelFor(selected.owner)}</dd></div>
                  <div><dt className="text-muted-foreground">Controls</dt><dd>{selected.controls.join(", ") || "—"}</dd></div>
                </dl>

                {selected.assumptions.length > 0 ? (
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Assumptions</p>
                    <ul className="text-muted-foreground">{selected.assumptions.map((entry) => <li key={entry}>• {entry}</li>)}</ul>
                  </div>
                ) : null}
                {selected.risks.length > 0 ? (
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Risks</p>
                    <ul className="text-destructive">{selected.risks.map((entry) => <li key={entry}>• {entry}</li>)}</ul>
                  </div>
                ) : null}

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button
                    onClick={() =>
                      upsertComponent.mutate(selected, {
                        onSuccess: () => {
                          toast({ title: "Component saved" });
                          setSelected(null);
                        },
                      })
                    }
                  >
                    Save changes
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      removeComponent.mutate(selected, {
                        onSuccess: () => {
                          toast({ title: "Component removed" });
                          setSelected(null);
                        },
                      })
                    }
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Architecture recommendation inputs */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recommend target architecture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Source platforms</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {SOURCE_PLATFORMS.map((platform) => (
                  <div key={platform.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`src-${platform.id}`}
                      checked={inputs.sourcePlatforms.includes(platform.id)}
                      onCheckedChange={() =>
                        setInputs({ ...inputs, sourcePlatforms: toggle(inputs.sourcePlatforms, platform.id) })
                      }
                    />
                    <Label htmlFor={`src-${platform.id}`} className="text-xs font-normal">{platform.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Salesforce products</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {SALESFORCE_PRODUCTS.map((product) => (
                  <div key={product.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`prod-${product.id}`}
                      checked={inputs.products.includes(product.id)}
                      onCheckedChange={() => setInputs({ ...inputs, products: toggle(inputs.products, product.id) })}
                    />
                    <Label htmlFor={`prod-${product.id}`} className="text-xs font-normal">{product.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Latency</Label>
                <Select value={inputs.latency} onValueChange={(value) => setInputs({ ...inputs, latency: value as typeof inputs.latency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="batch">Batch</SelectItem>
                    <SelectItem value="near-real-time">Near real time</SelectItem>
                    <SelectItem value="real-time">Real time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data volume</Label>
                <Select value={inputs.volume} onValueChange={(value) => setInputs({ ...inputs, volume: value as typeof inputs.volume })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data residency</Label>
                <Input value={inputs.residency} onChange={(event) => setInputs({ ...inputs, residency: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Regulatory obligations (comma separated)</Label>
                <Input
                  value={inputs.regulatory.join(", ")}
                  onChange={(event) =>
                    setInputs({ ...inputs, regulatory: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Identity resolution needs</Label>
                <Input
                  value={inputs.identityNeeds.join(", ")}
                  onChange={(event) =>
                    setInputs({ ...inputs, identityNeeds: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={generate.isPending}
              onClick={() =>
                generate.mutate(
                  { inputs: { ...inputs, useCaseIds: initiative.data?.useCases ?? [] }, summary },
                  {
                    onSuccess: (result) => {
                      setShowGenerator(false);
                      toast({
                        title: `${result.components.length} AI suggested components proposed`,
                        description: "Each component requires explicit acceptance in the canvas.",
                      });
                    },
                  },
                )
              }
            >
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Generate blueprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADR editor */}
      <Dialog open={Boolean(adrDraft)} onOpenChange={(open) => !open && setAdrDraft(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{adrDraft?.reference} — new decision record</DialogTitle>
          </DialogHeader>
          {adrDraft ? (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={adrDraft.title} onChange={(event) => setAdrDraft({ ...adrDraft, title: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Context</Label>
                <Textarea rows={2} value={adrDraft.context} onChange={(event) => setAdrDraft({ ...adrDraft, context: event.target.value })} />
              </div>
              {adrDraft.options.map((option, index) => (
                <div key={option.title} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
                  <Input
                    value={option.title}
                    placeholder="Option"
                    onChange={(event) =>
                      setAdrDraft({
                        ...adrDraft,
                        options: adrDraft.options.map((entry, i) => (i === index ? { ...entry, title: event.target.value } : entry)),
                      })
                    }
                  />
                  <Input
                    value={option.pros}
                    placeholder="Pros"
                    onChange={(event) =>
                      setAdrDraft({
                        ...adrDraft,
                        options: adrDraft.options.map((entry, i) => (i === index ? { ...entry, pros: event.target.value } : entry)),
                      })
                    }
                  />
                  <Input
                    value={option.cons}
                    placeholder="Cons"
                    onChange={(event) =>
                      setAdrDraft({
                        ...adrDraft,
                        options: adrDraft.options.map((entry, i) => (i === index ? { ...entry, cons: event.target.value } : entry)),
                      })
                    }
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Recommended decision</Label>
                <Textarea rows={2} value={adrDraft.recommendation} onChange={(event) => setAdrDraft({ ...adrDraft, recommendation: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rationale</Label>
                <Textarea rows={2} value={adrDraft.rationale} onChange={(event) => setAdrDraft({ ...adrDraft, rationale: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Consequences</Label>
                <Textarea rows={2} value={adrDraft.consequences} onChange={(event) => setAdrDraft({ ...adrDraft, consequences: event.target.value })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              disabled={!adrDraft?.title || !adrDraft?.recommendation}
              onClick={() =>
                adrDraft &&
                upsertAdr.mutate(
                  { ...adrDraft, status: "proposed", updatedAt: new Date().toISOString() },
                  {
                    onSuccess: () => {
                      setAdrDraft(null);
                      toast({ title: "Decision record submitted for approval" });
                    },
                  },
                )
              }
            >
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export preview */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Architecture blueprint pack — export preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Document generation is deferred to a later phase. This preview lists the pack contents.
            </p>
            <div className="rounded-lg border border-border p-4 text-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Tech Mahindra Axion</p>
              <h3 className="text-base font-semibold">{initiative.data?.name ?? "Initiative"} — target architecture v{version}</h3>
              <ul className="mt-2 space-y-1">
                <li>Layered blueprint: {components.length} components, {connections.length} flows</li>
                <li>Decision records: {(adrs.data ?? []).length} ({(adrs.data ?? []).filter((adr) => adr.status === "approved").length} approved)</li>
                <li>AI suggested components awaiting decision: {pendingAi.length}</li>
                <li>Readiness score at time of design: {summary.overall}</li>
                <li>Excluded scope: {EXCLUDED_FROM_CATALOG.join(", ")}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArchitectureStudioPage;
