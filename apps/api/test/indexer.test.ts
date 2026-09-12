import { describe, expect, it, vi } from "vitest";
import type { Address, PublicClient } from "viem";

import { loadConfig } from "../src/config.js";
import { MilestoneIndexer } from "../src/indexer.js";
import { EventStore } from "../src/store.js";

const CONTRACT = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0" as Address;
const LEARNER = "0x1111111111111111111111111111111111111111" as Address;

function log(block: bigint, milestoneId: number, logIndex = 0) {
  return {
    args: { learner: LEARNER, milestoneId, completedAt: 1_700_000_000n + block },
    blockNumber: block,
    logIndex,
    transactionHash: `0x${block.toString(16).padStart(64, "0")}`,
  };
}

/** A PublicClient stub: just the two methods the indexer actually calls. */
function stubClient(head: bigint, logsByRange: (from: bigint, to: bigint) => unknown[]) {
  return {
    getBlockNumber: vi.fn(async () => head),
    getContractEvents: vi.fn(
      async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) =>
        logsByRange(fromBlock, toBlock),
    ),
  } as unknown as PublicClient;
}

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

function buildIndexer(client: PublicClient, store: EventStore, confirmations: bigint) {
  return new MilestoneIndexer({
    client,
    store,
    config: loadConfig({ NODE_ENV: "test", INDEXER_BATCH_SIZE: "5" }),
    address: CONTRACT,
    logger: silentLogger,
    confirmations,
  });
}

describe("MilestoneIndexer", () => {
  it("indexes up to the head when confirmations are 0", async () => {
    const store = new EventStore();
    const client = stubClient(10n, (from, to) =>
      [log(3n, 0), log(9n, 1)].filter((l) => l.blockNumber >= from && l.blockNumber <= to),
    );

    await buildIndexer(client, store, 0n).tick();

    expect(store.eventCount).toBe(2);
    expect(store.lastIndexedBlock).toBe(10n);
  });

  it("holds back the last N blocks when confirmations are set", async () => {
    const store = new EventStore();
    const client = stubClient(10n, (from, to) =>
      [log(3n, 0), log(9n, 1)].filter((l) => l.blockNumber >= from && l.blockNumber <= to),
    );

    await buildIndexer(client, store, 2n).tick();

    // Block 9 is inside the unconfirmed window, so its event is deliberately not indexed yet.
    expect(store.eventCount).toBe(1);
    expect(store.lastIndexedBlock).toBe(8n);
  });

  it("walks the chain in INDEXER_BATCH_SIZE ranges", async () => {
    const store = new EventStore();
    const client = stubClient(12n, () => []);

    await buildIndexer(client, store, 0n).tick();

    // 13 blocks (0..12) in batches of 5 => 3 getLogs calls.
    expect(client.getContractEvents).toHaveBeenCalledTimes(3);
  });

  it("drops events that a reorg removed", async () => {
    const store = new EventStore();
    store.add({
      learner: LEARNER,
      milestoneId: 0,
      completedAt: 1,
      blockNumber: "9",
      transactionHash: "0x00",
      logIndex: 0,
    });
    store.setLastIndexedBlock(9n);

    // The chain rewound: the head is now lower than what we already indexed.
    const client = stubClient(4n, () => []);
    await buildIndexer(client, store, 0n).tick();

    expect(store.eventCount).toBe(0);
    expect(store.lastIndexedBlock).toBe(4n);
  });
});
