# Documentation

Deep dives referenced by [ROADMAP.md](../ROADMAP.md). Read them in order the first time
through; after that, use them as reference.

| Doc                                                       | Read it when                                         |
| --------------------------------------------------------- | ---------------------------------------------------- |
| [01 · Getting started](01-getting-started.md)             | First run. Install, chain, deploy, wallet, first tx. |
| [02 · Architecture](02-architecture.md)                   | You want to know why the repo is shaped like this.   |
| [03 · Ethereum fundamentals](03-ethereum-fundamentals.md) | Milestones 1–2. Blocks, accounts, gas, transactions. |
| [04 · Solidity](04-solidity.md)                           | Milestones 3–5. Storage, events, errors, gas.        |
| [05 · Deploying](05-deploying.md)                         | Milestone 6. Local, testnet, verification.           |
| [06 · Frontend dApp](06-frontend-dapp.md)                 | Milestones 7–9. wagmi, viem, reads, writes.          |
| [07 · Indexing and the backend](07-indexing-backend.md)   | Milestone 10. Logs, backfill, reorgs.                |
| [08 · Security](08-security.md)                           | Milestone 11, and before every deployment.           |
| [09 · Testing](09-testing.md)                             | Any time you write code in this repo.                |
| [10 · Glossary](10-glossary.md)                           | A word you do not recognise.                         |
| [11 · Troubleshooting](11-troubleshooting.md)             | Something is broken. Check here before searching.    |
| [12 · Resources](12-resources.md)                         | You finished the roadmap and want more.              |

## Conventions in these docs

- Commands are run from the **repo root** unless the snippet says otherwise.
- `pnpm --filter @blockchain/<name> <script>` runs a script in one workspace package.
- Anything marked **Gotcha** is a mistake that is easy to make and hard to diagnose.
