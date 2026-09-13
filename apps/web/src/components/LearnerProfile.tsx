"use client";

import { MILESTONES, TOTAL_MILESTONES, explorerAddressUrl } from "@blockchain/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { isAddress } from "viem";

import { fetchProgress } from "@/lib/api";
import { env } from "@/lib/env";
import { formatRelative, formatTimestamp, shortenAddress } from "@/lib/format";

/**
 * One learner's history, read from the indexer.
 *
 * Note what this page does NOT do: it never asks the user to connect a wallet. A profile
 * is public data — anyone can look up any address. Gating public reads behind a wallet
 * connection is a habit worth breaking early.
 */
export function LearnerProfile({ address }: { address: string }) {
  const valid = isAddress(address);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["progress", address.toLowerCase()],
    queryFn: ({ signal }) => fetchProgress(address, signal),
    enabled: valid,
    refetchInterval: 20_000,
  });

  if (!valid) {
    return (
      <Panel>
        <p className="text-sm text-red-300">
          <span className="mono">{address}</span> is not a valid EVM address.
        </p>
      </Panel>
    );
  }

  const explorerUrl = explorerAddressUrl(env.chainId, address);
  const completedAtById = new Map(data?.events.map((event) => [event.milestoneId, event]));

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-[--color-muted] transition hover:text-white">
          ← Back to the roadmap
        </Link>
        <h1 className="mono mt-3 text-xl font-semibold break-all">{shortenAddress(address, 8)}</h1>
        <p className="mono mt-1 text-xs break-all text-[--color-muted]">{address}</p>
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-[--color-accent]"
          >
            View on block explorer
          </a>
        ) : null}
      </header>

      {isLoading ? <Panel>Loading progress…</Panel> : null}
      {isError ? (
        <Panel>
          <span className="text-amber-300">{error.message}</span>
        </Panel>
      ) : null}

      {data ? (
        <>
          <Panel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Completed" value={`${data.completedCount} / ${TOTAL_MILESTONES}`} />
              <Stat label="Progress" value={`${data.percentComplete}%`} />
              <Stat
                label="Started"
                value={data.firstSeenAt ? formatRelative(data.firstSeenAt) : "—"}
              />
              <Stat
                label="Last activity"
                value={data.lastActivityAt ? formatRelative(data.lastActivityAt) : "—"}
              />
            </div>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-[--color-surface]"
              role="progressbar"
              aria-valuenow={data.percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[--color-accent] transition-[width]"
                style={{ width: `${data.percentComplete}%` }}
              />
            </div>
          </Panel>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Milestones</h2>
            <ul className="divide-y divide-[--color-border-subtle] overflow-hidden rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised]">
              {MILESTONES.map((milestone) => {
                const event = completedAtById.get(milestone.id);

                return (
                  <li
                    key={milestone.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <span className={event ? "" : "text-[--color-muted]"}>
                      {milestone.id + 1}. {milestone.title}
                    </span>
                    <span className="shrink-0 text-xs text-[--color-muted]">
                      {event ? formatTimestamp(event.completedAt) : "Not yet"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4 text-sm">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide uppercase text-[--color-muted]">{label}</p>
      <p className="mt-0.5 text-base font-semibold">{value}</p>
    </div>
  );
}
