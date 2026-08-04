import { useMemo, useState } from "react";
import { Download, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, StatTile, KeyValue } from "@/components/enterprise/Layout";
import { ErrorState, LoadingState, EmptyState } from "@/components/enterprise/States";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { AiSuggestedBadge, MetaPill, RiskBadge } from "@/components/enterprise/Badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAxion } from "@/context/AxionContext";
import { useInitiative } from "@/hooks/useWorkspace";
import {
  useActivePhase5InitiativeId,
  useApplicabilityProfile,
  useApplicabilitySuggestions,
  useCreateEvidence,
  useDecideControlApplicability,
  useReviewEvidence,
  useSaveApplicabilityProfile,
  useTrustWorkspace,
  useUpdateControlInstance,
  useUpdateControlTest,
} from "@/hooks/usePhase5";
import {
  APPLICABILITY_FACTORS,
  COMPLIANCE_DISCLAIMER,
  CONTROL_DOMAINS,
  CONTROL_LIBRARY,
  FRAMEWORKS,
  controlById,
  controlDomain,
  framework,
} from "@/data/trustControlLibrary";
import { CONTROL_STATUSES, CONTROL_STATUS_LABEL } from "@/domain/phase5";
import { isEvidenceExpiring, isEvidenceValid } from "@/services/trustEngine";
import { complianceMatrixCsv, controlMatrixCsv, controlTestCsv, download, evidenceCsv } from "@/services/phase5Exports";
import { getPersona } from "@/domain/catalogs";
import type {
  ApplicabilityFactorId,
  ControlDesignStatus,
  ControlInstance,
  EvidenceRecord,
  EvidenceType,
} from "@/domain/phase5";
import type { RoleId } from "@/domain/models";

const roleName = (role: string) => getPersona(role)?.name ?? role.replace(/-/g, " ");
const EVIDENCE_TYPES: readonly EvidenceType[] = [
  "policy",
  "configuration-screenshot",
  "log-extract",
  "test-result",
  "approval-record",
  "architecture-artifact",
  "training-record",
  "third-party-report",
];

const TrustCompliancePage = () => {
  const { toast } = useToast();
  const { activeClientId } = useAxion();
  const initiativeId = useActivePhase5InitiativeId();
  const initiative = useInitiative(initiativeId);
  const stage = initiative.data?.currentStage ?? "validate";

  const workspace = useTrustWorkspace(initiativeId, stage);
  const profileQuery = useApplicabilityProfile(initiativeId);
  const suggestions = useApplicabilitySuggestions(profileQuery.data);

  const saveProfile = useSaveApplicabilityProfile();
  const decide = useDecideControlApplicability();
  const updateInstance = useUpdateControlInstance();
  const createEvidence = useCreateEvidence();
  const reviewEvidence = useReviewEvidence();
  const updateTest = useUpdateControlTest();

  const [draftAnswers, setDraftAnswers] = useState<Partial<Record<ApplicabilityFactorId, readonly string[]>> | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState({
    controlId: CONTROL_LIBRARY[0]?.id ?? "",
    type: "policy" as EvidenceType,
    title: "",
    description: "",
    attachmentName: "",
    referenceUrl: "",
    validUntil: new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10),
  });

  const answers = draftAnswers ?? profileQuery.data?.answers;
  const instances = workspace.instances;
  const selectedInstance = instances.find((instance) => instance.controlId === selectedControlId);
  const selectedDefinition = selectedControlId ? controlById(selectedControlId) : undefined;

  const effectivenessById = useMemo(
    () => new Map(workspace.effectiveness.map((entry) => [entry.controlId, entry])),
    [workspace.effectiveness],
  );

  const visibleInstances = useMemo(
    () =>
      instances.filter((instance) => {
        if (domainFilter === "all") return true;
        return controlById(instance.controlId)?.domain === domainFilter;
      }),
    [instances, domainFilter],
  );

  const pending = instances.filter((instance) => instance.applicability === "pending");

  if (workspace.isLoading || profileQuery.isLoading) return <LoadingState label="Loading trust posture" rows={5} />;
  if (workspace.isError || profileQuery.isError)
    return <ErrorState message="The trust layer workspace could not be loaded." onRetry={() => window.location.reload()} />;

  const posture = workspace.posture;

  const toggleAnswer = (factorId: ApplicabilityFactorId, value: string, multi: boolean) => {
    const current = answers?.[factorId] ?? [];
    const next = multi
      ? current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
      : [value];
    setDraftAnswers({ ...(answers ?? {}), [factorId]: next });
  };

  const handleSaveProfile = () => {
    if (!profileQuery.data || !answers) return;
    saveProfile.mutate(
      { ...profileQuery.data, answers: answers as never },
      {
        onSuccess: () => {
          setDraftAnswers(null);
          toast({ title: "Applicability re-assessed", description: "Suggested controls refreshed for review." });
        },
      },
    );
  };

  const controlColumns: readonly DataTableColumn<ControlInstance>[] = [
    {
      key: "control",
      header: "Control",
      render: (row) => {
        const definition = controlById(row.controlId);
        return (
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {row.controlId} — {definition?.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <MetaPill>{controlDomain(definition?.domain ?? "")?.name}</MetaPill>
              {definition?.critical ? <Badge variant="outline" className="border-destructive/40 text-destructive">Critical</Badge> : null}
              {row.origin === "ai-suggested" ? <AiSuggestedBadge /> : <MetaPill>Rules suggested</MetaPill>}
            </div>
          </div>
        );
      },
    },
    {
      key: "applicability",
      header: "Applicability",
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm capitalize text-foreground">{row.applicability}</p>
          {row.confidence ? <p className="text-xs text-muted-foreground">{row.confidence}% confidence</p> : null}
        </div>
      ),
    },
    {
      key: "design",
      header: "Design",
      render: (row) => <span className="text-sm">{CONTROL_STATUS_LABEL[row.designStatus]}</span>,
    },
    {
      key: "operating",
      header: "Operating",
      render: (row) => <span className="text-sm">{CONTROL_STATUS_LABEL[row.operatingStatus]}</span>,
    },
    {
      key: "effectiveness",
      header: "Effectiveness",
      render: (row) => {
        const score = effectivenessById.get(row.controlId);
        return (
          <div className="w-28 space-y-1">
            <Progress value={score?.overall ?? 0} className="h-2" />
            <p className="text-xs tabular-nums text-muted-foreground">{score?.overall ?? 0}% overall</p>
          </div>
        );
      },
    },
    { key: "residual", header: "Residual", render: (row) => <RiskBadge level={row.residualRisk} /> },
    { key: "owner", header: "Owner", render: (row) => <span className="text-sm">{roleName(row.controlOwner)}</span> },
  ];

  const evidenceColumns: readonly DataTableColumn<EvidenceRecord>[] = [
    {
      key: "title",
      header: "Evidence",
      render: (row) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.controlId} · {row.type.replace(/-/g, " ")} · v{row.version}
          </p>
        </div>
      ),
    },
    { key: "owner", header: "Owner", render: (row) => <span className="text-sm">{roleName(row.owner)}</span> },
    {
      key: "validity",
      header: "Validity",
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm">{row.validUntil.slice(0, 10)}</p>
          {!isEvidenceValid(row) ? (
            <Badge variant="outline" className="border-destructive/40 text-destructive">Not valid</Badge>
          ) : isEvidenceExpiring(row) ? (
            <Badge variant="outline" className="border-warning/40 text-warning-foreground">Expiring</Badge>
          ) : (
            <Badge variant="outline" className="border-success/30 text-success">Valid</Badge>
          )}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <span className="text-sm capitalize">{row.status.replace(/-/g, " ")}</span> },
    {
      key: "review",
      header: "Review",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={reviewEvidence.isPending || row.status === "accepted"}
            onClick={() => reviewEvidence.mutate({ id: row.id, outcome: "accepted" })}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={reviewEvidence.isPending}
            onClick={() => reviewEvidence.mutate({ id: row.id, outcome: "rejected", comments: "Insufficient evidence." })}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assurance"
        title="Trust & Compliance"
        description="Trust layer control library, applicability assessment, regulatory mapping, evidence and control testing for the active initiative."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => download("control-matrix.csv", controlMatrixCsv(instances), "text/csv")}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> Control matrix
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download("compliance-matrix.csv", complianceMatrixCsv(posture.frameworkCoverage), "text/csv")}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> Compliance matrix
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Applicable controls" value={posture.applicableControls} hint={`${posture.pendingApplicability} pending review`} />
        <StatTile label="Control coverage" value={`${posture.controlCoverage}%`} hint={`${posture.implementedControls} implemented`} />
        <StatTile label="Tested controls" value={posture.testedControls} hint="Operating effectiveness evidenced" />
        <StatTile label="Evidence completeness" value={`${posture.evidenceCompleteness}%`} hint={`${posture.expiringEvidence} expiring soon`} />
        <StatTile label="Open deficiencies" value={posture.openDeficiencies} hint="Failed tests awaiting remediation" />
        <StatTile label="Gate blockers" value={posture.blockers.length} hint={`Stage: ${stage}`} />
      </div>

      <Tabs defaultValue="controls">
        <TabsList>
          <TabsTrigger value="controls">Control library</TabsTrigger>
          <TabsTrigger value="applicability">Applicability</TabsTrigger>
          <TabsTrigger value="frameworks">Regulatory mapping</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="testing">Control testing</TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="mt-4 space-y-4">
          <SectionCard
            title="Initiative control set"
            description="Click a control to inspect the objective, framework mapping, evidence requirements and status."
            actions={
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="All domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All control domains</SelectItem>
                  {CONTROL_DOMAINS.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            <div className="p-4">
              <DataTable
                columns={controlColumns}
                rows={visibleInstances}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedControlId(row.controlId)}
                emptyTitle="No controls in scope"
                emptyMessage="Run the applicability assessment to generate the control set."
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="applicability" className="mt-4 space-y-4">
          <SectionCard
            title="Applicability assessment"
            description="Twelve factors drive the deterministic suggestion engine. Every suggestion requires explicit acceptance, editing or rejection."
            actions={
              <Button size="sm" onClick={handleSaveProfile} disabled={!draftAnswers || saveProfile.isPending}>
                <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Re-assess applicability
              </Button>
            }
          >
            <div className="grid gap-5 p-4 md:grid-cols-2 xl:grid-cols-3">
              {APPLICABILITY_FACTORS.map((factor) => (
                <div key={factor.id} className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{factor.label}</p>
                    <p className="text-xs text-muted-foreground">{factor.help}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {factor.options.map((option) => {
                      const selected = (answers?.[factor.id] ?? []).includes(option.value);
                      return (
                        <Button
                          key={option.value}
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          onClick={() => toggleAnswer(factor.id, option.value, factor.multi)}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={`Suggestion review queue (${pending.length})`}
            description={`${suggestions.length} controls suggested by the rules and correlation engine for this profile.`}
          >
            <div className="space-y-3 p-4">
              {pending.length === 0 ? (
                <EmptyState title="Queue clear" message="Every suggested control has an explicit applicability decision." />
              ) : (
                pending.map((instance) => {
                  const definition = controlById(instance.controlId);
                  return (
                    <div key={instance.id} className="rounded-xl border border-border bg-surface/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl space-y-1.5">
                          <p className="font-medium text-foreground">
                            {instance.controlId} — {definition?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{instance.rationale}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {instance.origin === "ai-suggested" ? <AiSuggestedBadge /> : <MetaPill>Rules suggested</MetaPill>}
                            <MetaPill>{instance.confidence ?? 0}% confidence</MetaPill>
                            <MetaPill>Gate: {definition?.stageGate}</MetaPill>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ instance, decision: "accepted" })}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({ instance, decision: "edited", notes: "Scope narrowed during review." })
                            }
                          >
                            Accept with edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({ instance, decision: "rejected", notes: "Not applicable to this initiative." })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="frameworks" className="mt-4 space-y-4">
          <SectionCard title="Framework coverage" description={COMPLIANCE_DISCLAIMER}>
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {FRAMEWORKS.map((fw) => {
                const coverage = posture.frameworkCoverage.find((entry) => entry.frameworkId === fw.id);
                const percent = coverage && coverage.mapped > 0 ? Math.round((coverage.satisfied / coverage.mapped) * 100) : 0;
                return (
                  <div key={fw.id} className="space-y-2 rounded-xl border border-border bg-surface/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{fw.shortName}</p>
                        <p className="text-xs text-muted-foreground">{fw.authority}</p>
                      </div>
                      <Badge variant="outline" className={fw.status === "seeded" ? "border-success/30 text-success" : undefined}>
                        {fw.status === "seeded" ? "Seeded" : "Extension ready"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{fw.summary}</p>
                    {coverage ? (
                      <>
                        <Progress value={percent} className="h-2" />
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {coverage.satisfied}/{coverage.mapped} mapped controls satisfied
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-4">
          <SectionCard
            title="Evidence register"
            description="Evidence is versioned, reviewed and expires. Expired or missing evidence raises stage-gate blockers."
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => download("evidence-register.csv", evidenceCsv(workspace.evidence), "text/csv")}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden /> Export
                </Button>
                <Button size="sm" onClick={() => setEvidenceOpen(true)}>
                  Submit evidence
                </Button>
              </div>
            }
          >
            <div className="p-4">
              <DataTable
                columns={evidenceColumns}
                rows={workspace.evidence}
                rowKey={(row) => row.id}
                emptyTitle="No evidence captured"
                emptyMessage="Submit control evidence to progress the assurance posture."
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="testing" className="mt-4 space-y-4">
          <SectionCard
            title="Control testing"
            description="Record observed results, deficiencies and remediation. Failed tests block the stage gate until approved."
            actions={
              <Button variant="outline" size="sm" onClick={() => download("control-tests.csv", controlTestCsv(workspace.tests), "text/csv")}>
                <Download className="mr-1.5 h-4 w-4" aria-hidden /> Export
              </Button>
            }
          >
            <div className="space-y-3 p-4">
              {workspace.tests.length === 0 ? (
                <EmptyState title="No tests scheduled" message="Schedule control tests to evidence operating effectiveness." />
              ) : (
                workspace.tests.map((test) => (
                  <div key={test.id} className="rounded-xl border border-border bg-surface/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl space-y-1.5">
                        <p className="font-medium text-foreground">
                          {test.controlId} — {controlById(test.controlId)?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{test.procedure}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <MetaPill>Owner: {roleName(test.testOwner)}</MetaPill>
                          <MetaPill>Sample: {test.sample}</MetaPill>
                          <Badge
                            variant="outline"
                            className={
                              test.outcome === "pass"
                                ? "border-success/30 text-success"
                                : test.outcome === "fail"
                                  ? "border-destructive/40 text-destructive"
                                  : undefined
                            }
                          >
                            {test.outcome.replace(/-/g, " ")}
                          </Badge>
                        </div>
                        {test.deficiency ? (
                          <p className="text-sm text-destructive">
                            Deficiency ({test.deficiencySeverity}): {test.deficiency}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateTest.isPending || test.outcome === "pass"}
                          onClick={() =>
                            updateTest.mutate({
                              id: test.id,
                              patch: {
                                outcome: "pass",
                                executedOn: new Date().toISOString(),
                                observedResult: "Retest passed; deficiency closed.",
                                approvalState: "approved",
                              },
                              summary: `${test.controlId} retest passed`,
                            })
                          }
                        >
                          Record pass
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updateTest.isPending || test.outcome === "fail"}
                          onClick={() =>
                            updateTest.mutate({
                              id: test.id,
                              patch: {
                                outcome: "fail",
                                executedOn: new Date().toISOString(),
                                deficiency: "Test failed during execution.",
                                deficiencySeverity: "high",
                                approvalState: "submitted",
                              },
                              summary: `${test.controlId} test failed`,
                            })
                          }
                        >
                          Record fail
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedControlId)} onOpenChange={(open) => !open && setSelectedControlId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              {selectedControlId} — {selectedDefinition?.title}
            </SheetTitle>
          </SheetHeader>
          {selectedDefinition ? (
            <div className="mt-5 space-y-5">
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Domain" value={controlDomain(selectedDefinition.domain)?.name} />
                <KeyValue label="Pillar" value={controlDomain(selectedDefinition.domain)?.pillar} />
                <KeyValue label="Stage gate" value={selectedDefinition.stageGate} />
                <KeyValue label="Frequency" value={selectedDefinition.frequency} />
                <KeyValue label="Control owner" value={roleName(selectedDefinition.controlOwner)} />
                <KeyValue label="Reviewer" value={roleName(selectedDefinition.reviewer)} />
              </dl>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Objective</p>
                <p className="text-sm text-foreground">{selectedDefinition.objective}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Risk addressed</p>
                <p className="text-sm text-muted-foreground">{selectedDefinition.riskAddressed}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Framework mapping</p>
                <ul className="space-y-1.5">
                  {selectedDefinition.frameworkMappings.map((mapping) => (
                    <li key={`${mapping.frameworkId}-${mapping.reference}`} className="text-sm">
                      <span className="font-medium text-foreground">
                        {framework(mapping.frameworkId)?.shortName ?? mapping.frameworkId} {mapping.reference}
                      </span>
                      <span className="text-muted-foreground"> — {mapping.interpretation}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Evidence requirements</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {selectedDefinition.evidenceRequirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
              {selectedInstance ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Design status</Label>
                    <Select
                      value={selectedInstance.designStatus}
                      onValueChange={(value) =>
                        updateInstance.mutate({
                          id: selectedInstance.id,
                          patch: { designStatus: value as ControlDesignStatus },
                          summary: `${selectedInstance.controlId} design status set to ${value}`,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTROL_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {CONTROL_STATUS_LABEL[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Operating status</Label>
                    <Select
                      value={selectedInstance.operatingStatus}
                      onValueChange={(value) =>
                        updateInstance.mutate({
                          id: selectedInstance.id,
                          patch: { operatingStatus: value as ControlDesignStatus },
                          summary: `${selectedInstance.controlId} operating status set to ${value}`,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTROL_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {CONTROL_STATUS_LABEL[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
              {selectedInstance?.remediationActions.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Remediation</p>
                  {selectedInstance.remediationActions.map((action) => (
                    <div key={action.id} className="rounded-lg border border-border bg-surface/60 p-3 text-sm">
                      <p className="text-foreground">{action.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {roleName(action.owner)} · due {action.dueDate.slice(0, 10)} · {action.status}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit control evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Control</Label>
              <Select value={evidenceDraft.controlId} onValueChange={(value) => setEvidenceDraft({ ...evidenceDraft, controlId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.controlId} value={instance.controlId}>
                      {instance.controlId} — {controlById(instance.controlId)?.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Evidence type</Label>
              <Select
                value={evidenceDraft.type}
                onValueChange={(value) => setEvidenceDraft({ ...evidenceDraft, type: value as EvidenceType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/-/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidence-title">Title</Label>
              <Input
                id="evidence-title"
                value={evidenceDraft.title}
                onChange={(event) => setEvidenceDraft({ ...evidenceDraft, title: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidence-description">Description</Label>
              <Textarea
                id="evidence-description"
                value={evidenceDraft.description}
                onChange={(event) => setEvidenceDraft({ ...evidenceDraft, description: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="evidence-attachment">Attachment name</Label>
                <Input
                  id="evidence-attachment"
                  value={evidenceDraft.attachmentName}
                  onChange={(event) => setEvidenceDraft({ ...evidenceDraft, attachmentName: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evidence-valid">Valid until</Label>
                <Input
                  id="evidence-valid"
                  type="date"
                  value={evidenceDraft.validUntil}
                  onChange={(event) => setEvidenceDraft({ ...evidenceDraft, validUntil: event.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEvidenceOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!evidenceDraft.title || createEvidence.isPending}
              onClick={() => {
                const definition = controlById(evidenceDraft.controlId);
                createEvidence.mutate(
                  {
                    initiativeId,
                    controlId: evidenceDraft.controlId,
                    type: evidenceDraft.type,
                    title: evidenceDraft.title,
                    description: evidenceDraft.description,
                    attachmentName: evidenceDraft.attachmentName || undefined,
                    referenceUrl: evidenceDraft.referenceUrl || undefined,
                    owner: (definition?.implementationOwner ?? "data-steward") as RoleId,
                    collectedOn: new Date().toISOString(),
                    validUntil: new Date(evidenceDraft.validUntil).toISOString(),
                    reviewer: (definition?.reviewer ?? "enterprise-architect") as RoleId,
                    status: "submitted",
                  },
                  {
                    onSuccess: () => {
                      setEvidenceOpen(false);
                      setEvidenceDraft({ ...evidenceDraft, title: "", description: "", attachmentName: "" });
                      toast({ title: "Evidence submitted", description: "Routed to the reviewer for acceptance." });
                    },
                  },
                );
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Workspace: {activeClientId} · initiative {initiativeId}. {COMPLIANCE_DISCLAIMER}
      </p>
    </div>
  );
};

export default TrustCompliancePage;
