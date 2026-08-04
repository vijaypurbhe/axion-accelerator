import type { AxionDataAdapter } from "../contracts";
import type { AiSuggestion, AuditEntry } from "@/domain/types";
import {
  seedAudit,
  seedPrograms,
  seedReleases,
  seedSuggestions,
  seedTenants,
  seedUseCases,
  seedWorkstreams,
} from "./seed";

const LATENCY_MS = 180;

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

/** In-memory mutable state so decisions and audit writes persist for the session. */
const state = {
  suggestions: [...seedSuggestions] as AiSuggestion[],
  audit: [...seedAudit] as AuditEntry[],
};

const nextId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const mockAdapter: AxionDataAdapter = {
  kind: "mock",

  tenants: {
    list: () => delay([...seedTenants]),
    get: (tenantId) => delay(seedTenants.find((t) => t.id === tenantId) ?? null),
  },

  programs: {
    listByTenant: (tenantId) => delay(seedPrograms.filter((p) => p.tenantId === tenantId)),
    get: (tenantId, programId) =>
      delay(seedPrograms.find((p) => p.tenantId === tenantId && p.id === programId) ?? null),
  },

  workstreams: {
    listByProgram: (tenantId, programId) =>
      delay(seedWorkstreams.filter((w) => w.tenantId === tenantId && w.programId === programId)),
  },

  useCases: {
    listByProgram: (tenantId, programId) =>
      delay(seedUseCases.filter((u) => u.tenantId === tenantId && u.programId === programId)),
  },

  releases: {
    listByProgram: (tenantId, programId) =>
      delay(seedReleases.filter((r) => r.tenantId === tenantId && r.programId === programId)),
  },

  suggestions: {
    listByTenant: (tenantId) => delay(state.suggestions.filter((s) => s.tenantId === tenantId)),
    decide: (tenantId, suggestionId, decision) => {
      const existing = state.suggestions.find((s) => s.tenantId === tenantId && s.id === suggestionId);
      if (!existing) return Promise.reject(new Error(`Suggestion ${suggestionId} not found for tenant.`));
      const updated: AiSuggestion = {
        ...existing,
        status: decision.status,
        value: decision.status === "edited" ? decision.editedValue : existing.value,
        decidedAt: new Date().toISOString(),
        decidedBy: decision.persona,
      };
      state.suggestions = state.suggestions.map((s) => (s.id === suggestionId ? updated : s));
      return delay(updated);
    },
  },

  audit: {
    listByTenant: (tenantId, limit = 100) =>
      delay(
        state.audit
          .filter((entry) => entry.tenantId === tenantId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, limit),
      ),
    append: (entry) => {
      const created: AuditEntry = { ...entry, id: nextId("aud"), timestamp: new Date().toISOString() };
      state.audit = [created, ...state.audit];
      return delay(created);
    },
  },
};
