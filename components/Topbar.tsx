"use client";

import { ConnectWallet } from "./ConnectWallet";

export function Topbar({
  title,
  subtitle,
  onNew,
}: {
  title: string;
  subtitle?: string;
  onNew?: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        {onNew && (
          <button className="btn-primary" onClick={onNew}>
            + New agent
          </button>
        )}
        <ConnectWallet />
      </div>
    </header>
  );
}
