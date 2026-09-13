import {
  MILESTONES,
  TOTAL_MILESTONES,
  type LeaderboardRow,
  type LearnerProgress,
  type MilestoneCompletionStat,
  type MilestoneEvent,
} from "@blockchain/shared";
import type { Address } from "viem";

/**
 * In-memory index of every `MilestoneCompleted` event seen so far.
 *
 * Deliberately not a database. Swapping this class for Postgres or SQLite is
 * milestone 10's stretch goal — the route handlers only ever touch this interface,
 * so the swap is contained to one file.
 *
 * Restarting the process loses the index, and the indexer backfills from
 * `INDEXER_START_BLOCK` again. That is correct, just slow on a busy chain.
 */
export class EventStore {
  /** Every event, kept in chain order. */
  readonly #events: MilestoneEvent[] = [];
  /** Dedupe key `${blockNumber}:${logIndex}` — reorgs and overlapping ranges re-deliver logs. */
  readonly #seen = new Set<string>();
  /** learner (lowercased) -> set of completed milestone ids. */
  readonly #byLearner = new Map<string, Set<number>>();

  #lastIndexedBlock: bigint | null = null;

  /**
   * Records an event. Returns `false` if this exact log was already indexed,
   * which is normal: block ranges overlap and reorged blocks get replayed.
   */
  add(event: MilestoneEvent): boolean {
    const key = `${event.blockNumber}:${event.logIndex}`;
    if (this.#seen.has(key)) {
      return false;
    }

    this.#seen.add(key);
    this.#events.push(event);

    const learner = event.learner.toLowerCase();
    const completed = this.#byLearner.get(learner) ?? new Set<number>();
    completed.add(event.milestoneId);
    this.#byLearner.set(learner, completed);

    return true;
  }

  /** Drops everything at or above `blockNumber`. Call this when a reorg is detected. */
  rollbackFrom(blockNumber: bigint): number {
    const keep = this.#events.filter((event) => BigInt(event.blockNumber) < blockNumber);
    const dropped = this.#events.length - keep.length;

    if (dropped === 0) {
      return 0;
    }

    this.#events.length = 0;
    this.#seen.clear();
    this.#byLearner.clear();
    for (const event of keep) {
      this.add(event);
    }

    return dropped;
  }

  get lastIndexedBlock(): bigint | null {
    return this.#lastIndexedBlock;
  }

  setLastIndexedBlock(blockNumber: bigint): void {
    this.#lastIndexedBlock = blockNumber;
  }

  get eventCount(): number {
    return this.#events.length;
  }

  get learnerCount(): number {
    return this.#byLearner.size;
  }

  /** Most recent events first. */
  recentEvents(limit = 50): MilestoneEvent[] {
    return this.#events
      .slice()
      .sort((a, b) => {
        const blockDelta = BigInt(b.blockNumber) - BigInt(a.blockNumber);
        if (blockDelta !== 0n) {
          return blockDelta > 0n ? 1 : -1;
        }
        return b.logIndex - a.logIndex;
      })
      .slice(0, limit);
  }

  eventsFor(learner: Address): MilestoneEvent[] {
    const needle = learner.toLowerCase();
    return this.#events.filter((event) => event.learner.toLowerCase() === needle);
  }

  progressFor(learner: Address): LearnerProgress {
    const events = this.eventsFor(learner);
    const completedIds = [...(this.#byLearner.get(learner.toLowerCase()) ?? [])].sort(
      (a, b) => a - b,
    );
    const timestamps = events.map((event) => event.completedAt);

    return {
      learner,
      completedIds,
      completedCount: completedIds.length,
      totalMilestones: TOTAL_MILESTONES,
      percentComplete: Math.round((completedIds.length / TOTAL_MILESTONES) * 100),
      firstSeenAt: timestamps.length > 0 ? Math.min(...timestamps) : null,
      lastActivityAt: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  leaderboard(limit = 25): LeaderboardRow[] {
    const rows = [...this.#byLearner.entries()].map(([learner, completed]) => {
      const timestamps = this.eventsFor(learner as Address).map((event) => event.completedAt);
      return {
        learner: learner as Address,
        completedCount: completed.size,
        lastActivityAt: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      };
    });

    // Most milestones first; ties broken by who got there earlier.
    rows.sort((a, b) => b.completedCount - a.completedCount || a.lastActivityAt - b.lastActivityAt);

    return rows.slice(0, limit).map((row, index) => ({ rank: index + 1, ...row }));
  }

  /** How many learners have completed each milestone — feeds the "hardest step" chart. */
  completionsByMilestone(): MilestoneCompletionStat[] {
    return MILESTONES.map((milestone) => ({
      milestoneId: milestone.id,
      title: milestone.title,
      completions: [...this.#byLearner.values()].filter((set) => set.has(milestone.id)).length,
    }));
  }
}
