"use client";

import { useState } from "react";
import { TEMPLATES, templateById } from "@/lib/templates";
import { chains, defaultChain } from "@/lib/chains";
import { createAgentWallet } from "@/lib/agent-wallet";
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
  const [autonomy, setAutonomy] = useState<"suggest" | "auto">("suggest");
  const [error, setError] = useState<string | null>(null);

  const t = templateById(templateId);
  const hasTx = t.action !== "none";

  function pick(id: string) {
    const tt = templateById(id);
    setTemplateId(id);
    setName(tt.id === "blank" ? "" : tt.name);
    setInstructions(tt.instructions);
    if (tt.action === "none") setAutonomy("suggest");
  }

  function submit() {
    if (!name.trim()) return setError("Give your agent a name.");
    if (!instructions.trim()) return setError("Write a directive for your agent.");

    const id = crypto.randomUUID();
    const useAuto = hasTx && autonomy === "auto";
    const walletAddress = useAuto ? createAgentWallet(id) : undefined;

    onCreate({
      id,
      name: name.trim(),
      templateId,
      instructions: instructions.trim(),
      status: "active",
      chainId,
      action: t.action,
      autonomy: useAuto ? "auto" : "suggest",
      walletAddress,
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
                type="button"
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
              rows={5}
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
                  {hasTx ? t.actionLabel : "No transaction"}
                </div>
              </div>
            </div>

            <label>Execution</label>
            <div className="seg">
              <button
                type="button"
                className={autonomy === "suggest" ? "active" : ""}
                onClick={() => setAutonomy("suggest")}
              >
                Suggest — you approve each tx
              </button>
              <button
                type="button"
                className={autonomy === "auto" ? "active" : ""}
                disabled={!hasTx}
                onClick={() => setAutonomy("auto")}
              >
                Autonomous — agent wallet signs
              </button>
            </div>
            {hasTx && autonomy === "auto" && (
              <div className="warn-note">
                A testnet keypair is generated and stored <strong>in this browser only</strong>.
                Fund it from a faucet to let the agent act on its own. Testnet only —
                never put real funds behind it.
              </div>
            )}
            {!hasTx && (
              <div className="muted-note">
                This template makes no transactions, so it only suggests.
              </div>
            )}

            {error && <div className="error">{error}</div>}

            <div className="btn-row">
              <button className="btn-primary" type="button" onClick={submit}>
                Create agent
              </button>
              <button className="btn-ghost" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
