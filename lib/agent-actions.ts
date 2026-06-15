import { parseAbi } from "viem";

// ABI + address resolver for the on-chain AgentActions log contract.
// Deploy contracts/evm/AgentActions.sol per chain and set the addresses in
// NEXT_PUBLIC_AGENT_ACTIONS as JSON: {"84532":"0x...","11155111":"0x..."}.
// When no address is configured for a chain, the app falls back to a 0-value
// memo self-transaction, so it still works out of the box.

export const agentActionsAbi = parseAbi([
  "function logAction(string agentName, string action, string memo, bytes32 runId) returns (uint256)",
  "function totalActions() view returns (uint256)",
  "function actionCountOf(address) view returns (uint256)",
  "event ActionLogged(address indexed agent, bytes32 indexed runId, string agentName, string action, string memo, uint256 index)",
]);

let MAP: Record<string, string> = {};
try {
  MAP = process.env.NEXT_PUBLIC_AGENT_ACTIONS
    ? JSON.parse(process.env.NEXT_PUBLIC_AGENT_ACTIONS)
    : {};
} catch {
  MAP = {};
}

export function agentActionsAddress(chainId: number): `0x${string}` | null {
  const v = MAP[String(chainId)];
  return v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : null;
}
