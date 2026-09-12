import { progressTrackerAbi, type MilestoneEvent } from "@blockchain/shared";
import type { Address, PublicClient } from "viem";

import type { AppConfig } from "./config.js";
import type { EventStore } from "./store.js";

/** Minimal logger surface so the indexer works with Fastify's logger or `console` in tests. */
export interface IndexerLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface IndexerOptions {
  client: PublicClient;
  store: EventStore;
  config: AppConfig;
  address: Address;
  logger: IndexerLogger;
  /**
   * Blocks to stay behind the head before treating a block as final.
   *
   * Public chains reorg, so 2+ is the cheap defence. A local Hardhat node only mines
   * when you send a transaction, so any value above 0 leaves your newest events
   * permanently "unconfirmed" — use 0 there.
   */
  confirmations: bigint;
}

/**
 * Pulls `MilestoneCompleted` logs into the store, then keeps following the chain head.
 *
 * The shape of every event indexer, in three steps:
 *   1. Backfill: walk from a known start block to the head in bounded ranges.
 *   2. Follow: poll for new blocks and index the gap.
 *   3. Handle reorgs: the head can move backwards; drop what is no longer canonical.
 *
 * `confirmations` is the cheap reorg defence — stay a few blocks behind the head so
 * a one-block reorg never reaches the store in the first place.
 */
export class MilestoneIndexer {
  readonly #client: PublicClient;
  readonly #store: EventStore;
  readonly #config: AppConfig;
  readonly #address: Address;
  readonly #logger: IndexerLogger;
  readonly #confirmations: bigint;

  #timer: NodeJS.Timeout | null = null;
  #running = false;
  #backfilling = false;
  #latestBlock: bigint | null = null;

  constructor({ client, store, config, address, logger, confirmations }: IndexerOptions) {
    this.#client = client;
    this.#store = store;
    this.#config = config;
    this.#address = address;
    this.#logger = logger;
    this.#confirmations = confirmations;
  }

  get isBackfilling(): boolean {
    return this.#backfilling;
  }

  get latestBlock(): bigint | null {
    return this.#latestBlock;
  }

  get address(): Address {
    return this.#address;
  }

  async start(): Promise<void> {
    if (this.#running) {
      return;
    }
    this.#running = true;

    this.#logger.info(`Indexer starting for ProgressTracker at ${this.#address}`);

    try {
      await this.#backfill();
    } catch (error) {
      this.#logger.error(`Backfill failed: ${asMessage(error)}`);
    }

    this.#scheduleNextTick();
  }

  stop(): void {
    this.#running = false;
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  /** Walks from the configured start block to the head in `INDEXER_BATCH_SIZE` chunks. */
  async #backfill(): Promise<void> {
    this.#backfilling = true;

    try {
      const head = await this.#client.getBlockNumber();
      this.#latestBlock = head;

      const safeHead = this.#safeHead(head);

      let cursor = this.#config.INDEXER_START_BLOCK;
      let indexed = 0;

      while (cursor <= safeHead) {
        const toBlock = min(cursor + this.#config.INDEXER_BATCH_SIZE - 1n, safeHead);
        indexed += await this.#indexRange(cursor, toBlock);
        this.#store.setLastIndexedBlock(toBlock);
        cursor = toBlock + 1n;
      }

      this.#logger.info(
        `Backfill complete: ${indexed} event(s) up to block ${safeHead.toString()}`,
      );
    } finally {
      this.#backfilling = false;
    }
  }

  /** One poll: index whatever appeared since the last indexed block. */
  async tick(): Promise<void> {
    const head = await this.#client.getBlockNumber();
    this.#latestBlock = head;

    const safeHead = this.#safeHead(head);
    const lastIndexed = this.#store.lastIndexedBlock;

    if (lastIndexed !== null && safeHead < lastIndexed) {
      // The head moved backwards: a reorg, or a local node that was restarted/reset.
      const dropped = this.#store.rollbackFrom(safeHead + 1n);
      this.#logger.warn(
        `Chain rewound to block ${safeHead.toString()}; dropped ${dropped} event(s)`,
      );
      this.#store.setLastIndexedBlock(safeHead);
      return;
    }

    const fromBlock = lastIndexed === null ? this.#config.INDEXER_START_BLOCK : lastIndexed + 1n;
    if (fromBlock > safeHead) {
      return;
    }

    let cursor = fromBlock;
    while (cursor <= safeHead) {
      const toBlock = min(cursor + this.#config.INDEXER_BATCH_SIZE - 1n, safeHead);
      await this.#indexRange(cursor, toBlock);
      this.#store.setLastIndexedBlock(toBlock);
      cursor = toBlock + 1n;
    }
  }

  /** Fetches and stores the logs in `[fromBlock, toBlock]`. Returns how many were new. */
  async #indexRange(fromBlock: bigint, toBlock: bigint): Promise<number> {
    const logs = await this.#client.getContractEvents({
      address: this.#address,
      abi: progressTrackerAbi,
      eventName: "MilestoneCompleted",
      fromBlock,
      toBlock,
      strict: true,
    });

    let added = 0;
    for (const log of logs) {
      // `strict: true` above guarantees args are fully decoded, so this is safe.
      const event: MilestoneEvent = {
        learner: log.args.learner,
        milestoneId: Number(log.args.milestoneId),
        completedAt: Number(log.args.completedAt),
        blockNumber: log.blockNumber.toString(),
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      };

      if (this.#store.add(event)) {
        added += 1;
      }
    }

    return added;
  }

  /** Highest block considered final. Never negative. */
  #safeHead(head: bigint): bigint {
    return head > this.#confirmations ? head - this.#confirmations : 0n;
  }

  #scheduleNextTick(): void {
    if (!this.#running) {
      return;
    }

    this.#timer = setTimeout(() => {
      void this.tick()
        .catch((error: unknown) => {
          this.#logger.error(`Indexer tick failed: ${asMessage(error)}`);
        })
        .finally(() => {
          this.#scheduleNextTick();
        });
    }, this.#config.INDEXER_POLL_MS);

    // Do not keep the process alive just for the poll timer.
    this.#timer.unref();
  }
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
