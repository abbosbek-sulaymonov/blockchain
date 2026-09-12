import { hardhat, sepolia } from "viem/chains";
import type { Chain } from "viem";

/** Chains this project knows how to talk to. */
export const SUPPORTED_CHAINS = [hardhat, sepolia] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

/** Local Hardhat node — `pnpm chain`. */
export const LOCAL_CHAIN_ID = hardhat.id; // 31337
/** Ethereum's long-lived public testnet. */
export const SEPOLIA_CHAIN_ID = sepolia.id; // 11155111

export function getChain(chainId: number): Chain | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return SUPPORTED_CHAINS.some((chain) => chain.id === chainId);
}

/** Human-readable label used in the UI's network banner. */
export function chainLabel(chainId: number): string {
  return getChain(chainId)?.name ?? `Unknown chain (${chainId})`;
}

/** Block explorer link for a transaction, or `undefined` on a local chain. */
export function explorerTxUrl(chainId: number, hash: string): string | undefined {
  const base = getChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : undefined;
}

/** Block explorer link for an address, or `undefined` on a local chain. */
export function explorerAddressUrl(chainId: number, address: string): string | undefined {
  const base = getChain(chainId)?.blockExplorers?.default.url;
  return base ? `${base}/address/${address}` : undefined;
}
