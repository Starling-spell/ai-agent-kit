"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Sidebar, type View } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { StatTile, AgentCard } from "@/components/agent-ui";
import { CreateAgentModal } from "@/components/CreateAgentModal";
import { AgentDetail } from "@/components/AgentDetail";
import { loadAgents, saveAgents } from "@/lib/store";
import { removeAgentWallet } from "@/lib/agent-wallet";
import type { Agent, AgentRun } from "@/lib/types";

export default function Home() {
  const { address } = useAccount();
  const [view, setView] = useState<View>("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<{ ai: string; tx: string; kv: boolean } | null>(
    null,
  );

  const owner = address ?? null;
  const kv = !!mode?.kv;

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setMode)
      .catch(() => setMode(null));
  }, []);

  // (Re)load agents whenever the owner or storage backend changes.
  useEffect(() => {
    let cancelled = false;
    loadAgents(owner, kv).then((a) => !cancelled && setAgents(a));
    return () => {
      cancelled = true;
    };
  }, [owner, kv]);

  function persist(next: Agent[]) {
    setAgents(next);
    void saveAgents(owner, kv, next);
  }

  const selected = selectedId
    ? agents.find((a) => a.id === selectedId) ?? null
    : null;

  function createAgent(a: Agent) {
    persist([a, ...agents]);
    setCreateOpen(false);
    setSelectedId(a.id);
  }
  function addRun(id: string, run: AgentRun) {
    persist(
      agents.map((x) =>
        x.id === id ? { ...x, runs: [run, ...x.runs].slice(0, 50) } : x,
      ),
    );
  }
  function updateAgent(id: string, patch: Partial<Agent>) {
    persist(agents.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function deleteAgent(id: string) {
    const a = agents.find((x) => x.id === id);
    if (a?.autonomy === "auto") removeAgentWallet(id);
    persist(agents.filter((x) => x.id !== id));
    setSelectedId(null);
  }

  const totalRuns = agents.reduce((n, a) => n + a.runs.length, 0);
  const totalTx = agents.reduce(
    (n, a) => n + a.runs.filter((r) => r.tx).length,
    0,
  );
  const active = agents.filter((a) => a.status === "active").length;
  const txMode = mode?.tx === "live" ? "live" : "mock";

  return (
    <div className="app">
      <Sidebar
        view={view}
        onView={(v) => {
          setView(v);
          setSelectedId(null);
        }}
        agentCount={agents.length}
        mode={mode}
      />

      <div className="main">
        {selected ? (
          <>
            <Topbar
              title={selected.name}
              subtitle={kv && owner ? "Agent detail · synced" : "Agent detail"}
            />
            <div className="content">
              <AgentDetail
                agent={selected}
                txMode={txMode}
                onBack={() => setSelectedId(null)}
                onRan={(run) => addRun(selected.id, run)}
                onUpdate={(patch) => updateAgent(selected.id, patch)}
                onDelete={() => deleteAgent(selected.id)}
              />
            </div>
          </>
        ) : view === "overview" ? (
          <>
            <Topbar
              title="Overview"
              subtitle={
                kv && owner
                  ? "Synced to your wallet across devices"
                  : "Your GenLayer agents at a glance"
              }
              onNew={() => setCreateOpen(true)}
            />
            <div className="content">
              <div className="stat-row">
                <StatTile label="Agents" value={agents.length} />
                <StatTile label="Active" value={active} />
                <StatTile label="Total runs" value={totalRuns} />
                <StatTile label="Testnet txs" value={totalTx} />
              </div>
              {agents.length === 0 ? (
                <EmptyState onNew={() => setCreateOpen(true)} />
              ) : (
                <>
                  <h2 className="section-title">Recent agents</h2>
                  <div className="agent-grid">
                    {agents.slice(0, 6).map((a) => (
                      <AgentCard key={a.id} agent={a} onOpen={setSelectedId} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Topbar
              title="Agents"
              subtitle={`${agents.length} ${agents.length === 1 ? "agent" : "agents"}`}
              onNew={() => setCreateOpen(true)}
            />
            <div className="content">
              {agents.length === 0 ? (
                <EmptyState onNew={() => setCreateOpen(true)} />
              ) : (
                <div className="agent-grid">
                  {agents.map((a) => (
                    <AgentCard key={a.id} agent={a} onOpen={setSelectedId} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {createOpen && (
        <CreateAgentModal
          onClose={() => setCreateOpen(false)}
          onCreate={createAgent}
        />
      )}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-emoji">◑</div>
      <h2>Build your first agent</h2>
      <p>
        Pick a template, write a directive, and GenLayer powers its decisions.
        Approved actions execute on testnet.
      </p>
      <button className="btn-primary" onClick={onNew}>
        + New agent
      </button>
    </div>
  );
}
