import type { ComplianceRequirement, Covenant, Exposure, RiskSignal } from "@/types";
import { clients } from "./clients";

export const exposures: Exposure[] = clients.flatMap((c, ci) => {
  const entities = [
    { entity: c.name, share: 0.62 },
    { entity: `${c.shortName} Operating Co.`, share: 0.24 },
    { entity: `${c.shortName} Holdings SPV`, share: 0.14 },
  ];
  return entities.map((e, i) => ({
    id: `exp-${ci + 1}-${i + 1}`,
    clientId: c.id,
    entity: e.entity,
    country: c.country,
    region: c.region,
    sector: c.sector,
    product: ["Senior Loan", "Equity", "Guarantee"][i],
    committedUsd: Math.round(c.totalExposureUsd * e.share),
    outstandingUsd: Math.round(c.totalExposureUsd * e.share * 0.78),
    proposedUsd: i === 0 ? c.proposedExposureUsd : 0,
    riskRating: c.riskRating,
    ratingHistory: [
      { period: "2024 H1", rating: 3 },
      { period: "2024 H2", rating: 3 },
      { period: "2025 H1", rating: c.riskRating === "Elevated" ? 4 : 3 },
      { period: "2025 H2", rating: c.riskRating === "Elevated" ? 4 : 2 },
      { period: "2026 H1", rating: c.riskRating === "High" ? 5 : c.riskRating === "Elevated" ? 4 : c.riskRating === "Moderate" ? 3 : 2 },
    ],
  }));
});

export const covenants: Covenant[] = [
  { id: "cov-001", projectId: "prj-002", clientId: "cl-blueriver", name: "Debt service coverage ratio", threshold: "≥ 1.25x", currentValue: "1.08x", status: "Breach", testDate: "2026-06-30", frequency: "Quarterly" },
  { id: "cov-002", projectId: "prj-002", clientId: "cl-blueriver", name: "Net debt / EBITDA", threshold: "≤ 4.5x", currentValue: "4.9x", status: "Watch", testDate: "2026-06-30", frequency: "Quarterly" },
  { id: "cov-003", projectId: "prj-001", clientId: "cl-meridian", name: "Minimum sponsor equity", threshold: "≥ 30%", currentValue: "30.0%", status: "Compliant", testDate: "2026-09-30", frequency: "Semi-Annual" },
  { id: "cov-004", projectId: "prj-003", clientId: "cl-eastbridge", name: "Capital adequacy ratio", threshold: "≥ 13%", currentValue: "16.4%", status: "Compliant", testDate: "2026-06-30", frequency: "Quarterly" },
  { id: "cov-005", projectId: "prj-003", clientId: "cl-eastbridge", name: "Non-performing loan ratio", threshold: "≤ 4%", currentValue: "2.7%", status: "Compliant", testDate: "2026-06-30", frequency: "Quarterly" },
  { id: "cov-006", projectId: "prj-004", clientId: "cl-terranova", name: "Interest coverage ratio", threshold: "≥ 2.5x", currentValue: "2.6x", status: "Watch", testDate: "2026-09-30", frequency: "Quarterly" },
  { id: "cov-007", projectId: "prj-007", clientId: "cl-solarbridge", name: "Debt service reserve", threshold: "6 months", currentValue: "6 months", status: "Compliant", testDate: "2026-08-31", frequency: "Quarterly" },
  { id: "cov-008", projectId: "prj-008", clientId: "cl-pacific", name: "Fleet availability", threshold: "≥ 92%", currentValue: "90.4%", status: "Watch", testDate: "2026-08-15", frequency: "Quarterly" },
  { id: "cov-009", projectId: "prj-005", clientId: "cl-horizon", name: "Leverage ratio", threshold: "≤ 3.5x", currentValue: "2.9x", status: "Compliant", testDate: "2026-10-31", frequency: "Semi-Annual" },
  { id: "cov-010", projectId: "prj-023", clientId: "cl-blueriver", name: "Non-revenue water reduction", threshold: "≤ 30%", currentValue: "33%", status: "Watch", testDate: "2026-09-15", frequency: "Semi-Annual" },
];

const signalSeed: [RiskSignal["category"], RiskSignal["severity"], string, string, string | undefined, string, string, string, string, number][] = [
  ["Milestone Slippage", "High", "GreenGrid environmental clearance slipping against committee date", "cl-meridian", "prj-001", "E&S assessment resubmitted 22 Jul; specialist review averages 21 days against 12 days remaining.", "Project milestone tracker · Data Cloud", "18-day slip to the 22 October board date; syndication timetable at risk.", "Escalate to E&S practice lead and request expedited specialist review", 91],
  ["Covenant Deterioration", "Critical", "BlueRiver debt service coverage ratio breach", "cl-blueriver", "prj-002", "DSCR reported at 1.08x against a 1.25x covenant for the quarter ended 30 June 2026.", "Financial Accounting Management System", "Potential event of default; $120m facility affected.", "Require formal remediation plan within 10 business days and convene risk committee", 97],
  ["Delayed Financial Reporting", "High", "BlueRiver FY2025 audited statements overdue by 46 days", "cl-blueriver", "prj-002", "Statements contractually due 10 June 2026; three reminders issued.", "Document intake pipeline", "Impairs covenant testing and portfolio rating refresh.", "Issue formal notice and escalate to relationship owner", 94],
  ["Sponsor Ownership Change", "High", "SolarBridge minority shareholder transfer disclosed", "cl-solarbridge", "prj-007", "12% minority stake transferred to an undisclosed vehicle on 2 July 2026.", "Client disclosure · Integrity screening", "Integrity re-screening required before investment review.", "Complete beneficial ownership verification and re-run integrity screening", 88],
  ["Environmental and Social", "Critical", "Biodiversity offset gap on Nakuru transmission corridor", "cl-meridian", "prj-001", "Offset plan does not cover 14 km of the corridor crossing a designated habitat.", "E&S review findings · Document intelligence", "Non-compliance with performance standard 6; approval blocker.", "Require revised offset plan with independent ecologist verification", 93],
  ["Relationship Sentiment", "Medium", "Technical engagement decline at Meridian", "cl-meridian", undefined, "No technical counterpart engagement recorded in 60 days following counterpart departure.", "Interaction analytics", "Reduced influence during a critical diligence window.", "Assign a successor technical specialist and schedule an engineering review", 79],
  ["Country Risk", "Medium", "Kenya tariff reform timetable uncertainty", "cl-meridian", "prj-001", "Regulator signalled a review of feed-in tariff methodology for Q4 2026.", "Country risk assessment", "Revenue assumptions in the base case may require sensitivity testing.", "Run downside tariff sensitivity and document in the credit memo", 71],
  ["Missing Review Evidence", "High", "Resettlement consultation records incomplete", "cl-meridian", "prj-001", "Consultation attendance records missing for two of nine affected settlements.", "Document completeness check", "Cannot evidence free, prior and informed consultation.", "Commission verification mission and upload attested records", 85],
  ["Repeated Service Requests", "Medium", "Four data-correction cases raised on Pacific Mobility records", "cl-pacific", "prj-008", "Four cases in 30 days on the same fleet asset register fields.", "Service case analytics", "Indicates an upstream integration mapping defect.", "Raise integration defect and suspend automated sync for the affected object", 82],
  ["Data Inconsistency", "Medium", "Commitment amount mismatch between core system and platform", "cl-eastbridge", "prj-003", "Facility commitment differs by $2.4m between the treasury system and the platform record.", "Reconciliation engine", "Reporting accuracy and exposure aggregation affected.", "Run targeted reconciliation and correct the source of record", 87],
  ["Milestone Slippage", "Medium", "Pacific depot construction permitting delay", "cl-pacific", "prj-013", "Permitting for one of five depots delayed by nine weeks.", "Supervision report", "Disbursement schedule shifts by one quarter.", "Rebaseline the disbursement schedule and notify treasury", 76],
  ["Covenant Deterioration", "Medium", "TerraNova interest coverage narrowing", "cl-terranova", "prj-004", "ICR at 2.6x against a 2.5x threshold, down from 3.1x.", "Financial reporting feed", "Limited headroom before breach.", "Request updated cash-flow forecast and monitor monthly", 80],
  ["Environmental and Social", "Medium", "TerraNova traceability evidence incomplete", "cl-terranova", "prj-004", "Deforestation-free verification missing for two processing sites.", "Document intelligence", "Condition precedent cannot be cleared.", "Set verification deadline and schedule a site audit", 83],
  ["Country Risk", "High", "Colombia municipal tariff approval delay", "cl-blueriver", "prj-002", "Tariff adjustment slipped one quarter across two municipalities.", "Country risk monitoring", "Revenue shortfall compounds the covenant position.", "Model revised tariff timing in the remediation plan", 84],
  ["Relationship Sentiment", "Medium", "BlueRiver engagement below tier benchmark", "cl-blueriver", undefined, "Six engagements in 90 days against a Core-tier benchmark of twelve.", "Interaction analytics", "Weakens influence during remediation discussions.", "Schedule a senior relationship review with the CEO", 74],
  ["Missing Review Evidence", "Medium", "Insurance adequacy opinion outstanding", "cl-meridian", "prj-014", "Broker adequacy opinion not received for the construction all-risk programme.", "Diligence checklist", "Disbursement condition cannot be cleared.", "Chase broker and set a 10-day deadline", 70],
  ["Data Inconsistency", "Low", "Duplicate contact records detected at Horizon", "cl-horizon", undefined, "Three probable duplicate contact records identified by matching logic.", "Data quality engine", "Fragmented engagement history.", "Merge duplicates after steward review", 68],
  ["Delayed Financial Reporting", "Medium", "Pacific Mobility quarterly reporting late", "cl-pacific", "prj-008", "Q2 management accounts 12 days overdue.", "Document intake pipeline", "Delays portfolio quality refresh.", "Issue reminder and log a service case", 72],
  ["Milestone Slippage", "Low", "Horizon spectrum renewal decision timing", "cl-horizon", "prj-005", "Regulator decision expected Q4 rather than Q3.", "Supervision report", "Minor shift to network expansion phasing.", "Monitor and update the project plan", 61],
  ["Sponsor Ownership Change", "Low", "TerraNova minority co-investor exit", "cl-terranova", undefined, "A 6% co-investor exited via secondary sale.", "Client disclosure", "No material change to control.", "Record disclosure and close the signal", 58],
];

export const riskSignals: RiskSignal[] = signalSeed.map(([category, severity, title, clientId, projectId, evidence, source, potentialImpact, recommendedAction, confidence], i) => ({
  id: `sig-${String(i + 1).padStart(3, "0")}`,
  title,
  category,
  severity,
  clientId,
  projectId,
  evidence,
  source,
  confidence,
  potentialImpact,
  recommendedAction,
  owner: ["Priya Raghunathan", "Maya Thompson", "Amara Diallo", "Grace Mbeki", "Lucas Moreau"][i % 5],
  detectedAt: ["2026-07-26", "2026-07-25", "2026-07-24", "2026-07-22", "2026-07-19"][i % 5],
  status: i === 1 ? "Escalated" : i < 6 ? "New" : i % 4 === 0 ? "Acknowledged" : "New",
}));

export const complianceRequirements: ComplianceRequirement[] = clients.flatMap((c, i) => [
  { id: `cmp-${i}-1`, clientId: c.id, name: "Anti-money laundering periodic review", framework: "AML/CFT Policy", status: i % 5 === 1 ? "Overdue" : "Compliant", lastReview: "2026-02-14", nextReview: "2027-02-14", owner: "Marcus Reid" },
  { id: `cmp-${i}-2`, clientId: c.id, name: "Environmental and social performance standards", framework: "Performance Standards 1-8", status: i % 4 === 0 ? "Exception" : "Compliant", lastReview: "2026-05-02", nextReview: "2027-05-02", owner: "Tobias Lindqvist" },
  { id: `cmp-${i}-3`, clientId: c.id, name: "Sanctions and integrity screening", framework: "Integrity Due Diligence", status: i % 6 === 3 ? "In Review" : "Compliant", lastReview: "2026-06-21", nextReview: "2026-12-21", owner: "Marcus Reid" },
]);
