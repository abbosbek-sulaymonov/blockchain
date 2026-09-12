import type { Address } from "viem";

import deployments from "./generated/deployments.json" with { type: "json" };

export interface DeploymentRecord {
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: {
    Greeter: string;
    LearnToken: string;
    ProgressTracker: string;
  };
}

export type ContractName = keyof DeploymentRecord["contracts"];

const DEPLOYMENTS = deployments as Record<string, DeploymentRecord>;

/** Everything `scripts/deploy.ts` recorded for a chain, or `undefined` if never deployed there. */
export function getDeployment(chainId: number): DeploymentRecord | undefined {
  return DEPLOYMENTS[String(chainId)];
}

/**
 * Address of a deployed contract.
 *
 * Resolution order: an explicit override (an env var) wins, then the committed
 * deployments file. Returns `undefined` when the contract is not deployed on that chain —
 * callers must handle that, because it is the normal state on a fresh clone.
 */
export function getContractAddress(
  chainId: number,
  name: ContractName,
  override?: string,
): Address | undefined {
  if (override && override.startsWith("0x") && override.length === 42) {
    return override as Address;
  }
  const address = getDeployment(chainId)?.contracts[name];
  return address ? (address as Address) : undefined;
}

/** Same as `getContractAddress`, but throws instead of returning `undefined`. */
export function requireContractAddress(
  chainId: number,
  name: ContractName,
  override?: string,
): Address {
  const address = getContractAddress(chainId, name, override);
  if (!address) {
    throw new Error(
      `${name} is not deployed on chain ${chainId}. ` +
        `Run \`pnpm deploy:local\` (or set the address in your .env) and try again.`,
    );
  }
  return address;
}
