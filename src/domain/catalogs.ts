import type {
  ExcludedProduct,
  Industry,
  LifecycleStage,
  Persona,
  PlatformConcept,
  SalesforceProduct,
  SourcePlatform,
} from "./types";

/** Ordered Axion delivery lifecycle. */
export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  {
    id: "discover",
    order: 1,
    name: "Discover",
    purpose: "Capture business context, source landscape, data domains and candidate use cases.",
    deliveredInPhase: 1,
  },
  {
    id: "assess",
    order: 2,
    name: "Assess",
    purpose: "Score readiness across data, governance, platform and operating model dimensions.",
    deliveredInPhase: 1,
  },
  {
    id: "design",
    order: 3,
    name: "Design",
    purpose: "Blueprint data products, canonical domain models and target architecture.",
    deliveredInPhase: 2,
  },
  {
    id: "configure",
    order: 4,
    name: "Configure",
    purpose: "Author source-to-target mappings, DLO/DMO alignment, identity resolution and activation.",
    deliveredInPhase: 3,
  },
  {
    id: "validate",
    order: 5,
    name: "Validate",
    purpose: "Execute data quality, profile unification and agent behaviour test suites.",
    deliveredInPhase: 4,
  },
  {
    id: "approve",
    order: 6,
    name: "Approve",
    purpose: "Route architecture, governance and regulatory sign-off with a full decision record.",
    deliveredInPhase: 4,
  },
  {
    id: "deploy",
    order: 7,
    name: "Deploy",
    purpose: "Generate release artifacts and track promotion across environments.",
    deliveredInPhase: 5,
  },
  {
    id: "monitor",
    order: 8,
    name: "Monitor",
    purpose: "Observe ingestion health, profile quality, agent performance and trust controls.",
    deliveredInPhase: 6,
  },
  {
    id: "improve",
    order: 9,
    name: "Improve",
    purpose: "Feed findings back into blueprints, backlog and readiness scores.",
    deliveredInPhase: 6,
  },
] as const;

export const getStage = (id: string): LifecycleStage | undefined =>
  LIFECYCLE_STAGES.find((stage) => stage.id === id);

export const PERSONAS: readonly Persona[] = [
  {
    id: "executive-sponsor",
    name: "Executive Sponsor",
    summary: "Owns outcomes, value case and investment decisions across the program.",
    stages: ["discover", "assess", "approve", "monitor", "improve"],
  },
  {
    id: "enterprise-architect",
    name: "Enterprise Architect",
    summary: "Owns target architecture, platform standards and cross-domain coherence.",
    stages: ["assess", "design", "approve", "deploy"],
  },
  {
    id: "data360-architect",
    name: "Data 360 Architect",
    summary: "Owns Data 360 data spaces, DLO/DMO alignment, identity resolution and activation.",
    stages: ["design", "configure", "validate", "deploy"],
  },
  {
    id: "data-steward",
    name: "Data Steward",
    summary: "Owns domain definitions, data quality rules, classification and regulatory mapping.",
    stages: ["discover", "design", "validate", "improve"],
  },
  {
    id: "data-engineer",
    name: "Data Engineer",
    summary: "Owns ingestion patterns, transformations and pipeline operability.",
    stages: ["configure", "validate", "deploy", "monitor"],
  },
  {
    id: "agentforce-architect",
    name: "Agentforce Architect",
    summary: "Owns agent topics, actions, grounding and trust layer controls.",
    stages: ["design", "configure", "validate", "monitor"],
  },
] as const;

export const getPersona = (id: string): Persona | undefined => PERSONAS.find((p) => p.id === id);

export const INDUSTRIES: readonly { id: Industry; name: string; enabled: boolean; note: string }[] = [
  { id: "BFSI", name: "Banking, Financial Services & Insurance", enabled: true, note: "Initial release industry." },
  { id: "HLS", name: "Healthcare & Life Sciences", enabled: false, note: "Planned expansion." },
  { id: "RCPG", name: "Retail & Consumer Packaged Goods", enabled: false, note: "Planned expansion." },
] as const;

export const SALESFORCE_PRODUCTS: readonly SalesforceProduct[] = [
  { id: "data-360", name: "Data 360 / Data Cloud", category: "data", industries: ["BFSI", "HLS", "RCPG"] },
  { id: "agentforce", name: "Agentforce", category: "agent", industries: ["BFSI", "HLS", "RCPG"] },
  { id: "sales-cloud", name: "Sales Cloud", category: "crm", industries: ["BFSI", "HLS", "RCPG"] },
  { id: "service-cloud", name: "Service Cloud", category: "crm", industries: ["BFSI", "HLS", "RCPG"] },
  { id: "marketing-cloud", name: "Marketing Cloud", category: "engagement", industries: ["BFSI", "HLS", "RCPG"] },
  { id: "financial-services-cloud", name: "Financial Services Cloud", category: "crm", industries: ["BFSI"] },
  { id: "health-cloud", name: "Health Cloud", category: "crm", industries: ["HLS"] },
  { id: "consumer-goods-cloud", name: "Consumer Goods Cloud", category: "crm", industries: ["RCPG"] },
  { id: "loyalty-management", name: "Loyalty Management", category: "engagement", industries: ["RCPG", "BFSI"] },
  { id: "tableau", name: "Tableau", category: "analytics", industries: ["BFSI", "HLS", "RCPG"] },
  { id: "shield", name: "Salesforce Shield", category: "security", industries: ["BFSI", "HLS", "RCPG"] },
] as const;

export const getProduct = (id: string): SalesforceProduct | undefined =>
  SALESFORCE_PRODUCTS.find((p) => p.id === id);

/** Explicitly out of scope for the current Axion release. Never surface as selectable. */
export const EXCLUDED_PRODUCTS: readonly ExcludedProduct[] = [
  { id: "mulesoft", name: "MuleSoft", reason: "Out of scope for the current Axion release." },
  { id: "data-mask", name: "Salesforce Data Mask", reason: "Out of scope for the current Axion release." },
  { id: "privacy-center", name: "Privacy Center", reason: "Out of scope for the current Axion release." },
  { id: "devops-center", name: "DevOps Center and DevOps tooling", reason: "Out of scope for the current Axion release." },
] as const;

export const SOURCE_PLATFORMS: readonly SourcePlatform[] = [
  { id: "salesforce", name: "Salesforce", category: "crm", supportedPatterns: ["physical", "streaming"] },
  { id: "snowflake", name: "Snowflake", category: "lakehouse", supportedPatterns: ["zero-copy", "cached-acceleration", "physical"] },
  { id: "databricks", name: "Databricks", category: "lakehouse", supportedPatterns: ["zero-copy", "cached-acceleration", "physical"] },
  { id: "aws", name: "AWS", category: "cloud", supportedPatterns: ["physical", "zero-copy", "streaming"] },
  { id: "azure", name: "Microsoft Azure", category: "cloud", supportedPatterns: ["physical", "zero-copy", "streaming"] },
  { id: "sap", name: "SAP", category: "erp", supportedPatterns: ["physical"] },
  { id: "oracle", name: "Oracle", category: "erp", supportedPatterns: ["physical"] },
  { id: "core-banking", name: "Core Banking Platforms", category: "industry", supportedPatterns: ["physical", "streaming"] },
  { id: "commerce", name: "Commerce Platforms", category: "engagement", supportedPatterns: ["physical", "streaming"] },
  { id: "loyalty", name: "Loyalty Platforms", category: "engagement", supportedPatterns: ["physical", "cached-acceleration"] },
] as const;

export const PLATFORM_CONCEPTS: readonly PlatformConcept[] = [
  { id: "data-product-blueprinting", name: "Data Product Blueprinting", group: "blueprinting", description: "Define consumable data products with owners, contracts and consumers.", stages: ["design"] },
  { id: "canonical-domain-modeling", name: "Canonical Domain Modeling", group: "modeling", description: "Model canonical entities and attributes per business domain.", stages: ["design"] },
  { id: "source-to-target-mapping", name: "Source-to-Target Mapping", group: "modeling", description: "Map source fields to canonical and Data 360 targets with transformations.", stages: ["configure"] },
  { id: "dlo-dmo-alignment", name: "Data 360 DLO/DMO Alignment", group: "modeling", description: "Align data lake objects and data model objects to the canonical model.", stages: ["configure"] },
  { id: "physical-ingestion", name: "Physical Ingestion", group: "integration", description: "Batch and streaming ingestion into Data 360.", stages: ["configure", "deploy"] },
  { id: "zero-copy", name: "Zero-Copy Access", group: "integration", description: "Federated access to lakehouse data without duplication.", stages: ["design", "configure"] },
  { id: "cached-acceleration", name: "Cached Acceleration", group: "integration", description: "Accelerate federated reads for latency-sensitive consumption.", stages: ["configure"] },
  { id: "identity-resolution", name: "Identity Resolution", group: "identity", description: "Match and reconcile party records into resolved identities.", stages: ["configure", "validate"] },
  { id: "unified-profiles", name: "Unified Profiles", group: "identity", description: "Assemble unified individual and account profiles with calculated insights.", stages: ["configure", "validate"] },
  { id: "activation-orchestration", name: "Activation and Orchestration", group: "activation", description: "Publish segments and signals to engagement and operational systems.", stages: ["configure", "deploy"] },
  { id: "agentforce-implementation", name: "Agentforce Implementation", group: "agent", description: "Define agent topics, actions, grounding and escalation paths.", stages: ["design", "configure"] },
  { id: "trust-layer-controls", name: "Trust Layer Controls", group: "governance", description: "Configure masking, grounding limits, audit and toxicity controls.", stages: ["configure", "validate", "monitor"] },
  { id: "governance-regulatory-mapping", name: "Governance and Regulatory Mapping", group: "governance", description: "Map controls to regulatory obligations and evidence.", stages: ["assess", "approve"] },
  { id: "testing-release-readiness", name: "Testing and Release Readiness", group: "release", description: "Test suites and gates that determine release readiness.", stages: ["validate", "approve"] },
  { id: "artifact-generation", name: "Artifact Generation", group: "release", description: "Generate design, configuration and deployment artifacts.", stages: ["deploy"] },
  { id: "monitoring-improvement", name: "Monitoring and Continuous Improvement", group: "operations", description: "Operational telemetry feeding continuous improvement.", stages: ["monitor", "improve"] },
] as const;
