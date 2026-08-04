import { COMPONENT_CATALOG } from "@/data/architectureCatalog";
import type {
  ArchitectureRecommendationInputs,
  ArchitectureRecommendationResult,
  BlueprintComponent,
  BlueprintConnection,
  CatalogComponent,
  SecurityClassification,
} from "@/domain/phase2";
import type { AssessmentSummary } from "@/domain/phase2";
import type { IngestionPattern } from "@/domain/types";
import type { RoleId } from "@/domain/models";

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const ownerForLayer = (layer: BlueprintComponent["layer"]): RoleId => {
  switch (layer) {
    case "connectivity":
      return "data-engineer";
    case "harmonization":
      return "data360-architect";
    case "identity":
      return "data-steward";
    case "activation":
      return "data360-architect";
    case "agentforce":
      return "agentforce-architect";
    default:
      return "enterprise-architect";
  }
};

const patternFor = (
  catalog: CatalogComponent,
  inputs: ArchitectureRecommendationInputs,
): IngestionPattern | "none" => {
  if (!catalog.patterns || catalog.patterns.length === 0) return "none";
  const wantsRealTime = inputs.latency === "real-time";
  const wantsNearRealTime = inputs.latency === "near-real-time";
  if (wantsRealTime && catalog.patterns.includes("streaming")) return "streaming";
  if (inputs.volume === "high" && catalog.patterns.includes("zero-copy")) {
    return wantsNearRealTime && catalog.patterns.includes("cached-acceleration") ? "cached-acceleration" : "zero-copy";
  }
  if (wantsNearRealTime && catalog.patterns.includes("cached-acceleration")) return "cached-acceleration";
  return catalog.patterns[0];
};

const classificationFor = (catalog: CatalogComponent, regulated: boolean): SecurityClassification => {
  if (catalog.kind === "source-system" && (catalog.platform === "Core banking" || catalog.platform === "Salesforce")) {
    return regulated ? "regulated-pii" : "confidential";
  }
  if (catalog.defaultLayer === "identity") return "regulated-pii";
  if (catalog.defaultLayer === "agentforce") return "restricted";
  return "confidential";
};

const CORE_SERVICES = [
  "svc-ingestion",
  "svc-transformation",
  "svc-canonical-model",
  "svc-identity-resolution",
  "svc-unified-profile",
  "svc-calculated-insights",
  "svc-segmentation",
  "svc-activation",
  "svc-agent-execution",
  "svc-trust-controls",
  "svc-monitoring",
];

/**
 * Deterministic architecture recommendation engine. Uses selected use cases, the source
 * landscape, readiness findings and non-functional constraints to propose a layered design.
 * All output is marked AI Suggested and requires explicit human acceptance.
 */
export const recommendArchitecture = (
  initiativeId: string,
  inputs: ArchitectureRecommendationInputs,
  summary?: AssessmentSummary,
): ArchitectureRecommendationResult => {
  const regulated = inputs.regulatory.length > 0;
  const selected: CatalogComponent[] = [];

  for (const platform of inputs.sourcePlatforms) {
    const match = COMPONENT_CATALOG.find(
      (component) => component.kind === "source-system" && component.id === platform,
    );
    if (match) selected.push(match);
  }

  for (const productId of inputs.products) {
    const match = COMPONENT_CATALOG.find(
      (component) => component.kind === "salesforce-capability" && component.productId === productId,
    );
    if (match) selected.push(match);
  }

  const needsZeroCopy = inputs.volume === "high";
  for (const serviceId of CORE_SERVICES) {
    const match = COMPONENT_CATALOG.find((component) => component.id === serviceId);
    if (match) selected.push(match);
  }
  if (needsZeroCopy) {
    const zeroCopy = COMPONENT_CATALOG.find((component) => component.id === "svc-zero-copy");
    if (zeroCopy) selected.push(zeroCopy);
  }
  if (inputs.latency !== "batch") {
    const caching = COMPONENT_CATALOG.find((component) => component.id === "svc-caching");
    if (caching) selected.push(caching);
  }

  const components: BlueprintComponent[] = selected.map((catalog) => ({
    id: uid("bc"),
    initiativeId,
    catalogId: catalog.id,
    name: catalog.name,
    kind: catalog.kind,
    platform: catalog.platform,
    layer: catalog.defaultLayer,
    purpose: catalog.purpose,
    dataDomain:
      catalog.defaultLayer === "identity"
        ? "Party & Household"
        : catalog.kind === "source-system"
          ? "Source domain"
          : "Cross-domain",
    integrationPattern: patternFor(catalog, inputs),
    securityClassification: classificationFor(catalog, regulated),
    owner: ownerForLayer(catalog.defaultLayer),
    dependencies: [],
    status: "proposed",
    assumptions: [`Residency constrained to ${inputs.residency}`],
    risks: regulated ? [`Must evidence ${inputs.regulatory.join(", ")} controls before Approve gate`] : [],
    decisionIds: [],
    view: "target",
    physical: catalog.kind !== "logical-service",
    controls: regulated ? ["Encryption at rest", "Field audit trail", "Permissible-use enforcement"] : ["Encryption at rest"],
    aiSuggested: true,
    acceptance: "pending",
    rationale: `Recommended for ${inputs.useCaseIds.length} selected use case(s) at ${inputs.latency} latency and ${inputs.volume} volume.`,
  }));

  const byCatalog = (catalogId: string) => components.find((component) => component.catalogId === catalogId);
  const connections: BlueprintConnection[] = [];
  const link = (fromId?: string, toId?: string, label = "flows to", pattern: IngestionPattern | "none" = "none") => {
    if (!fromId || !toId) return;
    connections.push({ id: uid("bcx"), initiativeId, fromId, toId, label, pattern, aiSuggested: true });
  };

  const ingestion = byCatalog("svc-ingestion");
  for (const component of components.filter((entry) => entry.kind === "source-system")) {
    link(component.id, ingestion?.id, component.integrationPattern === "none" ? "ingests" : component.integrationPattern, component.integrationPattern);
  }
  link(ingestion?.id, byCatalog("svc-transformation")?.id, "harmonises");
  link(byCatalog("svc-transformation")?.id, byCatalog("svc-canonical-model")?.id, "maps to canonical");
  link(byCatalog("svc-canonical-model")?.id, byCatalog("svc-identity-resolution")?.id, "resolves");
  link(byCatalog("svc-identity-resolution")?.id, byCatalog("svc-unified-profile")?.id, "produces");
  link(byCatalog("svc-unified-profile")?.id, byCatalog("svc-calculated-insights")?.id, "derives");
  link(byCatalog("svc-unified-profile")?.id, byCatalog("svc-segmentation")?.id, "segments");
  link(byCatalog("svc-segmentation")?.id, byCatalog("svc-activation")?.id, "activates");
  link(byCatalog("svc-activation")?.id, byCatalog("svc-orchestration")?.id, "orchestrates");
  link(byCatalog("svc-unified-profile")?.id, byCatalog("svc-agent-execution")?.id, "grounds");
  link(byCatalog("svc-trust-controls")?.id, byCatalog("svc-agent-execution")?.id, "governs");
  for (const activationTarget of components.filter(
    (entry) => entry.kind === "salesforce-capability" && entry.layer === "activation",
  )) {
    link(byCatalog("svc-activation")?.id, activationTarget.id, "publishes to");
  }

  const findingGaps = (summary?.gaps ?? []).slice(0, 4).map((gap) => gap.title);

  return {
    components,
    connections,
    rationale: [
      `${inputs.useCaseIds.length} selected use case(s) require resolved party and household profiles, so identity resolution and unified profile services are mandatory in layer 3.`,
      inputs.volume === "high"
        ? "High data volume favours zero-copy access to the lakehouse over full physical replication."
        : "Moderate volume allows physical ingestion with scheduled incremental loads.",
      inputs.latency === "real-time"
        ? "Real-time latency requirement introduces streaming ingestion for event-bearing sources."
        : inputs.latency === "near-real-time"
          ? "Near-real-time targets are met using cached acceleration over federated sources."
          : "Batch latency targets are met without caching.",
      regulated
        ? `Regulatory constraints (${inputs.regulatory.join(", ")}) require trust layer controls and Shield-grade auditing on layer 5.`
        : "No explicit regulatory constraints were supplied; baseline encryption controls applied.",
      `Data residency is constrained to ${inputs.residency}.`,
    ],
    assumptions: [
      "Source systems can expose incremental change data without batch-window contention.",
      "Data 360 org is provisioned in the same residency region as the source estate.",
      "Consent and permissible-use decisions are available as governed reference data.",
      inputs.identityNeeds.length > 0
        ? `Identity keys available: ${inputs.identityNeeds.join(", ")}.`
        : "Enterprise party identifier is available across in-scope sources.",
    ],
    gaps: [
      ...findingGaps,
      inputs.activation.length === 0 ? "No activation targets selected — activation layer is unvalidated." : "",
      inputs.identityNeeds.length < 2 ? "Fewer than two reliable identity keys supplied — match rates at risk." : "",
    ].filter(Boolean),
    dependencies: [
      "Core banking change-data feasibility confirmation",
      "Data 360 licence and limits validation for the selected patterns",
      "Consent service availability for activation-time enforcement",
    ],
    risks: [
      inputs.volume === "high" ? "Federated query concurrency limits may throttle peak workloads." : "Batch window contention with core banking overnight processing.",
      regulated ? "Cross-border activation may breach residency obligations without route restrictions." : "Unclassified attributes may leak into agent grounding.",
      "Household rule ambiguity can produce disputed profile rollups.",
    ],
    requiredDecisions: [
      "Ingestion pattern per source system (physical vs zero-copy vs cached)",
      "Identity resolution ruleset and household construction policy",
      "Trust layer masking and human review policy for regulated agent actions",
      "Activation routing and residency enforcement approach",
    ],
  };
};
