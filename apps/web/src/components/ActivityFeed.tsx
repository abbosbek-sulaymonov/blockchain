"use client";

import { getMilestone } from "@blockchain/shared";
import { useQuery } from "@tanstack/react-query";

import { fetchRecentEvents } from "@/lib/api";
import { formatRelative, shortenAddress } from "@/lib/format";

/**
 * Reads from the indexer, not the chain.
 *
 * Rendering "the last 10 completions by anyone" straight from the browser would need a
 * `getLogs` sweep over the contract's whole history on every page load. That is exactly
 * the work an indexer exists to do once.
 */
export function ActivityFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["recent-events"],
    queryFn: ({ signal }) => fetchRecentEvents(10, signal),
    refetchInterval: 15_000,
  });

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>

      {isLoading ? <Empty>Loading…</Empty> : null}
      {isError ? <Empty>Indexer offline.</Empty> : null}
      {data?.length === 0 ? <Empty>No milestones completed yet. Be the first.</Empty> : null}

      <ul className="divide-y divide-[--color-border-subtle] overflow-hidden rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised]">
        {data?.map((event) => (
          <li
            key={`${event.blockNumber}-${event.logIndex}`}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <span className="min-w-0">
              <span className="mono text-[--color-accent]">{shortenAddress(event.learner)}</span>{" "}
              completed{" "}
              <strong className="font-medium">
                {getMilestone(event.milestoneId)?.title ?? `milestone ${event.milestoneId}`}
              </strong>
            </span>
            <time className="shrink-0 text-xs text-[--color-muted]">
              {formatRelative(event.completedAt)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4 text-sm text-[--color-muted]">
      {children}
    </p>
  );
}
