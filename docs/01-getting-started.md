# Getting started

Goal: a local chain, deployed contracts, a running API, a running dApp, and one
transaction sent by you. Budget about 30 minutes the first time.

## 1. Prerequisites

| Tool     | Version | Check              |
| -------- | ------- | ------------------ |
| Node.js  | 22.13+  | `node -v`          |
| pnpm     | 10+     | `pnpm -v`          |
| Git      | any     | `git --version`    |
| A wallet | —       | MetaMask, Rabby, … |

If `pnpm` is missing, `corepack enable` installs the version pinned in
`package.json` — do not `npm i -g pnpm`, it drifts.

Node version mismatches cause strange errors. `.nvmrc` pins the exact version; with nvm,
`nvm use` picks it up.

## 2. Install and build

```bash
git clone https://github.com/abbosbek-sulaymonov/blockchain.git
cd blockchain
pnpm install
pnpm build
```

`pnpm build` does more than it looks like:

1. Compiles the Solidity contracts with solc 0.8.28.
2. Generates `packages/shared/src/generated/abis.ts` from the compiled artifacts.
3. Builds `@blockchain/shared`, then the API and the web app, in dependency order.

Turborepo works out that order from the workspace graph. If you change a contract, rerun
`pnpm build` so the generated ABIs — and therefore the frontend's types — catch up.

## 3. Start the chain

```bash
pnpm chain
```

Leave this running. You now have an Ethereum node on `http://127.0.0.1:8545`, chain id
`31337`, with 20 accounts holding 10,000 test ETH each. It prints their private keys —
they are publicly known and safe **only** on a local chain.

**Gotcha:** this node keeps no state on disk. Stop it and every deployment, balance and
transaction is gone. That is a feature: you get a clean chain whenever you want one.

## 4. Deploy

In a second terminal:

```bash
pnpm deploy:local
```

You should see:

```
Greeter         -> 0x5fbdb2315678afecb367f032d93f642f64180aa3
LearnToken      -> 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512
ProgressTracker -> 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
```

Those addresses are the same for everyone. A contract address is derived from the
deployer address and its nonce, so a fresh node plus the same deploy order always
produces the same addresses. That is why they are committed in
`packages/shared/src/generated/deployments.json` — a fresh clone works with no `.env` at all.

The script also calls `LearnToken.setMinter(ProgressTracker)`. Without it, completing a
milestone reverts with `NotMinter` — the token refuses to mint for a stranger.

## 5. Run the apps

In a third terminal:

```bash
pnpm dev
```

- API: <http://127.0.0.1:4000> — try `/api/status`
- Web: <http://localhost:3000>

## 6. Configure your wallet

Add the local network manually (MetaMask: Settings → Networks → Add network):

| Field    | Value                   |
| -------- | ----------------------- |
| Name     | Hardhat Local           |
| RPC URL  | `http://127.0.0.1:8545` |
| Chain ID | `31337`                 |
| Currency | ETH                     |

Then import a test account using one of the private keys `pnpm chain` printed. The first
one, `0xac0974...f2ff80`, holds 10,000 ETH.

**Never import a key that has ever touched real funds, and never use these keys anywhere
but a local chain.** They are in every tutorial on the internet; bots sweep them from
public testnets within seconds.

## 7. Send your first transaction

On <http://localhost:3000>: connect, then press **Mark done** on milestone 0. Your wallet
will ask you to confirm — read the dialog before clicking, it is showing you the contract
address, the function and the gas estimate.

After confirmation:

- The milestone card flips to **Done** (a fresh contract read).
- Your LEARN balance becomes 10 (the contract minted it during your transaction).
- The activity feed shows the completion within a few seconds (the indexer saw the event).

Three layers responded to one transaction. That is the whole stack working.

## Optional: your own `.env`

Everything above works with no configuration. Create one when you want to point at a
testnet or change ports:

```bash
cp .env.example .env
```

Every variable is documented in `.env.example`. `.env` is gitignored — keep it that way.

## Next

- How the pieces fit: [02 · Architecture](02-architecture.md)
- What actually happened when you clicked: [03 · Ethereum fundamentals](03-ethereum-fundamentals.md)
- Something broken: [11 · Troubleshooting](11-troubleshooting.md)
