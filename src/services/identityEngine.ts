import type {
  CandidatePair,
  ComparisonMethod,
  ExceptionAction,
  FieldComparison,
  GoldenAttribute,
  IdentityException,
  IdentityPolicy,
  MatchRule,
  NormalizationRule,
  RulePerformance,
  SampleIdentityRecord,
  SimulationRun,
  SurvivorshipRule,
  UnifiedProfile,
} from "@/domain/phase4";

/**
 * Deterministic identity resolution engine used by the studio and the simulator.
 * Pure functions only: normalization, pairwise comparison, clustering, survivorship and
 * exception detection are all explainable and reproducible for a given policy and record set.
 */

/* ----------------------------- normalization ------------------------------- */

const TITLES = ["MR", "MRS", "MS", "MISS", "DR", "PROF", "SIR"];
const SUFFIXES = ["JR", "SR", "II", "III"];
const LEGAL_SUFFIXES = ["LIMITED", "LTD", "PLC", "LLP", "LLC", "INC", "GMBH", "GROUP", "GRP"];
const THOROUGHFARE: Record<string, string> = {
  RD: "ROAD",
  ST: "STREET",
  AVE: "AVENUE",
  AV: "AVENUE",
  SQ: "SQUARE",
  CT: "COURT",
  PK: "PARK",
  VW: "VIEW",
  PL: "PLAZA",
  HL: "HILL",
  CL: "CLOSE",
  DR: "DRIVE",
  LN: "LANE",
};

export const applyNormalization = (value: string, type: NormalizationRule["type"]): string => {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  switch (type) {
    case "name":
    case "organization-name": {
      const cleaned = raw
        .toUpperCase()
        .replace(/[.'`]/g, "")
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const drop = type === "name" ? [...TITLES, ...SUFFIXES] : LEGAL_SUFFIXES;
      return cleaned
        .split(" ")
        .filter((token) => token && !drop.includes(token))
        .join(" ");
    }
    case "email": {
      const lower = raw.toLowerCase();
      const [local = "", domain = ""] = lower.split("@");
      return domain ? `${local.split("+")[0]}@${domain}` : lower;
    }
    case "phone": {
      const digits = raw.replace(/\D/g, "");
      if (digits.startsWith("44")) return `+${digits}`;
      if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
      return digits ? `+${digits}` : "";
    }
    case "date-of-birth": {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
    }
    case "national-id":
    case "business-id":
      return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    case "tax-id":
    case "account-id":
      return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    case "address":
      return raw
        .toUpperCase()
        .replace(/[.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((token) => THOROUGHFARE[token] ?? token)
        .join(" ");
    default:
      return raw.toUpperCase();
  }
};

/** Applies the active rules of a policy, in sequence, to a record's attributes. */
export const normalizeRecord = (
  record: SampleIdentityRecord,
  rules: readonly NormalizationRule[],
): Record<string, string> => {
  const result: Record<string, string> = { ...record.attributes };
  const ordered = [...rules].filter((rule) => rule.active).sort((a, b) => a.sequence - b.sequence);
  for (const rule of ordered) {
    const value = result[rule.field];
    if (value === undefined) continue;
    result[rule.field] = applyNormalization(value, rule.type);
  }
  if (result.fullName === undefined && (result.firstName || result.lastName)) {
    result.fullName = `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim();
  }
  if (result.fullName) result.fullName = applyNormalization(result.fullName, "name");
  return result;
};

/* ------------------------------ comparisons -------------------------------- */

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

const fuzzyRatio = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  const longest = Math.max(a.length, b.length);
  return Math.max(0, 1 - distance / longest);
};

const soundex = (value: string): string => {
  const codes: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };
  const upper = value.toUpperCase().replace(/[^A-Z]/g, "");
  if (!upper) return "";
  let result = upper[0];
  let previous = codes[upper[0]] ?? "";
  for (const letter of upper.slice(1)) {
    const code = codes[letter] ?? "";
    if (code && code !== previous) result += code;
    if (letter !== "H" && letter !== "W") previous = code;
    if (result.length === 4) break;
  }
  return result.padEnd(4, "0");
};

export const compareValues = (left: string, right: string, comparison: ComparisonMethod): number => {
  const a = (left ?? "").trim();
  const b = (right ?? "").trim();
  if (!a || !b) return 0;
  switch (comparison) {
    case "exact":
      return a === b ? 1 : 0;
    case "normalized-exact":
      return a.toUpperCase() === b.toUpperCase() ? 1 : 0;
    case "fuzzy":
      return fuzzyRatio(a.toUpperCase(), b.toUpperCase());
    case "phonetic":
      return soundex(a) === soundex(b) ? 1 : fuzzyRatio(a.toUpperCase(), b.toUpperCase()) * 0.6;
    case "numeric-tolerance": {
      const x = Number(a.replace(/[^\d.-]/g, ""));
      const y = Number(b.replace(/[^\d.-]/g, ""));
      if (Number.isNaN(x) || Number.isNaN(y)) return 0;
      const scale = Math.max(Math.abs(x), Math.abs(y), 1);
      return Math.max(0, 1 - Math.abs(x - y) / scale);
    }
    case "date-tolerance": {
      if (a === b) return 1;
      const x = new Date(a).getTime();
      const y = new Date(b).getTime();
      if (Number.isNaN(x) || Number.isNaN(y)) return 0;
      const days = Math.abs(x - y) / 86_400_000;
      /** Transposed day/month values are a common data entry error: treat as partial evidence. */
      if (days === 0) return 1;
      if (a.slice(0, 4) === b.slice(0, 4) && a.slice(5, 7) === b.slice(8, 10) && a.slice(8, 10) === b.slice(5, 7)) {
        return 0.7;
      }
      return days <= 1 ? 0.9 : 0;
    }
    default:
      return 0;
  }
};

/* -------------------------------- matching --------------------------------- */

const riskBand = (value: number): "low" | "medium" | "high" =>
  value >= 0.66 ? "high" : value >= 0.33 ? "medium" : "low";

const evaluatePair = (
  rule: MatchRule,
  left: { record: SampleIdentityRecord; values: Record<string, string> },
  right: { record: SampleIdentityRecord; values: Record<string, string> },
  thresholdShift: number,
): CandidatePair => {
  const totalWeight = rule.fields.reduce((sum, field) => sum + field.weight, 0) || 1;
  const comparisons: FieldComparison[] = rule.fields.map((field) => {
    const similarity = compareValues(left.values[field.field] ?? "", right.values[field.field] ?? "", field.comparison);
    return {
      field: field.field,
      comparison: field.comparison,
      leftValue: left.values[field.field] ?? "",
      rightValue: right.values[field.field] ?? "",
      similarity: Number(similarity.toFixed(3)),
      weight: field.weight,
      contribution: Number(((similarity * field.weight) / totalWeight * 100).toFixed(1)),
    };
  });

  let score = comparisons.reduce((sum, entry) => sum + entry.contribution, 0);

  const negatives: string[] = [];
  const positives: string[] = [];

  /** Conflicting populated identifiers are hard negative evidence for every rule kind. */
  for (const key of ["nationalId", "taxId"]) {
    const l = left.values[key];
    const r = right.values[key];
    if (l && r && l !== r) {
      negatives.push(`Different ${key === "taxId" ? "tax identifier" : "national identifier"} (${l} vs ${r})`);
      score = Math.min(score, 45);
    }
  }
  const dobLeft = left.values.dob;
  const dobRight = right.values.dob;
  if (dobLeft && dobRight && dobLeft !== dobRight) {
    negatives.push(`Date of birth differs (${dobLeft} vs ${dobRight})`);
    score -= 12;
  }
  if (left.values.nationalId && left.values.nationalId === right.values.nationalId) {
    positives.push("Matching national identifier");
  }
  if (left.values.email && left.values.email === right.values.email) positives.push("Matching normalised email");
  if (left.values.phone && left.values.phone === right.values.phone) positives.push("Matching normalised phone");
  if (left.record.verified && right.record.verified) positives.push("Both records verified at source");

  if (rule.kind === "negative" || rule.kind === "exclusion") {
    /** Guard rules never link; they only surface conflicts. */
    score = negatives.length > 0 ? Math.min(score, 40) : score;
  }

  score = Math.max(0, Math.min(100, Number(score.toFixed(1))));
  const auto = rule.autoLinkThreshold + thresholdShift;
  const review = rule.manualReviewThreshold + thresholdShift;

  const outcome: CandidatePair["outcome"] =
    rule.kind === "exclusion" || (rule.kind === "negative" && negatives.length > 0)
      ? "excluded"
      : score >= auto
        ? "auto-link"
        : score >= review
          ? "manual-review"
          : "no-match";

  const margin = Math.abs(score - auto) / 100;
  return {
    id: `${rule.id}:${left.record.id}:${right.record.id}`,
    leftId: left.record.id,
    rightId: right.record.id,
    ruleId: rule.id,
    ruleName: rule.name,
    score,
    outcome,
    comparisons,
    positiveEvidence: [...positives, ...rule.positiveEvidence],
    negativeEvidence: [...negatives, ...rule.negativeEvidence],
    falsePositiveRisk: riskBand(outcome === "auto-link" ? (negatives.length ? 0.8 : 1 - margin * 2) : 0.2),
    falseNegativeRisk: riskBand(outcome === "manual-review" ? 1 - margin * 2 : outcome === "no-match" ? score / 200 : 0.1),
  };
};

/* -------------------------------- clustering ------------------------------- */

const clusterRecords = (recordIds: readonly string[], links: readonly [string, string][]) => {
  const parent = new Map<string, string>(recordIds.map((id) => [id, id]));
  const find = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current) as string;
    return current;
  };
  for (const [a, b] of links) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }
  const groups = new Map<string, string[]>();
  for (const id of recordIds) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }
  return [...groups.values()];
};

/* ------------------------------ survivorship ------------------------------- */

const strategyPick = (
  rule: SurvivorshipRule,
  candidates: readonly { record: SampleIdentityRecord; value: string }[],
): { record: SampleIdentityRecord; value: string } | undefined => {
  const populated = candidates.filter((entry) => entry.value);
  if (populated.length === 0) return undefined;
  switch (rule.strategy) {
    case "source-priority":
    case "trusted-source": {
      for (const sourceId of rule.sourcePriority) {
        const hit = populated.find((entry) => entry.record.sourceSystemId === sourceId);
        if (hit) return hit;
      }
      return populated[0];
    }
    case "most-recent":
      return [...populated].sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt))[0];
    case "most-complete":
      return [...populated].sort((a, b) => b.value.length - a.value.length)[0];
    case "verified-value":
      return populated.find((entry) => entry.record.verified) ?? populated[0];
    case "non-null-preference":
      return populated[0];
    case "manual-override":
      return populated[0];
    case "custom-logic":
      return [...populated].sort((a, b) => b.value.length - a.value.length)[0];
    default:
      return populated[0];
  }
};

const DEFAULT_SURVIVORSHIP: SurvivorshipRule = {
  id: "sv-default",
  attribute: "*",
  strategy: "most-recent",
  sourcePriority: [],
  notes: "Default policy: most recently updated non-null value.",
};

export const buildUnifiedProfile = (
  clusterId: string,
  policy: IdentityPolicy,
  records: readonly { record: SampleIdentityRecord; values: Record<string, string> }[],
): UnifiedProfile => {
  const attributeNames = [...new Set(records.flatMap((entry) => Object.keys(entry.values)))].sort();
  const attributes: GoldenAttribute[] = [];

  for (const attribute of attributeNames) {
    const rule = policy.survivorshipRules.find((entry) => entry.attribute === attribute) ?? DEFAULT_SURVIVORSHIP;
    const candidates = records.map((entry) => ({ record: entry.record, value: entry.values[attribute] ?? "" }));
    const winner = strategyPick(rule, candidates);
    if (!winner) continue;
    const distinct = [...new Set(candidates.filter((entry) => entry.value).map((entry) => entry.value))];
    const conflicts = candidates
      .filter((entry) => entry.value && entry.value !== winner.value)
      .map((entry) => ({ value: entry.value, sourceLabel: entry.record.sourceLabel }));
    const critical = ["nationalId", "taxId", "dob"].includes(attribute);
    attributes.push({
      attribute,
      value: winner.value,
      sourceRecordId: winner.record.id,
      sourceLabel: winner.record.sourceLabel,
      strategy: rule.strategy,
      confidence: Math.round(100 - Math.min(45, (distinct.length - 1) * 18)),
      conflicts,
      exception: critical && conflicts.length > 0,
    });
  }

  const exceptionCount = attributes.filter((entry) => entry.exception).length;
  const confidence = Math.round(
    attributes.reduce((sum, entry) => sum + entry.confidence, 0) / Math.max(1, attributes.length) - exceptionCount * 5,
  );

  return {
    clusterId,
    entity: policy.entity,
    recordIds: records.map((entry) => entry.record.id),
    attributes,
    confidence: Math.max(0, Math.min(100, confidence)),
    exceptionCount,
  };
};

/* ------------------------------- simulation -------------------------------- */

export interface SimulationInput {
  readonly policy: IdentityPolicy;
  readonly records: readonly SampleIdentityRecord[];
  readonly setId: string;
  readonly initiativeId: string;
  readonly runBy: string;
  readonly thresholdShift?: number;
}

const BUCKETS: readonly { label: string; min: number; max: number }[] = [
  { label: "0-54", min: 0, max: 55 },
  { label: "55-69", min: 55, max: 70 },
  { label: "70-84", min: 70, max: 85 },
  { label: "85-94", min: 85, max: 95 },
  { label: "95-100", min: 95, max: 101 },
];

export const runSimulation = (input: SimulationInput): SimulationRun => {
  const { policy, records, thresholdShift = 0 } = input;
  const prepared = records.map((record) => ({ record, values: normalizeRecord(record, policy.normalizationRules) }));
  const activeRules = [...policy.matchRules].filter((rule) => rule.active).sort((a, b) => a.priority - b.priority);

  const pairs: CandidatePair[] = [];
  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      for (const rule of activeRules) {
        /** Blocking keys limit the comparison space exactly as a production resolution run would. */
        const blocked =
          rule.blocking.length > 0 &&
          !rule.blocking.some((field) => {
            const l = prepared[i].values[field];
            const r = prepared[j].values[field];
            return Boolean(l) && l === r;
          });
        if (blocked) continue;
        const pair = evaluatePair(rule, prepared[i], prepared[j], thresholdShift);
        if (pair.score <= 0) continue;
        pairs.push(pair);
      }
    }
  }

  /** Keep the best-scoring rule outcome per record pair for clustering and reporting. */
  const bestByPair = new Map<string, CandidatePair>();
  for (const pair of pairs) {
    const key = `${pair.leftId}|${pair.rightId}`;
    const existing = bestByPair.get(key);
    if (!existing || pair.score > existing.score) bestByPair.set(key, pair);
  }
  const resolvedPairs = [...bestByPair.values()].sort((a, b) => b.score - a.score);

  const excluded = new Set(
    resolvedPairs.filter((pair) => pair.outcome === "excluded").map((pair) => `${pair.leftId}|${pair.rightId}`),
  );
  const links = resolvedPairs
    .filter((pair) => pair.outcome === "auto-link" && !excluded.has(`${pair.leftId}|${pair.rightId}`))
    .map((pair) => [pair.leftId, pair.rightId] as [string, string]);

  const clusters = clusterRecords(
    prepared.map((entry) => entry.record.id),
    links,
  );

  const profiles = clusters.map((ids, index) =>
    buildUnifiedProfile(
      `cluster-${index + 1}`,
      policy,
      prepared.filter((entry) => ids.includes(entry.record.id)),
    ),
  );

  const rulePerformance: RulePerformance[] = activeRules.map((rule) => {
    const ruleAll = pairs.filter((pair) => pair.ruleId === rule.id);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      pairsEvaluated: ruleAll.length,
      autoLinked: ruleAll.filter((pair) => pair.outcome === "auto-link").length,
      manualReview: ruleAll.filter((pair) => pair.outcome === "manual-review").length,
      noMatch: ruleAll.filter((pair) => pair.outcome === "no-match").length,
      averageScore: Number(
        (ruleAll.reduce((sum, pair) => sum + pair.score, 0) / Math.max(1, ruleAll.length)).toFixed(1),
      ),
    };
  });

  const autoMatched = resolvedPairs.filter((pair) => pair.outcome === "auto-link").length;
  const manualReview = resolvedPairs.filter((pair) => pair.outcome === "manual-review").length;
  const matchedClusters = profiles.filter((profile) => profile.recordIds.length > 1).length;
  const unmatched = profiles.filter((profile) => profile.recordIds.length === 1).length;

  return {
    id: `sim-${Date.now().toString(36)}`,
    policyId: policy.id,
    setId: input.setId,
    initiativeId: input.initiativeId,
    runAt: new Date().toISOString(),
    runBy: input.runBy,
    thresholdShift,
    totalRecords: records.length,
    matchedClusters,
    autoMatched,
    manualReview,
    unmatched,
    potentialDuplicates: resolvedPairs.filter(
      (pair) => pair.outcome === "manual-review" || (pair.outcome === "auto-link" && pair.negativeEvidence.length > 0),
    ).length,
    confidenceDistribution: BUCKETS.map((bucket) => ({
      bucket: bucket.label,
      count: resolvedPairs.filter((pair) => pair.score >= bucket.min && pair.score < bucket.max).length,
    })),
    rulePerformance,
    pairs: resolvedPairs,
    profiles,
    falsePositiveRisk: resolvedPairs.filter((pair) => pair.outcome === "auto-link" && pair.falsePositiveRisk !== "low")
      .length,
    falseNegativeRisk: resolvedPairs.filter((pair) => pair.outcome === "no-match" && pair.score >= 45).length,
  };
};

/* ------------------------------- exceptions -------------------------------- */

const recommendAction = (pair: CandidatePair): { action: ExceptionAction; rationale: string; confidence: number } => {
  if (pair.negativeEvidence.length > 0) {
    return {
      action: "keep-separate",
      rationale: `Negative evidence present: ${pair.negativeEvidence[0]}. Linking would risk a false positive on regulated identity data.`,
      confidence: 88,
    };
  }
  if (pair.score >= 85) {
    return {
      action: "merge",
      rationale: "Score is close to the auto-link threshold with consistent identifiers and no conflicts.",
      confidence: 82,
    };
  }
  if (pair.score >= 70) {
    return {
      action: "link-no-merge",
      rationale: "Sufficient evidence to relate the records, but not enough to collapse attributes into one golden record.",
      confidence: 71,
    };
  }
  return {
    action: "defer",
    rationale: "Evidence is weak; defer pending additional identifier enrichment.",
    confidence: 63,
  };
};

export const deriveExceptions = (
  run: SimulationRun,
  policy: IdentityPolicy,
  records: readonly SampleIdentityRecord[],
  now: () => string = () => new Date().toISOString(),
): IdentityException[] => {
  const label = (id: string) => {
    const record = records.find((entry) => entry.id === id);
    return record ? `${record.attributes.fullName ?? record.attributes.organizationName ?? id} (${record.sourceLabel})` : id;
  };
  const exceptions: IdentityException[] = [];
  const timestamp = now();
  const sla = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  run.pairs
    .filter((pair) => pair.outcome === "manual-review" || pair.negativeEvidence.length > 0)
    .slice(0, 12)
    .forEach((pair, index) => {
      const recommendation = recommendAction(pair);
      const type = pair.negativeEvidence.length > 0 ? "negative-evidence" : "ambiguous-match";
      const conflicting = pair.comparisons
        .filter((comparison) => comparison.similarity < 1 && comparison.leftValue && comparison.rightValue)
        .map((comparison) => ({ attribute: comparison.field, values: [comparison.leftValue, comparison.rightValue] }));
      exceptions.push({
        id: `exc-${run.id}-${index}`,
        initiativeId: run.initiativeId,
        policyId: policy.id,
        runId: run.id,
        type,
        entity: policy.entity,
        affectedRecordIds: [pair.leftId, pair.rightId],
        affectedLabels: [label(pair.leftId), label(pair.rightId)],
        matchConfidence: pair.score,
        conflictingAttributes: conflicting,
        recommendedAction: recommendation.action,
        recommendationRationale: recommendation.rationale,
        recommendationConfidence: recommendation.confidence,
        assignedTo: "data-steward",
        priority: pair.negativeEvidence.length > 0 ? "high" : pair.score >= 80 ? "medium" : "low",
        slaDueAt: sla(pair.negativeEvidence.length > 0 ? 2 : 5),
        status: "open",
        comments: [],
        history: [
          {
            id: `hist-${run.id}-${index}`,
            action: "created",
            actor: run.runBy,
            at: timestamp,
            detail: `Raised from simulation ${run.id} on rule ${pair.ruleName} at score ${pair.score}.`,
          },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

  run.profiles
    .filter((profile) => profile.exceptionCount > 0)
    .slice(0, 8)
    .forEach((profile, index) => {
      const conflicts = profile.attributes.filter((attribute) => attribute.exception);
      exceptions.push({
        id: `exc-${run.id}-sv-${index}`,
        initiativeId: run.initiativeId,
        policyId: policy.id,
        runId: run.id,
        type: "survivorship-conflict",
        entity: policy.entity,
        affectedRecordIds: profile.recordIds,
        affectedLabels: profile.recordIds.map(label),
        matchConfidence: profile.confidence,
        conflictingAttributes: conflicts.map((attribute) => ({
          attribute: attribute.attribute,
          values: [attribute.value, ...attribute.conflicts.map((conflict) => conflict.value)],
        })),
        recommendedAction: "rule-recommendation",
        recommendationRationale: `Conflicting values on ${conflicts
          .map((attribute) => attribute.attribute)
          .join(", ")} within a merged cluster. Tighten the survivorship rule or verify at source.`,
        recommendationConfidence: 76,
        assignedTo: "data-steward",
        priority: "high",
        slaDueAt: sla(3),
        status: "open",
        comments: [],
        history: [
          {
            id: `hist-${run.id}-sv-${index}`,
            action: "created",
            actor: run.runBy,
            at: timestamp,
            detail: `Survivorship conflict detected on cluster ${profile.clusterId}.`,
          },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

  return exceptions;
};

/* --------------------------------- exports --------------------------------- */

export const rulebookMarkdown = (policy: IdentityPolicy): string => {
  const lines: string[] = [];
  lines.push(`# Identity resolution rulebook — ${policy.name}`);
  lines.push("");
  lines.push(`- Entity: ${policy.entity}`);
  lines.push(`- Version: ${policy.version}`);
  lines.push(`- Status: ${policy.status}`);
  lines.push(`- Description: ${policy.description}`);
  lines.push("");
  lines.push("## Normalization rules");
  policy.normalizationRules.forEach((rule) =>
    lines.push(
      `- [${rule.sequence}] ${rule.field} (${rule.type}): ${rule.inputPattern} -> ${rule.outputPattern}; locale ${rule.locale}; null handling ${rule.nullHandling}; ${rule.active ? "active" : "inactive"}`,
    ),
  );
  lines.push("");
  lines.push("## Match rules");
  policy.matchRules.forEach((rule) => {
    lines.push(`### ${rule.name} (${rule.kind}, priority ${rule.priority})`);
    lines.push(
      `- Thresholds: auto-link ${rule.autoLinkThreshold}, manual review ${rule.manualReviewThreshold}, no match ${rule.noMatchThreshold}`,
    );
    lines.push(`- Blocking: ${rule.blocking.join(", ") || "none"}`);
    rule.fields.forEach((field) => lines.push(`- Field ${field.field}: ${field.comparison}, weight ${field.weight}`));
    if (rule.positiveEvidence.length) lines.push(`- Positive evidence: ${rule.positiveEvidence.join("; ")}`);
    if (rule.negativeEvidence.length) lines.push(`- Negative evidence: ${rule.negativeEvidence.join("; ")}`);
    lines.push("");
  });
  lines.push("## Survivorship");
  policy.survivorshipRules.forEach((rule) =>
    lines.push(
      `- ${rule.attribute}: ${rule.strategy}${rule.sourcePriority.length ? ` (priority ${rule.sourcePriority.join(" > ")})` : ""} — ${rule.notes}`,
    ),
  );
  lines.push("");
  lines.push("## Reconciliation");
  lines.push(policy.reconciliationNotes);
  return lines.join("\n");
};

export const simulationReportMarkdown = (run: SimulationRun, policyName: string): string => {
  const lines: string[] = [];
  lines.push(`# Identity simulation report — ${policyName}`);
  lines.push("");
  lines.push(`- Run at: ${run.runAt}`);
  lines.push(`- Records: ${run.totalRecords}`);
  lines.push(`- Matched clusters: ${run.matchedClusters}`);
  lines.push(`- Auto-matched pairs: ${run.autoMatched}`);
  lines.push(`- Manual review pairs: ${run.manualReview}`);
  lines.push(`- Unmatched singletons: ${run.unmatched}`);
  lines.push(`- Potential duplicates: ${run.potentialDuplicates}`);
  lines.push(`- Threshold shift applied: ${run.thresholdShift}`);
  lines.push("");
  lines.push("## Rule performance");
  run.rulePerformance.forEach((rule) =>
    lines.push(
      `- ${rule.ruleName}: ${rule.pairsEvaluated} pairs, ${rule.autoLinked} auto, ${rule.manualReview} review, average score ${rule.averageScore}`,
    ),
  );
  lines.push("");
  lines.push("## Confidence distribution");
  run.confidenceDistribution.forEach((bucket) => lines.push(`- ${bucket.bucket}: ${bucket.count}`));
  lines.push("");
  lines.push("## Unified profiles");
  run.profiles.forEach((profile) => {
    lines.push(`### ${profile.clusterId} (${profile.recordIds.length} records, confidence ${profile.confidence}%)`);
    profile.attributes
      .filter((attribute) => attribute.value)
      .forEach((attribute) =>
        lines.push(
          `- ${attribute.attribute}: ${attribute.value} [${attribute.strategy} via ${attribute.sourceLabel}]${
            attribute.conflicts.length ? ` conflicts: ${attribute.conflicts.map((c) => c.value).join(", ")}` : ""
          }`,
        ),
      );
    lines.push("");
  });
  return lines.join("\n");
};

export const matchRuleSpecCsv = (policy: IdentityPolicy): string => {
  const header = [
    "Rule",
    "Kind",
    "Priority",
    "Field",
    "Comparison",
    "Weight",
    "Auto link",
    "Manual review",
    "No match",
    "Blocking",
    "Active",
  ];
  const rows = policy.matchRules.flatMap((rule) =>
    rule.fields.map((field) =>
      [
        rule.name,
        rule.kind,
        rule.priority,
        field.field,
        field.comparison,
        field.weight,
        rule.autoLinkThreshold,
        rule.manualReviewThreshold,
        rule.noMatchThreshold,
        rule.blocking.join(" | ") || "none",
        rule.active ? "Yes" : "No",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    ),
  );
  return [header.join(","), ...rows].join("\n");
};

export const survivorshipSpecCsv = (policy: IdentityPolicy): string => {
  const header = ["Attribute", "Strategy", "Source priority", "Notes"];
  const rows = policy.survivorshipRules.map((rule) =>
    [rule.attribute, rule.strategy, rule.sourcePriority.join(" > ") || "n/a", rule.notes]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
};

export const exceptionLogCsv = (exceptions: readonly IdentityException[]): string => {
  const header = [
    "Exception",
    "Type",
    "Entity",
    "Records",
    "Confidence",
    "Recommended action",
    "Assigned to",
    "Priority",
    "SLA due",
    "Status",
    "Resolution",
  ];
  const rows = exceptions.map((exception) =>
    [
      exception.id,
      exception.type,
      exception.entity,
      exception.affectedLabels.join(" | "),
      `${exception.matchConfidence}`,
      exception.recommendedAction,
      exception.assignedTo,
      exception.priority,
      exception.slaDueAt.slice(0, 10),
      exception.status,
      exception.resolution ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
};
