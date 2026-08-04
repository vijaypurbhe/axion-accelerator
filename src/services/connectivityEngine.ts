import {
  DECISION_CRITERIA,
  DEFAULT_WEIGHTS,
  getCriterion,
  guidanceFor,
  platformGuidanceFor,
} from "@/data/connectivityCatalog";
import { CONNECTIVITY_PATTERNS, PATTERN_LABELS } from "@/domain/phase4";
import type {
  ConnectivityAssessment,
  ConnectivityDecisionResult,
  ConnectivityPatternId,
  ConnectivityPolicy,
  CriterionContribution,
  PatternScore,
} from "@/domain/phase4";

/**
 * Deterministic, fully explainable connectivity scoring engine.
 * Every recommendation is derived from weighted criteria contributions plus disqualifying answers,
 * so the UI can always show why a pattern won or lost.
 */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const effectiveWeights = (
  assessment: Pick<ConnectivityAssessment, "weightOverrides">,
  policy?: ConnectivityPolicy,
): Record<string, number> => ({
  ...DEFAULT_WEIGHTS,
  ...(policy?.weights ?? {}),
  ...assessment.weightOverrides,
});

const scorePattern = (
  pattern: ConnectivityPatternId,
  assessment: ConnectivityAssessment,
  weights: Record<string, number>,
  banned: readonly ConnectivityPatternId[],
): PatternScore => {
  const contributions: CriterionContribution[] = [];
  const disqualifiedBy: string[] = [];
  let weighted = 0;
  let maxWeighted = 0;

  for (const criterion of DECISION_CRITERIA) {
    const answer = assessment.answers[criterion.id];
    if (!answer) continue;
    const option = criterion.options.find((entry) => entry.value === answer);
    if (!option) continue;
    const weight = weights[criterion.id] ?? criterion.defaultWeight;
    const raw = option.scores[pattern];
    weighted += raw * weight;
    maxWeighted += 2 * weight;
    contributions.push({
      criterionId: criterion.id,
      label: criterion.label,
      group: criterion.group,
      answerLabel: option.label,
      weight,
      rawScore: raw,
      weighted: raw * weight,
    });
    if (option.disqualifies?.includes(pattern)) {
      disqualifiedBy.push(`${criterion.label}: ${option.label}`);
    }
  }

  if (banned.includes(pattern)) disqualifiedBy.push("Client policy bans this pattern");

  /** Map -max..+max onto 0..100 so patterns are comparable regardless of how many criteria are answered. */
  const normalised = maxWeighted === 0 ? 50 : ((weighted + maxWeighted) / (2 * maxWeighted)) * 100;

  return {
    pattern,
    score: Math.round(clamp(normalised, 0, 100)),
    disqualified: disqualifiedBy.length > 0,
    disqualifiedBy,
    contributions: [...contributions].sort((a, b) => Math.abs(b.weighted) - Math.abs(a.weighted)),
  };
};

const buildRationale = (winner: PatternScore, runnerUp: PatternScore | undefined, all: readonly PatternScore[]): string[] => {
  const lines: string[] = [];
  const top = winner.contributions.filter((entry) => entry.rawScore > 0).slice(0, 4);
  const against = winner.contributions.filter((entry) => entry.rawScore < 0).slice(0, 3);

  lines.push(
    `${PATTERN_LABELS[winner.pattern]} scores ${winner.score}/100 on the weighted criteria for this source and data product.`,
  );
  for (const entry of top) {
    lines.push(`${entry.label} (“${entry.answerLabel}”, weight ${entry.weight}) supports this pattern.`);
  }
  for (const entry of against) {
    lines.push(`Counter-indicator: ${entry.label} (“${entry.answerLabel}”) argues against this pattern.`);
  }
  if (runnerUp) {
    lines.push(
      `Closest alternative is ${PATTERN_LABELS[runnerUp.pattern]} at ${runnerUp.score}/100, a gap of ${
        winner.score - runnerUp.score
      } points.`,
    );
  }
  for (const pattern of all.filter((entry) => entry.disqualified)) {
    lines.push(`${PATTERN_LABELS[pattern.pattern]} is disqualified by ${pattern.disqualifiedBy.join("; ")}.`);
  }
  return lines;
};

const buildAssumptions = (assessment: ConnectivityAssessment): string[] => {
  const unanswered = DECISION_CRITERIA.filter((criterion) => !assessment.answers[criterion.id]);
  const assumptions = unanswered.map(
    (criterion) => `${criterion.label} is not yet assessed and is treated as neutral in the score.`,
  );
  assumptions.push("Connector capability is described by source metadata and may change with platform releases.");
  assumptions.push("Volume and freshness inputs are stated expectations, not measured production telemetry.");
  return assumptions;
};

export const evaluateConnectivity = (
  assessment: ConnectivityAssessment,
  options?: { policy?: ConnectivityPolicy; platform?: string },
): ConnectivityDecisionResult => {
  const weights = effectiveWeights(assessment, options?.policy);
  const banned = options?.policy?.bannedPatterns ?? [];
  const scores = CONNECTIVITY_PATTERNS.map((pattern) => scorePattern(pattern, assessment, weights, banned));

  const ranked = [...scores].sort((a, b) => {
    if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
    return b.score - a.score;
  });
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const answeredCount = DECISION_CRITERIA.filter((criterion) => Boolean(assessment.answers[criterion.id])).length;

  const coverage = answeredCount / DECISION_CRITERIA.length;
  const separation = runnerUp ? clamp((winner.score - runnerUp.score) / 25, 0, 1) : 1;
  const confidence = Math.round(clamp(35 + coverage * 40 + separation * 25, 0, 99));

  return {
    assessmentId: assessment.id,
    recommended: winner.pattern,
    fallback: runnerUp && !runnerUp.disqualified ? runnerUp.pattern : undefined,
    confidence,
    answeredCount,
    criteriaCount: DECISION_CRITERIA.length,
    scores,
    rationale: buildRationale(winner, runnerUp, scores),
    assumptions: buildAssumptions(assessment),
    guidance: guidanceFor(winner.pattern),
    platformGuidance: options?.platform ? platformGuidanceFor(options.platform) : undefined,
  };
};

/** Decision-tree style explanation: the highest-weight answered criteria in order, with the pattern each favours. */
export interface DecisionTreeNode {
  readonly criterionId: string;
  readonly label: string;
  readonly answerLabel: string;
  readonly weight: number;
  readonly favours: readonly ConnectivityPatternId[];
  readonly eliminates: readonly ConnectivityPatternId[];
}

export const buildDecisionTree = (assessment: ConnectivityAssessment, weights: Record<string, number>): DecisionTreeNode[] =>
  DECISION_CRITERIA.filter((criterion) => Boolean(assessment.answers[criterion.id]))
    .map((criterion) => {
      const option = criterion.options.find((entry) => entry.value === assessment.answers[criterion.id]);
      const weight = weights[criterion.id] ?? criterion.defaultWeight;
      const best = option ? Math.max(...CONNECTIVITY_PATTERNS.map((pattern) => option.scores[pattern])) : 0;
      return {
        criterionId: criterion.id,
        label: criterion.label,
        answerLabel: option?.label ?? "Not answered",
        weight,
        favours: option && best > 0 ? CONNECTIVITY_PATTERNS.filter((pattern) => option.scores[pattern] === best) : [],
        eliminates: option?.disqualifies ?? [],
      };
    })
    .sort((a, b) => b.weight - a.weight);

export const decisionReportMarkdown = (
  assessment: ConnectivityAssessment,
  result: ConnectivityDecisionResult,
  selected: ConnectivityPatternId,
): string => {
  const lines: string[] = [];
  lines.push(`# Connectivity decision report — ${assessment.name}`);
  lines.push("");
  lines.push(`- Recommended pattern: **${PATTERN_LABELS[result.recommended]}**`);
  lines.push(`- Selected pattern: **${PATTERN_LABELS[selected]}**`);
  lines.push(`- Confidence: ${result.confidence}%`);
  lines.push(`- Criteria answered: ${result.answeredCount}/${result.criteriaCount}`);
  lines.push("");
  lines.push("## Weighted scores");
  for (const score of result.scores) {
    lines.push(
      `- ${PATTERN_LABELS[score.pattern]}: ${score.score}/100${score.disqualified ? " (disqualified)" : ""}`,
    );
  }
  lines.push("");
  lines.push("## Rationale");
  result.rationale.forEach((line) => lines.push(`- ${line}`));
  lines.push("");
  lines.push("## Benefits");
  result.guidance.benefits.forEach((line) => lines.push(`- ${line}`));
  lines.push("");
  lines.push("## Limitations and risks");
  [...result.guidance.limitations, ...result.guidance.risks].forEach((line) => lines.push(`- ${line}`));
  lines.push("");
  lines.push("## Prerequisites");
  result.guidance.prerequisites.forEach((line) => lines.push(`- ${line}`));
  lines.push("");
  lines.push("## Cost considerations");
  result.guidance.costConsiderations.forEach((line) => lines.push(`- ${line}`));
  lines.push("");
  lines.push("## Compliance considerations");
  result.guidance.complianceConsiderations.forEach((line) => lines.push(`- ${line}`));
  lines.push("");
  lines.push("## Criteria detail");
  for (const criterion of DECISION_CRITERIA) {
    const answer = assessment.answers[criterion.id];
    const option = criterion.options.find((entry) => entry.value === answer);
    lines.push(`- ${criterion.label}: ${option?.label ?? "not assessed"}`);
  }
  lines.push("");
  lines.push("## Open assumptions");
  result.assumptions.forEach((line) => lines.push(`- ${line}`));
  return lines.join("\n");
};

export const decisionMatrixCsv = (
  rows: readonly {
    readonly assessment: ConnectivityAssessment;
    readonly sourceName: string;
    readonly productName: string;
    readonly result: ConnectivityDecisionResult;
    readonly selected: ConnectivityPatternId;
    readonly overridden: boolean;
  }[],
): string => {
  const header = [
    "Assessment",
    "Source system",
    "Data product",
    "Recommended",
    "Selected",
    "Overridden",
    "Confidence",
    "Physical score",
    "Zero-copy score",
    "Cached score",
    "Criteria answered",
  ];
  const body = rows.map((row) => {
    const score = (pattern: ConnectivityPatternId) =>
      row.result.scores.find((entry) => entry.pattern === pattern)?.score ?? 0;
    return [
      row.assessment.name,
      row.sourceName,
      row.productName,
      PATTERN_LABELS[row.result.recommended],
      PATTERN_LABELS[row.selected],
      row.overridden ? "Yes" : "No",
      `${row.result.confidence}%`,
      score("physical"),
      score("zero-copy"),
      score("cached-acceleration"),
      `${row.result.answeredCount}/${row.result.criteriaCount}`,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...body].join("\n");
};

export const criterionLabel = (id: string): string => getCriterion(id)?.label ?? id;
