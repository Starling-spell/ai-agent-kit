"use client";

// Client helpers for Sign-In With Ethereum. The user signs a nonce-bound
// message; the server verifies it and sets a session cookie that /api/store
// trusts as the agent owner (so the KV store is not spoofable by address).

export async function getSession(): Promise<string | null> {
  try {
    const r = await fetch("/api/siwe/session");
    const { address } = await r.json();
    return address ?? null;
  } catch {
    return null;
  }
}

export async function signIn(
  address: string,
  chainId: number,
  signMessageAsync: (args: { message: string }) => Promise<string>,
): Promise<string> {
  const nonceRes = await fetch("/api/siwe/nonce");
  const { nonce } = await nonceRes.json();

  const domain = typeof window !== "undefined" ? window.location.host : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const issuedAt = new Date().toISOString();
  const message =
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n\n` +
    `Sign in to GenLayer Agent Studio to sync your agents across devices.\n\n` +
    `URI: ${origin}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}`;

  const signature = await signMessageAsync({ message });

  const res = await fetch("/api/siwe/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, message, signature }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Sign-in failed.");
  }
  const { address: a } = await res.json();
  return a;
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/siwe/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
}
