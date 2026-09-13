"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { shortenAddress } from "@/lib/format";

/**
 * The entry point of every dApp.
 *
 * Three states to handle, and beginners usually forget the third:
 *   1. No wallet installed  -> tell the user, link them somewhere useful.
 *   2. Not connected        -> offer a connect button per connector.
 *   3. Connecting           -> disable the button, or users double-fire the request.
 */
export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href={`/learner/${address}`}
          title="View your progress"
          className="mono rounded-lg border border-[--color-border-subtle] bg-[--color-surface-raised] px-3 py-2 text-sm transition hover:border-[--color-accent]"
        >
          {shortenAddress(address)}
        </Link>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-lg border border-[--color-border-subtle] px-3 py-2 text-sm text-[--color-muted] transition hover:text-white"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const available = connectors;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {available.length === 0 ? (
          <a
            href="https://ethereum.org/en/wallets/find-wallet/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-black"
          >
            Install a wallet
          </a>
        ) : (
          available.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={isPending}
              onClick={() => connect({ connector })}
              className="rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-black transition hover:bg-[--color-accent-strong] disabled:opacity-50"
            >
              {isPending ? "Connecting…" : `Connect ${connector.name}`}
            </button>
          ))
        )}
      </div>
      {error ? <p className="text-xs text-red-400">{error.message}</p> : null}
    </div>
  );
}
