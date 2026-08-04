import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, RotateCcw, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ClientService, DocumentService, ProjectService } from "@/services";
import { shortDate } from "@/lib/format";
import {
  DECISION_LABEL,
  DISPOSITION_LABEL,
  reviewProgress,
  useDocumentReview,
  type FindingDisposition,
  type ReviewDecision,
} from "@/lib/documentReview";

const SEVERITY_TONE = { Critical: "danger", High: "warning", Medium: "info", Low: "neutral" } as const;

export default function DocumentReviewPage() {
  const { documentId = "" } = useParams();
  const navigate = useNavigate();
  const { askAssistant, logActivity, persona } = usePhoenix();
  const doc = DocumentService.get(documentId);
  const { review, update, setFinding, reset } = useDocumentReview(documentId);

  const related = useMemo(
    () => (doc ? doc.relatedDocumentIds.map((id) => DocumentService.get(id)).filter(Boolean) : []),
    [doc],
  );

  if (!doc) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Document review" title="Document not found" description="This document is not in the indexed repository." />
        <EmptyState title="Nothing to review" description="Return to the document repository to pick another file." />
        <Button variant="outline" onClick={() => navigate("/projects?view=documents")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Document repository
        </Button>
      </div>
    );
  }

  const client = ClientService.get(doc.clientId);
  const project = doc.projectId ? ProjectService.get(doc.projectId) : null;
  const progress = reviewProgress(review, doc.findings.map((f) => f.id));
  const critical = doc.findings.filter((f) => f.severity === "Critical" || f.severity === "High");
  const escalated = doc.findings.filter((f) => review.findings[f.id] === "escalated").length;

  const decide = (decision: ReviewDecision, label: string) => {
    update({ decision, reviewer: persona.name });
    logActivity({ action: `Document review · ${label}`, object: doc.name });
  };

  const disposition = (id: string): FindingDisposition => review.findings[id] ?? "pending";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Document review · ${doc.category}`}
        title={doc.name}
        description={`${client?.name ?? doc.clientId}${project ? ` · ${project.name}` : ""} · ${doc.pages} pages · uploaded ${shortDate(doc.uploadedAt)} by ${doc.uploadedBy}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(project ? `/projects/${project.id}` : `/clients/${doc.clientId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {project ? "Project 360" : "Client 360"}
            </Button>
            <Button
              onClick={() =>
                askAssistant({
                  prompt: `Summarise the review position on ${doc.name}: critical findings, obligations and what must be cleared before approval.`,
                  contextLabel: `Document · ${doc.name}`,
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" /> Ask Phoenix
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Review status"
          value={DECISION_LABEL[review.decision]}
          tone={review.decision === "cleared" ? "success" : review.decision === "not_started" ? "neutral" : review.decision === "escalated" ? "danger" : "warning"}
          hint={review.reviewer ? `Last action by ${review.reviewer}` : "No reviewer assigned yet"}
        />
        <KpiCard label="Findings dispositioned" value={`${progress.resolved}/${progress.total}`} hint={`${progress.percent}% complete`} tone={progress.percent === 100 ? "success" : "info"} />
        <KpiCard label="Critical or high findings" value={String(critical.length)} tone={critical.length ? "danger" : "success"} delta={escalated ? `${escalated} escalated` : undefined} />
        <KpiCard label="Extraction confidence" value={`${doc.confidence}%`} tone={doc.confidence >= 90 ? "success" : "warning"} hint={doc.classification} />
      </div>

      <SectionCard
        title="Review decision"
        description="Record the outcome of this review; dispositions and notes are retained on the document record."
        actions={<ConfidenceTag value={doc.confidence} source="Document AI extraction" />}
      >
        <div className="space-y-4">
          <MetricBar label="Finding disposition progress" value={progress.percent} tone={progress.percent === 100 ? "success" : "brand"} />
          <div className="flex flex-wrap gap-2">
            <Button variant={review.decision === "in_review" ? "default" : "outline"} onClick={() => decide("in_review", "started")}>
              <FileText className="mr-2 h-4 w-4" /> Start review
            </Button>
            <Button variant={review.decision === "cleared" ? "default" : "outline"} onClick={() => decide("cleared", "cleared")}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Clear document
            </Button>
            <Button variant={review.decision === "changes_requested" ? "default" : "outline"} onClick={() => decide("changes_requested", "changes requested")}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Request changes
            </Button>
            <Button variant={review.decision === "escalated" ? "default" : "outline"} onClick={() => decide("escalated", "escalated")}>
              <ShieldAlert className="mr-2 h-4 w-4" /> Escalate
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
          <div>
            <p className="label-caps mb-2">Reviewer notes</p>
            <Textarea
              value={review.notes}
              placeholder="Record the rationale, conditions to impose and follow-up actions…"
              onChange={(e) => update({ notes: e.target.value, reviewer: persona.name })}
              rows={4}
            />
          </div>
          {review.updatedAt && <p className="text-xs text-muted-foreground">Last updated {new Date(review.updatedAt).toLocaleString()}</p>}
        </div>
      </SectionCard>

      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="summary">AI summary</TabsTrigger>
          <TabsTrigger value="terms">Extracted terms</TabsTrigger>
          <TabsTrigger value="obligations">Obligations & risks</TabsTrigger>
          <TabsTrigger value="preview">Source extract</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="findings">
          <SectionCard title="AI-extracted findings" description="Accept, reject or escalate each finding to complete the review">
            <div className="space-y-3">
              {doc.findings.map((f) => {
                const d = disposition(f.id);
                return (
                  <div key={f.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[16rem] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={SEVERITY_TONE[f.severity]}>{f.severity}</Pill>
                          <span className="text-xs text-muted-foreground">Page {f.page}</span>
                          <ConfidenceTag value={f.confidence} size="sm" />
                          <Pill tone={d === "accepted" ? "success" : d === "rejected" ? "neutral" : d === "escalated" ? "danger" : "warning"}>
                            {DISPOSITION_LABEL[d]}
                          </Pill>
                        </div>
                        <p className="mt-2 text-sm text-foreground">{f.text}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={d === "accepted" ? "default" : "outline"} onClick={() => setFinding(f.id, "accepted")}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant={d === "rejected" ? "default" : "outline"} onClick={() => setFinding(f.id, "rejected")}>
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" variant={d === "escalated" ? "default" : "outline"} onClick={() => setFinding(f.id, "escalated")}>
                          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Escalate
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {doc.findings.length === 0 && <EmptyState title="No findings extracted" description="The document parsed cleanly with no exceptions." />}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="summary">
          <SectionCard title="AI summary" description="Generated from the indexed document and grounded in the extracted pages">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground">{doc.aiSummary}</p>
              <div>
                <p className="label-caps mb-2">Entities detected</p>
                <div className="flex flex-wrap gap-2">
                  {doc.entities.map((e) => (
                    <Pill key={e} tone="neutral">{e}</Pill>
                  ))}
                </div>
              </div>
              {related.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Related documents</p>
                  <div className="flex flex-wrap gap-2">
                    {related.map((r) => (
                      <Button key={r!.id} size="sm" variant="outline" onClick={() => navigate(`/documents/${r!.id}`)}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> {r!.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="terms">
          <SectionCard title="Extracted terms" description="Key values with page citations and extraction confidence">
            <DefinitionList
              items={doc.keyTerms.map((t) => ({
                label: `${t.label} · p.${t.page}`,
                value: (
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{t.value}</span>
                    <ConfidenceTag value={t.confidence} size="sm" />
                  </span>
                ),
              }))}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="obligations">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Obligations identified" description="Undertakings to carry into the conditions register">
              <ul className="space-y-2">
                {doc.obligations.map((o) => (
                  <li key={o} className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm">{o}</li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Risks flagged" description="Issues raised by the document intelligence layer">
              <ul className="space-y-2">
                {doc.risks.map((r) => (
                  <li key={r} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">{r}</li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <SectionCard title="Source extract" description={`${doc.classification} · ${doc.retention}`}>
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
              {doc.previewText.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/90">{line}</p>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="versions">
          <SectionCard title="Version history" description="Revision trail captured on upload">
            <ol className="space-y-3">
              {doc.versions.map((v) => (
                <li key={v.version} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={v.version} />
                    <span className="text-xs text-muted-foreground">{shortDate(v.at)} · {v.author}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{v.changeSummary}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SectionCard title="Document metadata" description="Classification, retention and linkage">
        <DefinitionList
          items={[
            { label: "Classification", value: <Pill tone={doc.classification.includes("Confidential") ? "warning" : "neutral"}>{doc.classification}</Pill> },
            { label: "Retention", value: doc.retention },
            { label: "Workstream", value: doc.workstream ?? "—" },
            { label: "Client", value: client?.name ?? doc.clientId },
            { label: "Project", value: project?.name ?? "—" },
            { label: "Size", value: `${doc.sizeMb} MB · ${doc.pages} pages` },
            { label: "Health", value: <StatusPill status={statusTone(doc.classification) === "danger" ? "Restricted" : "Indexed"} /> },
          ]}
        />
      </SectionCard>
    </div>
  );
}
