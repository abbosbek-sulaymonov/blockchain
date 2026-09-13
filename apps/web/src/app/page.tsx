import { ActivityFeed } from "@/components/ActivityFeed";
import { ConnectWallet } from "@/components/ConnectWallet";
import { IndexerStatusCard } from "@/components/IndexerStatusCard";
import { Leaderboard } from "@/components/Leaderboard";
import { MilestoneList } from "@/components/MilestoneList";
import { MilestoneStats } from "@/components/MilestoneStats";
import { NetworkBanner } from "@/components/NetworkBanner";
import { TokenBalance } from "@/components/TokenBalance";

export default function HomePage() {
  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Web3 Learning Path</h1>
          <p className="mt-1 max-w-xl text-sm text-[--color-muted]">
            Twelve milestones, recorded on-chain. Complete one, the contract mints you 10 LEARN and
            emits an event the indexer picks up within seconds.
          </p>
        </div>
        <ConnectWallet />
      </header>

      <div className="mt-6">
        <NetworkBanner />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
        <IndexerStatusCard />
        <TokenBalance />
      </div>

      <MilestoneList />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Leaderboard</h2>
        <Leaderboard />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">Where people get stuck</h2>
        <p className="mb-3 text-sm text-[--color-muted]">
          Share of indexed learners who have cleared each milestone.
        </p>
        <MilestoneStats />
      </section>

      <ActivityFeed />

      <footer className="mt-12 border-t border-[--color-border-subtle] pt-6 text-xs text-[--color-muted]">
        <p>
          Contracts in <code>packages/contracts</code> · indexer in <code>apps/api</code> · this UI
          in <code>apps/web</code>. Start with <code>ROADMAP.md</code>.
        </p>
      </footer>
    </main>
  );
}
