// Domain types for the GenLayer AI Agent platform.

export type Mode = "mock" | "live";

export type AgentStatus = "active" | "paused";

/** What an agent is allowed to do on-chain when a decision approves an action. */
export type ActionKind = "none" | "transfer" | "contract-call";

export interface AgentTemplate {
  id: string;
  name: string;
  tagline: string;
  instructions: string;
  action: ActionKind;
  actionLabel: string;
  accent: string;
  icon: string;
}

export interface Agent {
  id: string;
  name: string;
  templateId: string;
  /** The agent's directive / persona — authoritative system prompt for GenLayer. */
  instructions: string;
  status: AgentStatus;
  chainId: number;
  action: ActionKind;
  /** "suggest": user approves each tx · "auto": the agent's own wallet signs. */
  autonomy: "suggest" | "auto";
  /** Address of this agent's own testnet wallet when autonomy === "auto". */
  walletAddress?: string;
  createdAt: string;
  runs: AgentRun[];
}

export interface AgentDecision {
  approved: boolean;
  action: ActionKind | string;
  confidence: number;
  reasoning: string;
}

export interface AgentTx {
  hash: string;
  chainId: number;
  explorerUrl: string;
  summary: string;
  status: "submitted" | "simulated";
  source: "viem" | "mock";
}

export interface AgentRun {
  id: string;
  at: string;
  input: string;
  response: string;
  decision: AgentDecision;
  tx?: AgentTx;
  source: "genlayer" | "mock";
}
