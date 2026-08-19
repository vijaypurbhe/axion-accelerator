import { config } from "@/config";
import type { AxionDataAdapter } from "./contracts";
import { mockAdapter } from "./mock/mockAdapter";
import { liveAdapter } from "./live/liveAdapter";

/**
 * Single selection point for the Phase 0 reference data layer. Feature code must
 * not import adapters directly. The REST adapter is used only when a base URL is
 * configured; otherwise the in-browser reference data is served.
 */
export const dataAdapter: AxionDataAdapter =
  config.dataMode === "live" && config.apiBaseUrl ? liveAdapter : mockAdapter;

export type { AxionDataAdapter } from "./contracts";
