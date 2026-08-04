import { useMemo, useState } from "react";
import { Download, Plus, ShieldAlert } from "lucide-react";
import { PageHeader, SectionCard, StatTile, KeyValue } from "@/components/enterprise/Layout";
import { ErrorState, LoadingState, EmptyState } from "@/components/enterprise/States";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { MetaPill, RiskBadge } from "@/components/enterprise/Badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAxion } from "@/context/AxionContext";
import { useInitiative } from "@/hooks/useWorkspace";
import {
  useAcceptRisk,
  useActivePhase5InitiativeId,
  useCreateRisk,
  useDecideGateWaiver,
  useGateWaivers,
  useGovernanceBodies,
  useRaciMatrix,
  useRequestGateWaiver,
  useTrustWorkspace,
  useUpdateRisk,
} from "@/hooks/usePhase5";
import { GOVERNANCE_PHASES, RISK_CATEGORIES } from "@/data/governanceSeed";
import { controlById } from "@/data/trustControlLibrary";
import { isRiskOverdue, riskHeatmapCells, riskScore } from "@/services/trustEngine";
import { download, raciCsv, riskRegisterCsv } from "@/services/phase5Exports";
import { getPersona } from "@/domain/catalogs";
import type { RiskCategoryId, RiskEntry, RiskStatus } from "@/domain/phase5";
import type { RiskLevel, RoleId } from "@/domain/models";

const roleName = (role: string) => getPersona(role)?.name ?? role.replace(/-/g, " ");
const LEVELS: readonly RiskLevel[] = ["low", "medium", "high", "critical"];
const STATUSES: readonly RiskStatus[] = ["open", "mitigating", "monitoring", "accepted", "closed"];
const OWNER_ROLES: readonly RoleId[] = [
  "executive-sponsor",
  "enterprise-architect",
  "data360-architect",
  "data-steward",
  "data-engineer",
  "agentforce-architect",
];

const GovernanceRiskPage = () => {
  const { toast } = useToast();
  const { activeClientId } = useAxion();
  const initiativeId = useActivePhase5InitiativeId();
  const initiative = useInitiative(initiativeId);
  const stage = initiative.data?.currentStage ?? "validate";

  const workspace = useTrustWorkspace(initiativeId, stage);
  const bodies = useGovernanceBodies(activeClientId);
  const raci = useRaciMatrix(activeClientId);
  const waivers = useGateWaivers(initiativeId);

  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const acceptRisk = useAcceptRisk();
  const requestWaiver = useRequestGateWaiver();
  const decideWaiver = useDecideGateWaiver();

  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState<RiskEntry | null>(null);
  const [acceptJustification, setAcceptJustification] = useState("");
  const [waiverTarget, setWaiverTarget] = useState<string | null>(null);
  const [waiverJustification, setWaiverJustification] = useState("");
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    category: "data" as RiskCategoryId,
    statement: "",
    cause: "",
    impactDescription: "",
    likelihood: "medium" as RiskLevel,
    impact: "high" as RiskLevel,
    mitigation: "",
    owner: "data-steward" as RoleId,
    dueDate: new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10),
  });

  const risks = workspace.risks;
  const selectedRisk = risks.find((risk) => risk.id === selectedRiskId);
  const heatmap = useMemo(() => riskHeatmapCells(risks), [risks]);
  const bodyList = bodies.data ?? [];
  const selectedBody = bodyList.find((body) => body.id === selectedBodyId);
  const waiverList = waivers.data ?? [];

  if (workspace.isLoading || bodies.isLoading || raci.isLoading) return <LoadingState label="Loading governance workspace" rows={5} />;
  if (workspace.isError || bodies.isError || raci.isError)
    return <ErrorState message="The governance and risk workspace could not be loaded." onRetry={() => window.location.reload()} />;

  const riskColumns: readonly DataTableColumn<RiskEntry>[] = [
    {
      key: "reference",
      header: "Risk",
      render: (row) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {row.reference} — {row.statement}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaPill>{RISK_CATEGORIES.find((category) => category.id === row.category)?.name ?? row.category}</MetaPill>
            {row.escalated ? <Badge variant="outline" className="border-warning/40 text-warning-foreground">Escalated</Badge> : null}
            {isRiskOverdue(row) ? <Badge variant="outline" className="border-destructive/40 text-destructive">Overdue</Badge> : null}
          </div>
        </div>
      ),
    },
    { key: "inherent", header: "Inherent", render: (row) => <RiskBadge level={row.inherentRisk} /> },
    { key: "residual", header: "Residual", render: (row) => <RiskBadge level={row.residualRisk} /> },
    { key: "score", header: "Score", render: (row) => <span className="text-sm tabular-nums">{riskScore(row)}</span> },
    { key: "owner", header: "Owner", render: (row) => <span className="text-sm">{roleName(row.owner)}</span> },
    { key: "due", header: "Due", render: (row) => <span className="text-sm">{row.dueDate.slice(0, 10)}</span> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Select
          value={row.status}
          onValueChange={(value) =>
            updateRisk.mutate({
              id: row.id,
              patch: { status: value as RiskStatus },
              summary: `${row.reference} status set to ${value}`,
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assurance"
        title="Governance & Risk"
        description="Governance operating model, decision rights, RACI, enterprise risk register and trust stage-gate control for the active initiative."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => download("risk-register.csv", riskRegisterCsv(risks), "text/csv")}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> Risk register
            </Button>
            <Button variant="outline" size="sm" onClick={() => download("raci-matrix.csv", raciCsv(raci.data ?? []), "text/csv")}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> RACI matrix
            </Button>
            <Button size="sm" onClick={() => setShowRiskDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Raise risk
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Open risks" value={risks.filter((risk) => risk.status !== "closed").length} hint={`${risks.length} total`} />
        <StatTile
          label="High / critical residual"
          value={risks.filter((risk) => risk.residualRisk === "high" || risk.residualRisk === "critical").length}
          hint={`${workspace.posture.pendingAcceptances.length} awaiting acceptance`}
        />
        <StatTile label="Overdue mitigations" value={risks.filter((risk) => isRiskOverdue(risk)).length} hint="Past due date" />
        <StatTile label="Gate blockers" value={workspace.gate.blockers.length} hint={`Stage: ${stage}`} />
        <StatTile
          label="Gate status"
          value={workspace.gate.clear ? "Clear" : "Blocked"}
          hint={`${waiverList.filter((waiver) => waiver.state === "approved").length} approved waivers`}
        />
      </div>

      <Tabs defaultValue="risks">
        <TabsList>
          <TabsTrigger value="risks">Risk register</TabsTrigger>
          <TabsTrigger value="gates">Stage gates</TabsTrigger>
          <TabsTrigger value="bodies">Governance bodies</TabsTrigger>
          <TabsTrigger value="raci">RACI</TabsTrigger>
          <TabsTrigger value="model">Operating model</TabsTrigger>
        </TabsList>

        <TabsContent value="risks" className="mt-4 space-y-4">
          <SectionCard title="Enterprise risk register" description="Click a risk to inspect cause, linked controls, mitigation and trend.">
            <div className="p-4">
              <DataTable
                columns={riskColumns}
                rows={risks}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedRiskId(row.id)}
                emptyTitle="No risks recorded"
                emptyMessage="Raise a risk to start the register for this initiative."
              />
            </div>
          </SectionCard>

          <SectionCard title="Risk heatmap" description="Likelihood against impact, counted across the register.">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[560px] border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="w-24 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Impact</th>
                    {LEVELS.map((level) => (
                      <th key={level} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {level}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...heatmap].reverse().map((row) => (
                    <tr key={row.impact}>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{row.impact}</th>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.likelihood}
                          className="h-16 rounded-lg border border-border bg-surface/60 text-center align-middle"
                        >
                          <span className="text-lg font-semibold tabular-nums text-foreground">{cell.risks.length}</span>
                          {cell.risks.length > 0 ? (
                            <p className="truncate px-2 text-[11px] text-muted-foreground">
                              {cell.risks.map((risk) => risk.reference).join(", ")}
                            </p>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">Columns: likelihood (low to critical).</p>
            </div>
          </SectionCard>

          <SectionCard
            title="Pending risk acceptances"
            description="High and critical residual risks require formal acceptance before the stage gate can clear."
          >
            <div className="space-y-3 p-4">
              {workspace.posture.pendingAcceptances.length === 0 ? (
                <EmptyState title="No acceptances outstanding" message="All elevated residual risks are formally accepted or closed." />
              ) : (
                workspace.posture.pendingAcceptances.map((risk) => (
                  <div key={risk.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface/60 p-4">
                    <div className="max-w-3xl space-y-1">
                      <p className="font-medium text-foreground">
                        {risk.reference} — {risk.statement}
                      </p>
                      <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
                      <RiskBadge level={risk.residualRisk} />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAcceptTarget(risk);
                        setAcceptJustification("");
                      }}
                    >
                      Accept risk
                    </Button>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="gates" className="mt-4 space-y-4">
          <SectionCard
            title={`Trust gate — ${stage}`}
            description="Blockers derived from critical controls, evidence validity, control deficiencies and unaccepted residual risk."
          >
            <div className="space-y-3 p-4">
              {workspace.gate.blockers.length === 0 ? (
                <EmptyState title="Gate clear" message="No trust layer blockers for the current lifecycle stage." />
              ) : (
                workspace.gate.blockers.map((blocker) => {
                  const waiver = waiverList.find((entry) => entry.blockerId === blocker.id);
                  return (
                    <div key={blocker.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface/60 p-4">
                      <div className="max-w-3xl space-y-1.5">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
                          {blocker.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{blocker.detail}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <RiskBadge level={blocker.severity} />
                          <MetaPill>{blocker.kind.replace(/-/g, " ")}</MetaPill>
                          <MetaPill>
                            {blocker.objectType}: {blocker.objectId}
                          </MetaPill>
                          {waiver ? <MetaPill>Waiver {waiver.state}</MetaPill> : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {waiver?.state === "requested" ? (
                          <>
                            <Button size="sm" onClick={() => decideWaiver.mutate({ id: waiver.id, state: "approved" })}>
                              Approve waiver
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => decideWaiver.mutate({ id: waiver.id, state: "rejected" })}>
                              Reject
                            </Button>
                          </>
                        ) : blocker.waivable && !waiver ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setWaiverTarget(blocker.id);
                              setWaiverJustification("");
                            }}
                          >
                            Request waiver
                          </Button>
                        ) : (
                          <Badge variant="outline">{blocker.waivable ? waiver?.state : "Not waivable"}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="bodies" className="mt-4 space-y-4">
          <SectionCard title="Governance bodies" description="Charters, membership, decision rights and escalation paths.">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {bodyList.map((body) => (
                <button
                  key={body.id}
                  type="button"
                  onClick={() => setSelectedBodyId(body.id)}
                  className="space-y-2 rounded-xl border border-border bg-surface/60 p-4 text-left transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{body.name}</p>
                    <Badge variant="outline">{body.cadence}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{body.charter}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <MetaPill>{body.members.length} members</MetaPill>
                    <MetaPill>{body.decisionRights.length} decision rights</MetaPill>
                    {body.escalatesTo ? <MetaPill>Escalates to {bodyList.find((entry) => entry.id === body.escalatesTo)?.name ?? body.escalatesTo}</MetaPill> : null}
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="raci" className="mt-4 space-y-4">
          <SectionCard title="RACI matrix" description="Responsible, accountable, consulted and informed across stages, artifacts and decisions.">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3">Activity</th>
                    <th className="pb-2 pr-3">Dimension</th>
                    <th className="pb-2 pr-3">Responsible</th>
                    <th className="pb-2 pr-3">Accountable</th>
                    <th className="pb-2 pr-3">Consulted</th>
                    <th className="pb-2">Informed</th>
                  </tr>
                </thead>
                <tbody>
                  {(raci.data ?? []).map((entry) => {
                    const byLetter = (letter: string) =>
                      entry.assignments
                        .filter((assignment) => assignment.letter === letter)
                        .map((assignment) => assignment.namedIndividual ?? roleName(assignment.role))
                        .join(", ") || "—";
                    return (
                      <tr key={entry.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-foreground">{entry.activity}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{entry.dimension.replace(/-/g, " ")}</td>
                        <td className="py-2 pr-3">{byLetter("R")}</td>
                        <td className="py-2 pr-3">{byLetter("A")}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{byLetter("C")}</td>
                        <td className="py-2 text-muted-foreground">{byLetter("I")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="model" className="mt-4 space-y-4">
          <SectionCard title="Governance operating model" description="Six phases spanning the Discover to Improve lifecycle.">
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {GOVERNANCE_PHASES.map((phase) => (
                <div key={phase.id} className="space-y-2 rounded-xl border border-border bg-surface/60 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {phase.order}
                    </span>
                    <p className="font-medium text-foreground">{phase.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.purpose}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.stages.map((stageId) => (
                      <MetaPill key={stageId}>{stageId}</MetaPill>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {bodyList
                      .filter((body) => body.approvalResponsibilities.some((entry) => entry.phase === phase.id))
                      .map((body) => (
                        <p key={body.id} className="text-xs text-muted-foreground">
                          {body.name}:{" "}
                          {body.approvalResponsibilities
                            .filter((entry) => entry.phase === phase.id)
                            .map((entry) => entry.decision)
                            .join("; ")}
                        </p>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedRiskId)} onOpenChange={(open) => !open && setSelectedRiskId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selectedRisk?.reference} — {selectedRisk?.statement}
            </SheetTitle>
          </SheetHeader>
          {selectedRisk ? (
            <div className="mt-5 space-y-5">
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Category" value={RISK_CATEGORIES.find((c) => c.id === selectedRisk.category)?.name} />
                <KeyValue label="Owner" value={roleName(selectedRisk.owner)} />
                <KeyValue label="Likelihood" value={selectedRisk.likelihood} />
                <KeyValue label="Impact" value={selectedRisk.impact} />
                <KeyValue label="Inherent" value={<RiskBadge level={selectedRisk.inherentRisk} />} />
                <KeyValue label="Residual" value={<RiskBadge level={selectedRisk.residualRisk} />} />
              </dl>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cause</p>
                <p className="text-sm text-muted-foreground">{selectedRisk.cause}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Impact</p>
                <p className="text-sm text-muted-foreground">{selectedRisk.impactDescription}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mitigation</p>
                <p className="text-sm text-muted-foreground">{selectedRisk.mitigation}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Linked controls</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRisk.controlIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No controls linked.</p>
                  ) : (
                    selectedRisk.controlIds.map((controlId) => (
                      <MetaPill key={controlId}>
                        {controlId} — {controlById(controlId)?.title ?? "unknown"}
                      </MetaPill>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Residual trend</p>
                <div className="flex items-end gap-2">
                  {selectedRisk.trend.map((point) => (
                    <div key={point.period} className="flex flex-col items-center gap-1">
                      <div className="w-8 rounded-t bg-primary/70" style={{ height: `${Math.max(6, point.residualScore)}px` }} />
                      <span className="text-[11px] text-muted-foreground">{point.period}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRisk.acceptance ? (
                <div className="rounded-lg border border-border bg-surface/60 p-3 text-sm">
                  <p className="text-foreground">Accepted by {selectedRisk.acceptance.acceptedBy} ({roleName(selectedRisk.acceptance.acceptedRole)})</p>
                  <p className="text-muted-foreground">{selectedRisk.acceptance.justification}</p>
                  <p className="text-xs text-muted-foreground">Review on {selectedRisk.acceptance.reviewOn.slice(0, 10)}</p>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setAcceptTarget(selectedRisk);
                    setAcceptJustification("");
                  }}
                >
                  Accept risk
                </Button>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedBodyId)} onOpenChange={(open) => !open && setSelectedBodyId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedBody?.name}</SheetTitle>
          </SheetHeader>
          {selectedBody ? (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-muted-foreground">{selectedBody.charter}</p>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Members</p>
                {selectedBody.members.map((member) => (
                  <div key={member.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground">
                      {member.name} — {member.title}
                    </span>
                    <Badge variant="outline">{member.voting ? "Voting" : "Advisory"}</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Decision rights</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {selectedBody.decisionRights.map((right) => (
                    <li key={right}>{right}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Required artifacts</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {selectedBody.requiredArtifacts.map((artifact) => (
                    <li key={artifact}>{artifact}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Scope</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBody.scope.map((item) => (
                    <MetaPill key={item}>{item}</MetaPill>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(acceptTarget)} onOpenChange={(open) => !open && setAcceptTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept residual risk — {acceptTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{acceptTarget?.statement}</p>
            <div className="space-y-1.5">
              <Label htmlFor="acceptance-justification">Justification</Label>
              <Textarea
                id="acceptance-justification"
                value={acceptJustification}
                onChange={(event) => setAcceptJustification(event.target.value)}
                placeholder="Business rationale, compensating controls and review commitment."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAcceptTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!acceptJustification || acceptRisk.isPending}
              onClick={() => {
                if (!acceptTarget) return;
                acceptRisk.mutate(
                  {
                    risk: acceptTarget,
                    justification: acceptJustification,
                    reviewOn: new Date(Date.now() + 90 * 86_400_000).toISOString(),
                  },
                  {
                    onSuccess: () => {
                      setAcceptTarget(null);
                      toast({ title: "Risk accepted", description: "Acceptance recorded in the audit trail." });
                    },
                  },
                );
              }}
            >
              Record acceptance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(waiverTarget)} onOpenChange={(open) => !open && setWaiverTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request stage-gate waiver</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="waiver-justification">Justification</Label>
            <Textarea
              id="waiver-justification"
              value={waiverJustification}
              onChange={(event) => setWaiverJustification(event.target.value)}
              placeholder="Why the gate should proceed, with compensating controls and expiry."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWaiverTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!waiverJustification || requestWaiver.isPending}
              onClick={() => {
                if (!waiverTarget) return;
                requestWaiver.mutate(
                  {
                    initiativeId,
                    stage,
                    blockerId: waiverTarget,
                    justification: waiverJustification,
                    expiresOn: new Date(Date.now() + 60 * 86_400_000).toISOString(),
                  },
                  {
                    onSuccess: () => {
                      setWaiverTarget(null);
                      toast({ title: "Waiver requested", description: "Routed for governance decision." });
                    },
                  },
                );
              }}
            >
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRiskDialog} onOpenChange={setShowRiskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value as RiskCategoryId })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={draft.owner} onValueChange={(value) => setDraft({ ...draft, owner: value as RoleId })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleName(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk-statement">Risk statement</Label>
              <Input id="risk-statement" value={draft.statement} onChange={(event) => setDraft({ ...draft, statement: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk-cause">Cause</Label>
              <Textarea id="risk-cause" value={draft.cause} onChange={(event) => setDraft({ ...draft, cause: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk-impact">Impact description</Label>
              <Textarea
                id="risk-impact"
                value={draft.impactDescription}
                onChange={(event) => setDraft({ ...draft, impactDescription: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk-mitigation">Mitigation</Label>
              <Textarea
                id="risk-mitigation"
                value={draft.mitigation}
                onChange={(event) => setDraft({ ...draft, mitigation: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Likelihood</Label>
                <Select value={draft.likelihood} onValueChange={(value) => setDraft({ ...draft, likelihood: value as RiskLevel })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Impact</Label>
                <Select value={draft.impact} onValueChange={(value) => setDraft({ ...draft, impact: value as RiskLevel })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="risk-due">Due date</Label>
                <Input id="risk-due" type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRiskDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!draft.statement || createRisk.isPending}
              onClick={() =>
                createRisk.mutate(
                  {
                    initiativeId,
                    category: draft.category,
                    statement: draft.statement,
                    cause: draft.cause,
                    impactDescription: draft.impactDescription,
                    likelihood: draft.likelihood,
                    impact: draft.impact,
                    inherentRisk: draft.impact,
                    controlIds: [],
                    mitigation: draft.mitigation,
                    owner: draft.owner,
                    dueDate: new Date(draft.dueDate).toISOString(),
                    residualRisk: draft.likelihood,
                    status: "open",
                    escalated: false,
                    trend: [],
                  },
                  {
                    onSuccess: () => {
                      setShowRiskDialog(false);
                      setDraft({ ...draft, statement: "", cause: "", impactDescription: "", mitigation: "" });
                      toast({ title: "Risk raised", description: "Added to the register and audit trail." });
                    },
                  },
                )
              }
            >
              Raise risk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GovernanceRiskPage;
