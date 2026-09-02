import { ASSESSMENT_CATEGORIES, questionsForIndustry } from "@/data/assessmentBank";
import { DEFAULT_INDUSTRY } from "@/domain/industries";
import type { Industry } from "@/domain/types";
import { MATURITY_BANDS } from "@/domain/phase2";
import type {
  AssessmentCategoryId,
  AssessmentGap,
  AssessmentQuestion,
  AssessmentResponse,
  AssessmentSummary,
  AxionRecommendation,
  CategoryScore,
} from "@/domain/phase2";
import type { MaturityLevel, LifecycleStageId } from "@/domain/types";
import type { RiskLevel, RoleId } from "@/domain/models";

export const maturityFor = (score: number): MaturityLevel => {
  let level: MaturityLevel = 1;
  for (const band of MATURITY_BANDS) if (score >= band.min) level = band.level;
  return level;
};

export const maturityName = (level: MaturityLevel): string =>
  MATURITY_BANDS.find((band) => band.level === level)?.name ?? "Initial";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

/** Normalises a single answer to a 0-100 score, or null when unanswered/not applicable. */
export const scoreResponse = (question: AssessmentQuestion, response?: AssessmentResponse): number | null => {
  if (!response || response.notApplicable) return null;
  switch (question.type) {
    case "single": {
      if (!response.choice) return null;
      return question.options?.find((option) => option.value === response.choice)?.score ?? null;
    }
    case "multi": {
      const chosen = response.choices ?? [];
      if (chosen.length === 0) return null;
      const scores = chosen
        .map((value) => question.options?.find((option) => option.value === value)?.score ?? 0)
        .filter((value) => value > 0);
      if (scores.length === 0) return null;
      const average = scores.reduce((total, value) => total + value, 0) / scores.length;
      const breadth = Math.min(1, chosen.length / Math.max(2, (question.options?.length ?? 2) / 2));
      return clamp(average * (0.75 + 0.25 * breadth));
    }
    case "numeric": {
      if (typeof response.numeric !== "number") return null;
      const max = question.max ?? 100;
      return clamp((response.numeric / max) * 100);
    }
    case "text": {
      const length = (response.text ?? "").trim().length;
      if (length === 0) return null;
      return clamp(40 + Math.min(55, length / 4));
    }
    default:
      return null;
  }
};

const isAnswered = (question: AssessmentQuestion, response?: AssessmentResponse) =>
  scoreResponse(question, response) !== null || Boolean(response?.notApplicable);

export const scoreCategory = (
  categoryId: AssessmentCategoryId,
  responses: Readonly<Record<string, AssessmentResponse>>,
  industry: Industry = DEFAULT_INDUSTRY,
): CategoryScore => {
  const questions = questionsForIndustry(industry).filter((question) => question.categoryId === categoryId);
  let weighted = 0;
  let weight = 0;
  let answered = 0;
  let mandatoryOpen = 0;
  let evidenceExpected = 0;
  let evidenceProvided = 0;

  for (const question of questions) {
    const response = responses[question.id];
    const score = scoreResponse(question, response);
    if (isAnswered(question, response)) answered += 1;
    if (question.mandatory && !isAnswered(question, response)) mandatoryOpen += 1;
    if (question.evidenceRequired) {
      evidenceExpected += 1;
      if (response?.evidenceName) evidenceProvided += 1;
    }
    if (score !== null) {
      weighted += score * question.weight;
      weight += question.weight;
    }
  }

  const score = weight === 0 ? 0 : Math.round(weighted / weight);
  return {
    categoryId,
    score,
    maturity: maturityFor(score),
    answered,
    total: questions.length,
    mandatoryOpen,
    evidenceCoverage: evidenceExpected === 0 ? 100 : Math.round((evidenceProvided / evidenceExpected) * 100),
  };
};

const severityFor = (score: number, critical: boolean): RiskLevel => {
  if (critical) return "critical";
  if (score < 30) return "high";
  if (score < 50) return "medium";
  return "low";
};

export const summariseAssessment = (
  responses: Readonly<Record<string, AssessmentResponse>>,
  industry: Industry = DEFAULT_INDUSTRY,
): AssessmentSummary => {
  const categories = ASSESSMENT_CATEGORIES.map((category) => scoreCategory(category.id, responses, industry));

  const totalWeight = ASSESSMENT_CATEGORIES.reduce((total, category) => total + category.weight, 0);
  const overall = Math.round(
    categories.reduce((total, score) => {
      const weight = ASSESSMENT_CATEGORIES.find((c) => c.id === score.categoryId)?.weight ?? 1;
      return total + score.score * weight;
    }, 0) / totalWeight,
  );

  const totalQuestions = questionsForIndustry(industry).length;
  const answeredQuestions = categories.reduce((total, category) => total + category.answered, 0);
  const completion = Math.round((answeredQuestions / totalQuestions) * 100);

  const evidenceCoverage =
    categories.reduce((total, category) => total + category.evidenceCoverage, 0) / categories.length;
  const confidence = Math.round(clamp(completion * 0.55 + evidenceCoverage * 0.45));

  const criticalCategories: readonly AssessmentCategoryId[] = [
    "identity-resolution",
    "security-compliance",
    "governance",
    "data-quality",
  ];

  const gaps: AssessmentGap[] = categories
    .filter((category) => category.score < 70 || category.mandatoryOpen > 0)
    .map((category) => {
      const definition = ASSESSMENT_CATEGORIES.find((c) => c.id === category.categoryId);
      const critical = category.score < 45 && criticalCategories.includes(category.categoryId);
      return {
        id: `gap-${category.categoryId}`,
        categoryId: category.categoryId,
        title:
          category.mandatoryOpen > 0
            ? `${definition?.name ?? category.categoryId}: ${category.mandatoryOpen} mandatory question(s) unanswered`
            : `${definition?.name ?? category.categoryId} scores below the Managed band`,
        severity: severityFor(category.score, critical),
        score: category.score,
        critical,
      };
    })
    .sort((a, b) => a.score - b.score);

  /** Risk-adjusted readiness penalises critical gaps and low evidence confidence. */
  const riskPenalty = gaps.reduce((total, gap) => total + (gap.critical ? 6 : gap.severity === "high" ? 3 : 1), 0);
  const riskAdjusted = Math.round(clamp(overall - riskPenalty - (100 - confidence) * 0.1));

  const stages = Array.from(new Set(ASSESSMENT_CATEGORIES.map((category) => category.stage)));
  const byStage = stages.map((stage) => {
    const relevant = categories.filter(
      (category) => ASSESSMENT_CATEGORIES.find((c) => c.id === category.categoryId)?.stage === stage,
    );
    const score =
      relevant.length === 0
        ? 0
        : Math.round(relevant.reduce((total, category) => total + category.score, 0) / relevant.length);
    return { stage: stage as LifecycleStageId, score };
  });

  return {
    overall,
    riskAdjusted,
    confidence,
    maturity: maturityFor(overall),
    completion,
    categories,
    gaps,
    blockers: gaps.filter((gap) => gap.critical),
    byStage,
  };
};

const REMEDIATION: Record<AssessmentCategoryId, { title: string; impact: string; owner: RoleId; stage: LifecycleStageId }> = {
  "business-strategy": {
    title: "Quantify outcome metrics per prioritised use case",
    impact: "Enables benefit tracking and sharpens release scope decisions.",
    owner: "executive-sponsor",
    stage: "discover",
  },
  "data-landscape": {
    title: "Publish a domain ownership map for in-scope data",
    impact: "Removes ambiguity in stewardship and speeds mapping decisions.",
    owner: "enterprise-architect",
    stage: "discover",
  },
  "source-readiness": {
    title: "Run a core banking change-data feasibility spike",
    impact: "De-risks the largest Configure-stage dependency before design lock.",
    owner: "data-engineer",
    stage: "assess",
  },
  "canonical-model": {
    title: "Align canonical entities to Data 360 DLO and DMO structures",
    impact: "Prevents rework in harmonization and identity resolution.",
    owner: "data360-architect",
    stage: "design",
  },
  "data-quality": {
    title: "Establish quality rules and remediation SLAs on KYC attributes",
    impact: "Raises grounded-response reliability for onboarding journeys.",
    owner: "data-steward",
    stage: "assess",
  },
  "identity-resolution": {
    title: "Define party and household match rulesets with dispute handling",
    impact: "Directly determines unified profile accuracy and household rollups.",
    owner: "data360-architect",
    stage: "design",
  },
  governance: {
    title: "Make consent and permissible use machine-enforceable",
    impact: "Allows activation and agent grounding to enforce policy at runtime.",
    owner: "data-steward",
    stage: "approve",
  },
  "security-compliance": {
    title: "Map regulatory obligations to implemented platform controls",
    impact: "Provides the evidence pack required to clear the Approve gate.",
    owner: "enterprise-architect",
    stage: "approve",
  },
  activation: {
    title: "Confirm activation targets and consuming surfaces per use case",
    impact: "Avoids late-stage rework in segmentation and orchestration.",
    owner: "data360-architect",
    stage: "configure",
  },
  agentforce: {
    title: "Define human review policy for regulated agent actions",
    impact: "Mandatory control for advice, complaints and hardship journeys.",
    owner: "agentforce-architect",
    stage: "configure",
  },
  "operating-model": {
    title: "Fund and name the run-state operating model",
    impact: "Protects post-deployment stability and improvement velocity.",
    owner: "executive-sponsor",
    stage: "deploy",
  },
  "monitoring-support": {
    title: "Instrument pipeline and agent quality telemetry with alerting",
    impact: "Enables early detection of freshness and grounding regressions.",
    owner: "data-engineer",
    stage: "monitor",
  },
};

/** AI-assisted remediation recommendations derived from the scored gaps. */
export const buildAssessmentRecommendations = (
  initiativeId: string,
  summary: AssessmentSummary,
  useCases: readonly string[],
): readonly Omit<AxionRecommendation, "id" | "createdAt" | "status">[] =>
  summary.gaps.slice(0, 8).map((gap) => {
    const template = REMEDIATION[gap.categoryId];
    const category = ASSESSMENT_CATEGORIES.find((c) => c.id === gap.categoryId);
    const confidence = clamp(58 + (100 - gap.score) * 0.3 + summary.confidence * 0.12) / 100;
    return {
      initiativeId,
      source: "assessment" as const,
      title: template.title,
      gap: gap.title,
      rationale: `${category?.name ?? gap.categoryId} scored ${gap.score}/100 (${maturityName(
        maturityFor(gap.score),
      )}). ${category?.description ?? ""}`.trim(),
      impact: template.impact,
      urgency: gap.severity,
      suggestedOwner: template.owner,
      stage: template.stage,
      useCases,
      confidence: Number(Math.min(0.95, confidence).toFixed(2)),
    };
  });
