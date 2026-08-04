import type {
  DataProduct,
  FieldMapping,
  QualityRule,
  QualityScorecard,
  QualityDimension,
  RuleSimulationResult,
  Severity,
} from "@/domain/dataProducts";

/** Deterministic pseudo-random helper so scores are stable across renders. */
const hash = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

const seededRate = (seed: string, min: number, max: number) =>
  min + (hash(seed) % 1000) / 1000 * (max - min);

/** Attribute-level completeness of the definition itself (documentation quality). */
export const productCompleteness = (product: DataProduct): number => {
  if (product.attributes.length === 0) return 0;
  let filled = 0;
  let total = 0;
  for (const attribute of product.attributes) {
    const checks = [
      Boolean(attribute.businessName),
      Boolean(attribute.technicalName),
      Boolean(attribute.description),
      Boolean(attribute.dataType),
      Boolean(attribute.businessDefinition),
      Boolean(attribute.example ?? attribute.validValues?.length ?? attribute.derivation),
      attribute.sensitivity !== undefined,
    ];
    filled += checks.filter(Boolean).length;
    total += checks.length;
  }
  const structural = [
    product.identifiers.length > 0,
    product.relationships.length > 0,
    product.qualityRules.length > 0,
    product.controls.regulatory.length > 0,
    Boolean(product.businessPurpose),
    Boolean(product.salesforceAlignment),
  ];
  filled += structural.filter(Boolean).length * 3;
  total += structural.length * 3;
  return Math.round((filled / total) * 100);
};

/** Share of the product's attributes that have at least one accepted mapping. */
export const mappingCoverage = (product: DataProduct, mappings: readonly FieldMapping[]): number => {
  if (product.attributes.length === 0) return 0;
  const mapped = new Set(
    mappings
      .filter((mapping) => mapping.targetProductId === product.id && ["mapped", "validated"].includes(mapping.status))
      .map((mapping) => mapping.targetAttributeId),
  );
  return Math.round((mapped.size / product.attributes.length) * 100);
};

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 1, medium: 2, high: 4, critical: 8 };

export const buildScorecard = (product: DataProduct, mappings: readonly FieldMapping[]): QualityScorecard => {
  const completeness = productCompleteness(product);
  const coverage = mappingCoverage(product, mappings);

  const dimensions = new Map<QualityDimension, { total: number; count: number }>();
  for (const rule of product.qualityRules) {
    const rate = rule.dimension === "completeness" ? Math.max(60, completeness) : seededRate(`${product.id}:${rule.id}`, 84, 99.9);
    const entry = dimensions.get(rule.dimension) ?? { total: 0, count: 0 };
    entry.total += rate;
    entry.count += 1;
    dimensions.set(rule.dimension, entry);
  }

  const byDimension = [...dimensions.entries()].map(([dimension, entry]) => ({
    dimension,
    score: Math.round(entry.total / entry.count),
    rules: entry.count,
  }));

  const criticalIssues = product.qualityRules
    .map((rule) => {
      const rate = rule.dimension === "completeness" ? Math.max(60, completeness) : seededRate(`${product.id}:${rule.id}`, 84, 99.9);
      return { rule, rate };
    })
    .filter(({ rule, rate }) => rate < rule.threshold && SEVERITY_WEIGHT[rule.severity] >= 4)
    .map(({ rule, rate }) => ({
      id: rule.id,
      title: rule.name,
      severity: rule.severity,
      detail: `Observed ${rate.toFixed(1)}% against a ${rule.threshold}% threshold. ${rule.remediation}`,
    }));

  const dimensionAverage = byDimension.length
    ? byDimension.reduce((sum, entry) => sum + entry.score, 0) / byDimension.length
    : 0;
  const penalty = criticalIssues.reduce((sum, issue) => sum + SEVERITY_WEIGHT[issue.severity], 0);
  const qualityScore = Math.max(
    0,
    Math.round(dimensionAverage * 0.55 + coverage * 0.25 + completeness * 0.2 - penalty),
  );

  return { productId: product.id, completeness, mappingCoverage: coverage, qualityScore, byDimension, criticalIssues };
};

/** Simulates rule execution against a synthetic sample of records. */
export const simulateRules = (
  product: DataProduct,
  rules: readonly QualityRule[] = product.qualityRules,
  sampleSize = 1000,
): readonly RuleSimulationResult[] =>
  rules.map((rule) => {
    const passRate = seededRate(`${product.id}:${rule.id}:sim`, 82, 100);
    const recordsPassed = Math.round((passRate / 100) * sampleSize);
    const failed = sampleSize - recordsPassed;
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      dimension: rule.dimension,
      recordsEvaluated: sampleSize,
      recordsPassed,
      passRate: Math.round(passRate * 10) / 10,
      threshold: rule.threshold,
      outcome: passRate >= rule.threshold ? "pass" : "fail",
      failedSamples: Array.from({ length: Math.min(3, failed) }, (_, index) => {
        const id = (hash(`${rule.id}${index}`) % 900000) + 100000;
        return `${product.name.replace(/\s+/g, "").toUpperCase()}-${id}`;
      }),
    };
  });

export interface MappingDiagnostics {
  readonly coverage: number;
  readonly unmappedAttributes: readonly { readonly id: string; readonly name: string; readonly required: boolean }[];
  readonly duplicateTargets: readonly { readonly attributeId: string; readonly name: string; readonly count: number }[];
  readonly requiredGaps: readonly string[];
  readonly conflicts: readonly string[];
}

export const diagnoseMappings = (
  product: DataProduct,
  mappings: readonly FieldMapping[],
): MappingDiagnostics => {
  const scoped = mappings.filter((mapping) => mapping.targetProductId === product.id);
  const counts = new Map<string, number>();
  for (const mapping of scoped) {
    if (mapping.status === "rejected") continue;
    counts.set(mapping.targetAttributeId, (counts.get(mapping.targetAttributeId) ?? 0) + 1);
  }

  const unmappedAttributes = product.attributes
    .filter((attribute) => !counts.has(attribute.id))
    .map((attribute) => ({ id: attribute.id, name: attribute.businessName, required: attribute.required }));

  const duplicateTargets = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([attributeId, count]) => ({
      attributeId,
      name: product.attributes.find((attribute) => attribute.id === attributeId)?.businessName ?? attributeId,
      count,
    }));

  const requiredGaps = unmappedAttributes.filter((attribute) => attribute.required).map((attribute) => attribute.name);

  const conflicts = scoped
    .filter((mapping) => mapping.status === "mapped" && mapping.testStatus === "failed")
    .map((mapping) => {
      const attribute = product.attributes.find((item) => item.id === mapping.targetAttributeId);
      return `${attribute?.businessName ?? mapping.targetAttributeId}: transformation test failing`;
    });

  return { coverage: mappingCoverage(product, mappings), unmappedAttributes, duplicateTargets, requiredGaps, conflicts };
};

/** CSV export of the mapping specification, ready for implementation handover. */
export const mappingsToCsv = (
  product: DataProduct,
  mappings: readonly FieldMapping[],
  resolve: (mapping: FieldMapping) => { system: string; object: string; field: string },
): string => {
  const header = [
    "Source system",
    "Source object",
    "Source field",
    "Target data product",
    "Target attribute",
    "Transformations",
    "Normalization",
    "Lookup",
    "Default",
    "Validation",
    "Status",
    "Owner",
    "Confidence",
    "Test status",
    "Landing object",
    "Standardized object",
    "Key qualifier",
    "Identity relevant",
    "Derived",
    "Activation eligible",
    "Notes",
  ];
  const rows = mappings
    .filter((mapping) => mapping.targetProductId === product.id)
    .map((mapping) => {
      const source = resolve(mapping);
      const attribute = product.attributes.find((item) => item.id === mapping.targetAttributeId);
      return [
        source.system,
        source.object,
        source.field,
        product.name,
        attribute?.technicalName ?? mapping.targetAttributeId,
        mapping.transformations.map((rule) => `${rule.kind}: ${rule.expression}`).join(" | "),
        mapping.normalization ?? "",
        mapping.lookup ?? "",
        mapping.defaultValue ?? "",
        mapping.validation ?? "",
        mapping.status,
        mapping.owner,
        mapping.confidence ? `${Math.round(mapping.confidence * 100)}%` : "",
        mapping.testStatus,
        mapping.conceptualDlo ?? "",
        mapping.standardizedDmo ?? "",
        mapping.keyQualifier ?? "",
        mapping.identityRelevant ? "Yes" : "No",
        mapping.derived ? "Yes" : "No",
        mapping.activationEligible ? "Yes" : "No",
        mapping.notes ?? "",
      ];
    });
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
};
