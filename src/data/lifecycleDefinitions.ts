import type { LifecycleStageId } from "@/domain/types";
import type { StageDefinition } from "@/domain/phase2";

/** Gate definitions for the nine Axion lifecycle stages. */
export const STAGE_DEFINITIONS: readonly StageDefinition[] = [
  {
    stage: "discover",
    objective:
      "Establish business context, candidate use cases, source landscape and the data domains in scope for the engagement.",
    entryCriteria: ["Client workspace provisioned", "Executive sponsor identified"],
    mandatoryTasks: [
      "Run discovery workshops with business and technology stakeholders",
      "Capture candidate use cases with value hypothesis",
      "Inventory source platforms and data domains",
    ],
    optionalTasks: ["Benchmark peer BFSI reference programs", "Capture competitive drivers"],
    deliverables: ["Discovery pack", "Use case long list", "Source landscape inventory"],
    exitCriteria: [
      { id: "disc-1", label: "Prioritised use case shortlist agreed with sponsor", mandatory: true },
      { id: "disc-2", label: "Source system inventory captured for in-scope domains", mandatory: true },
      { id: "disc-3", label: "Value hypothesis quantified", mandatory: false },
    ],
    approvers: ["executive-sponsor", "enterprise-architect"],
  },
  {
    stage: "assess",
    objective: "Score readiness across data, governance, platform, activation and agent dimensions.",
    entryCriteria: ["Discover gate approved", "Assessment owners assigned"],
    mandatoryTasks: [
      "Complete BFSI readiness assessment questionnaire",
      "Attach evidence for mandatory questions",
      "Review findings and gaps with data stewards",
    ],
    optionalTasks: ["Run data profiling spike on core banking extract"],
    deliverables: ["Readiness scorecard", "Maturity heatmap", "Gap and recommendation report"],
    exitCriteria: [
      { id: "asse-1", label: "All mandatory assessment questions answered", mandatory: true },
      { id: "asse-2", label: "Critical blockers have owners and remediation plans", mandatory: true },
      { id: "asse-3", label: "Executive readiness summary reviewed", mandatory: true },
      { id: "asse-4", label: "Evidence coverage above 60%", mandatory: false },
    ],
    approvers: ["executive-sponsor", "data-steward", "enterprise-architect"],
    dependsOn: "discover",
  },
  {
    stage: "design",
    objective: "Produce the layered target architecture, canonical domain model and approved decision records.",
    entryCriteria: ["Assess gate approved", "Readiness findings accepted"],
    mandatoryTasks: [
      "Model current-state and target-state blueprints",
      "Select ingestion patterns per source system",
      "Raise architecture decision records for material choices",
      "Route the target blueprint for architecture approval",
    ],
    optionalTasks: ["Model physical topology view", "Capture cost model assumptions"],
    deliverables: ["Target architecture blueprint", "Architecture specification", "Decision register"],
    exitCriteria: [
      { id: "desi-1", label: "Target-state blueprint approved by architecture board", mandatory: true },
      { id: "desi-2", label: "All proposed decision records resolved (approved or rejected)", mandatory: true },
      { id: "desi-3", label: "Identity resolution approach documented", mandatory: true },
      { id: "desi-4", label: "Physical view drafted", mandatory: false },
    ],
    approvers: ["enterprise-architect", "data360-architect", "data-steward"],
    dependsOn: "assess",
  },
  {
    stage: "configure",
    objective: "Configure connectivity, harmonization, identity resolution and activation in the target org.",
    entryCriteria: ["Design gate approved", "Environments available"],
    mandatoryTasks: [
      "Configure data streams and data lake objects",
      "Map sources to canonical model and DMOs",
      "Configure identity resolution rulesets",
    ],
    optionalTasks: ["Configure cached acceleration for high-volume domains"],
    deliverables: ["Source-to-target mapping", "Identity ruleset configuration", "Activation configuration"],
    exitCriteria: [
      { id: "conf-1", label: "All in-scope sources ingesting into Data 360", mandatory: true },
      { id: "conf-2", label: "Canonical mappings complete for priority domains", mandatory: true },
      { id: "conf-3", label: "Trust layer controls configured for agent grounding", mandatory: true },
    ],
    approvers: ["data360-architect", "data-engineer"],
    dependsOn: "design",
  },
  {
    stage: "validate",
    objective: "Prove data quality, identity resolution accuracy and agent behaviour against acceptance criteria.",
    entryCriteria: ["Configure gate approved", "Test data provisioned"],
    mandatoryTasks: [
      "Execute data quality validation runs",
      "Execute identity resolution accuracy tests",
      "Execute agent regression and escalation tests",
    ],
    optionalTasks: ["Run performance and volumetric tests"],
    deliverables: ["Test report", "Defect log", "Release readiness scorecard"],
    exitCriteria: [
      { id: "vali-1", label: "No open severity-1 defects", mandatory: true },
      { id: "vali-2", label: "Identity resolution accuracy meets agreed threshold", mandatory: true },
      { id: "vali-3", label: "Human review policy tested for agent escalations", mandatory: true },
    ],
    approvers: ["data-steward", "agentforce-architect"],
    dependsOn: "configure",
  },
  {
    stage: "approve",
    objective: "Obtain governance, risk and executive approval to deploy the release.",
    entryCriteria: ["Validate gate approved", "Evidence pack assembled"],
    mandatoryTasks: [
      "Assemble regulatory and control evidence pack",
      "Complete model and AI risk review",
      "Obtain executive release approval",
    ],
    optionalTasks: ["Brief internal audit"],
    deliverables: ["Approval pack", "Regulatory mapping evidence", "Signed release authorisation"],
    exitCriteria: [
      { id: "appr-1", label: "Regulatory obligations mapped to implemented controls", mandatory: true },
      { id: "appr-2", label: "AI risk review signed off", mandatory: true },
      { id: "appr-3", label: "Executive release authorisation recorded", mandatory: true },
    ],
    approvers: ["executive-sponsor", "enterprise-architect", "data-steward"],
    dependsOn: "validate",
  },
  {
    stage: "deploy",
    objective: "Deploy the release into production with cutover and rollback control.",
    entryCriteria: ["Approve gate approved", "Cutover window confirmed"],
    mandatoryTasks: ["Execute cutover runbook", "Verify production ingestion and profiles", "Enable agents for pilot cohort"],
    optionalTasks: ["Run shadow-mode comparison for one week"],
    deliverables: ["Cutover runbook", "Deployment log", "Rollback plan"],
    exitCriteria: [
      { id: "depl-1", label: "Production ingestion verified for all in-scope sources", mandatory: true },
      { id: "depl-2", label: "Rollback plan tested and retained", mandatory: true },
    ],
    approvers: ["enterprise-architect", "data-engineer"],
    dependsOn: "approve",
  },
  {
    stage: "monitor",
    objective: "Monitor data freshness, profile quality, agent performance and benefit realisation.",
    entryCriteria: ["Deploy gate approved", "Telemetry dashboards live"],
    mandatoryTasks: ["Stand up monitoring dashboards", "Define alert thresholds and on-call ownership"],
    optionalTasks: ["Publish weekly adoption digest to sponsors"],
    deliverables: ["Monitoring pack", "Benefit realisation baseline"],
    exitCriteria: [
      { id: "moni-1", label: "Data freshness and pipeline health alerts active", mandatory: true },
      { id: "moni-2", label: "Agent containment and quality metrics reported", mandatory: true },
    ],
    approvers: ["data-engineer", "agentforce-architect"],
    dependsOn: "deploy",
  },
  {
    stage: "improve",
    objective: "Convert monitoring signals into a prioritised continuous improvement backlog.",
    entryCriteria: ["Monitor gate approved", "Baseline metrics captured"],
    mandatoryTasks: ["Triage monitoring signals into improvement backlog", "Re-run readiness assessment delta"],
    optionalTasks: ["Expand use case scope into the next release"],
    deliverables: ["Improvement backlog", "Readiness delta report"],
    exitCriteria: [
      { id: "impr-1", label: "Improvement backlog prioritised and owned", mandatory: true },
      { id: "impr-2", label: "Next release scope proposed", mandatory: false },
    ],
    approvers: ["executive-sponsor", "enterprise-architect"],
    dependsOn: "monitor",
  },
];

export const stageDefinition = (stage: LifecycleStageId): StageDefinition =>
  STAGE_DEFINITIONS.find((definition) => definition.stage === stage) ?? STAGE_DEFINITIONS[0];
