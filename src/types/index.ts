/* PHOENIX 360 — core domain model */

export type PersonaId =
  | "investment_officer"
  | "project_lead"
  | "risk_officer"
  | "operations"
  | "portfolio_manager"
  | "executive"
  | "administrator";

export interface Persona {
  id: PersonaId;
  name: string;
  title: string;
  initials: string;
  unit: string;
  focus: string;
  homeKpis: string[];
  navEmphasis: string[];
  greeting: string;
}

export type Region =
  | "Sub-Saharan Africa"
  | "Latin America and Caribbean"
  | "South Asia"
  | "East Asia and Pacific"
  | "Middle East and North Africa"
  | "Europe and Central Asia";

export type Sector =
  | "Infrastructure"
  | "Financial Institutions"
  | "Manufacturing"
  | "Agribusiness"
  | "Technology"
  | "Healthcare"
  | "Energy"
  | "Transport";

export type RiskRating = "Low" | "Moderate" | "Elevated" | "High";
export type HealthStatus = "On Track" | "Watch" | "At Risk" | "Critical";

export const PROJECT_STAGES = [
  "Opportunity",
  "Early Review",
  "Mandate",
  "Concept Review",
  "Due Diligence",
  "Investment Review",
  "Approval",
  "Commitment",
  "Disbursement",
  "Supervision",
  "Closure",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export interface ClientGroup {
  id: string;
  name: string;
  headquarters: string;
  memberClientIds: string[];
  groupExposureUsd: number;
}

export interface Client {
  id: string;
  name: string;
  shortName: string;
  groupId: string;
  clientType: "Corporate Sponsor" | "Financial Institution" | "State-Owned Enterprise" | "Fund" | "Non-Profit Partner";
  country: string;
  region: Region;
  sector: Sector;
  relationshipTier: "Strategic" | "Core" | "Emerging";
  riskRating: RiskRating;
  totalExposureUsd: number;
  proposedExposureUsd: number;
  pipelineValueUsd: number;
  activeProjects: number;
  relationshipOwner: string;
  coverageTeam: string[];
  lastEngagement: string;
  dataConfidence: number;
  sentiment: "Positive" | "Neutral" | "Guarded";
  engagementTrend: number[];
  summary: string;
  strategicObjectives: string[];
  openIssues: string[];
  opportunities: string[];
  footprint: string[];
  foundedYear: number;
  employees: number;
  revenueUsd: number;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  title: string;
  seniority: "Board" | "C-Suite" | "Executive" | "Senior" | "Operational";
  influence: number;
  sentiment: "Positive" | "Neutral" | "Guarded";
  email: string;
  phone: string;
  lastInteraction: string;
  engagementScore: number;
  isDecisionMaker: boolean;
  location: string;
}

export type RelationshipNodeKind = "client" | "subsidiary" | "sponsor" | "financial-institution" | "internal" | "partner" | "contact";

export interface RelationshipNode {
  id: string;
  clientId: string;
  label: string;
  subLabel: string;
  kind: RelationshipNodeKind;
  internal: boolean;
  influence: number;
  strength: number;
  activeProjectIds: string[];
  contactId?: string;
  x: number;
  y: number;
}

export interface RelationshipEdge {
  id: string;
  clientId: string;
  source: string;
  target: string;
  type: "Ownership" | "Sponsorship" | "Co-Financing" | "Coverage" | "Advisory" | "Supplier";
  strength: number;
}

export interface CoverageMember {
  id: string;
  clientId: string;
  name: string;
  role: string;
  unit: string;
  engagementsLast90: number;
  lastInteraction: string;
  strength: number;
  gap?: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  name: string;
  stage: ProjectStage;
  valueUsd: number;
  probability: number;
  expectedMandate: string;
  owner: string;
  ageDays: number;
  sector: Sector;
  region: Region;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  date: string;
  status: "Complete" | "In Progress" | "Planned" | "Slipped";
  criticalPath: boolean;
}

export interface InvestmentProject {
  id: string;
  code: string;
  name: string;
  clientId: string;
  clientName: string;
  country: string;
  region: Region;
  sector: Sector;
  product: "Senior Loan" | "Equity" | "Mezzanine" | "Guarantee" | "Trade Facility" | "Advisory";
  proposedCommitmentUsd: number;
  totalProjectCostUsd: number;
  stage: ProjectStage;
  riskRating: RiskRating;
  health: HealthStatus;
  approvalReadiness: number;
  documentationCompleteness: number;
  conditionsComplete: number;
  conditionsTotal: number;
  expectedApproval: string;
  daysInStage: number;
  predictedDelayDays: number;
  delayRisk: "Low" | "Medium" | "High";
  investmentOfficer: string;
  projectLead: string;
  latestMilestone: string;
  strategicRationale: string;
  summary: string;
  financingStructure: { source: string; amountUsd: number; instrument: string }[];
  milestones: ProjectMilestone[];
  sponsors: string[];
  team: { name: string; role: string; unit: string }[];
  developmentOutcomes: DevelopmentOutcome[];
  createdAt: string;
}

export interface DevelopmentOutcome {
  id: string;
  name: string;
  metric: string;
  target: number;
  actual: number;
  unit: string;
  status: "Exceeding" | "On Track" | "Lagging";
}

export interface Review {
  id: string;
  projectId: string;
  workstream: Workstream;
  reviewer: string;
  status: "Not Started" | "In Progress" | "Complete" | "Blocked";
  completion: number;
  dueDate: string;
  lastUpdate: string;
  findingsOpen: number;
  findingsCritical: number;
  riskLevel: RiskRating;
  requiredDocuments: string[];
  receivedDocuments: string[];
  dependsOn: Workstream[];
  notes: string;
}

export type Workstream =
  | "Financial"
  | "Legal"
  | "Credit"
  | "Environmental and Social"
  | "Integrity"
  | "Technical"
  | "Insurance"
  | "Tax"
  | "Development Impact"
  | "Country Risk";

export interface Approval {
  id: string;
  projectId: string;
  stageName:
    | "Project Team Review"
    | "Risk Review"
    | "Legal Review"
    | "Environmental and Social Review"
    | "Investment Committee"
    | "Executive Approval"
    | "Board Approval";
  status: "Pending" | "In Review" | "Approved" | "Approved with Conditions" | "Returned for Revision" | "Escalated" | "Rejected" | "Not Required";
  reviewers: string[];
  submittedOn?: string;
  decidedOn?: string;
  slaDays: number;
  slaElapsed: number;
  decision?: string;
  comments: { author: string; at: string; text: string }[];
  conditionIds: string[];
  documentIds: string[];
}

export interface Condition {
  id: string;
  projectId: string;
  name: string;
  type: "Condition Precedent" | "Condition Subsequent" | "Covenant" | "Disbursement Condition";
  owner: string;
  dueDate: string;
  status: "Open" | "In Progress" | "Satisfied" | "Overdue" | "Waiver Requested" | "Escalated";
  evidence?: string;
  dependency?: string;
  waiverRequested: boolean;
  escalated: boolean;
  completedOn?: string;
  overdueRisk: number;
  aiSuggestedOwner?: string;
  sourceMinutes?: string;
}

export interface Exposure {
  id: string;
  clientId: string;
  entity: string;
  country: string;
  region: Region;
  sector: Sector;
  product: string;
  committedUsd: number;
  outstandingUsd: number;
  proposedUsd: number;
  riskRating: RiskRating;
  ratingHistory: { period: string; rating: number }[];
}

export interface Covenant {
  id: string;
  projectId: string;
  clientId: string;
  name: string;
  threshold: string;
  currentValue: string;
  status: "Compliant" | "Watch" | "Breach";
  testDate: string;
  frequency: "Quarterly" | "Semi-Annual" | "Annual";
}

export interface RiskSignal {
  id: string;
  title: string;
  category:
    | "Delayed Financial Reporting"
    | "Covenant Deterioration"
    | "Milestone Slippage"
    | "Relationship Sentiment"
    | "Sponsor Ownership Change"
    | "Environmental and Social"
    | "Country Risk"
    | "Repeated Service Requests"
    | "Data Inconsistency"
    | "Missing Review Evidence";
  severity: "Critical" | "High" | "Medium" | "Low";
  clientId: string;
  projectId?: string;
  evidence: string;
  source: string;
  confidence: number;
  potentialImpact: string;
  recommendedAction: string;
  owner: string;
  detectedAt: string;
  status: "New" | "Acknowledged" | "Escalated" | "Dismissed";
}

export interface ComplianceRequirement {
  id: string;
  clientId: string;
  name: string;
  framework: string;
  status: "Compliant" | "In Review" | "Exception" | "Overdue";
  lastReview: string;
  nextReview: string;
  owner: string;
}

export interface Interaction {
  id: string;
  clientId: string;
  projectId?: string;
  type: "Meeting" | "Call" | "Email" | "Site Visit" | "Workshop" | "Committee";
  subject: string;
  at: string;
  participants: string[];
  sentiment: "Positive" | "Neutral" | "Guarded";
  summary: string;
  owner: string;
  channel: string;
}

export interface Commitment {
  id: string;
  clientId: string;
  projectId?: string;
  description: string;
  madeBy: string;
  dueDate: string;
  status: "Open" | "Met" | "Overdue";
}

export interface Task {
  id: string;
  projectId?: string;
  clientId?: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "Not Started" | "In Progress" | "Blocked" | "Complete";
  priority: "Critical" | "High" | "Medium" | "Low";
  workstream?: Workstream;
  source: "Manual" | "AI Recommendation" | "Finding" | "Condition";
}

export interface ServiceCase {
  id: string;
  caseNumber: string;
  subject: string;
  type:
    | "Client request"
    | "Project issue"
    | "Data correction"
    | "Document request"
    | "Integration exception"
    | "Access request"
    | "Compliance inquiry"
    | "Conditions clarification";
  clientId: string;
  projectId?: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "New" | "In Progress" | "Awaiting Client" | "Escalated" | "Resolved";
  owner: string;
  openedAt: string;
  slaDueAt: string;
  slaMinutesRemaining: number;
  sentiment: "Positive" | "Neutral" | "Negative";
  channel: "Email" | "Portal" | "Phone" | "Chat" | "System";
  aiRecommendation: string;
  aiSummary: string;
  suggestedResponse: string;
  relatedSystems: string[];
  knowledgeIds: string[];
  duplicateOf?: string;
  timeline: { at: string; actor: string; text: string }[];
}

export interface DocumentVersion {
  version: string;
  at: string;
  author: string;
  changeSummary: string;
}

export interface ExtractedTerm {
  label: string;
  value: string;
  page: number;
  confidence: number;
}

export interface DocumentFinding {
  id: string;
  text: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  page: number;
  confidence: number;
  accepted?: boolean;
}

export interface DocumentRecord {
  id: string;
  name: string;
  category:
    | "Concept documents"
    | "Financial statements"
    | "Legal agreements"
    | "Environmental assessments"
    | "Credit reviews"
    | "Investment committee materials"
    | "Board materials"
    | "Conditions evidence"
    | "Monitoring reports"
    | "Client correspondence";
  clientId: string;
  projectId?: string;
  workstream?: Workstream;
  uploadedAt: string;
  uploadedBy: string;
  pages: number;
  sizeMb: number;
  classification: "Public" | "Internal" | "Confidential" | "Strictly Confidential";
  retention: string;
  aiSummary: string;
  entities: string[];
  keyTerms: ExtractedTerm[];
  obligations: string[];
  risks: string[];
  findings: DocumentFinding[];
  versions: DocumentVersion[];
  confidence: number;
  relatedDocumentIds: string[];
  previewText: string[];
}

export interface IntegrationSystem {
  id: string;
  name: string;
  layer: "Salesforce" | "Integration Fabric" | "Azure" | "Enterprise" | "External";
  kind: string;
  status: "Healthy" | "Degraded" | "Failed";
  lastSync: string;
  messagesProcessed: number;
  failedEvents: number;
  latencyMs: number;
  apiResponseMs: number;
  dataQualityExceptions: number;
  retryQueue: number;
  businessImpact: string;
  connectsTo: string[];
  x: number;
  y: number;
}

export interface IntegrationEvent {
  id: string;
  eventId: string;
  source: string;
  target: string;
  object: string;
  timestamp: string;
  status: "Delivered" | "Retrying" | "Failed";
  error?: string;
  payload: Record<string, unknown>;
  clientId?: string;
  projectId?: string;
  correlationId: string;
  attempts: number;
}

export interface MigrationObject {
  id: string;
  object: string;
  sourceSystem: string;
  recordsAssessed: number;
  recordsMigrated: number;
  qualityScore: number;
  duplicateRate: number;
  transformationSuccess: number;
  reconciliationVariance: number;
  openDefects: number;
  stage:
    | "Discover"
    | "Profile"
    | "Cleanse"
    | "Map"
    | "Transform"
    | "Validate"
    | "Reconcile"
    | "Cutover"
    | "Hypercare";
  aiNotes: string[];
}

export interface DataQualityIssue {
  id: string;
  object: string;
  field: string;
  issue: string;
  records: number;
  severity: "Critical" | "High" | "Medium" | "Low";
  recommendation: string;
  status: "Open" | "In Remediation" | "Resolved";
}

export interface AIRecommendation {
  id: string;
  title: string;
  detail: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  impact: string;
  dueDate: string;
  recommendedOwner: string;
  personaIds: PersonaId[];
  clientId?: string;
  projectId?: string;
  actionLabel: string;
  actionRoute: string;
  confidence: number;
  rationale: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  object: string;
  detail: string;
  system: string;
  clientId?: string;
  projectId?: string;
}

export interface AIGovernanceUseCase {
  id: string;
  name: string;
  model: string;
  promptVersion: string;
  grounded: boolean;
  groundedRate: number;
  overrideRate: number;
  lowConfidenceRate: number;
  restrictedAttempts: number;
  biasReview: "Passed" | "Scheduled" | "In Review";
  status: "Live" | "Pilot" | "Restricted";
}

export interface AccessRole {
  id: string;
  role: string;
  fieldLevel: string;
  projectAccess: string;
  regionRestriction: string;
  sensitiveDocuments: string;
  segregationOfDuties: string;
}

export interface Notification {
  id: string;
  title: string;
  detail: string;
  at: string;
  kind: "risk" | "approval" | "case" | "integration" | "relationship";
  read: boolean;
  route: string;
}
