"use client";

import { ConnectWallet } from "./ConnectWallet";

export function Topbar({
  title,
  subtitle,
  onNew,
  extra,
}: {
  title: string;
  subtitle?: string;
  onNew?: () => void;
  extra?: React.ReactNode;
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
        {extra}
        <ConnectWallet />
      </div>
    </header>
  );
}
