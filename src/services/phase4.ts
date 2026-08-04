import { phase4Connectivity, phase4Identity, resetPhase4Store } from "@/repositories/mock/phase4Store";

/**
 * Phase 4 service layer. Pages and hooks depend on this module rather than the store,
 * so a live adapter can be substituted without touching feature code.
 */
export const connectivityService = phase4Connectivity;
export const identityService = phase4Identity;
export const resetPhase4 = resetPhase4Store;
