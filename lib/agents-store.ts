"use client";

import type { Agent, AgentRun } from "./types";

// Client-side persistence for agents. localStorage keeps the demo zero-backend
// and deployable on Vercel with no database; swap this module for an API +
// Vercel KV / Postgres to make agents multi-device and server-authoritative.

const KEY = "genlayer-agent-studio:agents:v1";

function read(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Agent[]) : [];
  } catch {
    return [];
  }
}

function write(agents: Agent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(agents));
}

export const agentsStore = {
  list(): Agent[] {
    return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string): Agent | undefined {
    return read().find((a) => a.id === id);
  },

  create(agent: Agent): Agent {
    const agents = read();
    agents.push(agent);
    write(agents);
    return agent;
  },

  update(id: string, patch: Partial<Agent>): Agent | undefined {
    const agents = read();
    const i = agents.findIndex((a) => a.id === id);
    if (i === -1) return undefined;
    agents[i] = { ...agents[i], ...patch };
    write(agents);
    return agents[i];
  },

  addRun(id: string, run: AgentRun): Agent | undefined {
    const agents = read();
    const i = agents.findIndex((a) => a.id === id);
    if (i === -1) return undefined;
    agents[i] = { ...agents[i], runs: [run, ...agents[i].runs].slice(0, 50) };
    write(agents);
    return agents[i];
  },

  remove(id: string) {
    write(read().filter((a) => a.id !== id));
  },
};
