"use client";

export type View = "overview" | "agents";

export function Sidebar({
  view,
  onView,
  agentCount,
  mode,
}: {
  view: View;
  onView: (v: View) => void;
  agentCount: number;
  mode: { ai: string; tx: string } | null;
}) {
  const items: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: "▦" },
    { id: "agents", label: "Agents", icon: "◆", badge: agentCount },
  ];

  return (
    <aside className="sidebar">
      <div className="side-brand">
        <span className="brand-mark">◑</span> Agent Studio
      </div>

      <nav className="side-nav">
        {items.map((it) => (
          <button
            key={it.id}
            className={`side-link ${view === it.id ? "active" : ""}`}
            onClick={() => onView(it.id)}
          >
            <span className="ic">{it.icon}</span>
            <span>{it.label}</span>
            {it.badge != null && <span className="side-badge">{it.badge}</span>}
          </button>
        ))}
        <a
          className="side-link"
          href="https://docs.genlayer.com"
          target="_blank"
          rel="noreferrer"
        >
          <span className="ic">↗</span>
          <span>GenLayer docs</span>
        </a>
      </nav>

      <div className="side-foot">
        <div className="side-mode">
          <span className="dot ai" /> AI: {mode?.ai ?? "…"}
          <span className="dot tx" /> Tx: {mode?.tx ?? "…"}
        </div>
        <div className="side-note">Powered by GenLayer · testnet only</div>
      </div>
    </aside>
  );
}
