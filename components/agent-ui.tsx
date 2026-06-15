"use client";

import type { Agent } from "@/lib/types";
import { templateById } from "@/lib/templates";
import { chainName } from "@/lib/chains";

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: Agent["status"] }) {
  return (
    <span className={`status-dot ${status}`}>
      <i /> {status}
    </span>
  );
}

export function AgentCard({
  agent,
  onOpen,
}: {
  agent: Agent;
  onOpen: (id: string) => void;
}) {
  const t = templateById(agent.templateId);
  const lastRun = agent.runs[0];
  return (
    <button
      className="agent-card"
      onClick={() => onOpen(agent.id)}
      style={{ borderTopColor: t.accent }}
    >
      <div className="agent-card-head">
        <span className="agent-ic" style={{ background: `${t.accent}22` }}>
          {t.icon}
        </span>
        <StatusDot status={agent.status} />
      </div>
      <div className="agent-name">{agent.name}</div>
      <div className="agent-tag">{t.name}</div>
      <div className="agent-meta">
        <span>{chainName(agent.chainId)}</span>
        <span>·</span>
        <span>{agent.runs.length} runs</span>
        {lastRun && (
          <>
            <span>·</span>
            <span>last {new Date(lastRun.at).toLocaleDateString()}</span>
          </>
        )}
      </div>
    </button>
  );
}

export function DecisionBadge({
  approved,
  confidence,
  source,
}: {
  approved: boolean;
  confidence: number;
  source: string;
}) {
  return (
    <span className={`decision-badge ${approved ? "yes" : "no"}`}>
      {approved ? "✓ approved" : "✕ held"} · {confidence}% · {source}
    </span>
  );
}
