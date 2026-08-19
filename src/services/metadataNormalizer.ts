import type {
  ConnectorId,
  ConnectorPayload,
  NormalizationResult,
  NormalizedEntity,
  NormalizedField,
  OracleColumnRow,
  SalesforceDescribeObject,
  SapDdicTable,
  SnowflakeColumnRow,
} from "@/domain/metadataImport";
import type {
  ClassificationControls,
  DataDomain,
  DataProduct,
  DataProductAttribute,
  DataType,
  Sensitivity,
} from "@/domain/dataProducts";

/**
 * Schema mapping and normalization layer.
 *
 * Converts each connector's native metadata dialect into the canonical
 * `NormalizedEntity` model, then into a draft Axion data product. All inference
 * (type coercion, sensitivity, domain) is deterministic and reported as notes so
 * a Data Steward can review every decision before import.
 */

/* ------------------------------ type inference ------------------------------ */

const TYPE_RULES: readonly { readonly match: RegExp; readonly type: DataType }[] = [
  { match: /^(id|reference|lookup|masterrecord)/i, type: "reference" },
  { match: /(timestamp|datetime|tstamp)/i, type: "datetime" },
  { match: /^(date|dats|edm\.date)/i, type: "date" },
  { match: /(bool|checkbox|flag|char\(1\))/i, type: "boolean" },
  { match: /(currency|curr|money|dec\(|amount)/i, type: "currency" },
  { match: /(percent|pct)/i, type: "percent" },
  { match: /(int|number\(\d+,0\)|numc|smallint|bigint)/i, type: "integer" },
  { match: /(decimal|numeric|double|float|number|quan|dec)/i, type: "decimal" },
  { match: /(json|variant|object|array|struct)/i, type: "json" },
  { match: /(picklist|enum)/i, type: "enum" },
  { match: /(textarea|clob|long text|text)/i, type: "text" },
];

export const coerceDataType = (nativeType: string, fieldName = ""): DataType => {
  const probe = `${nativeType} ${fieldName}`;
  for (const rule of TYPE_RULES) if (rule.match.test(probe)) return rule.type;
  return "string";
};

/* --------------------------- sensitivity inference -------------------------- */

const SENSITIVITY_RULES: readonly { readonly match: RegExp; readonly sensitivity: Sensitivity }[] = [
  { match: /(ssn|tax_?id|national_?id|passport|aadhaar|pan_?no)/i, sensitivity: "financial-pii" },
  { match: /(iban|account_?number|card_?number|balance|salary|income|credit_?score)/i, sensitivity: "financial-pii" },
  { match: /(email|phone|mobile|birth|dob|address|street|postal|zip|first_?name|last_?name|full_?name)/i, sensitivity: "pii" },
  { match: /(consent|kyc|aml|risk_?rating|sanction)/i, sensitivity: "restricted" },
  { match: /(internal|owner|created|modified|status|code|type)/i, sensitivity: "internal" },
];

export const inferSensitivity = (fieldName: string, description = ""): Sensitivity => {
  const probe = `${fieldName} ${description}`;
  for (const rule of SENSITIVITY_RULES) if (rule.match.test(probe)) return rule.sensitivity;
  return "confidential";
};

/* ------------------------------ domain inference ---------------------------- */

const DOMAIN_RULES: readonly { readonly match: RegExp; readonly domain: DataDomain }[] = [
  { match: /(household)/i, domain: "household" },
  { match: /(account|deposit|cust_?acct|kna1)/i, domain: "account" },
  { match: /(txn|transaction|posting|payment|bseg|ledger)/i, domain: "transaction" },
  { match: /(loan|mortgage|credit_?line|lending)/i, domain: "lending" },
  { match: /(policy|claim|insur)/i, domain: "insurance" },
  { match: /(invest|portfolio|holding|wealth)/i, domain: "investment" },
  { match: /(case|ticket|service|complaint)/i, domain: "servicing" },
  { match: /(consent|preference|optin)/i, domain: "consent" },
  { match: /(campaign|engagement|interaction|activity)/i, domain: "engagement" },
  { match: /(product|offer|catalog)/i, domain: "product" },
  { match: /(risk|exposure|score)/i, domain: "risk" },
  { match: /(contact|customer|party|person|lead|business_?partner|but000)/i, domain: "party" },
];

export const inferDomain = (entityName: string, description = ""): DataDomain => {
  const probe = `${entityName} ${description}`;
  for (const rule of DOMAIN_RULES) if (rule.match.test(probe)) return rule.domain;
  return "customer";
};

/* --------------------------------- helpers ---------------------------------- */

const titleCase = (raw: string): string =>
  raw
    .replace(/__c$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const canonicalName = (raw: string): string =>
  raw
    .replace(/__c$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const isSystemField = (name: string): boolean =>
  /^(mandt|client|systemmodstamp|lastvieweddate|lastreferenceddate|_fivetran|etl_|dml_)/i.test(name);

/* ------------------------- per-connector normalizers ------------------------ */

const normalizeSalesforce = (systemName: string, objects: readonly SalesforceDescribeObject[]): NormalizedEntity[] =>
  objects.map((object) => {
    const notes: string[] = [];
    const fields: NormalizedField[] = [];
    for (const field of object.fields) {
      if (isSystemField(field.name)) {
        notes.push(`Dropped platform field ${field.name}.`);
        continue;
      }
      const dataType = field.picklistValues?.length
        ? "enum"
        : coerceDataType(field.type, field.name);
      if (dataType === "string" && !/^(string|text|url|phone|email|picklist|id|reference)/i.test(field.type)) {
        notes.push(`${field.name}: native type "${field.type}" defaulted to string.`);
      }
      fields.push({
        sourceName: field.name,
        name: canonicalName(field.name),
        label: field.label || titleCase(field.name),
        nativeType: field.type,
        dataType,
        nullable: field.nillable,
        primaryKey: field.name === "Id" || Boolean(field.externalId),
        length: field.length,
        description: field.inlineHelpText ?? "",
        sensitivity: field.encrypted ? "financial-pii" : inferSensitivity(field.name, field.inlineHelpText ?? ""),
        validValues: field.picklistValues,
      });
    }
    return {
      key: `salesforce:${object.name}`,
      connectorId: "salesforce" as ConnectorId,
      systemName,
      sourceName: object.name,
      name: canonicalName(object.name),
      label: object.label,
      namespace: "sObject",
      description: `Salesforce ${object.label} object`,
      domain: inferDomain(object.name, object.label),
      recordCount: object.recordCount,
      fields,
      notes,
    };
  });

const groupBy = <T,>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
};

const normalizeSnowflake = (systemName: string, rows: readonly SnowflakeColumnRow[]): NormalizedEntity[] =>
  [...groupBy(rows, (row) => `${row.table_schema}.${row.table_name}`).entries()].map(([key, columns]) => {
    const notes: string[] = [];
    const first = columns[0];
    const fields: NormalizedField[] = columns
      .filter((column) => {
        if (!isSystemField(column.column_name)) return true;
        notes.push(`Dropped ETL column ${column.column_name}.`);
        return false;
      })
      .map((column) => ({
        sourceName: column.column_name,
        name: canonicalName(column.column_name),
        label: titleCase(column.column_name),
        nativeType: column.data_type,
        dataType: coerceDataType(column.data_type, column.column_name),
        nullable: column.is_nullable === "YES",
        primaryKey: Boolean(column.is_primary_key),
        length: column.character_maximum_length,
        description: column.comment ?? "",
        sensitivity: inferSensitivity(column.column_name, column.comment ?? ""),
      }));
    if (!fields.some((field) => field.primaryKey))
      notes.push("No primary key declared in INFORMATION_SCHEMA — confirm the natural key before mapping.");
    return {
      key: `snowflake:${key}`,
      connectorId: "snowflake" as ConnectorId,
      systemName,
      sourceName: `${first.table_schema}.${first.table_name}`,
      name: canonicalName(first.table_name),
      label: titleCase(first.table_name),
      namespace: `${first.table_catalog}.${first.table_schema}`,
      description: `Snowflake curated table ${first.table_schema}.${first.table_name}`,
      domain: inferDomain(first.table_name),
      recordCount: first.row_count ?? 0,
      fields,
      notes,
    };
  });

const ABAP_HINTS: Record<string, string> = {
  CHAR: "string",
  CUKY: "string",
  CURR: "currency",
  DATS: "date",
  TIMS: "string",
  DEC: "decimal",
  INT4: "integer",
  NUMC: "integer",
  QUAN: "decimal",
  LANG: "string",
  UNIT: "string",
};

const normalizeSap = (systemName: string, tables: readonly SapDdicTable[]): NormalizedEntity[] =>
  tables.map((table) => {
    const notes: string[] = [];
    const fields: NormalizedField[] = [];
    for (const field of table.fields) {
      if (isSystemField(field.fieldName)) {
        notes.push(`Dropped SAP client field ${field.fieldName}.`);
        continue;
      }
      const hint = ABAP_HINTS[field.abapType.toUpperCase()] ?? field.abapType;
      if (!ABAP_HINTS[field.abapType.toUpperCase()])
        notes.push(`${field.fieldName}: ABAP type ${field.abapType} has no direct mapping — inferred from name.`);
      fields.push({
        sourceName: field.fieldName,
        name: canonicalName(field.dataElement || field.fieldName),
        label: field.description || titleCase(field.fieldName),
        nativeType: `${field.abapType}${field.length ? `(${field.length})` : ""}`,
        dataType: coerceDataType(hint, field.description),
        nullable: !field.keyFlag && !field.notNull,
        primaryKey: field.keyFlag,
        length: field.length,
        description: field.description,
        sensitivity: inferSensitivity(field.fieldName, field.description),
      });
    }
    return {
      key: `sap:${table.tableName}`,
      connectorId: "sap" as ConnectorId,
      systemName,
      sourceName: table.tableName,
      name: canonicalName(table.tableName),
      label: table.description,
      namespace: "DDIC",
      description: `SAP table ${table.tableName} — ${table.description}`,
      domain: inferDomain(table.tableName, table.description),
      recordCount: table.recordCount,
      fields,
      notes,
    };
  });

const normalizeOracle = (systemName: string, rows: readonly OracleColumnRow[]): NormalizedEntity[] =>
  [...groupBy(rows, (row) => `${row.owner}.${row.table_name}`).entries()].map(([key, columns]) => {
    const notes: string[] = [];
    const first = columns[0];
    const fields: NormalizedField[] = columns.map((column) => ({
      sourceName: column.column_name,
      name: canonicalName(column.column_name),
      label: titleCase(column.column_name),
      nativeType: column.data_type,
      dataType: coerceDataType(column.data_type, column.column_name),
      nullable: column.nullable === "Y",
      primaryKey: column.constraint_type === "P",
      length: column.data_length,
      description: column.comments ?? "",
      sensitivity: inferSensitivity(column.column_name, column.comments ?? ""),
    }));
    const undocumented = fields.filter((field) => !field.description).length;
    if (undocumented > 0) notes.push(`${undocumented} column(s) have no Oracle comment — business definitions required.`);
    return {
      key: `oracle:${key}`,
      connectorId: "oracle" as ConnectorId,
      systemName,
      sourceName: `${first.owner}.${first.table_name}`,
      name: canonicalName(first.table_name),
      label: titleCase(first.table_name),
      namespace: first.owner,
      description: `Oracle table ${first.owner}.${first.table_name}`,
      domain: inferDomain(first.table_name),
      recordCount: first.num_rows ?? 0,
      fields,
      notes,
    };
  });

/* -------------------------------- entry point ------------------------------- */

export const normalizeConnectorPayload = (payload: ConnectorPayload): NormalizationResult => {
  let entities: NormalizedEntity[] = [];
  switch (payload.connectorId) {
    case "salesforce":
      entities = normalizeSalesforce(payload.systemName, payload.salesforce ?? []);
      break;
    case "snowflake":
      entities = normalizeSnowflake(payload.systemName, payload.snowflake ?? []);
      break;
    case "sap":
      entities = normalizeSap(payload.systemName, payload.sap ?? []);
      break;
    case "oracle":
      entities = normalizeOracle(payload.systemName, payload.oracle ?? []);
      break;
  }
  return {
    entities,
    fieldCount: entities.reduce((sum, entity) => sum + entity.fields.length, 0),
    notes: entities.flatMap((entity) => entity.notes.map((note) => `${entity.label}: ${note}`)),
  };
};

/* -------------------- normalized entity → data product ---------------------- */

const HIGHEST_SENSITIVITY: readonly Sensitivity[] = [
  "public",
  "internal",
  "confidential",
  "restricted",
  "pii",
  "financial-pii",
];

const peakSensitivity = (values: readonly Sensitivity[]): Sensitivity =>
  values.reduce<Sensitivity>(
    (peak, value) => (HIGHEST_SENSITIVITY.indexOf(value) > HIGHEST_SENSITIVITY.indexOf(peak) ? value : peak),
    "internal",
  );

export interface DataProductDraftOptions {
  readonly initiativeId: string;
  readonly clientId?: string;
  readonly actor: string;
}

/** Deterministic draft data product built from one normalized entity. */
export const toDataProductDraft = (
  entity: NormalizedEntity,
  options: DataProductDraftOptions,
): DataProduct => {
  const now = new Date().toISOString();
  const attributes: DataProductAttribute[] = entity.fields.map((field) => ({
    id: `${entity.name}-${field.name}`,
    businessName: field.label,
    technicalName: field.name,
    description: field.description || `Imported from ${entity.sourceName}.${field.sourceName}`,
    dataType: field.dataType,
    required: !field.nullable,
    primaryKey: field.primaryKey,
    sensitivity: field.sensitivity,
    businessDefinition: field.description || `Sourced from ${entity.systemName} (${field.nativeType}).`,
    validValues: field.validValues,
    sourceOfTruth: `${entity.systemName} · ${entity.sourceName}.${field.sourceName}`,
  }));

  const sensitivity = peakSensitivity(attributes.map((attribute) => attribute.sensitivity));
  const controls: ClassificationControls = {
    sensitivity,
    classifications: [entity.domain, entity.connectorId],
    regulatory: sensitivity === "financial-pii" || sensitivity === "pii" ? ["GDPR", "GLBA"] : [],
    retention: "Inherit initiative retention policy — confirm with the Data Steward.",
    consentImplications:
      sensitivity === "pii" || sensitivity === "financial-pii"
        ? "Consent and purpose limitation checks required before activation."
        : "No direct consent implication identified.",
    encryptionRequired: sensitivity === "pii" || sensitivity === "financial-pii",
    maskingRequired: sensitivity === "financial-pii",
    residency: "Follow source system residency until confirmed.",
  };

  const keyAttributes = attributes.filter((attribute) => attribute.primaryKey);

  return {
    id: `dp-import-${entity.connectorId}-${entity.name}`,
    name: `${entity.label} (${entity.systemName})`,
    description: entity.description,
    businessPurpose: `Normalized ${entity.connectorId} metadata for the ${entity.domain} domain, imported through the Axion metadata import wizard.`,
    category: "custom",
    domain: entity.domain,
    industry: "BFSI",
    businessOwnerRole: "data-steward",
    technicalOwnerRole: "data-engineer",
    isTemplate: false,
    clientId: options.clientId,
    initiativeId: options.initiativeId,
    state: "draft",
    version: "0.1.0",
    reuseCount: 0,
    attributes,
    identifiers:
      keyAttributes.length > 0
        ? [
            {
              id: `${entity.name}-pk`,
              name: `${entity.label} primary key`,
              kind: "primary",
              attributeIds: keyAttributes.map((attribute) => attribute.id),
              description: `Imported key from ${entity.sourceName}.`,
              identityRelevant: true,
            },
          ]
        : [],
    relationships: [],
    qualityRules: keyAttributes.map((attribute) => ({
      id: `${entity.name}-qr-${attribute.id}`,
      name: `${attribute.businessName} completeness`,
      dimension: "completeness",
      description: "Imported key attributes must always be populated.",
      attributeId: attribute.id,
      expression: `${attribute.technicalName} IS NOT NULL`,
      threshold: 100,
      severity: "high",
      owner: "data-steward",
      remediation: "Reject the record and raise a source data incident.",
      cadence: "daily",
      status: "draft",
    })),
    controls,
    sampleSourceMappings: [
      {
        sourceSystem: entity.systemName,
        sourceObject: entity.sourceName,
        notes: `${entity.fields.length} field(s) normalized · ${entity.notes.length} normalization note(s).`,
      },
    ],
    salesforceAlignment: "Proposed Data 360 DLO — confirm DMO alignment in the mapping workbench.",
    conceptualDlo: `DLO_${entity.name.toUpperCase()}`,
    standardizedDmo: undefined,
    applicableUseCases: [],
    stages: ["design"],
    versions: [],
    approvals: [],
    createdAt: now,
    updatedAt: now,
    updatedBy: options.actor,
  };
};
