import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CalendarClock, Check, Flag, ShieldAlert } from "lucide-react";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { LifecycleStepper } from "@/components/enterprise/LifecycleStepper";
import { DataTable } from "@/components/enterprise/DataTable";
import { LoadingState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAxion } from "@/context/AxionContext";
import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import { stageDefinition } from "@/data/lifecycleDefinitions";
import { canApproveStage, canWaive, evaluateStageGate, isOverdue, nextStage } from "@/services/lifecycleGate";
import { roleLabelFor } from "@/services/workspace";
import {
  useActiveInitiativeId,
  useAddStageComment,
  useDecideStageAdvance,
  useDecideWaiver,
  useRequestStageAdvance,
  useRequestWaiver,
  useStageAdvancements,
  useStageComments,
  useStageEvents,
  useStageItems,
  useStageWaivers,
  useUpdateStageItem,
} from "@/hooks/usePhase2";
import { useInitiative, useMilestones, useSetInitiativeStage } from "@/hooks/useWorkspace";
import type { LifecycleStageId } from "@/domain/types";
import type { StageItem, StageItemStatus } from "@/domain/phase2";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: readonly StageItemStatus[] = ["not-started", "in-progress", "complete", "blocked"];

const LifecycleManagerPage = () => {
  const { stageId } = useParams<{ stageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { persona } = useAxion();
  const initiativeId = useActiveInitiativeId();

  const initiative = useInitiative(initiativeId);
  const items = useStageItems(initiativeId);
  const waivers = useStageWaivers(initiativeId);
  const events = useStageEvents(initiativeId);
  const comments = useStageComments(initiativeId);
  const advancements = useStageAdvancements(initiativeId);
  const milestones = useMilestones(initiativeId);

  const updateItem = useUpdateStageItem(initiativeId);
  const addComment = useAddStageComment(initiativeId);
  const requestWaiver = useRequestWaiver(initiativeId);
  const decideWaiver = useDecideWaiver();
  const requestAdvance = useRequestStageAdvance(initiativeId);
  const decideAdvance = useDecideStageAdvance();
  const setStage = useSetInitiativeStage();

  const currentStage = (initiative.data?.currentStage ?? "discover") as LifecycleStageId;
  const stage = (LIFECYCLE_STAGES.find((entry) => entry.id === stageId)?.id ?? currentStage) as LifecycleStageId;
  const definition = stageDefinition(stage);

  const [comment, setComment] = useState("");
  const [waiverItemId, setWaiverItemId] = useState<string>("");
  const [waiverReason, setWaiverReason] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");
  const [mode, setMode] = useState<"sequential" | "parallel">("parallel");

  const allItems = items.data ?? [];
  const allWaivers = waivers.data ?? [];
  const gate = useMemo(() => evaluateStageGate(stage, allItems, allWaivers), [stage, allItems, allWaivers]);
  const stageItems = allItems.filter((item) => item.stage === stage);
  const stageComments = (comments.data ?? []).filter((entry) => entry.stage === stage);
  const stageEvents = (events.data ?? []).filter((entry) => entry.stage === stage);
  const openRequest = (advancements.data ?? []).find(
    (request) => request.fromStage === stage && request.state === "submitted",
  );
  const approvedRequest = (advancements.data ?? []).find(
    (request) => request.fromStage === stage && request.state === "approved",
  );
  const target = nextStage(stage);

  const goTo = (next: LifecycleStageId) => navigate(`/lifecycle-manager/${next}`);

  const submitAdvance = () => {
    if (!target) return;
    if (!gate.canRequestAdvance) {
      toast({
        title: "Stage gate not met",
        description: gate.blockedExplanation ?? "Mandatory exit criteria remain incomplete.",
        variant: "destructive",
      });
      return;
    }
    requestAdvance.mutate(
      { fromStage: stage, toStage: target, approvers: definition.approvers, mode, note: advanceNote || undefined },
      {
        onSuccess: () => {
          setAdvanceNote("");
          toast({ title: "Advancement requested", description: `Routed to ${definition.approvers.length} approver(s).` });
        },
      },
    );
  };

  if (items.isLoading || initiative.isLoading) return <LoadingState label="Loading lifecycle plan" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engagement Lifecycle Manager"
        title={`${definition.stage.charAt(0).toUpperCase()}${definition.stage.slice(1)} stage`}
        description={definition.objective}
        actions={
          <Badge variant="outline" className="border-brand/40 bg-brand/5 text-brand">
            Current stage: {LIFECYCLE_STAGES.find((entry) => entry.id === currentStage)?.name}
          </Badge>
        }
      />

      <LifecycleStepper currentStage={stage} onSelect={goTo} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Stage progress" value={`${gate.progress}%`} hint={`${gate.completeItems}/${gate.totalItems} items complete`} />
        <StatTile label="Mandatory open" value={gate.openMandatory.length} hint="Blocks advancement" />
        <StatTile label="Overdue" value={gate.overdueItems} hint="Past due date" />
        <StatTile label="Blocked" value={gate.blockedItems} hint="Explicitly blocked items" />
      </div>

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Stage plan</TabsTrigger>
          <TabsTrigger value="gate">Gate & approvals</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="discussion">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4 pt-4">
          <SectionCard title="Objective, criteria and deliverables">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry criteria</p>
                <ul className="space-y-1 text-sm text-foreground">
                  {definition.entryCriteria.map((criterion) => (
                    <li key={criterion}>• {criterion}</li>
                  ))}
                </ul>
                <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Required deliverables
                </p>
                <ul className="space-y-1 text-sm text-foreground">
                  {definition.deliverables.map((deliverable) => (
                    <li key={deliverable}>• {deliverable}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exit criteria</p>
                <ul className="space-y-1 text-sm text-foreground">
                  {definition.exitCriteria.map((criterion) => (
                    <li key={criterion.id}>
                      • {criterion.label}{" "}
                      {criterion.mandatory ? (
                        <span className="text-xs font-medium text-brand">(mandatory)</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Required approvers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {definition.approvers.map((role) => (
                    <Badge key={role} variant="outline" className="capitalize">
                      {roleLabelFor(role)}
                    </Badge>
                  ))}
                </div>
                {definition.dependsOn ? (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Depends on the <span className="font-medium">{definition.dependsOn}</span> gate being approved.
                  </p>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Stage tasks, deliverables and exit criteria"
            description="Update status, owners and blockers. Overdue items are highlighted."
          >
            <DataTable<StageItem>
              rows={stageItems}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: "label",
                  header: "Item",
                  render: (row) => (
                    <div className="space-y-0.5">
                      <p className={cn("text-sm font-medium", isOverdue(row) && "text-destructive")}>{row.label}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {row.kind.replace("-", " ")} · {row.mandatory ? "mandatory" : "optional"}
                        {row.blockerReason ? ` · blocked: ${row.blockerReason}` : ""}
                      </p>
                    </div>
                  ),
                },
                { key: "owner", header: "Owner", render: (row) => <span className="text-xs capitalize">{roleLabelFor(row.owner)}</span> },
                {
                  key: "due",
                  header: "Due",
                  render: (row) => (
                    <span className={cn("text-xs", isOverdue(row) && "font-semibold text-destructive")}>
                      {new Date(row.dueDate).toLocaleDateString()}
                      {isOverdue(row) ? " · overdue" : ""}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <Select
                      value={row.status}
                      onValueChange={(value) =>
                        updateItem.mutate({ item: row, patch: { status: value as StageItemStatus } })
                      }
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option} className="text-xs capitalize">
                            {option.replace("-", " ")}
                          </SelectItem>
                        ))}
                        {row.status === "waived" ? (
                          <SelectItem value="waived" className="text-xs">
                            waived
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  ),
                },
              ]}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="gate" className="space-y-4 pt-4">
          <SectionCard title="Stage gate status">
            <div className="space-y-3">
              <Progress value={gate.progress} className="h-2" />
              {gate.canRequestAdvance ? (
                <p className="flex items-center gap-2 text-sm text-success">
                  <Check className="h-4 w-4" aria-hidden /> All mandatory exit criteria are satisfied.
                  {gate.waivedMandatory.length > 0
                    ? ` ${gate.waivedMandatory.length} item(s) cleared by approved exception.`
                    : ""}
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Advancement is blocked. {gate.blockedExplanation ?? "Mandatory exit criteria remain incomplete."}
                    {target ? "" : " This is the final stage of the lifecycle."}
                  </span>
                </p>
              )}

              {target ? (
                <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      value={advanceNote}
                      onChange={(event) => setAdvanceNote(event.target.value)}
                      placeholder={`Note for approvers on advancing to ${target}`}
                    />
                    <Select value={mode} onValueChange={(value) => setMode(value as "sequential" | "parallel")}>
                      <SelectTrigger className="h-8 w-48 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parallel" className="text-xs">Parallel approval</SelectItem>
                        <SelectItem value="sequential" className="text-xs">Sequential approval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={submitAdvance} disabled={Boolean(openRequest) || requestAdvance.isPending}>
                    <Flag className="mr-1.5 h-4 w-4" aria-hidden />
                    Request advance to {target}
                  </Button>
                </div>
              ) : null}
            </div>
          </SectionCard>

          {openRequest ? (
            <SectionCard
              title={`Advancement request: ${openRequest.fromStage} → ${openRequest.toStage}`}
              description={`${openRequest.mode} approval requested by ${openRequest.requestedBy}`}
            >
              <div className="space-y-2">
                {openRequest.approvals.map((vote) => (
                  <div key={vote.role} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <div className="text-sm">
                      <span className="font-medium capitalize">{roleLabelFor(vote.role)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {vote.required ? "required" : "optional"} · {vote.state}
                        {vote.comment ? ` · "${vote.comment}"` : ""}
                      </span>
                    </div>
                    {vote.state === "pending" && vote.role === persona && canApproveStage(persona, stage) ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            decideAdvance.mutate({ requestId: openRequest.id, approve: true, comment: "Gate criteria verified." })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            decideAdvance.mutate({
                              requestId: openRequest.id,
                              approve: false,
                              comment: "Rejected — evidence insufficient.",
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {approvedRequest && currentStage !== approvedRequest.toStage ? (
            <SectionCard title="Gate approved" description="Move the initiative into the approved next stage.">
              <Button
                onClick={() =>
                  setStage.mutate(
                    { initiativeId, stage: approvedRequest.toStage },
                    {
                      onSuccess: () => {
                        toast({ title: `Initiative moved to ${approvedRequest.toStage}` });
                        goTo(approvedRequest.toStage);
                      },
                    },
                  )
                }
              >
                Enter {approvedRequest.toStage} stage
              </Button>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Exceptions and waivers"
            description="Mandatory criteria can only be bypassed through an approved exception."
          >
            <div className="space-y-3">
              {gate.openMandatory.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Select value={waiverItemId} onValueChange={setWaiverItemId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select outstanding mandatory item" />
                    </SelectTrigger>
                    <SelectContent>
                      {gate.openMandatory.map((item) => (
                        <SelectItem key={item.id} value={item.id} className="text-xs">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={1}
                    value={waiverReason}
                    onChange={(event) => setWaiverReason(event.target.value)}
                    placeholder="Justification for the exception"
                  />
                  <Button
                    variant="outline"
                    disabled={!waiverItemId || waiverReason.trim().length < 8}
                    onClick={() =>
                      requestWaiver.mutate(
                        { stage, itemId: waiverItemId, justification: waiverReason.trim() },
                        {
                          onSuccess: () => {
                            setWaiverItemId("");
                            setWaiverReason("");
                            toast({ title: "Exception requested" });
                          },
                        },
                      )
                    }
                  >
                    <ShieldAlert className="mr-1.5 h-4 w-4" aria-hidden /> Request exception
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No outstanding mandatory items require an exception.</p>
              )}

              {allWaivers.filter((waiver) => waiver.stage === stage).map((waiver) => {
                const item = allItems.find((entry) => entry.id === waiver.itemId);
                return (
                  <div key={waiver.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <div className="text-sm">
                      <p className="font-medium">{item?.label ?? waiver.itemId}</p>
                      <p className="text-xs text-muted-foreground">
                        {waiver.justification} · requested by {waiver.requestedBy} · {waiver.state}
                      </p>
                    </div>
                    {waiver.state === "requested" && canWaive(persona, stage) ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decideWaiver.mutate({ waiverId: waiver.id, approve: true })}>
                          Approve exception
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => decideWaiver.mutate({ waiverId: waiver.id, approve: false })}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <SectionCard title="Stage history" description="Every gate, waiver and status event recorded for this stage.">
            {stageEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded yet for this stage.</p>
            ) : (
              <ol className="space-y-3">
                {stageEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 border-l-2 border-border pl-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium capitalize text-foreground">{event.type.replace(/-/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()} · {event.actor} ({roleLabelFor(event.role)})
                      </p>
                      {event.note ? <p className="text-xs text-foreground">{event.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="milestones" className="pt-4">
          <SectionCard title="Programme milestones">
            <DataTable
              rows={milestones.data ?? []}
              rowKey={(row) => row.id}
              columns={[
                { key: "name", header: "Milestone", render: (row) => <span className="text-sm">{row.name}</span> },
                {
                  key: "date",
                  header: "Date",
                  render: (row) => (
                    <span className="flex items-center gap-1.5 text-xs">
                      <CalendarClock className="h-3 w-3" aria-hidden />
                      {new Date(row.date).toLocaleDateString()}
                    </span>
                  ),
                },
                { key: "status", header: "Status", render: (row) => <span className="text-xs capitalize">{row.status.replace("-", " ")}</span> },
              ]}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="discussion" className="pt-4">
          <SectionCard title="Stage comments">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a comment for this stage"
                />
                <Button
                  disabled={comment.trim().length < 3}
                  onClick={() =>
                    addComment.mutate(
                      { stage, body: comment.trim() },
                      { onSuccess: () => setComment("") },
                    )
                  }
                >
                  Comment
                </Button>
              </div>
              {stageComments.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm text-foreground">{entry.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.author} ({roleLabelFor(entry.role)}) · {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LifecycleManagerPage;
