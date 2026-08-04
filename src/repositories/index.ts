import { config } from "@/config";
import { mockIntegrationAdapter, restIntegrationAdapter } from "./mock/mockRepositories";
import type { IntegrationAdapter } from "./contracts";

/** Single selection point for the Phase 1 workspace data layer. */
export const integrationAdapter: IntegrationAdapter =
  config.dataMode === "live" ? restIntegrationAdapter : mockIntegrationAdapter;

export type * from "./contracts";
