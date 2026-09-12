/**
 * The 12 roadmap milestones, mirrored on-chain by `ProgressTracker.TOTAL_MILESTONES`.
 *
 * The `id` is the on-chain milestone index — changing it changes the meaning of every
 * bit already written to the blockchain. Append, never renumber.
 */
export interface Milestone {
  /** On-chain milestone index, 0-based. Must match the array position. */
  readonly id: number;
  /** Which roadmap phase this milestone belongs to. */
  readonly phase: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly summary: string;
  /** Rough hands-on time for someone new to Web3. */
  readonly estimatedHours: number;
  /** Path to the deep-dive doc, relative to the repo root. */
  readonly docPath: string;
}

export const MILESTONES = [
  {
    id: 0,
    phase: 1,
    title: "Run the stack locally",
    summary: "Clone, install, start a local chain, deploy, and load the dApp in a browser.",
    estimatedHours: 2,
    docPath: "docs/01-getting-started.md",
  },
  {
    id: 1,
    phase: 1,
    title: "Read a block",
    summary:
      "Use viem to fetch a block, a balance and a transaction receipt. Learn what an RPC call actually is.",
    estimatedHours: 3,
    docPath: "docs/03-ethereum-fundamentals.md",
  },
  {
    id: 2,
    phase: 1,
    title: "Keys, accounts and signatures",
    summary:
      "Derive an address from a private key, sign a message off-chain, verify the signature.",
    estimatedHours: 4,
    docPath: "docs/03-ethereum-fundamentals.md",
  },
  {
    id: 3,
    phase: 2,
    title: "Write and test Greeter.sol",
    summary: "Storage, events, custom errors, and a passing Hardhat test you wrote yourself.",
    estimatedHours: 5,
    docPath: "docs/04-solidity.md",
  },
  {
    id: 4,
    phase: 2,
    title: "Ship an ERC-20",
    summary: "Extend LearnToken: add a cap, a burn function, and tests that prove both work.",
    estimatedHours: 6,
    docPath: "docs/04-solidity.md",
  },
  {
    id: 5,
    phase: 2,
    title: "Gas and storage layout",
    summary:
      "Measure gas for a mapping vs a bitmap. Explain in writing why ProgressTracker uses a bitmap.",
    estimatedHours: 4,
    docPath: "docs/04-solidity.md",
  },
  {
    id: 6,
    phase: 2,
    title: "Deploy to a public testnet",
    summary: "Fund a throwaway wallet, deploy to Sepolia, verify the source on Etherscan.",
    estimatedHours: 3,
    docPath: "docs/05-deploying.md",
  },
  {
    id: 7,
    phase: 3,
    title: "Connect a wallet",
    summary: "Wire wagmi connectors, handle the disconnected and wrong-network states.",
    estimatedHours: 5,
    docPath: "docs/06-frontend-dapp.md",
  },
  {
    id: 8,
    phase: 3,
    title: "Read contract state in React",
    summary: "useReadContract with typed ABIs, loading states, and cache invalidation.",
    estimatedHours: 5,
    docPath: "docs/06-frontend-dapp.md",
  },
  {
    id: 9,
    phase: 3,
    title: "Send a transaction from the UI",
    summary: "Simulate, write, wait for the receipt, and show every failure mode a user can hit.",
    estimatedHours: 6,
    docPath: "docs/06-frontend-dapp.md",
  },
  {
    id: 10,
    phase: 4,
    title: "Index events off-chain",
    summary:
      "Backfill historical logs, follow new ones, survive a restart, expose them over a REST API.",
    estimatedHours: 8,
    docPath: "docs/07-indexing-backend.md",
  },
  {
    id: 11,
    phase: 4,
    title: "Security pass",
    summary:
      "Work the checklist: reentrancy, access control, integer edges, oracle and key handling.",
    estimatedHours: 8,
    docPath: "docs/08-security.md",
  },
] as const satisfies readonly Milestone[];

export const TOTAL_MILESTONES = MILESTONES.length;

export function getMilestone(id: number): Milestone | undefined {
  return MILESTONES.find((milestone) => milestone.id === id);
}

/** Decode the on-chain bitmap returned by `ProgressTracker.completedBitmap`. */
export function decodeBitmap(bitmap: bigint): boolean[] {
  return MILESTONES.map((milestone) => (bitmap >> BigInt(milestone.id)) % 2n === 1n);
}

/** Count set bits in an on-chain completion bitmap. */
export function countCompleted(bitmap: bigint): number {
  return decodeBitmap(bitmap).filter(Boolean).length;
}
