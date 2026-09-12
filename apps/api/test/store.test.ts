import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";

import { EventStore } from "../src/store.js";

const LEARNER = "0x1111111111111111111111111111111111111111" as Address;

function event(milestoneId: number, block: number, logIndex = 0) {
  return {
    learner: LEARNER,
    milestoneId,
    completedAt: 1_700_000_000 + block,
    blockNumber: String(block),
    transactionHash: `0x${block.toString(16).padStart(64, "0")}` as Hex,
    logIndex,
  };
}

describe("EventStore", () => {
  it("ignores a log it has already indexed", () => {
    const store = new EventStore();

    expect(store.add(event(0, 10))).toBe(true);
    expect(store.add(event(0, 10))).toBe(false);
    expect(store.eventCount).toBe(1);
  });

  it("treats same-block logs at different indexes as distinct", () => {
    const store = new EventStore();

    store.add(event(0, 10, 0));
    store.add(event(1, 10, 1));

    expect(store.eventCount).toBe(2);
  });

  it("drops reorged events on rollback", () => {
    const store = new EventStore();
    store.add(event(0, 10));
    store.add(event(1, 20));
    store.add(event(2, 30));

    expect(store.rollbackFrom(20n)).toBe(2);
    expect(store.eventCount).toBe(1);
    expect(store.progressFor(LEARNER).completedIds).toEqual([0]);
  });

  it("re-accepts a log that was rolled back", () => {
    const store = new EventStore();
    store.add(event(0, 10));
    store.rollbackFrom(10n);

    expect(store.eventCount).toBe(0);
    expect(store.add(event(0, 10))).toBe(true);
  });

  it("computes percentComplete against the on-chain total", () => {
    const store = new EventStore();
    for (let id = 0; id < 6; id += 1) {
      store.add(event(id, 10 + id));
    }

    const progress = store.progressFor(LEARNER);
    expect(progress.completedCount).toBe(6);
    expect(progress.totalMilestones).toBe(12);
    expect(progress.percentComplete).toBe(50);
  });

  it("reports an unknown learner as empty rather than throwing", () => {
    const progress = new EventStore().progressFor(LEARNER);

    expect(progress.completedIds).toEqual([]);
    expect(progress.firstSeenAt).toBeNull();
    expect(progress.percentComplete).toBe(0);
  });
});
