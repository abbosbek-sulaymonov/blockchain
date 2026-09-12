import type { Address, Hex } from "viem";

/** One `MilestoneCompleted` log, flattened into the shape the API returns. */
export interface MilestoneEvent {
  learner: Address;
  milestoneId: number;
  /** Unix seconds, taken from the contract's `block.timestamp`. */
  completedAt: number;
  blockNumber: string;
  transactionHash: Hex;
  /** Position of the log inside the block. With blockNumber it uniquely identifies a log. */
  logIndex: number;
}

/** A learner's aggregated progress, as served by `GET /api/progress/:address`. */
export interface LearnerProgress {
  learner: Address;
  completedIds: number[];
  completedCount: number;
  totalMilestones: number;
  percentComplete: number;
  firstSeenAt: number | null;
  lastActivityAt: number | null;
}

/** One row of `GET /api/leaderboard`. */
export interface LeaderboardRow {
  rank: number;
  learner: Address;
  completedCount: number;
  lastActivityAt: number;
}

/** `GET /api/status` — what the indexer is doing right now. */
export interface IndexerStatus {
  chainId: number;
  contractAddress: Address | null;
  /** Last block the indexer has fully processed. */
  lastIndexedBlock: string | null;
  /** Chain head as of the last poll. */
  latestBlock: string | null;
  eventsIndexed: number;
  learnersIndexed: number;
  isBackfilling: boolean;
  startedAt: string;
}

/** Uniform error body for every non-2xx API response. */
export interface ApiError {
  error: string;
  message: string;
}
