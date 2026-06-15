"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from "wagmi";
import { stringToHex } from "viem";
import type { Agent, AgentRun, AgentTx } from "@/lib/types";
import { templateById } from "@/lib/templates";
import { chainName, explorerTx, faucetUrl } from "@/lib/chains";
import { agentBalance, agentSendMemo, getAgentAddress } from "@/lib/agent-wallet";
import { DecisionBadge } from "./agent-ui";

export function AgentDetail({
  agent,
  txMode,
  onBack,
  onRan,
  onUpdate,
  onDelete,
}: {
  agent: Agent;
  txMode: "mock" | "live";
  onBack: () => void;
  onRan: (run: AgentRun) => void;
  onUpdate: (patch: Partial<Agent>) => void;
  onDelete: () => void;
}) {
  const t = templateById(agent.templateId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agent.instructions);
  const [balance, setBalance] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();

  const needsTx = agent.action !== "none";
  const live = txMode === "live";
  const auto = agent.autonomy === "auto";
  const agentAddr = auto ? agent.walletAddress ?? getAgentAddress(agent.id) : null;

  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    agentBalance(agent.id, agent.chainId)
      .then((b) => !cancelled && setBalance(b))
      .catch(() => !cancelled && setBalance(null));
    return () => {
      cancelled = true;
    };
  }, [auto, agent.id, agent.chainId, agent.runs.length]);

  async function mockExecute(): Promise<AgentTx> {
    const er = await fetch("/api/agents/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: agent.chainId,
        summary: `${agent.name} · ${agent.action}`,
      }),
    });
    const ed = await er.json();
    if (!er.ok) throw new Error(ed.error ?? "Execute failed.");
    return ed.tx;
  }

  async function run() {
    if (!input.trim()) return setError("Enter an input for the agent to judge.");
    setError(null);
    setBusy(true);
    const runId = crypto.randomUUID();
    try {
      const res = await fetch("/api/agents/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          runId,
          instructions: agent.instructions,
          input,
          action: agent.action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Agent run failed.");
      const { response, decision, source } = data;

      let tx: AgentTx | undefined;
      if (decision.approved && needsTx) {
        const memo = `agent:${agent.name}:${decision.action}`;
        if (live && auto) {
          // The agent signs from its own funded testnet wallet — no user prompt.
          const hash = await agentSendMemo(agent.id, agent.chainId, memo);
          tx = {
            hash,
            chainId: agent.chainId,
            explorerUrl: explorerTx(agent.chainId, hash),
            summary: `${agent.name} · ${decision.action}`,
            status: "submitted",
            source: "viem",
          };
        } else if (live) {
          // Suggest mode: the connected wallet signs.
          if (!isConnected || !address)
            throw new Error("Connect a wallet to execute the testnet action.");
          if (chainId !== agent.chainId)
            await switchChainAsync({ chainId: agent.chainId });
          const hash = await sendTransactionAsync({
            to: address,
            value: 0n,
            data: stringToHex(memo),
            chainId: agent.chainId,
          });
          tx = {
            hash,
            chainId: agent.chainId,
            explorerUrl: explorerTx(agent.chainId, hash),
            summary: `${agent.name} · ${decision.action}`,
            status: "submitted",
            source: "viem",
          };
        } else {
          tx = await mockExecute();
        }
      }

      onRan({
        id: runId,
        at: new Date().toISOString(),
        input,
        response,
        decision,
        tx,
        source,
      });
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed.");
    } finally {
      setBusy(false);
    }
  }

  const faucet = faucetUrl(agent.chainId);

  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← All agents
      </button>

      <div className="detail-head" style={{ borderTopColor: t.accent }}>
        <span className="agent-ic lg" style={{ background: `${t.accent}22` }}>
          {t.icon}
        </span>
        <div className="detail-titles">
          <div className="detail-name">{agent.name}</div>
          <div className="detail-sub">
            {t.name} · {chainName(agent.chainId)} ·{" "}
            {auto ? "autonomous" : "suggest"} ·{" "}
            {needsTx ? t.actionLabel : "no transaction"}
          </div>
        </div>
        <div className="detail-actions">
          <button
            className="btn-ghost"
            onClick={() =>
              onUpdate({ status: agent.status === "active" ? "paused" : "active" })
            }
          >
            {agent.status === "active" ? "Pause" : "Activate"}
          </button>
          <button className="btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          {auto && (
            <div className="wallet-box">
              <div className="wallet-box-head">
                <span>🔑 Agent wallet</span>
                <span className="mono small">
                  {agentAddr ? `${agentAddr.slice(0, 10)}…${agentAddr.slice(-6)}` : "key not on this device"}
                </span>
              </div>
              <div className="wallet-box-row">
                <span>Balance: {balance != null ? `${Number(balance).toFixed(4)} ` : "… "}testnet ETH</span>
                {faucet && (
                  <a href={faucet} target="_blank" rel="noreferrer" className="link-btn">
                    Fund from faucet ↗
                  </a>
                )}
              </div>
              <div className="wallet-box-note">
                Key stored in this browser only · testnet · zero-value memo tx.
                {live ? "" : " (Simulated until TX_MODE=live.)"}
              </div>
            </div>
          )}

          <div className="panel-head">
            <h3>Directive</h3>
            {!editing ? (
              <button className="link-btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            ) : (
              <div className="row-gap">
                <button
                  className="link-btn"
                  onClick={() => {
                    onUpdate({ instructions: draft.trim() || agent.instructions });
                    setEditing(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="link-btn muted"
                  onClick={() => {
                    setDraft(agent.instructions);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {editing ? (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} />
          ) : (
            <p className="directive">{agent.instructions}</p>
          )}

          <div className="panel-head" style={{ marginTop: 18 }}>
            <h3>Run the agent</h3>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Give the agent something to judge (a request, a submission, an address…)."
            rows={3}
            disabled={busy || agent.status === "paused"}
          />
          {needsTx && (
            <div className="tx-hint">
              On approval this{" "}
              {!live
                ? "simulates a testnet transaction"
                : auto
                  ? "is signed by the agent's own wallet"
                  : "is signed by your connected wallet"}{" "}
              on {chainName(agent.chainId)}.
              {live && !auto && !isConnected && " Connect a wallet first."}
            </div>
          )}
          <div className="btn-row">
            <button
              className="btn-primary"
              onClick={run}
              disabled={busy || agent.status === "paused"}
            >
              {busy ? "Running consensus…" : "Run agent"}
            </button>
            {agent.status === "paused" && (
              <span className="muted-text">Agent is paused.</span>
            )}
          </div>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Activity</h3>
            <span className="muted-text">{agent.runs.length} runs</span>
          </div>
          {agent.runs.length === 0 ? (
            <div className="empty small">
              No runs yet. Run the agent to see decisions and testnet transactions here.
            </div>
          ) : (
            <ul className="run-list">
              {agent.runs.map((r) => (
                <li key={r.id} className="run-item">
                  <div className="run-top">
                    <DecisionBadge
                      approved={r.decision.approved}
                      confidence={r.decision.confidence}
                      source={r.source}
                    />
                    <span className="run-time">
                      {new Date(r.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="run-input">“{r.input}”</div>
                  <div className="run-response">{r.response}</div>
                  {r.tx && (
                    <div className="run-tx">
                      <span className={`tx-tag ${r.tx.status}`}>{r.tx.status}</span>
                      {r.tx.explorerUrl ? (
                        <a href={r.tx.explorerUrl} target="_blank" rel="noreferrer" className="mono">
                          {r.tx.hash.slice(0, 14)}…
                        </a>
                      ) : (
                        <span className="mono">{r.tx.hash.slice(0, 14)}…</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
