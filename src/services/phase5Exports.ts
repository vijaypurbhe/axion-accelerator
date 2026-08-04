import { controlById, controlDomain, framework } from "@/data/trustControlLibrary";
import { CONTROL_STATUS_LABEL } from "@/domain/phase5";
import type { ControlInstance, ControlTest, EvidenceRecord, RaciEntry, RiskEntry } from "@/domain/phase5";

/** CSV/Markdown export helpers for the Phase 5 trust and governance artifacts. */

const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
const toCsv = (headers: readonly string[], rows: readonly (readonly string[])[]): string =>
  [headers, ...rows].map((row) => row.map((cell) => escape(cell ?? "")).join(",")).join("\n");

export const download = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const controlMatrixCsv = (instances: readonly ControlInstance[]): string =>
  toCsv(
    [
      "Control ID",
      "Title",
      "Domain",
      "Pillar",
      "Critical",
      "Stage gate",
      "Applicability",
      "Origin",
      "Confidence",
      "Design status",
      "Operating status",
      "Residual risk",
      "Control owner",
      "Frameworks",
      "Rationale",
    ],
    instances.map((instance) => {
      const definition = controlById(instance.controlId);
      const domain = definition ? controlDomain(definition.domain) : undefined;
      return [
        instance.controlId,
        definition?.title ?? "",
        domain?.name ?? "",
        domain?.pillar ?? "",
        definition?.critical ? "Yes" : "No",
        definition?.stageGate ?? "",
        instance.applicability,
        instance.origin,
        instance.confidence ? `${instance.confidence}%` : "",
        CONTROL_STATUS_LABEL[instance.designStatus],
        CONTROL_STATUS_LABEL[instance.operatingStatus],
        instance.residualRisk,
        instance.controlOwner,
        (definition?.frameworkMappings ?? [])
          .map((mapping) => `${framework(mapping.frameworkId)?.shortName ?? mapping.frameworkId} ${mapping.reference}`)
          .join(" | "),
        instance.rationale,
      ];
    }),
  );

export const evidenceCsv = (records: readonly EvidenceRecord[]): string =>
  toCsv(
    ["Evidence ID", "Control", "Title", "Type", "Owner", "Collected", "Valid until", "Reviewer", "Outcome", "Status", "Version"],
    records.map((record) => [
      record.id,
      record.controlId,
      record.title,
      record.type,
      record.owner,
      record.collectedOn.slice(0, 10),
      record.validUntil.slice(0, 10),
      record.reviewer,
      record.reviewOutcome ?? "",
      record.status,
      String(record.version),
    ]),
  );

export const controlTestCsv = (tests: readonly ControlTest[]): string =>
  toCsv(
    ["Test ID", "Control", "Owner", "Sample", "Expected", "Observed", "Outcome", "Deficiency", "Severity", "Retest", "Approval"],
    tests.map((test) => [
      test.id,
      test.controlId,
      test.testOwner,
      test.sample,
      test.expectedResult,
      test.observedResult ?? "",
      test.outcome,
      test.deficiency ?? "",
      test.deficiencySeverity ?? "",
      test.retestDate?.slice(0, 10) ?? "",
      test.approvalState,
    ]),
  );

export const riskRegisterCsv = (risks: readonly RiskEntry[]): string =>
  toCsv(
    [
      "Reference",
      "Category",
      "Statement",
      "Cause",
      "Impact description",
      "Likelihood",
      "Impact",
      "Inherent",
      "Residual",
      "Linked controls",
      "Mitigation",
      "Owner",
      "Due date",
      "Status",
      "Escalated",
      "Accepted by",
    ],
    risks.map((risk) => [
      risk.reference,
      risk.category,
      risk.statement,
      risk.cause,
      risk.impactDescription,
      risk.likelihood,
      risk.impact,
      risk.inherentRisk,
      risk.residualRisk,
      risk.controlIds.join(" | "),
      risk.mitigation,
      risk.owner,
      risk.dueDate.slice(0, 10),
      risk.status,
      risk.escalated ? "Yes" : "No",
      risk.acceptance?.acceptedBy ?? "",
    ]),
  );

export const raciCsv = (entries: readonly RaciEntry[]): string =>
  toCsv(
    ["Dimension", "Activity", "Responsible", "Accountable", "Consulted", "Informed"],
    entries.map((entry) => {
      const byLetter = (letter: string) =>
        entry.assignments
          .filter((assignment) => assignment.letter === letter)
          .map((assignment) => `${assignment.role}${assignment.namedIndividual ? ` (${assignment.namedIndividual})` : ""}`)
          .join(" | ");
      return [entry.dimension, entry.activity, byLetter("R"), byLetter("A"), byLetter("C"), byLetter("I")];
    }),
  );

export const complianceMatrixCsv = (
  coverage: readonly { frameworkId: string; mapped: number; satisfied: number }[],
): string =>
  toCsv(
    ["Framework", "Authority", "Mapped controls", "Satisfied controls", "Coverage %"],
    coverage.map((row) => {
      const fw = framework(row.frameworkId);
      return [
        fw?.name ?? row.frameworkId,
        fw?.authority ?? "",
        String(row.mapped),
        String(row.satisfied),
        row.mapped === 0 ? "0" : String(Math.round((row.satisfied / row.mapped) * 100)),
      ];
    }),
  );
