import type { DevelopmentOutcome, HealthStatus, InvestmentProject, ProjectStage, Region, RiskRating, Sector } from "@/types";

const outcome = (id: string, name: string, metric: string, target: number, actual: number, unit: string): DevelopmentOutcome => ({
  id,
  name,
  metric,
  target,
  actual,
  unit,
  status: actual >= target ? "Exceeding" : actual >= target * 0.85 ? "On Track" : "Lagging",
});

export const greenGrid: InvestmentProject = {
  id: "prj-001",
  code: "PHX-2026-1048",
  name: "GreenGrid Renewable Energy Expansion",
  clientId: "cl-meridian",
  clientName: "Meridian Infrastructure Group",
  country: "Kenya",
  region: "Sub-Saharan Africa",
  sector: "Energy",
  product: "Senior Loan",
  proposedCommitmentUsd: 185_000_000,
  totalProjectCostUsd: 520_000_000,
  stage: "Due Diligence",
  riskRating: "Moderate",
  health: "Watch",
  approvalReadiness: 68,
  documentationCompleteness: 74,
  conditionsComplete: 4,
  conditionsTotal: 11,
  expectedApproval: "2026-10-22",
  daysInStage: 47,
  predictedDelayDays: 18,
  delayRisk: "Medium",
  investmentOfficer: "Maya Thompson",
  projectLead: "Daniel Okafor",
  latestMilestone: "Environmental and social assessment resubmitted (22 Jul 2026)",
  strategicRationale:
    "GreenGrid adds 480 MW of renewable generation and 210 km of evacuation transmission to the Kenyan grid, addressing chronic evening peak deficits, displacing thermal generation and unlocking private-sector participation in transmission — a first-of-its-kind structure in the country.",
  summary:
    "GreenGrid Renewable Energy Expansion is a $520 million renewable generation and transmission programme sponsored by Meridian Infrastructure Group. The proposed $185 million senior loan is in due diligence with financial, credit and technical workstreams substantially complete. Environmental and social review is the critical path: an updated assessment was resubmitted on 22 July and remains under specialist review, with biodiversity offset and resettlement consultation gaps outstanding. Approval readiness is 68% and the model predicts an 18-day slip against the 22 October committee date unless environmental findings clear by 12 August.",
  financingStructure: [
    { source: "Phoenix Senior Loan", amountUsd: 185_000_000, instrument: "Senior Loan (18y)" },
    { source: "Rift Valley Development Bank", amountUsd: 85_000_000, instrument: "Senior Loan (15y)" },
    { source: "Nordic Climate Fund", amountUsd: 40_000_000, instrument: "Concessional Tranche" },
    { source: "Meridian Sponsor Equity", amountUsd: 156_000_000, instrument: "Common Equity" },
    { source: "Local Commercial Syndicate", amountUsd: 54_000_000, instrument: "Local-Currency Tranche" },
  ],
  milestones: [
    { id: "ms-1", name: "Concept review cleared", date: "2026-04-16", status: "Complete", criticalPath: false },
    { id: "ms-2", name: "Mandate letter countersigned", date: "2026-05-04", status: "Complete", criticalPath: false },
    { id: "ms-3", name: "Financial model audit complete", date: "2026-06-30", status: "Complete", criticalPath: true },
    { id: "ms-4", name: "Environmental and social assessment cleared", date: "2026-08-12", status: "Slipped", criticalPath: true },
    { id: "ms-5", name: "Legal documentation term sheet agreed", date: "2026-09-04", status: "In Progress", criticalPath: true },
    { id: "ms-6", name: "Investment review committee", date: "2026-09-25", status: "Planned", criticalPath: true },
    { id: "ms-7", name: "Board approval", date: "2026-10-22", status: "Planned", criticalPath: true },
    { id: "ms-8", name: "First disbursement", date: "2027-01-15", status: "Planned", criticalPath: false },
  ],
  sponsors: ["Meridian Infrastructure Group", "Meridian Power East Africa", "SolarBridge Africa"],
  team: [
    { name: "Maya Thompson", role: "Investment Officer", unit: "Infrastructure & Natural Resources" },
    { name: "Daniel Okafor", role: "Project Team Lead", unit: "Investment Operations" },
    { name: "Priya Raghunathan", role: "Credit Risk", unit: "Credit Risk" },
    { name: "Tobias Lindqvist", role: "Environmental & Social Specialist", unit: "E&S Sustainability" },
    { name: "Ines Haddad", role: "Legal Counsel", unit: "Legal Department" },
    { name: "Grace Mbeki", role: "Country Coverage", unit: "Kenya Country Office" },
  ],
  developmentOutcomes: [
    outcome("do-1", "Renewable capacity added", "Installed MW", 480, 480, "MW"),
    outcome("do-2", "Households connected", "New connections", 640_000, 512_000, "households"),
    outcome("do-3", "Emissions avoided", "Annual tCO2e", 780_000, 690_000, "tCO2e/yr"),
    outcome("do-4", "Direct jobs created", "FTE", 2_400, 2_610, "jobs"),
  ],
  createdAt: "2026-02-18",
};

type Row = [
  string, // name
  string, // clientId
  string, // clientName
  string, // country
  Region,
  Sector,
  InvestmentProject["product"],
  number, // commitment m
  number, // total cost m
  ProjectStage,
  RiskRating,
  HealthStatus,
  number, // readiness
  string, // io
  string, // lead
];

const rows: Row[] = [
  ["BlueRiver Urban Water Resilience", "cl-blueriver", "BlueRiver Water Holdings", "Colombia", "Latin America and Caribbean", "Infrastructure", "Senior Loan", 120, 310, "Supervision", "Elevated", "At Risk", 100, "Sofia Ramirez", "Lucas Moreau"],
  ["EastBridge SME Trade Facility", "cl-eastbridge", "EastBridge Trade Finance", "Singapore", "East Asia and Pacific", "Financial Institutions", "Trade Facility", 200, 400, "Approval", "Low", "On Track", 92, "Chen Wei", "Rajiv Menon"],
  ["TerraNova Sustainable Agriculture Programme", "cl-terranova", "TerraNova Agribusiness", "Brazil", "Latin America and Caribbean", "Agribusiness", "Senior Loan", 95, 240, "Due Diligence", "Moderate", "On Track", 71, "Sofia Ramirez", "Ines Haddad"],
  ["Horizon Rural Connectivity Initiative", "cl-horizon", "Horizon Digital Networks", "India", "South Asia", "Technology", "Senior Loan", 130, 295, "Supervision", "Moderate", "On Track", 100, "Rajiv Menon", "Daniel Okafor"],
  ["Global Health Supply Chain Modernization", "cl-gha", "Global Health Access Partners", "Kenya", "Sub-Saharan Africa", "Healthcare", "Advisory", 45, 110, "Supervision", "Low", "On Track", 100, "Ines Haddad", "Amara Diallo"],
  ["SolarBridge Storage and Transmission", "cl-solarbridge", "SolarBridge Africa", "Kenya", "Sub-Saharan Africa", "Energy", "Mezzanine", 110, 265, "Investment Review", "Elevated", "Watch", 63, "Grace Mbeki", "Daniel Okafor"],
  ["Pacific Electric Mobility Platform", "cl-pacific", "Pacific Mobility Holdings", "Indonesia", "East Asia and Pacific", "Transport", "Equity", 88, 220, "Due Diligence", "Moderate", "Watch", 58, "Tomas Nyberg", "Lucas Moreau"],
  ["Meridian Rural Electrification Programme", "cl-meridian", "Meridian Infrastructure Group", "Tanzania", "Sub-Saharan Africa", "Energy", "Senior Loan", 76, 168, "Commitment", "Moderate", "On Track", 96, "Maya Thompson", "Grace Mbeki"],
  ["EastBridge Green Supply Chain Facility", "cl-eastbridge", "EastBridge Trade Finance", "Vietnam", "East Asia and Pacific", "Financial Institutions", "Guarantee", 65, 140, "Due Diligence", "Low", "On Track", 77, "Chen Wei", "Rajiv Menon"],
  ["BlueRiver Catchment Climate Adaptation", "cl-blueriver", "BlueRiver Water Holdings", "Colombia", "Latin America and Caribbean", "Infrastructure", "Senior Loan", 58, 132, "Investment Review", "Elevated", "Watch", 66, "Sofia Ramirez", "Ines Haddad"],
  ["TerraNova Processing Efficiency Upgrade", "cl-terranova", "TerraNova Agribusiness", "Paraguay", "Latin America and Caribbean", "Manufacturing", "Senior Loan", 42, 96, "Concept Review", "Moderate", "On Track", 34, "Sofia Ramirez", "Amara Diallo"],
  ["Horizon Tower Renewable Retrofit", "cl-horizon", "Horizon Digital Networks", "India", "South Asia", "Energy", "Mezzanine", 39, 88, "Supervision", "Low", "On Track", 100, "Rajiv Menon", "Tomas Nyberg"],
  ["Pacific Depot Charging Infrastructure", "cl-pacific", "Pacific Mobility Holdings", "Vietnam", "East Asia and Pacific", "Infrastructure", "Senior Loan", 54, 122, "Disbursement", "Moderate", "Watch", 100, "Tomas Nyberg", "Lucas Moreau"],
  ["Meridian Transmission Reinforcement", "cl-meridian", "Meridian Infrastructure Group", "Uganda", "Sub-Saharan Africa", "Infrastructure", "Senior Loan", 92, 205, "Supervision", "Moderate", "On Track", 100, "Maya Thompson", "Daniel Okafor"],
  ["SolarBridge Zambia Generation", "cl-solarbridge", "SolarBridge Africa", "Zambia", "Sub-Saharan Africa", "Energy", "Senior Loan", 68, 155, "Mandate", "Moderate", "On Track", 28, "Grace Mbeki", "Priya Raghunathan"],
  ["EastBridge Women Entrepreneurs Facility", "cl-eastbridge", "EastBridge Trade Finance", "Philippines", "East Asia and Pacific", "Financial Institutions", "Trade Facility", 50, 100, "Supervision", "Low", "On Track", 100, "Chen Wei", "Rajiv Menon"],
  ["Horizon Digital Services Advisory", "cl-horizon", "Horizon Digital Networks", "Nepal", "South Asia", "Technology", "Advisory", 12, 26, "Early Review", "Low", "On Track", 18, "Rajiv Menon", "Ines Haddad"],
  ["Global Health Cold-Chain Expansion", "cl-gha", "Global Health Access Partners", "Ghana", "Sub-Saharan Africa", "Healthcare", "Senior Loan", 36, 82, "Approval", "Low", "On Track", 89, "Ines Haddad", "Amara Diallo"],
  ["Meridian Grid Digitalisation Advisory", "cl-meridian", "Meridian Infrastructure Group", "Kenya", "Sub-Saharan Africa", "Technology", "Advisory", 15, 32, "Opportunity", "Low", "On Track", 8, "Maya Thompson", "Grace Mbeki"],
  ["TerraNova Outgrower Working Capital", "cl-terranova", "TerraNova Agribusiness", "Brazil", "Latin America and Caribbean", "Agribusiness", "Guarantee", 30, 68, "Early Review", "Moderate", "On Track", 22, "Sofia Ramirez", "Lucas Moreau"],
  ["Pacific Urban Mobility Data Platform", "cl-pacific", "Pacific Mobility Holdings", "Philippines", "East Asia and Pacific", "Technology", "Equity", 22, 48, "Concept Review", "Moderate", "Watch", 41, "Tomas Nyberg", "Daniel Okafor"],
  ["BlueRiver Non-Revenue Water Programme", "cl-blueriver", "BlueRiver Water Holdings", "Peru", "Latin America and Caribbean", "Infrastructure", "Senior Loan", 47, 105, "Due Diligence", "Elevated", "At Risk", 52, "Sofia Ramirez", "Priya Raghunathan"],
  ["EastBridge MENA Trade Corridor", "cl-eastbridge", "EastBridge Trade Finance", "Jordan", "Middle East and North Africa", "Financial Institutions", "Guarantee", 44, 92, "Concept Review", "Moderate", "On Track", 37, "Chen Wei", "Ines Haddad"],
  ["Horizon Central Asia Fibre Backbone", "cl-horizon", "Horizon Digital Networks", "Uzbekistan", "Europe and Central Asia", "Technology", "Senior Loan", 61, 138, "Early Review", "Moderate", "On Track", 25, "Rajiv Menon", "Tomas Nyberg"],
];

const stageDays: Record<ProjectStage, number> = {
  Opportunity: 12,
  "Early Review": 26,
  Mandate: 34,
  "Concept Review": 41,
  "Due Diligence": 58,
  "Investment Review": 22,
  Approval: 15,
  Commitment: 19,
  Disbursement: 31,
  Supervision: 210,
  Closure: 9,
};

const generated: InvestmentProject[] = rows.map((r, i) => {
  const idx = i + 2;
  const [name, clientId, clientName, country, region, sector, product, commitM, costM, stage, riskRating, health, readiness, io, lead] = r;
  const conditionsTotal = 4 + ((i * 3) % 9);
  const conditionsComplete = Math.max(0, Math.round(conditionsTotal * (readiness / 130)));
  const delay = health === "At Risk" ? 24 + (i % 12) : health === "Watch" ? 9 + (i % 8) : i % 4;
  return {
    id: `prj-${String(idx).padStart(3, "0")}`,
    code: `PHX-2026-${1000 + idx * 7}`,
    name,
    clientId,
    clientName,
    country,
    region,
    sector,
    product,
    proposedCommitmentUsd: commitM * 1_000_000,
    totalProjectCostUsd: costM * 1_000_000,
    stage,
    riskRating,
    health,
    approvalReadiness: readiness,
    documentationCompleteness: Math.min(100, readiness + 8 + (i % 11)),
    conditionsComplete,
    conditionsTotal,
    expectedApproval: ["2026-09-18", "2026-10-09", "2026-11-06", "2026-12-11", "2027-01-29"][i % 5],
    daysInStage: stageDays[stage] + (i % 17),
    predictedDelayDays: delay,
    delayRisk: delay > 20 ? "High" : delay > 8 ? "Medium" : "Low",
    investmentOfficer: io,
    projectLead: lead,
    latestMilestone: [
      "Financial model audit complete",
      "Legal term sheet circulated",
      "Technical due diligence report received",
      "Supervision mission completed",
      "Disbursement request under review",
    ][i % 5],
    strategicRationale: `${name} advances ${sector.toLowerCase()} capability in ${country}, supporting private-sector participation, climate alignment and measurable development outcomes in ${region}.`,
    summary: `${name} is a $${costM}m programme sponsored by ${clientName} in ${country}. The proposed $${commitM}m ${product.toLowerCase()} is currently at ${stage} with approval readiness of ${readiness}%. Overall health is ${health.toLowerCase()} with ${conditionsTotal - conditionsComplete} conditions outstanding.`,
    financingStructure: [
      { source: "Phoenix Commitment", amountUsd: commitM * 1_000_000, instrument: product },
      { source: "Sponsor Equity", amountUsd: Math.round(costM * 0.3) * 1_000_000, instrument: "Common Equity" },
      { source: "Co-Financiers", amountUsd: Math.round(costM * 0.7 - commitM) * 1_000_000, instrument: "Syndicated Debt" },
    ],
    milestones: [
      { id: `${idx}-m1`, name: "Concept review cleared", date: "2026-03-12", status: "Complete", criticalPath: false },
      { id: `${idx}-m2`, name: "Due diligence complete", date: "2026-08-28", status: readiness > 70 ? "Complete" : "In Progress", criticalPath: true },
      { id: `${idx}-m3`, name: "Committee decision", date: "2026-10-16", status: readiness > 90 ? "Complete" : "Planned", criticalPath: true },
      { id: `${idx}-m4`, name: "First disbursement", date: "2027-02-04", status: "Planned", criticalPath: false },
    ],
    sponsors: [clientName],
    team: [
      { name: io, role: "Investment Officer", unit: "Investment Operations" },
      { name: lead, role: "Project Team Lead", unit: "Investment Operations" },
      { name: "Priya Raghunathan", role: "Credit Risk", unit: "Credit Risk" },
    ],
    developmentOutcomes: [
      outcome(`${idx}-do1`, "Direct beneficiaries", "People reached", 250_000, 190_000 + i * 9_000, "people"),
      outcome(`${idx}-do2`, "Jobs supported", "FTE", 1_200, 900 + i * 40, "jobs"),
      outcome(`${idx}-do3`, "Emissions avoided", "Annual tCO2e", 200_000, 150_000 + i * 6_000, "tCO2e/yr"),
    ],
    createdAt: "2026-01-15",
  };
});

export const projects: InvestmentProject[] = [greenGrid, ...generated];
