# Ethereum fundamentals

Milestones 1 and 2. What is actually happening under every library in this repo.

## A blockchain is a replicated state machine

Strip away the vocabulary and Ethereum is:

- A **state**: a big key-value map of addresses to balances, code and storage.
- **Transitions**: transactions that modify that state, executed by the EVM.
- **Agreement**: thousands of machines running the same transitions and getting the same
  answer, so no single one has to be trusted.

Blocks are just batches of transitions, chained by hash so history cannot be rewritten
quietly.

The expensive part is not computation, it is _agreement_. Every node re-executes every
transaction. That is why gas exists, why storage costs so much, and why "just put it
on-chain" is almost always the wrong instinct.

## A node is a JSON-RPC server

This is the single most demystifying fact for a web developer. `pnpm chain` starts an HTTP
server. Talk to it with curl:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
```

```json
{ "jsonrpc": "2.0", "id": 1, "result": "0x8" }
```

That is it. viem, wagmi, ethers, web3.js — all of them are typed wrappers around roughly
twenty methods like this one. The ones you will meet constantly:

| Method                      | Question it answers                                  |
| --------------------------- | ---------------------------------------------------- |
| `eth_blockNumber`           | What is the current height?                          |
| `eth_getBalance`            | How much ETH does this address hold?                 |
| `eth_call`                  | What would this read return? (free, no state change) |
| `eth_estimateGas`           | What would this transaction cost?                    |
| `eth_sendRawTransaction`    | Broadcast this signed transaction.                   |
| `eth_getTransactionReceipt` | Did it get mined, and did it succeed?                |
| `eth_getLogs`               | Which events matched this filter?                    |

Note the numbers come back as hex strings. Ethereum values routinely exceed
`Number.MAX_SAFE_INTEGER`, so every library parses them into `bigint`. This is why
`1n` and `parseEther("1")` show up everywhere.

## Accounts

Two kinds, and the distinction matters:

**EOA (externally owned account)** — controlled by a private key. A random 256-bit number
is the key; the address is derived from its public key. Nobody issues it and nobody can
revoke it. Only an EOA can start a transaction.

**Contract account** — controlled by code. It has storage and bytecode but no key. It
cannot act on its own; it only runs when something calls it.

```ts
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log(account.address); // derived, not assigned
```

Nothing above touches the network. Address generation is pure local maths. This is also
why a leaked key is final: the address _is_ the key. There is no password reset.

## Gas

Every EVM operation has a fixed gas cost. Addition is 3. A `SHA3` is 30. Writing a storage
slot that was previously zero is 20,000 — roughly 6,000 additions, for one write.

```
fee = gas used x gas price
```

Since EIP-1559 the price splits in two:

- **Base fee** — set by the protocol from recent demand, and _burned_.
- **Priority fee** — your tip to the validator for including you.

Three rules worth internalising:

1. **Failed transactions still cost gas.** The work was done; the state change was undone.
2. **Reads are free.** `eth_call` runs on one node and changes nothing, so nobody charges.
   Every `view` function in this repo costs zero.
3. **Storage dominates.** If a contract feels expensive, it is almost always writing
   storage it does not need to. See [04 · Solidity](04-solidity.md).

## What is in a transaction

```ts
{
  from:  "0xf39F...2266",   // derived from the signature, not a field you set
  to:    "0x9fe4...a6e0",   // an address, or null when deploying
  value: 0n,                 // wei of ETH to send
  data:  "0x2ba3f8f1...",    // which function, with which arguments
  nonce: 3,                  // this sender's transaction counter
  gas:   120000n,            // maximum you will pay for
}
```

**`data`** is where a contract call lives: the first 4 bytes are the function selector
(the first 4 bytes of the keccak hash of `completeMilestone(uint8)`), followed by the
ABI-encoded arguments. That is the entire mechanism behind an ABI — it is a decoder ring
for this field.

**`nonce`** must increase by exactly one per sender. It is what stops someone replaying
your signed transaction, and it is why restarting a local node breaks your wallet: the
chain resets to nonce 0 while your wallet still remembers 7. Fix in
[11 · Troubleshooting](11-troubleshooting.md).

## Signing versus sending

Two different operations that beginners conflate:

**Signing** proves you hold a key. It is offline, instant and free.

```ts
const signature = await account.signMessage({ message: "hello" });
```

**Sending** broadcasts a signed transaction and asks the network to execute it. It costs
gas and takes time.

Signing a message is how "Sign in with Ethereum" works — no transaction, no fee, just
proof of key ownership. Verification recovers the address from the signature:

```ts
import { verifyMessage } from "viem";

const valid = await verifyMessage({
  address: account.address,
  message: "hello",
  signature,
});
```

Change one character of the message and `valid` is false. That is milestone 2.

**Gotcha:** never sign a message you did not read. A malicious site can ask you to sign
something that looks harmless but is actually an off-chain order granting a third party
your tokens. Signatures are not always harmless just because they are free.

## Blocks and finality

A block contains transactions, a timestamp and a parent hash. `block.timestamp` in
Solidity is that field — the miner or validator sets it, with limited room to lie. It is
fine for "one claim per day" cooldowns and useless as a source of randomness.

Recent blocks can be **reorganised**. Two validators can briefly produce competing blocks;
one chain wins and the other's transactions are unwound. A confirmed transaction can
therefore un-confirm.

That is why the indexer stays a couple of blocks behind the head on public chains, and why
it can roll back — see [07 · Indexing](07-indexing-backend.md). On a local chain reorgs
never happen, so it uses zero confirmations.

## Try it

Milestone 1, in about fifteen lines:

```ts
import { createPublicClient, http, formatEther } from "viem";
import { hardhat } from "viem/chains";

const client = createPublicClient({ chain: hardhat, transport: http() });

const block = await client.getBlock();
console.log("height:", block.number, "txs:", block.transactions.length);

const balance = await client.getBalance({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
});
console.log("balance:", formatEther(balance), "ETH");
```

Run it against `pnpm chain`. Then send a transaction from the dApp and fetch its receipt
with `client.getTransactionReceipt({ hash })`. Look at `gasUsed`, `status` and `logs` —
those `logs` are what the indexer consumes.

## Next

- [04 · Solidity](04-solidity.md) — writing the code that runs on this machine.
- [10 · Glossary](10-glossary.md) — every term above, defined in one line.
