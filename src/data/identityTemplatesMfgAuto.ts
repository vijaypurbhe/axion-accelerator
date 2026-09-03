import type {
  IdentityTemplate,
  MatchRule,
  NormalizationRule,
  SurvivorshipRule,
} from "@/domain/phase4";
import type { Industry } from "@/domain/types";

/**
 * Manufacturing and Automotive identity resolution templates.
 *
 * These sit alongside the BFSI pack — the workbench filters templates by the
 * active client's vertical. Templates are metadata only; the engine interprets
 * them at run time, exactly as it does for the BFSI pack.
 */

const norm = (
  id: string,
  field: string,
  type: NormalizationRule["type"],
  inputPattern: string,
  outputPattern: string,
  sequence: number,
  extra?: Partial<NormalizationRule>,
): NormalizationRule => ({
  id,
  field,
  type,
  inputPattern,
  outputPattern,
  locale: "en-GB",
  sequence,
  nullHandling: "ignore",
  active: true,
  ...extra,
});

const rule = (input: {
  id: string;
  name: string;
  entity: MatchRule["entity"];
  kind: MatchRule["kind"];
  fields: MatchRule["fields"];
  priority: number;
  blocking?: readonly string[];
  positive?: readonly string[];
  negative?: readonly string[];
  auto?: number;
  review?: number;
  no?: number;
  notes?: string;
}): MatchRule => ({
  id: input.id,
  name: input.name,
  entity: input.entity,
  kind: input.kind,
  fields: input.fields,
  threshold: input.review ?? 70,
  priority: input.priority,
  blocking: input.blocking ?? [],
  positiveEvidence: input.positive ?? [],
  negativeEvidence: input.negative ?? [],
  autoLinkThreshold: input.auto ?? 90,
  manualReviewThreshold: input.review ?? 70,
  noMatchThreshold: input.no ?? 55,
  active: true,
  notes: input.notes,
});

const surv = (
  id: string,
  attribute: string,
  strategy: SurvivorshipRule["strategy"],
  sourcePriority: readonly string[],
  notes: string,
): SurvivorshipRule => ({ id, attribute, strategy, sourcePriority, notes });

const IDENTIFIER_NORMALIZATION: readonly NormalizationRule[] = [
  norm("nz-serial", "serialNumber", "serial-number", "Mixed case with separators", "Upper case, separators removed", 1),
  norm("nz-partnum", "partNumber", "part-number", "Vendor-specific formatting", "Upper case, leading zeros trimmed", 2),
  norm("nz-site", "siteCode", "site-code", "Plant or site code variants", "Upper case canonical site code", 3),
  norm("nz-org", "organizationName", "organization-name", "Legal suffixes and punctuation", "Upper case, suffixes standardised", 4),
  norm("nz-addr-mfg", "addressLine", "address", "Free-form address", "Standardised postal address", 5),
];

const VEHICLE_NORMALIZATION: readonly NormalizationRule[] = [
  norm("nz-vin", "vin", "vin", "17-character VIN with mixed case", "Upper case, I/O/Q rejected, checksum validated", 1, {
    nullHandling: "flag-exception",
  }),
  norm("nz-plate", "licensePlate", "license-plate", "Regional plate formats", "Upper case, spaces removed, region retained", 2),
  norm("nz-name-auto", "fullName", "name", "Mixed case with titles", "Upper case, titles removed", 3),
  norm("nz-email-auto", "email", "email", "Free-form email", "Lower case, plus-tags removed", 4, {
    nullHandling: "treat-as-blank",
  }),
  norm("nz-phone-auto", "phone", "phone", "Local and international formats", "E.164", 5),
  norm("nz-dealer", "dealerCode", "site-code", "OEM dealer code variants", "Upper case canonical dealer code", 6),
];

const MFG: readonly Industry[] = ["MFG"];
const AUTO: readonly Industry[] = ["AUTO"];
const BOTH: readonly Industry[] = ["MFG", "AUTO"];

export const MFG_AUTO_IDENTITY_TEMPLATES: readonly IdentityTemplate[] = [
  {
    id: "tpl-serial-installed-base",
    name: "Serial to installed base",
    entity: "asset",
    industries: BOTH,
    description:
      "Resolves manufactured units across MES genealogy, ERP shipments, service records and IoT telemetry into a single installed-base asset.",
    useCases: ["Installed base view", "Field service grounding", "Recall and containment scoping"],
    normalizationRules: IDENTIFIER_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-asset-serial",
        name: "Serial number exact",
        entity: "asset",
        kind: "deterministic-exact",
        fields: [{ field: "serialNumber", comparison: "exact", weight: 100 }],
        priority: 1,
        blocking: ["serialNumber"],
        positive: ["Serial issued by the manufacturing execution system"],
        negative: ["Different product family for the same serial"],
        auto: 99,
        review: 90,
        no: 80,
      }),
      rule({
        id: "mr-asset-part-lot",
        name: "Part number, lot and build date",
        entity: "asset",
        kind: "weighted",
        fields: [
          { field: "partNumber", comparison: "normalized-exact", weight: 40 },
          { field: "lotNumber", comparison: "normalized-exact", weight: 35 },
          { field: "buildDate", comparison: "date-tolerance", weight: 25 },
        ],
        priority: 2,
        blocking: ["partNumber"],
        positive: ["Same production run genealogy"],
        negative: ["Different plant of manufacture"],
        auto: 92,
        review: 74,
      }),
      rule({
        id: "mr-asset-device",
        name: "Telemetry device identifier",
        entity: "asset",
        kind: "deterministic-normalized",
        fields: [{ field: "deviceId", comparison: "normalized-exact", weight: 100 }],
        priority: 3,
        blocking: ["deviceId"],
        positive: ["Device commissioned against the serial"],
        negative: ["Device replaced during a service event"],
        auto: 94,
        review: 78,
      }),
      rule({
        id: "mr-asset-neg",
        name: "Conflicting product family",
        entity: "asset",
        kind: "negative",
        fields: [{ field: "productFamily", comparison: "exact", weight: 100 }],
        priority: 0,
        notes: "Serials that resolve to different product families must never auto-link.",
      }),
    ],
    survivorshipRules: [
      surv("sv-asset-serial", "serialNumber", "trusted-source", ["src-mes", "src-erp"], "Manufacturing genealogy is authoritative."),
      surv("sv-asset-config", "configuration", "most-recent", [], "Latest as-maintained configuration after service events."),
      surv("sv-asset-owner", "ownerAccountId", "most-recent", ["src-sfdc"], "Latest confirmed owner or operator."),
      surv("sv-asset-location", "installLocation", "source-priority", ["src-eam", "src-sfdc"], "Asset management install location."),
    ],
    reconciliationNotes:
      "As-built genealogy from MES is preserved as history; as-maintained configuration is the survived view. Divergence raises a steward exception.",
  },
  {
    id: "tpl-supplier-site",
    name: "Supplier and manufacturing site",
    entity: "supplier",
    industries: BOTH,
    description:
      "Resolves suppliers and their manufacturing sites across ERP vendor masters, PLM approved-vendor lists, quality systems and supplier portals.",
    useCases: ["Supplier 360", "Quality attribution", "Supply risk and dual-sourcing analysis"],
    normalizationRules: IDENTIFIER_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-sup-duns",
        name: "DUNS or registry identifier",
        entity: "supplier",
        kind: "deterministic-exact",
        fields: [{ field: "dunsNumber", comparison: "exact", weight: 100 }],
        priority: 1,
        blocking: ["dunsNumber"],
        positive: ["Verified registry identifier"],
        negative: ["Different registered country"],
        auto: 97,
        review: 88,
      }),
      rule({
        id: "mr-sup-site",
        name: "Vendor code and site address",
        entity: "supplier",
        kind: "weighted",
        fields: [
          { field: "vendorCode", comparison: "normalized-exact", weight: 45 },
          { field: "siteCode", comparison: "normalized-exact", weight: 25 },
          { field: "addressLine", comparison: "fuzzy", weight: 30 },
        ],
        priority: 2,
        blocking: ["vendorCode"],
        positive: ["Same ship-from location on purchase orders"],
        negative: ["Different legal entity on the contract"],
        auto: 91,
        review: 72,
      }),
      rule({
        id: "mr-sup-name",
        name: "Fuzzy supplier name and country",
        entity: "supplier",
        kind: "fuzzy",
        fields: [
          { field: "organizationName", comparison: "fuzzy", weight: 65 },
          { field: "country", comparison: "exact", weight: 35 },
        ],
        priority: 3,
        positive: ["Matching approved-vendor-list entry"],
        negative: ["Distinct tax identifiers"],
        auto: 93,
        review: 74,
      }),
    ],
    survivorshipRules: [
      surv("sv-sup-name", "organizationName", "trusted-source", ["src-erp"], "ERP vendor master legal name."),
      surv("sv-sup-site", "siteCode", "source-priority", ["src-plm", "src-erp"], "Approved-vendor-list site of record."),
      surv("sv-sup-scorecard", "qualityScore", "most-recent", [], "Latest published quality scorecard."),
      surv("sv-sup-risk", "riskTier", "most-recent", ["src-third-party-data"], "Latest external risk assessment."),
    ],
    reconciliationNotes:
      "Parent suppliers and their sites are linked as a hierarchy, never merged, so quality and delivery performance stay attributable to a site.",
  },
  {
    id: "tpl-b2b2c-account",
    name: "B2B2C account and end customer",
    entity: "business",
    industries: BOTH,
    description:
      "Links direct commercial accounts, distributors and end customers so an OEM can see through the channel without breaching partner agreements.",
    useCases: ["Channel visibility", "Warranty registration", "Aftermarket demand planning"],
    normalizationRules: IDENTIFIER_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-b2b2c-account",
        name: "Account and channel key",
        entity: "business",
        kind: "composite",
        fields: [
          { field: "accountNumber", comparison: "normalized-exact", weight: 45 },
          { field: "channelPartnerId", comparison: "normalized-exact", weight: 30 },
          { field: "organizationName", comparison: "fuzzy", weight: 25 },
        ],
        priority: 1,
        blocking: ["accountNumber"],
        positive: ["Registration submitted by the channel partner"],
        negative: ["Conflicting tax identifier"],
        auto: 94,
        review: 76,
      }),
      rule({
        id: "mr-b2b2c-registration",
        name: "Warranty registration contact",
        entity: "business",
        kind: "weighted",
        fields: [
          { field: "email", comparison: "normalized-exact", weight: 45 },
          { field: "organizationName", comparison: "fuzzy", weight: 30 },
          { field: "postalCode", comparison: "normalized-exact", weight: 25 },
        ],
        priority: 2,
        blocking: ["postalCode"],
        positive: ["Serial registered under the same site"],
        negative: ["Different country of installation"],
        auto: 90,
        review: 70,
      }),
    ],
    survivorshipRules: [
      surv("sv-b2b2c-name", "organizationName", "trusted-source", ["src-erp", "src-sfdc"], "Commercial account of record."),
      surv("sv-b2b2c-channel", "channelPartnerId", "most-recent", [], "Latest servicing channel partner."),
      surv("sv-b2b2c-contact", "email", "verified-value", ["src-sfdc"], "Verified registration contact."),
    ],
    reconciliationNotes:
      "End-customer records sourced from partners remain attributed to the submitting partner so contractual sharing limits can be enforced downstream.",
  },
  {
    id: "tpl-vehicle-vin",
    name: "Vehicle identity (VIN)",
    entity: "vehicle",
    industries: AUTO,
    description:
      "Resolves vehicles across build records, dealer management systems, telematics, warranty and service history into a single vehicle profile.",
    useCases: ["Vehicle 360", "Recall scoping", "Connected services grounding"],
    normalizationRules: VEHICLE_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-veh-vin",
        name: "VIN exact",
        entity: "vehicle",
        kind: "deterministic-exact",
        fields: [{ field: "vin", comparison: "exact", weight: 100 }],
        priority: 1,
        blocking: ["vin"],
        positive: ["Checksum-valid VIN present in the build record"],
        negative: ["Different model year for the same VIN"],
        auto: 99,
        review: 92,
        no: 85,
      }),
      rule({
        id: "mr-veh-plate",
        name: "Plate, region and model",
        entity: "vehicle",
        kind: "weighted",
        fields: [
          { field: "licensePlate", comparison: "normalized-exact", weight: 45 },
          { field: "region", comparison: "exact", weight: 20 },
          { field: "model", comparison: "normalized-exact", weight: 20 },
          { field: "modelYear", comparison: "exact", weight: 15 },
        ],
        priority: 2,
        blocking: ["licensePlate"],
        positive: ["Plate confirmed at the last service visit"],
        negative: ["Plate reassigned to a different VIN"],
        auto: 90,
        review: 72,
      }),
      rule({
        id: "mr-veh-tcu",
        name: "Telematics unit identifier",
        entity: "vehicle",
        kind: "deterministic-normalized",
        fields: [{ field: "tcuId", comparison: "normalized-exact", weight: 100 }],
        priority: 3,
        blocking: ["tcuId"],
        positive: ["Head unit provisioned against the VIN"],
        negative: ["Unit replaced under warranty"],
        auto: 95,
        review: 78,
      }),
      rule({
        id: "mr-veh-neg",
        name: "Conflicting VIN",
        entity: "vehicle",
        kind: "negative",
        fields: [{ field: "vin", comparison: "exact", weight: 100 }],
        priority: 0,
        notes: "Records with two different populated VINs must never auto-link.",
      }),
    ],
    survivorshipRules: [
      surv("sv-veh-vin", "vin", "trusted-source", ["src-build", "src-dms"], "Build record VIN is authoritative."),
      surv("sv-veh-spec", "optionCodes", "trusted-source", ["src-build"], "As-built option content."),
      surv("sv-veh-mileage", "odometer", "most-recent", ["src-telematics", "src-dms"], "Latest telematics or service odometer reading."),
      surv("sv-veh-plate", "licensePlate", "most-recent", ["src-dms"], "Latest registration captured at service."),
      surv("sv-veh-software", "softwareVersion", "most-recent", ["src-telematics"], "Latest confirmed over-the-air software level."),
    ],
    reconciliationNotes:
      "VIN is the anchor. Plate and telematics matches only supplement a VIN-anchored profile; they never create one on their own.",
  },
  {
    id: "tpl-dealer-owner",
    name: "Dealer to owner relationship",
    entity: "dealer-relationship",
    industries: AUTO,
    description:
      "Resolves owners, drivers and households against dealer and OEM records, and maintains the servicing-dealer relationship over the ownership lifecycle.",
    useCases: ["Owner 360", "Service retention", "Consent-aware marketing"],
    normalizationRules: VEHICLE_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-own-vin-contact",
        name: "VIN plus verified contact",
        entity: "dealer-relationship",
        kind: "composite",
        fields: [
          { field: "vin", comparison: "exact", weight: 45 },
          { field: "email", comparison: "normalized-exact", weight: 30 },
          { field: "phone", comparison: "normalized-exact", weight: 25 },
        ],
        priority: 1,
        blocking: ["vin"],
        positive: ["Ownership transfer recorded in the DMS"],
        negative: ["Vehicle sold to a different party after the record date"],
        auto: 95,
        review: 78,
      }),
      rule({
        id: "mr-own-name-address",
        name: "Owner name and address",
        entity: "dealer-relationship",
        kind: "weighted",
        fields: [
          { field: "lastName", comparison: "normalized-exact", weight: 30 },
          { field: "firstName", comparison: "phonetic", weight: 20 },
          { field: "addressLine", comparison: "fuzzy", weight: 30 },
          { field: "postalCode", comparison: "normalized-exact", weight: 20 },
        ],
        priority: 2,
        blocking: ["postalCode"],
        positive: ["Same household on the finance contract"],
        negative: ["Different national identifier"],
        auto: 90,
        review: 70,
      }),
      rule({
        id: "mr-own-dealer",
        name: "Servicing dealer and customer key",
        entity: "dealer-relationship",
        kind: "deterministic-normalized",
        fields: [
          { field: "dealerCode", comparison: "normalized-exact", weight: 50 },
          { field: "dealerCustomerId", comparison: "normalized-exact", weight: 50 },
        ],
        priority: 3,
        blocking: ["dealerCode"],
        positive: ["Active service history at the dealer"],
        negative: ["Customer relocated outside the dealer territory"],
        auto: 96,
        review: 80,
      }),
    ],
    survivorshipRules: [
      surv("sv-own-name", "fullName", "trusted-source", ["src-dms", "src-finance"], "Registration or finance contract name."),
      surv("sv-own-contact", "email", "verified-value", ["src-owner-app"], "Verified owner app contact."),
      surv("sv-own-consent", "marketingConsent", "most-recent", ["src-owner-app", "src-dms"], "Latest captured consent always wins."),
      surv("sv-own-dealer", "servicingDealerCode", "most-recent", ["src-dms"], "Most recent servicing dealer."),
    ],
    reconciliationNotes:
      "Ownership is time-boxed: previous owners are retained as history and are excluded from current-owner activation. Consent survives independently of profile merges.",
  },
];

/** Templates for a vertical; AUTO inherits the shared manufacturing baseline. */
export const identityTemplatesForIndustry = (
  templates: readonly IdentityTemplate[],
  industry: Industry,
): readonly IdentityTemplate[] =>
  templates.filter((template) => !template.industries || template.industries.includes(industry));

export const MFG_IDENTITY_TEMPLATE_IDS = MFG_AUTO_IDENTITY_TEMPLATES.filter((t) =>
  (t.industries ?? MFG).includes("MFG"),
).map((t) => t.id);
