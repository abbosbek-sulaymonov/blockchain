import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { env } from "./env";

/**
 * wagmi configuration — the bridge between React and the chain.
 *
 * Two transports are declared so the app keeps working when the user switches networks
 * in their wallet. `injected()` covers any EIP-1193 browser wallet (MetaMask, Rabby,
 * Brave, Coinbase extension). Adding WalletConnect later means adding one more connector
 * here and nothing else.
 *
 * `ssr: true` matters in the App Router: without it, wagmi tries to read `window`
 * during server rendering and the page crashes on first load.
 */
export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(env.rpcUrl),
    [sepolia.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
