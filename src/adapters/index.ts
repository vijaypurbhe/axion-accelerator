import { config } from "@/config";
import type { AxionDataAdapter } from "./contracts";
import { mockAdapter } from "./mock/mockAdapter";
import { liveAdapter } from "./live/liveAdapter";

/** Single selection point for the data layer. Feature code must not import adapters directly. */
export const dataAdapter: AxionDataAdapter = config.dataMode === "live" ? liveAdapter : mockAdapter;

export type { AxionDataAdapter } from "./contracts";
