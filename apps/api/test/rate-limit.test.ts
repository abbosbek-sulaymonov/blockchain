import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { loadConfig } from "../src/config.js";
import { buildServer } from "../src/server.js";
import { EventStore } from "../src/store.js";

describe("rate limiting", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = loadConfig({
      NODE_ENV: "test",
      INDEXER_ENABLED: "false",
      RATE_LIMIT_MAX: "3",
      RATE_LIMIT_WINDOW_MS: "60000",
    });
    app = await buildServer({ config, store: new EventStore() });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves up to the limit, then answers 429", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({ method: "GET", url: "/api/milestones" });
      expect(response.statusCode).toBe(200);
    }

    const blocked = await app.inject({ method: "GET", url: "/api/milestones" });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toMatchObject({ error: "RateLimited" });
  });

  it("never limits /health, so a load balancer probe cannot trip it", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
    }
  });
});
