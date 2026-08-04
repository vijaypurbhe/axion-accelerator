import { exposures } from "./risk";

export type ExposureTransactionType =
  | "Commitment"
  | "Disbursement"
  | "Repayment"
  | "Interest"
  | "Fee"
  | "Guarantee Call"
  | "Equity Injection";

export interface ExposureTransaction {
  id: string;
  exposureId: string;
  clientId: string;
  entity: string;
  reference: string;
  type: ExposureTransactionType;
  valueDate: string;
  amountUsd: number;
  currency: string;
  status: "Settled" | "Pending" | "Failed";
  sourceSystem: "Treasury Systems" | "Loan Servicing" | "Core Banking";
  narrative: string;
}

const TYPES: ExposureTransactionType[] = [
  "Commitment",
  "Disbursement",
  "Disbursement",
  "Repayment",
  "Interest",
  "Fee",
];

const STATUSES: ExposureTransaction["status"][] = ["Settled", "Settled", "Settled", "Pending", "Settled", "Failed"];
const SYSTEMS: ExposureTransaction["sourceSystem"][] = ["Treasury Systems", "Loan Servicing", "Core Banking"];
const DATES = ["2025-11-14", "2026-01-22", "2026-03-05", "2026-04-18", "2026-06-02", "2026-07-11"];

/** Deterministic ledger derived from booked exposure positions. */
export const exposureTransactions: ExposureTransaction[] = exposures.flatMap((e, ei) => {
  const productType: ExposureTransactionType =
    e.product === "Equity" ? "Equity Injection" : e.product === "Guarantee" ? "Guarantee Call" : "Disbursement";

  return Array.from({ length: 6 }, (_, i) => {
    const type = i === 0 ? "Commitment" : i === 1 ? productType : TYPES[(ei + i) % TYPES.length];
    const base = e.committedUsd;
    const amount =
      type === "Commitment"
        ? base
        : type === "Interest"
          ? Math.round(base * 0.011)
          : type === "Fee"
            ? Math.round(base * 0.0035)
            : type === "Repayment"
              ? Math.round(base * 0.045)
              : Math.round(base * (0.08 + ((ei + i) % 5) * 0.02));

    const status = STATUSES[(ei * 3 + i) % STATUSES.length];

    return {
      id: `txn-${ei + 1}-${i + 1}`,
      exposureId: e.id,
      clientId: e.clientId,
      entity: e.entity,
      reference: `TXN-${String(100_000 + ei * 17 + i * 3)}`,
      type,
      valueDate: DATES[i],
      amountUsd: amount,
      currency: "USD",
      status,
      sourceSystem: SYSTEMS[(ei + i) % SYSTEMS.length],
      narrative:
        type === "Commitment"
          ? `Board-approved commitment booked against ${e.product.toLowerCase()} facility`
          : type === "Repayment"
            ? "Scheduled principal repayment received"
            : type === "Interest"
              ? "Interest accrual settled for the period"
              : type === "Fee"
                ? "Front-end / commitment fee applied"
                : `${type} executed under the ${e.product.toLowerCase()} facility`,
    } satisfies ExposureTransaction;
  });
});
