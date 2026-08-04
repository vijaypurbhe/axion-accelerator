/** Environment-driven runtime configuration. Keeps the app cloud-portable. */

export type DataMode = "mock" | "live";

export interface AxionConfig {
  readonly productName: string;
  readonly dataMode: DataMode;
  readonly environmentLabel: string;
  readonly apiBaseUrl: string | null;
  readonly defaultTenantId: string;
  readonly emailDomain: string;
}

const readEnv = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.length > 0 ? value : undefined;
};

const mode = (readEnv("VITE_AXION_DATA_MODE") ?? "mock") as DataMode;

export const config: AxionConfig = {
  productName: "Tech Mahindra Axion",
  dataMode: mode === "live" ? "live" : "mock",
  environmentLabel: readEnv("VITE_AXION_ENVIRONMENT") ?? (import.meta.env.PROD ? "Production" : "Sandbox"),
  apiBaseUrl: readEnv("VITE_AXION_API_BASE_URL") ?? null,
  defaultTenantId: readEnv("VITE_AXION_DEFAULT_TENANT") ?? "tnt-northbank",
  emailDomain: readEnv("VITE_AXION_EMAIL_DOMAIN") ?? "techmahindra.com",
};
