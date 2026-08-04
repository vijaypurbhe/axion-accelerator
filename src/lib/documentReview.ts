import { useCallback, useEffect, useState } from "react";

export type FindingDisposition = "pending" | "accepted" | "rejected" | "escalated";
export type ReviewDecision = "not_started" | "in_review" | "changes_requested" | "cleared" | "escalated";

export interface DocumentReviewState {
  decision: ReviewDecision;
  findings: Record<string, FindingDisposition>;
  notes: string;
  reviewer?: string;
  updatedAt?: string;
}

export const EMPTY_REVIEW: DocumentReviewState = { decision: "not_started", findings: {}, notes: "" };

const STORAGE_KEY = "phoenix360.documentReview.v1";
const EVENT = "phoenix360:document-review";

type Store = Record<string, DocumentReviewState>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getReview(documentId: string): DocumentReviewState {
  return readStore()[documentId] ?? EMPTY_REVIEW;
}

export function getAllReviews(): Store {
  return readStore();
}

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  not_started: "Not started",
  in_review: "In review",
  changes_requested: "Changes requested",
  cleared: "Cleared",
  escalated: "Escalated",
};

export const DISPOSITION_LABEL: Record<FindingDisposition, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  escalated: "Escalated",
};

/** Review state for a single document, persisted locally and shared across mounted views. */
export function useDocumentReview(documentId: string) {
  const [state, setState] = useState<DocumentReviewState>(() => getReview(documentId));

  useEffect(() => {
    setState(getReview(documentId));
    const sync = () => setState(getReview(documentId));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [documentId]);

  const update = useCallback(
    (patch: Partial<DocumentReviewState>) => {
      const store = readStore();
      const next: DocumentReviewState = {
        ...EMPTY_REVIEW,
        ...(store[documentId] ?? {}),
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      store[documentId] = next;
      writeStore(store);
      setState(next);
    },
    [documentId],
  );

  const setFinding = useCallback(
    (findingId: string, disposition: FindingDisposition) => {
      const current = getReview(documentId);
      update({
        findings: { ...current.findings, [findingId]: disposition },
        decision: current.decision === "not_started" ? "in_review" : current.decision,
      });
    },
    [documentId, update],
  );

  const reset = useCallback(() => {
    const store = readStore();
    delete store[documentId];
    writeStore(store);
    setState(EMPTY_REVIEW);
  }, [documentId]);

  return { review: state, update, setFinding, reset };
}

export function reviewProgress(state: DocumentReviewState, findingIds: string[]) {
  const resolved = findingIds.filter((id) => (state.findings[id] ?? "pending") !== "pending").length;
  return {
    resolved,
    total: findingIds.length,
    percent: findingIds.length ? Math.round((resolved / findingIds.length) * 100) : 100,
  };
}
