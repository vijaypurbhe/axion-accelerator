import { dataAdapter } from "@/adapters";
import type {
  AiSuggestion,
  AuditAction,
  AuditEntry,
  PersonaId,
  Program,
  Release,
  Tenant,
  UseCase,
  Workstream,
} from "@/domain/types";

/** Service layer: the only surface feature code should call for data. */

export const tenantService = {
  list: (): Promise<Tenant[]> => dataAdapter.tenants.list(),
  get: (tenantId: string): Promise<Tenant | null> => dataAdapter.tenants.get(tenantId),
};

export const programService = {
  listByTenant: (tenantId: string): Promise<Program[]> => dataAdapter.programs.listByTenant(tenantId),
  get: (tenantId: string, programId: string): Promise<Program | null> =>
    dataAdapter.programs.get(tenantId, programId),
};

export const workstreamService = {
  listByProgram: (tenantId: string, programId: string): Promise<Workstream[]> =>
    dataAdapter.workstreams.listByProgram(tenantId, programId),
};

export const useCaseService = {
  listByProgram: (tenantId: string, programId: string): Promise<UseCase[]> =>
    dataAdapter.useCases.listByProgram(tenantId, programId),
};

export const releaseService = {
  listByProgram: (tenantId: string, programId: string): Promise<Release[]> =>
    dataAdapter.releases.listByProgram(tenantId, programId),
};

export interface AuditContext {
  readonly tenantId: string;
  readonly actor: string;
  readonly persona: PersonaId;
}

export const auditService = {
  list: (tenantId: string, limit?: number): Promise<AuditEntry[]> =>
    dataAdapter.audit.listByTenant(tenantId, limit),
  record: (
    context: AuditContext,
    input: { action: AuditAction; entityRef: string; summary: string; before?: string; after?: string },
  ): Promise<AuditEntry> => dataAdapter.audit.append({ ...context, ...input }),
};

export const suggestionService = {
  list: (tenantId: string): Promise<AiSuggestion[]> => dataAdapter.suggestions.listByTenant(tenantId),

  /** Records the decision and the matching audit entry as one logical operation. */
  decide: async (
    context: AuditContext,
    suggestion: AiSuggestion,
    decision: { status: "accepted" | "edited" | "rejected"; editedValue?: unknown },
  ): Promise<AiSuggestion> => {
    const updated = await dataAdapter.suggestions.decide(context.tenantId, suggestion.id, {
      status: decision.status,
      persona: context.persona,
      editedValue: decision.editedValue,
    });

    const actionByStatus: Record<typeof decision.status, AuditAction> = {
      accepted: "ai.suggestion.accepted",
      edited: "ai.suggestion.edited",
      rejected: "ai.suggestion.rejected",
    };

    await auditService.record(context, {
      action: actionByStatus[decision.status],
      entityRef: suggestion.targetRef,
      summary: `AI suggestion "${suggestion.title}" was ${decision.status}.`,
      before: JSON.stringify(suggestion.value),
      after: JSON.stringify(updated.value),
    });

    return updated;
  },
};
