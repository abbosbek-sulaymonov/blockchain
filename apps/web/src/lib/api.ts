import type { IndexerStatus, LeaderboardRow, MilestoneEvent } from "@blockchain/shared";

import { env } from "./env";

/**
 * Thin client for the indexer API in `apps/api`.
 *
 * Why an API at all, when the browser can read the chain directly?
 * Because `getLogs` over a wide block range is slow and many public RPCs rate-limit or
 * cap it. Aggregates (leaderboards, history, per-milestone stats) belong off-chain.
 * Live per-user state stays on-chain, read straight from the contract.
 */
async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    signal,
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function fetchStatus(signal?: AbortSignal): Promise<IndexerStatus> {
  return getJson<IndexerStatus>("/api/status", signal);
}

export function fetchLeaderboard(limit = 10, signal?: AbortSignal): Promise<LeaderboardRow[]> {
  return getJson<{ rows: LeaderboardRow[] }>(`/api/leaderboard?limit=${limit}`, signal).then(
    (body) => body.rows,
  );
}

export function fetchRecentEvents(limit = 10, signal?: AbortSignal): Promise<MilestoneEvent[]> {
  return getJson<{ events: MilestoneEvent[] }>(`/api/events?limit=${limit}`, signal).then(
    (body) => body.events,
  );
}
