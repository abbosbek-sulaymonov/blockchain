# Architecture

## The shape of it

```
                    ┌────────────────────────────┐
                    │   packages/contracts       │
                    │   Solidity + Hardhat       │
                    │                            │
                    │   Greeter                  │
                    │   LearnToken (ERC-20)      │
                    │   ProgressTracker          │
                    └──────────────┬─────────────┘
                                   │ compile -> ABIs
                                   │ deploy   -> addresses
                                   v
                    ┌────────────────────────────┐
                    │   packages/shared          │
                    │   ABIs · addresses         │
                    │   chains · milestones      │
                    └───────┬────────────┬───────┘
                            │            │
              ┌─────────────┘            └─────────────┐
              v                                        v
   ┌─────────────────────┐                  ┌─────────────────────┐
   │   apps/api          │                  │   apps/web          │
   │   Fastify indexer   │<─── REST ────────│   Next.js dApp      │
   │                     │                  │   wagmi + viem      │
   └──────────┬──────────┘                  └──────────┬──────────┘
              │  getLogs (read)                        │  eth_call (read)
              │                                        │  eth_sendTransaction (write)
              v                                        v
        ┌──────────────────────────────────────────────────────┐
        │   EVM chain — local Hardhat node, or Sepolia         │
        └──────────────────────────────────────────────────────┘
```

The dependency arrow points one way: **contracts → shared → apps**. Nothing in
`packages/shared` may import from an app. That rule is what keeps a contract change from
rippling into an import cycle.

## Why a monorepo

A dApp has one thing a normal web app does not: the ABI, a contract's type signature,
which the contracts produce and both apps consume. Keeping them in separate repos means
manually copying JSON between them and discovering the mismatch at runtime, in a user's
wallet, after they have paid gas.

In a monorepo:

- `pnpm build` recompiles contracts and regenerates ABIs in one step.
- The frontend's types come from the actual compiled contract, so a renamed function is a
  compile error rather than a failed transaction.
- One `pnpm install`, one lockfile, one CI run.

## The packages

### `packages/contracts`

Hardhat 3 with the viem plugin. Three contracts, each teaching something specific:

- **`Greeter`** — storage, events, custom errors, `immutable`. The smallest useful contract.
- **`LearnToken`** — ERC-20 via OpenZeppelin, plus two access paths (a human `owner` and a
  contract `minter`) and a cooldown-gated faucet.
- **`ProgressTracker`** — the one the whole app revolves around. Stores 12 booleans in a
  single `uint256` bitmap, emits an event per completion, and calls into `LearnToken` to
  mint a reward.

Tests run on Node's built-in test runner against an in-process EVM. No node to start, no
network to wait for.

### `packages/shared`

The contract between the chain and the apps:

| File                         | Holds                                                          |
| ---------------------------- | -------------------------------------------------------------- |
| `generated/abis.ts`          | ABIs, generated from compiled artifacts. Never edit by hand.   |
| `generated/deployments.json` | Deployed addresses per chain id, written by the deploy script. |
| `chains.ts`                  | Supported chains, explorer URL builders, chain labels.         |
| `milestones.ts`              | The 12 milestones, mirrored on-chain, plus bitmap helpers.     |
| `types.ts`                   | The API's response shapes, used by both sides of the wire.     |

ABIs are generated as `as const` literals on purpose. viem infers argument and return
types from an ABI only when it is a literal, so `progressTracker.read.completedCount(...)`
is typed end to end with no code generation step beyond this file.

### `apps/api`

Fastify. Its whole job is answering questions the chain answers badly:

- "Who has completed the most milestones?" — a leaderboard needs every event ever emitted.
- "What happened recently?" — history means scanning logs over a block range.
- "How many people finished milestone 5?" — an aggregate across all users.

Asking a chain for those means `getLogs` over the contract's entire history on every page
load. Public RPCs rate-limit it, cap the block range, or simply time out. So the indexer
reads the logs once, keeps them, and serves them over REST.

Structure:

| File              | Responsibility                                              |
| ----------------- | ----------------------------------------------------------- |
| `config.ts`       | Parses and validates every env var at boot. Fails loudly.   |
| `chain.ts`        | Builds the viem public client. Read-only, holds no key.     |
| `store.ts`        | In-memory index, deduping and reorg rollback.               |
| `indexer.ts`      | Backfill, follow the head, handle rewinds.                  |
| `routes/index.ts` | HTTP surface.                                               |
| `server.ts`       | Fastify wiring, CORS, error handling, BigInt serialization. |

### `apps/web`

Next.js App Router, React 19, wagmi and viem. Client components, because a wallet lives in
the browser and cannot be reached from a server render.

Reads come from **two** places, deliberately:

- **Live, per-user state** (has this address completed milestone 3? what is their balance?)
  is read straight from the contract. It must be current and it is cheap — one `eth_call`.
- **Aggregates and history** (leaderboard, activity feed, per-milestone stats, and any
  learner's public profile at `/learner/<address>`) come from the API. They are expensive
  to compute and a few seconds of staleness costs nothing.

Getting that split wrong is the most common architectural mistake in a first dApp. Reading
aggregates from the chain makes the app crawl; reading live balances from a cache makes it
lie.

## How a completion flows through the system

1. User clicks **Mark done**. `useWriteContract` builds the transaction and hands it to
   the wallet.
2. The wallet asks the user to sign. The app never sees the private key — it only receives
   a transaction hash back.
3. The transaction is broadcast and eventually mined. `ProgressTracker.completeMilestone`
   sets a bit, emits `MilestoneCompleted`, and calls `LearnToken.mintReward`.
4. `useWaitForTransactionReceipt` resolves. The app refetches the bitmap; the card flips.
5. Within one poll interval the indexer's `getLogs` picks up the new event, stores it, and
   the leaderboard and activity feed update on their next refetch.

Steps 4 and 5 are separate on purpose: the chain is the source of truth, and the indexer
is a cache that catches up.

## Deliberate simplifications

This is a teaching repo. Four things a production system would do differently:

| Here                         | In production                                            |
| ---------------------------- | -------------------------------------------------------- |
| In-memory event store        | Postgres or SQLite, so restarts do not lose the index.   |
| Polling loop                 | WebSocket subscriptions, or a dedicated indexer service. |
| `minter` as a single address | `AccessControl` roles, so permissions are auditable.     |
| No upgrade path              | A proxy pattern, with all the risk that carries.         |

Each is a stated exercise, not an oversight. Milestone 10 is the first one.
