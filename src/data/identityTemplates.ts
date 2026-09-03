import type {
  IdentityTemplate,
  MatchRule,
  NormalizationRule,
  SampleIdentityRecord,
  SampleRecordSet,
  SurvivorshipRule,
} from "@/domain/phase4";
import type { Industry } from "@/domain/types";
import { MFG_AUTO_IDENTITY_TEMPLATES } from "@/data/identityTemplatesMfgAuto";

const BFSI_ONLY: readonly Industry[] = ["BFSI"];

/**
 * BFSI identity resolution templates plus seeded sample data for the simulation workbench.
 * Templates are metadata only; the engine interprets them at run time.
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

const NAME_NORMALIZATION: readonly NormalizationRule[] = [
  norm("nz-first", "firstName", "name", "Mixed case with titles and punctuation", "Upper case, titles removed", 1),
  norm("nz-last", "lastName", "name", "Mixed case with suffixes", "Upper case, suffixes removed", 2),
  norm("nz-email", "email", "email", "Free-form email", "Lower case, plus-tags removed", 3, {
    nullHandling: "treat-as-blank",
  }),
  norm("nz-phone", "phone", "phone", "Local and international formats", "E.164 digits only", 4),
  norm("nz-dob", "dob", "date-of-birth", "Mixed date formats", "ISO 8601 yyyy-mm-dd", 5, { nullHandling: "flag-exception" }),
  norm("nz-address", "addressLine", "address", "Free-form street address", "Upper case, thoroughfare abbreviations expanded", 6),
  norm("nz-postal", "postalCode", "address", "Mixed spacing and case", "Upper case, spaces removed", 7),
  norm("nz-nid", "nationalId", "national-id", "Formatted national identifier", "Digits and letters only, upper case", 8, {
    nullHandling: "block-match",
  }),
];

const BUSINESS_NORMALIZATION: readonly NormalizationRule[] = [
  norm("nz-org", "organizationName", "organization-name", "Legal and trading names", "Upper case, legal suffixes removed", 1),
  norm("nz-taxid", "taxId", "tax-id", "Formatted tax registration", "Digits only", 2, { nullHandling: "block-match" }),
  norm("nz-bizid", "businessId", "business-id", "Registry identifier", "Upper case, leading zeros preserved", 3),
  norm("nz-baddress", "addressLine", "address", "Registered office address", "Upper case, standardised thoroughfares", 4),
  norm("nz-bphone", "phone", "phone", "Local and international formats", "E.164 digits only", 5),
];

const ACCOUNT_NORMALIZATION: readonly NormalizationRule[] = [
  norm("nz-acct", "accountId", "account-id", "Masked and unmasked account numbers", "Digits only, leading zeros preserved", 1, {
    nullHandling: "block-match",
  }),
  norm("nz-cust", "customerId", "account-id", "Source customer key", "Upper case, source prefix retained", 2),
];

export const IDENTITY_TEMPLATES: readonly IdentityTemplate[] = [
  {
    id: "tpl-retail-customer",
    industries: BFSI_ONLY,
    name: "Retail customer identity",
    entity: "individual",
    description:
      "Resolves retail banking customers across CRM, core banking, digital and marketing sources into a single individual profile.",
    useCases: ["Unified customer profile", "Service agent grounding", "Marketing suppression"],
    normalizationRules: NAME_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-nid",
        name: "National identifier exact",
        entity: "individual",
        kind: "deterministic-exact",
        fields: [{ field: "nationalId", comparison: "exact", weight: 100 }],
        priority: 1,
        blocking: ["nationalId"],
        positive: ["Verified KYC identifier"],
        negative: ["Conflicting date of birth"],
        auto: 98,
        review: 90,
        no: 80,
      }),
      rule({
        id: "mr-email-dob",
        name: "Email plus date of birth",
        entity: "individual",
        kind: "deterministic-normalized",
        fields: [
          { field: "email", comparison: "normalized-exact", weight: 60 },
          { field: "dob", comparison: "date-tolerance", weight: 40 },
        ],
        priority: 2,
        blocking: ["email"],
        positive: ["Email verified in digital channel"],
        negative: ["Shared household email"],
        auto: 92,
        review: 72,
      }),
      rule({
        id: "mr-name-dob-postal",
        name: "Name, date of birth and postcode",
        entity: "individual",
        kind: "weighted",
        fields: [
          { field: "lastName", comparison: "normalized-exact", weight: 30 },
          { field: "firstName", comparison: "phonetic", weight: 20 },
          { field: "dob", comparison: "date-tolerance", weight: 30 },
          { field: "postalCode", comparison: "normalized-exact", weight: 20 },
        ],
        priority: 3,
        blocking: ["postalCode"],
        positive: ["Same postal address history"],
        negative: ["Different national identifier"],
        auto: 90,
        review: 70,
      }),
      rule({
        id: "mr-fuzzy-name-phone",
        name: "Fuzzy name and phone",
        entity: "individual",
        kind: "fuzzy",
        fields: [
          { field: "fullName", comparison: "fuzzy", weight: 55 },
          { field: "phone", comparison: "normalized-exact", weight: 45 },
        ],
        priority: 4,
        positive: ["Phone verified via OTP"],
        negative: ["Different date of birth"],
        auto: 93,
        review: 74,
      }),
      rule({
        id: "mr-neg-nid",
        name: "Conflicting national identifier",
        entity: "individual",
        kind: "negative",
        fields: [{ field: "nationalId", comparison: "exact", weight: 100 }],
        priority: 0,
        notes: "Two records with different populated national identifiers must never auto-link.",
      }),
    ],
    survivorshipRules: [
      surv("sv-name", "fullName", "trusted-source", ["src-core-banking", "src-sfdc"], "KYC-verified name wins."),
      surv("sv-email", "email", "most-recent", [], "Latest verified email from the digital channel."),
      surv("sv-phone", "phone", "verified-value", ["src-sfdc"], "OTP-verified mobile preferred."),
      surv("sv-address", "addressLine", "source-priority", ["src-core-banking", "src-sfdc"], "Core banking address of record."),
      surv("sv-dob", "dob", "verified-value", ["src-core-banking"], "KYC date of birth is authoritative."),
      surv("sv-nid", "nationalId", "trusted-source", ["src-core-banking"], "Only the KYC source may set this value."),
    ],
    reconciliationNotes:
      "Deterministic identifier matches are reconciled first, then weighted rules. Conflicting national identifiers raise an exception rather than linking.",
  },
  {
    id: "tpl-household",
    industries: BFSI_ONLY,
    name: "Household resolution",
    entity: "household",
    description: "Groups resolved individuals into households using normalised address and surname evidence.",
    useCases: ["Household level offers", "Wealth aggregation", "Marketing frequency control"],
    normalizationRules: NAME_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-hh-address",
        name: "Address and surname",
        entity: "household",
        kind: "composite",
        fields: [
          { field: "addressLine", comparison: "normalized-exact", weight: 55 },
          { field: "postalCode", comparison: "normalized-exact", weight: 25 },
          { field: "lastName", comparison: "normalized-exact", weight: 20 },
        ],
        priority: 1,
        blocking: ["postalCode"],
        positive: ["Joint account held at the same address"],
        negative: ["Multi-occupancy building flag"],
        auto: 91,
        review: 72,
      }),
      rule({
        id: "mr-hh-fuzzy",
        name: "Fuzzy address grouping",
        entity: "household",
        kind: "fuzzy",
        fields: [
          { field: "addressLine", comparison: "fuzzy", weight: 70 },
          { field: "postalCode", comparison: "normalized-exact", weight: 30 },
        ],
        priority: 2,
        auto: 94,
        review: 76,
      }),
      rule({
        id: "mr-hh-exclusion",
        name: "Exclude serviced addresses",
        entity: "household",
        kind: "exclusion",
        fields: [{ field: "addressLine", comparison: "normalized-exact", weight: 100 }],
        priority: 0,
        notes: "Care homes, PO boxes and serviced offices are excluded from household grouping.",
      }),
    ],
    survivorshipRules: [
      surv("sv-hh-address", "addressLine", "most-complete", [], "Most complete address representation wins."),
      surv("sv-hh-name", "householdName", "custom-logic", [], "Derived from the surname of the primary holder."),
    ],
    reconciliationNotes: "Household clusters are recalculated after individual resolution completes.",
  },
  {
    id: "tpl-business",
    industries: BFSI_ONLY,
    name: "Commercial customer / business entity",
    entity: "business",
    description: "Resolves commercial customers across CRM, core banking and registry sources.",
    useCases: ["Commercial relationship view", "Exposure aggregation", "Onboarding deduplication"],
    normalizationRules: BUSINESS_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-bz-taxid",
        name: "Tax identifier exact",
        entity: "business",
        kind: "deterministic-exact",
        fields: [{ field: "taxId", comparison: "exact", weight: 100 }],
        priority: 1,
        blocking: ["taxId"],
        positive: ["Registry verified"],
        auto: 97,
        review: 88,
      }),
      rule({
        id: "mr-bz-registry",
        name: "Registry identifier and name",
        entity: "business",
        kind: "composite",
        fields: [
          { field: "businessId", comparison: "normalized-exact", weight: 60 },
          { field: "organizationName", comparison: "fuzzy", weight: 40 },
        ],
        priority: 2,
        auto: 93,
        review: 74,
      }),
      rule({
        id: "mr-bz-name-address",
        name: "Trading name and registered address",
        entity: "business",
        kind: "weighted",
        fields: [
          { field: "organizationName", comparison: "fuzzy", weight: 55 },
          { field: "addressLine", comparison: "fuzzy", weight: 30 },
          { field: "postalCode", comparison: "normalized-exact", weight: 15 },
        ],
        priority: 3,
        auto: 92,
        review: 72,
        negative: ["Different tax identifier"],
      }),
    ],
    survivorshipRules: [
      surv("sv-bz-name", "organizationName", "trusted-source", ["src-registry", "src-core-banking"], "Registry legal name is authoritative."),
      surv("sv-bz-address", "addressLine", "source-priority", ["src-registry"], "Registered office address."),
      surv("sv-bz-taxid", "taxId", "verified-value", ["src-registry"], "Verified registration only."),
    ],
    reconciliationNotes: "Legal entity hierarchy is preserved; subsidiaries are linked but never merged.",
  },
  {
    id: "tpl-beneficial-owner",
    industries: BFSI_ONLY,
    name: "Beneficial ownership",
    entity: "business",
    description: "Links individuals to controlling interests in commercial entities for KYC and AML obligations.",
    useCases: ["UBO disclosure", "AML screening", "Onboarding due diligence"],
    normalizationRules: [...BUSINESS_NORMALIZATION, ...NAME_NORMALIZATION.slice(0, 5)],
    matchRules: [
      rule({
        id: "mr-ubo",
        name: "Owner identity and entity",
        entity: "business",
        kind: "composite",
        fields: [
          { field: "nationalId", comparison: "exact", weight: 45 },
          { field: "fullName", comparison: "fuzzy", weight: 30 },
          { field: "businessId", comparison: "normalized-exact", weight: 25 },
        ],
        priority: 1,
        positive: ["Registry filing confirms control"],
        negative: ["Ownership percentage below threshold"],
        auto: 95,
        review: 78,
      }),
    ],
    survivorshipRules: [
      surv("sv-ubo-name", "fullName", "trusted-source", ["src-registry"], "Registry filing name."),
      surv("sv-ubo-share", "ownershipPercent", "most-recent", [], "Latest filed ownership percentage."),
    ],
    reconciliationNotes: "Ownership links are never merged into a single profile; they are relationship edges.",
  },
  {
    id: "tpl-banker-relationship",
    industries: BFSI_ONLY,
    name: "Banker / customer relationship",
    entity: "advisor-relationship",
    description: "Resolves relationship-manager coverage across CRM and servicing systems.",
    useCases: ["Coverage model", "Servicing routing", "Compensation attribution"],
    normalizationRules: ACCOUNT_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-adv",
        name: "Advisor and customer key",
        entity: "advisor-relationship",
        kind: "deterministic-normalized",
        fields: [
          { field: "advisorId", comparison: "normalized-exact", weight: 50 },
          { field: "customerId", comparison: "normalized-exact", weight: 50 },
        ],
        priority: 1,
        blocking: ["advisorId"],
        auto: 96,
        review: 80,
      }),
    ],
    survivorshipRules: [
      surv("sv-adv", "relationshipType", "source-priority", ["src-sfdc"], "CRM coverage record is authoritative."),
    ],
    reconciliationNotes: "Historic coverage is retained with effective dating rather than overwritten.",
  },
  {
    id: "tpl-account-relationship",
    industries: BFSI_ONLY,
    name: "Account / customer relationship",
    entity: "account-relationship",
    description: "Associates accounts with resolved customers, preserving ownership role.",
    useCases: ["Balance aggregation", "Servicing entitlement", "Product holdings"],
    normalizationRules: ACCOUNT_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-acct",
        name: "Account and customer key",
        entity: "account-relationship",
        kind: "deterministic-exact",
        fields: [
          { field: "accountId", comparison: "exact", weight: 60 },
          { field: "customerId", comparison: "normalized-exact", weight: 40 },
        ],
        priority: 1,
        blocking: ["accountId"],
        auto: 97,
        review: 85,
      }),
    ],
    survivorshipRules: [
      surv("sv-acct-role", "ownershipRole", "source-priority", ["src-core-banking"], "Core banking ownership role."),
    ],
    reconciliationNotes: "Accounts are linked to every eligible holder rather than a single owner.",
  },
  {
    id: "tpl-joint-holders",
    industries: BFSI_ONLY,
    name: "Joint account holders",
    entity: "account-relationship",
    description: "Handles multi-holder accounts without collapsing the holders into one profile.",
    useCases: ["Joint servicing", "Household aggregation", "Consent management"],
    normalizationRules: ACCOUNT_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-joint",
        name: "Shared account, distinct holders",
        entity: "account-relationship",
        kind: "negative",
        fields: [
          { field: "accountId", comparison: "exact", weight: 60 },
          { field: "nationalId", comparison: "exact", weight: 40 },
        ],
        priority: 1,
        negative: ["Different national identifier on the same account"],
        notes: "Shared account number alone must never merge two individuals.",
        auto: 99,
        review: 85,
      }),
    ],
    survivorshipRules: [
      surv("sv-joint", "ownershipRole", "non-null-preference", [], "Primary and joint roles are both retained."),
    ],
    reconciliationNotes: "Joint holders remain separate individuals linked through the account relationship.",
  },
  {
    id: "tpl-cross-lob",
    industries: BFSI_ONLY,
    name: "Customer across multiple lines of business",
    entity: "individual",
    description: "Reconciles the same customer held in retail, wealth and insurance books.",
    useCases: ["Cross-sell", "Total relationship value", "Consolidated servicing"],
    normalizationRules: NAME_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-lob",
        name: "Cross-LOB weighted identity",
        entity: "individual",
        kind: "weighted",
        fields: [
          { field: "nationalId", comparison: "exact", weight: 40 },
          { field: "email", comparison: "normalized-exact", weight: 20 },
          { field: "dob", comparison: "date-tolerance", weight: 20 },
          { field: "lastName", comparison: "normalized-exact", weight: 20 },
        ],
        priority: 1,
        auto: 92,
        review: 73,
        positive: ["Same customer identifier in two lines of business"],
        negative: ["Conflicting date of birth"],
      }),
    ],
    survivorshipRules: [
      surv("sv-lob-name", "fullName", "trusted-source", ["src-core-banking"], "Retail KYC record wins."),
      surv("sv-lob-email", "email", "most-recent", [], "Most recently updated email across books."),
    ],
    reconciliationNotes: "Line-of-business identifiers are retained as alternate keys on the unified profile.",
  },
  {
    id: "tpl-kyc-reconciliation",
    industries: BFSI_ONLY,
    name: "KYC identity reconciliation",
    entity: "individual",
    description: "Reconciles KYC records against operational identity, raising exceptions on any divergence.",
    useCases: ["Regulatory remediation", "KYC refresh", "Audit evidence"],
    normalizationRules: NAME_NORMALIZATION,
    matchRules: [
      rule({
        id: "mr-kyc",
        name: "KYC identifier reconciliation",
        entity: "individual",
        kind: "deterministic-exact",
        fields: [
          { field: "nationalId", comparison: "exact", weight: 70 },
          { field: "dob", comparison: "date-tolerance", weight: 30 },
        ],
        priority: 1,
        blocking: ["nationalId"],
        positive: ["Document verified within refresh window"],
        negative: ["Name mismatch above tolerance"],
        auto: 97,
        review: 85,
      }),
    ],
    survivorshipRules: [
      surv("sv-kyc-nid", "nationalId", "verified-value", ["src-core-banking"], "Only verified KYC values are golden."),
      surv("sv-kyc-dob", "dob", "verified-value", ["src-core-banking"], "Documented date of birth."),
    ],
    reconciliationNotes: "Any divergence between KYC and operational identity creates a steward exception.",
  },
  ...MFG_AUTO_IDENTITY_TEMPLATES,
];

/** Templates available for a vertical. Untagged templates are cross-industry. */
export const identityTemplatesForIndustry = (industry: Industry): readonly IdentityTemplate[] =>
  IDENTITY_TEMPLATES.filter((template) => !template.industries || template.industries.includes(industry));

export const getIdentityTemplate = (id: string): IdentityTemplate | undefined =>
  IDENTITY_TEMPLATES.find((template) => template.id === id);

/* ------------------------------ sample data ------------------------------- */

export const SAMPLE_SETS: readonly SampleRecordSet[] = [
  {
    id: "set-retail",
    name: "Retail customer sample",
    entity: "individual",
    description: "18 records across CRM, core banking, digital and marketing with realistic duplicates and conflicts.",
    recordCount: 18,
  },
  {
    id: "set-household",
    name: "Household sample",
    entity: "household",
    description: "10 records sharing addresses, including a multi-occupancy edge case.",
    recordCount: 10,
  },
  {
    id: "set-business",
    name: "Commercial entity sample",
    entity: "business",
    description: "10 commercial records spanning registry, CRM and core banking naming variants.",
    recordCount: 10,
  },
];

const rec = (
  id: string,
  setId: string,
  entity: SampleIdentityRecord["entity"],
  sourceSystemId: string,
  sourceLabel: string,
  updatedAt: string,
  verified: boolean,
  attributes: Record<string, string>,
): SampleIdentityRecord => ({ id, setId, entity, sourceSystemId, sourceLabel, updatedAt, verified, attributes });

export const SAMPLE_RECORDS: readonly SampleIdentityRecord[] = [
  /* --- Priya Raman: three sources, one strong cluster --- */
  rec("r-001", "set-retail", "individual", "src-sfdc", "Salesforce FSC", "2026-05-11", true, {
    fullName: "Priya Raman",
    firstName: "Priya",
    lastName: "Raman",
    email: "priya.raman@example.com",
    phone: "+44 7700 900112",
    dob: "1984-03-17",
    nationalId: "QQ123456A",
    addressLine: "12 Kingsway Road",
    postalCode: "EC1A 1BB",
    customerId: "CRM-88213",
  }),
  rec("r-002", "set-retail", "individual", "src-core-banking", "Finacle core banking", "2026-06-02", true, {
    fullName: "PRIYA RAMAN",
    firstName: "Priya",
    lastName: "Raman",
    email: "p.raman@example.com",
    phone: "07700900112",
    dob: "1984-03-17",
    nationalId: "QQ123456A",
    addressLine: "12 Kingsway Rd",
    postalCode: "EC1A1BB",
    customerId: "CB-4471",
  }),
  rec("r-003", "set-retail", "individual", "src-digital", "Digital banking profile", "2026-06-20", false, {
    fullName: "Priya R.",
    firstName: "Priya",
    lastName: "Raman",
    email: "priya.raman+news@example.com",
    phone: "+447700900112",
    dob: "1984-03-17",
    addressLine: "12 Kingsway Road, Flat 2",
    postalCode: "EC1A 1BB",
    customerId: "DIG-99017",
  }),
  /* --- Daniel O'Connor: fuzzy name variants --- */
  rec("r-004", "set-retail", "individual", "src-sfdc", "Salesforce FSC", "2026-04-08", true, {
    fullName: "Daniel O'Connor",
    firstName: "Daniel",
    lastName: "OConnor",
    email: "daniel.oconnor@example.com",
    phone: "+44 7700 900233",
    dob: "1979-11-02",
    nationalId: "RR654321B",
    addressLine: "45 Harbour View",
    postalCode: "M4 2AB",
    customerId: "CRM-77120",
  }),
  rec("r-005", "set-retail", "individual", "src-core-banking", "Finacle core banking", "2026-05-30", true, {
    fullName: "Dan O Connor",
    firstName: "Dan",
    lastName: "O Connor",
    email: "daniel.oconnor@example.com",
    phone: "07700900233",
    dob: "1979-11-02",
    nationalId: "RR654321B",
    addressLine: "45 Harbour Vw",
    postalCode: "M42AB",
    customerId: "CB-5120",
  }),
  rec("r-006", "set-retail", "individual", "src-marketing", "Marketing Cloud list", "2026-01-14", false, {
    fullName: "D. O'Connor",
    firstName: "D",
    lastName: "OConnor",
    email: "dan.oconnor@example.com",
    phone: "",
    addressLine: "45 Harbour View",
    postalCode: "M4 2AB",
  }),
  /* --- Two different people sharing a household email --- */
  rec("r-007", "set-retail", "individual", "src-digital", "Digital banking profile", "2026-06-01", false, {
    fullName: "Alan Whitfield",
    firstName: "Alan",
    lastName: "Whitfield",
    email: "whitfield.home@example.com",
    phone: "+44 7700 900410",
    dob: "1966-07-21",
    nationalId: "SS111222C",
    addressLine: "8 Sandbourne Avenue",
    postalCode: "BS8 3QT",
  }),
  rec("r-008", "set-retail", "individual", "src-digital", "Digital banking profile", "2026-06-01", false, {
    fullName: "Margaret Whitfield",
    firstName: "Margaret",
    lastName: "Whitfield",
    email: "whitfield.home@example.com",
    phone: "+44 7700 900411",
    dob: "1968-02-09",
    nationalId: "SS333444D",
    addressLine: "8 Sandbourne Avenue",
    postalCode: "BS8 3QT",
  }),
  /* --- Conflicting KYC data, exception candidate --- */
  rec("r-009", "set-retail", "individual", "src-core-banking", "Finacle core banking", "2026-03-19", true, {
    fullName: "Samuel Adeyemi",
    firstName: "Samuel",
    lastName: "Adeyemi",
    email: "samuel.adeyemi@example.com",
    phone: "+44 7700 900555",
    dob: "1991-09-30",
    nationalId: "TT555666E",
    addressLine: "3 Beacon Court",
    postalCode: "B1 1AA",
    customerId: "CB-6612",
  }),
  rec("r-010", "set-retail", "individual", "src-sfdc", "Salesforce FSC", "2026-06-15", false, {
    fullName: "Sam Adeyemi",
    firstName: "Sam",
    lastName: "Adeyemi",
    email: "samuel.adeyemi@example.com",
    phone: "+44 7700 900555",
    dob: "1991-03-09",
    nationalId: "TT555666E",
    addressLine: "3 Beacon Ct",
    postalCode: "B1 1AA",
    customerId: "CRM-90014",
  }),
  /* --- Wealth vs retail, cross line of business --- */
  rec("r-011", "set-retail", "individual", "src-wealth", "Wealth platform", "2026-05-05", true, {
    fullName: "Helena Brandt",
    firstName: "Helena",
    lastName: "Brandt",
    email: "h.brandt@example.com",
    phone: "+44 7700 900677",
    dob: "1975-12-11",
    nationalId: "UU777888F",
    addressLine: "22 Meridian Square",
    postalCode: "EH3 9QG",
    customerId: "WM-3301",
  }),
  rec("r-012", "set-retail", "individual", "src-sfdc", "Salesforce FSC", "2026-06-18", true, {
    fullName: "Helena Brandt",
    firstName: "Helena",
    lastName: "Brandt",
    email: "helena.brandt@example.com",
    phone: "+44 7700 900677",
    dob: "1975-12-11",
    nationalId: "UU777888F",
    addressLine: "22 Meridian Sq",
    postalCode: "EH3 9QG",
    customerId: "CRM-91882",
  }),
  /* --- Sparse marketing records, false-negative risk --- */
  rec("r-013", "set-retail", "individual", "src-marketing", "Marketing Cloud list", "2025-11-02", false, {
    fullName: "J Fitzgerald",
    firstName: "J",
    lastName: "Fitzgerald",
    email: "jfitz@example.com",
    phone: "",
    addressLine: "",
    postalCode: "L1 8JQ",
  }),
  rec("r-014", "set-retail", "individual", "src-sfdc", "Salesforce FSC", "2026-02-25", true, {
    fullName: "James Fitzgerald",
    firstName: "James",
    lastName: "Fitzgerald",
    email: "james.fitzgerald@example.com",
    phone: "+44 7700 900788",
    dob: "1988-05-14",
    nationalId: "VV999000G",
    addressLine: "17 Dock Street",
    postalCode: "L1 8JQ",
    customerId: "CRM-70012",
  }),
  /* --- Distinct individuals with similar names --- */
  rec("r-015", "set-retail", "individual", "src-core-banking", "Finacle core banking", "2026-04-30", true, {
    fullName: "Michael Doyle",
    firstName: "Michael",
    lastName: "Doyle",
    email: "michael.doyle@example.com",
    phone: "+44 7700 900901",
    dob: "1990-01-22",
    nationalId: "WW121212H",
    addressLine: "5 Rowan Close",
    postalCode: "G2 4LT",
    customerId: "CB-7781",
  }),
  rec("r-016", "set-retail", "individual", "src-core-banking", "Finacle core banking", "2026-04-30", true, {
    fullName: "Michael Doyle",
    firstName: "Michael",
    lastName: "Doyle",
    email: "m.doyle2@example.com",
    phone: "+44 7700 900902",
    dob: "1962-08-04",
    nationalId: "WW343434J",
    addressLine: "9 Rowan Close",
    postalCode: "G2 4LT",
    customerId: "CB-7782",
  }),
  rec("r-017", "set-retail", "individual", "src-digital", "Digital banking profile", "2026-06-22", false, {
    fullName: "Aisha Khan",
    firstName: "Aisha",
    lastName: "Khan",
    email: "aisha.khan@example.com",
    phone: "+44 7700 901010",
    dob: "1995-06-06",
    nationalId: "XX565656K",
    addressLine: "31 Prospect Hill",
    postalCode: "LS1 4DY",
  }),
  rec("r-018", "set-retail", "individual", "src-loyalty", "Loyalty platform", "2026-06-23", false, {
    fullName: "Aisha Khan",
    firstName: "Aisha",
    lastName: "Khan",
    email: "aisha.k@example.com",
    phone: "+447700901010",
    addressLine: "31 Prospect Hl",
    postalCode: "LS1 4DY",
    memberId: "LOY-55120",
  }),

  /* ------------------------------- household ------------------------------- */
  rec("h-001", "set-household", "household", "src-core-banking", "Finacle core banking", "2026-05-02", true, {
    fullName: "Priya Raman",
    lastName: "Raman",
    addressLine: "12 Kingsway Road",
    postalCode: "EC1A 1BB",
  }),
  rec("h-002", "set-household", "household", "src-core-banking", "Finacle core banking", "2026-05-02", true, {
    fullName: "Arjun Raman",
    lastName: "Raman",
    addressLine: "12 Kingsway Rd",
    postalCode: "EC1A1BB",
  }),
  rec("h-003", "set-household", "household", "src-sfdc", "Salesforce FSC", "2026-05-20", true, {
    fullName: "Meera Raman",
    lastName: "Raman",
    addressLine: "12 Kingsway Road",
    postalCode: "EC1A 1BB",
  }),
  rec("h-004", "set-household", "household", "src-sfdc", "Salesforce FSC", "2026-04-11", true, {
    fullName: "Alan Whitfield",
    lastName: "Whitfield",
    addressLine: "8 Sandbourne Avenue",
    postalCode: "BS8 3QT",
  }),
  rec("h-005", "set-household", "household", "src-sfdc", "Salesforce FSC", "2026-04-11", true, {
    fullName: "Margaret Whitfield",
    lastName: "Whitfield",
    addressLine: "8 Sandbourne Ave",
    postalCode: "BS8 3QT",
  }),
  rec("h-006", "set-household", "household", "src-digital", "Digital banking profile", "2026-06-14", false, {
    fullName: "Thomas Nkemelu",
    lastName: "Nkemelu",
    addressLine: "Flat 4, 200 Riverside Court",
    postalCode: "SE1 9RT",
  }),
  rec("h-007", "set-household", "household", "src-digital", "Digital banking profile", "2026-06-14", false, {
    fullName: "Grace Lombardi",
    lastName: "Lombardi",
    addressLine: "Flat 9, 200 Riverside Court",
    postalCode: "SE1 9RT",
  }),
  rec("h-008", "set-household", "household", "src-core-banking", "Finacle core banking", "2026-03-08", true, {
    fullName: "Helena Brandt",
    lastName: "Brandt",
    addressLine: "22 Meridian Square",
    postalCode: "EH3 9QG",
  }),
  rec("h-009", "set-household", "household", "src-core-banking", "Finacle core banking", "2026-03-08", true, {
    fullName: "Peter Brandt",
    lastName: "Brandt",
    addressLine: "22 Meridian Sq",
    postalCode: "EH3 9QG",
  }),
  rec("h-010", "set-household", "household", "src-marketing", "Marketing Cloud list", "2025-12-19", false, {
    fullName: "Resident",
    lastName: "",
    addressLine: "PO Box 4410",
    postalCode: "EC1A 1BB",
  }),

  /* -------------------------------- business ------------------------------- */
  rec("b-001", "set-business", "business", "src-registry", "Company registry feed", "2026-05-01", true, {
    organizationName: "Meridian Logistics Limited",
    taxId: "GB123456789",
    businessId: "07742211",
    addressLine: "Unit 4, Trafford Park",
    postalCode: "M17 1AA",
  }),
  rec("b-002", "set-business", "business", "src-sfdc", "Salesforce FSC", "2026-06-09", true, {
    organizationName: "Meridian Logistics Ltd.",
    taxId: "GB123456789",
    businessId: "07742211",
    addressLine: "Unit 4 Trafford Pk",
    postalCode: "M17 1AA",
  }),
  rec("b-003", "set-business", "business", "src-core-banking", "Finacle core banking", "2026-02-17", true, {
    organizationName: "MERIDIAN LOGISTICS",
    taxId: "",
    businessId: "07742211",
    addressLine: "Unit 4, Trafford Park",
    postalCode: "M171AA",
  }),
  rec("b-004", "set-business", "business", "src-registry", "Company registry feed", "2026-05-01", true, {
    organizationName: "Northbank Construction PLC",
    taxId: "GB998877665",
    businessId: "03318877",
    addressLine: "120 Quay Street",
    postalCode: "M3 4BE",
  }),
  rec("b-005", "set-business", "business", "src-sfdc", "Salesforce FSC", "2026-04-22", false, {
    organizationName: "Northbank Construction",
    taxId: "GB998877665",
    businessId: "",
    addressLine: "120 Quay St",
    postalCode: "M3 4BE",
  }),
  rec("b-006", "set-business", "business", "src-sfdc", "Salesforce FSC", "2026-06-11", false, {
    organizationName: "Northbank Construction (Scotland)",
    taxId: "GB445566778",
    businessId: "SC442211",
    addressLine: "6 Waterloo Street",
    postalCode: "G2 6AY",
  }),
  rec("b-007", "set-business", "business", "src-registry", "Company registry feed", "2026-05-01", true, {
    organizationName: "Calder Retail Group Limited",
    taxId: "GB771122334",
    businessId: "09912233",
    addressLine: "1 Exchange Plaza",
    postalCode: "LS1 5EQ",
  }),
  rec("b-008", "set-business", "business", "src-core-banking", "Finacle core banking", "2026-01-30", true, {
    organizationName: "Calder Retail Grp Ltd",
    taxId: "GB771122334",
    businessId: "09912233",
    addressLine: "1 Exchange Pl",
    postalCode: "LS1 5EQ",
  }),
  rec("b-009", "set-business", "business", "src-sfdc", "Salesforce FSC", "2026-03-14", false, {
    organizationName: "Calder Retail",
    taxId: "",
    businessId: "",
    addressLine: "1 Exchange Plaza",
    postalCode: "LS1 5EQ",
  }),
  rec("b-010", "set-business", "business", "src-registry", "Company registry feed", "2026-05-01", true, {
    organizationName: "Harborline Marine Services Ltd",
    taxId: "GB556677889",
    businessId: "06612345",
    addressLine: "Pier Road",
    postalCode: "PO1 3AX",
  }),
];

export const recordsForSet = (setId: string): readonly SampleIdentityRecord[] =>
  SAMPLE_RECORDS.filter((record) => record.setId === setId);

export const getSampleRecord = (id: string): SampleIdentityRecord | undefined =>
  SAMPLE_RECORDS.find((record) => record.id === id);
