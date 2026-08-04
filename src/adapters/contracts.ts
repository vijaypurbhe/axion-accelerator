import type {
  AiSuggestion,
  AiSuggestionStatus,
  AuditEntry,
  PersonaId,
  Program,
  Release,
  Tenant,
  UseCase,
  Workstream,
} from "@/domain/types";

/**
 * Repository contracts between the UI and any data layer.
 * Every tenant-scoped method takes a tenantId; adapters must never return
 * records belonging to another tenant.
 */

export interface TenantRepository {
  list(): Promise<Tenant[]>;
  get(tenantId: string): Promise<Tenant | null>;
}

export interface ProgramRepository {
  listByTenant(tenantId: string): Promise<Program[]>;
  get(tenantId: string, programId: string): Promise<Program | null>;
}

export interface WorkstreamRepository {
  listByProgram(tenantId: string, programId: string): Promise<Workstream[]>;
}

export interface UseCaseRepository {
  listByProgram(tenantId: string, programId: string): Promise<UseCase[]>;
}

export interface ReleaseRepository {
  listByProgram(tenantId: string, programId: string): Promise<Release[]>;
}

export interface AiSuggestionDecision {
  readonly status: Exclude<AiSuggestionStatus, "pending">;
  readonly persona: PersonaId;
  readonly editedValue?: unknown;
}

export interface AiSuggestionRepository {
  listByTenant(tenantId: string): Promise<AiSuggestion[]>;
  decide(tenantId: string, suggestionId: string, decision: AiSuggestionDecision): Promise<AiSuggestion>;
}

export interface AuditRepository {
  listByTenant(tenantId: string, limit?: number): Promise<AuditEntry[]>;
  append(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry>;
}

export interface AxionDataAdapter {
  readonly kind: "mock" | "live";
  readonly tenants: TenantRepository;
  readonly programs: ProgramRepository;
  readonly workstreams: WorkstreamRepository;
  readonly useCases: UseCaseRepository;
  readonly releases: ReleaseRepository;
  readonly suggestions: AiSuggestionRepository;
  readonly audit: AuditRepository;
}
