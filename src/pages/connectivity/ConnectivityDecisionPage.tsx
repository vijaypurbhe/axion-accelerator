import { useMemo, useState } from "react";
import { Download, FileText, Plus } from "lucide-react";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { ErrorState, LoadingState, EmptyState } from "@/components/enterprise/States";
import { DataTable } from "@/components/enterprise/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAxion } from "@/context/AxionContext";
import { SOURCE_SYSTEMS } from "@/data/sourceCatalog";
import { DATA_PRODUCT_TEMPLATES } from "@/data/dataProductLibrary";
import { DECISION_CRITERIA } from "@/data/connectivityCatalog";
import { decisionMatrixCsv, decisionReportMarkdown, evaluateConnectivity } from "@/services/connectivityEngine";
import {
  useActivePhase4InitiativeId,
  useConnectivityAssessments,
  useConnectivityDecisions,
  useConnectivityEvaluation,
  useConnectivityPolicy,
  useCreateConnectivityAssessment,
  useDecideConnectivity,
  useUpdateConnectivityAssessment,
} from "@/hooks/usePhase4";
import { CONNECTIVITY_PATTERNS, CRITERION_GROUP_LABELS, PATTERN_LABELS } from "@/domain/phase4";
import type { RoleId } from "@/domain/models";
import type { ConnectivityAssessment, ConnectivityPatternId, CriterionGroup } from "@/domain/phase4";

const APPROVER_ROLES: readonly RoleId[] = ["enterprise-architect", "data360-architect"];

const sourceName = (id: string) => SOURCE_SYSTEMS.find((entry) => entry.id === id)?.name ?? id;
const productName = (id: string) => DATA_PRODUCT_TEMPLATES.find((entry) => entry.id === id)?.name ?? id;

const download = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const ConnectivityDecisionPage = () => {
  const { toast } = useToast();
  const { activeClientId, persona } = useAxion();
  const initiativeId = useActivePhase4InitiativeId();

  const assessments = useConnectivityAssessments(initiativeId);
  const decisions = useConnectivityDecisions(initiativeId);
  const policy = useConnectivityPolicy(activeClientId);
  const createAssessment = useCreateConnectivityAssessment();
  const updateAssessment = useUpdateConnectivityAssessment();
  const decideConnectivity = useDecideConnectivity();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftSource, setDraftSource] = useState(SOURCE_SYSTEMS[0]?.id ?? "");
  const [draftProduct, setDraftProduct] = useState(DATA_PRODUCT_TEMPLATES[0]?.id ?? "");
  const [weightDrafts, setWeightDrafts] = useState<Record<string, number>>({});
  const [decisionDialog, setDecisionDialog] = useState<{ mode: "accept" | "override"; pattern: ConnectivityPatternId } | null>(
    null,
  );
  const [justification, setJustification] = useState("");
  const [risks, setRisks] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [approverRole, setApproverRole] = useState<RoleId>(APPROVER_ROLES[0]);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));

  const list = assessments.data ?? [];
  const selected = list.find((entry) => entry.id === selectedId) ?? list[0];
  const platform = selected ? SOURCE_SYSTEMS.find((entry) => entry.id === selected.sourceSystemId)?.platform : undefined;

  const effectiveAssessment: ConnectivityAssessment | undefined = selected
    ? { ...selected, weightOverrides: { ...selected.weightOverrides, ...weightDrafts } }
    : undefined;

  const result = useConnectivityEvaluation(effectiveAssessment, policy.data, platform);
  const existingDecision = decisions.data?.find((entry) => entry.assessmentId === selected?.id);

  const grouped = useMemo(() => {
    const groups = new Map<CriterionGroup, typeof DECISION_CRITERIA[number][]>();
    for (const criterion of DECISION_CRITERIA) {
      groups.set(criterion.group, [...(groups.get(criterion.group) ?? []), criterion]);
    }
    return [...groups.entries()];
  }, []);

  const isLoading = assessments.isLoading || policy.isLoading;
  const isError = assessments.isError || policy.isError;

  const handleAnswer = (criterionId: string, value: string) => {
    if (!selected) return;
    updateAssessment.mutate({
      id: selected.id,
      patch: { answers: { ...selected.answers, [criterionId]: value }, status: "evaluated" },
    });
  };

  const handleWeightChange = (criterionId: string, value: number) => {
    setWeightDrafts((prev) => ({ ...prev, [criterionId]: value }));
  };

  const saveWeights = () => {
    if (!selected) return;
    updateAssessment.mutate(
      { id: selected.id, patch: { weightOverrides: { ...selected.weightOverrides, ...weightDrafts } } },
      { onSuccess: () => toast({ title: "Weight overrides saved" }) },
    );
    setWeightDrafts({});
  };

  const handleCreate = () => {
    if (!draftName.trim()) {
      toast({ title: "Name the assessment before creating it", variant: "destructive" });
      return;
    }
    createAssessment.mutate(
      { initiativeId, sourceSystemId: draftSource, dataProductId: draftProduct, name: draftName },
      {
        onSuccess: (created) => {
          setShowCreate(false);
          setDraftName("");
          setSelectedId(created.id);
          toast({ title: "Assessment created", description: created.name });
        },
      },
    );
  };

  const openDecisionDialog = (mode: "accept" | "override", pattern: ConnectivityPatternId) => {
    setJustification("");
    setRisks("");
    setMitigation("");
    setDecisionDialog({ mode, pattern });
  };

  const submitDecision = () => {
    if (!selected || !result) return;
    if (decisionDialog?.mode === "override" && !justification.trim()) {
      toast({ title: "A justification is required to override the recommendation", variant: "destructive" });
      return;
    }
    decideConnectivity.mutate(
      {
        assessment: { ...selected, weightOverrides: effectiveAssessment?.weightOverrides ?? selected.weightOverrides },
        result,
        selected: decisionDialog!.pattern,
        sourceName: sourceName(selected.sourceSystemId),
        productName: productName(selected.dataProductId),
        override:
          decisionDialog!.mode === "override"
            ? { rationale: justification, risks, mitigation, approverRole, effectiveDate: new Date(effectiveDate).toISOString() }
            : undefined,
      },
      {
        onSuccess: ({ adr }) => {
          setDecisionDialog(null);
          toast({ title: "Decision recorded", description: `${adr.reference} generated` });
        },
      },
    );
  };

  const exportMarkdown = () => {
    if (!selected || !result) return;
    const md = decisionReportMarkdown(selected, result, existingDecision?.selected ?? result.recommended);
    download(`${selected.id}-decision-report.md`, md, "text/markdown");
  };

  const exportCsv = () => {
    const rows = list
      .map((assessment) => {
        const evaluated = assessment.answers && Object.keys(assessment.answers).length ? evaluateConnectivity(assessment, { policy: policy.data }) : undefined;
        if (!evaluated) return null;
        const decision = decisions.data?.find((entry) => entry.assessmentId === assessment.id);
        return {
          assessment,
          sourceName: sourceName(assessment.sourceSystemId),
          productName: productName(assessment.dataProductId),
          result: evaluated,
          selected: decision?.selected ?? evaluated.recommended,
          overridden: Boolean(decision?.override),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    download(`connectivity-decision-matrix.csv`, decisionMatrixCsv(rows), "text/csv");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Phase 4" title="Connectivity decision engine" />
        <LoadingState label="Loading connectivity assessments" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Phase 4" title="Connectivity decision engine" />
        <ErrorState message="Unable to load connectivity assessments." onRetry={() => assessments.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 4 · Connectivity"
        title="Connectivity decision engine"
        description="Score physical ingest, zero-copy live query and cached acceleration against 23 weighted criteria, with a fully explainable, auditable decision."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
              Decision matrix CSV
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              New assessment
            </Button>
          </>
        }
      />

      <SectionCard title="Assessments" description="Every source-to-data-product connectivity decision for this initiative.">
        <DataTable
          columns={[
            { key: "name", header: "Assessment", render: (row: ConnectivityAssessment) => row.name },
            { key: "source", header: "Source system", render: (row: ConnectivityAssessment) => sourceName(row.sourceSystemId) },
            { key: "product", header: "Data product", render: (row: ConnectivityAssessment) => productName(row.dataProductId) },
            { key: "status", header: "Status", render: (row: ConnectivityAssessment) => <Badge variant="outline">{row.status}</Badge> },
            {
              key: "progress",
              header: "Criteria answered",
              render: (row: ConnectivityAssessment) =>
                `${Object.keys(row.answers).length}/${DECISION_CRITERIA.length}`,
            },
          ]}
          rows={list}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedId(row.id)}
          emptyTitle="No connectivity assessments yet"
          emptyMessage="Create an assessment to start scoring physical, zero-copy and cached-acceleration patterns."
        />
      </SectionCard>

      {!selected ? (
        <EmptyState
          title="Select an assessment"
          message="Choose an assessment above, or create one, to see the live weighted scoring and pattern comparison."
        />
      ) : (
        <>
          <SectionCard
            title={selected.name}
            description={`${sourceName(selected.sourceSystemId)} → ${productName(selected.dataProductId)}`}
            actions={
              <Button variant="outline" size="sm" onClick={exportMarkdown} disabled={!result}>
                <FileText className="mr-1.5 h-4 w-4" aria-hidden />
                Decision report
              </Button>
            }
          >
            {result ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatTile label="Recommended pattern" value={PATTERN_LABELS[result.recommended]} />
                  <StatTile label="Confidence" value={`${result.confidence}%`} />
                  <StatTile label="Criteria answered" value={`${result.answeredCount}/${result.criteriaCount}`} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {CONNECTIVITY_PATTERNS.map((pattern) => {
                    const score = result.scores.find((entry) => entry.pattern === pattern)!;
                    const isWinner = pattern === result.recommended && !score.disqualified;
                    const isDecided = existingDecision?.selected === pattern;
                    return (
                      <div
                        key={pattern}
                        className={`rounded-xl border p-4 shadow-card ${isWinner ? "border-brand bg-brand/5" : "border-border bg-card"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{PATTERN_LABELS[pattern]}</p>
                          {isWinner ? <Badge className="bg-brand text-brand-foreground">Recommended</Badge> : null}
                          {isDecided ? <Badge variant="outline">Decided</Badge> : null}
                        </div>
                        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{score.score}/100</p>
                        <Progress value={score.score} className="mt-2 h-1.5" />
                        {score.disqualified ? (
                          <p className="mt-2 text-xs text-destructive">Disqualified: {score.disqualifiedBy.join("; ")}</p>
                        ) : null}
                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {score.contributions.slice(0, 4).map((entry) => (
                            <li key={entry.criterionId}>
                              {entry.label}: {entry.answerLabel} ({entry.weighted > 0 ? "+" : ""}
                              {entry.weighted})
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant={pattern === result.recommended ? "default" : "outline"}
                            disabled={score.disqualified}
                            onClick={() =>
                              openDecisionDialog(pattern === result.recommended ? "accept" : "override", pattern)
                            }
                          >
                            {pattern === result.recommended ? "Accept" : "Override to this"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-foreground">Rationale</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.rationale.map((line, index) => (
                        <li key={index}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-foreground">Guidance — {result.guidance.name}</p>
                    <p className="text-sm text-muted-foreground">{result.guidance.summary}</p>
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <p className="font-medium text-foreground">Benefits</p>
                        <ul>{result.guidance.benefits.map((line) => <li key={line}>• {line}</li>)}</ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Limitations</p>
                        <ul>{result.guidance.limitations.map((line) => <li key={line}>• {line}</li>)}</ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Risks</p>
                        <ul>{result.guidance.risks.map((line) => <li key={line}>• {line}</li>)}</ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Prerequisites</p>
                        <ul>{result.guidance.prerequisites.map((line) => <li key={line}>• {line}</li>)}</ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Cost</p>
                        <ul>{result.guidance.costConsiderations.map((line) => <li key={line}>• {line}</li>)}</ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Compliance</p>
                        <ul>{result.guidance.complianceConsiderations.map((line) => <li key={line}>• {line}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                </div>

                {existingDecision ? (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
                    <p className="font-semibold text-foreground">
                      Decision recorded: {PATTERN_LABELS[existingDecision.selected]}
                      {existingDecision.override ? " (override)" : ""}
                    </p>
                    <p className="text-muted-foreground">
                      ADR {existingDecision.adrReference} · decided by {existingDecision.decidedBy}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="Not enough data" message="Answer criteria below to see live scoring." />
            )}
          </SectionCard>

          <SectionCard
            title="Criteria questionnaire"
            description="23 criteria grouped by category. Weight overrides apply per-assessment on top of client policy defaults."
            actions={
              Object.keys(weightDrafts).length > 0 ? (
                <Button size="sm" onClick={saveWeights}>
                  Save weight overrides
                </Button>
              ) : undefined
            }
          >
            <div className="space-y-6">
              {grouped.map(([group, criteria]) => (
                <div key={group} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CRITERION_GROUP_LABELS[group]}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {criteria.map((criterion) => (
                      <div key={criterion.id} className="space-y-1.5 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-medium text-foreground">{criterion.label}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            className="h-7 w-14 text-xs"
                            aria-label={`Weight for ${criterion.label}`}
                            value={
                              weightDrafts[criterion.id] ??
                              selected.weightOverrides[criterion.id] ??
                              criterion.defaultWeight
                            }
                            onChange={(event) => handleWeightChange(criterion.id, Number(event.target.value))}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{criterion.question}</p>
                        <Select value={selected.answers[criterion.id] ?? ""} onValueChange={(value) => handleAnswer(criterion.id, value)}>
                          <SelectTrigger className="h-8 text-xs" aria-label={criterion.question}>
                            <SelectValue placeholder="Not assessed" />
                          </SelectTrigger>
                          <SelectContent>
                            {criterion.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New connectivity assessment</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assessment-name">Name</Label>
              <Input id="assessment-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Source system</Label>
              <Select value={draftSource} onValueChange={setDraftSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_SYSTEMS.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data product</Label>
              <Select value={draftProduct} onValueChange={setDraftProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_PRODUCT_TEMPLATES.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createAssessment.isPending}>
              Create assessment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(decisionDialog)} onOpenChange={(open) => !open && setDecisionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog?.mode === "accept" ? "Accept recommended pattern" : "Override recommendation"}
              {decisionDialog ? ` — ${PATTERN_LABELS[decisionDialog.pattern]}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="justification">
                Justification {decisionDialog?.mode === "override" ? "(required)" : "(optional)"}
              </Label>
              <Textarea id="justification" value={justification} onChange={(event) => setJustification(event.target.value)} rows={3} />
            </div>
            {decisionDialog?.mode === "override" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="risks">Risks accepted</Label>
                  <Textarea id="risks" value={risks} onChange={(event) => setRisks(event.target.value)} rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mitigation">Mitigation plan</Label>
                  <Textarea id="mitigation" value={mitigation} onChange={(event) => setMitigation(event.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Approver role</Label>
                    <Select value={approverRole} onValueChange={(value) => setApproverRole(value as RoleId)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPROVER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.replace(/-/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="effective-date">Effective date</Label>
                    <Input id="effective-date" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={submitDecision} disabled={decideConnectivity.isPending}>
              Confirm and generate ADR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectivityDecisionPage;
