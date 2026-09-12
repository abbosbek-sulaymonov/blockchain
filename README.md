# Web3 Learning Monorepo

A learn-by-building Web3 stack in TypeScript. Solidity contracts, an off-chain event
indexer, and a Next.js dApp — three real pieces that talk to each other, so you can see
where a transaction goes after you click the button.

Full curriculum: **[ROADMAP.md](ROADMAP.md)** · Deep dives: **[docs/](docs/)**

## What is in here

| Package              | What it is                                                               |
| -------------------- | ------------------------------------------------------------------------ |
| `packages/contracts` | Solidity + Hardhat 3 + viem. `Greeter`, `LearnToken`, `ProgressTracker`. |
| `packages/shared`    | Generated ABIs, deployed addresses, chain config, milestone metadata.    |
| `packages/tsconfig`  | Shared TypeScript bases.                                                 |
| `apps/api`           | Fastify service that indexes contract events and serves them as REST.    |
| `apps/web`           | Next.js 16 dApp: connect a wallet, read state, send transactions.        |

The dependency arrow points one way: `contracts -> shared -> (api, web)`.

## Quick start

```bash
pnpm install
pnpm build              # compiles contracts, generates ABIs, builds every package
```

Then, in three terminals:

```bash
pnpm chain              # terminal 1: local EVM on http://127.0.0.1:8545
pnpm deploy:local       # terminal 2 (once): deploys and records addresses
pnpm dev                # terminal 3: API on :4000, web app on :3000
```

Open <http://localhost:3000>, connect a wallet on the Hardhat network, and complete a
milestone. Full setup — including wallet configuration — is in
[docs/01-getting-started.md](docs/01-getting-started.md).

## Requirements

- Node.js 22.13+ (`.nvmrc` pins the exact version)
- pnpm 10+ (`corepack enable` installs it)
- A browser wallet such as MetaMask

## Everyday commands

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Runs every app in watch mode.                       |
| `pnpm build`        | Builds everything in dependency order.              |
| `pnpm test`         | Contract tests (node:test) and API tests (vitest).  |
| `pnpm typecheck`    | TypeScript across the whole workspace.              |
| `pnpm lint`         | Prettier check.                                     |
| `pnpm chain`        | Local Hardhat node.                                 |
| `pnpm deploy:local` | Deploys to the local node and writes the addresses. |

## Security

Never commit a private key. `.env` is gitignored; `.env.example` documents every variable.
Use a throwaway wallet for testnets and never reuse it on mainnet.
See [docs/08-security.md](docs/08-security.md).

## License

MIT — see [LICENSE](LICENSE).
