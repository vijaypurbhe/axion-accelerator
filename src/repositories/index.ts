import { config } from "@/config";
import { mockIntegrationAdapter } from "./mock/mockRepositories";
import { supabaseIntegrationAdapter } from "./supabase/workspaceStore";
import type { IntegrationAdapter } from "./contracts";

/**
 * Single selection point for the Phase 1 workspace data layer.
 * The server-backed adapter is the default; the browser-only mock adapter is
 * kept for offline demos and tests via VITE_AXION_DATA_MODE=mock.
 */
export const integrationAdapter: IntegrationAdapter =
  config.dataMode === "mock" ? mockIntegrationAdapter : supabaseIntegrationAdapter;

export type * from "./contracts";
