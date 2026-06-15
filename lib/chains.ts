import {
  baseSepolia,
  sepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from "viem/chains";

// Pure chain data + helpers — safe to import from server routes (no wallet
// connectors here, unlike lib/wagmi.ts which builds the browser config).

export const chains = [
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia,
] as const;

const defaultId = Number(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? baseSepolia.id,
);
export const defaultChain =
  chains.find((c) => c.id === defaultId) ?? baseSepolia;

export function chainName(chainId: number): string {
  return chains.find((c) => c.id === chainId)?.name ?? `chain ${chainId}`;
}

export function explorerTx(chainId: number, hash: string): string {
  const base = chains.find((c) => c.id === chainId)?.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : "";
}
