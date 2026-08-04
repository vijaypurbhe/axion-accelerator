import { useNavigate, useSearchParams } from "react-router-dom";
import { DiligenceService, DocumentService, PipelineService, ProjectService } from "@/services";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { KpiCard, MetricBar, PageHeader, Pill, SectionCard, StatusPill, statusTone } from "@/components/common/Primitives";
import { currency, shortDate } from "@/lib/format";
import { DECISION_LABEL, getReview, type ReviewDecision } from "@/lib/documentReview";
import type { Approval, Condition, DocumentRecord, InvestmentProject, Opportunity, Review } from "@/types";

const reviewTone = (d: ReviewDecision) =>
  d === "cleared" ? "success" : d === "escalated" ? "danger" : d === "not_started" ? "neutral" : "warning";

const VIEWS = {
  all: { eyebrow: "Investment lifecycle", title: "Projects", description: "Every project from opportunity through supervision, with readiness and delay indicators." },
  pipeline: { eyebrow: "Origination", title: "Pipeline", description: "Opportunities by stage, weighted value and expected mandate dates." },
  diligence: { eyebrow: "Appraisal", title: "Due Diligence", description: "Workstream completion, reviewer assignment and open findings across live appraisals." },
  approvals: { eyebrow: "Decision governance", title: "Approvals", description: "Approval stages in flight with SLA position and the conditions register." },
  documents: { eyebrow: "Document intelligence", title: "Documents", description: "Classified repository with AI summaries, extracted terms and findings." },
} as const;

type ViewKey = keyof typeof VIEWS;

export default function ProjectsPage() {
  const [params] = useSearchParams();
  const raw = params.get("view") ?? "all";
  const view: ViewKey = raw in VIEWS ? (raw as ViewKey) : "all";
  const meta = VIEWS[view];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description={meta.description} />
      {view === "all" && <AllProjectsView />}
      {view === "pipeline" && <PipelineView />}
      {view === "diligence" && <DiligenceView />}
      {view === "approvals" && <ApprovalsView />}
      {view === "documents" && <DocumentsView />}
    </div>
  );
}

function AllProjectsView() {
  const navigate = useNavigate();
  const rows = ProjectService.all();

  const columns: Column<InvestmentProject>[] = [
    { key: "name", header: "Project", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="num text-xs text-muted-foreground">{r.code} · {r.clientName}</p>
      </div>
    ) },
    { key: "stage", header: "Stage", sortValue: (r) => r.stage, render: (r) => <span className="text-sm">{r.stage}</span> },
    { key: "health", header: "Health", render: (r) => <Pill tone={statusTone(r.health)}>{r.health}</Pill> },
    { key: "risk", header: "Risk", render: (r) => <Pill tone={statusTone(r.riskRating)}>{r.riskRating}</Pill> },
    { key: "commitment", header: "Commitment", align: "right", sortValue: (r) => r.proposedCommitmentUsd, render: (r) => <span className="num text-sm">{currency(r.proposedCommitmentUsd, { compact: true })}</span> },
    { key: "readiness", header: "Readiness", align: "right", sortValue: (r) => r.approvalReadiness, render: (r) => <span className="num text-sm">{r.approvalReadiness}%</span> },
    { key: "approval", header: "Expected approval", sortValue: (r) => r.expectedApproval, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.expectedApproval)}</span> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => `${r.name} ${r.code} ${r.clientName} ${r.country} ${r.sector} ${r.stage}`}
      onRowClick={(r) => navigate(`/projects/${r.id}`)}
    />
  );
}

function PipelineView() {
  const opportunities = PipelineService.opportunities();
  const total = opportunities.reduce((s, o) => s + o.valueUsd, 0);
  const weighted = opportunities.reduce((s, o) => s + (o.valueUsd * o.probability) / 100, 0);
  const stale = opportunities.filter((o) => o.ageDays > 120).length;

  const columns: Column<Opportunity>[] = [
    { key: "name", header: "Opportunity", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.sector} · {r.region}</p>
      </div>
    ) },
    { key: "stage", header: "Stage", sortValue: (r) => r.stage, render: (r) => <Pill tone="brand">{r.stage}</Pill> },
    { key: "value", header: "Value", align: "right", sortValue: (r) => r.valueUsd, render: (r) => <span className="num text-sm">{currency(r.valueUsd, { compact: true })}</span> },
    { key: "prob", header: "Probability", align: "right", sortValue: (r) => r.probability, render: (r) => <span className="num text-sm">{r.probability}%</span> },
    { key: "mandate", header: "Expected mandate", sortValue: (r) => r.expectedMandate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.expectedMandate)}</span> },
    { key: "age", header: "Age", align: "right", sortValue: (r) => r.ageDays, render: (r) => <span className={`num text-sm ${r.ageDays > 120 ? "text-warning-foreground" : ""}`}>{r.ageDays}d</span> },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm text-muted-foreground">{r.owner}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open opportunities" value={String(opportunities.length)} />
        <KpiCard label="Pipeline value" value={currency(total, { compact: true })} />
        <KpiCard label="Weighted value" value={currency(weighted, { compact: true })} tone="info" delta="Probability adjusted" />
        <KpiCard label="Ageing over 120 days" value={String(stale)} tone={stale ? "warning" : "success"} />
      </div>

      <SectionCard title="Opportunity pipeline" description="Sorted by stage and expected mandate" bodyClassName="p-4">
        <DataTable rows={opportunities} columns={columns} searchKeys={(r) => `${r.name} ${r.stage} ${r.owner} ${r.sector} ${r.region}`} dense />
      </SectionCard>
    </>
  );
}

function DiligenceView() {
  const navigate = useNavigate();
  const reviews = DiligenceService.reviews();
  const projects = ProjectService.all();

  const blocked = reviews.filter((r) => r.status === "Blocked").length;
  const critical = reviews.reduce((s, r) => s + r.findingsCritical, 0);
  const openFindings = reviews.reduce((s, r) => s + r.findingsOpen, 0);
  const avg = Math.round(reviews.reduce((s, r) => s + r.completion, 0) / Math.max(1, reviews.length));

  const columns: Column<Review>[] = [
    { key: "workstream", header: "Workstream", sortValue: (r) => r.workstream, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.workstream}</p>
        <p className="text-xs text-muted-foreground">{projects.find((p) => p.id === r.projectId)?.name ?? r.projectId}</p>
      </div>
    ) },
    { key: "reviewer", header: "Reviewer", sortValue: (r) => r.reviewer, render: (r) => <span className="text-sm">{r.reviewer}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "completion", header: "Completion", className: "w-44", sortValue: (r) => r.completion, render: (r) => <MetricBar value={r.completion} tone={r.completion >= 80 ? "success" : r.completion >= 50 ? "brand" : "warning"} /> },
    { key: "findings", header: "Findings", align: "right", sortValue: (r) => r.findingsOpen, render: (r) => (
      <span className="num text-sm">{r.findingsOpen}{r.findingsCritical ? <span className="text-destructive"> · {r.findingsCritical} critical</span> : null}</span>
    ) },
    { key: "docs", header: "Documents", align: "right", sortValue: (r) => r.receivedDocuments.length, render: (r) => <span className="num text-sm">{r.receivedDocuments.length}/{r.requiredDocuments.length}</span> },
    { key: "due", header: "Due", sortValue: (r) => r.dueDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.dueDate)}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active workstreams" value={String(reviews.length)} hint={`${reviews.filter((r) => r.status === "Complete").length} complete`} />
        <KpiCard label="Average completion" value={`${avg}%`} tone="info" />
        <KpiCard label="Blocked reviews" value={String(blocked)} tone={blocked ? "danger" : "success"} />
        <KpiCard label="Open findings" value={String(openFindings)} tone="warning" delta={`${critical} critical`} />
      </div>

      <SectionCard title="Due diligence workstreams" description="Across all projects in appraisal" bodyClassName="p-4">
        <DataTable
          rows={reviews}
          columns={columns}
          searchKeys={(r) => `${r.workstream} ${r.reviewer} ${r.status} ${projects.find((p) => p.id === r.projectId)?.name ?? ""}`}
          onRowClick={(r) => navigate(`/projects/${r.projectId}`)}
          dense
        />
      </SectionCard>
    </>
  );
}

function ApprovalsView() {
  const navigate = useNavigate();
  const approvals = DiligenceService.approvals();
  const conditions = DiligenceService.conditions();
  const projects = ProjectService.all();

  const inFlight = approvals.filter((a) => a.status === "Pending" || a.status === "In Review").length;
  const breaching = approvals.filter((a) => a.slaElapsed > a.slaDays).length;
  const overdueConditions = conditions.filter((c) => c.status === "Overdue" || c.status === "Escalated").length;

  const approvalCols: Column<Approval>[] = [
    { key: "stage", header: "Approval stage", sortValue: (r) => r.stageName, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.stageName}</p>
        <p className="text-xs text-muted-foreground">{projects.find((p) => p.id === r.projectId)?.name ?? r.projectId}</p>
      </div>
    ) },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "reviewers", header: "Reviewers", render: (r) => <span className="text-sm text-muted-foreground">{r.reviewers.join(", ")}</span> },
    { key: "sla", header: "SLA", align: "right", sortValue: (r) => r.slaElapsed - r.slaDays, render: (r) => (
      <span className={`num text-sm ${r.slaElapsed > r.slaDays ? "font-medium text-destructive" : ""}`}>{r.slaElapsed}/{r.slaDays}d</span>
    ) },
    { key: "submitted", header: "Submitted", sortValue: (r) => r.submittedOn ?? "", render: (r) => <span className="text-sm text-muted-foreground">{r.submittedOn ? shortDate(r.submittedOn) : "—"}</span> },
    { key: "conditions", header: "Conditions", align: "right", sortValue: (r) => r.conditionIds.length, render: (r) => <span className="num text-sm">{r.conditionIds.length}</span> },
  ];

  const conditionCols: Column<Condition>[] = [
    { key: "name", header: "Condition", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.type} · {projects.find((p) => p.id === r.projectId)?.name ?? r.projectId}</p>
      </div>
    ) },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm">{r.owner}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "risk", header: "Overdue risk", align: "right", sortValue: (r) => r.overdueRisk, render: (r) => <span className="num text-sm">{r.overdueRisk}%</span> },
    { key: "due", header: "Due", sortValue: (r) => r.dueDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.dueDate)}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Approvals in flight" value={String(inFlight)} hint={`${approvals.length} tracked stages`} />
        <KpiCard label="SLA breached" value={String(breaching)} tone={breaching ? "danger" : "success"} />
        <KpiCard label="Open conditions" value={String(conditions.filter((c) => c.status !== "Satisfied").length)} tone="warning" />
        <KpiCard label="Overdue or escalated" value={String(overdueConditions)} tone={overdueConditions ? "danger" : "success"} />
      </div>

      <SectionCard title="Approval stages" description="Committee and delegated authority decisions in progress" bodyClassName="p-4">
        <DataTable
          rows={approvals}
          columns={approvalCols}
          searchKeys={(r) => `${r.stageName} ${r.status} ${r.reviewers.join(" ")}`}
          onRowClick={(r) => navigate(`/projects/${r.projectId}`)}
          dense
        />
      </SectionCard>

      <SectionCard title="Conditions register" description="Precedent, subsequent and disbursement conditions" bodyClassName="p-4">
        <DataTable
          rows={conditions}
          columns={conditionCols}
          searchKeys={(r) => `${r.name} ${r.type} ${r.owner} ${r.status}`}
          onRowClick={(r) => navigate(`/projects/${r.projectId}`)}
          dense
        />
      </SectionCard>
    </>
  );
}

function DocumentsView() {
  const navigate = useNavigate();
  const documents = DocumentService.all();
  const findings = documents.reduce((s, d) => s + d.findings.length, 0);
  const criticalFindings = documents.reduce((s, d) => s + d.findings.filter((f) => f.severity === "Critical" || f.severity === "High").length, 0);
  const avgConfidence = Math.round(documents.reduce((s, d) => s + d.confidence, 0) / Math.max(1, documents.length));

  const columns: Column<DocumentRecord>[] = [
    { key: "name", header: "Document", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.category} · {r.pages} pages</p>
      </div>
    ) },
    { key: "classification", header: "Classification", sortValue: (r) => r.classification, render: (r) => <Pill tone={r.classification.includes("Confidential") ? "warning" : "neutral"}>{r.classification}</Pill> },
    { key: "workstream", header: "Workstream", sortValue: (r) => r.workstream ?? "", render: (r) => <span className="text-sm text-muted-foreground">{r.workstream ?? "—"}</span> },
    { key: "findings", header: "Findings", align: "right", sortValue: (r) => r.findings.length, render: (r) => <span className="num text-sm">{r.findings.length}</span> },
    { key: "confidence", header: "AI confidence", align: "right", sortValue: (r) => r.confidence, render: (r) => <span className="num text-sm">{r.confidence}%</span> },
    { key: "review", header: "Review", render: (r) => <Pill tone={reviewTone(getReview(r.id).decision)}>{DECISION_LABEL[getReview(r.id).decision]}</Pill> },
    { key: "uploaded", header: "Uploaded", sortValue: (r) => r.uploadedAt, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.uploadedAt)}</span> },
    { key: "action", header: "", align: "right", render: (r) => (
      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/documents/${r.id}`); }}>
        Document review
      </Button>
    ) },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Documents indexed" value={String(documents.length)} />
        <KpiCard label="Extracted findings" value={String(findings)} tone="info" />
        <KpiCard label="Critical or high findings" value={String(criticalFindings)} tone={criticalFindings ? "danger" : "success"} />
        <KpiCard label="Average AI confidence" value={`${avgConfidence}%`} tone="success" />
      </div>

      <SectionCard title="Document repository" description="Classified, summarised and linked to workstreams" bodyClassName="p-4">
        <DataTable
          rows={documents}
          columns={columns}
          searchKeys={(r) => `${r.name} ${r.category} ${r.classification} ${r.aiSummary}`}
          onRowClick={(r) => navigate(`/documents/${r.id}`)}
          dense
        />
      </SectionCard>
    </>
  );
}
