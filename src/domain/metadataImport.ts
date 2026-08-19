import type { DataDomain, DataType, Sensitivity } from "@/domain/dataProducts";

/**
 * Connector metadata import domain.
 *
 * Each supported source platform returns metadata in its own dialect
 * (Salesforce describe, Snowflake INFORMATION_SCHEMA, SAP DDIC, Oracle
 * ALL_TAB_COLUMNS). The normalization layer converts every dialect into the
 * canonical `NormalizedEntity` shape below, which is the only shape the rest of
 * Axion consumes.
 */

export type ConnectorId = "salesforce" | "snowflake" | "sap" | "oracle";

export const CONNECTOR_IDS: readonly ConnectorId[] = ["salesforce", "snowflake", "sap", "oracle"];

export interface ConnectorDefinition {
  readonly id: ConnectorId;
  readonly name: string;
  readonly metadataDialect: string;
  readonly summary: string;
  /** Connection form fields collected in step 1 of the wizard. */
  readonly credentialFields: readonly {
    readonly name: string;
    readonly label: string;
    readonly placeholder: string;
    readonly secret?: boolean;
    readonly optional?: boolean;
  }[];
  readonly capabilities: readonly string[];
  /** Ingestion patterns this platform can support once connected. */
  readonly supportedPatterns: readonly string[];
}

/* ----------------------------- normalized model ----------------------------- */

export interface NormalizedField {
  readonly sourceName: string;
  readonly name: string;
  readonly label: string;
  readonly nativeType: string;
  readonly dataType: DataType;
  readonly nullable: boolean;
  readonly primaryKey: boolean;
  readonly length?: number;
  readonly description: string;
  readonly sensitivity: Sensitivity;
  readonly validValues?: readonly string[];
}

export interface NormalizedEntity {
  readonly key: string;
  readonly connectorId: ConnectorId;
  readonly systemName: string;
  readonly sourceName: string;
  readonly name: string;
  readonly label: string;
  readonly namespace: string;
  readonly description: string;
  readonly domain: DataDomain;
  readonly recordCount: number;
  readonly fields: readonly NormalizedField[];
  /** Normalization notes: dropped fields, coerced types, inferred sensitivity. */
  readonly notes: readonly string[];
}

export interface NormalizationResult {
  readonly entities: readonly NormalizedEntity[];
  readonly fieldCount: number;
  readonly notes: readonly string[];
}

/* ------------------------------ raw payloads -------------------------------- */

export interface SalesforceDescribeObject {
  readonly name: string;
  readonly label: string;
  readonly recordCount: number;
  readonly fields: readonly {
    readonly name: string;
    readonly label: string;
    readonly type: string;
    readonly length?: number;
    readonly nillable: boolean;
    readonly externalId?: boolean;
    readonly encrypted?: boolean;
    readonly picklistValues?: readonly string[];
    readonly inlineHelpText?: string;
  }[];
}

export interface SnowflakeColumnRow {
  readonly table_catalog: string;
  readonly table_schema: string;
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: "YES" | "NO";
  readonly numeric_precision?: number;
  readonly character_maximum_length?: number;
  readonly comment?: string;
  readonly row_count?: number;
  readonly is_primary_key?: boolean;
}

export interface SapDdicTable {
  readonly tableName: string;
  readonly description: string;
  readonly recordCount: number;
  readonly fields: readonly {
    readonly fieldName: string;
    readonly dataElement: string;
    readonly abapType: string;
    readonly length?: number;
    readonly keyFlag: boolean;
    readonly notNull?: boolean;
    readonly description: string;
  }[];
}

export interface OracleColumnRow {
  readonly owner: string;
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly data_length?: number;
  readonly nullable: "Y" | "N";
  readonly comments?: string;
  readonly num_rows?: number;
  readonly constraint_type?: "P" | "U" | "R" | null;
}

export interface ConnectorPayload {
  readonly connectorId: ConnectorId;
  readonly systemName: string;
  readonly salesforce?: readonly SalesforceDescribeObject[];
  readonly snowflake?: readonly SnowflakeColumnRow[];
  readonly sap?: readonly SapDdicTable[];
  readonly oracle?: readonly OracleColumnRow[];
}
