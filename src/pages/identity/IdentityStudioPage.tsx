import { useMemo, useState } from "react";
import { CheckCircle2, GitMerge, Play, Plus, Scissors, Sparkles, Trash2, XCircle } from "lucide-react";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { EmptyState, ErrorState, LoadingState } from "@/components/enterprise/States";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, Modal } from "@/components/enterprise/Overlays";
import { useToast } from "@/hooks/use-toast";
import { identityTemplatesForIndustry, SAMPLE_SETS } from "@/data/identityTemplates";
import { useActiveIndustry } from "@/hooks/useIndustry";
import {
  ENTITY_LABELS,
  EXCEPTION_ACTION_LABELS,
  EXCEPTION_TYPE_LABELS,
  MATCH_KIND_LABELS,
  NORMALIZATION_LABELS,
  SURVIVORSHIP_LABELS,
} from "@/domain/phase4";
import type {
  ComparisonMethod,
  ExceptionAction,
  ExceptionStatus,
  IdentityAiSuggestion,
  IdentityException,
  IdentityPolicy,
  MatchFieldWeight,
  MatchRule,
  MatchRuleKind,
  NormalizationRule,
  NormalizationType,
  NullHandling,
  SurvivorshipRule,
  SurvivorshipStrategy,
} from "@/domain/phase4";
import {
  useActivePhase4InitiativeId,
  useCreateIdentityPolicyFromTemplate,
  useDecideIdentitySuggestion,
  useIdentityExceptions,
  useIdentityPolicies,
  useIdentityRuns,
  useIdentitySuggestions,
  useResolveIdentityException,
  useRunIdentitySimulation,
  useUpsertMatchRule,
  useUpsertNormalizationRule,
  useUpsertSurvivorshipRule,
} from "@/hooks/usePhase4";

const NORMALIZATION_TYPES = Object.keys(NORMALIZATION_LABELS) as NormalizationType[];
const MATCH_KINDS = Object.keys(MATCH_KIND_LABELS) as MatchRuleKind[];
const SURVIVORSHIP_STRATEGIES = Object.keys(SURVIVORSHIP_LABELS) as SurvivorshipStrategy[];
const EXCEPTION_ACTIONS = Object.keys(EXCEPTION_ACTION_LABELS) as ExceptionAction[];
const NULL_HANDLINGS: readonly NullHandling[] = ["ignore", "treat-as-blank", "block-match", "flag-exception"];
const COMPARISON_METHODS: readonly ComparisonMethod[] = [
  "exact",
  "normalized-exact",
  "fuzzy",
  "phonetic",
  "numeric-tolerance",
  "date-tolerance",
];

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const emptyNormalizationRule = (): NormalizationRule => ({
  id: uid("nz"),
  field: "",
  type: "name",
  inputPattern: "",
  outputPattern: "",
  locale: "en-GB",
  sequence: 1,
  nullHandling: "ignore",
  active: true,
});

const emptyMatchRule = (entity: IdentityPolicy["entity"]): MatchRule => ({
  id: uid("mr"),
  name: "",
  entity,
  kind: "weighted",
  fields: [{ field: "", comparison: "fuzzy", weight: 50 }],
  threshold: 70,
  priority: 5,
  blocking: [],
  positiveEvidence: [],
  negativeEvidence: [],
  autoLinkThreshold: 90,
  manualReviewThreshold: 70,
  noMatchThreshold: 55,
  active: true,
});

const emptySurvivorshipRule = (): SurvivorshipRule => ({
  id: uid("sv"),
  attribute: "",
  strategy: "most-recent",
  sourcePriority: [],
  notes: "",
});

const riskBadgeClass = (level: "low" | "medium" | "high") =>
  level === "high"
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : level === "medium"
      ? "border-warning/40 bg-warning/10 text-warning-foreground"
      : "border-success/30 bg-success/10 text-success";

const AiSuggestionPanel = ({
  suggestion,
  onDecide,
  disabled,
}: {
  suggestion: IdentityAiSuggestion;
  onDecide: (status: Exclude<IdentityAiSuggestion["status"], "pending">, payload?: Record<string, unknown>) => void;
  disabled?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(suggestion.payload, null, 2));

  return (
    <article className="rounded-xl border border-brand/30 bg-brand/5 p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
              AI Suggested
            </Badge>
            <Badge variant="outline">{suggestion.kind.replace(/-/g, " ")}</Badge>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{suggestion.title}</h3>
          <p className="text-sm text-muted-foreground">{suggestion.detail}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Confidence</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">{suggestion.confidence}%</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Rationale</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{suggestion.rationale}</p>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Label className="text-xs">Edit payload before accepting</Label>
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} className="font-mono text-xs" />
        </div>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={disabled}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                try {
                  const parsed = JSON.parse(draft) as Record<string, unknown>;
                  onDecide("edited", parsed);
                } catch {
                  onDecide("edited", { raw: draft });
                }
              }}
              disabled={disabled}
            >
              Save and accept
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => onDecide("accepted")} disabled={disabled}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={disabled}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDecide("rejected")} disabled={disabled} className="text-destructive hover:text-destructive">
              <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Reject
            </Button>
          </>
        )}
      </footer>
    </article>
  );
};

const IdentityStudioPage = () => {
  const { toast } = useToast();
  const initiativeId = useActivePhase4InitiativeId();

  const policies = useIdentityPolicies(initiativeId);
  const createFromTemplate = useCreateIdentityPolicyFromTemplate();
  const upsertNormalization = useUpsertNormalizationRule();
  const upsertMatchRule = useUpsertMatchRule();
  const upsertSurvivorship = useUpsertSurvivorshipRule();
  const runSimulation = useRunIdentitySimulation();
  const resolveException = useResolveIdentityException();
  const decideSuggestion = useDecideIdentitySuggestion();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);

  const list = policies.data ?? [];
  const policy = list.find((entry) => entry.id === selectedPolicyId) ?? list[0];

  const runs = useIdentityRuns(initiativeId);
  const exceptions = useIdentityExceptions(initiativeId);
  const suggestions = useIdentitySuggestions(initiativeId);

  const [normalizationSheet, setNormalizationSheet] = useState<NormalizationRule | null>(null);
  const [matchRuleSheet, setMatchRuleSheet] = useState<MatchRule | null>(null);
  const [survivorshipSheet, setSurvivorshipSheet] = useState<SurvivorshipRule | null>(null);
  const [thresholdShift, setThresholdShift] = useState(0);
  const [setId, setSetId] = useState<string>(SAMPLE_SETS[0]?.id ?? "");
  const [exceptionDialog, setExceptionDialog] = useState<IdentityException | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const relevantSets = useMemo(
    () => SAMPLE_SETS.filter((set) => !policy || set.entity === policy.entity),
    [policy],
  );

  const policyRuns = (runs.data ?? []).filter((run) => run.policyId === policy?.id);
  const latestRun = policyRuns[0];
  const policyExceptions = (exceptions.data ?? []).filter((exception) => exception.policyId === policy?.id);
  const policySuggestions = (suggestions.data ?? []).filter(
    (suggestion) => suggestion.policyId === policy?.id && suggestion.status === "pending",
  );

  const isLoading = policies.isLoading;
  const isError = policies.isError;

  const handleCreateFromTemplate = (templateId: string) => {
    createFromTemplate.mutate(
      { templateId, initiativeId },
      {
        onSuccess: (created) => {
          setSelectedPolicyId(created.id);
          setTemplateSheetOpen(false);
          toast({ title: "Identity policy created", description: created.name });
        },
      },
    );
  };

  const handleDecideSuggestion = (
    suggestion: IdentityAiSuggestion,
    status: Exclude<IdentityAiSuggestion["status"], "pending">,
    payload?: Record<string, unknown>,
  ) => {
    decideSuggestion.mutate(
      { suggestion, status, payload },
      { onSuccess: () => toast({ title: `Suggestion ${status}`, description: suggestion.title }) },
    );
  };

  const handleRunSimulation = () => {
    if (!policy || !setId) return;
    runSimulation.mutate(
      { policy, setId, initiativeId, thresholdShift },
      {
        onSuccess: (run) =>
          toast({
            title: "Simulation complete",
            description: `${run.matchedClusters} clusters, ${run.autoMatched} auto-matched, ${run.manualReview} for review`,
          }),
      },
    );
  };

  const openExceptionAction = (exception: IdentityException) => {
    setExceptionDialog(exception);
    setResolutionNote(exception.recommendationRationale);
  };

  const handleResolveException = (action: ExceptionAction, status: ExceptionStatus) => {
    if (!exceptionDialog) return;
    resolveException.mutate(
      { id: exceptionDialog.id, action, status, resolution: resolutionNote },
      {
        onSuccess: () => {
          setExceptionDialog(null);
          toast({ title: `Exception ${status}`, description: EXCEPTION_ACTION_LABELS[action] });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Phase 4 · Identity" title="Identity resolution studio" />
        <LoadingState label="Loading identity policies" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Phase 4 · Identity" title="Identity resolution studio" />
        <ErrorState message="Unable to load identity policies." onRetry={() => policies.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 4 · Identity"
        title="Identity resolution studio"
        description="Normalize, match, survive and simulate golden-record resolution across individuals, households and businesses, with a stewarded exception-review queue."
        actions={
          <Button size="sm" onClick={() => setTemplateSheetOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New policy from template
          </Button>
        }
      />

      <SectionCard title="Identity policies" description="Every entity resolution policy configured for this initiative.">
        <DataTable
          columns={[
            { key: "name", header: "Policy", render: (row: IdentityPolicy) => row.name },
            { key: "entity", header: "Entity", render: (row: IdentityPolicy) => ENTITY_LABELS[row.entity] },
            { key: "status", header: "Status", render: (row: IdentityPolicy) => <Badge variant="outline">{row.status}</Badge> },
            { key: "version", header: "Version", render: (row: IdentityPolicy) => `v${row.version}` },
            {
              key: "rules",
              header: "Rules",
              render: (row: IdentityPolicy) =>
                `${row.normalizationRules.length} normalization · ${row.matchRules.length} match · ${row.survivorshipRules.length} survivorship`,
            },
          ]}
          rows={list}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedPolicyId(row.id)}
          emptyTitle="No identity policies yet"
          emptyMessage="Create a policy from a BFSI template to start configuring normalization, matching and survivorship rules."
        />
      </SectionCard>

      {!policy ? (
        <EmptyState
          title="Select or create an identity policy"
          message="Choose a policy above, or create one from a template, to configure resolution rules and run simulations."
        />
      ) : (
        <>
          <SectionCard
            title={`${policy.name} — pending AI suggestions`}
            description="Every AI recommendation requires an explicit steward decision before it changes the policy."
          >
            {policySuggestions.length === 0 ? (
              <EmptyState
                title="No pending suggestions"
                message="The AI assistant has no open recommendations for this policy right now."
                icon={<Sparkles className="h-5 w-5" aria-hidden />}
              />
            ) : (
              <div className="space-y-3">
                {policySuggestions.map((suggestion) => (
                  <AiSuggestionPanel
                    key={suggestion.id}
                    suggestion={suggestion}
                    disabled={decideSuggestion.isPending}
                    onDecide={(status, payload) => handleDecideSuggestion(suggestion, status, payload)}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <Tabs defaultValue="normalization" className="space-y-4">
            <TabsList>
              <TabsTrigger value="normalization">Normalization</TabsTrigger>
              <TabsTrigger value="match">Match rules</TabsTrigger>
              <TabsTrigger value="survivorship">Survivorship</TabsTrigger>
              <TabsTrigger value="profile">Unified profile</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="exceptions">Exception queue</TabsTrigger>
            </TabsList>

            <TabsContent value="normalization">
              <SectionCard
                title="Normalization rules"
                description="Sequenced transforms applied to source attributes before matching."
                actions={
                  <Button size="sm" variant="outline" onClick={() => setNormalizationSheet(emptyNormalizationRule())}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add rule
                  </Button>
                }
              >
                <DataTable
                  columns={
                    [
                      { key: "seq", header: "Seq", render: (row) => row.sequence },
                      { key: "field", header: "Field", render: (row) => row.field },
                      { key: "type", header: "Type", render: (row) => NORMALIZATION_LABELS[row.type] },
                      { key: "pattern", header: "Input → Output", render: (row) => `${row.inputPattern} → ${row.outputPattern}` },
                      { key: "null", header: "Null handling", render: (row) => row.nullHandling },
                      {
                        key: "flags",
                        header: "Flags",
                        render: (row) => (
                          <div className="flex gap-1.5">
                            <Badge variant="outline">{row.active ? "Active" : "Inactive"}</Badge>
                            {row.aiSuggested ? (
                              <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                                AI Suggested
                              </Badge>
                            ) : null}
                          </div>
                        ),
                      },
                    ] satisfies DataTableColumn<NormalizationRule>[]
                  }
                  rows={[...policy.normalizationRules].sort((a, b) => a.sequence - b.sequence)}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setNormalizationSheet(row)}
                  emptyTitle="No normalization rules"
                  emptyMessage="Add a normalization rule to standardise a source attribute before matching."
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="match">
              <SectionCard
                title="Match rule designer"
                description="Deterministic, fuzzy, phonetic and weighted match rules with attribute weights and thresholds."
                actions={
                  <Button size="sm" variant="outline" onClick={() => setMatchRuleSheet(emptyMatchRule(policy.entity))}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add rule
                  </Button>
                }
              >
                <DataTable
                  columns={
                    [
                      { key: "priority", header: "Priority", render: (row) => row.priority },
                      { key: "name", header: "Rule", render: (row) => row.name },
                      { key: "kind", header: "Kind", render: (row) => MATCH_KIND_LABELS[row.kind] },
                      {
                        key: "fields",
                        header: "Attribute weights",
                        render: (row) => row.fields.map((field) => `${field.field} (${field.weight})`).join(", "),
                      },
                      {
                        key: "thresholds",
                        header: "Auto / review / no-match",
                        render: (row) => `${row.autoLinkThreshold} / ${row.manualReviewThreshold} / ${row.noMatchThreshold}`,
                      },
                      {
                        key: "flags",
                        header: "Flags",
                        render: (row) => (
                          <div className="flex gap-1.5">
                            <Badge variant="outline">{row.active ? "Active" : "Inactive"}</Badge>
                            {row.aiSuggested ? (
                              <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                                AI Suggested
                              </Badge>
                            ) : null}
                          </div>
                        ),
                      },
                    ] satisfies DataTableColumn<MatchRule>[]
                  }
                  rows={[...policy.matchRules].sort((a, b) => a.priority - b.priority)}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setMatchRuleSheet(row)}
                  emptyTitle="No match rules"
                  emptyMessage="Add a deterministic, fuzzy or phonetic match rule to start resolving identities."
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="survivorship">
              <SectionCard
                title="Survivorship designer"
                description="Per-attribute strategy that decides which source wins on the golden record."
                actions={
                  <Button size="sm" variant="outline" onClick={() => setSurvivorshipSheet(emptySurvivorshipRule())}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add rule
                  </Button>
                }
              >
                <DataTable
                  columns={
                    [
                      { key: "attribute", header: "Attribute", render: (row) => row.attribute },
                      { key: "strategy", header: "Strategy", render: (row) => SURVIVORSHIP_LABELS[row.strategy] },
                      { key: "priority", header: "Source priority", render: (row) => row.sourcePriority.join(" > ") || "n/a" },
                      { key: "notes", header: "Notes", render: (row) => row.notes },
                      {
                        key: "flags",
                        header: "Flags",
                        render: (row) =>
                          row.aiSuggested ? (
                            <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                              AI Suggested
                            </Badge>
                          ) : null,
                      },
                    ] satisfies DataTableColumn<SurvivorshipRule>[]
                  }
                  rows={policy.survivorshipRules}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setSurvivorshipSheet(row)}
                  emptyTitle="No survivorship rules"
                  emptyMessage="Add a survivorship rule to control which source wins for a given attribute."
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="profile">
              <SectionCard
                title="Unified profile preview"
                description="Golden records produced by the most recent simulation run for this policy."
              >
                {!latestRun ? (
                  <EmptyState
                    title="No simulation run yet"
                    message="Run a simulation from the Simulation tab to preview unified profiles for this policy."
                  />
                ) : (
                  <div className="space-y-4">
                    {latestRun.profiles.map((profileEntry) => (
                      <div key={profileEntry.clusterId} className="rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {profileEntry.clusterId} · {profileEntry.recordIds.length} record(s)
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{profileEntry.confidence}% confidence</Badge>
                            {profileEntry.exceptionCount > 0 ? (
                              <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                                {profileEntry.exceptionCount} exception(s)
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          {profileEntry.attributes
                            .filter((attribute) => attribute.value)
                            .map((attribute) => (
                              <div key={attribute.attribute} className="rounded-md border border-border/70 bg-surface p-2">
                                <dt className="font-medium uppercase tracking-wider text-muted-foreground">{attribute.attribute}</dt>
                                <dd className="mt-0.5 text-foreground">{attribute.value}</dd>
                                <dd className="text-[11px] text-muted-foreground">
                                  {SURVIVORSHIP_LABELS[attribute.strategy]} · {attribute.sourceLabel}
                                  {attribute.conflicts.length ? ` · ${attribute.conflicts.length} conflict(s)` : ""}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="simulation">
              <SectionCard
                title="Simulation runner"
                description="Run the deterministic resolution engine against a seeded sample set with an adjustable threshold shift."
                actions={
                  <Button size="sm" onClick={handleRunSimulation} disabled={runSimulation.isPending || !setId}>
                    <Play className="mr-1.5 h-4 w-4" aria-hidden /> Run simulation
                  </Button>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Sample record set</Label>
                    <Select value={setId} onValueChange={setSetId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {relevantSets.map((set) => (
                          <SelectItem key={set.id} value={set.id}>
                            {set.name} ({set.recordCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{relevantSets.find((s) => s.id === setId)?.description}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Threshold shift ({thresholdShift > 0 ? "+" : ""}{thresholdShift})</Label>
                    <Slider
                      value={[thresholdShift]}
                      min={-15}
                      max={15}
                      step={1}
                      onValueChange={(value) => setThresholdShift(value[0] ?? 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shifts every rule's auto-link and manual-review thresholds to stress-test precision and recall.
                    </p>
                  </div>
                </div>

                {latestRun ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      <StatTile label="Records" value={latestRun.totalRecords} />
                      <StatTile label="Clusters" value={latestRun.matchedClusters} />
                      <StatTile label="Auto-matched" value={latestRun.autoMatched} />
                      <StatTile label="Manual review" value={latestRun.manualReview} />
                      <StatTile label="Unmatched" value={latestRun.unmatched} />
                      <StatTile label="Potential duplicates" value={latestRun.potentialDuplicates} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm font-semibold text-foreground">Risk summary</p>
                        <div className="mt-2 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">False-positive risk (auto-linked pairs)</span>
                            <Badge variant="outline" className={riskBadgeClass(latestRun.falsePositiveRisk > 2 ? "high" : latestRun.falsePositiveRisk > 0 ? "medium" : "low")}>
                              {latestRun.falsePositiveRisk}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">False-negative risk (unmatched high scorers)</span>
                            <Badge variant="outline" className={riskBadgeClass(latestRun.falseNegativeRisk > 2 ? "high" : latestRun.falseNegativeRisk > 0 ? "medium" : "low")}>
                              {latestRun.falseNegativeRisk}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confidence distribution</p>
                          {latestRun.confidenceDistribution.map((bucket) => (
                            <div key={bucket.bucket} className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-muted-foreground">{bucket.bucket}</span>
                              <Progress value={Math.min(100, bucket.count * 10)} className="h-1.5 flex-1" />
                              <span className="w-6 text-right tabular-nums text-foreground">{bucket.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm font-semibold text-foreground">Rule performance</p>
                        <div className="mt-2 space-y-2 text-xs">
                          {latestRun.rulePerformance.map((rule) => (
                            <div key={rule.ruleId} className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 last:border-0">
                              <span className="truncate text-foreground">{rule.ruleName}</span>
                              <span className="whitespace-nowrap text-muted-foreground">
                                {rule.pairsEvaluated} pairs · {rule.autoLinked} auto · {rule.manualReview} review · avg {rule.averageScore}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">Candidate pairs</p>
                      <DataTable
                        columns={
                          [
                            { key: "rule", header: "Rule", render: (row) => row.ruleName },
                            { key: "pair", header: "Pair", render: (row) => `${row.leftId} ↔ ${row.rightId}` },
                            { key: "score", header: "Score", render: (row) => `${row.score}` },
                            { key: "outcome", header: "Outcome", render: (row) => <Badge variant="outline">{row.outcome}</Badge> },
                            {
                              key: "fp",
                              header: "FP risk",
                              render: (row) => <Badge variant="outline" className={riskBadgeClass(row.falsePositiveRisk)}>{row.falsePositiveRisk}</Badge>,
                            },
                            {
                              key: "fn",
                              header: "FN risk",
                              render: (row) => <Badge variant="outline" className={riskBadgeClass(row.falseNegativeRisk)}>{row.falseNegativeRisk}</Badge>,
                            },
                          ] satisfies DataTableColumn<(typeof latestRun.pairs)[number]>[]
                        }
                        rows={latestRun.pairs.slice(0, 50)}
                        rowKey={(row) => row.id}
                        emptyTitle="No candidate pairs"
                        emptyMessage="No pairs were generated by the active rules for this sample set."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <EmptyState title="No simulation results yet" message="Run a simulation to see clusters, match rates and performance metrics." />
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="exceptions">
              <SectionCard
                title="Steward exception-review queue"
                description="Ambiguous matches, conflicting evidence and survivorship conflicts awaiting a data steward decision."
              >
                <DataTable
                  columns={
                    [
                      { key: "type", header: "Type", render: (row) => EXCEPTION_TYPE_LABELS[row.type] },
                      { key: "records", header: "Records", render: (row) => row.affectedLabels.join(" ↔ ") },
                      { key: "confidence", header: "Match confidence", render: (row) => `${row.matchConfidence}%` },
                      { key: "recommended", header: "Recommended action", render: (row) => EXCEPTION_ACTION_LABELS[row.recommendedAction] },
                      {
                        key: "priority",
                        header: "Priority",
                        render: (row) => (
                          <Badge variant="outline" className={riskBadgeClass(row.priority === "critical" || row.priority === "high" ? "high" : row.priority === "medium" ? "medium" : "low")}>
                            {row.priority}
                          </Badge>
                        ),
                      },
                      { key: "status", header: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
                      { key: "sla", header: "SLA due", render: (row) => new Date(row.slaDueAt).toLocaleDateString() },
                    ] satisfies DataTableColumn<IdentityException>[]
                  }
                  rows={policyExceptions}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => (row.status === "open" || row.status === "in-review" ? openExceptionAction(row) : setExceptionDialog(row))}
                  emptyTitle="No open exceptions"
                  emptyMessage="Run a simulation to surface ambiguous matches, negative evidence and survivorship conflicts."
                />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create from template */}
      <Drawer
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        title="New identity policy from template"
        description={`${pack.shortName} templates seed normalization, match and survivorship rules that stewards can then tailor.`}
      >
        <div className="space-y-3">
          {industryTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleCreateFromTemplate(template.id)}
              disabled={createFromTemplate.isPending}
              className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:border-brand/40 hover:bg-brand/5 disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                <Badge variant="outline">{ENTITY_LABELS[template.entity]}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
            </button>
          ))}
        </div>
      </Drawer>

      {/* Normalization rule editor */}
      <Drawer
        open={Boolean(normalizationSheet)}
        onOpenChange={(open) => !open && setNormalizationSheet(null)}
        title="Normalization rule"
      >
        {normalizationSheet ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Input
                value={normalizationSheet.field}
                onChange={(event) => setNormalizationSheet({ ...normalizationSheet, field: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={normalizationSheet.type}
                onValueChange={(value) => setNormalizationSheet({ ...normalizationSheet, type: value as NormalizationType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NORMALIZATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {NORMALIZATION_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Input pattern</Label>
                <Input
                  value={normalizationSheet.inputPattern}
                  onChange={(event) => setNormalizationSheet({ ...normalizationSheet, inputPattern: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output pattern</Label>
                <Input
                  value={normalizationSheet.outputPattern}
                  onChange={(event) => setNormalizationSheet({ ...normalizationSheet, outputPattern: event.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Locale</Label>
                <Input
                  value={normalizationSheet.locale}
                  onChange={(event) => setNormalizationSheet({ ...normalizationSheet, locale: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sequence</Label>
                <Input
                  type="number"
                  value={normalizationSheet.sequence}
                  onChange={(event) => setNormalizationSheet({ ...normalizationSheet, sequence: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Null handling</Label>
              <Select
                value={normalizationSheet.nullHandling}
                onValueChange={(value) => setNormalizationSheet({ ...normalizationSheet, nullHandling: value as NullHandling })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NULL_HANDLINGS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="nz-active">Active</Label>
              <Switch
                id="nz-active"
                checked={normalizationSheet.active}
                onCheckedChange={(checked) => setNormalizationSheet({ ...normalizationSheet, active: checked })}
              />
            </div>
            <Button
              className="w-full"
              disabled={!normalizationSheet.field.trim() || upsertNormalization.isPending}
              onClick={() => {
                if (!policy) return;
                upsertNormalization.mutate({ policy, rule: normalizationSheet });
                setNormalizationSheet(null);
                toast({ title: "Normalization rule saved" });
              }}
            >
              Save rule
            </Button>
          </div>
        ) : null}
      </Drawer>

      {/* Match rule editor */}
      <Drawer
        open={Boolean(matchRuleSheet)}
        onOpenChange={(open) => !open && setMatchRuleSheet(null)}
        title="Match rule"
        description="Configure comparison method, attribute weights and outcome thresholds."
      >
        {matchRuleSheet ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={matchRuleSheet.name}
                onChange={(event) => setMatchRuleSheet({ ...matchRuleSheet, name: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={matchRuleSheet.kind}
                  onValueChange={(value) => setMatchRuleSheet({ ...matchRuleSheet, kind: value as MatchRuleKind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {MATCH_KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={matchRuleSheet.priority}
                  onChange={(event) => setMatchRuleSheet({ ...matchRuleSheet, priority: Number(event.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attribute weights</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setMatchRuleSheet({
                      ...matchRuleSheet,
                      fields: [...matchRuleSheet.fields, { field: "", comparison: "fuzzy", weight: 10 }],
                    })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Add field
                </Button>
              </div>
              {matchRuleSheet.fields.map((field, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_70px_32px] items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Field</Label>
                    <Input
                      value={field.field}
                      onChange={(event) => {
                        const fields: MatchFieldWeight[] = [...matchRuleSheet.fields];
                        fields[index] = { ...field, field: event.target.value };
                        setMatchRuleSheet({ ...matchRuleSheet, fields });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Comparison</Label>
                    <Select
                      value={field.comparison}
                      onValueChange={(value) => {
                        const fields: MatchFieldWeight[] = [...matchRuleSheet.fields];
                        fields[index] = { ...field, comparison: value as ComparisonMethod };
                        setMatchRuleSheet({ ...matchRuleSheet, fields });
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPARISON_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Weight</Label>
                    <Input
                      type="number"
                      value={field.weight}
                      onChange={(event) => {
                        const fields: MatchFieldWeight[] = [...matchRuleSheet.fields];
                        fields[index] = { ...field, weight: Number(event.target.value) };
                        setMatchRuleSheet({ ...matchRuleSheet, fields });
                      }}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setMatchRuleSheet({
                        ...matchRuleSheet,
                        fields: matchRuleSheet.fields.filter((_, entryIndex) => entryIndex !== index),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Auto-link ≥</Label>
                <Input
                  type="number"
                  value={matchRuleSheet.autoLinkThreshold}
                  onChange={(event) => setMatchRuleSheet({ ...matchRuleSheet, autoLinkThreshold: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Manual review ≥</Label>
                <Input
                  type="number"
                  value={matchRuleSheet.manualReviewThreshold}
                  onChange={(event) => setMatchRuleSheet({ ...matchRuleSheet, manualReviewThreshold: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">No-match &lt;</Label>
                <Input
                  type="number"
                  value={matchRuleSheet.noMatchThreshold}
                  onChange={(event) => setMatchRuleSheet({ ...matchRuleSheet, noMatchThreshold: Number(event.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Blocking keys (comma separated)</Label>
              <Input
                value={matchRuleSheet.blocking.join(", ")}
                onChange={(event) =>
                  setMatchRuleSheet({
                    ...matchRuleSheet,
                    blocking: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean),
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="mr-active">Active</Label>
              <Switch
                id="mr-active"
                checked={matchRuleSheet.active}
                onCheckedChange={(checked) => setMatchRuleSheet({ ...matchRuleSheet, active: checked })}
              />
            </div>

            <Button
              className="w-full"
              disabled={!matchRuleSheet.name.trim() || upsertMatchRule.isPending}
              onClick={() => {
                if (!policy) return;
                upsertMatchRule.mutate({ policy, rule: matchRuleSheet });
                setMatchRuleSheet(null);
                toast({ title: "Match rule saved" });
              }}
            >
              Save rule
            </Button>
          </div>
        ) : null}
      </Drawer>

      {/* Survivorship rule editor */}
      <Drawer
        open={Boolean(survivorshipSheet)}
        onOpenChange={(open) => !open && setSurvivorshipSheet(null)}
        title="Survivorship rule"
      >
        {survivorshipSheet ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Attribute</Label>
              <Input
                value={survivorshipSheet.attribute}
                onChange={(event) => setSurvivorshipSheet({ ...survivorshipSheet, attribute: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <Select
                value={survivorshipSheet.strategy}
                onValueChange={(value) => setSurvivorshipSheet({ ...survivorshipSheet, strategy: value as SurvivorshipStrategy })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SURVIVORSHIP_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy} value={strategy}>
                      {SURVIVORSHIP_LABELS[strategy]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source priority (comma separated)</Label>
              <Input
                value={survivorshipSheet.sourcePriority.join(", ")}
                onChange={(event) =>
                  setSurvivorshipSheet({
                    ...survivorshipSheet,
                    sourcePriority: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={survivorshipSheet.notes}
                onChange={(event) => setSurvivorshipSheet({ ...survivorshipSheet, notes: event.target.value })}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!survivorshipSheet.attribute.trim() || upsertSurvivorship.isPending}
              onClick={() => {
                if (!policy) return;
                upsertSurvivorship.mutate({ policy, rule: survivorshipSheet });
                setSurvivorshipSheet(null);
                toast({ title: "Survivorship rule saved" });
              }}
            >
              Save rule
            </Button>
          </div>
        ) : null}
      </Drawer>

      {/* Exception review modal */}
      <Modal
        open={Boolean(exceptionDialog)}
        onOpenChange={(open) => !open && setExceptionDialog(null)}
        title={exceptionDialog ? EXCEPTION_TYPE_LABELS[exceptionDialog.type] : "Exception"}
        description={exceptionDialog?.affectedLabels.join(" ↔ ")}
        wide
        footer={
          exceptionDialog && (exceptionDialog.status === "open" || exceptionDialog.status === "in-review") ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleResolveException("keep-separate", "resolved")}
                disabled={resolveException.isPending}
              >
                <XCircle className="mr-1.5 h-4 w-4" aria-hidden /> Reject (keep separate)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveException("link-no-merge", "resolved")}
                disabled={resolveException.isPending}
              >
                <Scissors className="mr-1.5 h-4 w-4" aria-hidden /> Split (link, no merge)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveException("escalate", "escalated")}
                disabled={resolveException.isPending}
              >
                Escalate
              </Button>
              <Button onClick={() => handleResolveException("merge", "resolved")} disabled={resolveException.isPending}>
                <GitMerge className="mr-1.5 h-4 w-4" aria-hidden /> Approve (merge)
              </Button>
            </div>
          ) : undefined
        }
      >
        {exceptionDialog ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile label="Match confidence" value={`${exceptionDialog.matchConfidence}%`} />
              <StatTile label="Priority" value={exceptionDialog.priority} />
            </div>
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                  <Sparkles className="mr-1 h-3 w-3" aria-hidden /> AI Suggested
                </Badge>
                <span className="text-xs font-medium text-foreground">
                  {EXCEPTION_ACTION_LABELS[exceptionDialog.recommendedAction]} · {exceptionDialog.recommendationConfidence}% confidence
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{exceptionDialog.recommendationRationale}</p>
            </div>
            {exceptionDialog.conflictingAttributes.length > 0 ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conflicting attributes</p>
                <ul className="mt-1 space-y-1 text-sm text-foreground">
                  {exceptionDialog.conflictingAttributes.map((conflict) => (
                    <li key={conflict.attribute}>
                      <span className="font-medium">{conflict.attribute}:</span> {conflict.values.join(" vs ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Steward resolution note</Label>
              <Textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} rows={3} />
            </div>
            {exceptionDialog.status === "resolved" || exceptionDialog.status === "escalated" ? (
              <p className="text-xs text-muted-foreground">
                Resolved as {exceptionDialog.resolvedAction ? EXCEPTION_ACTION_LABELS[exceptionDialog.resolvedAction] : "n/a"}: {exceptionDialog.resolution}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default IdentityStudioPage;
