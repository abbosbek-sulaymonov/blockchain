import {
  MILESTONES,
  TOTAL_MILESTONES,
  type IndexerStatus,
  type LearnerProgressDetail,
  type MilestoneStats,
} from "@blockchain/shared";
import type { FastifyInstance } from "fastify";
import { isAddress, type Address } from "viem";
import { z } from "zod";

import type { MilestoneIndexer } from "../indexer.js";
import type { EventStore } from "../store.js";
import type { AppConfig } from "../config.js";

export interface RouteContext {
  store: EventStore;
  config: AppConfig;
  indexer: MilestoneIndexer | null;
  startedAt: Date;
}

const addressParam = z.object({
  address: z.string().refine(isAddress, "not a valid EVM address"),
});

const limitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

/**
 * All HTTP routes. Registered as a Fastify plugin so tests can build an app
 * with a hand-seeded store and no live chain connection.
 */
export async function registerRoutes(app: FastifyInstance, context: RouteContext): Promise<void> {
  const { store, config, indexer, startedAt } = context;

  /** Liveness probe. Says nothing about the chain — only that the process is up. */
  app.get("/health", async () => ({ status: "ok", uptimeSeconds: process.uptime() }));

  /** What the indexer is doing right now. The first thing to check when the UI looks stale. */
  app.get("/api/status", async (): Promise<IndexerStatus> => ({
    chainId: config.CHAIN_ID,
    contractAddress: indexer?.address ?? null,
    lastIndexedBlock: store.lastIndexedBlock?.toString() ?? null,
    latestBlock: indexer?.latestBlock?.toString() ?? null,
    eventsIndexed: store.eventCount,
    learnersIndexed: store.learnerCount,
    isBackfilling: indexer?.isBackfilling ?? false,
    startedAt: startedAt.toISOString(),
  }));

  /** The roadmap itself, so the frontend never hardcodes milestone copy. */
  app.get("/api/milestones", async () => ({
    total: TOTAL_MILESTONES,
    milestones: MILESTONES,
  }));

  /** Recent completions across everyone — the activity feed. */
  app.get("/api/events", async (request) => {
    const { limit } = limitQuery.parse(request.query);
    return { events: store.recentEvents(limit) };
  });

  /** One learner's progress, aggregated from their events. */
  app.get("/api/progress/:address", async (request, reply) => {
    const parsed = addressParam.safeParse(request.params);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "InvalidAddress",
        message: parsed.error.issues[0]?.message ?? "Invalid address",
      });
    }

    const address = parsed.data.address as Address;
    const detail: LearnerProgressDetail = {
      ...store.progressFor(address),
      events: store.eventsFor(address),
    };

    return detail;
  });

  /** Who has completed the most milestones. */
  app.get("/api/leaderboard", async (request) => {
    const { limit } = limitQuery.parse(request.query);
    return { rows: store.leaderboard(limit) };
  });

  /** Completions per milestone — shows which step people get stuck on. */
  app.get("/api/stats/milestones", async (): Promise<MilestoneStats> => ({
    stats: store.completionsByMilestone(),
    learners: store.learnerCount,
  }));
}
