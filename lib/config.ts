import type { Mode } from "./types";

// Centralized, server-only configuration read from environment variables.
// Everything has a safe default so the app boots in mock mode with no setup.

function mode(value: string | undefined): Mode {
  return value === "live" ? "live" : "mock";
}

export const config = {
  adjudicatorMode: mode(process.env.ADJUDICATOR_MODE),
  settlementMode: mode(process.env.SETTLEMENT_MODE),

  // Arc monetization: fee taken from a successful release.
  feeBps: Number(process.env.PLATFORM_FEE_BPS ?? "250"),
  feeRecipient:
    process.env.PLATFORM_FEE_RECIPIENT ??
    "0x0000000000000000000000000000000000000000",

  genlayer: {
    contractAddress: process.env.GENLAYER_CONTRACT_ADDRESS ?? "",
    chain: process.env.GENLAYER_CHAIN ?? "testnetAsimov",
    privateKey: process.env.GENLAYER_PRIVATE_KEY ?? "",
  },

  arc: {
    rpcUrl: process.env.ARC_RPC_URL ?? "",
    usdcAddress: process.env.ARC_USDC_ADDRESS ?? "",
    operatorPrivateKey: process.env.ARC_OPERATOR_PRIVATE_KEY ?? "",
  },
} as const;

/** Round to cents so USDC amounts stay clean. */
export function usd(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Generate a plausible-looking 0x tx hash for mock settlements. */
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
