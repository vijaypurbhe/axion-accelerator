import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/common/DataTable";
import {
  ConfidenceTag,
  DefinitionList,
  EmptyState,
  KpiCard,
  MetricBar,
  PageHeader,
  Pill,
  SectionCard,
  StatusPill,
  statusTone,
} from "@/components/common/Primitives";
import { RecommendationCard } from "@/components/common/RecommendationCard";
import { usePhoenix } from "@/context/PhoenixContext";
import { DocumentService, ProjectService, RecommendationService, RiskService } from "@/services";
import { currency, daysUntil, shortDate } from "@/lib/format";
import { DECISION_LABEL, getReview, type ReviewDecision } from "@/lib/documentReview";
import { PROJECT_STAGES, type Approval, type Condition, type DocumentRecord, type Review, type Task } from "@/types";

const reviewTone = (d: ReviewDecision) =>
  d === "cleared" ? "success" : d === "escalated" ? "danger" : d === "not_started" ? "neutral" : "warning";

function LifecycleTracker({ current }: { current: string }) {
  const idx = PROJECT_STAGES.indexOf(current as (typeof PROJECT_STAGES)[number]);
  return (
    <ol className="flex flex-wrap gap-2">
      {PROJECT_STAGES.map((stage, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "future";
        return (
          <li
            key={stage}
            className={
              state === "done"
                ? "rounded-md border border-success/25 bg-success/12 px-3 py-1.5 text-xs font-medium text-success"
                : state === "current"
                  ? "rounded-md border border-brand/30 bg-brand/12 px-3 py-1.5 text-xs font-semibold text-brand"
                  : "rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground"
            }
          >
            <span className="num mr-1.5 opacity-60">{String(i + 1).padStart(2, "0")}</span>
            {stage}
          </li>
        );
      })}
    </ol>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { askAssistant } = usePhoenix();
  const [tab, setTab] = useState("overview");

  const project = ProjectService.get(projectId);

  const data = useMemo(() => {
    if (!project) return null;
    return {
      reviews: ProjectService.reviews(project.id),
      approvals: ProjectService.approvals(project.id),
      conditions: ProjectService.conditions(project.id),
      tasks: ProjectService.tasks(project.id),
      documents: ProjectService.documents(project.id),
      interactions: ProjectService.interactions(project.id),
      signals: RiskService.signals().filter((s) => s.projectId === project.id),
      covenants: RiskService.covenants().filter((c) => c.projectId === project.id),
      recommendations: RecommendationService.forProject(project.id),
    };
  }, [project]);

  if (!project || !data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Investment lifecycle" title="Project not found" description="The requested project record is not available." />
        <EmptyState title="No project record" description="Return to the pipeline and select an existing project." />
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to projects
        </Button>
      </div>
    );
  }

  const { reviews, approvals, conditions, tasks, documents, interactions, signals, covenants, recommendations } = data;
  const openConditions = conditions.filter((c) => c.status !== "Satisfied");

  const reviewColumns: Column<Review>[] = [
    { key: "ws", header: "Workstream", sortValue: (r) => r.workstream, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.workstream}</p>
        <p className="text-xs text-muted-foreground">{r.reviewer}</p>
      </div>
    ) },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "completion", header: "Completion", sortValue: (r) => r.completion, className: "min-w-[150px]", render: (r) => (
      <MetricBar value={r.completion} tone={r.completion >= 80 ? "success" : r.completion >= 40 ? "warning" : "danger"} />
    ) },
    { key: "findings", header: "Findings", align: "right", sortValue: (r) => r.findingsOpen, render: (r) => (
      <span className="num text-sm">{r.findingsOpen}{r.findingsCritical > 0 && <span className="text-destructive"> ({r.findingsCritical} critical)</span>}</span>
    ) },
    { key: "docs", header: "Documents", align: "right", render: (r) => <span className="num text-sm">{r.receivedDocuments.length}/{r.requiredDocuments.length}</span> },
    { key: "due", header: "Due", sortValue: (r) => r.dueDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.dueDate)}</span> },
  ];

  const conditionColumns: Column<Condition>[] = [
    { key: "name", header: "Condition", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.type}</p>
      </div>
    ) },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm">{r.owner}</span> },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "due", header: "Due", sortValue: (r) => r.dueDate, render: (r) => (
      <div>
        <p className="text-sm text-foreground">{shortDate(r.dueDate)}</p>
        <p className="text-xs text-muted-foreground">{daysUntil(r.dueDate)}d</p>
      </div>
    ) },
    { key: "risk", header: "Overdue risk", sortValue: (r) => r.overdueRisk, className: "min-w-[140px]", render: (r) => (
      <MetricBar value={r.overdueRisk} tone={r.overdueRisk >= 60 ? "danger" : r.overdueRisk >= 30 ? "warning" : "success"} />
    ) },
  ];

  const taskColumns: Column<Task>[] = [
    { key: "title", header: "Task", sortValue: (r) => r.title, render: (r) => <span className="text-sm text-foreground">{r.title}</span> },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm">{r.owner}</span> },
    { key: "priority", header: "Priority", render: (r) => <Pill tone={statusTone(r.priority)}>{r.priority}</Pill> },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "due", header: "Due", sortValue: (r) => r.dueDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.dueDate)}</span> },
    { key: "source", header: "Source", render: (r) => <span className="text-xs text-muted-foreground">{r.source}</span> },
  ];

  const docColumns: Column<DocumentRecord>[] = [
    { key: "name", header: "Document", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.category}{r.workstream ? ` · ${r.workstream}` : ""}</p>
      </div>
    ) },
    { key: "class", header: "Classification", render: (r) => <Pill tone="neutral">{r.classification}</Pill> },
    { key: "pages", header: "Pages", align: "right", sortValue: (r) => r.pages, render: (r) => <span className="num text-sm">{r.pages}</span> },
    { key: "conf", header: "AI confidence", render: (r) => <ConfidenceTag value={r.confidence} size="sm" /> },
    { key: "review", header: "Review", render: (r) => <Pill tone={reviewTone(getReview(r.id).decision)}>{DECISION_LABEL[getReview(r.id).decision]}</Pill> },
    { key: "uploaded", header: "Uploaded", sortValue: (r) => r.uploadedAt, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.uploadedAt)}</span> },
    { key: "action", header: "", align: "right", render: (r) => (
      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/documents/${r.id}`); }}>
        Document review
      </Button>
    ) },
  ];

  const approvalTone = (a: Approval) =>
    a.status.includes("Approved") ? "success" : a.status === "Rejected" || a.status === "Escalated" ? "danger" : a.status === "Not Required" ? "neutral" : "warning";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Project 360 · ${project.code}`}
        title={project.name}
        description={`${project.clientName} · ${project.product} · ${project.sector} · ${project.country}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/projects")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> All projects
            </Button>
            <Button variant="outline" onClick={() => navigate(`/clients/${project.clientId}`)}>
              Client 360
            </Button>
            <Button
              onClick={() =>
                askAssistant({
                  prompt: `Assess approval readiness, delay risk and open conditions for ${project.name} (${project.code}).`,
                  contextLabel: `Project · ${project.code}`,
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" /> Ask Phoenix
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Proposed commitment" value={currency(project.proposedCommitmentUsd, { compact: true })} hint={`of ${currency(project.totalProjectCostUsd, { compact: true })} project cost`} />
        <KpiCard label="Approval readiness" value={`${project.approvalReadiness}%`} delta={project.health} tone={statusTone(project.health)} hint={`${project.daysInStage} days in ${project.stage}`} />
        <KpiCard label="Conditions satisfied" value={`${project.conditionsComplete}/${project.conditionsTotal}`} hint={`${openConditions.length} open items`} />
        <KpiCard
          label="Expected approval"
          value={shortDate(project.expectedApproval)}
          delta={`${project.delayRisk} delay risk`}
          tone={project.delayRisk === "High" ? "danger" : project.delayRisk === "Medium" ? "warning" : "success"}
          hint={project.predictedDelayDays > 0 ? `+${project.predictedDelayDays}d predicted` : "On schedule"}
        />
      </div>

      <SectionCard title="Investment lifecycle" description={`Current stage: ${project.stage} · latest milestone: ${project.latestMilestone}`}>
        <div className="space-y-4">
          <LifecycleTracker current={project.stage} />
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricBar label="Documentation completeness" value={project.documentationCompleteness} tone={project.documentationCompleteness >= 80 ? "success" : "warning"} />
            <MetricBar label="Approval readiness" value={project.approvalReadiness} tone={project.approvalReadiness >= 75 ? "success" : "warning"} />
          </div>
        </div>
      </SectionCard>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diligence">Due diligence</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="outcomes">Development impact</TabsTrigger>
          <TabsTrigger value="team">Team &amp; engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard className="xl:col-span-2" title="Project summary" description="Strategic rationale and structure.">
              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-foreground">{project.summary}</p>
                <div>
                  <p className="label-caps mb-1.5">Strategic rationale</p>
                  <p className="text-sm text-muted-foreground">{project.strategicRationale}</p>
                </div>
                <DefinitionList
                  items={[
                    { label: "Investment officer", value: project.investmentOfficer },
                    { label: "Project lead", value: project.projectLead },
                    { label: "Risk rating", value: <Pill tone={statusTone(project.riskRating)}>{project.riskRating}</Pill> },
                    { label: "Sponsors", value: project.sponsors.join(", ") },
                  ]}
                />
                <div>
                  <p className="label-caps mb-2">Financing structure</p>
                  <ul className="space-y-2">
                    {project.financingStructure.map((f) => (
                      <li key={f.source} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                        <span className="text-sm text-foreground">{f.source}<span className="ml-2 text-xs text-muted-foreground">{f.instrument}</span></span>
                        <span className="num text-sm font-medium">{currency(f.amountUsd, { compact: true })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="Milestones" description="Critical path highlighted.">
                <ol className="space-y-3">
                  {project.milestones.map((m) => (
                    <li key={m.id} className="border-l-2 border-border pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={m.status} />
                        <span className="text-xs text-muted-foreground">{shortDate(m.date)}</span>
                        {m.criticalPath && <Pill tone="warning">Critical path</Pill>}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{m.name}</p>
                    </li>
                  ))}
                </ol>
              </SectionCard>

              <SectionCard title="Phoenix recommendations" description="AI-ranked next best actions.">
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} />
                  ))}
                  {recommendations.length === 0 && <EmptyState title="No open recommendations" />}
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="diligence">
          <SectionCard title="Due diligence workstreams" description="Completion, findings and evidence coverage by workstream.">
            <DataTable rows={reviews} columns={reviewColumns} dense emptyTitle="No workstreams opened yet" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {approvals.map((a) => (
            <SectionCard
              key={a.id}
              title={a.stageName}
              description={`${a.reviewers.join(", ")} · SLA ${a.slaElapsed}/${a.slaDays} days`}
              actions={<Pill tone={approvalTone(a)}>{a.status}</Pill>}
            >
              <div className="space-y-4">
                <MetricBar
                  label="SLA consumed"
                  value={Math.min(100, Math.round((a.slaElapsed / Math.max(1, a.slaDays)) * 100))}
                  tone={a.slaElapsed > a.slaDays ? "danger" : a.slaElapsed / a.slaDays > 0.7 ? "warning" : "success"}
                />
                <DefinitionList
                  items={[
                    { label: "Submitted", value: a.submittedOn ? shortDate(a.submittedOn) : "Not submitted" },
                    { label: "Decided", value: a.decidedOn ? shortDate(a.decidedOn) : "Pending" },
                    { label: "Decision", value: a.decision ?? "—" },
                    { label: "Linked conditions", value: <span className="num">{a.conditionIds.length}</span> },
                  ]}
                />
                {a.comments.length > 0 && (
                  <div>
                    <p className="label-caps mb-2">Reviewer comments</p>
                    <ul className="space-y-2">
                      {a.comments.map((c, i) => (
                        <li key={`${a.id}-c${i}`} className="rounded-md border border-border px-3 py-2">
                          <p className="text-sm text-foreground">{c.text}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{c.author} · {shortDate(c.at)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>
          ))}
          {approvals.length === 0 && <EmptyState title="No approval stages recorded" />}
        </TabsContent>

        <TabsContent value="conditions">
          <SectionCard title="Conditions register" description="Conditions precedent, subsequent and disbursement requirements.">
            <DataTable rows={conditions} columns={conditionColumns} searchKeys={(r) => `${r.name} ${r.owner} ${r.type}`} emptyTitle="No conditions recorded" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <SectionCard title="Early warning signals" description="Detected by Phoenix across portfolio, engagement and reporting data.">
            <div className="space-y-3">
              {signals.map((s) => (
                <article key={s.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={statusTone(s.severity)}>{s.severity}</Pill>
                      <span className="text-xs text-muted-foreground">{s.category} · {shortDate(s.detectedAt)}</span>
                    </div>
                    <ConfidenceTag value={s.confidence} source={s.source} />
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.evidence}</p>
                  <p className="mt-2 text-sm text-foreground"><span className="label-caps mr-2">Recommended</span>{s.recommendedAction}</p>
                </article>
              ))}
              {signals.length === 0 && <EmptyState title="No active risk signals" />}
            </div>
          </SectionCard>

          <SectionCard title="Covenants" description="Financial and operating covenant test results.">
            <ul className="space-y-2">
              {covenants.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Threshold {c.threshold} · current {c.currentValue} · {c.frequency}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Tested {shortDate(c.testDate)}</span>
                    <StatusPill status={c.status} />
                  </div>
                </li>
              ))}
              {covenants.length === 0 && <EmptyState title="No covenants attached" />}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="documents">
          <SectionCard
            title="Project documents"
            description="Deal documentation with AI extraction confidence."
            actions={<Pill tone="neutral"><FileText className="h-3.5 w-3.5" /> {documents.length} files</Pill>}
          >
            <DataTable
              rows={documents}
              columns={docColumns}
              searchKeys={(r) => `${r.name} ${r.category} ${r.workstream ?? ""}`}
              onRowClick={(r) => navigate(`/documents/${r.id}`)}
              emptyTitle="No documents filed"
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="tasks">
          <SectionCard title="Tasks" description="Work items across the project team.">
            <DataTable rows={tasks} columns={taskColumns} searchKeys={(r) => `${r.title} ${r.owner}`} emptyTitle="No open tasks" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="outcomes">
          <SectionCard title="Development impact" description="Targeted versus actual development outcomes.">
            <div className="grid gap-4 md:grid-cols-2">
              {project.developmentOutcomes.map((o) => (
                <div key={o.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{o.name}</p>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{o.metric}</p>
                  <p className="kpi-value mt-2 text-foreground">
                    {o.actual.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {o.target.toLocaleString()} {o.unit}</span>
                  </p>
                  <div className="mt-3">
                    <MetricBar value={Math.min(100, Math.round((o.actual / Math.max(1, o.target)) * 100))} tone={o.status === "Lagging" ? "warning" : "success"} />
                  </div>
                </div>
              ))}
              {project.developmentOutcomes.length === 0 && <EmptyState title="No development outcomes defined" />}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <SectionCard title="Project team" description="Cross-functional team assigned to this investment.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.team.map((m) => (
                <div key={`${m.name}-${m.role}`} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.role} · {m.unit}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Project engagement" description="Interactions linked to this project.">
            <ol className="space-y-4">
              {interactions.map((i) => (
                <li key={i.id} className="border-l-2 border-border pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="brand">{i.type}</Pill>
                    <span className="text-xs text-muted-foreground">{shortDate(i.at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{i.subject}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{i.summary}</p>
                </li>
              ))}
              {interactions.length === 0 && <EmptyState title="No interactions logged for this project" />}
            </ol>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
