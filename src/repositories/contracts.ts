import type {
  ActivityLog,
  AgentDesign,
  Approval,
  ApprovalState,
  ArchitectureDecision,
  Artifact,
  AssessmentScore,
  Client,
  Comment,
  DataProduct,
  Initiative,
  IntegrationConnection,
  Milestone,
  NewClientInput,
  NewInitiativeInput,
  Notification,
  RiskItem,
  RoleId,
  StageTask,
  Template,
  User,
} from "@/domain/models";

/** Actor context passed into every mutating repository call so audit can be written centrally. */
export interface ActorContext {
  readonly userId: string;
  readonly actor: string;
  readonly role: RoleId;
}

export interface AuthService {
  currentUser(): Promise<User | null>;
  signIn(input: { email: string; role: RoleId }): Promise<User>;
  signOut(): Promise<void>;
  switchRole(role: RoleId): Promise<User | null>;
  listDemoUsers(): Promise<User[]>;
}

export interface WorkspaceRepository {
  listClients(): Promise<Client[]>;
  getClient(clientId: string): Promise<Client | null>;
  createClient(input: NewClientInput, actor: ActorContext): Promise<Client>;
  listUsers(clientId: string): Promise<User[]>;
}

export interface InitiativeRepository {
  listByClient(clientId: string): Promise<Initiative[]>;
  listAll(): Promise<Initiative[]>;
  get(initiativeId: string): Promise<Initiative | null>;
  create(input: NewInitiativeInput, actor: ActorContext): Promise<Initiative>;
  update(initiativeId: string, patch: Partial<Initiative>, actor: ActorContext): Promise<Initiative>;
  archive(initiativeId: string, actor: ActorContext): Promise<Initiative>;
  setStage(initiativeId: string, stage: Initiative["currentStage"], actor: ActorContext): Promise<Initiative>;
  cloneFromTemplate(templateId: string, input: NewInitiativeInput, actor: ActorContext): Promise<Initiative>;
  listTasks(initiativeId: string): Promise<StageTask[]>;
  listMilestones(initiativeId: string): Promise<Milestone[]>;
  listRisks(initiativeId?: string): Promise<RiskItem[]>;
  listApprovals(initiativeId?: string): Promise<Approval[]>;
  decideApproval(approvalId: string, state: ApprovalState, actor: ActorContext, notes?: string): Promise<Approval>;
  listComments(initiativeId: string): Promise<Comment[]>;
}

export interface AssessmentRepository {
  listScores(initiativeId: string): Promise<AssessmentScore[]>;
}

export interface DataProductRepository {
  listByInitiative(initiativeId: string): Promise<DataProduct[]>;
  listConnections(initiativeId: string): Promise<IntegrationConnection[]>;
}

export interface ArchitectureRepository {
  listDecisions(initiativeId: string): Promise<ArchitectureDecision[]>;
  listAgentDesigns(initiativeId: string): Promise<AgentDesign[]>;
}

export interface AuditRepositoryV2 {
  list(filter: { clientId?: string; initiativeId?: string; limit?: number }): Promise<ActivityLog[]>;
  record(
    entry: Omit<ActivityLog, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "timestamp" | "tenantId"> & {
      tenantId: string;
    },
  ): Promise<ActivityLog>;
}

export interface ExportService {
  listArtifacts(initiativeId: string): Promise<Artifact[]>;
  generate(initiativeId: string, input: Pick<Artifact, "name" | "kind" | "stage" | "format">, actor: ActorContext): Promise<Artifact>;
}

export interface AIRecommendationService {
  listPending(clientId: string): Promise<
    {
      readonly id: string;
      readonly title: string;
      readonly rationale: string;
      readonly confidence?: number;
      readonly stage: string;
    }[]
  >;
}

export interface TemplateRepository {
  list(): Promise<Template[]>;
}

export interface NotificationRepository {
  list(clientId: string): Promise<Notification[]>;
  markAllRead(clientId: string): Promise<Notification[]>;
}

export interface IntegrationAdapter {
  readonly kind: "mock" | "rest";
  readonly auth: AuthService;
  readonly workspaces: WorkspaceRepository;
  readonly initiatives: InitiativeRepository;
  readonly assessments: AssessmentRepository;
  readonly dataProducts: DataProductRepository;
  readonly architecture: ArchitectureRepository;
  readonly audit: AuditRepositoryV2;
  readonly exports: ExportService;
  readonly recommendations: AIRecommendationService;
  readonly templates: TemplateRepository;
  readonly notifications: NotificationRepository;
}
