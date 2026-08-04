import { Navigate, useSearchParams } from "react-router-dom";
import { ClientService, PlatformService, ProjectService, RiskService } from "@/services";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard, MetricBar, PageHeader, Pill, SectionCard, StatusPill, statusTone } from "@/components/common/Primitives";
import { currency, shortDate } from "@/lib/format";
import type { AIGovernanceUseCase, DataQualityIssue, IntegrationEvent, IntegrationSystem, MigrationObject } from "@/types";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const VIEWS = {
  portfolio: { eyebrow: "Portfolio intelligence", title: "Portfolio", description: "Committed exposure, pipeline conversion and portfolio health across the investment book." },
  exposure: { eyebrow: "Risk analytics", title: "Exposure & Covenants", description: "Committed and outstanding exposure by entity, with covenant test results and breach watchlist." },
  governance: { eyebrow: "Trust and control", title: "Governance", description: "AI use-case oversight, grounding rates and compliance posture across the platform." },
  integration: { eyebrow: "Platform operations", title: "Integration Health", description: "System status, event throughput and failed message triage across the integration fabric." },
  migration: { eyebrow: "Programme delivery", title: "Migration Readiness", description: "Object-level migration progress, data quality and reconciliation variance." },
} as const;

type ViewKey = keyof typeof VIEWS;

export default function AnalyticsPage() {
  const [params] = useSearchParams();
  const raw = params.get("view") ?? "portfolio";
  const view: ViewKey = raw in VIEWS ? (raw as ViewKey) : "portfolio";
  const meta = VIEWS[view];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description={meta.description} />
      {view === "portfolio" && <PortfolioView />}
      {view === "exposure" && <Navigate to="/exposure" replace />}
      {view === "governance" && <GovernanceView />}
      {view === "integration" && <IntegrationView />}
      {view === "migration" && <MigrationView />}
    </div>
  );
}

function PortfolioView() {
  const clients = ClientService.all();
  const projects = ProjectService.all();
  const signals = RiskService.signals();

  const bySector = Object.entries(
    projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.sector] = (acc[p.sector] ?? 0) + p.proposedCommitmentUsd;
      return acc;
    }, {}),
  ).map(([sector, value]) => ({ sector, value: Math.round(value / 1_000_000) }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Committed exposure" value={currency(clients.reduce((s, c) => s + c.totalExposureUsd, 0), { compact: true })} />
        <KpiCard label="Projects" value={String(projects.length)} />
        <KpiCard label="At risk or critical" value={String(projects.filter((p) => p.health === "At Risk" || p.health === "Critical").length)} tone="danger" delta="Requires attention" />
        <KpiCard label="Early-warning signals" value={String(signals.length)} tone="warning" />
      </div>

      <SectionCard title="Proposed commitment by sector" description="US$ millions">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySector}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="sector" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </>
  );
}


function GovernanceView() {
  const useCases = PlatformService.aiUseCases();
  const audit = PlatformService.audit();
  const compliance = RiskService.compliance();

  const avgGrounded = Math.round(useCases.reduce((s, u) => s + u.groundedRate, 0) / Math.max(1, useCases.length));
  const avgOverride = Math.round(useCases.reduce((s, u) => s + u.overrideRate, 0) / Math.max(1, useCases.length));
  const restricted = useCases.reduce((s, u) => s + u.restrictedAttempts, 0);
  const exceptions = compliance.filter((c) => c.status !== "Compliant").length;

  const cols: Column<AIGovernanceUseCase>[] = [
    { key: "name", header: "AI use case", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="num text-xs text-muted-foreground">{r.model} · {r.promptVersion}</p>
      </div>
    ) },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "grounded", header: "Grounded", align: "right", sortValue: (r) => r.groundedRate, render: (r) => <span className="num text-sm">{r.groundedRate}%</span> },
    { key: "override", header: "Override rate", align: "right", sortValue: (r) => r.overrideRate, render: (r) => <span className="num text-sm">{r.overrideRate}%</span> },
    { key: "lowconf", header: "Low confidence", align: "right", sortValue: (r) => r.lowConfidenceRate, render: (r) => <span className="num text-sm">{r.lowConfidenceRate}%</span> },
    { key: "bias", header: "Bias review", render: (r) => <StatusPill status={r.biasReview} /> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="AI use cases live" value={String(useCases.filter((u) => u.status === "Live").length)} hint={`${useCases.length} registered`} />
        <KpiCard label="Average grounding rate" value={`${avgGrounded}%`} tone="success" delta="Cited sources" />
        <KpiCard label="Average override rate" value={`${avgOverride}%`} tone="warning" delta="Human-in-the-loop" />
        <KpiCard label="Compliance exceptions" value={String(exceptions)} tone={exceptions ? "danger" : "success"} hint={`${restricted} restricted prompts blocked`} />
      </div>

      <SectionCard title="AI use-case register" description="Model, prompt version and oversight metrics" bodyClassName="p-4">
        <DataTable rows={useCases} columns={cols} searchKeys={(r) => `${r.name} ${r.model} ${r.status}`} dense />
      </SectionCard>

      <SectionCard title="Recent audit trail" description="Who changed what, and where it came from">
        <ul className="space-y-3">
          {audit.slice(0, 10).map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{e.action} · {e.object}</p>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{e.actor}</p>
                <p className="num">{e.system} · {shortDate(e.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}

function IntegrationView() {
  const systems = PlatformService.systems();
  const events = PlatformService.events();

  const failed = systems.reduce((s, x) => s + x.failedEvents, 0);
  const retries = systems.reduce((s, x) => s + x.retryQueue, 0);
  const avgLatency = Math.round(systems.reduce((s, x) => s + x.latencyMs, 0) / Math.max(1, systems.length));

  const sysCols: Column<IntegrationSystem>[] = [
    { key: "name", header: "System", sortValue: (r) => r.name, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.layer} · {r.kind}</p>
      </div>
    ) },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "messages", header: "Messages", align: "right", sortValue: (r) => r.messagesProcessed, render: (r) => <span className="num text-sm">{r.messagesProcessed.toLocaleString()}</span> },
    { key: "failed", header: "Failed", align: "right", sortValue: (r) => r.failedEvents, render: (r) => <span className="num text-sm">{r.failedEvents}</span> },
    { key: "latency", header: "Latency", align: "right", sortValue: (r) => r.latencyMs, render: (r) => <span className="num text-sm">{r.latencyMs} ms</span> },
    { key: "sync", header: "Last sync", sortValue: (r) => r.lastSync, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.lastSync)}</span> },
  ];

  const evtCols: Column<IntegrationEvent>[] = [
    { key: "event", header: "Event", sortValue: (r) => r.eventId, render: (r) => (
      <div>
        <p className="num text-sm font-medium text-foreground">{r.eventId}</p>
        <p className="text-xs text-muted-foreground">{r.source} → {r.target} · {r.object}</p>
      </div>
    ) },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "attempts", header: "Attempts", align: "right", sortValue: (r) => r.attempts, render: (r) => <span className="num text-sm">{r.attempts}</span> },
    { key: "error", header: "Error", render: (r) => <span className="text-xs text-muted-foreground">{r.error ?? "—"}</span> },
    { key: "ts", header: "Timestamp", sortValue: (r) => r.timestamp, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.timestamp)}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Systems monitored" value={String(systems.length)} hint={`${systems.filter((s) => s.status === "Healthy").length} healthy`} />
        <KpiCard label="Degraded or failed" value={String(systems.filter((s) => s.status !== "Healthy").length)} tone="danger" delta="Needs triage" />
        <KpiCard label="Failed events" value={String(failed)} tone="warning" hint={`${retries} queued for retry`} />
        <KpiCard label="Average latency" value={`${avgLatency} ms`} tone="info" />
      </div>

      <SectionCard title="System status" description="Integration fabric and connected enterprise systems" bodyClassName="p-4">
        <DataTable rows={systems} columns={sysCols} searchKeys={(r) => `${r.name} ${r.layer} ${r.kind} ${r.status}`} dense />
      </SectionCard>

      <SectionCard title="Event stream" description="Recent inter-system messages and exceptions" bodyClassName="p-4">
        <DataTable rows={events} columns={evtCols} searchKeys={(r) => `${r.eventId} ${r.source} ${r.target} ${r.object} ${r.status}`} dense />
      </SectionCard>
    </>
  );
}

function MigrationView() {
  const objects = PlatformService.migration();
  const issues = PlatformService.dataQuality();

  const assessed = objects.reduce((s, o) => s + o.recordsAssessed, 0);
  const migrated = objects.reduce((s, o) => s + o.recordsMigrated, 0);
  const defects = objects.reduce((s, o) => s + o.openDefects, 0);
  const avgQuality = Math.round(objects.reduce((s, o) => s + o.qualityScore, 0) / Math.max(1, objects.length));

  const objCols: Column<MigrationObject>[] = [
    { key: "object", header: "Object", sortValue: (r) => r.object, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.object}</p>
        <p className="text-xs text-muted-foreground">{r.sourceSystem}</p>
      </div>
    ) },
    { key: "stage", header: "Stage", sortValue: (r) => r.stage, render: (r) => <Pill tone="brand">{r.stage}</Pill> },
    { key: "progress", header: "Migrated", className: "w-48", render: (r) => (
      <MetricBar value={Math.round((r.recordsMigrated / Math.max(1, r.recordsAssessed)) * 100)} label={`${r.recordsMigrated.toLocaleString()} / ${r.recordsAssessed.toLocaleString()}`} />
    ) },
    { key: "quality", header: "Quality", align: "right", sortValue: (r) => r.qualityScore, render: (r) => <span className="num text-sm">{r.qualityScore}%</span> },
    { key: "variance", header: "Reconciliation var.", align: "right", sortValue: (r) => r.reconciliationVariance, render: (r) => <span className="num text-sm">{r.reconciliationVariance}%</span> },
    { key: "defects", header: "Open defects", align: "right", sortValue: (r) => r.openDefects, render: (r) => <span className="num text-sm">{r.openDefects}</span> },
  ];

  const issueCols: Column<DataQualityIssue>[] = [
    { key: "issue", header: "Issue", sortValue: (r) => r.issue, render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.issue}</p>
        <p className="text-xs text-muted-foreground">{r.object} · {r.field}</p>
      </div>
    ) },
    { key: "severity", header: "Severity", sortValue: (r) => r.severity, render: (r) => <Pill tone={statusTone(r.severity)}>{r.severity}</Pill> },
    { key: "records", header: "Records", align: "right", sortValue: (r) => r.records, render: (r) => <span className="num text-sm">{r.records.toLocaleString()}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "rec", header: "Recommendation", render: (r) => <span className="text-xs text-muted-foreground">{r.recommendation}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Records assessed" value={assessed.toLocaleString()} hint={`${objects.length} objects in scope`} />
        <KpiCard label="Records migrated" value={migrated.toLocaleString()} tone="success" delta={`${Math.round((migrated / Math.max(1, assessed)) * 100)}% complete`} />
        <KpiCard label="Average quality score" value={`${avgQuality}%`} tone="info" />
        <KpiCard label="Open defects" value={String(defects)} tone={defects ? "warning" : "success"} hint={`${issues.filter((i) => i.status !== "Resolved").length} data quality issues`} />
      </div>

      <SectionCard title="Migration objects" description="Stage, throughput and reconciliation variance" bodyClassName="p-4">
        <DataTable rows={objects} columns={objCols} searchKeys={(r) => `${r.object} ${r.sourceSystem} ${r.stage}`} dense />
      </SectionCard>

      <SectionCard title="Data quality issues" description="Detected during profiling and cleanse" bodyClassName="p-4">
        <DataTable rows={issues} columns={issueCols} searchKeys={(r) => `${r.object} ${r.field} ${r.issue} ${r.severity} ${r.status}`} dense />
      </SectionCard>
    </>
  );
}
