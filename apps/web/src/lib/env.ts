import { LOCAL_CHAIN_ID } from "@blockchain/shared";

/**
 * Browser-visible configuration.
 *
 * `NEXT_PUBLIC_*` variables are inlined into the JavaScript bundle at build time.
 * Anyone can read them in devtools — so a private key or an API secret must NEVER
 * live behind this prefix. Addresses and RPC URLs are public information; keys are not.
 */
export const env = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? LOCAL_CHAIN_ID),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000",
  progressTrackerAddress: process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS,
  learnTokenAddress: process.env.NEXT_PUBLIC_LEARN_TOKEN_ADDRESS,
} as const;
