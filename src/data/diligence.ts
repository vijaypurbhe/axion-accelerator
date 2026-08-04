import type { Approval, Condition, Review, Task, Workstream } from "@/types";

const WORKSTREAMS: Workstream[] = [
  "Financial",
  "Legal",
  "Credit",
  "Environmental and Social",
  "Integrity",
  "Technical",
  "Insurance",
  "Tax",
  "Development Impact",
  "Country Risk",
];

const reviewSpec: Record<Workstream, { owner: string; completion: number; findings: number; critical: number; risk: Review["riskLevel"]; due: string; note: string; docs: [string[], string[]]; depends: Workstream[] }> = {
  Financial: {
    owner: "Ines Haddad", completion: 96, findings: 1, critical: 0, risk: "Low", due: "2026-08-05",
    note: "Model audit complete. One open item on the local-currency hedging assumption.",
    docs: [["Audited FY2025 statements", "Financial model v7", "Model audit report", "Sponsor equity confirmation"], ["Audited FY2025 statements", "Financial model v7", "Model audit report"]],
    depends: [],
  },
  Legal: {
    owner: "Ines Haddad", completion: 62, findings: 4, critical: 1, risk: "Moderate", due: "2026-09-04",
    note: "Term sheet negotiation ongoing. Security package over transmission assets unresolved.",
    docs: [["Draft facility agreement", "Security package opinion", "Concession agreement", "Shareholder agreement"], ["Draft facility agreement", "Concession agreement"]],
    depends: ["Financial"],
  },
  Credit: {
    owner: "Priya Raghunathan", completion: 88, findings: 2, critical: 0, risk: "Moderate", due: "2026-08-14",
    note: "Credit memo drafted; sensitivity to offtaker payment performance flagged.",
    docs: [["Credit memorandum", "Offtaker credit assessment", "Covenant package"], ["Credit memorandum", "Offtaker credit assessment"]],
    depends: ["Financial"],
  },
  "Environmental and Social": {
    owner: "Tobias Lindqvist", completion: 41, findings: 6, critical: 2, risk: "High", due: "2026-08-12",
    note: "Updated assessment resubmitted 22 Jul. Biodiversity offset plan and resettlement consultation records incomplete.",
    docs: [["Environmental and social impact assessment", "Resettlement action plan", "Biodiversity offset plan", "Stakeholder consultation records", "E&S action plan"], ["Environmental and social impact assessment", "Resettlement action plan"]],
    depends: [],
  },
  Integrity: {
    owner: "Marcus Reid", completion: 78, findings: 1, critical: 0, risk: "Moderate", due: "2026-08-20",
    note: "Sponsor screening cleared. Minority shareholder change requires re-screening.",
    docs: [["Integrity due diligence report", "Beneficial ownership register"], ["Integrity due diligence report"]],
    depends: [],
  },
  Technical: {
    owner: "Peter Adeyemi", completion: 92, findings: 2, critical: 0, risk: "Low", due: "2026-08-08",
    note: "Independent engineer report received; grid stability study accepted.",
    docs: [["Independent engineer report", "Grid stability study", "EPC contract review"], ["Independent engineer report", "Grid stability study", "EPC contract review"]],
    depends: [],
  },
  Insurance: {
    owner: "Lucas Moreau", completion: 55, findings: 1, critical: 0, risk: "Low", due: "2026-08-26",
    note: "Construction all-risk programme under broker review.",
    docs: [["Insurance programme summary", "Broker adequacy opinion"], ["Insurance programme summary"]],
    depends: ["Technical"],
  },
  Tax: {
    owner: "Ines Haddad", completion: 70, findings: 1, critical: 0, risk: "Low", due: "2026-08-22",
    note: "Withholding tax treatment on the concessional tranche under confirmation.",
    docs: [["Tax structure memorandum", "Local counsel opinion"], ["Tax structure memorandum"]],
    depends: ["Legal"],
  },
  "Development Impact": {
    owner: "Amara Diallo", completion: 84, findings: 0, critical: 0, risk: "Low", due: "2026-08-18",
    note: "Outcome framework agreed; baseline connection data validated.",
    docs: [["Development impact framework", "Baseline data pack"], ["Development impact framework", "Baseline data pack"]],
    depends: [],
  },
  "Country Risk": {
    owner: "Grace Mbeki", completion: 90, findings: 1, critical: 0, risk: "Moderate", due: "2026-08-10",
    note: "Sovereign outlook stable; tariff reform timetable a watch item.",
    docs: [["Country risk assessment", "Regulatory outlook note"], ["Country risk assessment", "Regulatory outlook note"]],
    depends: [],
  },
};

export const reviews: Review[] = WORKSTREAMS.map((ws, i) => {
  const s = reviewSpec[ws];
  return {
    id: `rev-001-${i + 1}`,
    projectId: "prj-001",
    workstream: ws,
    reviewer: s.owner,
    status: s.completion >= 95 ? "Complete" : s.completion === 0 ? "Not Started" : s.critical > 1 ? "Blocked" : "In Progress",
    completion: s.completion,
    dueDate: s.due,
    lastUpdate: ["2026-07-25", "2026-07-24", "2026-07-22", "2026-07-19", "2026-07-15"][i % 5],
    findingsOpen: s.findings,
    findingsCritical: s.critical,
    riskLevel: s.risk,
    requiredDocuments: s.docs[0],
    receivedDocuments: s.docs[1],
    dependsOn: s.depends,
    notes: s.note,
  };
});

/* Secondary project diligence, lighter detail */
["prj-004", "prj-008", "prj-023"].forEach((projectId, p) => {
  WORKSTREAMS.forEach((ws, i) => {
    reviews.push({
      id: `rev-${projectId}-${i + 1}`,
      projectId,
      workstream: ws,
      reviewer: reviewSpec[ws].owner,
      status: (i + p) % 4 === 0 ? "Complete" : (i + p) % 4 === 3 ? "Not Started" : "In Progress",
      completion: Math.min(100, 30 + ((i * 17 + p * 23) % 70)),
      dueDate: ["2026-08-30", "2026-09-11", "2026-09-25"][i % 3],
      lastUpdate: "2026-07-20",
      findingsOpen: (i + p) % 5,
      findingsCritical: (i + p) % 7 === 0 ? 1 : 0,
      riskLevel: (["Low", "Moderate", "Elevated", "High"] as const)[(i + p) % 4],
      requiredDocuments: reviewSpec[ws].docs[0],
      receivedDocuments: reviewSpec[ws].docs[1],
      dependsOn: reviewSpec[ws].depends,
      notes: reviewSpec[ws].note,
    });
  });
});

export const approvals: Approval[] = [
  {
    id: "apr-001", projectId: "prj-001", stageName: "Project Team Review", status: "Approved",
    reviewers: ["Daniel Okafor", "Maya Thompson"], submittedOn: "2026-05-20", decidedOn: "2026-05-28", slaDays: 10, slaElapsed: 8,
    decision: "Approved — proceed to due diligence", comments: [{ author: "Daniel Okafor", at: "2026-05-28", text: "Team review complete. Diligence scope agreed across ten workstreams." }],
    conditionIds: ["cnd-001"], documentIds: ["doc-001"],
  },
  {
    id: "apr-002", projectId: "prj-001", stageName: "Risk Review", status: "In Review",
    reviewers: ["Priya Raghunathan", "Marcus Reid"], submittedOn: "2026-07-14", slaDays: 15, slaElapsed: 15,
    comments: [{ author: "Priya Raghunathan", at: "2026-07-22", text: "Credit memo reviewed. Awaiting offtaker payment performance data before recommendation." }],
    conditionIds: ["cnd-002", "cnd-003"], documentIds: ["doc-004"],
  },
  {
    id: "apr-003", projectId: "prj-001", stageName: "Legal Review", status: "Pending",
    reviewers: ["Ines Haddad"], slaDays: 20, slaElapsed: 0,
    comments: [], conditionIds: ["cnd-004"], documentIds: ["doc-005"],
  },
  {
    id: "apr-004", projectId: "prj-001", stageName: "Environmental and Social Review", status: "Returned for Revision",
    reviewers: ["Tobias Lindqvist"], submittedOn: "2026-06-30", decidedOn: "2026-07-11", slaDays: 21, slaElapsed: 11,
    decision: "Returned — updated assessment required",
    comments: [
      { author: "Tobias Lindqvist", at: "2026-07-11", text: "Biodiversity offset plan does not cover the Nakuru corridor. Resettlement consultation records incomplete at two locations." },
      { author: "Nadia Farouk", at: "2026-07-22", text: "Updated assessment resubmitted with revised offset methodology." },
    ],
    conditionIds: ["cnd-005", "cnd-006"], documentIds: ["doc-002", "doc-003"],
  },
  {
    id: "apr-005", projectId: "prj-001", stageName: "Investment Committee", status: "Pending",
    reviewers: ["Chen Wei", "Amara Diallo", "Priya Raghunathan"], slaDays: 14, slaElapsed: 0,
    comments: [], conditionIds: [], documentIds: [],
  },
  {
    id: "apr-006", projectId: "prj-001", stageName: "Executive Approval", status: "Pending",
    reviewers: ["Chen Wei"], slaDays: 7, slaElapsed: 0, comments: [], conditionIds: [], documentIds: [],
  },
  {
    id: "apr-007", projectId: "prj-001", stageName: "Board Approval", status: "Not Required",
    reviewers: [], slaDays: 30, slaElapsed: 0, comments: [], conditionIds: [], documentIds: [],
  },
  {
    id: "apr-008", projectId: "prj-003", stageName: "Investment Committee", status: "Approved with Conditions",
    reviewers: ["Chen Wei", "Priya Raghunathan"], submittedOn: "2026-07-05", decidedOn: "2026-07-19", slaDays: 14, slaElapsed: 14,
    decision: "Approved with three conditions precedent",
    comments: [{ author: "Chen Wei", at: "2026-07-19", text: "Approved subject to revised exposure limits and updated risk-sharing terms." }],
    conditionIds: ["cnd-010", "cnd-011"], documentIds: ["doc-012"],
  },
  {
    id: "apr-009", projectId: "prj-007", stageName: "Risk Review", status: "Escalated",
    reviewers: ["Priya Raghunathan"], submittedOn: "2026-07-09", slaDays: 15, slaElapsed: 19,
    comments: [{ author: "Priya Raghunathan", at: "2026-07-24", text: "Escalated — shareholder structure change requires integrity re-screening before recommendation." }],
    conditionIds: ["cnd-014"], documentIds: ["doc-018"],
  },
  {
    id: "apr-010", projectId: "prj-002", stageName: "Executive Approval", status: "Escalated",
    reviewers: ["Chen Wei", "Amara Diallo"], submittedOn: "2026-07-17", slaDays: 7, slaElapsed: 12,
    comments: [{ author: "Amara Diallo", at: "2026-07-26", text: "Covenant breach remediation plan required before executive decision." }],
    conditionIds: ["cnd-008"], documentIds: ["doc-010"],
  },
];

/* Extra approvals across other projects for the approvals workspace */
["prj-004", "prj-006", "prj-009", "prj-011", "prj-013", "prj-016", "prj-019", "prj-023", "prj-025", "prj-005"].forEach((projectId, i) => {
  approvals.push({
    id: `apr-${String(11 + i).padStart(3, "0")}`,
    projectId,
    stageName: (["Project Team Review", "Risk Review", "Legal Review", "Investment Committee", "Executive Approval"] as const)[i % 5],
    status: (["Approved", "In Review", "Pending", "Approved with Conditions", "Returned for Revision"] as const)[i % 5],
    reviewers: [["Daniel Okafor"], ["Priya Raghunathan"], ["Ines Haddad"], ["Chen Wei", "Amara Diallo"], ["Chen Wei"]][i % 5],
    submittedOn: "2026-07-06",
    slaDays: [10, 15, 20, 14, 7][i % 5],
    slaElapsed: [8, 12, 4, 9, 6][i % 5],
    comments: [],
    conditionIds: [],
    documentIds: [],
  });
});

const conditionSeed: [string, string, Condition["type"], string, string, Condition["status"], number][] = [
  ["prj-001", "Sponsor equity confirmation letter", "Condition Precedent", "Samuel Kariuki", "2026-08-05", "In Progress", 34],
  ["prj-001", "Offtaker payment performance data pack", "Condition Precedent", "Priya Raghunathan", "2026-08-14", "Open", 41],
  ["prj-001", "Local-currency hedging policy confirmation", "Condition Precedent", "Ines Haddad", "2026-08-19", "Open", 22],
  ["prj-001", "Security package over transmission assets", "Condition Precedent", "Ines Haddad", "2026-09-02", "Open", 58],
  ["prj-001", "Biodiversity offset plan covering Nakuru corridor", "Condition Precedent", "Tobias Lindqvist", "2026-08-12", "Escalated", 78],
  ["prj-001", "Resettlement consultation records for two locations", "Condition Precedent", "Nadia Farouk", "2026-07-28", "Overdue", 86],
  ["prj-001", "Independent engineer certification of grid interface", "Condition Precedent", "Peter Adeyemi", "2026-08-08", "Satisfied", 5],
  ["prj-002", "Debt service coverage ratio remediation plan", "Covenant", "Lucia Ortega", "2026-07-20", "Overdue", 91],
  ["prj-002", "FY2025 audited financial statements", "Condition Subsequent", "Lucia Ortega", "2026-07-10", "Overdue", 88],
  ["prj-003", "Revised exposure limit board confirmation", "Condition Precedent", "Aisha Rahman", "2026-08-12", "In Progress", 26],
  ["prj-003", "Updated risk-sharing term sheet", "Condition Precedent", "Rajiv Menon", "2026-08-22", "Open", 19],
  ["prj-004", "Deforestation-free traceability evidence — Paraná", "Condition Precedent", "João Ferreira", "2026-08-20", "In Progress", 44],
  ["prj-004", "Outgrower programme baseline survey", "Condition Subsequent", "Amara Diallo", "2026-09-15", "Open", 17],
  ["prj-007", "Integrity re-screening of minority shareholder", "Condition Precedent", "Marcus Reid", "2026-08-09", "Escalated", 72],
  ["prj-007", "Updated environmental and social action plan", "Condition Precedent", "Tobias Lindqvist", "2026-08-02", "In Progress", 63],
  ["prj-005", "Spectrum licence renewal confirmation", "Disbursement Condition", "Vikram Rao", "2026-11-30", "Open", 38],
  ["prj-006", "Cold-chain monitoring data-sharing agreement", "Condition Subsequent", "Kwame Boateng", "2026-08-29", "Satisfied", 4],
  ["prj-008", "Charging tariff regulatory confirmation", "Condition Precedent", "Budi Santoso", "2026-09-19", "Open", 55],
  ["prj-008", "Depot land title verification", "Condition Precedent", "Linh Nguyen", "2026-09-05", "In Progress", 31],
  ["prj-009", "Local co-financier commitment letter", "Condition Precedent", "Grace Mbeki", "2026-08-27", "Open", 24],
  ["prj-010", "Green supply-chain KPI framework", "Condition Subsequent", "Rajiv Menon", "2026-10-02", "Open", 12],
  ["prj-011", "Catchment adaptation feasibility annex", "Condition Precedent", "Sofia Ramirez", "2026-09-12", "Waiver Requested", 47],
  ["prj-014", "Insurance programme adequacy opinion", "Disbursement Condition", "Lucas Moreau", "2026-08-26", "In Progress", 28],
  ["prj-016", "Gender-disaggregated reporting template", "Condition Subsequent", "Chen Wei", "2026-09-30", "Satisfied", 3],
  ["prj-023", "Non-revenue water baseline audit", "Condition Precedent", "Priya Raghunathan", "2026-08-16", "Open", 66],
];

export const conditions: Condition[] = conditionSeed.map(([projectId, name, type, owner, dueDate, status, overdueRisk], i) => ({
  id: `cnd-${String(i + 1).padStart(3, "0")}`,
  projectId,
  name,
  type,
  owner,
  dueDate,
  status,
  evidence: status === "Satisfied" ? "Evidence document accepted and filed" : undefined,
  dependency: i % 6 === 0 ? "Legal documentation completion" : undefined,
  waiverRequested: status === "Waiver Requested",
  escalated: status === "Escalated",
  completedOn: status === "Satisfied" ? "2026-07-18" : undefined,
  overdueRisk,
  aiSuggestedOwner: owner,
  sourceMinutes: i % 3 === 0 ? "Investment Review Committee minutes, 19 Jul 2026, section 4.2" : undefined,
}));

const taskTitles = [
  "Review updated environmental assessment",
  "Chase sponsor equity confirmation letter",
  "Validate offtaker payment history",
  "Draft credit memorandum addendum",
  "Prepare investment committee pack",
  "Reconcile financial model to audited statements",
  "Schedule resettlement consultation verification",
  "Confirm insurance programme adequacy",
  "Update development impact baseline",
  "Complete integrity re-screening",
];

export const tasks: Task[] = Array.from({ length: 50 }, (_, i) => {
  const projectIds = ["prj-001", "prj-002", "prj-003", "prj-004", "prj-005", "prj-007", "prj-008", "prj-011", "prj-023", "prj-006"];
  const owners = ["Daniel Okafor", "Maya Thompson", "Priya Raghunathan", "Ines Haddad", "Tobias Lindqvist", "Lucas Moreau", "Amara Diallo", "Grace Mbeki"];
  return {
    id: `tsk-${String(i + 1).padStart(3, "0")}`,
    projectId: projectIds[i % projectIds.length],
    title: `${taskTitles[i % taskTitles.length]}${i >= 10 ? ` (${["Phase 2", "follow-up", "final", "revision", "checkpoint"][i % 5]})` : ""}`,
    owner: owners[i % owners.length],
    dueDate: ["2026-07-30", "2026-08-04", "2026-08-11", "2026-08-18", "2026-08-25", "2026-09-03"][i % 6],
    status: (["Not Started", "In Progress", "Blocked", "Complete"] as const)[i % 4],
    priority: (["Critical", "High", "Medium", "Low"] as const)[i % 4],
    workstream: WORKSTREAMS[i % WORKSTREAMS.length],
    source: (["Manual", "AI Recommendation", "Finding", "Condition"] as const)[i % 4],
  };
});
