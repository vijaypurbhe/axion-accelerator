import { LIFECYCLE_STAGES } from "@/domain/catalogs";
import { stageDefinition } from "@/data/lifecycleDefinitions";
import type { LifecycleStageId } from "@/domain/types";
import type { StageGateStatus, StageItem, StageWaiver } from "@/domain/phase2";
import { roleCan } from "@/domain/rbac";
import type { RoleId } from "@/domain/models";

export const stageOrder = (stage: LifecycleStageId): number =>
  LIFECYCLE_STAGES.find((entry) => entry.id === stage)?.order ?? 1;

export const nextStage = (stage: LifecycleStageId): LifecycleStageId | null => {
  const next = LIFECYCLE_STAGES.find((entry) => entry.order === stageOrder(stage) + 1);
  return next?.id ?? null;
};

export const isOverdue = (item: StageItem, reference = new Date()): boolean =>
  item.status !== "complete" && item.status !== "waived" && new Date(item.dueDate).getTime() < reference.getTime();

/** Computes progress and gate eligibility for a stage. Mandatory items may be waived by an approved exception. */
export const evaluateStageGate = (
  stage: LifecycleStageId,
  items: readonly StageItem[],
  waivers: readonly StageWaiver[],
): StageGateStatus => {
  const stageItems = items.filter((item) => item.stage === stage);
  const approvedWaiverItemIds = new Set(
    waivers.filter((waiver) => waiver.stage === stage && waiver.state === "approved").map((waiver) => waiver.itemId),
  );

  const completeItems = stageItems.filter(
    (item) => item.status === "complete" || item.status === "waived" || approvedWaiverItemIds.has(item.id),
  ).length;

  const openMandatory = stageItems.filter(
    (item) =>
      item.mandatory &&
      item.status !== "complete" &&
      item.status !== "waived" &&
      !approvedWaiverItemIds.has(item.id),
  );

  const waivedMandatory = stageItems.filter(
    (item) => item.mandatory && (item.status === "waived" || approvedWaiverItemIds.has(item.id)),
  );

  const blockedItems = stageItems.filter((item) => item.status === "blocked");
  const overdueItems = stageItems.filter((item) => isOverdue(item));

  const blockedExplanation =
    openMandatory.length > 0
      ? `${openMandatory.length} mandatory item(s) outstanding: ${openMandatory
          .slice(0, 3)
          .map((item) => item.label)
          .join("; ")}${openMandatory.length > 3 ? "…" : ""}`
      : blockedItems.length > 0
        ? `${blockedItems.length} item(s) blocked: ${blockedItems[0].blockerReason ?? "reason not recorded"}`
        : undefined;

  return {
    stage,
    progress: stageItems.length === 0 ? 0 : Math.round((completeItems / stageItems.length) * 100),
    totalItems: stageItems.length,
    completeItems,
    overdueItems: overdueItems.length,
    blockedItems: blockedItems.length,
    openMandatory,
    waivedMandatory,
    canRequestAdvance: openMandatory.length === 0 && nextStage(stage) !== null,
    blockedExplanation,
  };
};

export const canApproveStage = (role: RoleId, stage: LifecycleStageId): boolean =>
  stageDefinition(stage).approvers.includes(role) && roleCan(role, "approve");

/** Waivers require an authorised approver of the stage gate. */
export const canWaive = (role: RoleId, stage: LifecycleStageId): boolean =>
  canApproveStage(role, stage) || roleCan(role, "administer");
