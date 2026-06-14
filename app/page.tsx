"use client";

import { useEffect, useState } from "react";
import type { Job, Settlement, Verdict } from "@/lib/types";

interface Health {
  adjudicator: "mock" | "live";
  settlement: "mock" | "live";
  feeBps: number;
}

const EXAMPLE = {
  title: "Landing page copy + hero section",
  spec: "Deliver responsive hero section with headline, subheadline, and a working call-to-action button. Must include mobile layout and accessible alt text for images.",
  budget: "500",
  freelancer: "0xF1eeLancer000000000000000000000000000abc",
  client: "0xC11e0000000000000000000000000000000000de",
};

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [form, setForm] = useState({
    title: "",
    spec: "",
    budget: "",
    freelancer: "",
    client: "",
  });
  const [deliverable, setDeliverable] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState<null | "open" | "adjudicate">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  function loadExample() {
    setForm(EXAMPLE);
  }

  function reset() {
    setJob(null);
    setDeliverable("");
    setError(null);
  }

  async function openEscrow(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const budgetUsdc = Number(form.budget);
    if (!form.title || !form.spec || !budgetUsdc) {
      setError("Title, acceptance criteria and a budget are required.");
      return;
    }
    setBusy("open");
    const id = crypto.randomUUID();
    try {
      const res = await fetch("/api/escrow/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, budgetUsdc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open escrow.");
      setJob({
        id,
        title: form.title,
        spec: form.spec,
        budgetUsdc,
        client: form.client || "client",
        freelancer: form.freelancer || "freelancer",
        status: "funded",
        escrowId: data.escrowId,
        fundingTxHash: data.txHash,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open escrow.");
    } finally {
      setBusy(null);
    }
  }

  async function submitAndSettle() {
    if (!job) return;
    if (deliverable.trim().length === 0) {
      setError("Add a deliverable to submit for adjudication.");
      return;
    }
    setError(null);
    setBusy("adjudicate");
    setJob({ ...job, deliverable, status: "adjudicating" });

    try {
      // Step 2 — GenLayer adjudication.
      const aRes = await fetch("/api/adjudicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          spec: job.spec,
          deliverable,
        }),
      });
      const aData = await aRes.json();
      if (!aRes.ok) throw new Error(aData.error ?? "Adjudication failed.");
      const verdict: Verdict = aData.verdict;

      // Step 3 — Arc settlement based on the verdict.
      const sRes = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrowId: job.escrowId,
          meetsSpec: verdict.meetsSpec,
          budgetUsdc: job.budgetUsdc,
          freelancer: job.freelancer,
          client: job.client,
        }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) throw new Error(sData.error ?? "Settlement failed.");
      const settlement: Settlement = sData.settlement;

      setJob({
        ...job,
        deliverable,
        verdict,
        settlement,
        status: verdict.meetsSpec ? "settled" : "rejected",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something failed.");
      setJob({ ...job, deliverable, status: "submitted" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="wrap">
      <header className="hero">
        <h1>GenLayer × Arc — Agent Kit</h1>
        <p>
          A freelance-escrow agent. <strong>Arc</strong> locks the budget in
          USDC, <strong>GenLayer</strong> adjudicates whether the deliverable
          meets the natural-language spec, and Arc settles the result — release
          to the freelancer or refund the client, minus a platform fee.
        </p>
        <div className="legend">
          <span>
            <i className="dot" style={{ background: "var(--gen)" }} /> GenLayer —
            the AI brain
          </span>
          <span>
            <i className="dot" style={{ background: "var(--arc)" }} /> Arc — the
            USDC rails
          </span>
          <span>
            <i className="dot" style={{ background: "var(--hub)" }} /> Vercel —
            orchestrator
          </span>
        </div>
      </header>

      <div className="mode-banner">
        {health ? (
          <>
            <span>
              Adjudication:{" "}
              <strong style={{ color: "var(--text)" }}>
                {health.adjudicator}
              </strong>
            </span>
            <span>·</span>
            <span>
              Settlement:{" "}
              <strong style={{ color: "var(--text)" }}>
                {health.settlement}
              </strong>
            </span>
            <span>·</span>
            <span>Platform fee: {(health.feeBps / 100).toFixed(2)}%</span>
            {health.adjudicator === "mock" && (
              <span style={{ marginLeft: "auto" }}>
                Running simulated — set live mode in .env to use real chains.
              </span>
            )}
          </>
        ) : (
          <span>Loading status…</span>
        )}
      </div>

      <div className="grid">
        {/* ----- Input ----- */}
        <div className="card">
          <h2>
            <span className="badge arc">Arc</span> Create &amp; fund job
          </h2>
          <form onSubmit={openEscrow}>
            <label>Job title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs doing?"
              disabled={!!job}
            />

            <label>Acceptance criteria (GenLayer judges this)</label>
            <textarea
              value={form.spec}
              onChange={(e) => setForm({ ...form, spec: e.target.value })}
              placeholder="Describe, in plain language, what 'done' means."
              disabled={!!job}
            />

            <div className="row">
              <div>
                <label>Budget (USDC)</label>
                <input
                  type="number"
                  min="1"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="500"
                  disabled={!!job}
                />
              </div>
              <div>
                <label>Freelancer address</label>
                <input
                  value={form.freelancer}
                  onChange={(e) =>
                    setForm({ ...form, freelancer: e.target.value })
                  }
                  placeholder="0x…"
                  disabled={!!job}
                />
              </div>
            </div>

            <div className="btn-row">
              {!job ? (
                <>
                  <button className="btn-arc" type="submit" disabled={busy === "open"}>
                    {busy === "open" ? "Funding escrow…" : "Create & fund escrow"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={loadExample}
                  >
                    Load example
                  </button>
                </>
              ) : (
                <button type="button" className="btn-ghost" onClick={reset}>
                  Start over
                </button>
              )}
            </div>
          </form>

          {job && job.status !== "settled" && job.status !== "rejected" && (
            <>
              <label>Freelancer&apos;s deliverable</label>
              <textarea
                value={deliverable}
                onChange={(e) => setDeliverable(e.target.value)}
                placeholder="Paste the work / a description of what was delivered."
                disabled={busy === "adjudicate"}
              />
              <div className="btn-row">
                <button
                  className="btn-gen"
                  onClick={submitAndSettle}
                  disabled={busy === "adjudicate"}
                >
                  {busy === "adjudicate"
                    ? "Adjudicating & settling…"
                    : "Submit → adjudicate → settle"}
                </button>
              </div>
            </>
          )}

          {error && <div className="error">{error}</div>}
        </div>

        {/* ----- Lifecycle ----- */}
        <div className="card">
          <h2>Lifecycle</h2>
          {!job ? (
            <div className="empty">
              Create a job to start the escrow → adjudication → settlement flow.
            </div>
          ) : (
            <ul className="timeline">
              <Step
                n="1"
                done
                title="Escrow funded · Arc"
                detail={
                  <>
                    {job.budgetUsdc} USDC locked · escrow{" "}
                    <span className="mono">{job.escrowId}</span>
                    <br />
                    <span className="mono">tx {job.fundingTxHash}</span>
                  </>
                }
              />
              <Step
                n="2"
                done={!!job.deliverable}
                title="Deliverable submitted"
                detail={
                  job.deliverable
                    ? job.deliverable.slice(0, 160) +
                      (job.deliverable.length > 160 ? "…" : "")
                    : "Waiting for the freelancer to submit."
                }
              />
              <Step
                n="3"
                done={!!job.verdict}
                title="Adjudication · GenLayer"
                detail={
                  job.status === "adjudicating" ? (
                    "Validators reaching consensus…"
                  ) : job.verdict ? (
                    <div
                      className={`verdict ${
                        job.verdict.meetsSpec ? "pass" : "fail"
                      }`}
                    >
                      <div className="head">
                        <span>
                          {job.verdict.meetsSpec
                            ? "✓ Meets spec"
                            : "✗ Does not meet spec"}
                        </span>
                        <span className="badge gen">
                          {job.verdict.confidence}% · {job.verdict.source}
                        </span>
                      </div>
                      <div className="reason">{job.verdict.reasoning}</div>
                    </div>
                  ) : (
                    "Pending."
                  )
                }
              />
              <Step
                n="4"
                done={!!job.settlement}
                title="Settlement · Arc"
                detail={
                  job.settlement ? (
                    <>
                      <div className="kv">
                        <span>Action</span>
                        <span>{job.settlement.action}</span>
                      </div>
                      <div className="kv">
                        <span>Recipient</span>
                        <span className="mono">{job.settlement.recipient}</span>
                      </div>
                      <div className="kv">
                        <span>Amount</span>
                        <span>{job.settlement.amountUsdc} USDC</span>
                      </div>
                      <div className="kv">
                        <span>Platform fee</span>
                        <span>{job.settlement.feeUsdc} USDC</span>
                      </div>
                      <div className="kv">
                        <span>Tx</span>
                        <span className="mono">{job.settlement.txHash}</span>
                      </div>
                    </>
                  ) : (
                    "Pending verdict."
                  )
                }
              />
            </ul>
          )}
        </div>
      </div>

      <footer className="foot">
        GenLayer adjudication · Arc settlement · orchestrated on Vercel. Mock
        mode is simulated — see the README to wire real chains.
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  detail,
  done,
}: {
  n: string;
  title: string;
  detail: React.ReactNode;
  done?: boolean;
}) {
  return (
    <li className={`step ${done ? "done" : ""}`}>
      <div className="marker">{done ? "✓" : n}</div>
      <div className="body">
        <div className="t">{title}</div>
        <div className="d">{detail}</div>
      </div>
    </li>
  );
}
