"use client";

import { TOTAL_MILESTONES } from "@blockchain/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { fetchLeaderboard } from "@/lib/api";
import { formatRelative, shortenAddress } from "@/lib/format";

export function Leaderboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: ({ signal }) => fetchLeaderboard(10, signal),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <p className="text-sm text-[--color-muted]">Loading leaderboard…</p>;
  }

  if (isError) {
    return <p className="text-sm text-[--color-muted]">Indexer offline.</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-[--color-muted]">Nobody on the board yet.</p>;
  }

  return (
    <table className="w-full overflow-hidden rounded-xl border border-[--color-border-subtle] text-sm">
      <thead className="bg-[--color-surface-raised] text-left text-xs uppercase tracking-wide text-[--color-muted]">
        <tr>
          <th className="px-4 py-2 font-medium">#</th>
          <th className="px-4 py-2 font-medium">Learner</th>
          <th className="px-4 py-2 font-medium">Progress</th>
          <th className="px-4 py-2 font-medium">Last activity</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[--color-border-subtle]">
        {data.map((row) => (
          <tr key={row.learner}>
            <td className="px-4 py-2 text-[--color-muted]">{row.rank}</td>
            <td className="mono px-4 py-2">
              <Link
                href={`/learner/${row.learner}`}
                className="transition hover:text-[--color-accent]"
              >
                {shortenAddress(row.learner)}
              </Link>
            </td>
            <td className="px-4 py-2">
              {row.completedCount} / {TOTAL_MILESTONES}
            </td>
            <td className="px-4 py-2 text-[--color-muted]">{formatRelative(row.lastActivityAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
