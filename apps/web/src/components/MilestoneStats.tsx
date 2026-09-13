"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMilestoneStats } from "@/lib/api";

/**
 * Completions per milestone, from the indexer.
 *
 * The interesting reading is the drop-off: the milestone where the bar collapses is the
 * one people get stuck on. That is an aggregate over every event ever emitted, which is
 * exactly the kind of question a chain answers badly and an indexer answers cheaply.
 */
export function MilestoneStats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["milestone-stats"],
    queryFn: ({ signal }) => fetchMilestoneStats(signal),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <p className="text-sm text-[--color-muted]">Loading stats…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-[--color-muted]">Indexer offline.</p>;
  }

  if (data.learners === 0) {
    return (
      <p className="rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4 text-sm text-[--color-muted]">
        No completions indexed yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4">
      {data.stats.map((stat) => {
        const share = Math.round((stat.completions / data.learners) * 100);

        return (
          <div key={stat.milestoneId} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-[--color-muted]">
                {stat.milestoneId + 1}. {stat.title}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[--color-surface]">
                <div
                  className="h-full rounded-full bg-[--color-accent]"
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
            <span className="mono text-xs text-[--color-muted]">
              {stat.completions}/{data.learners}
            </span>
          </div>
        );
      })}
    </div>
  );
}
