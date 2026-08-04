import { ClientService, DiligenceService, PlatformService, ProjectService, RiskService, CaseService } from "@/services";
import { currency } from "@/lib/format";

export interface PersonaKpi {
  key: string;
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  route?: string;
}

const pct = (n: number) => `${Math.round(n)}%`;

export function buildKpi(key: string): PersonaKpi | null {
  const clients = ClientService.all();
  const projects = ProjectService.all();

  switch (key) {
    case "activeClients": {
      const strategic = clients.filter((c) => c.relationshipTier === "Strategic").length;
      return {
        key,
        label: "Active clients",
        value: String(clients.length),
        hint: `${strategic} strategic relationships`,
        route: "/clients",
      };
    }
    case "pipelineValue": {
      const value = clients.reduce((s, c) => s + c.pipelineValueUsd, 0);
      return {
        key,
        label: "Pipeline value",
        value: currency(value, { compact: true }),
        hint: "Across active opportunities",
        route: "/projects",
      };
    }
    case "exposure": {
      const value = clients.reduce((s, c) => s + c.totalExposureUsd, 0);
      return {
        key,
        label: "Committed exposure",
        value: currency(value, { compact: true }),
        hint: `${clients.length} client relationships`,
      };
    }
    case "activeProjects": {
      const atRisk = projects.filter((p) => p.health === "At Risk" || p.health === "Critical").length;
      return {
        key,
        label: "Active projects",
        value: String(projects.length),
        hint: "Investment lifecycle",
        delta: `${atRisk} need attention`,
        route: "/projects",
      };
    }
    case "engagementCoverage": {
      const covered = clients.filter((c) => c.sentiment !== "Guarded").length;
      return {
        key,
        label: "Engagement coverage",
        value: pct((covered / Math.max(clients.length, 1)) * 100),
        hint: "Clients engaged in last 90 days",
        tone: "success",
      };
    }
    case "awaitingApproval": {
      const approvals = DiligenceService.approvals();
      const pending = approvals.filter((a) => a.status === "Pending" || a.status === "In Review" || a.status === "Escalated");
      const breaching = pending.filter((a) => a.slaElapsed > a.slaDays).length;
      return {
        key,
        label: "Awaiting approval",
        value: String(pending.length),
        hint: "Across all approval stages",
        delta: `${breaching} past SLA`,
        tone: breaching > 0 ? "warning" : "neutral",
        route: "/projects",
      };
    }
    case "outstandingConditions": {
      const conditions = DiligenceService.conditions();
      const open = conditions.filter((c) => c.status !== "Satisfied");
      const overdue = open.filter((c) => c.status === "Overdue" || c.status === "Escalated").length;
      return {
        key,
        label: "Outstanding conditions",
        value: String(open.length),
        hint: `${conditions.length} tracked in register`,
        delta: `${overdue} overdue`,
        tone: overdue > 0 ? "warning" : "neutral",
      };
    }
    case "documentCompleteness": {
      const avg = projects.reduce((s, p) => s + p.documentationCompleteness, 0) / Math.max(projects.length, 1);
      return { key, label: "Document completeness", value: pct(avg), hint: "Average across active projects", tone: "success" };
    }
    case "highRiskProjects": {
      const high = projects.filter((p) => p.riskRating === "High" || p.riskRating === "Elevated");
      const critical = projects.filter((p) => p.health === "Critical").length;
      return {
        key,
        label: "High-risk projects",
        value: String(high.length),
        hint: "Elevated or high rating",
        delta: `${critical} critical health`,
        tone: "danger",
        route: "/projects",
      };
    }
    case "policyExceptions": {
      const exceptions = RiskService.compliance().filter((c) => c.status === "Exception" || c.status === "Overdue");
      return { key, label: "Policy exceptions", value: String(exceptions.length), hint: "Compliance frameworks in exception", tone: "warning" };
    }
    case "earlyWarnings": {
      const signals = RiskService.signals();
      const critical = signals.filter((s) => s.severity === "Critical").length;
      return {
        key,
        label: "Early-warning signals",
        value: String(signals.length),
        hint: "AI-detected across portfolio",
        delta: `${critical} critical`,
        tone: "warning",
      };
    }
    case "openCases": {
      const cases = CaseService.all().filter((c) => c.status !== "Resolved");
      const escalated = cases.filter((c) => c.status === "Escalated").length;
      return { key, label: "Open cases", value: String(cases.length), hint: "Service queue", delta: `${escalated} escalated`, tone: escalated > 0 ? "warning" : "neutral" };
    }
    case "slaAttainment": {
      const cases = CaseService.all();
      const within = cases.filter((c) => c.slaMinutesRemaining > 0).length;
      return { key, label: "SLA attainment", value: pct((within / Math.max(cases.length, 1)) * 100), hint: "Cases within SLA window", tone: "success" };
    }
    case "integrationExceptions": {
      const failed = PlatformService.events().filter((e) => e.status !== "Delivered");
      const degraded = PlatformService.systems().filter((s) => s.status !== "Healthy").length;
      return {
        key,
        label: "Integration exceptions",
        value: String(failed.length),
        hint: `${degraded} systems degraded`,
        tone: failed.length > 0 ? "warning" : "success",
      };
    }
    case "dataQuality": {
      const issues = PlatformService.dataQuality();
      const open = issues.filter((i) => i.status !== "Resolved").length;
      const objects = PlatformService.migration();
      const score = objects.reduce((s, o) => s + o.qualityScore, 0) / Math.max(objects.length, 1);
      return { key, label: "Data quality score", value: pct(score), hint: `${open} open data issues`, tone: "success" };
    }
    case "migrationReadiness": {
      const objects = PlatformService.migration();
      const readiness = objects.reduce((s, o) => s + o.transformationSuccess, 0) / Math.max(objects.length, 1);
      const defects = objects.reduce((s, o) => s + o.openDefects, 0);
      return { key, label: "Migration readiness", value: pct(readiness), hint: "Cutover readiness across objects", delta: `${defects} open defects` };
    }
    case "aiGovernance": {
      const cases = PlatformService.aiUseCases();
      const grounded = cases.reduce((s, c) => s + c.groundedRate, 0) / Math.max(cases.length, 1);
      const live = cases.filter((c) => c.status === "Live").length;
      return { key, label: "AI grounded rate", value: pct(grounded * (grounded <= 1 ? 100 : 1)), hint: `${live} use cases live`, tone: "success" };
    }
    case "developmentOutcomes": {
      const outcomes = projects.flatMap((p) => p.developmentOutcomes);
      const onTrack = outcomes.filter((o) => o.status !== "Lagging").length;
      return {
        key,
        label: "Development outcomes",
        value: pct((onTrack / Math.max(outcomes.length, 1)) * 100),
        hint: `${outcomes.length} indicators tracked`,
        tone: "success",
      };
    }
    default:
      return null;
  }
}

export const personaKpis = (keys: string[]): PersonaKpi[] =>
  keys.map(buildKpi).filter((k): k is PersonaKpi => Boolean(k));
