import { useNavigate, useSearchParams } from "react-router-dom";
import { CaseService, ClientService, PipelineService } from "@/services";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard, PageHeader, Pill, SectionCard, StatusPill, statusTone } from "@/components/common/Primitives";
import { currency, shortDate } from "@/lib/format";
import type { Client, ServiceCase } from "@/types";

const VIEWS = {
  directory: { eyebrow: "Relationships", title: "Clients", description: "Unified client profiles across group structure, exposure, coverage and pipeline." },
  relationships: { eyebrow: "Relationship intelligence", title: "Relationships", description: "Coverage strength, engagement recency and sentiment across the client portfolio." },
  service: { eyebrow: "Client operations", title: "Service & Cases", description: "Live case queue with SLA position, sentiment and AI-suggested next actions." },
} as const;

type ViewKey = keyof typeof VIEWS;

export default function ClientsPage() {
  const [params] = useSearchParams();
  const raw = params.get("view") ?? "directory";
  const view: ViewKey = raw in VIEWS ? (raw as ViewKey) : "directory";
  const meta = VIEWS[view];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description={meta.description} />
      {view === "directory" && <DirectoryView />}
      {view === "relationships" && <RelationshipsView />}
      {view === "service" && <ServiceView />}
    </div>
  );
}

function DirectoryView() {
  const navigate = useNavigate();
  const rows = ClientService.all();

  const columns: Column<Client>[] = [
    { key: "name", header: "Client", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.clientType} · {r.country}</p>
      </div>
    ) },
    { key: "sector", header: "Sector", sortValue: (r) => r.sector, render: (r) => <span className="text-sm">{r.sector}</span> },
    { key: "tier", header: "Tier", render: (r) => <Pill tone="brand">{r.relationshipTier}</Pill> },
    { key: "risk", header: "Risk", render: (r) => <Pill tone={statusTone(r.riskRating)}>{r.riskRating}</Pill> },
    { key: "exposure", header: "Exposure", align: "right", sortValue: (r) => r.totalExposureUsd, render: (r) => <span className="num text-sm">{currency(r.totalExposureUsd, { compact: true })}</span> },
    { key: "pipeline", header: "Pipeline", align: "right", sortValue: (r) => r.pipelineValueUsd, render: (r) => <span className="num text-sm">{currency(r.pipelineValueUsd, { compact: true })}</span> },
    { key: "engagement", header: "Last engagement", sortValue: (r) => r.lastEngagement, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.lastEngagement)}</span> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchKeys={(r) => `${r.name} ${r.country} ${r.sector} ${r.relationshipOwner}`}
      onRowClick={(r) => navigate(`/clients/${r.id}`)}
    />
  );
}

function RelationshipsView() {
  const navigate = useNavigate();
  const clients = ClientService.all();
  const opportunities = PipelineService.opportunities();

  const guarded = clients.filter((c) => c.sentiment === "Guarded").length;
  const strategic = clients.filter((c) => c.relationshipTier === "Strategic").length;
  const coverageGaps = clients.reduce((s, c) => s + ClientService.coverage(c.id).filter((m) => m.gap).length, 0);

  const columns: Column<Client>[] = [
    { key: "name", header: "Client", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.relationshipOwner} · {r.relationshipTier}</p>
      </div>
    ) },
    { key: "sentiment", header: "Sentiment", sortValue: (r) => r.sentiment, render: (r) => (
      <Pill tone={r.sentiment === "Positive" ? "success" : r.sentiment === "Guarded" ? "warning" : "neutral"}>{r.sentiment}</Pill>
    ) },
    { key: "coverage", header: "Coverage team", align: "right", sortValue: (r) => ClientService.coverage(r.id).length, render: (r) => {
      const team = ClientService.coverage(r.id);
      const gaps = team.filter((m) => m.gap).length;
      return <span className="num text-sm">{team.length}{gaps ? <span className="text-destructive"> · {gaps} gap</span> : null}</span>;
    } },
    { key: "interactions", header: "Interactions (all time)", align: "right", sortValue: (r) => ClientService.interactions(r.id).length, render: (r) => <span className="num text-sm">{ClientService.interactions(r.id).length}</span> },
    { key: "commitments", header: "Open commitments", align: "right", sortValue: (r) => ClientService.commitments(r.id).filter((c) => c.status !== "Met").length, render: (r) => {
      const open = ClientService.commitments(r.id).filter((c) => c.status !== "Met").length;
      return <span className="num text-sm">{open}</span>;
    } },
    { key: "pipeline", header: "Pipeline", align: "right", sortValue: (r) => r.pipelineValueUsd, render: (r) => <span className="num text-sm">{currency(r.pipelineValueUsd, { compact: true })}</span> },
    { key: "last", header: "Last engagement", sortValue: (r) => r.lastEngagement, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.lastEngagement)}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Clients covered" value={String(clients.length)} hint={`${strategic} strategic tier`} />
        <KpiCard label="Guarded sentiment" value={String(guarded)} tone="warning" delta="Needs senior attention" />
        <KpiCard label="Coverage gaps" value={String(coverageGaps)} tone={coverageGaps ? "danger" : "success"} />
        <KpiCard label="Open opportunities" value={String(opportunities.length)} hint={currency(opportunities.reduce((s, o) => s + o.valueUsd, 0), { compact: true })} />
      </div>

      <SectionCard title="Relationship health" description="Coverage depth, engagement and outstanding commitments" bodyClassName="p-4">
        <DataTable
          rows={clients}
          columns={columns}
          searchKeys={(r) => `${r.name} ${r.relationshipOwner} ${r.sentiment} ${r.relationshipTier}`}
          onRowClick={(r) => navigate(`/clients/${r.id}`)}
          dense
        />
      </SectionCard>
    </>
  );
}

function ServiceView() {
  const navigate = useNavigate();
  const cases = CaseService.all();
  const clients = ClientService.all();

  const open = cases.filter((c) => c.status !== "Resolved");
  const breaching = open.filter((c) => c.slaMinutesRemaining <= 0).length;
  const escalated = cases.filter((c) => c.status === "Escalated").length;

  const columns: Column<ServiceCase>[] = [
    { key: "subject", header: "Case", sortValue: (r) => r.subject, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.subject}</p>
        <p className="num text-xs text-muted-foreground">{r.caseNumber} · {clients.find((c) => c.id === r.clientId)?.shortName ?? r.clientId}</p>
      </div>
    ) },
    { key: "type", header: "Type", sortValue: (r) => r.type, render: (r) => <span className="text-sm">{r.type}</span> },
    { key: "priority", header: "Priority", sortValue: (r) => r.priority, render: (r) => <Pill tone={statusTone(r.priority)}>{r.priority}</Pill> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "sla", header: "SLA remaining", align: "right", sortValue: (r) => r.slaMinutesRemaining, render: (r) => (
      <span className={`num text-sm ${r.slaMinutesRemaining <= 0 ? "text-destructive font-medium" : ""}`}>
        {r.slaMinutesRemaining <= 0 ? "Breached" : `${Math.round(r.slaMinutesRemaining / 60)}h`}
      </span>
    ) },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm text-muted-foreground">{r.owner}</span> },
    { key: "ai", header: "AI recommendation", render: (r) => <span className="text-xs text-muted-foreground">{r.aiRecommendation}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open cases" value={String(open.length)} hint={`${cases.length} total`} />
        <KpiCard label="SLA breached" value={String(breaching)} tone={breaching ? "danger" : "success"} delta="Immediate action" />
        <KpiCard label="Escalated" value={String(escalated)} tone="warning" />
        <KpiCard label="Negative sentiment" value={String(cases.filter((c) => c.sentiment === "Negative").length)} tone="warning" />
      </div>

      <SectionCard title="Case queue" description="Prioritised by SLA position and client impact" bodyClassName="p-4">
        <DataTable
          rows={cases}
          columns={columns}
          searchKeys={(r) => `${r.subject} ${r.caseNumber} ${r.type} ${r.status} ${r.owner}`}
          onRowClick={(r) => navigate(`/clients/${r.clientId}`)}
          dense
        />
      </SectionCard>
    </>
  );
}
