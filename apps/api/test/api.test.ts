import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Address, Hex } from "viem";

import { loadConfig } from "../src/config.js";
import { buildServer } from "../src/server.js";
import { EventStore } from "../src/store.js";

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;

function event(learner: Address, milestoneId: number, block: number, logIndex = 0) {
  return {
    learner,
    milestoneId,
    completedAt: 1_700_000_000 + block,
    blockNumber: String(block),
    transactionHash: `0x${block.toString(16).padStart(64, "0")}` as Hex,
    logIndex,
  };
}

describe("API", () => {
  let app: FastifyInstance;
  let store: EventStore;

  beforeAll(async () => {
    store = new EventStore();
    store.add(event(ALICE, 0, 10));
    store.add(event(ALICE, 1, 11));
    store.add(event(ALICE, 2, 12));
    store.add(event(BOB, 0, 13));
    store.setLastIndexedBlock(13n);

    const config = loadConfig({ NODE_ENV: "test", INDEXER_ENABLED: "false" });
    app = await buildServer({ config, store });
    await app.ready();
  });

  it("answers the health probe", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });
  });

  it("reports indexer status", async () => {
    const response = await app.inject({ method: "GET", url: "/api/status" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      eventsIndexed: 4,
      learnersIndexed: 2,
      lastIndexedBlock: "13",
      isBackfilling: false,
    });
  });

  it("serves the 12 milestones", async () => {
    const response = await app.inject({ method: "GET", url: "/api/milestones" });
    const body = response.json();

    expect(body.total).toBe(12);
    expect(body.milestones).toHaveLength(12);
    expect(body.milestones[0]).toMatchObject({ id: 0, phase: 1 });
  });

  it("aggregates one learner's progress", async () => {
    const response = await app.inject({ method: "GET", url: `/api/progress/${ALICE}` });
    const body = response.json();

    expect(body.completedIds).toEqual([0, 1, 2]);
    expect(body.completedCount).toBe(3);
    expect(body.percentComplete).toBe(25);
    expect(body.events).toHaveLength(3);
  });

  it("rejects a malformed address with 400", async () => {
    const response = await app.inject({ method: "GET", url: "/api/progress/not-an-address" });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("InvalidAddress");
  });

  it("ranks the leaderboard by completions", async () => {
    const response = await app.inject({ method: "GET", url: "/api/leaderboard" });
    const rows = response.json().rows;

    expect(rows[0]).toMatchObject({ rank: 1, completedCount: 3 });
    expect(rows[1]).toMatchObject({ rank: 2, completedCount: 1 });
  });

  it("returns recent events newest first and honours ?limit", async () => {
    const response = await app.inject({ method: "GET", url: "/api/events?limit=2" });
    const events = response.json().events;

    expect(events).toHaveLength(2);
    expect(events[0].blockNumber).toBe("13");
    expect(events[1].blockNumber).toBe("12");
  });

  it("404s an unknown route with a JSON body", async () => {
    const response = await app.inject({ method: "GET", url: "/api/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("NotFound");
  });
});
