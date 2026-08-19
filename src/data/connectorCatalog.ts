import type { ConnectorDefinition, ConnectorId, ConnectorPayload } from "@/domain/metadataImport";

/**
 * Connector catalog and representative metadata payloads.
 *
 * The payloads mirror the real dialect each platform returns so the
 * normalization layer can be exercised end to end. Replace `fetchConnectorMetadata`
 * with an Edge Function call per connector when live credentials are wired up.
 */

export const CONNECTORS: readonly ConnectorDefinition[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    metadataDialect: "Metadata / Describe API (sObjects)",
    summary: "Reads sObject describes including field types, picklists, external IDs and encryption flags.",
    credentialFields: [
      { name: "instanceUrl", label: "Instance URL", placeholder: "https://northstar.my.salesforce.com" },
      { name: "clientId", label: "Connected app consumer key", placeholder: "3MVG9..." },
      { name: "clientSecret", label: "Consumer secret", placeholder: "••••••••", secret: true },
      { name: "apiVersion", label: "API version", placeholder: "v62.0", optional: true },
    ],
    capabilities: ["sObject describe", "Picklist values", "Field-level encryption flags", "External ID detection"],
    supportedPatterns: ["physical", "streaming"],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    metadataDialect: "INFORMATION_SCHEMA.COLUMNS + TABLES",
    summary: "Reads catalog, schema, column types, nullability and comments for curated marts.",
    credentialFields: [
      { name: "account", label: "Account identifier", placeholder: "northstar-eu-central-1" },
      { name: "warehouse", label: "Warehouse", placeholder: "AXION_METADATA_WH" },
      { name: "database", label: "Database", placeholder: "ENTERPRISE_ANALYTICS" },
      { name: "role", label: "Role", placeholder: "AXION_METADATA_READER" },
      { name: "privateKey", label: "Key-pair private key", placeholder: "••••••••", secret: true },
    ],
    capabilities: ["Schema discovery", "Column comments", "Row-count statistics", "Zero-copy eligibility"],
    supportedPatterns: ["zero-copy", "cached-acceleration", "physical"],
  },
  {
    id: "sap",
    name: "SAP",
    metadataDialect: "DDIC dictionary (tables, data elements, ABAP types)",
    summary: "Reads DDIC table definitions, key flags, data elements and ABAP domain types.",
    credentialFields: [
      { name: "host", label: "Application server host", placeholder: "sap-prd-01.northstar.internal" },
      { name: "systemNumber", label: "System number", placeholder: "00" },
      { name: "client", label: "Client (MANDT)", placeholder: "100" },
      { name: "user", label: "RFC / OData user", placeholder: "AXION_META" },
      { name: "password", label: "Password", placeholder: "••••••••", secret: true },
    ],
    capabilities: ["DDIC table read", "Key flag detection", "ABAP → canonical type mapping", "Data element labels"],
    supportedPatterns: ["physical"],
  },
  {
    id: "oracle",
    name: "Oracle",
    metadataDialect: "ALL_TAB_COLUMNS / ALL_CONSTRAINTS",
    summary: "Reads owner, table, column types, nullability, comments and primary-key constraints.",
    credentialFields: [
      { name: "connectString", label: "Connect string", placeholder: "oracle-prd.northstar.internal:1521/CORE" },
      { name: "schema", label: "Schema owner", placeholder: "CORE_BANKING" },
      { name: "user", label: "Read-only user", placeholder: "AXION_META" },
      { name: "password", label: "Password", placeholder: "••••••••", secret: true },
    ],
    capabilities: ["Column discovery", "Constraint detection", "Comment extraction", "Row-count statistics"],
    supportedPatterns: ["physical", "cached-acceleration"],
  },
];

export const connectorById = (id: ConnectorId): ConnectorDefinition =>
  CONNECTORS.find((connector) => connector.id === id) ?? CONNECTORS[0];

/* ------------------------------ sample payloads ----------------------------- */

const SALESFORCE_PAYLOAD: ConnectorPayload = {
  connectorId: "salesforce",
  systemName: "NorthStar Salesforce Core (FSC)",
  salesforce: [
    {
      name: "Account",
      label: "Account",
      recordCount: 2_412_880,
      fields: [
        { name: "Id", label: "Account ID", type: "id", nillable: false },
        { name: "Name", label: "Account Name", type: "string", length: 255, nillable: false },
        { name: "Tax_Id__c", label: "Tax ID", type: "string", length: 32, nillable: true, encrypted: true },
        { name: "Phone", label: "Phone", type: "phone", nillable: true },
        { name: "AnnualRevenue", label: "Annual Revenue", type: "currency", nillable: true },
        {
          name: "Client_Segment__c",
          label: "Client Segment",
          type: "picklist",
          nillable: true,
          picklistValues: ["Mass", "Affluent", "Private", "Commercial"],
        },
        { name: "SystemModstamp", label: "System Modstamp", type: "datetime", nillable: false },
      ],
    },
    {
      name: "FinServ__FinancialAccount__c",
      label: "Financial Account",
      recordCount: 3_781_204,
      fields: [
        { name: "Id", label: "Financial Account ID", type: "id", nillable: false },
        { name: "Name", label: "Account Nickname", type: "string", length: 120, nillable: true },
        { name: "External_Account_Number__c", label: "Account Number", type: "string", length: 34, nillable: false, externalId: true, encrypted: true },
        { name: "Balance__c", label: "Current Balance", type: "currency", nillable: true },
        { name: "Opened_Date__c", label: "Opened Date", type: "date", nillable: true },
        { name: "Status__c", label: "Status", type: "picklist", nillable: true, picklistValues: ["Active", "Dormant", "Closed"] },
      ],
    },
    {
      name: "Case",
      label: "Case",
      recordCount: 1_140_022,
      fields: [
        { name: "Id", label: "Case ID", type: "id", nillable: false },
        { name: "Subject", label: "Subject", type: "string", length: 255, nillable: true },
        { name: "Description", label: "Description", type: "textarea", nillable: true },
        { name: "Complaint_Flag__c", label: "Complaint", type: "boolean", nillable: false },
        { name: "ClosedDate", label: "Closed Date", type: "datetime", nillable: true },
      ],
    },
  ],
};

const SNOWFLAKE_PAYLOAD: ConnectorPayload = {
  connectorId: "snowflake",
  systemName: "Enterprise Analytics Warehouse",
  snowflake: [
    ...["CUSTOMER_ID|NUMBER(38,0)|NO|1", "EMAIL_ADDRESS|VARCHAR(320)|YES|0", "CREDIT_SCORE|NUMBER(4,0)|YES|0", "CHURN_PROPENSITY|FLOAT|YES|0", "LAST_REFRESHED_AT|TIMESTAMP_NTZ|NO|0", "_FIVETRAN_SYNCED|TIMESTAMP_NTZ|YES|0"].map(
      (spec) => {
        const [column, type, nullable, pk] = spec.split("|");
        return {
          table_catalog: "ENTERPRISE_ANALYTICS",
          table_schema: "CURATED",
          table_name: "DIM_CUSTOMER_360",
          column_name: column,
          data_type: type,
          is_nullable: nullable as "YES" | "NO",
          comment: column === "CHURN_PROPENSITY" ? "Model output, refreshed hourly" : "",
          row_count: 2_180_400,
          is_primary_key: pk === "1",
        };
      },
    ),
    ...["TXN_ID|NUMBER(38,0)|NO|1", "CUSTOMER_ID|NUMBER(38,0)|NO|0", "TXN_AMOUNT|NUMBER(18,2)|NO|0", "TXN_TIMESTAMP|TIMESTAMP_TZ|NO|0", "MERCHANT_CATEGORY|VARCHAR(64)|YES|0"].map((spec) => {
      const [column, type, nullable, pk] = spec.split("|");
      return {
        table_catalog: "ENTERPRISE_ANALYTICS",
        table_schema: "CURATED",
        table_name: "FACT_TRANSACTION",
        column_name: column,
        data_type: type,
        is_nullable: nullable as "YES" | "NO",
        comment: "",
        row_count: 486_220_110,
        is_primary_key: pk === "1",
      };
    }),
  ],
};

const SAP_PAYLOAD: ConnectorPayload = {
  connectorId: "sap",
  systemName: "SAP S/4HANA Finance",
  sap: [
    {
      tableName: "BUT000",
      description: "Business Partner: General Data",
      recordCount: 1_920_440,
      fields: [
        { fieldName: "MANDT", dataElement: "MANDT", abapType: "CLNT", length: 3, keyFlag: true, description: "Client" },
        { fieldName: "PARTNER", dataElement: "BU_PARTNER", abapType: "CHAR", length: 10, keyFlag: true, description: "Business Partner Number" },
        { fieldName: "NAME_FIRST", dataElement: "BU_NAMEP_F", abapType: "CHAR", length: 40, keyFlag: false, description: "First Name" },
        { fieldName: "NAME_LAST", dataElement: "BU_NAMEP_L", abapType: "CHAR", length: 40, keyFlag: false, description: "Last Name" },
        { fieldName: "BIRTHDT", dataElement: "BU_BIRTHDT", abapType: "DATS", keyFlag: false, description: "Date of Birth" },
        { fieldName: "TAXNUM", dataElement: "BPTAXNUM", abapType: "CHAR", length: 20, keyFlag: false, description: "Tax Number" },
      ],
    },
    {
      tableName: "BSEG",
      description: "Accounting Document Segment",
      recordCount: 412_880_900,
      fields: [
        { fieldName: "MANDT", dataElement: "MANDT", abapType: "CLNT", length: 3, keyFlag: true, description: "Client" },
        { fieldName: "BELNR", dataElement: "BELNR_D", abapType: "CHAR", length: 10, keyFlag: true, description: "Accounting Document Number" },
        { fieldName: "DMBTR", dataElement: "DMBTR", abapType: "CURR", length: 13, keyFlag: false, description: "Amount in Local Currency" },
        { fieldName: "WAERS", dataElement: "WAERS", abapType: "CUKY", length: 5, keyFlag: false, description: "Currency Key" },
        { fieldName: "BUDAT", dataElement: "BUDAT", abapType: "DATS", keyFlag: false, description: "Posting Date" },
        { fieldName: "ZUONR", dataElement: "DZUONR", abapType: "CHAR", length: 18, keyFlag: false, description: "Assignment Number" },
      ],
    },
  ],
};

const ORACLE_PAYLOAD: ConnectorPayload = {
  connectorId: "oracle",
  systemName: "Finacle Core Banking",
  oracle: [
    ...[
      "CUST_ID|VARCHAR2|20|N|Customer identifier|P",
      "CUST_FIRST_NAME|VARCHAR2|40|Y|Customer first name|",
      "CUST_LAST_NAME|VARCHAR2|40|Y||",
      "CUST_DOB|DATE||Y|Date of birth|",
      "KYC_STATUS|VARCHAR2|10|Y|KYC verification status|",
      "RISK_RATING|NUMBER|2|Y||",
    ].map((spec) => {
      const [column, type, length, nullable, comments, constraint] = spec.split("|");
      return {
        owner: "CORE_BANKING",
        table_name: "CUSTOMER_MASTER",
        column_name: column,
        data_type: type,
        data_length: length ? Number(length) : undefined,
        nullable: nullable as "Y" | "N",
        comments,
        num_rows: 3_842_119,
        constraint_type: (constraint || null) as "P" | null,
      };
    }),
    ...[
      "ACCT_NO|VARCHAR2|34|N|Account number|P",
      "CUST_ID|VARCHAR2|20|N|Owning customer|R",
      "ACCT_BALANCE|NUMBER|18|Y|Ledger balance|",
      "ACCT_OPEN_DT|DATE||N|Account open date|",
      "ACCT_STATUS|VARCHAR2|10|N||",
    ].map((spec) => {
      const [column, type, length, nullable, comments, constraint] = spec.split("|");
      return {
        owner: "CORE_BANKING",
        table_name: "DEPOSIT_ACCOUNT",
        column_name: column,
        data_type: type,
        data_length: length ? Number(length) : undefined,
        nullable: nullable as "Y" | "N",
        comments,
        num_rows: 3_781_204,
        constraint_type: (constraint || null) as "P" | "R" | null,
      };
    }),
  ],
};

const PAYLOADS: Record<ConnectorId, ConnectorPayload> = {
  salesforce: SALESFORCE_PAYLOAD,
  snowflake: SNOWFLAKE_PAYLOAD,
  sap: SAP_PAYLOAD,
  oracle: ORACLE_PAYLOAD,
};

/**
 * Mocked metadata fetch. Swap the body for an Edge Function invocation per
 * connector; the returned shape and the normalization layer stay unchanged.
 */
export const fetchConnectorMetadata = async (connectorId: ConnectorId): Promise<ConnectorPayload> => {
  await new Promise((resolve) => setTimeout(resolve, 550));
  return PAYLOADS[connectorId];
};
