"use client";

import { MILESTONES, decodeBitmap, explorerTxUrl } from "@blockchain/shared";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { progressTrackerAbi, progressTrackerAddress } from "@/lib/contracts";
import { env } from "@/lib/env";

import { MilestoneCard } from "./MilestoneCard";

/**
 * The full read + write loop of a dApp, in one component:
 *
 *   read   -> useReadContract pulls the packed bitmap in ONE rpc call.
 *   write  -> useWriteContract asks the wallet to sign and broadcast.
 *   settle -> useWaitForTransactionReceipt blocks until the tx is mined.
 *   refresh-> refetch the read, because the chain changed under us.
 *
 * Beginners usually stop after `write` and wonder why the UI does not update.
 * A transaction hash is a promise, not a result. Nothing is true until it is mined.
 */
export function MilestoneList() {
  const { address, isConnected, chainId } = useAccount();
  const contractAddress = progressTrackerAddress(chainId ?? env.chainId);
  const onRightChain = chainId === env.chainId;

  const [pendingId, setPendingId] = useState<number | null>(null);

  const {
    data: bitmap,
    refetch,
    isLoading: isLoadingProgress,
  } = useReadContract({
    address: contractAddress,
    abi: progressTrackerAbi,
    functionName: "completedBitmap",
    args: address ? [address] : undefined,
    query: {
      // Skip the RPC call entirely until we have both an address and a deployment.
      enabled: Boolean(address && contractAddress),
    },
  });

  const {
    writeContract,
    data: txHash,
    isPending: isSigning,
    error: writeError,
    reset,
  } = useWriteContract();

  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Once the transaction is mined the on-chain bitmap has changed — pull it again.
  useEffect(() => {
    if (isMined) {
      void refetch();
      setPendingId(null);
    }
  }, [isMined, refetch]);

  const completed = decodeBitmap(typeof bitmap === "bigint" ? bitmap : 0n);
  const completedCount = completed.filter(Boolean).length;
  const isBusy = isSigning || isMining;

  function handleComplete(milestoneId: number) {
    if (!contractAddress) {
      return;
    }

    reset();
    setPendingId(milestoneId);
    writeContract({
      address: contractAddress,
      abi: progressTrackerAbi,
      functionName: "completeMilestone",
      args: [milestoneId],
    });
  }

  return (
    <section className="mt-8">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Roadmap milestones</h2>
        <p className="text-sm text-[--color-muted]">
          {isLoadingProgress
            ? "Reading chain…"
            : `${completedCount} / ${MILESTONES.length} on-chain`}
        </p>
      </header>

      {!contractAddress ? (
        <p className="mb-4 rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4 text-sm text-[--color-muted]">
          No ProgressTracker deployment found for this chain. Run <code>pnpm chain</code> and{" "}
          <code>pnpm deploy:local</code>, then reload.
        </p>
      ) : null}

      {writeError ? (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {shortenError(writeError.message)}
        </p>
      ) : null}

      {txHash ? (
        <p className="mb-4 rounded-xl border border-[--color-border-subtle] bg-[--color-surface-raised] p-4 text-sm">
          {isMining ? "Waiting for confirmation… " : "Confirmed. "}
          <TxLink chainId={chainId ?? env.chainId} hash={txHash} />
        </p>
      ) : null}

      <div className="grid gap-3">
        {MILESTONES.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            isCompleted={completed[milestone.id] ?? false}
            isBusy={isBusy && pendingId === milestone.id}
            canSubmit={isConnected && onRightChain && Boolean(contractAddress) && !isBusy}
            onComplete={handleComplete}
          />
        ))}
      </div>
    </section>
  );
}

function TxLink({ chainId, hash }: { chainId: number; hash: `0x${string}` }) {
  const url = explorerTxUrl(chainId, hash);

  if (!url) {
    return <span className="mono text-xs text-[--color-muted]">{hash}</span>;
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mono text-xs text-[--color-accent]">
      {hash}
    </a>
  );
}

/**
 * Wallet errors are enormous. The useful part — the revert reason — is on the first line.
 * Showing the whole stack trains users to ignore errors entirely.
 */
function shortenError(message: string): string {
  return message.split("\n")[0] ?? message;
}
