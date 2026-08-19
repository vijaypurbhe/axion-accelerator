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

/** Server-backed by default; set VITE_AXION_DATA_MODE=mock for offline demos and tests. */
const mode = (readEnv("VITE_AXION_DATA_MODE") ?? "live") as DataMode;

export const config: AxionConfig = {
  productName: "Tech Mahindra Axion",
  dataMode: mode === "mock" ? "mock" : "live",
  environmentLabel: readEnv("VITE_AXION_ENVIRONMENT") ?? (import.meta.env.PROD ? "Production" : "Sandbox"),
  apiBaseUrl: readEnv("VITE_AXION_API_BASE_URL") ?? null,
  defaultTenantId: readEnv("VITE_AXION_DEFAULT_TENANT") ?? "cli-northstar",
  emailDomain: readEnv("VITE_AXION_EMAIL_DOMAIN") ?? "techmahindra.com",
};
