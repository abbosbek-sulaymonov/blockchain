# Glossary

Terms you will meet in this repo and in every Web3 codebase.

## Core concepts

**ABI** (Application Binary Interface) — a JSON description of a contract's functions and
events. It is the decoder ring that turns `completeMilestone(5)` into calldata and turns a
log back into typed arguments. Generated here into `packages/shared/src/generated/abis.ts`.

**Account** — either an EOA (controlled by a private key) or a contract (controlled by
code). Only an EOA can start a transaction.

**Address** — a 20-byte identifier, shown as 40 hex characters after `0x`. Derived from a
public key for an EOA; derived from the deployer and nonce for a contract.

**Block** — a batch of transactions with a timestamp and a parent hash.

**`block.timestamp`** — the block's time in Unix seconds, set by the validator with limited
room to lie. Fine for day-scale cooldowns, useless as randomness.

**Bytecode** — compiled EVM instructions. What actually lives at a contract address.

**Calldata** — the `data` field of a transaction: a 4-byte function selector followed by
ABI-encoded arguments. Also a Solidity data location for read-only `external` arguments.

**Chain id** — identifies a network. 1 mainnet, 11155111 Sepolia, 31337 local Hardhat. Part
of a signature, so a transaction signed for one chain cannot be replayed on another.

**EOA** (Externally Owned Account) — an account controlled by a private key.

**EVM** (Ethereum Virtual Machine) — the runtime every node executes. "EVM-compatible"
chains run the same bytecode.

**Finality** — the point at which a block can no longer be reorganised.

**Gas** — the unit of computational cost. Every EVM operation has a fixed price in gas.

**Gas price** — what you pay per unit. Since EIP-1559: a burned base fee plus a priority
fee tip.

**Genesis block** — block 0.

**Log / Event** — data a contract emits for the outside world. Cheaper than storage.
Contracts cannot read logs back.

**Mempool** — the public queue of broadcast, not-yet-mined transactions. Visible to
everyone, which is what makes front-running possible.

**Nonce** — a per-sender transaction counter that must increase by one each time. Prevents
replay; also the reason a wallet breaks after a local chain restart.

**Reorg** (reorganisation) — the chain switching to a different branch, unwinding
transactions that had already been included.

**Revert** — abort a transaction and undo every state change in it. Gas already spent is
not refunded.

**RPC** (Remote Procedure Call) — the JSON-RPC HTTP interface every node exposes.

**Selector** — the first 4 bytes of `keccak256("functionName(argTypes)")`. How the EVM
knows which function you meant.

**Slot** — a 32-byte unit of contract storage. ~20,000 gas to write a fresh one.

**Wei** — the smallest unit of ETH. 1 ETH = 10^18 wei. All on-chain amounts are integers.

## Solidity

**`calldata` / `memory` / `storage`** — the three data locations. Read-only call data,
temporary scratch, and permanent on-chain state respectively.

**Custom error** — `error Foo(uint8 bar)`. Cheaper than a require string and decodable by
viem into typed data.

**`immutable`** — set once in the constructor, then baked into bytecode. Nearly free to read.

**Modifier** — reusable code that wraps a function body. `_;` marks where the body goes.

**`msg.sender`** — whoever called the current function. May be a contract.

**`msg.value`** — wei sent with the call. Requires `payable`.

**`payable`** — a function that may receive ETH.

**`pure` / `view`** — touches no state / reads state but changes nothing. Both free when
called from outside.

**`revert`** — abort and undo. `revert CustomError()` is the modern form.

**`unchecked`** — disables overflow checks in a block. Only where overflow is provably
impossible.

## Standards

**ERC-20** — the fungible token interface: `balanceOf`, `transfer`, `approve`,
`transferFrom`, plus `Transfer` and `Approval` events. `LearnToken` implements it.

**ERC-721** — non-fungible tokens (NFTs). Each token id has one owner.

**ERC-1155** — multi-token: fungible and non-fungible in one contract.

**ERC-4337** — account abstraction. Smart-contract wallets, gasless transactions, session
keys.

**EIP-1559** — the fee mechanism: burned base fee plus a priority tip.

**EIP-1193** — the JavaScript interface a browser wallet exposes. What `injected()` talks to.

## Tooling

**Etherscan** — block explorer. Also where you verify source code.

**Faucet** — a service handing out free testnet tokens. Also the self-serve mint in
`LearnToken`.

**Foundry** — Solidity-native toolchain (`forge`, `cast`, `anvil`). Tests are written in
Solidity. Worth learning after this roadmap.

**Hardhat** — the JavaScript/TypeScript toolchain used here. Compile, test, deploy.

**Indexer** — a service that reads logs and stores them queryably. `apps/api`.

**OpenZeppelin** — the standard audited contract library. Inherit from it; do not
reimplement it.

**The Graph** — hosted indexing protocol. Subgraphs are the industry-standard alternative
to writing your own indexer.

**viem** — typed, low-level TypeScript client for Ethereum.

**wagmi** — React hooks built on viem.

## Money and risk

**MEV** (Maximal Extractable Value) — profit available from reordering, inserting or
censoring transactions within a block.

**Front-running** — seeing a transaction in the mempool and getting yours in first.

**Sandwich attack** — a buy before and a sell after someone's trade, extracting the spread.

**Rug pull** — a deployer draining a project, usually via a privileged function nobody read.

**Slippage** — the gap between the expected and executed price of a trade.

## Layers

**L1** — a base chain that provides its own security. Ethereum.

**L2** — a chain that settles to an L1. Arbitrum, Optimism, Base. Much cheaper; calldata
cost usually dominates fees.

**Rollup** — an L2 that posts transaction data to the L1 so anyone can reconstruct its
state. Optimistic rollups assume validity with a challenge window; ZK rollups prove it.

**Bridge** — moves assets between chains. Historically the most-exploited component in the
entire ecosystem.
