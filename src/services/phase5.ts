import {
  phase5Controls,
  phase5Evidence,
  phase5Governance,
  phase5Risks,
  phase5Tests,
  phase5Waivers,
  resetPhase5Store,
} from "@/repositories/mock/phase5Store";

/**
 * Phase 5 service layer. Pages and hooks depend on this module, never on the store directly,
 * so a live adapter can be substituted without touching feature code.
 */
export const controlService = phase5Controls;
export const evidenceService = phase5Evidence;
export const controlTestService = phase5Tests;
export const governanceService = phase5Governance;
export const riskService = phase5Risks;
export const gateWaiverService = phase5Waivers;
export const resetPhase5 = resetPhase5Store;
