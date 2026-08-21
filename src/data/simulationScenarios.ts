/** Guided training walkthroughs shown in the Simulation & Training module. */
export interface SimulationScenario {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly persona: string;
  readonly duration: string;
  readonly stages: readonly string[];
  readonly steps: readonly string[];
}

export const SIMULATION_SCENARIOS: readonly SimulationScenario[] = [
  {
    id: "sim-readiness",
    title: "BFSI readiness baseline",
    summary: "Score a universal bank's readiness and turn the gaps into a prioritised remediation backlog.",
    persona: "Enterprise Architect",
    duration: "15 min",
    stages: ["Discover", "Assess"],
    steps: [
      "Open the NorthStar initiative and review the registered source platforms.",
      "Complete the readiness assessment for the data and governance domains.",
      "Generate recommendations and accept, edit or reject each AI suggestion.",
      "Request the Discover stage gate advance and review the gate checks.",
    ],
  },
  {
    id: "sim-data-product",
    title: "Canonical data product to unified profile",
    summary: "Blueprint a Party data product, map SAP and Snowflake sources, then design identity resolution.",
    persona: "Data 360 Architect",
    duration: "20 min",
    stages: ["Design", "Configure"],
    steps: [
      "Create a data product from the BFSI Party canonical template.",
      "Run a metadata import for Snowflake and normalise the incoming schema.",
      "Map source fields to DLO and DMO attributes in the mapping workbench.",
      "Choose a connectivity pattern and record the decision rationale.",
      "Define match and survivorship rules, then run the identity simulation.",
    ],
  },
  {
    id: "sim-trust",
    title: "Trust controls and evidence",
    summary: "Select applicable regulatory controls, test them and attach evidence before the Validate gate.",
    persona: "Data Steward",
    duration: "12 min",
    stages: ["Configure", "Validate"],
    steps: [
      "Set the applicability profile for jurisdiction and data categories.",
      "Accept the suggested control set and note any exceptions.",
      "Record a control test result and attach the evidence artifact.",
      "Review the residual risk entries in the risk register.",
    ],
  },
  {
    id: "sim-agentforce",
    title: "Grounded service agent",
    summary: "Design an Agentforce service agent with grounding, guardrails and an approval request.",
    persona: "Agentforce Architect",
    duration: "18 min",
    stages: ["Design", "Approve"],
    steps: [
      "Create an agent from the service pattern in the Agentforce wizard.",
      "Add topics, intents and the Flow or API actions each topic can invoke.",
      "Ground the agent on unified profile attributes and knowledge sources.",
      "Map guardrails to the trust control library and set escalation boundaries.",
      "Authorize the agent actions and submit the design review approval.",
    ],
  },
  {
    id: "sim-executive",
    title: "Executive stage-gate review",
    summary: "Walk the portfolio view, interrogate risk exposure and decide an outstanding stage gate.",
    persona: "Executive Sponsor",
    duration: "10 min",
    stages: ["Approve", "Monitor"],
    steps: [
      "Review portfolio metrics, stage distribution and risk exposure.",
      "Open the pending approvals queue and inspect the supporting evidence.",
      "Approve or reject the gate and confirm the audit entry was written.",
      "Check monitoring signals and benefit realisation against the business case.",
    ],
  },
];
