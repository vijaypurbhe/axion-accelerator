import type {
  ConnectivityPatternId,
  CriterionOption,
  DecisionCriterion,
  PatternGuidance,
  PlatformConnectivityGuidance,
} from "@/domain/phase4";

/**
 * Connectivity decision catalog. Criteria, weights and platform guidance are pure metadata so a
 * live policy adapter can replace this module without changing the engine or the UI.
 */

type ScoreTuple = [physical: number, zeroCopy: number, cached: number];

const opt = (
  value: string,
  label: string,
  [physical, zeroCopy, cached]: ScoreTuple,
  extra?: { disqualifies?: readonly ConnectivityPatternId[]; note?: string },
): CriterionOption => ({
  value,
  label,
  scores: { physical, "zero-copy": zeroCopy, "cached-acceleration": cached },
  disqualifies: extra?.disqualifies,
  note: extra?.note,
});

export const DECISION_CRITERIA: readonly DecisionCriterion[] = [
  {
    id: "source-platform",
    label: "Source platform class",
    group: "profile",
    question: "What class of platform holds the data?",
    helpText: "Lakehouse platforms support live federation; transactional cores usually do not.",
    defaultWeight: 5,
    options: [
      opt("lakehouse", "Cloud lakehouse or warehouse (Snowflake, Databricks, BigQuery)", [0, 2, 2]),
      opt("cloud-object", "Cloud object storage (S3, ADLS)", [2, 1, 1]),
      opt("saas", "SaaS application API (Salesforce, commerce, loyalty)", [2, 0, 1]),
      opt("erp", "ERP or packaged application (SAP, Oracle)", [2, -1, 1]),
      opt("core-banking", "Core banking / transactional system of record", [2, -2, 1], {
        note: "Federated query against a core banking system is rarely acceptable.",
      }),
      opt("file", "File drops or batch extracts", [2, -2, -1], { disqualifies: ["zero-copy"] }),
      opt("mes-scada", "MES / SCADA historian inside an OT zone", [2, -2, 1], {
        disqualifies: ["zero-copy"],
        note: "Federated query into a plant execution or historian system is not permitted across the OT boundary.",
      }),
      opt("plm", "PLM / engineering vault (Teamcenter, Windchill)", [2, -1, 1], {
        note: "Engineering data needs export-control screening before ingestion.",
      }),
      opt("eam-cmms", "EAM / CMMS asset management (Maximo, SAP PM)", [2, -1, 1]),
      opt("iot-telematics", "IoT or telematics platform (high-cardinality events)", [-1, 1, 2], {
        note: "Aggregate at the edge or in the platform; only land derived signals.",
      }),
      opt("dms", "Dealer management system or dealer network feed", [2, -2, 1], {
        disqualifies: ["zero-copy"],
        note: "Dealer estates are heterogeneous; standardise via a broker and land physically.",
      }),
      opt("warranty-parts", "Warranty, parts or supplier portal application", [2, -1, 1]),
    ],
  },
  {
    id: "data-volume",
    label: "Data volume",
    group: "profile",
    question: "How large is the in-scope dataset?",
    helpText: "Very large datasets favour leaving data in place.",
    defaultWeight: 4,
    options: [
      opt("small", "Under 10 GB", [2, 0, 0]),
      opt("medium", "10 GB - 1 TB", [1, 1, 1]),
      opt("large", "1 TB - 50 TB", [-1, 2, 1]),
      opt("very-large", "Above 50 TB", [-2, 2, 1]),
    ],
  },
  {
    id: "record-growth",
    label: "Record growth",
    group: "profile",
    question: "How fast does the dataset grow?",
    helpText: "High growth increases the storage and reconciliation cost of copies.",
    defaultWeight: 3,
    options: [
      opt("low", "Low - under 5% per year", [1, 0, 0]),
      opt("moderate", "Moderate - 5-25% per year", [0, 1, 1]),
      opt("high", "High - above 25% per year", [-1, 2, 1]),
    ],
  },
  {
    id: "update-frequency",
    label: "Update frequency",
    group: "profile",
    question: "How often do source records change?",
    helpText: "Continuous change makes scheduled copies drift quickly.",
    defaultWeight: 4,
    options: [
      opt("monthly", "Monthly or slower", [2, -1, 0]),
      opt("daily", "Daily", [1, 0, 1]),
      opt("hourly", "Hourly", [0, 1, 2]),
      opt("continuous", "Continuous / near real time", [-2, 2, 1]),
    ],
  },
  {
    id: "freshness",
    label: "Required freshness",
    group: "performance",
    question: "How fresh must the data be for the use case?",
    helpText: "Sub-minute freshness is hard to guarantee with batch ingestion.",
    defaultWeight: 5,
    options: [
      opt("t1", "T+1 or later acceptable", [2, 0, 1]),
      opt("hours", "Within a few hours", [1, 1, 2]),
      opt("minutes", "Within minutes", [-1, 2, 2]),
      opt("realtime", "Real time at point of interaction", [-2, 2, 0], { disqualifies: ["physical"] }),
    ],
  },
  {
    id: "latency",
    label: "Latency expectation",
    group: "performance",
    question: "What query latency does the consuming experience need?",
    helpText: "Agent and service experiences need predictable low latency.",
    defaultWeight: 5,
    options: [
      opt("relaxed", "Seconds are acceptable (analytics)", [1, 2, 1]),
      opt("interactive", "Sub-second interactive UI", [2, -1, 2]),
      opt("agent", "Agent runtime, tens of milliseconds", [2, -2, 2], { disqualifies: ["zero-copy"] }),
    ],
  },
  {
    id: "query-frequency",
    label: "Query frequency",
    group: "performance",
    question: "How frequently will the data be queried?",
    helpText: "High query volumes against a live source create load and cost.",
    defaultWeight: 4,
    options: [
      opt("low", "Occasional / scheduled", [0, 2, 0]),
      opt("moderate", "Regular business-hours usage", [1, 1, 2]),
      opt("high", "Very high, embedded in journeys", [2, -2, 2]),
    ],
  },
  {
    id: "concurrency",
    label: "Concurrency", 
    group: "performance",
    question: "How many concurrent consumers are expected?",
    helpText: "Concurrency multiplies federated query pressure on the source.",
    defaultWeight: 3,
    options: [
      opt("low", "Under 50 concurrent", [0, 2, 1]),
      opt("medium", "50 - 500 concurrent", [1, 0, 2]),
      opt("high", "Above 500 concurrent", [2, -2, 2]),
    ],
  },
  {
    id: "transformation-complexity",
    label: "Transformation complexity",
    group: "profile",
    question: "How complex is the harmonisation logic?",
    helpText: "Heavy transformation is easier to operate on persisted data.",
    defaultWeight: 4,
    options: [
      opt("passthrough", "Pass-through with light renaming", [0, 2, 1]),
      opt("moderate", "Standardisation and lookups", [1, 1, 2]),
      opt("complex", "Multi-source joins, derivations, history", [2, -2, 1]),
    ],
  },
  {
    id: "persistence",
    label: "Persistence requirement",
    group: "profile",
    question: "Must the data be persisted inside Data 360?",
    helpText: "Some downstream capabilities require materialised data.",
    defaultWeight: 4,
    options: [
      opt("none", "No persistence needed", [0, 2, 1]),
      opt("optional", "Persistence useful but not required", [1, 1, 2]),
      opt("required", "Persistence mandatory", [2, -2, 0], { disqualifies: ["zero-copy"] }),
    ],
  },
  {
    id: "history",
    label: "Historical data requirement",
    group: "profile",
    question: "Is history or point-in-time reconstruction required?",
    helpText: "Sources that overwrite records cannot serve history through federation.",
    defaultWeight: 3,
    options: [
      opt("current", "Current state only", [0, 2, 1]),
      opt("limited", "Rolling window of history", [1, 1, 2]),
      opt("full", "Full history retained in platform", [2, -2, 0]),
    ],
  },
  {
    id: "source-performance",
    label: "Source performance headroom",
    group: "operational",
    question: "How much spare capacity does the source have?",
    helpText: "Federation places query load directly on the source system.",
    defaultWeight: 4,
    options: [
      opt("ample", "Ample headroom, elastic compute", [1, 2, 1]),
      opt("limited", "Limited headroom at peak", [1, -1, 2]),
      opt("constrained", "Constrained, protected workload", [2, -2, 1], { disqualifies: ["zero-copy"] }),
    ],
  },
  {
    id: "source-availability",
    label: "Source availability",
    group: "operational",
    question: "What availability does the source offer?",
    helpText: "Federated reads inherit the availability of the source.",
    defaultWeight: 4,
    options: [
      opt("high", "99.9%+ with maintenance windows published", [1, 2, 1]),
      opt("business-hours", "Business hours only", [2, -2, 1]),
      opt("unreliable", "Frequent outages or long batch windows", [2, -2, 1], { disqualifies: ["zero-copy"] }),
    ],
  },
  {
    id: "residency",
    label: "Data residency",
    group: "compliance",
    question: "What residency constraints apply?",
    helpText: "Residency rules can prohibit copying data into a new region.",
    defaultWeight: 5,
    options: [
      opt("none", "No specific residency constraint", [2, 1, 1]),
      opt("same-region", "Must remain in the same region", [0, 2, 1]),
      opt("no-copy", "Data must not leave the source estate", [-2, 2, -1], {
        disqualifies: ["physical", "cached-acceleration"],
      }),
    ],
  },
  {
    id: "cross-border",
    label: "Cross-border limitations",
    group: "compliance",
    question: "Are there cross-border transfer limitations?",
    helpText: "Transfer restrictions usually rule out replication.",
    defaultWeight: 4,
    options: [
      opt("none", "No restriction", [2, 1, 1]),
      opt("contractual", "Permitted with contractual controls", [0, 2, 1]),
      opt("prohibited", "Cross-border transfer prohibited", [-2, 2, -1], { disqualifies: ["physical"] }),
    ],
  },
  {
    id: "sensitivity",
    label: "Data sensitivity",
    group: "compliance",
    question: "How sensitive is the data?",
    helpText: "Higher sensitivity increases the control burden on copies.",
    defaultWeight: 4,
    options: [
      opt("internal", "Internal, non-personal", [2, 1, 1]),
      opt("pii", "Personal data", [0, 2, 1]),
      opt("financial-pii", "Financial personal data or KYC", [-1, 2, 1]),
      opt("restricted", "Restricted / regulated confidential", [-2, 2, 0]),
    ],
  },
  {
    id: "compliance-obligations",
    label: "Compliance obligations",
    group: "compliance",
    question: "Which obligations govern this data?",
    helpText: "Auditable lineage and retention often need persisted data.",
    defaultWeight: 4,
    options: [
      opt("standard", "Standard internal policy", [1, 1, 1]),
      opt("gdpr", "GDPR / DPDP style erasure and consent", [-1, 2, 1]),
      opt("regulated-retention", "Regulated retention and reporting", [2, -1, 1]),
      opt("multiple", "Multiple overlapping regimes", [0, 1, 1]),
    ],
  },
  {
    id: "cost-sensitivity",
    label: "Cost sensitivity",
    group: "commercial",
    question: "How cost sensitive is the programme?",
    helpText: "Storage and credit consumption differ materially by pattern.",
    defaultWeight: 3,
    options: [
      opt("low", "Outcome first, cost secondary", [1, 1, 1]),
      opt("balanced", "Balanced", [1, 1, 2]),
      opt("high", "Highly cost constrained", [-1, 2, 1]),
    ],
  },
  {
    id: "egress",
    label: "Egress implications",
    group: "commercial",
    question: "What is the egress profile between source and platform?",
    helpText: "Repeated federated reads can cost more than a single copy.",
    defaultWeight: 3,
    options: [
      opt("negligible", "Same cloud and region, negligible egress", [1, 2, 2]),
      opt("moderate", "Cross-region, moderate egress", [1, 0, 2]),
      opt("expensive", "Cross-cloud, expensive egress", [2, -2, 1]),
    ],
  },
  {
    id: "activation",
    label: "Activation requirements",
    group: "downstream",
    question: "How will the data be activated?",
    helpText: "Segmentation, journeys and agents have different data access needs.",
    defaultWeight: 5,
    options: [
      opt("analytics", "Analytics and reporting only", [1, 2, 1]),
      opt("segmentation", "Segmentation and campaign activation", [2, 0, 2]),
      opt("agent", "Agentforce grounding and real-time actions", [2, -1, 2]),
      opt("mixed", "Mixed analytics and activation", [1, 0, 2]),
    ],
  },
  {
    id: "identity-resolution",
    label: "Identity resolution requirements",
    group: "downstream",
    question: "Does the data participate in identity resolution?",
    helpText: "Match keys generally need to be materialised for resolution runs.",
    defaultWeight: 5,
    options: [
      opt("none", "Not used for identity", [1, 2, 1]),
      opt("attributes", "Contributes profile attributes only", [1, 1, 2]),
      opt("match-keys", "Provides match keys for resolution", [2, -2, 1], { disqualifies: ["zero-copy"] }),
    ],
  },
  {
    id: "operational-model",
    label: "Operational support model",
    group: "operational",
    question: "Who will operate the integration?",
    helpText: "Pipeline operations require engineering capacity and run books.",
    defaultWeight: 3,
    options: [
      opt("mature", "Mature platform engineering team", [2, 1, 1]),
      opt("shared", "Shared services with limited capacity", [0, 2, 1]),
      opt("minimal", "Minimal run capability", [-1, 2, 1]),
    ],
  },
  {
    id: "business-criticality",
    label: "Business criticality",
    group: "operational",
    question: "How critical is the consuming process?",
    helpText: "Critical journeys need isolation from source instability.",
    defaultWeight: 4,
    options: [
      opt("low", "Internal or exploratory", [0, 2, 1]),
      opt("important", "Important business process", [1, 1, 2]),
      opt("critical", "Revenue or regulatory critical", [2, -1, 2]),
    ],
  },
  {
    id: "ot-boundary",
    label: "OT / IT boundary",
    group: "compliance",
    question: "Does the data cross an operational-technology boundary?",
    helpText: "Plant, line and vehicle-production networks must not expose an inbound path from cloud services.",
    defaultWeight: 5,
    options: [
      opt("none", "No OT systems in scope", [1, 1, 1]),
      opt("dmz", "Crosses into an OT DMZ with a broker", [2, -1, 1]),
      opt("unidirectional", "Unidirectional egress only (diode or one-way broker)", [2, -2, 1], {
        disqualifies: ["zero-copy"],
        note: "Federation requires a live inbound connection, which a unidirectional conduit forbids.",
      }),
    ],
  },
  {
    id: "telemetry-cardinality",
    label: "Telemetry cardinality",
    group: "profile",
    question: "What signal volume do connected assets or vehicles generate?",
    helpText: "Raw high-frequency signals should be aggregated before they reach the profile layer.",
    defaultWeight: 4,
    options: [
      opt("none", "No telemetry in scope", [1, 1, 1]),
      opt("aggregated", "Pre-aggregated signals or daily summaries", [2, 0, 1]),
      opt("event", "Event-level signals per asset or trip", [0, 2, 2]),
      opt("high-frequency", "High-frequency raw signals (sub-second)", [-2, 2, 1], {
        note: "Keep raw signals in the lake and expose derived features only.",
      }),
    ],
  },
  {
    id: "export-control",
    label: "Export control exposure",
    group: "compliance",
    question: "Does the dataset contain export-controlled or trade-restricted technical data?",
    helpText: "Controlled technical data constrains both replication and cross-border federated access.",
    defaultWeight: 5,
    options: [
      opt("none", "No controlled content", [1, 1, 1]),
      opt("screened", "Controlled attributes identified and excluded", [1, 1, 1]),
      opt("controlled", "Controlled technical data in scope", [-1, 2, 0], {
        note: "Leaving controlled data in the source of record reduces the number of controlled copies.",
      }),
    ],
  },
  {
    id: "partner-sharing",
    label: "Partner and dealer sharing",
    group: "downstream",
    question: "Will suppliers, dealers or distributors consume this data?",
    helpText: "Partner consumption requires enforceable partitioning of records by partner.",
    defaultWeight: 4,
    options: [
      opt("internal", "Internal consumption only", [1, 1, 1]),
      opt("partner-read", "Partner read access to their own records", [2, 0, 2]),
      opt("partner-write", "Partner submissions flow back (claims, quality, registrations)", [2, -1, 1]),
    ],
  },
];
export const getCriterion = (id: string): DecisionCriterion | undefined =>
  DECISION_CRITERIA.find((criterion) => criterion.id === id);

export const DEFAULT_WEIGHTS: Record<string, number> = Object.fromEntries(
  DECISION_CRITERIA.map((criterion) => [criterion.id, criterion.defaultWeight]),
);

export const PATTERN_GUIDANCE: readonly PatternGuidance[] = [
  {
    pattern: "physical",
    name: "Physical ingest",
    summary:
      "Data is copied into Data 360 on a schedule or via change capture, harmonised into standardised objects and persisted for resolution and activation.",
    benefits: [
      "Predictable low-latency reads for agents and journeys",
      "Full transformation and derivation freedom",
      "History and point-in-time reconstruction",
      "Participates fully in identity resolution and calculated insights",
      "Isolates consuming experiences from source outages",
    ],
    limitations: [
      "Data is only as fresh as the last successful load",
      "Storage and pipeline cost grows with volume",
      "Duplicate copy expands the compliance surface",
    ],
    risks: [
      "Pipeline failures create silent staleness",
      "Schema drift in the source breaks harmonisation",
      "Erasure and consent obligations must be propagated to the copy",
    ],
    prerequisites: [
      "Connector or extract mechanism with change capture",
      "Landing and harmonisation design signed off",
      "Data quality rules and monitoring in place",
      "Retention and erasure handling agreed",
    ],
    costConsiderations: [
      "Platform storage for landed and standardised objects",
      "Ingest and transformation credit consumption",
      "One-off historical backfill cost",
    ],
    complianceConsiderations: [
      "Second copy of regulated data requires classification and controls",
      "Residency of the platform region must be approved",
      "Deletion propagation must be demonstrable",
    ],
    architectureImpact: [
      "Landing objects and standardised objects added to the data model",
      "Scheduled pipelines and monitoring added to the run book",
      "Identity resolution runs over materialised match keys",
    ],
  },
  {
    pattern: "zero-copy",
    name: "Zero-copy live query",
    summary:
      "Data 360 federates queries to the source at read time. Nothing is copied; the source remains the single physical location of the data.",
    benefits: [
      "No duplicate copy of regulated data",
      "Always current at the moment of query",
      "Fast to stand up with no backfill",
      "Keeps residency and retention in the source estate",
      "Lower platform storage cost",
    ],
    limitations: [
      "Latency and availability inherited from the source",
      "Limited transformation and derivation capability",
      "Generally unavailable for identity match keys and some calculated insights",
      "Concurrency is constrained by source capacity",
    ],
    risks: [
      "Source contention degrades customer-facing experiences",
      "Federated query cost is harder to forecast",
      "Source maintenance windows surface as consumer errors",
    ],
    prerequisites: [
      "Supported federation connector and network path",
      "Source query performance benchmark",
      "Agreed query governance and workload isolation",
    ],
    costConsiderations: [
      "Source compute consumed per query",
      "Egress on cross-region or cross-cloud reads",
      "No incremental platform storage",
    ],
    complianceConsiderations: [
      "Strong fit where copies are prohibited",
      "Access logging must be captured on the source side",
      "Masking must be enforced by the source",
    ],
    architectureImpact: [
      "Federated external objects registered instead of landing objects",
      "Source becomes a runtime dependency of consuming experiences",
      "Monitoring focuses on query latency and source health",
    ],
  },
  {
    pattern: "cached-acceleration",
    name: "Cached acceleration",
    summary:
      "A federated definition is backed by a managed cache or accelerated materialisation, balancing freshness against predictable read performance.",
    benefits: [
      "Predictable read latency without a full pipeline",
      "Reduces repeated load on the source",
      "Refresh cadence tuned per data product",
      "Good fit for high-concurrency read patterns",
    ],
    limitations: [
      "Bounded staleness between refresh cycles",
      "Cache invalidation adds operational complexity",
      "Transformation capability sits between the other two patterns",
    ],
    risks: [
      "Stale cache serving customer-facing decisions",
      "Cache and source divergence is hard to detect without checks",
      "Refresh storms during peak windows",
    ],
    prerequisites: [
      "Federation connector plus cache configuration",
      "Agreed refresh cadence and staleness tolerance",
      "Freshness monitoring and alerting",
    ],
    costConsiderations: [
      "Cache storage plus periodic refresh compute",
      "Cheaper than per-query federation at high read volumes",
    ],
    complianceConsiderations: [
      "Cache holds a transient copy that must be classified",
      "Retention of cached content must match policy",
    ],
    architectureImpact: [
      "Cache layer introduced between source and consumption",
      "Freshness SLOs published per data product",
      "Refresh orchestration added to the run book",
    ],
  },
];

export const guidanceFor = (pattern: ConnectivityPatternId): PatternGuidance =>
  PATTERN_GUIDANCE.find((entry) => entry.pattern === pattern) ?? PATTERN_GUIDANCE[0];

export const PLATFORM_GUIDANCE: readonly PlatformConnectivityGuidance[] = [
  {
    platform: "Snowflake",
    supported: ["physical", "zero-copy", "cached-acceleration"],
    preferred: "zero-copy",
    connectorNotes: "Native sharing and federation connector; adapter exposes warehouse, role and share metadata.",
    considerations: [
      "Warehouse sizing controls federated query latency",
      "Secure data sharing avoids egress within the same cloud region",
      "Materialise match keys when identity resolution is in scope",
    ],
    egressNotes: "Negligible within the same cloud region; cross-region replication is billed by Snowflake.",
    identityNotes: "Identity match keys should be persisted or cached; federated reads are not used in resolution runs.",
  },
  {
    platform: "Databricks",
    supported: ["physical", "zero-copy", "cached-acceleration"],
    preferred: "zero-copy",
    connectorNotes: "Delta Sharing and Unity Catalog federation; adapter surfaces catalog, schema and grant metadata.",
    considerations: [
      "Unity Catalog lineage complements platform lineage",
      "SQL warehouse must stay warm for interactive latency",
      "Photon acceleration improves federated response times",
    ],
    egressNotes: "Same-region sharing is inexpensive; cross-cloud reads incur provider egress.",
    identityNotes: "Persist curated identity tables for resolution; keep behavioural volume federated.",
  },
  {
    platform: "AWS",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "S3, Redshift and Athena adapters; object storage is treated as a landing source.",
    considerations: [
      "Partition layout drives extract performance",
      "IAM role assumption required per environment",
      "Athena federation is better suited to cached acceleration than interactive reads",
    ],
    egressNotes: "Cross-region and internet egress is billed per GB; keep the platform region aligned.",
    identityNotes: "Batch identity feeds are normally landed physically before resolution.",
  },
  {
    platform: "Microsoft Azure",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "ADLS Gen2, Synapse and Fabric adapters exposed through the same metadata contract.",
    considerations: [
      "Private endpoint connectivity usually required",
      "Synapse serverless pools suit periodic refresh, not interactive reads",
      "Entra ID service principal lifecycle must be managed",
    ],
    egressNotes: "Egress applies on cross-region reads; Fabric shortcuts reduce duplication.",
    identityNotes: "Land identity attributes physically; leave large event history in place.",
  },
  {
    platform: "SAP",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "OData and CDS extraction adapters; delta-enabled extractors preferred.",
    considerations: [
      "Licence terms restrict direct federated access",
      "Extraction windows must avoid financial close periods",
      "Business partner harmonisation is required before resolution",
    ],
    egressNotes: "Cost is dominated by extraction compute rather than egress.",
    identityNotes: "Business partner and tax identifiers are strong match keys once normalised.",
  },
  {
    platform: "Oracle",
    supported: ["physical", "cached-acceleration"],
    preferred: "cached-acceleration",
    connectorNotes: "JDBC and GoldenGate style change capture through the connection adapter.",
    considerations: [
      "Production databases are usually protected from analytical load",
      "Read replicas are the preferred access point",
      "Character set and date handling need explicit normalisation",
    ],
    egressNotes: "On-premises links add network cost and bandwidth constraints.",
    identityNotes: "Replica-based extraction keeps resolution feeds stable without loading production.",
  },
  {
    platform: "Core banking",
    supported: ["physical"],
    preferred: "physical",
    connectorNotes: "File or API extraction through a staging layer; direct federation is not offered.",
    considerations: [
      "Strict change control and batch windows",
      "End-of-day balances are the reliable consistency point",
      "Account and customer keys require normalisation before matching",
    ],
    egressNotes: "Transfer cost is minor; operational risk dominates the decision.",
    identityNotes: "Customer and account identifiers are primary deterministic match keys.",
  },
  {
    platform: "Commerce",
    supported: ["physical", "cached-acceleration"],
    preferred: "cached-acceleration",
    connectorNotes: "Storefront and order APIs plus behavioural exports through the adapter layer.",
    considerations: [
      "Event volume is high and bursty",
      "Order data needs near-real-time freshness for service journeys",
      "Guest checkout records create identity ambiguity",
    ],
    egressNotes: "API call volume is the main cost driver.",
    identityNotes: "Email and phone are the practical match keys; expect low-quality guest records.",
  },
  {
    platform: "Loyalty",
    supported: ["physical", "zero-copy", "cached-acceleration"],
    preferred: "cached-acceleration",
    connectorNotes: "Loyalty member and transaction APIs with incremental extraction support.",
    considerations: [
      "Point balances change frequently",
      "Tier calculations should stay in the loyalty system of record",
      "Member identifiers link cleanly to individual identity",
    ],
    egressNotes: "Moderate; refresh cadence dominates cost.",
    identityNotes: "Loyalty member identifier is a high-confidence deterministic key.",
  },
  {
    platform: "Salesforce",
    supported: ["physical", "zero-copy", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "Native Data 360 bundle; ingestion is metadata-driven with no custom connector work.",
    considerations: [
      "Native ingestion is low effort and well governed",
      "Field-level security must be mapped into platform controls",
      "Formula fields need explicit derivation decisions",
    ],
    egressNotes: "No egress charge for native ingestion.",
    identityNotes: "CRM contact and account records are the anchor for identity resolution.",
  },
  {
    platform: "MES / SCADA historian",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "Egress through an OT DMZ broker (OPC UA / MQTT bridge or historian export); no inbound path from cloud.",
    considerations: [
      "Plant network segmentation dictates a unidirectional conduit",
      "Timestamps must be reconciled to a single clock source across sites",
      "Genealogy and lot data are required for traceability evidence",
    ],
    egressNotes: "Egress is metered at the plant link; aggregate at the edge before shipping.",
    identityNotes: "Serial and lot keys are the identity anchors for the installed base; land them physically.",
  },
  {
    platform: "PLM",
    supported: ["physical", "cached-acceleration"],
    preferred: "cached-acceleration",
    connectorNotes: "Teamcenter or Windchill API extraction of BOM, part master and change records.",
    considerations: [
      "Export-control classification must be applied before ingestion",
      "Effectivity dates make BOM snapshots version sensitive",
      "Change orders drive downstream quality and warranty analysis",
    ],
    egressNotes: "Low volume; change-driven delta extraction is normally sufficient.",
    identityNotes: "Part number plus revision is the canonical key; never merge revisions.",
  },
  {
    platform: "EAM / CMMS",
    supported: ["physical", "zero-copy", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "Maximo or SAP PM adapters for asset, work order and meter readings.",
    considerations: [
      "Work order status transitions drive service agent grounding",
      "Asset hierarchies must be preserved, not flattened",
      "Meter readings overlap with IoT telemetry and need de-duplication",
    ],
    egressNotes: "Moderate volume; delta extraction on work order change timestamps.",
    identityNotes: "Asset serial resolves to the installed-base profile; functional location is a secondary key.",
  },
  {
    platform: "IoT / telematics platform",
    supported: ["zero-copy", "cached-acceleration"],
    preferred: "cached-acceleration",
    connectorNotes: "Stream ingestion with edge or platform aggregation; derived features are landed, raw signals are not.",
    considerations: [
      "High cardinality makes raw ingestion uneconomic",
      "Consent and jurisdiction must be resolved before activation",
      "Device-to-asset or device-to-VIN mapping changes after service events",
    ],
    egressNotes: "Volume-driven; aggregation at source is the primary cost control.",
    identityNotes: "Device identifiers are time-boxed and must be linked to the serial or VIN, never used as the anchor.",
  },
  {
    platform: "Dealer management system",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "Standardised dealer feed through a broker; per-dealer variants normalised on ingest.",
    considerations: [
      "Dealer estates run heterogeneous DMS versions",
      "Sharing agreements limit which attributes may be centralised",
      "Ownership transfers arrive late and out of order",
    ],
    egressNotes: "Small per-dealer volumes; the integration cost sits in normalisation, not egress.",
    identityNotes: "VIN plus dealer customer key drives owner resolution; dealer partitioning must survive resolution.",
  },
  {
    platform: "Warranty & parts systems",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "Claims, campaign and parts catalogue extraction with reference-data synchronisation.",
    considerations: [
      "Claim adjudication states change after submission",
      "Parts supersession chains must be resolved for availability answers",
      "Campaign completion evidence is retained for regulatory reporting",
    ],
    egressNotes: "Low to moderate; nightly delta extraction is typical.",
    identityNotes: "Claims link serial or VIN to part and supplier, enabling quality attribution.",
  },
  {
    platform: "Supplier portal",
    supported: ["physical", "cached-acceleration"],
    preferred: "physical",
    connectorNotes: "Supplier submissions (quality, delivery, capacity) landed with strict per-supplier partitioning.",
    considerations: [
      "One supplier must never see another supplier's records",
      "Submission quality varies and needs validation at ingest",
      "Scorecards are published back to the portal after harmonisation",
    ],
    egressNotes: "Low volume, bidirectional flow.",
    identityNotes: "Supplier and site resolution must stay hierarchical so performance is attributable to a site.",
  },
];
export const platformGuidanceFor = (platform: string): PlatformConnectivityGuidance | undefined =>
  PLATFORM_GUIDANCE.find((entry) => entry.platform.toLowerCase() === platform.toLowerCase());
