"use client";

import type { Agent } from "./types";
import { agentsStore } from "./agents-store";

// Hybrid persistence: when a wallet is connected AND Vercel KV is configured,
// agents live server-side (keyed by address) so they follow the user across
// devices. Otherwise they fall back to per-browser localStorage. Local agents
// are migrated up to the cloud the first time both are available.

const sortByCreated = (a: Agent[]) =>
  [...a].sort((x, y) => y.createdAt.localeCompare(x.createdAt));

async function remoteList(owner: string): Promise<Agent[] | null> {
  try {
    const res = await fetch(`/api/store?owner=${owner}`);
    if (!res.ok) return null;
    const { agents } = await res.json();
    return Array.isArray(agents) ? agents : [];
  } catch {
    return null;
  }
}

async function remotePut(owner: string, agents: Agent[]): Promise<boolean> {
  try {
    const res = await fetch("/api/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, agents }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadAgents(
  owner: string | null,
  kv: boolean,
): Promise<Agent[]> {
  if (kv && owner) {
    const remote = await remoteList(owner);
    if (remote !== null) {
      if (remote.length === 0) {
        const local = agentsStore.list();
        if (local.length) {
          await remotePut(owner, local);
          return sortByCreated(local);
        }
      }
      return sortByCreated(remote);
    }
  }
  return agentsStore.list();
}

export async function saveAgents(
  owner: string | null,
  kv: boolean,
  agents: Agent[],
): Promise<void> {
  if (kv && owner) {
    const ok = await remotePut(owner, agents);
    if (ok) return;
  }
  agentsStore.replaceAll(agents);
}
