import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { usePhoenix } from "@/context/PhoenixContext";
import { ClientService, ProjectService, RecommendationService } from "@/services";
import { RecommendationCard } from "@/components/common/RecommendationCard";
import { currency, initialsOf, relativeTime, shortDate } from "@/lib/format";
import type { CoverageMember, InvestmentProject } from "@/types";

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${28 - ((p - min) / span) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-28" aria-hidden>
      <polyline points={path} fill="none" stroke="hsl(var(--brand))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { askAssistant, logActivity } = usePhoenix();
  const [briefingOpen, setBriefingOpen] = useState(false);

  const client = ClientService.get(clientId);

  const data = useMemo(() => {
    if (!client) return null;
    return {
      group: ClientService.group(client.groupId),
      contacts: ClientService.contacts(client.id),
      coverage: ClientService.coverage(client.id),
      interactions: [...ClientService.interactions(client.id)].sort((a, b) => (a.at < b.at ? 1 : -1)),
      commitments: ClientService.commitments(client.id),
      opportunities: ClientService.opportunities(client.id),
      projects: ProjectService.byClient(client.id),
      recommendations: RecommendationService.forClient(client.id),
    };
  }, [client]);

  if (!client || !data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Relationships" title="Client not found" description="The requested client record is not available." />
        <EmptyState title="No client record" description="Return to the client list and select an existing relationship." />
        <Button variant="outline" onClick={() => navigate("/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to clients
        </Button>
      </div>
    );
  }

  const { group, contacts, coverage, interactions, commitments, opportunities, projects, recommendations } = data;
  const decisionMakers = contacts.filter((c) => c.isDecisionMaker);
  const openCommitments = commitments.filter((c) => c.status !== "Met");
  const lastInteraction = interactions[0];

  const coverageColumns: Column<CoverageMember>[] = [
    {
      key: "name",
      header: "Team member",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-xs font-semibold text-teal-soft-foreground">
            {initialsOf(r.name.split(" ")[0] ?? "", r.name.split(" ")[1] ?? "")}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{r.name}</p>
            <p className="text-xs text-muted-foreground">{r.role}</p>
          </div>
        </div>
      ),
    },
    { key: "unit", header: "Unit", sortValue: (r) => r.unit, render: (r) => <span className="text-sm">{r.unit}</span> },
    {
      key: "engagements",
      header: "Engagements (90d)",
      align: "right",
      sortValue: (r) => r.engagementsLast90,
      render: (r) => <span className="num text-sm">{r.engagementsLast90}</span>,
    },
    {
      key: "strength",
      header: "Relationship strength",
      sortValue: (r) => r.strength,
      render: (r) => <MetricBar value={r.strength} tone={r.strength >= 70 ? "success" : r.strength >= 45 ? "warning" : "danger"} />,
      className: "min-w-[160px]",
    },
    {
      key: "last",
      header: "Last contact",
      sortValue: (r) => r.lastInteraction,
      render: (r) => <span className="text-sm text-muted-foreground">{shortDate(r.lastInteraction)}</span>,
    },
    {
      key: "gap",
      header: "Coverage gap",
      render: (r) => (r.gap ? <Pill tone="warning">{r.gap}</Pill> : <span className="text-xs text-muted-foreground">None flagged</span>),
    },
  ];

  const projectColumns: Column<InvestmentProject>[] = [
    {
      key: "name",
      header: "Project",
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.code} · {r.product} · {r.country}
          </p>
        </div>
      ),
    },
    { key: "stage", header: "Stage", sortValue: (r) => r.stage, render: (r) => <Pill tone="brand">{r.stage}</Pill> },
    { key: "health", header: "Health", render: (r) => <StatusPill status={r.health} /> },
    {
      key: "commitment",
      header: "Commitment",
      align: "right",
      sortValue: (r) => r.proposedCommitmentUsd,
      render: (r) => <span className="num text-sm">{currency(r.proposedCommitmentUsd, { compact: true })}</span>,
    },
    {
      key: "readiness",
      header: "Approval readiness",
      sortValue: (r) => r.approvalReadiness,
      render: (r) => <MetricBar value={r.approvalReadiness} tone={r.approvalReadiness >= 75 ? "success" : "warning"} />,
      className: "min-w-[150px]",
    },
    {
      key: "approval",
      header: "Expected approval",
      sortValue: (r) => r.expectedApproval,
      render: (r) => (
        <div>
          <p className="text-sm text-foreground">{shortDate(r.expectedApproval)}</p>
          {r.predictedDelayDays > 0 && (
            <p className="text-xs text-warning-foreground">+{r.predictedDelayDays}d predicted delay</p>
          )}
        </div>
      ),
    },
  ];

  const openBriefing = () => {
    setBriefingOpen(true);
    logActivity({ action: "Generated meeting briefing", object: client.name });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Client 360 · ${group?.name ?? "Independent"}`}
        title={client.name}
        description={`${client.clientType} · ${client.sector} · ${client.country} · ${client.region}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/clients")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> All clients
            </Button>
            <Button variant="outline" onClick={openBriefing}>
              <CalendarClock className="mr-2 h-4 w-4" /> Prepare for meeting
            </Button>
            <Button
              onClick={() =>
                askAssistant({
                  prompt: `Summarise the relationship health, risks and next best actions for ${client.name}.`,
                  contextLabel: `Client · ${client.shortName}`,
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" /> Ask Phoenix
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total exposure" value={currency(client.totalExposureUsd, { compact: true })} hint={`${client.relationshipTier} tier`} />
        <KpiCard
          label="Proposed exposure"
          value={currency(client.proposedExposureUsd, { compact: true })}
          hint={`${projects.length} projects in portfolio`}
        />
        <KpiCard label="Pipeline value" value={currency(client.pipelineValueUsd, { compact: true })} hint={`${opportunities.length} open opportunities`} />
        <KpiCard
          label="Last engagement"
          value={shortDate(client.lastEngagement)}
          delta={client.sentiment}
          tone={client.sentiment === "Positive" ? "success" : client.sentiment === "Guarded" ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Relationship summary"
          description="AI-generated overview grounded in interactions, exposure and coverage records."
          actions={<ConfidenceTag value={client.dataConfidence} source="CRM + portfolio data" />}
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-foreground">{client.summary}</p>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <div>
                <p className="label-caps">Engagement trend (6 mo)</p>
                <p className="text-xs text-muted-foreground">Interactions per month</p>
              </div>
              <Sparkline points={client.engagementTrend} />
              <Pill tone={statusTone(client.riskRating)}>Risk · {client.riskRating}</Pill>
              <Pill tone="neutral">Owner · {client.relationshipOwner}</Pill>
              {lastInteraction && (
                <span className="text-xs text-muted-foreground">Last touch {relativeTime(lastInteraction.at)}</span>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <p className="label-caps mb-2">Strategic objectives</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {client.strategicObjectives.map((o) => (
                    <li key={o}>· {o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label-caps mb-2">Open issues</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {client.openIssues.map((o) => (
                    <li key={o}>· {o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label-caps mb-2">Opportunities</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {client.opportunities.map((o) => (
                    <li key={o}>· {o}</li>
                  ))}
                </ul>
              </div>
            </div>

            <DefinitionList
              items={[
                { label: "Group", value: group?.name ?? "Independent" },
                { label: "Footprint", value: client.footprint.join(", ") },
                { label: "Employees", value: <span className="num">{client.employees.toLocaleString()}</span> },
                { label: "Reported revenue", value: <span className="num">{currency(client.revenueUsd, { compact: true })}</span> },
              ]}
            />
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Key contacts" description={`${decisionMakers.length} decision makers of ${contacts.length} mapped contacts`}>
            <ul className="space-y-3">
              {contacts.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {c.name}
                      {c.isDecisionMaker && <span className="ml-2 text-xs text-brand">Decision maker</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.title} · {c.location}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill tone={c.sentiment === "Positive" ? "success" : c.sentiment === "Guarded" ? "warning" : "neutral"}>
                      {c.sentiment}
                    </Pill>
                    <p className="mt-1 text-xs text-muted-foreground">Influence {c.influence}</p>
                  </div>
                </li>
              ))}
              {contacts.length === 0 && <EmptyState title="No contacts mapped" />}
            </ul>
          </SectionCard>

          <SectionCard title="Open commitments" description="Undertakings made to the client by coverage teams.">
            <ul className="space-y-3">
              {openCommitments.map((c) => (
                <li key={c.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={c.status} />
                    <span className="text-xs text-muted-foreground">Due {shortDate(c.dueDate)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{c.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Owner · {c.madeBy}</p>
                </li>
              ))}
              {openCommitments.length === 0 && <EmptyState title="All commitments met" />}
            </ul>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Coverage team"
        description="Institution-wide coverage, engagement intensity and key-person dependency."
        bodyClassName="p-5 pt-4"
        actions={
          <Pill tone="neutral">
            <Users className="h-3.5 w-3.5" /> {coverage.length} members
          </Pill>
        }
      >
        <DataTable rows={coverage} columns={coverageColumns} dense emptyTitle="No coverage team assigned" />
      </SectionCard>

      <SectionCard title="Active projects" description="Investment projects currently in origination, diligence or portfolio supervision.">
        <DataTable
          rows={projects}
          columns={projectColumns}
          searchKeys={(r) => `${r.name} ${r.code} ${r.stage} ${r.product}`}
          onRowClick={(r) => navigate(`/projects/${r.id}`)}
          emptyTitle="No active projects for this client"
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent interactions" description="Meetings, calls and site visits across the relationship.">
          <ol className="space-y-4">
            {interactions.slice(0, 6).map((i) => (
              <li key={i.id} className="border-l-2 border-border pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="brand">{i.type}</Pill>
                  <span className="text-xs text-muted-foreground">{shortDate(i.at)}</span>
                  <Pill tone={i.sentiment === "Positive" ? "success" : i.sentiment === "Guarded" ? "warning" : "neutral"}>{i.sentiment}</Pill>
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">{i.subject}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{i.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">Participants · {i.participants.join(", ")}</p>
              </li>
            ))}
            {interactions.length === 0 && <EmptyState title="No interactions logged" />}
          </ol>
        </SectionCard>

        <SectionCard title="Phoenix recommendations" description="AI-ranked next best actions for this relationship.">
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
            {recommendations.length === 0 && <EmptyState title="No open recommendations" description="Phoenix has no outstanding actions for this client." />}
          </div>
        </SectionCard>
      </div>

      <Dialog open={briefingOpen} onOpenChange={setBriefingOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting briefing · {client.name}</DialogTitle>
            <DialogDescription>
              Generated {shortDate(new Date().toISOString())} from CRM interactions, portfolio data and open conditions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="label-caps">Relationship position</p>
                <ConfidenceTag value={client.dataConfidence} source="grounded in 6 sources" />
              </div>
              <p className="mt-2 text-sm text-foreground">{client.summary}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="label-caps mb-2">Attendees to prioritise</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(decisionMakers.length ? decisionMakers : contacts).slice(0, 4).map((c) => (
                    <li key={c.id}>
                      · {c.name} — {c.title} ({c.sentiment.toLowerCase()} sentiment)
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label-caps mb-2">Suggested agenda</p>
                <ol className="space-y-1.5 text-sm text-muted-foreground">
                  {projects.slice(0, 2).map((p) => (
                    <li key={p.id}>
                      · {p.name} — {p.stage} status, {p.conditionsTotal - p.conditionsComplete} open conditions
                    </li>
                  ))}
                  {client.opportunities.slice(0, 2).map((o) => (
                    <li key={o}>· Origination: {o}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div>
              <p className="label-caps mb-2">Open issues to address</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {client.openIssues.map((o) => (
                  <li key={o}>· {o}</li>
                ))}
                {openCommitments.map((c) => (
                  <li key={c.id}>
                    · Commitment due {shortDate(c.dueDate)}: {c.description}
                  </li>
                ))}
              </ul>
            </div>

            {lastInteraction && (
              <div>
                <p className="label-caps mb-2">Since the last meeting</p>
                <p className="text-sm text-muted-foreground">
                  {shortDate(lastInteraction.at)} — {lastInteraction.subject}. {lastInteraction.summary}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                onClick={() => {
                  setBriefingOpen(false);
                  askAssistant({
                    prompt: `Draft a meeting agenda and talking points for ${client.name}, covering open conditions and pipeline opportunities.`,
                    contextLabel: `Briefing · ${client.shortName}`,
                  });
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Refine with Phoenix
              </Button>
              <Button variant="outline" asChild>
                <Link to="/clients">Back to client list</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
