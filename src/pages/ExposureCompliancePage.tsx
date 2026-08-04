import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExposureDrilldown, type DrilldownTarget } from "@/components/analytics/ExposureDrilldown";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DefinitionList, KpiCard, MetricBar, PageHeader, Pill, SectionCard, StatusPill, statusTone } from "@/components/common/Primitives";
import { currency, daysUntil, shortDate } from "@/lib/format";
import { ClientService, ProjectService, RiskService } from "@/services";
import type { ComplianceRequirement, Covenant, Exposure, RiskSignal } from "@/types";

const TABS = ["exposure", "covenants", "compliance", "signals"] as const;
type TabKey = (typeof TABS)[number];

export default function ExposureCompliancePage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") ?? "exposure";
  const tab: TabKey = (TABS as readonly string[]).includes(raw) ? (raw as TabKey) : "exposure";
  const [drill, setDrill] = useState<DrilldownTarget | null>(null);

  const exposures = RiskService.exposures();
  const covenants = RiskService.covenants();
  const compliance = RiskService.compliance();
  const signals = RiskService.signals();

  const committed = exposures.reduce((s, e) => s + e.committedUsd, 0);
  const outstanding = exposures.reduce((s, e) => s + e.outstandingUsd, 0);
  const breaches = covenants.filter((c) => c.status === "Breach").length;
  const watch = covenants.filter((c) => c.status === "Watch").length;
  const exceptions = compliance.filter((c) => c.status === "Exception" || c.status === "Overdue").length;

  const setTab = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Risk, exposure and control"
        title="Exposure & Compliance"
        description="Booked and proposed exposure, covenant testing, regulatory framework compliance and AI early-warning signals in one supervised workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Committed exposure"
          value={currency(committed, { compact: true })}
          hint={`${exposures.length} booked entities · click to drill down`}
          onClick={() => setDrill({ kind: "metric", metric: "committed" })}
        />
        <KpiCard
          label="Outstanding"
          value={currency(outstanding, { compact: true })}
          hint={`${Math.round((outstanding / Math.max(1, committed)) * 100)}% drawn`}
          onClick={() => setDrill({ kind: "metric", metric: "outstanding" })}
        />
        <KpiCard
          label="Covenant breaches"
          value={String(breaches)}
          tone={breaches ? "danger" : "success"}
          delta={`${watch} on watch`}
          onClick={() => setDrill({ kind: "metric", metric: "breaches" })}
        />
        <KpiCard
          label="Compliance exceptions"
          value={String(exceptions)}
          tone={exceptions ? "warning" : "success"}
          hint={`${compliance.length} requirements tracked`}
          onClick={() => setTab("compliance")}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="exposure">Exposure</TabsTrigger>
          <TabsTrigger value="covenants">Covenants</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="signals">Early warning</TabsTrigger>
        </TabsList>

        <TabsContent value="exposure" className="space-y-6">
          <ExposureTab exposures={exposures} onDrill={setDrill} />
        </TabsContent>
        <TabsContent value="covenants" className="space-y-6">
          <CovenantTab covenants={covenants} onDrill={setDrill} />
        </TabsContent>
        <TabsContent value="compliance" className="space-y-6">
          <ComplianceTab requirements={compliance} />
        </TabsContent>
        <TabsContent value="signals" className="space-y-6">
          <SignalsTab signals={signals} />
        </TabsContent>
      </Tabs>

      <ExposureDrilldown target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function ExposureTab({ exposures, onDrill }: { exposures: Exposure[]; onDrill: (t: DrilldownTarget) => void }) {
  const byRegion = useMemo(
    () =>
      Object.entries(
        exposures.reduce<Record<string, number>>((acc, e) => {
          acc[e.region] = (acc[e.region] ?? 0) + e.committedUsd;
          return acc;
        }, {}),
      ).map(([region, value]) => ({ region: region.replace(" and ", " & "), value: Math.round(value / 1_000_000) })),
    [exposures],
  );

  const bySector = useMemo(
    () =>
      Object.entries(
        exposures.reduce<Record<string, number>>((acc, e) => {
          acc[e.sector] = (acc[e.sector] ?? 0) + e.committedUsd;
          return acc;
        }, {}),
      )
        .map(([sector, value]) => ({ sector, value: Math.round(value / 1_000_000) }))
        .sort((a, b) => b.value - a.value),
    [exposures],
  );

  const cols: Column<Exposure>[] = [
    {
      key: "entity",
      header: "Entity",
      sortValue: (r) => r.entity,
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.entity}</p>
          <p className="text-xs text-muted-foreground">{r.country} · {r.sector}</p>
        </div>
      ),
    },
    { key: "product", header: "Product", sortValue: (r) => r.product, render: (r) => <span className="text-sm">{r.product}</span> },
    { key: "committed", header: "Committed", align: "right", sortValue: (r) => r.committedUsd, render: (r) => <span className="num text-sm">{currency(r.committedUsd, { compact: true })}</span> },
    { key: "outstanding", header: "Outstanding", align: "right", sortValue: (r) => r.outstandingUsd, render: (r) => <span className="num text-sm">{currency(r.outstandingUsd, { compact: true })}</span> },
    {
      key: "drawn",
      header: "Drawn",
      className: "w-40",
      sortValue: (r) => r.outstandingUsd / Math.max(1, r.committedUsd),
      render: (r) => <MetricBar value={Math.round((r.outstandingUsd / Math.max(1, r.committedUsd)) * 100)} tone="brand" />,
    },
    { key: "proposed", header: "Proposed", align: "right", sortValue: (r) => r.proposedUsd, render: (r) => <span className="num text-sm text-muted-foreground">{r.proposedUsd ? currency(r.proposedUsd, { compact: true }) : "—"}</span> },
    { key: "rating", header: "Rating", sortValue: (r) => r.riskRating, render: (r) => <Pill tone={statusTone(r.riskRating)}>{r.riskRating}</Pill> },
  ];

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Committed exposure by region" description="US$ millions — select a bar to inspect the region">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byRegion}
                onClick={(state) => {
                  const region = (state as { activeLabel?: string })?.activeLabel;
                  if (region) onDrill({ kind: "region", region });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Concentration by sector" description="US$ millions committed">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySector} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="sector" width={110} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {bySector.map((d, i) => (
                    <Cell key={d.sector} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Exposure by entity" description="Select an entity to see underlying transactions and covenants" bodyClassName="p-4">
        <DataTable rows={exposures} columns={cols} searchKeys={(r) => `${r.entity} ${r.country} ${r.sector} ${r.product} ${r.riskRating}`} dense onRowClick={(r) => onDrill({ kind: "entity", exposureId: r.id })} />
      </SectionCard>
    </>
  );
}

function CovenantTab({ covenants, onDrill }: { covenants: Covenant[]; onDrill: (t: DrilldownTarget) => void }) {
  const projects = ProjectService.all();
  const clients = ClientService.all();
  const breaches = covenants.filter((c) => c.status === "Breach");
  const watch = covenants.filter((c) => c.status === "Watch");

  const cols: Column<Covenant>[] = [
    {
      key: "name",
      header: "Covenant",
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{projects.find((p) => p.id === r.projectId)?.name ?? r.projectId}</p>
        </div>
      ),
    },
    { key: "client", header: "Client", sortValue: (r) => r.clientId, render: (r) => <span className="text-sm text-muted-foreground">{clients.find((c) => c.id === r.clientId)?.shortName ?? r.clientId}</span> },
    { key: "threshold", header: "Threshold", render: (r) => <span className="num text-sm">{r.threshold}</span> },
    { key: "current", header: "Current", render: (r) => <span className="num text-sm font-medium">{r.currentValue}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "test", header: "Test date", sortValue: (r) => r.testDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.testDate)}</span> },
    { key: "freq", header: "Frequency", render: (r) => <span className="text-sm text-muted-foreground">{r.frequency}</span> },
  ];

  return (
    <>
      {(breaches.length > 0 || watch.length > 0) && (
        <SectionCard title="Breach and watch list" description="Covenants failing or within tolerance of their threshold">
          <ul className="space-y-3">
            {[...breaches, ...watch].map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusPill status={c.status} />
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {clients.find((x) => x.id === c.clientId)?.name ?? c.clientId} · {projects.find((p) => p.id === c.projectId)?.name ?? c.projectId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold text-foreground">{c.currentValue} <span className="text-xs font-normal text-muted-foreground">vs {c.threshold}</span></p>
                  <button type="button" className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => onDrill({ kind: "covenant", covenantId: c.id })}>
                    Open covenant detail
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Covenant register" description="Select a covenant to see test detail and linked transactions" bodyClassName="p-4">
        <DataTable rows={covenants} columns={cols} searchKeys={(r) => `${r.name} ${r.status} ${r.frequency}`} dense onRowClick={(r) => onDrill({ kind: "covenant", covenantId: r.id })} />
      </SectionCard>
    </>
  );
}

function ComplianceTab({ requirements }: { requirements: ComplianceRequirement[] }) {
  const clients = ClientService.all();
  const [selected, setSelected] = useState<ComplianceRequirement | null>(null);

  const byFramework = useMemo(() => {
    const map = new Map<string, { framework: string; total: number; compliant: number }>();
    requirements.forEach((r) => {
      const row = map.get(r.framework) ?? { framework: r.framework, total: 0, compliant: 0 };
      row.total += 1;
      if (r.status === "Compliant") row.compliant += 1;
      map.set(r.framework, row);
    });
    return [...map.values()];
  }, [requirements]);

  const cols: Column<ComplianceRequirement>[] = [
    {
      key: "name",
      header: "Requirement",
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.framework}</p>
        </div>
      ),
    },
    { key: "client", header: "Client", sortValue: (r) => r.clientId, render: (r) => <span className="text-sm text-muted-foreground">{clients.find((c) => c.id === r.clientId)?.shortName ?? r.clientId}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "last", header: "Last review", sortValue: (r) => r.lastReview, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.lastReview)}</span> },
    {
      key: "next",
      header: "Next review",
      sortValue: (r) => r.nextReview,
      render: (r) => {
        const days = daysUntil(r.nextReview);
        return (
          <div className="text-sm">
            <span className="text-foreground">{shortDate(r.nextReview)}</span>
            <span className={`ml-2 text-xs ${days < 0 ? "text-destructive" : days < 90 ? "text-amber-600" : "text-muted-foreground"}`}>
              {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}
            </span>
          </div>
        );
      },
    },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm text-muted-foreground">{r.owner}</span> },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {byFramework.map((f) => {
          const pct = Math.round((f.compliant / Math.max(1, f.total)) * 100);
          return (
            <SectionCard key={f.framework} title={f.framework} description={`${f.compliant} of ${f.total} requirements compliant`}>
              <MetricBar value={pct} tone={pct === 100 ? "success" : pct >= 80 ? "brand" : "warning"} label={`${pct}% compliant`} />
            </SectionCard>
          );
        })}
      </div>

      <SectionCard title="Compliance register" description="Framework obligations across the client book — select a row for review detail" bodyClassName="p-4">
        <DataTable
          rows={requirements}
          columns={cols}
          searchKeys={(r) => `${r.name} ${r.framework} ${r.status} ${r.owner}`}
          dense
          onRowClick={(r) => setSelected(r)}
        />
      </SectionCard>

      {selected && (
        <SectionCard title={selected.name} description={`${clients.find((c) => c.id === selected.clientId)?.name ?? selected.clientId} · ${selected.framework}`}>
          <DefinitionList
            items={[
              { label: "Status", value: <StatusPill status={selected.status} /> },
              { label: "Owner", value: selected.owner },
              { label: "Last review", value: shortDate(selected.lastReview) },
              { label: "Next review", value: shortDate(selected.nextReview) },
              { label: "Review cadence", value: "Annual, with event-driven refresh on material change" },
              {
                label: "Control note",
                value:
                  selected.status === "Compliant"
                    ? "No open findings. Evidence held in the document repository and linked to the client record."
                    : "Open finding — remediation owner notified and escalation clock running against the next review date.",
              },
            ]}
          />
          <button type="button" className="mt-4 text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setSelected(null)}>
            Close detail
          </button>
        </SectionCard>
      )}
    </>
  );
}

function SignalsTab({ signals }: { signals: RiskSignal[] }) {
  const clients = ClientService.all();
  const ordered = useMemo(() => {
    const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
    return [...signals].sort((a, b) => rank[a.severity] - rank[b.severity] || b.confidence - a.confidence);
  }, [signals]);

  const cols: Column<RiskSignal>[] = [
    {
      key: "title",
      header: "Signal",
      sortValue: (r) => r.title,
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.category} · {clients.find((c) => c.id === r.clientId)?.shortName ?? r.clientId}</p>
        </div>
      ),
    },
    { key: "severity", header: "Severity", sortValue: (r) => r.severity, render: (r) => <StatusPill status={r.severity} /> },
    { key: "confidence", header: "Confidence", align: "right", sortValue: (r) => r.confidence, render: (r) => <span className="num text-sm">{r.confidence}%</span> },
    { key: "action", header: "Recommended action", render: (r) => <span className="text-xs text-muted-foreground">{r.recommendedAction}</span> },
    { key: "owner", header: "Owner", sortValue: (r) => r.owner, render: (r) => <span className="text-sm text-muted-foreground">{r.owner}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
    { key: "detected", header: "Detected", sortValue: (r) => r.detectedAt, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.detectedAt)}</span> },
  ];

  return (
    <SectionCard title="AI early-warning signals" description="Ranked by severity and model confidence, each grounded in a cited source" bodyClassName="p-4">
      <DataTable rows={ordered} columns={cols} searchKeys={(r) => `${r.title} ${r.category} ${r.severity} ${r.owner} ${r.status}`} dense />
    </SectionCard>
  );
}
