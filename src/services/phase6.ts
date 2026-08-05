import { phase6Agents, resetPhase6Store } from "@/repositories/mock/phase6Store";

/**
 * Phase 6 service layer. Pages and hooks depend on this module rather than the store,
 * so a live adapter can be substituted without touching feature code.
 */
export const agentDesignService = phase6Agents;
export const resetPhase6 = resetPhase6Store;
