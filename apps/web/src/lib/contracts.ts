import { getContractAddress, learnTokenAbi, progressTrackerAbi } from "@blockchain/shared";
import type { Address } from "viem";

import { env } from "./env";

/**
 * Resolves deployed addresses for the chain the user is currently connected to.
 *
 * Returns `undefined` rather than throwing when nothing is deployed — a fresh clone
 * has no deployment, and the UI should say so instead of crashing.
 */
export function progressTrackerAddress(chainId: number): Address | undefined {
  return getContractAddress(chainId, "ProgressTracker", env.progressTrackerAddress);
}

export function learnTokenAddress(chainId: number): Address | undefined {
  return getContractAddress(chainId, "LearnToken", env.learnTokenAddress);
}

export { learnTokenAbi, progressTrackerAbi };
