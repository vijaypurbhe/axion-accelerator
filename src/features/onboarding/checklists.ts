import type { PersonaId } from "@/domain/types";

/** Signals the checklist uses to auto-tick steps as real workspace content appears. */
export interface WorkspaceSignals {
  readonly initiatives: number;
  readonly assessmentScores: number;
  readonly dataProducts: number;
  readonly connections: number;
  readonly decisions: number;
  readonly risks: number;
  readonly approvals: number;
  readonly agents: number;
  readonly artifacts: number;
}

export type ChecklistStatus = "not-started" | "in-progress" | "done";

export interface ChecklistStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  /** Screen that lets the user complete this step. */
  readonly to: string;
  /** Auto-completion predicate evaluated against live workspace content. */
  readonly isDone: (signals: WorkspaceSignals) => boolean;
}

export interface RoleTrack {
  readonly headline: string;
  readonly steps: readonly ChecklistStep[];
}

const hasInitiative = (s: WorkspaceSignals) => s.initiatives > 0;

export const ROLE_TRACKS: Record<PersonaId, RoleTrack> = {
  "executive-sponsor": {
    headline: "Frame the engagement, then hold the stage gates.",
    steps: [
      {
        id: "exec-initiative",
        label: "Create the first initiative",
        detail: "Register the programme Axion will govern, with its business objective and target release.",
        to: "/initiatives",
        isDone: hasInitiative,
      },
      {
        id: "exec-portfolio",
        label: "Review portfolio posture",
        detail: "Check stage distribution, risk exposure and open approvals across the workspace.",
        to: "/portfolio",
        isDone: hasInitiative,
      },
      {
        id: "exec-risks",
        label: "Confirm the risk register owners",
        detail: "Every risk needs a named owner and a mitigation before the Discover gate.",
        to: "/governance-risk",
        isDone: (s) => s.risks > 0,
      },
      {
        id: "exec-gate",
        label: "Decide the first stage gate",
        detail: "Approve or reject the Discover exit so the initiative can move to Assess.",
        to: "/lifecycle-manager/discover",
        isDone: (s) => s.approvals > 0,
      },
    ],
  },
  "enterprise-architect": {
    headline: "Establish the landscape, the readiness baseline and the target architecture.",
    steps: [
      {
        id: "ea-initiative",
        label: "Create or open an initiative",
        detail: "Architecture work is always scoped to one initiative.",
        to: "/initiatives",
        isDone: hasInitiative,
      },
      {
        id: "ea-sources",
        label: "Register source platforms",
        detail: "Select the systems in scope from the source catalog: Salesforce, SAP, Snowflake, Oracle and more.",
        to: "/sources",
        isDone: (s) => s.connections > 0,
      },
      {
        id: "ea-assessment",
        label: "Run the BFSI readiness assessment",
        detail: "Score maturity across data, architecture, governance and agent readiness.",
        to: "/assessments",
        isDone: (s) => s.assessmentScores > 0,
      },
      {
        id: "ea-blueprint",
        label: "Create the target blueprint",
        detail: "Assemble the Data 360 and Agentforce target architecture for this initiative.",
        to: "/architecture",
        isDone: (s) => s.decisions > 0,
      },
      {
        id: "ea-decision",
        label: "Log the first architecture decision",
        detail: "Record the decision, options considered and rationale for approval routing.",
        to: "/architecture",
        isDone: (s) => s.decisions > 0,
      },
    ],
  },
  "data360-architect": {
    headline: "Model the canonical domains and design the unified profile.",
    steps: [
      {
        id: "d360-product",
        label: "Create the first data product",
        detail: "Start from a BFSI canonical template or build a bespoke blueprint.",
        to: "/data-products",
        isDone: (s) => s.dataProducts > 0,
      },
      {
        id: "d360-mapping",
        label: "Map sources to the canonical model",
        detail: "Use the mapping workbench to align source fields with DLO/DMO attributes.",
        to: "/mapping",
        isDone: (s) => s.dataProducts > 0 && s.connections > 0,
      },
      {
        id: "d360-connectivity",
        label: "Choose a connectivity pattern",
        detail: "Compare physical ingestion, zero-copy and cached acceleration for each source.",
        to: "/connectivity",
        isDone: (s) => s.connections > 0,
      },
      {
        id: "d360-identity",
        label: "Define the identity ruleset",
        detail: "Set match rules and survivorship policy, then simulate resolution quality.",
        to: "/identity",
        isDone: (s) => s.dataProducts > 1,
      },
    ],
  },
  "data-steward": {
    headline: "Own quality, consent and regulatory evidence.",
    steps: [
      {
        id: "steward-ownership",
        label: "Assign data product ownership",
        detail: "Every data product needs a steward, an SLA and a quality contract.",
        to: "/data-products",
        isDone: (s) => s.dataProducts > 0,
      },
      {
        id: "steward-quality",
        label: "Define data quality rules",
        detail: "Add completeness, validity and uniqueness rules to the critical attributes.",
        to: "/mapping",
        isDone: (s) => s.dataProducts > 0,
      },
      {
        id: "steward-controls",
        label: "Map regulatory controls",
        detail: "Select the applicable trust layer controls and frameworks for the jurisdiction.",
        to: "/trust-compliance",
        isDone: (s) => s.risks > 0,
      },
      {
        id: "steward-evidence",
        label: "Attach control evidence",
        detail: "Record test results and evidence artifacts so the Validate gate can be cleared.",
        to: "/trust-compliance",
        isDone: (s) => s.artifacts > 0,
      },
    ],
  },
  "data-engineer": {
    headline: "Connect the sources and land the data.",
    steps: [
      {
        id: "eng-connections",
        label: "Connect the source systems",
        detail: "Register connections and check credentials and health per platform.",
        to: "/connectivity",
        isDone: (s) => s.connections > 0,
      },
      {
        id: "eng-import",
        label: "Run a metadata import",
        detail: "Ingest schemas from SAP, Snowflake, Salesforce or Oracle and normalise them.",
        to: "/metadata-import",
        isDone: (s) => s.dataProducts > 0,
      },
      {
        id: "eng-pattern",
        label: "Configure the ingestion pattern",
        detail: "Apply the recommended pattern and set refresh cadence and volumetrics.",
        to: "/connectivity",
        isDone: (s) => s.connections > 1,
      },
      {
        id: "eng-validate",
        label: "Validate the first load",
        detail: "Run the validation pack and confirm freshness against the target SLA.",
        to: "/validation",
        isDone: (s) => s.artifacts > 0,
      },
    ],
  },
  "agentforce-architect": {
    headline: "Design grounded, guard-railed agents on top of the data foundation.",
    steps: [
      {
        id: "af-agent",
        label: "Create the first agent design",
        detail: "Pick an implementation pattern and define the agent's purpose and owner.",
        to: "/agentforce-studio/new",
        isDone: (s) => s.agents > 0,
      },
      {
        id: "af-topics",
        label: "Define topics and actions",
        detail: "Add topics, intents and the Flow, Apex or API actions each one can invoke.",
        to: "/agentforce-studio",
        isDone: (s) => s.agents > 0,
      },
      {
        id: "af-grounding",
        label: "Attach grounding data",
        detail: "Ground the agent on unified profile attributes and knowledge sources.",
        to: "/agentforce-studio",
        isDone: (s) => s.agents > 0 && s.dataProducts > 0,
      },
      {
        id: "af-guardrails",
        label: "Apply trust layer guardrails",
        detail: "Map guardrails to the trust control library and set escalation boundaries.",
        to: "/agentforce-studio",
        isDone: (s) => s.agents > 0 && s.risks > 0,
      },
      {
        id: "af-approval",
        label: "Submit for approval",
        detail: "Raise the RACI approval request for the design review gate.",
        to: "/agentforce-studio",
        isDone: (s) => s.approvals > 0,
      },
    ],
  },
};

export const trackFor = (role: PersonaId): RoleTrack => ROLE_TRACKS[role] ?? ROLE_TRACKS["enterprise-architect"];
