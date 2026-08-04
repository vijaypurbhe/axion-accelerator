import {
  phase2Architecture,
  phase2Assessment,
  phase2Lifecycle,
  phase2Recommendations,
  resetPhase2Store,
} from "@/repositories/mock/phase2Store";

/**
 * Phase 2 service layer. Pages and hooks depend on this module, never on the store directly,
 * so a live adapter can be substituted without touching feature code.
 */
export const lifecycleService = phase2Lifecycle;
export const assessmentResponseService = phase2Assessment;
export const recommendationService = phase2Recommendations;
export const architectureStudioService = phase2Architecture;
export const resetPhase2 = resetPhase2Store;
