import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import {
  baseSepolia,
  sepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from "wagmi/chains";

// Browser wallet config — testnet only (for now). Agents execute their approved
// actions through the connected wallet. injected() + EIP-6963 surfaces Rabby /
// MetaMask / Brave; coinbaseWallet() adds Coinbase; walletConnect() appears only
// when a project id is set. Chain list + helpers live in ./chains.

export { chains, defaultChain, chainName, explorerTx } from "./chains";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "GenLayer Agent Studio";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy, sepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName }),
    ...(wcProjectId
      ? [walletConnect({ projectId: wcProjectId, showQrModal: true })]
      : []),
  ],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [sepolia.id]: http(),
  },
});
