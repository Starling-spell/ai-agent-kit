import type { Mode } from "./types";

// Centralized, server-only configuration. Everything defaults to mock so the
// app boots and deploys with no chain credentials.

function mode(value: string | undefined): Mode {
  return value === "live" ? "live" : "mock";
}

export const config = {
  // GenLayer powers agent AI responses.
  aiMode: mode(process.env.AI_MODE),
  // Testnet transactions (executed client-side via the connected wallet when live).
  txMode: mode(process.env.TX_MODE),

  genlayer: {
    contractAddress: process.env.GENLAYER_CONTRACT_ADDRESS ?? "",
    chain: process.env.GENLAYER_CHAIN ?? "testnetAsimov",
    privateKey: process.env.GENLAYER_PRIVATE_KEY ?? "",
  },
} as const;

/** Generate a plausible-looking 0x tx hash for simulated (mock) transactions. */
export function fakeTxHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
