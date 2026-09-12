"use client";

import type { Milestone } from "@blockchain/shared";

interface MilestoneCardProps {
  milestone: Milestone;
  isCompleted: boolean;
  isBusy: boolean;
  canSubmit: boolean;
  onComplete: (milestoneId: number) => void;
}

const PHASE_LABELS: Record<Milestone["phase"], string> = {
  1: "Phase 1 · Foundations",
  2: "Phase 2 · Solidity",
  3: "Phase 3 · dApp",
  4: "Phase 4 · Production",
};

export function MilestoneCard({
  milestone,
  isCompleted,
  isBusy,
  canSubmit,
  onComplete,
}: MilestoneCardProps) {
  return (
    <article
      className={`rounded-xl border p-4 transition ${
        isCompleted
          ? "border-[--color-accent]/50 bg-[--color-accent]/5"
          : "border-[--color-border-subtle] bg-[--color-surface-raised]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-[--color-muted]">
            {PHASE_LABELS[milestone.phase]} · ~{milestone.estimatedHours}h
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {milestone.id + 1}. {milestone.title}
          </h3>
          <p className="mt-1 text-sm text-[--color-muted]">{milestone.summary}</p>
          <p className="mono mt-2 text-xs text-[--color-muted]">{milestone.docPath}</p>
        </div>

        {isCompleted ? (
          <span className="shrink-0 rounded-lg bg-[--color-accent] px-3 py-1.5 text-xs font-semibold text-black">
            Done
          </span>
        ) : (
          <button
            type="button"
            disabled={!canSubmit || isBusy}
            onClick={() => onComplete(milestone.id)}
            title={canSubmit ? undefined : "Connect your wallet on the right network first"}
            className="shrink-0 rounded-lg border border-[--color-accent]/60 px-3 py-1.5 text-xs font-semibold text-[--color-accent] transition hover:bg-[--color-accent] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isBusy ? "Confirming…" : "Mark done"}
          </button>
        )}
      </div>
    </article>
  );
}
