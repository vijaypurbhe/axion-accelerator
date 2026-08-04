import {
  phase3Mappings,
  phase3Products,
  phase3SourceCatalog,
  phase3Suggestions,
  resetPhase3Store,
} from "@/repositories/mock/phase3Store";

/**
 * Phase 3 service layer. Pages and hooks depend on this module, never on the store directly,
 * so a live Data 360 metadata / DLO-DMO adapter can be substituted without touching feature code.
 */
export const dataProductService = phase3Products;
export const fieldMappingService = phase3Mappings;
export const sourceCatalogService = phase3SourceCatalog;
export const dataAiSuggestionService = phase3Suggestions;
export const resetPhase3 = resetPhase3Store;
