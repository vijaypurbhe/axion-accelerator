import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Pill, StatusPill, statusTone } from "@/components/common/Primitives";
import { currency, shortDate } from "@/lib/format";
import { ClientService, ProjectService, RiskService } from "@/services";
import type { ExposureTransaction } from "@/data/transactions";
import type { Covenant, Exposure } from "@/types";

export type DrilldownTarget =
  | { kind: "entity"; exposureId: string }
  | { kind: "region"; region: string }
  | { kind: "covenant"; covenantId: string }
  | { kind: "metric"; metric: "committed" | "outstanding" | "proposed" | "breaches" };

const METRIC_META = {
  committed: { title: "Committed exposure", description: "All booked entity positions contributing to committed exposure." },
  outstanding: { title: "Outstanding exposure", description: "Drawn balances by entity, with drawn ratio against commitment." },
  proposed: { title: "Proposed additions", description: "Pipeline commitments not yet booked, by entity." },
  breaches: { title: "Covenant breaches and watch items", description: "Covenants currently failing or approaching their test threshold." },
} as const;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="label-caps">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

const txnColumns: Column<ExposureTransaction>[] = [
  {
    key: "reference",
    header: "Reference",
    sortValue: (r) => r.reference,
    render: (r) => (
      <div>
        <p className="num text-sm font-medium text-foreground">{r.reference}</p>
        <p className="text-xs text-muted-foreground">{r.narrative}</p>
      </div>
    ),
  },
  { key: "type", header: "Type", sortValue: (r) => r.type, render: (r) => <Pill tone="info">{r.type}</Pill> },
  { key: "date", header: "Value date", sortValue: (r) => r.valueDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.valueDate)}</span> },
  { key: "amount", header: "Amount", align: "right", sortValue: (r) => r.amountUsd, render: (r) => <span className="num text-sm font-medium">{currency(r.amountUsd, { compact: true })}</span> },
  { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
  { key: "system", header: "Source", render: (r) => <span className="text-xs text-muted-foreground">{r.sourceSystem}</span> },
];

const exposureColumns: Column<Exposure>[] = [
  {
    key: "entity",
    header: "Entity",
    sortValue: (r) => r.entity,
    render: (r) => (
      <div>
        <p className="text-sm font-medium text-foreground">{r.entity}</p>
        <p className="text-xs text-muted-foreground">{r.country} · {r.product}</p>
      </div>
    ),
  },
  { key: "committed", header: "Committed", align: "right", sortValue: (r) => r.committedUsd, render: (r) => <span className="num text-sm">{currency(r.committedUsd, { compact: true })}</span> },
  { key: "outstanding", header: "Outstanding", align: "right", sortValue: (r) => r.outstandingUsd, render: (r) => <span className="num text-sm">{currency(r.outstandingUsd, { compact: true })}</span> },
  { key: "proposed", header: "Proposed", align: "right", sortValue: (r) => r.proposedUsd, render: (r) => <span className="num text-sm text-muted-foreground">{r.proposedUsd ? currency(r.proposedUsd, { compact: true }) : "—"}</span> },
  { key: "rating", header: "Rating", render: (r) => <Pill tone={statusTone(r.riskRating)}>{r.riskRating}</Pill> },
];

function covenantColumns(): Column<Covenant>[] {
  const projects = ProjectService.all();
  return [
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
    { key: "threshold", header: "Threshold", render: (r) => <span className="num text-sm">{r.threshold}</span> },
    { key: "current", header: "Current", render: (r) => <span className="num text-sm font-medium">{r.currentValue}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: "test", header: "Test date", sortValue: (r) => r.testDate, render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.testDate)}</span> },
  ];
}

export function ExposureDrilldown({ target, onClose }: { target: DrilldownTarget | null; onClose: () => void }) {
  const content = useMemo(() => {
    if (!target) return null;
    const exposures = RiskService.exposures();
    const covenants = RiskService.covenants();
    const transactions = RiskService.transactions();
    const covCols = covenantColumns();

    if (target.kind === "entity") {
      const exposure = exposures.find((e) => e.id === target.exposureId);
      if (!exposure) return null;
      const client = ClientService.get(exposure.clientId);
      const rows = transactions.filter((t) => t.exposureId === exposure.id);
      const entityCovenants = covenants.filter((c) => c.clientId === exposure.clientId);
      const settled = rows.filter((r) => r.status === "Settled").reduce((s, r) => s + r.amountUsd, 0);
      return {
        title: exposure.entity,
        description: `${exposure.country} · ${exposure.sector} · ${exposure.product}${client ? ` · ${client.name}` : ""}`,
        body: (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Committed" value={currency(exposure.committedUsd, { compact: true })} />
              <Stat label="Outstanding" value={currency(exposure.outstandingUsd, { compact: true })} />
              <Stat label="Proposed" value={exposure.proposedUsd ? currency(exposure.proposedUsd, { compact: true }) : "—"} />
              <Stat label="Settled cash flow" value={currency(settled, { compact: true })} />
            </div>
            <div>
              <p className="label-caps mb-2">Underlying transactions</p>
              <DataTable rows={rows} columns={txnColumns} searchKeys={(r) => `${r.reference} ${r.type} ${r.status} ${r.sourceSystem}`} dense />
            </div>
            <div>
              <p className="label-caps mb-2">Covenants for this obligor</p>
              <DataTable rows={entityCovenants} columns={covCols} dense emptyTitle="No covenants recorded for this obligor" />
            </div>
            <div>
              <p className="label-caps mb-2">Internal rating history</p>
              <div className="flex flex-wrap gap-2">
                {exposure.ratingHistory.map((h) => (
                  <div key={h.period} className="rounded-md border border-border/70 px-3 py-1.5 text-xs">
                    <span className="text-muted-foreground">{h.period}</span>
                    <span className="num ml-2 font-semibold text-foreground">{h.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ),
      };
    }

    if (target.kind === "region") {
      const rows = exposures.filter((e) => e.region.replace(" and ", " & ") === target.region || e.region === target.region);
      const ids = new Set(rows.map((r) => r.id));
      const clientIds = new Set(rows.map((r) => r.clientId));
      const txns = transactions.filter((t) => ids.has(t.exposureId));
      const regionCovenants = covenants.filter((c) => clientIds.has(c.clientId));
      return {
        title: `${target.region} exposure`,
        description: `${rows.length} booked entities · ${txns.length} transactions in the ledger`,
        body: (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Committed" value={currency(rows.reduce((s, r) => s + r.committedUsd, 0), { compact: true })} />
              <Stat label="Outstanding" value={currency(rows.reduce((s, r) => s + r.outstandingUsd, 0), { compact: true })} />
              <Stat label="Covenant breaches" value={String(regionCovenants.filter((c) => c.status === "Breach").length)} tone="text-destructive" />
            </div>
            <div>
              <p className="label-caps mb-2">Entities in region</p>
              <DataTable rows={rows} columns={exposureColumns} searchKeys={(r) => `${r.entity} ${r.country} ${r.product}`} dense />
            </div>
            <div>
              <p className="label-caps mb-2">Underlying transactions</p>
              <DataTable rows={txns} columns={txnColumns} searchKeys={(r) => `${r.entity} ${r.reference} ${r.type} ${r.status}`} dense />
            </div>
            <div>
              <p className="label-caps mb-2">Covenants in region</p>
              <DataTable rows={regionCovenants} columns={covCols} dense emptyTitle="No covenants recorded in this region" />
            </div>
          </div>
        ),
      };
    }

    if (target.kind === "covenant") {
      const covenant = covenants.find((c) => c.id === target.covenantId);
      if (!covenant) return null;
      const project = ProjectService.get(covenant.projectId);
      const client = ClientService.get(covenant.clientId);
      const related = exposures.filter((e) => e.clientId === covenant.clientId);
      const ids = new Set(related.map((r) => r.id));
      const txns = transactions.filter((t) => ids.has(t.exposureId));
      const peers = covenants.filter((c) => c.clientId === covenant.clientId && c.id !== covenant.id);
      return {
        title: covenant.name,
        description: `${project?.name ?? covenant.projectId}${client ? ` · ${client.name}` : ""}`,
        body: (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Threshold" value={covenant.threshold} />
              <Stat label="Current value" value={covenant.currentValue} tone={covenant.status === "Breach" ? "text-destructive" : undefined} />
              <Stat label="Test date" value={shortDate(covenant.testDate)} />
              <Stat label="Frequency" value={covenant.frequency} />
            </div>
            <div className="flex items-center gap-2">
              <span className="label-caps">Status</span>
              <StatusPill status={covenant.status} />
            </div>
            <div>
              <p className="label-caps mb-2">Exposure under this obligor</p>
              <DataTable rows={related} columns={exposureColumns} dense />
            </div>
            <div>
              <p className="label-caps mb-2">Underlying transactions</p>
              <DataTable rows={txns} columns={txnColumns} searchKeys={(r) => `${r.entity} ${r.reference} ${r.type}`} dense />
            </div>
            <div>
              <p className="label-caps mb-2">Other covenants for this obligor</p>
              <DataTable rows={peers} columns={covCols} dense emptyTitle="No other covenants recorded" />
            </div>
          </div>
        ),
      };
    }

    const meta = METRIC_META[target.metric];
    if (target.metric === "breaches") {
      const rows = covenants.filter((c) => c.status !== "Compliant");
      return {
        title: meta.title,
        description: meta.description,
        body: <DataTable rows={rows} columns={covCols} searchKeys={(r) => `${r.name} ${r.status}`} dense />,
      };
    }
    const rows = target.metric === "proposed" ? exposures.filter((e) => e.proposedUsd > 0) : exposures;
    return {
      title: meta.title,
      description: meta.description,
      body: (
        <div className="space-y-4">
          <DataTable rows={rows} columns={exposureColumns} searchKeys={(r) => `${r.entity} ${r.country} ${r.product}`} dense />
          <p className="text-xs text-muted-foreground">Select an entity row in the main table to view its underlying transactions.</p>
        </div>
      ),
    };
  }, [target]);

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        {content && (
          <>
            <DialogHeader>
              <DialogTitle>{content.title}</DialogTitle>
              <DialogDescription>{content.description}</DialogDescription>
            </DialogHeader>
            {content.body}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
