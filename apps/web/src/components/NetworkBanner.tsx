"use client";

import { chainLabel, isSupportedChain } from "@blockchain/shared";
import { useAccount, useSwitchChain } from "wagmi";

import { env } from "@/lib/env";

/**
 * A wallet can be connected to any chain it likes, including one this app has never
 * heard of. Reading a contract address for the wrong chain is the single most common
 * "why is it showing zero?" bug in a first dApp. Catch it loudly.
 */
export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  // Narrow `number` down to a chain id wagmi is actually configured for; `switchChain`
  // will not accept an arbitrary number, and that type error is a real bug guard.
  const targetChainId = env.chainId;

  if (!isConnected || chainId === targetChainId || !isSupportedChain(targetChainId)) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm text-amber-200">
        Your wallet is on <strong>{chainLabel(chainId ?? 0)}</strong>, but this app is configured
        for <strong>{chainLabel(targetChainId)}</strong>. Contract reads will be empty until you
        switch.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchChain({ chainId: targetChainId })}
        className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
      >
        {isPending ? "Switching…" : `Switch to ${chainLabel(targetChainId)}`}
      </button>
    </div>
  );
}
