"use client";

import { keccak256 } from "viem";
import type { ActionKind } from "./types";
import type { AgentRunResult } from "./genlayer";

// ============================================================
//  Per-user GenLayer signing — wallet-agnostic (Rabby too).
//
//  GenLayer's MetaMask flow signs through a MetaMask *Snap*
//  (wallet_getSnaps), which Rabby/Coinbase/Brave don't support.
//  Instead we derive a per-wallet GenLayer signing key from a
//  single personal_sign (works in EVERY wallet), then sign
//  decide() transactions locally with genlayer-js. Each run is
//  still one GenLayer transaction from the user's own (derived)
//  account — per user, per run.
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

const GL_EXPLORERS: Record<string, string> = {
  studionet: "https://explorer-studio.genlayer.com",
};

const KEY_CACHE = (addr: string) => `orion:gl-signer:${addr.toLowerCase()}`;

// Derive (once per session) a GenLayer signing key bound to the user's wallet.
async function deriveSignerKey(
  address: string,
  signMessage: (args: { message: string }) => Promise<string>,
): Promise<`0x${string}`> {
  if (typeof window !== "undefined") {
    const cached = window.sessionStorage.getItem(KEY_CACHE(address));
    if (cached) return cached as `0x${string}`;
  }
  const message =
    "Orion — authorize a GenLayer signing key for this session.\n\n" +
    "Signing derives a key your agent runs use to submit GenLayer " +
    "transactions. It does not move funds. Only sign this on Orion.\n\n" +
    `Wallet: ${address}`;
  const signature = await signMessage({ message });
  const key = keccak256(signature as `0x${string}`);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(KEY_CACHE(address), key);
  }
  return key;
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
  signMessage: (args: { message: string }) => Promise<string>;
}): Promise<AgentRunResult> {
  const gljs = (await import("genlayer-js")) as any;
  const chainsMod = (await import("genlayer-js/chains")) as any;
  const chain = chainsMod[params.chain];
  if (!chain) throw new Error(`Unknown GenLayer chain: ${params.chain}`);

  const key = await deriveSignerKey(params.address, params.signMessage);
  const account = gljs.createAccount(key);
  const client = gljs.createClient({ chain, account });

  // Each run = one GenLayer transaction from the user's derived account.
  const txHash = await client.writeContract({
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

  const explorerBase =
    chain?.blockExplorers?.default?.url ?? GL_EXPLORERS[params.chain] ?? "";
  const explorerUrl = explorerBase ? `${explorerBase}/tx/${txHash}` : "";

  try {
    const typesMod = (await import("genlayer-js/types")) as any;
    if (typeof client.waitForTransactionReceipt === "function") {
      await client.waitForTransactionReceipt({
        hash: txHash,
        status: typesMod?.TransactionStatus?.ACCEPTED,
      });
    }
  } catch {
    // Fall through to polling the view method below.
  }

  for (let i = 0; i < 30; i++) {
    const raw: string = await client.readContract({
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
        txHash: String(txHash),
        explorerUrl,
      };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for the GenLayer verdict.");
}
