import { createPublicClient, http, type PublicClient } from "viem";

import { getChain } from "@blockchain/shared";

import type { AppConfig } from "./config.js";

/**
 * A viem public client — the read-only half of viem. It can call `view` functions,
 * fetch blocks and pull logs, but it holds no private key and cannot sign anything.
 * A server should never hold a signing key unless it genuinely needs to send transactions.
 */
export function createChainClient(config: AppConfig): PublicClient {
  const chain = getChain(config.CHAIN_ID);

  if (!chain) {
    throw new Error(
      `Unsupported CHAIN_ID ${config.CHAIN_ID}. Supported: 31337 (local Hardhat), 11155111 (Sepolia).`,
    );
  }

  return createPublicClient({
    chain,
    transport: http(config.RPC_URL, {
      // Public RPC endpoints are flaky. Retry a few times before giving up.
      retryCount: 3,
      retryDelay: 250,
    }),
  });
}
