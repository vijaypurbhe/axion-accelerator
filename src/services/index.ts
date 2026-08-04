import { clients, clientGroups, contacts, coverageMembers, commitments, interactions, opportunities, relationshipEdges, relationshipNodes } from "@/data/clients";
import { projects } from "@/data/projects";
import { approvals, conditions, reviews, tasks } from "@/data/diligence";
import { complianceRequirements, covenants, exposures, riskSignals } from "@/data/risk";
import { exposureTransactions } from "@/data/transactions";
import { documents } from "@/data/documents";
import { serviceCases } from "@/data/cases";
import { recommendations } from "@/data/recommendations";
import { accessRoles, aiUseCases, auditEvents, dataQualityIssues, integrationEvents, integrationSystems, migrationObjects } from "@/data/platform";
import type { PersonaId } from "@/types";

export const ClientService = {
  all: () => clients,
  get: (id?: string) => clients.find((c) => c.id === id) ?? null,
  group: (groupId: string) => clientGroups.find((g) => g.id === groupId) ?? null,
  contacts: (clientId: string) => contacts.filter((c) => c.clientId === clientId),
  coverage: (clientId: string) => coverageMembers.filter((c) => c.clientId === clientId),
  interactions: (clientId: string) => interactions.filter((i) => i.clientId === clientId),
  commitments: (clientId: string) => commitments.filter((c) => c.clientId === clientId),
  opportunities: (clientId: string) => opportunities.filter((o) => o.clientId === clientId),
  graph: (clientId: string) => ({
    nodes: relationshipNodes.filter((n) => n.clientId === clientId),
    edges: relationshipEdges.filter((e) => e.clientId === clientId),
  }),
};

export const ProjectService = {
  all: () => projects,
  get: (id?: string) => projects.find((p) => p.id === id) ?? null,
  byClient: (clientId: string) => projects.filter((p) => p.clientId === clientId),
  reviews: (projectId: string) => reviews.filter((r) => r.projectId === projectId),
  approvals: (projectId: string) => approvals.filter((a) => a.projectId === projectId),
  conditions: (projectId: string) => conditions.filter((c) => c.projectId === projectId),
  tasks: (projectId: string) => tasks.filter((t) => t.projectId === projectId),
  documents: (projectId: string) => documents.filter((d) => d.projectId === projectId),
  interactions: (projectId: string) => interactions.filter((i) => i.projectId === projectId),
};

export const PipelineService = {
  opportunities: () => opportunities,
};

export const DiligenceService = {
  reviews: () => reviews,
  approvals: () => approvals,
  conditions: () => conditions,
  tasks: () => tasks,
};

export const RiskService = {
  exposures: () => exposures,
  covenants: () => covenants,
  signals: () => riskSignals,
  compliance: () => complianceRequirements,
  transactions: () => exposureTransactions,
  transactionsByExposure: (exposureId: string) => exposureTransactions.filter((t) => t.exposureId === exposureId),
  transactionsByClient: (clientId: string) => exposureTransactions.filter((t) => t.clientId === clientId),
};

export const DocumentService = {
  all: () => documents,
  get: (id?: string) => documents.find((d) => d.id === id) ?? null,
  byClient: (clientId: string) => documents.filter((d) => d.clientId === clientId),
};

export const CaseService = {
  all: () => serviceCases,
  get: (id?: string) => serviceCases.find((c) => c.id === id) ?? null,
  byClient: (clientId: string) => serviceCases.filter((c) => c.clientId === clientId),
};

export const RecommendationService = {
  all: () => recommendations,
  forPersona: (personaId: PersonaId) => recommendations.filter((r) => r.personaIds.includes(personaId)),
  forClient: (clientId: string) => recommendations.filter((r) => r.clientId === clientId),
  forProject: (projectId: string) => recommendations.filter((r) => r.projectId === projectId),
};

export const PlatformService = {
  systems: () => integrationSystems,
  events: () => integrationEvents,
  migration: () => migrationObjects,
  dataQuality: () => dataQualityIssues,
  aiUseCases: () => aiUseCases,
  accessRoles: () => accessRoles,
  audit: () => auditEvents,
};

export interface SearchHit {
  group: "Clients" | "Projects" | "Documents" | "Cases" | "Conditions";
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
}

export const search = (raw: string): SearchHit[] => {
  const q = raw.trim().toLowerCase();
  if (q.length < 2) return [];
  const hit = (...values: (string | undefined)[]) => values.some((v) => v?.toLowerCase().includes(q));
  const out: SearchHit[] = [];

  clients.forEach((c) => {
    if (hit(c.name, c.shortName, c.country, c.sector, c.relationshipOwner))
      out.push({ group: "Clients", id: c.id, title: c.name, subtitle: `${c.sector} · ${c.country}`, meta: c.relationshipTier, href: `/clients/${c.id}` });
  });
  projects.forEach((p) => {
    if (hit(p.name, p.code, p.clientName, p.country, p.sector))
      out.push({ group: "Projects", id: p.id, title: p.name, subtitle: `${p.clientName} · ${p.stage}`, meta: p.code, href: `/projects/${p.id}` });
  });
  documents.forEach((d) => {
    if (hit(d.name, d.category, d.aiSummary))
      out.push({ group: "Documents", id: d.id, title: d.name, subtitle: d.category, meta: `${d.pages} pages`, href: `/documents/${d.id}` });
  });
  serviceCases.forEach((c) => {
    if (hit(c.subject, c.caseNumber, c.type))
      out.push({ group: "Cases", id: c.id, title: c.subject, subtitle: `${c.type} · ${c.status}`, meta: c.caseNumber, href: `/service` });
  });
  conditions.forEach((c) => {
    if (hit(c.name, c.owner))
      out.push({ group: "Conditions", id: c.id, title: c.name, subtitle: `${c.type} · ${c.status}`, meta: c.owner, href: `/approvals` });
  });

  return out.slice(0, 40);
};
