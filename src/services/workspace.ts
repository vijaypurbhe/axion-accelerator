import { integrationAdapter } from "@/repositories";
import type {
  ActorContext,
  AuthService,
  ArchitectureRepository,
  AssessmentRepository,
  DataProductRepository,
  ExportService,
  InitiativeRepository,
  TemplateRepository,
  WorkspaceRepository,
} from "@/repositories/contracts";
import type { ActivityLog, RoleId } from "@/domain/models";

/**
 * Service layer. Pages and hooks must only depend on these functions —
 * never on adapters, seeds or local storage directly.
 */

export const authService: AuthService = integrationAdapter.auth;
export const workspaceRepository: WorkspaceRepository = integrationAdapter.workspaces;
export const initiativeRepository: InitiativeRepository = integrationAdapter.initiatives;
export const assessmentRepository: AssessmentRepository = integrationAdapter.assessments;
export const dataProductRepository: DataProductRepository = integrationAdapter.dataProducts;
export const architectureRepository: ArchitectureRepository = integrationAdapter.architecture;
export const exportService: ExportService = integrationAdapter.exports;
export const templateRepository: TemplateRepository = integrationAdapter.templates;
export const notificationRepository = integrationAdapter.notifications;
export const aiRecommendationService = integrationAdapter.recommendations;

export const activityService = {
  list: (filter: { clientId?: string; initiativeId?: string; limit?: number }) =>
    integrationAdapter.audit.list(filter),
  record: (
    actor: ActorContext,
    input: {
      tenantId: string;
      clientId?: string;
      initiativeId?: string;
      action: string;
      objectType: string;
      objectId: string;
      summary: string;
      oldValueSummary?: string;
      newValueSummary?: string;
    },
  ): Promise<ActivityLog> =>
    integrationAdapter.audit.record({
      tenantId: input.tenantId,
      clientId: input.clientId,
      initiativeId: input.initiativeId,
      actor: actor.actor,
      role: actor.role,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      oldValueSummary: input.oldValueSummary,
      newValueSummary: input.newValueSummary,
      status: input.summary,
    }),
};

export const roleLabelFor = (role: RoleId) => role.replace(/-/g, " ");
