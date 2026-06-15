"use client";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  createPublicClient,
  http,
  stringToHex,
  formatEther,
} from "viem";
import { chains } from "./chains";

// ============================================================
//  Optional per-agent wallets — for "autonomous" agents that
//  sign their own testnet transactions (no user approval).
//
//  SAFETY MODEL (read AUDIT.md):
//   * Testnet only — the chain list contains no mainnets.
//   * The private key never leaves this browser (localStorage);
//     it is never sent to the server or KV.
//   * The demo action is a ZERO-VALUE self-transaction carrying
//     a memo — it proves autonomy without moving funds.
//   * Pausing an agent is the kill switch.
//  Do not put real value behind a browser-stored key.
// ============================================================

const KEY = (id: string) => `genlayer-agent-studio:wallet:${id}`;

function chainById(id: number) {
  return chains.find((c) => c.id === id);
}

function getKey(agentId: string): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  const pk = window.localStorage.getItem(KEY(agentId));
  return pk ? (pk as `0x${string}`) : null;
}

/** Generate and persist a testnet keypair for an agent; returns its address. */
export function createAgentWallet(agentId: string): string {
  const pk = generatePrivateKey();
  if (typeof window !== "undefined") window.localStorage.setItem(KEY(agentId), pk);
  return privateKeyToAccount(pk).address;
}

export function getAgentAddress(agentId: string): string | null {
  const pk = getKey(agentId);
  return pk ? privateKeyToAccount(pk).address : null;
}

export function removeAgentWallet(agentId: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY(agentId));
}

export async function agentBalance(
  agentId: string,
  chainId: number,
): Promise<string | null> {
  const pk = getKey(agentId);
  const chain = chainById(chainId);
  if (!pk || !chain) return null;
  const account = privateKeyToAccount(pk);
  const pub = createPublicClient({ chain, transport: http() });
  const bal = await pub.getBalance({ address: account.address });
  return formatEther(bal);
}

/** Autonomous action: a zero-value self-tx carrying a memo. Testnet only. */
export async function agentSendMemo(
  agentId: string,
  chainId: number,
  memo: string,
): Promise<string> {
  const pk = getKey(agentId);
  const chain = chainById(chainId);
  if (!pk) throw new Error("This agent's wallet key is not on this device.");
  if (!chain) throw new Error("Unknown testnet.");
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain, transport: http() });
  return wallet.sendTransaction({
    to: account.address,
    value: 0n,
    data: stringToHex(memo),
  });
}
