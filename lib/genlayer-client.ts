"use client";

import type { ActionKind } from "./types";
import type { AgentRunResult } from "./genlayer";

// ============================================================
//  Per-user GenLayer signing.
//  When NEXT_PUBLIC_GENLAYER_CONTRACT is set, each agent run is
//  a transaction the USER signs with their own wallet on the
//  GenLayer testnet (provider: window.ethereum) — one tx per
//  run, per user. genlayer-js is loaded lazily in the browser.
// ============================================================

export function genlayerUserMode(): {
  contract: `0x${string}`;
  chain: string;
} | null {
  const contract = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT;
  const chain = process.env.NEXT_PUBLIC_GENLAYER_CHAIN ?? "testnetAsimov";
  return contract && /^0x[0-9a-fA-F]{40}$/.test(contract)
    ? { contract: contract as `0x${string}`, chain }
    : null;
}

// GenLayer signs through a MetaMask Snap, so it needs MetaMask's provider
// specifically — Rabby / Coinbase / Brave don't implement wallet_getSnaps.
function getMetaMaskProvider(): any {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: any }).ethereum;
  if (!eth) return null;
  const isRealMetaMask = (p: any) =>
    p &&
    p.isMetaMask &&
    !p.isRabby &&
    !p.isBraveWallet &&
    !p.isCoinbaseWallet &&
    !p.isPhantom;
  if (Array.isArray(eth.providers)) {
    const mm = eth.providers.find(isRealMetaMask);
    if (mm) return mm;
  }
  return isRealMetaMask(eth) ? eth : null;
}

export async function decideViaUserWallet(params: {
  contract: `0x${string}`;
  chain: string;
  address: `0x${string}`;
  agentId: string;
  runId: string;
  instructions: string;
  input: string;
  action: ActionKind;
}): Promise<AgentRunResult> {
  const eth = getMetaMaskProvider();
  if (!eth) {
    throw new Error(
      "GenLayer signing requires MetaMask (it signs through a MetaMask Snap). " +
        "The connected wallet (e.g. Rabby) doesn't support Snaps — connect MetaMask and retry.",
    );
  }

  const gljs = (await import("genlayer-js")) as any;
  const chainsMod = (await import("genlayer-js/chains")) as any;
  const chain = chainsMod[params.chain];
  if (!chain) throw new Error(`Unknown GenLayer chain: ${params.chain}`);

  // Write client signed by the user's wallet — this is the per-user transaction.
  const writeClient = gljs.createClient({
    chain,
    account: params.address,
    provider: eth,
  });
  // Ensure the wallet is on the GenLayer network before signing.
  if (typeof writeClient.connect === "function") {
    await writeClient.connect(params.chain);
  }

  const txHash = await writeClient.writeContract({
    address: params.contract,
    functionName: "decide",
    args: [
      params.agentId,
      params.runId,
      params.instructions,
      params.input,
      params.action,
    ],
    value: BigInt(0),
  });

  try {
    const typesMod = (await import("genlayer-js/types")) as any;
    if (typeof writeClient.waitForTransactionReceipt === "function") {
      await writeClient.waitForTransactionReceipt({
        hash: txHash,
        status: typesMod?.TransactionStatus?.ACCEPTED,
      });
    }
  } catch {
    // Fall through to polling the view method below.
  }

  // Read client (no wallet) to poll the finalized verdict.
  const readClient = gljs.createClient({ chain });
  for (let i = 0; i < 30; i++) {
    const raw: string = await readClient.readContract({
      address: params.contract,
      functionName: "get_response",
      args: [params.runId],
    });
    if (raw) {
      const p = JSON.parse(raw);
      return {
        response: String(p.response ?? p.reasoning ?? ""),
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
  throw new Error("Timed out waiting for the GenLayer verdict.");
}
