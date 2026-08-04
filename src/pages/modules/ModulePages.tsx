import ModulePlaceholder from "@/components/enterprise/ModulePlaceholder";

/**
 * Module shells for the accelerator engines delivered in later phases.
 * Each renders live workspace context, role awareness and the planned capability set.
 */

export const AssessmentsPage = () => (
  <ModulePlaceholder
    eyebrow="Workspace"
    title="Assessments"
    description="Readiness and maturity assessment engine across data, architecture, governance and agent readiness."
    capabilities={[
      "Weighted maturity scoring per capability domain",
      "Benchmark comparison against BFSI peer baselines",
      "Gap analysis with prioritised remediation backlog",
      "AI-suggested readiness findings with rationale and confidence",
    ]}
  />
);

export const ArchitecturePage = () => (
  <ModulePlaceholder
    eyebrow="Design & Build"
    title="Architecture"
    description="Target architecture workbench, decision records and canonical domain modeling."
    capabilities={[
      "Canonical domain model designer",
      "Architecture decision records with approval routing",
      "Reference architecture diagrams per use case",
      "Data 360 DLO and DMO alignment views",
    ]}
  />
);

export const DataProductsPage = () => (
  <ModulePlaceholder
    eyebrow="Design & Build"
    title="Data Products"
    description="Data product blueprinting, source-to-target mapping and quality contracts."
    capabilities={[
      "Data product blueprint editor with owners and SLAs",
      "Source-to-target mapping matrices",
      "Data quality rules and contract enforcement",
      "Lineage from source platform to unified profile",
    ]}
  />
);

export const ConnectivityPage = () => (
  <ModulePlaceholder
    eyebrow="Design & Build"
    title="Connectivity"
    description="Ingestion patterns across physical, zero-copy, cached acceleration and streaming."
    capabilities={[
      "Source platform connection registry and health",
      "Pattern selection guidance per source and workload",
      "Refresh cadence and volumetrics planning",
      "Connection readiness checks before Configure exit",
    ]}
  />
);

export const IdentityPage = () => (
  <ModulePlaceholder
    eyebrow="Design & Build"
    title="Identity"
    description="Identity resolution rulesets and unified profile design."
    capabilities={[
      "Match and reconciliation ruleset builder",
      "Household and party linkage strategies",
      "Unified profile attribute governance",
      "Resolution quality simulation and tuning",
    ]}
  />
);


export const AgentforceStudioPage = () => (
  <ModulePlaceholder
    eyebrow="Design & Build"
    title="Agentforce Studio"
    description="Agent design, grounding, topics, actions and escalation policy."
    capabilities={[
      "Agent topic and action designer",
      "Grounding coverage against data products",
      "Escalation and human-in-the-loop policy",
      "Agent evaluation and regression suites",
    ]}
  />
);

export const ValidationPage = () => (
  <ModulePlaceholder
    eyebrow="Assurance"
    title="Validation"
    description="Test strategy, release readiness and defect management."
    capabilities={[
      "Test case generation per use case and agent",
      "Data quality and identity resolution validation runs",
      "Release readiness scorecards",
      "Defect triage linked to stage gates",
    ]}
  />
);

export const DeploymentPage = () => (
  <ModulePlaceholder
    eyebrow="Operate"
    title="Deployment & Outputs"
    description="Release planning and generated implementation artifacts."
    capabilities={[
      "Release and version planning with scope traceability",
      "Artifact generation for blueprints, mappings and runbooks",
      "Cutover and rollback planning",
      "Export packages for client delivery",
    ]}
  />
);

export const MonitoringPage = () => (
  <ModulePlaceholder
    eyebrow="Operate"
    title="Monitoring"
    description="Post-deployment monitoring and continuous improvement signals."
    capabilities={[
      "Data freshness and pipeline health telemetry",
      "Agent quality and containment metrics",
      "Benefit realisation tracking against the business case",
      "Improvement backlog fed by monitoring signals",
    ]}
  />
);

export const TemplatesPage = () => (
  <ModulePlaceholder
    eyebrow="Platform"
    title="Templates"
    description="Reusable initiative, blueprint and assessment templates."
    capabilities={[
      "Industry template library starting with BFSI",
      "Template versioning and change history",
      "Clone-into-initiative provisioning",
      "Template governance and publication workflow",
    ]}
  />
);

export const AdministrationPage = () => (
  <ModulePlaceholder
    eyebrow="Platform"
    title="Administration"
    description="Users, roles, client workspaces and environment configuration."
    capabilities={[
      "User and role assignment per client workspace",
      "Permission matrix administration",
      "Environment and data mode configuration",
      "Tenant isolation and retention settings",
    ]}
  />
);
