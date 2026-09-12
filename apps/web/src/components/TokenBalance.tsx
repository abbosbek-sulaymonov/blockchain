"use client";

import { useEffect } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { learnTokenAbi, learnTokenAddress } from "@/lib/contracts";
import { env } from "@/lib/env";
import { formatToken } from "@/lib/format";

/**
 * Reads an ERC-20 balance and claims from the faucet.
 *
 * Note `formatToken`: on-chain amounts are integers with no decimal point. 100 LEARN is
 * stored as 100 * 10^18. Doing this conversion in the UI layer — and never in Solidity —
 * is the convention across the whole ecosystem.
 */
export function TokenBalance() {
  const { address, isConnected, chainId } = useAccount();
  const tokenAddress = learnTokenAddress(chainId ?? env.chainId);

  const { data: balance, refetch } = useReadContract({
    address: tokenAddress,
    abi: learnTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && tokenAddress) },
  });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      void refetch();
    }
  }, [isSuccess, refetch]);

  if (!isConnected || !tokenAddress) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4">
      <p className="text-xs uppercase tracking-wide text-[--color-muted]">LEARN balance</p>
      <p className="mt-1 text-2xl font-semibold">
        {formatToken(typeof balance === "bigint" ? balance : 0n)}{" "}
        <span className="text-sm font-normal text-[--color-muted]">LEARN</span>
      </p>

      <button
        type="button"
        disabled={isPending || isMining}
        onClick={() =>
          writeContract({ address: tokenAddress, abi: learnTokenAbi, functionName: "claimFaucet" })
        }
        className="mt-3 w-full rounded-lg border border-[--color-accent]/60 px-3 py-2 text-sm font-medium text-[--color-accent] transition hover:bg-[--color-accent] hover:text-black disabled:opacity-40"
      >
        {isPending ? "Check your wallet…" : isMining ? "Claiming…" : "Claim 100 from faucet"}
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-400">{error.message.split("\n")[0]}</p>
      ) : (
        <p className="mt-2 text-xs text-[--color-muted]">One claim per address per 24 hours.</p>
      )}
    </div>
  );
}
