"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchStatus } from "@/lib/api";

/**
 * Health of the off-chain half of the stack.
 *
 * When the leaderboard looks wrong, the answer is almost always here: the indexer is
 * behind the head, pointed at the wrong contract, or not running at all.
 */
export function IndexerStatusCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["indexer-status"],
    queryFn: ({ signal }) => fetchStatus(signal),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <Shell>Checking indexer…</Shell>;
  }

  if (isError || !data) {
    return (
      <Shell>
        <span className="text-amber-300">
          Indexer unreachable. Start it with <code>pnpm --filter @blockchain/api dev</code>.
        </span>
      </Shell>
    );
  }

  const behind =
    data.latestBlock && data.lastIndexedBlock
      ? BigInt(data.latestBlock) - BigInt(data.lastIndexedBlock)
      : null;

  return (
    <Shell>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Chain" value={String(data.chainId)} />
        <Stat label="Events" value={String(data.eventsIndexed)} />
        <Stat label="Learners" value={String(data.learnersIndexed)} />
        <Stat
          label="Head lag"
          value={
            data.isBackfilling
              ? "backfilling"
              : behind === null
                ? "—"
                : `${behind.toString()} blocks`
          }
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4 text-sm">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[--color-muted]">{label}</p>
      <p className="mono mt-0.5 text-sm">{value}</p>
    </div>
  );
}
