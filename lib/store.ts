"use client";

import type { Agent } from "./types";
import { agentsStore } from "./agents-store";

// Hybrid persistence. When the user is signed in (SIWE) AND Vercel KV is
// configured, agents live server-side (keyed by the verified wallet address)
// and follow the user across devices. Otherwise they fall back to per-browser
// localStorage. Local agents migrate to the cloud the first time both are
// available. The server derives the owner from the session cookie, so these
// requests carry no address — identity is proven, not asserted.

const sortByCreated = (a: Agent[]) =>
  [...a].sort((x, y) => y.createdAt.localeCompare(x.createdAt));

async function remoteList(): Promise<Agent[] | null> {
  try {
    const res = await fetch("/api/store");
    if (!res.ok) return null;
    const { agents } = await res.json();
    return Array.isArray(agents) ? agents : [];
  } catch {
    return null;
  }
}

async function remotePut(agents: Agent[]): Promise<boolean> {
  try {
    const res = await fetch("/api/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agents }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadAgents(canSync: boolean): Promise<Agent[]> {
  if (canSync) {
    const remote = await remoteList();
    if (remote !== null) {
      if (remote.length === 0) {
        const local = agentsStore.list();
        if (local.length) {
          await remotePut(local);
          return sortByCreated(local);
        }
      }
      return sortByCreated(remote);
    }
  }
  return agentsStore.list();
}

export async function saveAgents(
  canSync: boolean,
  agents: Agent[],
): Promise<void> {
  if (canSync) {
    if (await remotePut(agents)) return;
  }
  agentsStore.replaceAll(agents);
}
