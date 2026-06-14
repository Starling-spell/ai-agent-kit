// Shared domain types for the GenLayer + Arc agent kit.

export type JobStatus =
  | "draft"
  | "funded"
  | "submitted"
  | "adjudicating"
  | "approved"
  | "rejected"
  | "settled";

/** The verdict produced by the GenLayer adjudicator (the "brain"). */
export interface Verdict {
  meetsSpec: boolean;
  /** 0–100 confidence from validator consensus. */
  confidence: number;
  reasoning: string;
  /** Where the verdict came from, so the UI can be honest about mock vs live. */
  source: "genlayer" | "mock";
}

/** The result of an Arc settlement (the "rails"). */
export interface Settlement {
  action: "release" | "refund";
  recipient: string;
  amountUsdc: number;
  feeUsdc: number;
  txHash: string;
  source: "arc" | "mock";
}

/** A freelance escrow job — the flagship use case. */
export interface Job {
  id: string;
  title: string;
  /** Acceptance criteria in natural language — this is what GenLayer judges against. */
  spec: string;
  budgetUsdc: number;
  client: string;
  freelancer: string;
  status: JobStatus;
  escrowId?: string;
  fundingTxHash?: string;
  deliverable?: string;
  verdict?: Verdict;
  settlement?: Settlement;
  createdAt: string;
}

export type Mode = "mock" | "live";
