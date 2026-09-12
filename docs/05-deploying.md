# Deploying

Milestone 6. Local first, then a public testnet, then verification.

## What a deployment actually is

A transaction with **no recipient**. The `to` field is empty and the `data` field holds
the contract's creation bytecode. The EVM runs that bytecode, and whatever it returns
becomes the code stored at the new address.

The address is not random:

```
address = keccak256(rlp([deployer_address, nonce]))[12:]
```

Derived from the deployer and their nonce. That is why a fresh Hardhat node plus the same
deploy order always produces the same addresses — and why those addresses are committed in
`packages/shared/src/generated/deployments.json`, so a clone runs with no configuration.

## Local

```bash
pnpm chain          # terminal 1
pnpm deploy:local   # terminal 2
```

`scripts/deploy.ts` does three things, in an order that matters:

1. Deploy `LearnToken`, owned by the deployer.
2. Deploy `ProgressTracker`, passing the token address to its constructor.
3. Call `token.setMinter(tracker)`.

Skip step 3 and every `completeMilestone` reverts with `NotMinter` — the token will not
mint for an address it does not recognise. Deployment order and post-deploy wiring are
part of the deployment, not an afterthought.

The script then writes the addresses to `deployments.json` and prints the `.env` lines you
would need for a non-local chain.

## Sepolia

Sepolia is Ethereum's long-lived public testnet. Same rules as mainnet, worthless ETH.

### 1. A throwaway wallet

Create a **brand new** wallet that has never held real funds and never will.

```ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
console.log(privateKeyToAccount(privateKey).address);
```

**This key goes in `.env` and nowhere else.** `.env` is gitignored. A key committed to a
public repo is drained by bots within minutes — there are scrapers watching GitHub's event
firehose for exactly this, and they are fast.

### 2. Fund it

Search for a current Sepolia faucet — they come and go, and most now require a GitHub
account or a small mainnet balance to stop abuse. You need roughly 0.05 ETH to deploy
everything here comfortably.

### 3. Configure

```bash
cp .env.example .env
```

```dotenv
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
SEPOLIA_PRIVATE_KEY="0xyour_throwaway_key"
ETHERSCAN_API_KEY="your_key"
```

The default public RPC works but rate-limits. A free Alchemy or Infura key is more
reliable and worth the five minutes.

### 4. Deploy

```bash
pnpm --filter @blockchain/contracts deploy:sepolia
```

This is slower than local — you are waiting for real blocks, roughly 12 seconds each. The
script checks the deployer balance first and refuses to start at zero, which is a nicer
failure than running out of gas halfway through.

### 5. Verify on Etherscan

```bash
pnpm --filter @blockchain/contracts verify:sepolia <ADDRESS> <CONSTRUCTOR_ARG>
```

For example:

```bash
pnpm --filter @blockchain/contracts verify:sepolia 0xabc... "0xdeployer_address"
```

Verification uploads your source and compiler settings so Etherscan can prove they produce
the deployed bytecode. It matters because:

- Anyone can read what they are interacting with. Unverified contracts are a red flag.
- Etherscan gives you a free read/write UI for the contract.
- It is the minimum bar for being taken seriously.

**Gotcha:** constructor arguments must match _exactly_ what you deployed with, including
address checksum casing. A mismatch produces a bytecode difference and verification fails
with an unhelpful message.

### 6. Point the apps at Sepolia

```dotenv
CHAIN_ID="11155111"
RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
PROGRESS_TRACKER_ADDRESS="0x..."
INDEXER_START_BLOCK="<the deploy block number>"

NEXT_PUBLIC_CHAIN_ID="11155111"
NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS="0x..."
NEXT_PUBLIC_LEARN_TOKEN_ADDRESS="0x..."
```

Set `INDEXER_START_BLOCK` to the block your contract was deployed in. Leaving it at 0
makes the indexer scan Sepolia from genesis — millions of empty blocks, thousands of RPC
calls, and a rate-limit ban.

## Compiler profiles

`hardhat.config.ts` defines two:

```ts
solidity: {
  profiles: {
    default: { version: "0.8.28" },
    production: {
      version: "0.8.28",
      settings: { optimizer: { enabled: true, runs: 200 } },
    },
  },
}
```

The optimizer trades deployment cost against runtime cost. `runs: 200` means "optimise as
if each function is called about 200 times" — the usual default. Higher values produce
bigger bytecode that is cheaper to call.

Optimised and unoptimised builds produce **different bytecode**, so verify with the same
settings you deployed with.

## Before you deploy anything that matters

- [ ] Every test passes.
- [ ] You have read [08 · Security](08-security.md) and worked the checklist.
- [ ] Every state-changing function has an answer to "who may call this?"
- [ ] You know exactly what is immutable and what can be changed later.
- [ ] You have deployed the identical code to a testnet first and used it.
- [ ] The deployer key is not reused anywhere else.

For anything holding real value: get an audit. This is not a hedge, it is the rule.

## Next

- [06 · Frontend dApp](06-frontend-dapp.md) — talking to what you just deployed.
- [08 · Security](08-security.md) — before, not after.
