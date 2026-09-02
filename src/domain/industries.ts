import type { Industry, SalesforceProductId, SourcePlatformId } from "./types";

/**
 * Industry pack registry — the single source of truth for how Axion behaves per vertical.
 * Every module (assessment, data products, connectivity, identity, trust, governance,
 * Agentforce, simulation) filters its content through the keys declared here.
 */

export interface IndustryPack {
  readonly id: Industry;
  readonly name: string;
  readonly shortName: string;
  readonly enabled: boolean;
  /** One-line positioning used in headers, empty states and wizard copy. */
  readonly positioning: string;
  readonly subsegments: readonly string[];
  readonly defaultJurisdictions: readonly string[];
  readonly regulatoryFocus: readonly string[];
  /** Canonical data domains that matter most in this vertical. */
  readonly canonicalDomains: readonly string[];
  readonly priorityUseCaseThemes: readonly string[];
  readonly signatureSources: readonly SourcePlatformId[];
  readonly signatureProducts: readonly SalesforceProductId[];
  /** Identity keys typically available for resolution. */
  readonly identityKeys: readonly string[];
  readonly accentTone: "navy" | "steel" | "graphite";
}

export const INDUSTRY_PACKS: readonly IndustryPack[] = [
  {
    id: "BFSI",
    name: "Banking, Financial Services & Insurance",
    shortName: "BFSI",
    enabled: true,
    positioning:
      "Trusted party, household and product data foundation for banker, servicing and advisory agents.",
    subsegments: ["Retail Banking", "Commercial Banking", "Wealth & Asset Management", "Insurance", "Cards & Payments"],
    defaultJurisdictions: ["US — GLBA", "US — CCPA/CPRA", "EU — GDPR"],
    regulatoryFocus: ["GLBA", "PCI DSS", "FFIEC", "SEC", "FINRA", "Model Risk (SR 11-7)", "GDPR", "CCPA/CPRA"],
    canonicalDomains: ["party", "household", "account", "transaction", "product", "servicing", "risk", "consent"],
    priorityUseCaseThemes: [
      "Customer onboarding and KYC acceleration",
      "Banker next-best-action",
      "Service case summarisation and complaint handling",
      "Collections and hardship treatment",
      "Household advisory and wealth rollups",
    ],
    signatureSources: ["core-banking", "salesforce", "snowflake", "oracle"],
    signatureProducts: ["data-360", "agentforce", "financial-services-cloud", "service-cloud", "shield"],
    identityKeys: ["Customer identifier", "Tax identifier", "Email", "Mobile", "Account number"],
    accentTone: "navy",
  },
  {
    id: "MFG",
    name: "Manufacturing & Industrial",
    shortName: "Manufacturing",
    enabled: true,
    positioning:
      "Connected product, asset, supplier and order data foundation for commercial, service and shop-floor agents.",
    subsegments: [
      "Discrete Manufacturing",
      "Process Manufacturing",
      "Industrial Equipment",
      "Aftermarket & Service Parts",
      "High-Tech & Electronics",
    ],
    defaultJurisdictions: ["US — ITAR/EAR", "EU — GDPR", "EU — Machinery & Product Safety"],
    regulatoryFocus: [
      "Export control (ITAR / EAR)",
      "Product safety and recall traceability",
      "ISO 9001 / IATF quality records",
      "GDPR",
      "OT/IT segmentation (IEC 62443)",
    ],
    canonicalDomains: ["account", "asset", "product", "bom", "supplier", "order", "production", "quality", "service", "parts"],
    priorityUseCaseThemes: [
      "Order promise, allocation and delivery commitment",
      "Installed-base and asset 360 for service",
      "Supplier quality and non-conformance triage",
      "Predictive maintenance and field service dispatch",
      "Aftermarket parts cross-sell and contract renewal",
    ],
    signatureSources: ["sap", "mes", "plm", "eam-cmms", "iot-platform", "supplier-portal", "parts-catalog", "snowflake"],
    signatureProducts: ["data-360", "agentforce", "manufacturing-cloud", "field-service", "revenue-cloud", "tableau"],
    identityKeys: ["Account / sold-to number", "Asset serial number", "Supplier DUNS", "Site / plant code", "Email"],
    accentTone: "steel",
  },
  {
    id: "AUTO",
    name: "Automotive & Mobility",
    shortName: "Automotive",
    enabled: true,
    positioning:
      "VIN-centred vehicle, owner, dealer and telematics foundation for OEM, dealer and connected-vehicle agents.",
    subsegments: [
      "OEM",
      "Tier-1 / Tier-2 Supplier",
      "Dealer Group / Retail Network",
      "Captive Finance",
      "Mobility & Fleet Services",
    ],
    defaultJurisdictions: ["US — CCPA/CPRA", "EU — GDPR", "EU — UNECE R155/R156"],
    regulatoryFocus: [
      "Connected-vehicle data consent",
      "GDPR / CCPA vehicle and owner data",
      "Recall and product safety (NHTSA / type approval)",
      "Dealer data-sharing agreements",
      "UNECE R155 cybersecurity management",
    ],
    canonicalDomains: ["party", "vehicle", "dealer", "order", "service", "warranty", "telemetry", "parts", "consent", "finance"],
    priorityUseCaseThemes: [
      "Vehicle owner 360 and lifecycle engagement",
      "Dealer sales and lead handover",
      "Warranty, claims and recall campaign execution",
      "Connected-vehicle service and predictive alerts",
      "Trade cycle, renewal and captive finance offers",
    ],
    signatureSources: ["telematics", "dealer-management", "warranty", "parts-catalog", "sap", "salesforce", "databricks"],
    signatureProducts: ["data-360", "agentforce", "automotive-cloud", "service-cloud", "loyalty-management", "field-service"],
    identityKeys: ["VIN", "Owner party identifier", "Dealer code", "Email", "Mobile", "Contract number"],
    accentTone: "graphite",
  },
  {
    id: "HLS",
    name: "Healthcare & Life Sciences",
    shortName: "HLS",
    enabled: false,
    positioning: "Extension-ready pack reserved for the healthcare and life sciences release.",
    subsegments: ["Payer", "Provider", "MedTech", "Pharma"],
    defaultJurisdictions: ["US — HIPAA"],
    regulatoryFocus: ["HIPAA", "HITRUST", "21 CFR Part 11", "GxP"],
    canonicalDomains: ["party", "patient", "coverage", "encounter", "consent"],
    priorityUseCaseThemes: ["Care coordination (future release)"],
    signatureSources: ["salesforce", "snowflake"],
    signatureProducts: ["data-360", "health-cloud"],
    identityKeys: ["MRN", "Member identifier"],
    accentTone: "navy",
  },
  {
    id: "RCPG",
    name: "Retail & Consumer Packaged Goods",
    shortName: "RCPG",
    enabled: false,
    positioning: "Extension-ready pack reserved for the retail and consumer goods release.",
    subsegments: ["Grocery", "Specialty Retail", "CPG"],
    defaultJurisdictions: ["US — CCPA/CPRA"],
    regulatoryFocus: ["PCI DSS", "GDPR", "CCPA/CPRA"],
    canonicalDomains: ["party", "customer", "loyalty", "order", "product"],
    priorityUseCaseThemes: ["Loyalty personalisation (future release)"],
    signatureSources: ["commerce", "loyalty", "snowflake"],
    signatureProducts: ["data-360", "consumer-goods-cloud", "loyalty-management"],
    identityKeys: ["Loyalty number", "Email"],
    accentTone: "graphite",
  },
] as const;

export const DEFAULT_INDUSTRY: Industry = "BFSI";

export const getIndustryPack = (id: Industry | string | undefined): IndustryPack =>
  INDUSTRY_PACKS.find((pack) => pack.id === id) ??
  INDUSTRY_PACKS.find((pack) => pack.id === DEFAULT_INDUSTRY)!;

export const ENABLED_INDUSTRY_PACKS = INDUSTRY_PACKS.filter((pack) => pack.enabled);

export const industryLabel = (id: Industry | string | undefined): string => getIndustryPack(id).shortName;

/** Applicability key used by content packs (assessment questions, templates, controls). */
export type IndustryApplicability = "all" | "bfsi" | "mfg" | "auto" | "agentforce";

const APPLICABILITY_BY_INDUSTRY: Record<Industry, IndustryApplicability> = {
  BFSI: "bfsi",
  MFG: "mfg",
  AUTO: "auto",
  HLS: "all",
  RCPG: "all",
};

/**
 * True when content tagged with `applicability` should be shown for the given industry.
 * Cross-industry ("all") and Agentforce-specific content is always in scope.
 */
export const appliesToIndustry = (
  applicability: IndustryApplicability,
  industry: Industry | string | undefined,
): boolean => {
  if (applicability === "all" || applicability === "agentforce") return true;
  const pack = getIndustryPack(industry);
  // Automotive inherits the discrete-manufacturing baseline on top of its own pack.
  if (pack.id === "AUTO" && applicability === "mfg") return true;
  return applicability === APPLICABILITY_BY_INDUSTRY[pack.id];
};
