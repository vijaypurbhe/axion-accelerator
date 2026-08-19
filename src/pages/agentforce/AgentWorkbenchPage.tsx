import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, GitBranch, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard, StatTile, KeyValue } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { RiskBadge, MetaPill, AiSuggestedBadge } from "@/components/enterprise/Badges";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { useToast } from "@/hooks/use-toast";
import {
  useAdvanceAgentStatus,
  useAgent,
  useAgentChangeImpact,
  useAgentReadiness,
  useAgentSuggestions,
  useAgentTraceability,
  useConsumptionScenarios,
  useDecideAgentSuggestion,
  useRecordAgentReview,
  useSnapshotAgentVersion,
  useSuggestionDecisions,
  useTopicDiagnostics,
} from "@/hooks/usePhase6";
import {
  AGENT_ACTION_TYPE_LABEL,
  AGENT_STATUSES,
  AGENT_STATUS_LABEL,
  GROUNDING_SOURCE_LABEL,
  GUARDRAIL_CATEGORY_LABEL,
  RESPONSIBILITY_LABEL,
  type AgentAction,
  type AgentLifecycleStatus,
  type AgentReview,
  type AgentSuggestion,
  type AgentTopic,
  type EscalationRule,
  type GroundingSource,
  type Guardrail,
  type ProcessBoundaryStep,
  type TraceabilityRow,
} from "@/domain/phase6";
import { patternById } from "@/data/agentforceSeed";
import { useGenerateExport } from "@/hooks/useAgentExports";
import { useDeleteDesignObject, useSaveDesignObject } from "@/hooks/useAgentDesign";
import { DesignObjectDrawer } from "@/components/agentforce/DesignObjectDrawer";
import { ApprovalWorkflowPanel } from "@/components/agentforce/ApprovalWorkflowPanel";
import { ConfirmDialog } from "@/components/enterprise/Overlays";
import { emptyDesignObject, type DesignObjectKind } from "@/services/agentDesignSchemas";
import { currency, dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-destructive/30 bg-destructive/5 text-destructive",
  medium: "border-warning/40 bg-warning/10 text-foreground",
  low: "border-border bg-surface text-muted-foreground",
};

const AgentWorkbenchPage = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const generateExport = useGenerateExport();
  const { toast } = useToast();
  const { data: agent, isLoading, isError, refetch } = useAgent(agentId);
  const readiness = useAgentReadiness(agent);
  const diagnostics = useTopicDiagnostics(agent);
  const traceability = useAgentTraceability(agent);
  const suggestions = useAgentSuggestions(agent);
  const changeImpact = useAgentChangeImpact(agent);
  const scenarios = useConsumptionScenarios(agent?.consumption);
  const { data: decisions } = useSuggestionDecisions(agentId);

  const advance = useAdvanceAgentStatus();
  const snapshot = useSnapshotAgentVersion();
  const review = useRecordAgentReview();
  const decide = useDecideAgentSuggestion();
  const saveDesign = useSaveDesignObject();
  const deleteDesign = useDeleteDesignObject();

  const [nextVersion, setNextVersion] = useState("");
  const [editor, setEditor] = useState<{
    kind: DesignObjectKind;
    record: Record<string, unknown>;
    isNew: boolean;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: DesignObjectKind;
    objectId: string;
    label: string;
  } | null>(null);

  const decidedTitles = useMemo(() => new Set((decisions ?? []).map((d) => d.title)), [decisions]);
  const openSuggestions = useMemo(
    () => suggestions.filter((s) => !decidedTitles.has(s.title)),
    [suggestions, decidedTitles],
  );

  if (isLoading) return <LoadingState label="Loading agent design" rows={6} />;
  if (isError || !agent)
    return <ErrorState title="Agent not found" message="The agent design could not be loaded." onRetry={() => void refetch()} />;

  const o = agent.overview;

  const openEditor = (kind: DesignObjectKind, record?: Record<string, unknown>) =>
    setEditor({
      kind,
      record: record ?? (emptyDesignObject(kind) as unknown as Record<string, unknown>),
      isNew: !record,
    });

  const addButton = (kind: DesignObjectKind, label: string) => (
    <Button size="sm" variant="outline" onClick={() => openEditor(kind)}>
      <Plus className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  /** Shared row-level edit/remove controls for every inline-editable design object. */
  const rowControls = <T extends { id: string }>(
    kind: DesignObjectKind,
    row: T,
    label: string,
  ) => (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Edit ${label}`}
        onClick={() => openEditor(kind, row as unknown as Record<string, unknown>)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Remove ${label}`}
        onClick={() => setPendingDelete({ kind, objectId: row.id, label })}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );


  const topicColumns: DataTableColumn<AgentTopic>[] = [
    {
      key: "topic",
      header: "Topic",
      render: (t) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{t.name}</p>
          <p className="max-w-md text-xs text-muted-foreground">{t.classificationDescription}</p>
        </div>
      ),
    },
    {
      key: "utterances",
      header: "Utterances",
      render: (t) => (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {t.sampleUtterances.slice(0, 3).map((u) => (
            <li key={u}>“{u}”</li>
          ))}
          {t.sampleUtterances.length === 0 ? <li>None</li> : null}
        </ul>
      ),
    },
    {
      key: "actions",
      header: "Permitted actions",
      render: (t) => (
        <div className="flex flex-wrap gap-1">
          {t.permittedActionIds.map((id) => (
            <MetaPill key={id}>{agent.actions.find((a) => a.id === id)?.name ?? id}</MetaPill>
          ))}
          {t.permittedActionIds.length === 0 ? <span className="text-xs text-destructive">None bound</span> : null}
        </div>
      ),
    },
    {
      key: "data",
      header: "Data products",
      render: (t) => <span className="text-xs text-muted-foreground">{t.requiredDataProductIds.join(", ") || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <div className="space-y-1">
          <Badge variant="outline" className="capitalize">
            {t.status.replace(/-/g, " ")}
          </Badge>
          <p className="text-[11px] capitalize text-muted-foreground">{t.priority} priority</p>
        </div>
      ),
    },
    {
      key: "origin",
      header: "Origin",
      render: (t) => (t.origin === "ai-suggested" ? <AiSuggestedBadge /> : <MetaPill>{t.origin}</MetaPill>),
    },
    { key: "edit", header: "", align: "right", render: (t) => rowControls("topic", t, t.name) },
  ];

  const actionColumns: DataTableColumn<AgentAction>[] = [
    {
      key: "action",
      header: "Action",
      render: (a) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{a.name}</p>
          <p className="max-w-md text-xs text-muted-foreground">{a.description}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type / system",
      render: (a) => (
        <div className="space-y-1 text-xs">
          <p className="text-foreground">{AGENT_ACTION_TYPE_LABEL[a.actionType]}</p>
          <p className="text-muted-foreground">{a.system}</p>
        </div>
      ),
    },
    {
      key: "io",
      header: "Inputs / outputs",
      render: (a) => (
        <span className="text-xs text-muted-foreground">
          {a.inputs.length} in · {a.outputs.length} out
        </span>
      ),
    },
    {
      key: "controls",
      header: "Controls",
      render: (a) =>
        a.controlIds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {a.controlIds.map((id) => (
              <MetaPill key={id}>{id}</MetaPill>
            ))}
          </div>
        ) : (
          <span className="text-xs text-destructive">Unmapped</span>
        ),
    },
    {
      key: "gates",
      header: "Human gates",
      render: (a) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>{a.requiresConfirmation ? "Confirmation required" : "No confirmation"}</p>
          <p>{a.requiresHumanReview ? "Human review" : "No human review"}</p>
        </div>
      ),
    },
    { key: "risk", header: "Risk", render: (a) => <RiskBadge level={a.riskRating} /> },
    {
      key: "test",
      header: "Test",
      render: (a) => (
        <Badge variant="outline" className={cn("capitalize", a.testStatus === "passing" && "border-success/30 bg-success/10 text-success")}>
          {a.testStatus.replace(/-/g, " ")}
        </Badge>
      ),
    },
    { key: "edit", header: "", align: "right", render: (a) => rowControls("action", a, a.name) },
  ];

  const groundingColumns: DataTableColumn<GroundingSource>[] = [
    { key: "name", header: "Source", render: (g) => <span className="font-medium text-foreground">{g.name}</span> },
    { key: "type", header: "Type", render: (g) => <span className="text-xs">{GROUNDING_SOURCE_LABEL[g.sourceType]}</span> },
    {
      key: "fields",
      header: "Permitted fields",
      render: (g) => <span className="text-xs text-muted-foreground">{g.permittedFields.join(", ") || "—"}</span>,
    },
    { key: "retrieval", header: "Retrieval", render: (g) => <span className="text-xs capitalize">{g.retrievalPattern.replace(/-/g, " ")}</span> },
    { key: "freshness", header: "Freshness", render: (g) => <span className="text-xs">{g.freshness}</span> },
    {
      key: "identity",
      header: "Identity",
      render: (g) => <span className="text-xs capitalize">{g.identityRequirement.replace(/-/g, " ")}</span>,
    },
    {
      key: "citation",
      header: "Citation",
      render: (g) =>
        g.citationRequired ? (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            Required
          </Badge>
        ) : (
          <Badge variant="outline">Optional</Badge>
        ),
    },
    {
      key: "classification",
      header: "Classification",
      render: (g) => <span className="text-xs capitalize">{g.dataClassification}</span>,
    },
    { key: "edit", header: "", align: "right", render: (g) => rowControls("grounding", g, g.name) },
  ];

  const guardrailColumns: DataTableColumn<Guardrail>[] = [
    { key: "category", header: "Category", render: (g) => <span className="text-xs font-medium">{GUARDRAIL_CATEGORY_LABEL[g.category]}</span> },
    { key: "statement", header: "Guardrail", render: (g) => <span className="text-sm text-foreground">{g.statement}</span> },
    { key: "enforcement", header: "Enforcement", render: (g) => <span className="text-xs capitalize">{g.enforcement.replace(/-/g, " ")}</span> },
    { key: "severity", header: "Severity", render: (g) => <RiskBadge level={g.severity} /> },
    {
      key: "controls",
      header: "Trust controls",
      render: (g) =>
        g.controlIds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {g.controlIds.map((id) => (
              <MetaPill key={id}>{id}</MetaPill>
            ))}
          </div>
        ) : (
          <span className="text-xs text-destructive">Unmapped</span>
        ),
    },
    {
      key: "reviewed",
      header: "Reviewed",
      render: (g) => <span className="text-xs">{g.reviewed ? "Yes" : "Pending"}</span>,
    },
    { key: "edit", header: "", align: "right", render: (g) => rowControls("guardrail", g, g.statement.slice(0, 60)) },
  ];

  const escalationColumns: DataTableColumn<EscalationRule>[] = [
    { key: "trigger", header: "Trigger", render: (e) => <span className="text-sm text-foreground">{e.trigger}</span> },
    { key: "type", header: "Type", render: (e) => <span className="text-xs capitalize">{e.triggerType.replace(/-/g, " ")}</span> },
    { key: "destination", header: "Destination", render: (e) => <span className="text-xs">{e.destinationRole}</span> },
    { key: "sla", header: "SLA", align: "right", render: (e) => <span className="text-xs tabular-nums">{e.slaMinutes} min</span> },
    {
      key: "context",
      header: "Context transferred",
      render: (e) => <span className="text-xs text-muted-foreground">{e.contextToTransfer.join(", ")}</span>,
    },
    { key: "messaging", header: "Customer messaging", render: (e) => <span className="text-xs text-muted-foreground">{e.customerMessaging}</span> },
  ];

  const boundaryColumns: DataTableColumn<ProcessBoundaryStep>[] = [
    { key: "seq", header: "#", render: (b) => <span className="text-xs tabular-nums">{b.sequence}</span> },
    { key: "step", header: "Step", render: (b) => <span className="text-sm text-foreground">{b.step}</span> },
    {
      key: "mode",
      header: "Responsibility",
      render: (b) => (
        <Badge variant="outline" className={b.mode === "human-led" ? "border-brand/30 bg-brand/10 text-brand" : undefined}>
          {RESPONSIBILITY_LABEL[b.mode]}
        </Badge>
      ),
    },
    { key: "reasoning", header: "Reasoning scope", render: (b) => <span className="text-xs text-muted-foreground">{b.reasoningScope}</span> },
    { key: "logic", header: "Deterministic logic", render: (b) => <span className="text-xs text-muted-foreground">{b.deterministicLogic}</span> },
    { key: "approval", header: "Approval", render: (b) => <span className="text-xs text-muted-foreground">{b.approvalRequirement}</span> },
    { key: "prohibited", header: "Prohibited autonomy", render: (b) => <span className="text-xs text-muted-foreground">{b.prohibitedAutonomy}</span> },
  ];

  const traceColumns: DataTableColumn<TraceabilityRow>[] = [
    { key: "topic", header: "Topic", render: (r) => <span className="text-xs text-foreground">{r.topic}</span> },
    { key: "action", header: "Action", render: (r) => <span className="text-xs text-foreground">{r.action}</span> },
    { key: "dataProduct", header: "Data product", render: (r) => <span className="text-xs text-muted-foreground">{r.dataProduct}</span> },
    { key: "source", header: "Source system", render: (r) => <span className="text-xs text-muted-foreground">{r.source}</span> },
    { key: "control", header: "Controls", render: (r) => <span className="text-xs text-muted-foreground">{r.control}</span> },
  ];

  const onDecide = (suggestion: AgentSuggestion, decision: "accepted" | "edited" | "rejected") => {
    decide.mutate(
      { agent, suggestion, decision },
      {
        onSuccess: () =>
          toast({
            title: `Suggestion ${decision}`,
            description: `${suggestion.title} — recorded in the audit trail.`,
          }),
      },
    );
  };

  const recordReview = (stage: AgentReview["stage"], outcome: AgentReview["outcome"]) => {
    review.mutate(
      {
        agent,
        review: {
          id: `rv-${stage}-${Date.now().toString(36)}`,
          stage,
          reviewerRole: o.owner,
          outcome,
          comments: `${outcome} at readiness ${readiness?.overall ?? 0}%`,
          decidedAt: new Date().toISOString(),
        },
      },
      { onSuccess: () => toast({ title: "Review recorded", description: `${stage} — ${outcome}` }) },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Agentforce Studio · ${agent.reference}`}
        title={o.name}
        description={o.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/agentforce-studio")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Portfolio
            </Button>
            <Button
              variant="outline"
              disabled={generateExport.isPending}
              onClick={() => generateExport.mutate({ agentId: agent.id, format: "markdown" })}
            >
              <FileText className="mr-2 h-4 w-4" />
              Design spec
            </Button>
            <Button
              variant="outline"
              disabled={generateExport.isPending}
              onClick={() => generateExport.mutate({ agentId: agent.id, format: "csv" })}
            >
              <Download className="mr-2 h-4 w-4" />
              Traceability CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Readiness" value={`${readiness?.overall ?? 0}%`} hint={`${readiness?.blockers.length ?? 0} blocker(s)`} />
        <StatTile label="Status" value={AGENT_STATUS_LABEL[agent.status]} hint={`v${agent.version} · ${agent.release}`} />
        <StatTile label="Topics" value={agent.topics.length} hint={`${diagnostics.length} diagnostics`} />
        <StatTile label="Actions" value={agent.actions.length} hint={`${agent.grounding.length} grounding sources`} />
        <StatTile label="Guardrails" value={agent.guardrails.length} hint={`${agent.escalations.length} escalation paths`} />
        <StatTile label="Open AI suggestions" value={openSuggestions.length} hint="Require explicit decisions" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {[
            ["overview", "Overview"],
            ["topics", "Topics & intents"],
            ["actions", "Actions"],
            ["grounding", "Grounding"],
            ["instructions", "Instructions"],
            ["guardrails", "Guardrails"],
            ["escalation", "Escalation"],
            ["boundaries", "Process boundaries"],
            ["consumption", "Consumption"],
            ["traceability", "Traceability"],
            ["suggestions", "AI suggestions"],
            ["governance", "Versions & approvals"],
          ].map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <SectionCard title="Agent definition">
            <dl className="grid gap-4 md:grid-cols-3">
              <KeyValue label="Pattern" value={patternById(o.patternId)?.name ?? o.patternId} />
              <KeyValue label="Domain / use case" value={`${o.domain} · ${o.useCase}`} />
              <KeyValue label="Owner" value={o.owner} />
              <KeyValue label="Business objective" value={o.businessObjective} />
              <KeyValue label="Target outcome" value={o.businessOutcome} />
              <KeyValue label="Persona / users" value={`${o.targetPersona} — ${o.targetUsers}`} />
              <KeyValue label="Channels" value={o.channels.join(", ")} />
              <KeyValue label="Automation level" value={o.automationLevel} />
              <KeyValue label="Environment / hours" value={`${o.environment} · ${o.hoursOfOperation}`} />
              <KeyValue label="Languages" value={o.languages.join(", ")} />
              <KeyValue label="Expected volume" value={o.expectedVolume} />
              <KeyValue label="Expected impact" value={o.expectedBusinessImpact} />
            </dl>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Readiness by dimension" description="Deterministic scoring across design, grounding, guardrails, escalation and testing.">
              <div className="space-y-4">
                {readiness?.dimensions.map((dimension) => (
                  <div key={dimension.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{dimension.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {dimension.score}% · weight {Math.round(dimension.weight * 100)}%
                      </span>
                    </div>
                    <Progress value={dimension.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{dimension.note}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Blockers and success metrics">
              <div className="space-y-4">
                {readiness && readiness.blockers.length > 0 ? (
                  <ul className="space-y-2">
                    {readiness.blockers.map((blocker) => (
                      <li key={blocker} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No readiness blockers outstanding.</p>
                )}
                <div className="space-y-2">
                  {o.successMetrics.map((metric) => (
                    <div key={metric.id} className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-sm font-medium text-foreground">{metric.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {metric.baseline} → {metric.target} · {metric.measurement}
                      </p>
                    </div>
                  ))}
                  {o.successMetrics.length === 0 ? <p className="text-xs text-muted-foreground">No success metrics defined.</p> : null}
                </div>
                {o.outOfScope.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Out of scope</p>
                    <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                      {o.outOfScope.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="mt-4 space-y-4">
          <SectionCard title="Topics and intents" description="Classification descriptions, utterances, permitted actions and escalation conditions.">
            <DataTable columns={topicColumns} rows={agent.topics} rowKey={(t) => t.id} emptyTitle="No topics yet" />
          </SectionCard>
          <SectionCard title="Topic diagnostics" description="Overlap, duplication, conflict, coverage and traceability checks.">
            {diagnostics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No diagnostics raised for the current topic set.</p>
            ) : (
              <ul className="space-y-2">
                {diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.kind}-${index}`} className={cn("rounded-lg border p-3 text-xs", TONE[diagnostic.severity])}>
                    <span className="mr-2 font-semibold uppercase tracking-wider">{diagnostic.kind}</span>
                    {diagnostic.message}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <SectionCard
            title="Action catalog"
            description="Flows, Apex, queries, retrieval and external APIs with authorisation, validation and rollback."
            actions={addButton("action", "Add action")}
          >
            <DataTable columns={actionColumns} rows={agent.actions} rowKey={(a) => a.id} emptyTitle="No actions defined" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="grounding" className="mt-4">
          <SectionCard
            title="Grounding and retrieval"
            description="Permitted fields, freshness, identity requirements and citation policy per source."
            actions={addButton("grounding", "Add grounding source")}
          >
            <DataTable columns={groundingColumns} rows={agent.grounding} rowKey={(g) => g.id} emptyTitle="No grounding sources" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="instructions" className="mt-4">
          <SectionCard title="Instruction set" description="Global behaviour, prohibitions, disclosures, formatting and uncertainty handling.">
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(agent.instructions).map(([key, values]) => (
                <div key={key} className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">{key.replace(/([A-Z])/g, " $1")}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(values as readonly string[]).map((value) => (
                      <li key={value}>• {value}</li>
                    ))}
                    {(values as readonly string[]).length === 0 ? <li>Not defined</li> : null}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="guardrails" className="mt-4">
          <SectionCard
            title="Guardrails"
            description="Each guardrail maps to the Trust Layer control library for evidencing at the risk gate."
            actions={addButton("guardrail", "Add guardrail")}
          >
            <DataTable columns={guardrailColumns} rows={agent.guardrails} rowKey={(g) => g.id} emptyTitle="No guardrails defined" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="escalation" className="mt-4">
          <SectionCard title="Human escalation" description="Triggers, destinations, context transfer, SLA and closure process.">
            <DataTable columns={escalationColumns} rows={agent.escalations} rowKey={(e) => e.id} emptyTitle="No escalation paths" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="boundaries" className="mt-4">
          <SectionCard title="Deterministic process boundaries" description="Where the agent reasons and where deterministic logic or a human must decide.">
            <DataTable
              columns={boundaryColumns}
              rows={[...agent.boundaries].sort((a, b) => a.sequence - b.sequence)}
              rowKey={(b) => b.id}
              emptyTitle="No boundaries defined"
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="consumption" className="mt-4 space-y-4">
          <SectionCard title="Consumption assumptions">
            <dl className="grid gap-4 md:grid-cols-4">
              <KeyValue label="Expected users" value={agent.consumption.expectedUsers.toLocaleString()} />
              <KeyValue label="Sessions / user / month" value={agent.consumption.sessionsPerUserPerMonth} />
              <KeyValue label="Conversations / session" value={agent.consumption.conversationsPerSession} />
              <KeyValue label="Actions / conversation" value={agent.consumption.actionsPerConversation} />
              <KeyValue label="Retrievals / conversation" value={agent.consumption.retrievalCallsPerConversation} />
              <KeyValue label="Peak concurrency factor" value={agent.consumption.peakConcurrencyFactor} />
              <KeyValue label="Monthly growth" value={`${Math.round(agent.consumption.monthlyGrowthRate * 100)}%`} />
              <KeyValue label="Cost per credit" value={currency(agent.consumption.costPerCredit)} />
            </dl>
          </SectionCard>
          <SectionCard title="Scenario model" description="Low, base and high demand with credits, monthly cost and year-one growth.">
            <div className="grid gap-4 md:grid-cols-3">
              {scenarios.map((scenario) => (
                <div key={scenario.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{scenario.label} scenario</p>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Conversations / month</dt>
                      <dd className="tabular-nums">{scenario.conversationsPerMonth.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Actions / month</dt>
                      <dd className="tabular-nums">{scenario.actionsPerMonth.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Retrievals / month</dt>
                      <dd className="tabular-nums">{scenario.retrievalsPerMonth.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Peak / hour</dt>
                      <dd className="tabular-nums">{scenario.peakConversationsPerHour.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Credits / month</dt>
                      <dd className="tabular-nums">{scenario.creditsPerMonth.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                      <dt>Monthly cost</dt>
                      <dd className="tabular-nums">{currency(scenario.estimatedMonthlyCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Year 1 with growth</dt>
                      <dd className="tabular-nums">{currency(scenario.year1WithGrowth)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="traceability" className="mt-4">
          <SectionCard
            title="Traceability matrix"
            description="Agent → topic → action → data product → source system → control."
          >
            <DataTable columns={traceColumns} rows={traceability} rowKey={(r) => `${r.topic}-${r.action}-${r.dataProduct}`} emptyTitle="Nothing to trace" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4 space-y-4">
          <SectionCard
            title="AI Suggested design improvements"
            description="Every suggestion shows its rationale and confidence and requires an explicit decision recorded in the audit trail."
          >
            {openSuggestions.length === 0 ? (
              <EmptyState
                title="No open suggestions"
                message="All current design suggestions have been decided."
                icon={<Sparkles className="h-5 w-5" aria-hidden />}
              />
            ) : (
              <div className="space-y-3">
                {openSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AiSuggestedBadge />
                          <Badge variant="outline" className="capitalize">
                            {suggestion.kind}
                          </Badge>
                          <MetaPill>{Math.round(suggestion.confidence * 100)}% confidence</MetaPill>
                          <MetaPill>{suggestion.origin.replace(/-/g, " ")}</MetaPill>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{suggestion.title}</p>
                        <p className="max-w-3xl text-xs text-muted-foreground">{suggestion.detail}</p>
                        <p className="max-w-3xl text-xs italic text-muted-foreground">Rationale: {suggestion.rationale}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => onDecide(suggestion, "accepted")} disabled={decide.isPending}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDecide(suggestion, "edited")} disabled={decide.isPending}>
                          Accept with edits
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDecide(suggestion, "rejected")} disabled={decide.isPending}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Suggestion decision log">
            {(decisions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {(decisions ?? []).map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-xs">
                    <span className="text-foreground">{entry.title}</span>
                    <span className="text-muted-foreground">
                      {entry.decision} · {entry.decidedBy} · {dateTime(entry.decidedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="governance" className="mt-4 space-y-4">
          <SectionCard title="Lifecycle status" description="Status transitions and reviews are recorded in the initiative audit trail.">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={agent.status}
                  onValueChange={(value) =>
                    advance.mutate(
                      { agent, status: value as AgentLifecycleStatus },
                      { onSuccess: () => toast({ title: "Status updated", description: AGENT_STATUS_LABEL[value as AgentLifecycleStatus] }) },
                    )
                  }
                >
                  <SelectTrigger id="status" className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {AGENT_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["design-review", "risk-review", "business-review"] as AgentReview["stage"][]).map((stage) => (
                  <div key={stage} className="flex items-center gap-1 rounded-lg border border-border bg-surface p-2">
                    <span className="px-1 text-xs capitalize text-muted-foreground">{stage.replace(/-/g, " ")}</span>
                    <Button size="sm" variant="outline" onClick={() => recordReview(stage, "approved")} disabled={review.isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => recordReview(stage, "changes-requested")} disabled={review.isPending}>
                      Changes
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Version history"
              description="Snapshots capture topic, action, grounding, guardrail and escalation counts."
              actions={
                <div className="flex items-center gap-2">
                  <Input
                    value={nextVersion}
                    onChange={(event) => setNextVersion(event.target.value)}
                    placeholder="e.g. 1.4"
                    className="h-9 w-24"
                    aria-label="New version number"
                  />
                  <Button
                    size="sm"
                    disabled={!nextVersion.trim() || snapshot.isPending}
                    onClick={() =>
                      snapshot.mutate(
                        { agent, version: nextVersion.trim(), summary: `Design snapshot at readiness ${readiness?.overall ?? 0}%` },
                        {
                          onSuccess: () => {
                            setNextVersion("");
                            toast({ title: "Version captured" });
                          },
                        },
                      )
                    }
                  >
                    <GitBranch className="mr-2 h-4 w-4" />
                    Snapshot
                  </Button>
                </div>
              }
            >
              {agent.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions captured yet.</p>
              ) : (
                <ul className="space-y-2">
                  {[...agent.versions].reverse().map((version) => (
                    <li key={version.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">v{version.version}</p>
                        <span className="text-xs text-muted-foreground">
                          {version.createdBy} · {dateTime(version.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{version.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <MetaPill>{version.counts.topics} topics</MetaPill>
                        <MetaPill>{version.counts.actions} actions</MetaPill>
                        <MetaPill>{version.counts.grounding} grounding</MetaPill>
                        <MetaPill>{version.counts.guardrails} guardrails</MetaPill>
                        <MetaPill>{version.counts.escalations} escalations</MetaPill>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Change impact and approvals">
              <div className="space-y-4">
                {changeImpact.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No change impact detected.</p>
                ) : (
                  <ul className="space-y-2">
                    {changeImpact.map((impact) => (
                      <li key={`${impact.area}-${impact.change}`} className={cn("rounded-lg border p-3 text-xs", TONE[impact.severity])}>
                        <p className="font-semibold">
                          {impact.area} — {impact.change}
                        </p>
                        <p>{impact.impact}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="space-y-2">
                  {agent.reviews.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-xs">
                      <span className="capitalize text-foreground">{entry.stage.replace(/-/g, " ")}</span>
                      <span className="text-muted-foreground">
                        {entry.outcome} · {entry.reviewerRole}
                        {entry.decidedAt ? ` · ${dateTime(entry.decidedAt)}` : ""}
                      </span>
                    </div>
                  ))}
                  {agent.reviews.length === 0 ? <p className="text-xs text-muted-foreground">No reviews recorded.</p> : null}
                </div>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <ApprovalWorkflowPanel agent={agent} readiness={readiness} />
        </TabsContent>
      </Tabs>

      {editor ? (
        <DesignObjectDrawer
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          kind={editor.kind}
          record={editor.record}
          isNew={editor.isNew}
          saving={saveDesign.isPending}
          onSave={(merged, label) =>
            saveDesign.mutate(
              {
                agentId: agent.id,
                kind: editor.kind,
                objectId: editor.isNew ? undefined : String(editor.record.id ?? ""),
                data: merged,
                label,
              },
              {
                onSuccess: () => {
                  setEditor(null);
                  toast({ title: "Design saved", description: `${label} — readiness recomputed.` });
                },
                onError: (error) =>
                  toast({
                    variant: "destructive",
                    title: "Save failed",
                    description: error instanceof Error ? error.message : "Unknown error.",
                  }),
              },
            )
          }
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Remove design object?"
        description={`"${pendingDelete?.label ?? ""}" will be removed from the agent design. Readiness, diagnostics and traceability recompute immediately, and the change is recorded in the audit trail.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteDesign.mutate(
            { agentId: agent.id, ...pendingDelete },
            { onSuccess: () => toast({ title: "Design object removed", description: pendingDelete.label }) },
          );
          setPendingDelete(null);
        }}
      />
    </div>

  );
};

export default AgentWorkbenchPage;
