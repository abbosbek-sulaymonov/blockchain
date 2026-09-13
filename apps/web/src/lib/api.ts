import type {
  ApiError,
  IndexerStatus,
  LeaderboardRow,
  LearnerProgressDetail,
  MilestoneEvent,
  MilestoneStats,
} from "@blockchain/shared";

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
    // The API answers every failure with { error, message }. Surfacing that message beats
    // showing a bare status code — "Too many requests" is actionable, "429" is not.
    const detail = await response
      .json()
      .then((body: unknown) =>
        typeof body === "object" && body !== null && "message" in body
          ? String((body as ApiError).message)
          : null,
      )
      .catch(() => null);

    throw new Error(detail ?? `Request to ${path} failed with ${response.status}.`);
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

/**
 * One learner's full history.
 *
 * This is aggregate data, so it comes from the indexer rather than the chain: building it
 * client-side would mean a `getLogs` sweep over the contract's whole history per visit.
 * The live "have I completed milestone N" flags still come straight from the contract —
 * see `MilestoneList`.
 */
export function fetchProgress(
  address: string,
  signal?: AbortSignal,
): Promise<LearnerProgressDetail> {
  return getJson<LearnerProgressDetail>(`/api/progress/${address}`, signal);
}

/** How many learners cleared each milestone — shows where people get stuck. */
export function fetchMilestoneStats(signal?: AbortSignal): Promise<MilestoneStats> {
  return getJson<MilestoneStats>("/api/stats/milestones", signal);
}
