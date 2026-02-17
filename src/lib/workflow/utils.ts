import type { Quote, QuoteWorkflowState } from "@/types/quote";

const LEGACY_STATUS_STATE_MAP: Record<string, QuoteWorkflowState> = {
  draft: "draft",
  submitted: "submitted",
  "pending_approval": "submitted",
  "under-review": "admin_review",
  admin_review: "admin_review",
  finance_review: "finance_review",
  approved: "approved",
  rejected: "rejected",
  needs_revision: "needs_revision",
  closed: "closed",
};

const ADMIN_LANE_STATES: QuoteWorkflowState[] = ["submitted", "admin_review"];
const FINANCE_LANE_STATES: QuoteWorkflowState[] = ["finance_review"];
const PENDING_STATES: QuoteWorkflowState[] = ["submitted", "admin_review", "finance_review"];

export const statusToWorkflowState = (
  status?: Quote["status"] | null,
): QuoteWorkflowState | undefined => {
  if (!status) {
    return undefined;
  }
  const key = status as string;
  return LEGACY_STATUS_STATE_MAP[key] ?? undefined;
};

export const deriveWorkflowState = (
  quote: Pick<Quote, "status" | "requires_finance_approval"> & Partial<Pick<Quote, "workflow_state">>,
): QuoteWorkflowState => {
  if ((quote.status as string | undefined) === 'under-review' && quote.requires_finance_approval) {
    return 'finance_review';
  }

  return (quote.workflow_state as QuoteWorkflowState | undefined)
    ?? statusToWorkflowState(quote.status)
    ?? "draft";
};

export const isPendingWorkflowState = (state: QuoteWorkflowState | undefined): boolean => {
  if (!state) return false;
  return PENDING_STATES.includes(state);
};

export const getWorkflowLaneForState = (
  state: QuoteWorkflowState | undefined,
): "admin" | "finance" | null => {
  if (!state) return null;
  if (ADMIN_LANE_STATES.includes(state)) {
    return "admin";
  }
  if (FINANCE_LANE_STATES.includes(state)) {
    return "finance";
  }
  return null;
};

export const isFinalWorkflowState = (state: QuoteWorkflowState | undefined): boolean => {
  if (!state) return false;
  return ["approved", "rejected", "needs_revision", "closed"].includes(state);
};

export const WORKFLOW_QUEUE_STATES = new Set<QuoteWorkflowState>(PENDING_STATES);
export const ADMIN_REVIEW_STATES = new Set<QuoteWorkflowState>(ADMIN_LANE_STATES);
export const FINANCE_REVIEW_STATES = new Set<QuoteWorkflowState>(FINANCE_LANE_STATES);
