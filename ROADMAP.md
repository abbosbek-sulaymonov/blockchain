# Web3 Roadmap for an Entry-Level Developer

A 12-milestone path from "I know TypeScript" to "I can ship and defend a dApp".

Everything here is built on this repo. Each milestone has a deliverable you can point
at, and completing one writes a record to `ProgressTracker` on-chain — so your progress
is itself a Web3 exercise.

**Total: ~59 focused hours.** At 8 hours a week that is roughly two months. At 20 hours a
week, three weeks. Speed is not the point; the deliverables are.

---

## Before you start

You need to be comfortable with:

- **TypeScript** — `async/await`, generics, discriminated unions. Web3 tooling leans on
  types heavily, and viem's inference is the best teacher you will get.
- **The terminal** — you will live in it.
- **React** — hooks, state, effects. wagmi is hooks all the way down.
- **HTTP and JSON** — a blockchain node is, mechanically, a JSON-RPC server.

You do **not** need: cryptography, a maths degree, prior finance knowledge, or any money.
Everything in this roadmap runs on a local chain or a free testnet.

### Setup (30 minutes, do this first)

```bash
git clone https://github.com/abbosbek-sulaymonov/blockchain.git
cd blockchain
corepack enable
pnpm install
pnpm build
```

Full walkthrough: [docs/01-getting-started.md](docs/01-getting-started.md).

---

## Phase 1 — Foundations (~9 hours)

**Goal: stop treating the blockchain as magic.** By the end you can explain what happens
between clicking a button and a transaction being mined, with no hand-waving.

### Milestone 0 · Run the stack locally — ~2h

Clone, install, start a local chain, deploy, open the dApp, connect a wallet, and mark
this milestone done on-chain.

- **Deliverable:** a transaction hash from your own local chain.
- **Read:** [docs/01-getting-started.md](docs/01-getting-started.md),
  [docs/02-architecture.md](docs/02-architecture.md)
- **You will hit:** the Hardhat network not existing in your wallet yet, and nonce errors
  after restarting the node. Both are covered in
  [docs/11-troubleshooting.md](docs/11-troubleshooting.md).

### Milestone 1 · Read a block — ~3h

Write a standalone script that uses viem to fetch the latest block, an account balance,
and a transaction receipt. Print the gas used and work out what it cost in ETH.

- **Deliverable:** a script that prints real chain data, with no framework around it.
- **Read:** [docs/03-ethereum-fundamentals.md](docs/03-ethereum-fundamentals.md)
- **Understand:** a node is a JSON-RPC server. `eth_getBalance` is an HTTP POST. Every
  library in this ecosystem is a wrapper over about twenty such methods.

### Milestone 2 · Keys, accounts and signatures — ~4h

Generate a private key, derive its address, sign a message off-chain, and verify the
signature recovers the same address. Then change one character of the message and watch
verification fail.

- **Deliverable:** a working sign-and-verify script.
- **Read:** [docs/03-ethereum-fundamentals.md](docs/03-ethereum-fundamentals.md)
- **Understand:** an address is not an account you open somewhere — it is derived from a
  key you generated offline. Nobody issues it and nobody can revoke it. This is also why
  a leaked key is unrecoverable: there is no support line.

**Phase 1 checkpoint.** Can you explain, without notes: what an EOA is, why gas exists,
what is actually inside a transaction, and why signing is free but sending is not?

---

## Phase 2 — Solidity and smart contracts (~18 hours)

**Goal: write contracts that hold other people's money without losing it.** The mindset
shift here is that code is immutable and public, and every bug is permanent and exploitable.

### Milestone 3 · Write and test Greeter.sol — ~5h

Read `Greeter.sol` line by line, then extend it: add a per-author change counter and an
event for it. Write the tests first and watch them fail.

- **Deliverable:** a feature you added, covered by tests you wrote.
- **Read:** [docs/04-solidity.md](docs/04-solidity.md),
  [docs/09-testing.md](docs/09-testing.md)
- **Understand:** `storage` costs gas and persists; `memory` is scratch space and vanishes.
  Events are not storage — contracts cannot read their own events back.

### Milestone 4 · Ship an ERC-20 — ~6h

Extend `LearnToken`: add a supply cap enforced on mint, and a burn function. Prove both
with tests, including the failure cases.

- **Deliverable:** a capped, burnable token with tests that fail if you remove the cap.
- **Read:** [docs/04-solidity.md](docs/04-solidity.md)
- **Understand:** a token is not a special blockchain feature. It is a contract holding a
  `mapping(address => uint256)` that everyone agreed to call a balance. ERC-20 is a shared
  interface, nothing more.
- **Do not** hand-roll the base implementation. Inherit OpenZeppelin's. Reading it is the
  exercise; rewriting it is how people lose money.

### Milestone 5 · Gas and storage layout — ~4h

Write two versions of a completion tracker — one `mapping(uint8 => bool)`, one bitmap —
and measure the gas for each. Then write a paragraph explaining the difference.

- **Deliverable:** measured numbers and a written explanation.
- **Read:** [docs/04-solidity.md](docs/04-solidity.md) — the storage section.
- **Understand:** a storage slot is 32 bytes and costs ~20,000 gas the first time you
  write it. That single fact drives most Solidity design decisions you will read about.

### Milestone 6 · Deploy to a public testnet — ~3h

Create a **throwaway** wallet, fund it from a Sepolia faucet, deploy, and verify the
source on Etherscan.

- **Deliverable:** a verified contract on Sepolia, readable by anyone.
- **Read:** [docs/05-deploying.md](docs/05-deploying.md),
  [docs/08-security.md](docs/08-security.md)
- **Understand:** deploying is just a transaction with no recipient and bytecode as data.
  Verification uploads your source so Etherscan can prove it compiles to that bytecode.

**Phase 2 checkpoint.** Your contract is live at an address you do not control, cannot
patch, and cannot take back. Sit with that for a minute — it is the whole discipline.

---

## Phase 3 — The dApp frontend (~16 hours)

**Goal: build an interface that survives real users.** Wallets get rejected, networks get
switched mid-flow, transactions sit pending for minutes. Handle all of it.

### Milestone 7 · Connect a wallet — ~5h

Study `ConnectWallet.tsx` and `NetworkBanner.tsx`, then break them on purpose: reject the
connection request, switch to a chain the app does not support, disconnect mid-session.
Fix every rough edge you find.

- **Deliverable:** a connect flow that never leaves the UI lying about its state.
- **Read:** [docs/06-frontend-dapp.md](docs/06-frontend-dapp.md)
- **Understand:** your app does not have a wallet. It asks one, over a message channel the
  user controls, and the answer may be "no".

### Milestone 8 · Read contract state in React — ~5h

Add a component showing `learnerCount` and the connected user's LEARN balance, with real
loading and error states. Then work out why it does not update when the chain changes.

- **Deliverable:** a read component that is honest about loading and failure.
- **Read:** [docs/06-frontend-dapp.md](docs/06-frontend-dapp.md)
- **Understand:** wagmi hooks are TanStack Query hooks. Cache invalidation is your job,
  and "the UI shows a stale value" is the single most common dApp bug.

### Milestone 9 · Send a transaction from the UI — ~6h

Trace the full write path in `MilestoneList.tsx`, then add a simulation step before the
write so a transaction that will revert is caught before the user pays for it.

- **Deliverable:** a write flow with simulation, pending state, receipt handling, and a
  readable error for every failure mode.
- **Read:** [docs/06-frontend-dapp.md](docs/06-frontend-dapp.md)
- **Understand:** a transaction hash is a promise, not a result. Nothing is true until the
  receipt arrives — and a receipt with `status: "reverted"` means it failed _and_ the user
  still paid.

**Phase 3 checkpoint.** Hand your app to someone else. If they can get it into a confusing
state in under two minutes, you are not done.

---

## Phase 4 — Production concerns (~16 hours)

**Goal: the parts that separate a demo from something you would put your name on.**

### Milestone 10 · Index events off-chain — ~8h

Read `apps/api/src/indexer.ts` end to end, then replace the in-memory store with SQLite so
the index survives a restart. Keep the route handlers untouched — that is the test of
whether the boundary was drawn correctly.

- **Deliverable:** an indexer whose data outlives the process.
- **Read:** [docs/07-indexing-backend.md](docs/07-indexing-backend.md)
- **Understand:** chains are terrible databases. Anything aggregated — leaderboards,
  history, search — belongs off-chain. Every serious dApp has an indexer behind it.

### Milestone 11 · Security pass — ~8h

Work the checklist in [docs/08-security.md](docs/08-security.md) against your own code.
Then deliberately introduce a reentrancy bug into a copy of `ProgressTracker`, write an
attacking contract that drains it, and fix it.

- **Deliverable:** a working exploit and the fix that stops it.
- **Read:** [docs/08-security.md](docs/08-security.md)
- **Understand:** checks-effects-interactions is not style advice. The DAO hack in 2016
  cost about $60M because of exactly this ordering, and it still ships in new code today.

**Phase 4 checkpoint.** You can explain, to a sceptical reviewer, why each piece of state
lives where it lives.

---

## After the roadmap

Pick one and go deep — breadth from here is a trap.

| Direction          | What to build next                                                        |
| ------------------ | ------------------------------------------------------------------------- |
| **Protocol work**  | Learn Foundry, fuzzing and invariant testing. Read audit reports for fun. |
| **Infrastructure** | Write a real indexer. Study The Graph, then build a subgraph.             |
| **Frontend depth** | Account abstraction (ERC-4337), gasless transactions, session keys.       |
| **L2s**            | Deploy to Base or Arbitrum. Learn why calldata costs dominate L2 fees.    |
| **Security**       | Code4rena and Sherlock contests. Start by reading winning submissions.    |

### Things worth knowing before you go further

- **Do not deploy anything holding real value without an audit.** Not a hedge — a rule.
- **Read audit reports.** They are the best free Solidity education available.
- **Testnet everything.** Sepolia ETH is free; mainnet mistakes are not.
- **Ignore price talk.** It teaches you nothing about building.

---

## Progress tracking

Milestone metadata lives in
[`packages/shared/src/milestones.ts`](packages/shared/src/milestones.ts) and is mirrored
on-chain by `ProgressTracker.TOTAL_MILESTONES`. The ids are permanent: bit `n` of a
learner's bitmap means milestone `n`. Append new milestones, never renumber existing ones
— the chain has already recorded what the old numbers meant.
