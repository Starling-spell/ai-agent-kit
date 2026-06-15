import { config } from "./config";
import type { ActionKind, AgentDecision } from "./types";

// ============================================================
//  GenLayer adapter — the agent's AI brain.
//  Given an agent's directive (instructions) and a user input,
//  it returns a natural-language response plus a structured
//  decision (approve/reject + which action). Mock by default;
//  live mode calls the deployed AgentRegistry Intelligent
//  Contract via genlayer-js.
// ============================================================

export interface AgentRunResult {
  response: string;
  decision: AgentDecision;
  source: "genlayer" | "mock";
}

const RISK_WORDS = [
  "urgent", "immediately", "ignore", "override", "bypass", "all funds",
  "everything", "secret", "private key", "guaranteed", "wire now", "asap",
  "as an ai", "system prompt", "drain",
];

const POSITIVE_WORDS = [
  "approved", "verified", "legitimate", "within policy", "valid", "eligible",
  "ok", "fine", "safe", "reasonable", "normal",
];

/**
 * Transparent heuristic standing in for GenLayer's validator consensus.
 * Deterministic and explainable so the demo behaves sensibly with no LLM.
 * It treats the instructions as authoritative and never lets the input's own
 * text flip the decision (a basic prompt-injection guard, mirrored on-chain).
 */
function mockRun(
  instructions: string,
  input: string,
  action: ActionKind,
): AgentRunResult {
  const text = input.toLowerCase();
  const riskHits = RISK_WORDS.filter((w) => text.includes(w));
  const posHits = POSITIVE_WORDS.filter((w) => text.includes(w));
  const substantive = input.trim().length >= 8;

  // Reject on risk signals or empty input; otherwise approve.
  const approved = substantive && riskHits.length === 0;
  const confidence = Math.min(
    98,
    Math.max(
      45,
      70 + posHits.length * 8 - riskHits.length * 22 + (substantive ? 0 : -20),
    ),
  );

  let reasoning: string;
  if (!substantive) {
    reasoning = "The request is empty or too short to act on.";
  } else if (riskHits.length) {
    reasoning = `Rejected: the request shows risk/injection signals (${riskHits
      .slice(0, 3)
      .join(", ")}), which my directive says to refuse.`;
  } else {
    reasoning =
      "Approved: the request is consistent with my directive and shows no risk signals.";
  }

  const directive = instructions.trim().slice(0, 80) || "general assistant";
  const response = approved
    ? `Per my directive (“${directive}…”), this is in policy. ${reasoning} ${
        action !== "none" ? "Proceeding with the configured action." : ""
      }`.trim()
    : `Per my directive (“${directive}…”), I am holding. ${reasoning}`;

  return {
    response,
    decision: {
      approved,
      action: approved ? action : "none",
      confidence,
      reasoning,
    },
    source: "mock",
  };
}

/**
 * Live mode: call the AgentRegistry Intelligent Contract. genlayer-js is
 * imported through a runtime-resolved specifier so a mock build never needs it.
 * Enable with `npm install genlayer-js` and AI_MODE=live.
 */
async function liveRun(
  agentId: string,
  runId: string,
  instructions: string,
  input: string,
  action: ActionKind,
): Promise<AgentRunResult> {
  const { contractAddress, privateKey } = config.genlayer;
  if (!contractAddress || !privateKey) {
    throw new Error(
      "Live AI needs GENLAYER_CONTRACT_ADDRESS and GENLAYER_PRIVATE_KEY.",
    );
  }

  let gljs: any;
  let chains: any;
  try {
    const sdk = "genlayer-js";
    const sdkChains = "genlayer-js/chains";
    gljs = await import(/* webpackIgnore: true */ sdk);
    chains = await import(/* webpackIgnore: true */ sdkChains);
  } catch {
    throw new Error("Live mode requires genlayer-js. Run `npm install genlayer-js`.");
  }

  const client = gljs.createClient({
    chain: chains[config.genlayer.chain],
    account: gljs.createAccount(privateKey),
  });

  await client.writeContract({
    address: contractAddress,
    functionName: "decide",
    args: [agentId, runId, instructions, input, action],
    value: 0n,
  });

  for (let i = 0; i < 30; i++) {
    const raw: string = await client.readContract({
      address: contractAddress,
      functionName: "get_response",
      args: [runId],
    });
    if (raw) {
      const p = JSON.parse(raw);
      return {
        response: String(p.response ?? ""),
        decision: {
          approved: Boolean(p.approved),
          action: String(p.action ?? "none"),
          confidence: Number(p.confidence ?? 0),
          reasoning: String(p.reasoning ?? ""),
        },
        source: "genlayer",
      };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for GenLayer consensus.");
}

export async function runAgent(params: {
  agentId: string;
  runId: string;
  instructions: string;
  input: string;
  action: ActionKind;
}): Promise<AgentRunResult> {
  if (config.aiMode === "live") {
    return liveRun(
      params.agentId,
      params.runId,
      params.instructions,
      params.input,
      params.action,
    );
  }
  await new Promise((r) => setTimeout(r, 650)); // simulate consensus latency
  return mockRun(params.instructions, params.input, params.action);
}
