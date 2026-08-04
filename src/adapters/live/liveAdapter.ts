import { config } from "@/config";
import type { AxionDataAdapter } from "../contracts";
import type { AuditEntry } from "@/domain/types";

/**
 * Live adapter stub. Reads/writes over a generic REST boundary so the app is not
 * bound to a specific cloud or backend. Wired in a later phase.
 */
const notConfigured = (): never => {
  throw new Error(
    "Live data adapter is not configured. Set VITE_AXION_API_BASE_URL or run with VITE_AXION_DATA_MODE=mock.",
  );
};

const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  if (!config.apiBaseUrl) notConfigured();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Axion API request failed [${response.status}]: ${body}`);
  }
  return (await response.json()) as T;
};

export const liveAdapter: AxionDataAdapter = {
  kind: "live",
  tenants: {
    list: () => request("/tenants"),
    get: (tenantId) => request(`/tenants/${tenantId}`),
  },
  programs: {
    listByTenant: (tenantId) => request(`/tenants/${tenantId}/programs`),
    get: (tenantId, programId) => request(`/tenants/${tenantId}/programs/${programId}`),
  },
  workstreams: {
    listByProgram: (tenantId, programId) =>
      request(`/tenants/${tenantId}/programs/${programId}/workstreams`),
  },
  useCases: {
    listByProgram: (tenantId, programId) =>
      request(`/tenants/${tenantId}/programs/${programId}/use-cases`),
  },
  releases: {
    listByProgram: (tenantId, programId) =>
      request(`/tenants/${tenantId}/programs/${programId}/releases`),
  },
  suggestions: {
    listByTenant: (tenantId) => request(`/tenants/${tenantId}/ai-suggestions`),
    decide: (tenantId, suggestionId, decision) =>
      request(`/tenants/${tenantId}/ai-suggestions/${suggestionId}/decision`, {
        method: "POST",
        body: JSON.stringify(decision),
      }),
  },
  audit: {
    listByTenant: (tenantId, limit = 100) =>
      request(`/tenants/${tenantId}/audit?limit=${limit}`),
    append: (entry: Omit<AuditEntry, "id" | "timestamp">) =>
      request(`/tenants/${entry.tenantId}/audit`, { method: "POST", body: JSON.stringify(entry) }),
  },
};
