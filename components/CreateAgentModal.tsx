"use client";

import { useState } from "react";
import { TEMPLATES, templateById } from "@/lib/templates";
import { chains, defaultChain } from "@/lib/chains";
import type { Agent } from "@/lib/types";

export function CreateAgentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (agent: Agent) => void;
}) {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [name, setName] = useState(TEMPLATES[0].name);
  const [instructions, setInstructions] = useState(TEMPLATES[0].instructions);
  const [chainId, setChainId] = useState<number>(defaultChain.id);
  const [error, setError] = useState<string | null>(null);

  const t = templateById(templateId);

  function pick(id: string) {
    const tt = templateById(id);
    setTemplateId(id);
    setName(tt.id === "blank" ? "" : tt.name);
    setInstructions(tt.instructions);
  }

  function submit() {
    if (!name.trim()) return setError("Give your agent a name.");
    if (!instructions.trim()) return setError("Write a directive for your agent.");
    onCreate({
      id: crypto.randomUUID(),
      name: name.trim(),
      templateId,
      instructions: instructions.trim(),
      status: "active",
      chainId,
      action: t.action,
      autonomy: "suggest",
      createdAt: new Date().toISOString(),
      runs: [],
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h3>Create an agent</h3>
          <button className="x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="create-grid">
          <div className="template-list">
            {TEMPLATES.map((tt) => (
              <button
                key={tt.id}
                className={`template-item ${templateId === tt.id ? "active" : ""}`}
                onClick={() => pick(tt.id)}
                style={{ borderLeftColor: tt.accent }}
              >
                <span className="t-ic">{tt.icon}</span>
                <span className="t-body">
                  <span className="t-name">{tt.name}</span>
                  <span className="t-tag">{tt.tagline}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="create-form">
            <label>Agent name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Treasury Sentinel"
            />

            <label>Directive (GenLayer reasons with this — it is authoritative)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe how the agent should decide."
              rows={6}
            />

            <div className="row">
              <div>
                <label>Testnet</label>
                <select
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                >
                  {chains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>On-approve action</label>
                <div className="action-pill">
                  {t.action === "none" ? "No transaction" : t.actionLabel}
                </div>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="btn-row">
              <button className="btn-primary" onClick={submit}>
                Create agent
              </button>
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
