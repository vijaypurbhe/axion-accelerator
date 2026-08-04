import { useMemo, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { MaturityBadge, MaturityHeatmap, MaturityLegend } from "@/components/enterprise/Maturity";
import { RecommendationCard } from "@/components/enterprise/RecommendationCard";
import { RiskBadge } from "@/components/enterprise/Badges";
import { QuestionCard } from "@/components/assessment/QuestionCard";
import { LoadingState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ASSESSMENT_CATEGORIES, assessmentCategory, questionsByCategory } from "@/data/assessmentBank";
import { maturityName } from "@/services/scoring";
import { roleLabelFor } from "@/services/workspace";
import { useInitiative } from "@/hooks/useWorkspace";
import {
  useActiveInitiativeId,
  useAssessmentSummary,
  useDecideRecommendation,
  useGenerateAssessmentRecommendations,
  useRecommendations,
  useSaveAssessmentResponse,
} from "@/hooks/usePhase2";
import type { AssessmentCategoryId } from "@/domain/phase2";

const AssessmentPage = () => {
  const { toast } = useToast();
  const initiativeId = useActiveInitiativeId();
  const initiative = useInitiative(initiativeId);
  const { summary, responses, isLoading } = useAssessmentSummary(initiativeId);
  const saveResponse = useSaveAssessmentResponse(initiativeId);
  const recommendations = useRecommendations(initiativeId);
  const generate = useGenerateAssessmentRecommendations(initiativeId);
  const decide = useDecideRecommendation();

  const [category, setCategory] = useState<AssessmentCategoryId>(ASSESSMENT_CATEGORIES[0].id);
  const [showExport, setShowExport] = useState(false);

  const questions = useMemo(() => questionsByCategory(category), [category]);
  const activeCategory = assessmentCategory(category);
  const categoryScore = summary.categories.find((entry) => entry.categoryId === category);

  /** BFSI target band: "Managed" (70) is the minimum acceptable score for every category. */
  const TARGET_SCORE = 70;

  const radarData = summary.categories.map((entry) => ({
    category: assessmentCategory(entry.categoryId).name.split(" ")[0],
    score: entry.score,
    target: TARGET_SCORE,
  }));

  const stageData = summary.byStage.map((entry) => ({ stage: entry.stage, score: entry.score }));

  const assessmentRecs = (recommendations.data ?? []).filter((rec) => rec.source === "assessment");
  const pending = assessmentRecs.filter((rec) => rec.status === "pending");

  if (isLoading) return <LoadingState label="Scoring readiness responses" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="BFSI Readiness Assessment"
        title="Data and agent readiness"
        description={`Weighted, evidence-backed assessment across ${ASSESSMENT_CATEGORIES.length} BFSI categories for ${initiative.data?.name ?? "the active initiative"}.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowExport(true)}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden /> Export preview
            </Button>
            <Button
              onClick={() =>
                generate.mutate(
                  { summary, useCases: initiative.data?.useCases ?? [] },
                  { onSuccess: (created) => toast({ title: `${created.length} AI recommendations generated` }) },
                )
              }
              disabled={generate.isPending}
            >
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Generate recommendations
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <StatTile label="Overall readiness" value={summary.overall} hint={maturityName(summary.maturity)} />
        <StatTile label="Risk-adjusted" value={summary.riskAdjusted} hint="After critical-gap penalty" />
        <StatTile label="Confidence" value={`${summary.confidence}%`} hint="Completion + evidence coverage" />
        <StatTile label="Completion" value={`${summary.completion}%`} hint="Questions answered" />
        <StatTile label="Critical blockers" value={summary.blockers.length} hint="Must clear before Design" />
      </div>

      <Tabs defaultValue="questionnaire">
        <TabsList>
          <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="gaps">Gaps & risks</TabsTrigger>
          <TabsTrigger value="recommendations">
            AI recommendations{pending.length > 0 ? ` (${pending.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questionnaire" className="space-y-4 pt-4">
          <SectionCard
            title="Assessment categories"
            description="Each category is weighted; mandatory questions must be answered before the Assess gate."
            actions={
              <Select value={category} onValueChange={(value) => setCategory(value as AssessmentCategoryId)}>
                <SelectTrigger className="w-72 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_CATEGORIES.map((entry) => {
                    const score = summary.categories.find((item) => item.categoryId === entry.id);
                    return (
                      <SelectItem key={entry.id} value={entry.id} className="text-xs">
                        {entry.name} — {score?.answered ?? 0}/{score?.total ?? 0} answered
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            }
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <MaturityBadge level={categoryScore?.maturity ?? 1} />
                <span className="text-sm text-foreground">
                  Score {categoryScore?.score ?? 0} / target {activeCategory.targetScore}
                </span>
                <Badge variant="outline" className="text-[11px]">
                  Weight {activeCategory.weight.toFixed(1)}
                </Badge>
                <Badge variant="outline" className="text-[11px] capitalize">
                  Stage: {activeCategory.stage}
                </Badge>
                <Badge variant="outline" className="text-[11px] capitalize">
                  Owner: {roleLabelFor(activeCategory.owner)}
                </Badge>
                {categoryScore && categoryScore.mandatoryOpen > 0 ? (
                  <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-[11px] text-destructive">
                    {categoryScore.mandatoryOpen} mandatory open
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{activeCategory.description}</p>
              <Progress value={categoryScore?.score ?? 0} className="h-2" />
            </div>
          </SectionCard>

          <div className="space-y-3">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                response={responses[question.id]}
                onSave={(input) => saveResponse.mutate(input)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scorecard" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Maturity profile" description="Current score against BFSI target per category.">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--border))" />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.28} />
                    <Radar name="Target" dataKey="target" stroke="hsl(var(--accent-foreground))" fill="none" strokeDasharray="4 3" />
                    <ChartTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Readiness by lifecycle stage">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <ChartTooltip />
                    <Bar dataKey="score" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Category heatmap" actions={<MaturityLegend />}>
            <MaturityHeatmap scores={summary.categories} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="gaps" className="pt-4">
          <SectionCard
            title="Prioritised gaps"
            description="Ranked by score and criticality. Critical gaps block progression into Design."
          >
            {summary.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gaps detected — every category is at or above target.</p>
            ) : (
              <ul className="space-y-2">
                {summary.gaps.map((gap) => (
                  <li key={gap.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{gap.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {assessmentCategory(gap.categoryId).name} · score {gap.score}
                        {gap.critical ? " · blocks stage gate" : ""}
                      </p>
                    </div>
                    <RiskBadge level={gap.severity} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-3 pt-4">
          {assessmentRecs.length === 0 ? (
            <SectionCard title="No recommendations yet">
              <p className="text-sm text-muted-foreground">
                Generate recommendations to convert readiness gaps into owned, staged remediation actions. Every
                suggestion is labelled AI Suggested and requires explicit acceptance.
              </p>
            </SectionCard>
          ) : (
            assessmentRecs.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onDecide={(input) =>
                  decide.mutate({ recommendation, status: input.status, editedText: input.editedText })
                }
                disabled={decide.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Readiness assessment report — export preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Client-branded PDF/XLSX generation is deferred to a later phase. This preview shows the report contents.
            </p>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Tech Mahindra Axion</p>
              <h3 className="text-base font-semibold">{initiative.data?.name ?? "Initiative"} — BFSI readiness</h3>
              <ul className="mt-2 space-y-1 text-xs text-foreground">
                <li>Overall readiness: {summary.overall} ({maturityName(summary.maturity)})</li>
                <li>Risk-adjusted readiness: {summary.riskAdjusted}</li>
                <li>Assessment confidence: {summary.confidence}%</li>
                <li>Completion: {summary.completion}%</li>
                <li>Critical blockers: {summary.blockers.length}</li>
                <li>Accepted recommendations: {assessmentRecs.filter((rec) => rec.status !== "pending" && rec.status !== "rejected").length}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentPage;
