# Indexing and the backend

Milestone 10. Why an off-chain service exists at all, and how `apps/api` works.

## Why not just read the chain

A chain is a terrible database. It has no indexes, no joins, no sorting, no aggregation.
It answers exactly two questions well:

- "What is the value of this storage slot right now?"
- "Which logs match this filter, in this block range?"

Everything else — a leaderboard, a history feed, "how many people finished milestone 5" —
means fetching every relevant log and computing the answer yourself.

Doing that in the browser on every page load means:

- Scanning the contract's entire history, every time, for every user.
- Hitting RPC rate limits. Most public providers cap `getLogs` at a few thousand blocks
  and throttle aggressively.
- Recomputing the same aggregate for every visitor.

So you compute it once, off-chain, and serve it. Every serious dApp has an indexer behind
it, whether they built it, use The Graph, or pay a provider.

## Events are the interface

Contracts emit logs so the outside world can follow along cheaply:

```solidity
event MilestoneCompleted(address indexed learner, uint8 indexed milestoneId, uint256 completedAt);
```

`indexed` parameters become searchable topics. `eth_getLogs` filters on address and topics:

```ts
const logs = await client.getContractEvents({
  address: contractAddress,
  abi: progressTrackerAbi,
  eventName: "MilestoneCompleted",
  fromBlock: 0n,
  toBlock: 1000n,
  strict: true,
});
```

`strict: true` makes viem drop any log whose arguments do not decode against the ABI,
which is what lets `indexRange` read `log.args.learner` without null checks.

Design consequence: if you might want to query something later, **emit an event for it
now**. Adding one after deployment does not retroactively create history.

## The three jobs of an indexer

### 1. Backfill

Walk from a known start block to the head in bounded ranges:

```ts
let cursor = config.INDEXER_START_BLOCK;
while (cursor <= safeHead) {
  const toBlock = min(cursor + config.INDEXER_BATCH_SIZE - 1n, safeHead);
  await this.#indexRange(cursor, toBlock);
  this.#store.setLastIndexedBlock(toBlock);
  cursor = toBlock + 1n;
}
```

Batching is not optional. Ask a public RPC for logs across a million blocks and it will
refuse, time out, or ban you. 2,000 blocks per call is a safe default.

**Gotcha:** set `INDEXER_START_BLOCK` to the block your contract was deployed in. Leaving
it at 0 on a public chain scans millions of empty blocks before reaching anything.

### 2. Follow the head

Poll for new blocks and index the gap:

```ts
const fromBlock = lastIndexed === null ? config.INDEXER_START_BLOCK : lastIndexed + 1n;
```

This implementation polls on a timer. The alternatives, in rough order of sophistication:

| Approach                     | Trade-off                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| Polling (`setTimeout`)       | Simple, works with any RPC. Latency equals the interval.    |
| WebSocket subscriptions      | Lower latency. Needs a WS endpoint; must handle reconnects. |
| A hosted indexer (The Graph) | No infrastructure. Less control, and a dependency.          |

Polling is used here because it is the one you can read end to end in ten minutes.

### 3. Survive reorgs

Recent blocks can be **reorganised** — two validators briefly produce competing blocks, one
chain wins, and the loser's transactions are unwound. A transaction you already indexed can
stop existing.

Two defences, both in `indexer.ts`:

**Confirmations.** Stay a few blocks behind the head, so a one-block reorg never reaches
the store:

```ts
#safeHead(head: bigint): bigint {
  return head > this.#confirmations ? head - this.#confirmations : 0n;
}
```

On a local Hardhat node the default is **0**, because that node only mines when you send a
transaction — any positive value would leave your newest events permanently unconfirmed.
On public chains the default is 2. Override with `INDEXER_CONFIRMATIONS`.

This is exactly the kind of correct-but-surprising behaviour worth understanding: the
first version of this indexer used 2 everywhere and appeared to silently lose the two most
recent events on a local chain.

**Rollback.** If the head moves backwards, drop what is no longer canonical:

```ts
if (lastIndexed !== null && safeHead < lastIndexed) {
  const dropped = this.#store.rollbackFrom(safeHead + 1n);
  this.#store.setLastIndexedBlock(safeHead);
  return;
}
```

This also covers the everyday case of restarting `pnpm chain`: the chain resets to block 0
while the indexer remembers block 40.

## Idempotency

Logs get delivered more than once — overlapping ranges, retries, replayed blocks. Indexing
the same event twice would double-count the leaderboard.

The store dedupes on `${blockNumber}:${logIndex}`, which uniquely identifies a log within a
chain:

```ts
add(event: MilestoneEvent): boolean {
  const key = `${event.blockNumber}:${event.logIndex}`;
  if (this.#seen.has(key)) return false;
  // ...
}
```

Returning `false` rather than throwing matters: duplicate delivery is normal operation,
not an error.

**Write every indexer to be idempotent.** Reprocessing the same range must produce the same
state. Once that holds, recovery is just "re-index from block N", and most failure modes
stop being scary.

## The API surface

| Endpoint                     | Returns                                         |
| ---------------------------- | ----------------------------------------------- |
| `GET /health`                | Liveness. Says nothing about the chain.         |
| `GET /api/status`            | Indexer state: head, last indexed, counts.      |
| `GET /api/milestones`        | The roadmap, so the frontend hardcodes no copy. |
| `GET /api/events`            | Recent completions, newest first.               |
| `GET /api/progress/:address` | One learner's aggregated progress.              |
| `GET /api/leaderboard`       | Ranked by completions.                          |
| `GET /api/stats/milestones`  | Completions per milestone.                      |

`/api/status` is the first thing to check when the UI looks wrong. It tells you which
contract the indexer is watching, how far behind the head it is, and whether it is still
backfilling.

## BigInt over the wire

`JSON.stringify` throws on a `bigint`. Every block number and token amount crossing the
HTTP boundary is serialized as a decimal string:

```ts
app.setSerializerCompiler(() => (data) => JSON.stringify(data, bigintReplacer));
```

The alternative — converting to `Number` — silently loses precision above 2^53, which
token amounts exceed routinely. Strings are the boring, correct answer.

## Milestone 10: make it durable

The store is in-memory, so a restart re-backfills from scratch. Fine locally, useless in
production.

Replace `EventStore` with SQLite (`better-sqlite3` is a good fit) and:

1. Persist events in a table with a unique constraint on `(block_number, log_index)` —
   the database enforces idempotency for you.
2. Persist `lastIndexedBlock` so a restart resumes instead of re-scanning.
3. Move the leaderboard and stats into SQL aggregates rather than JavaScript loops.
4. Keep `rollbackFrom` as `DELETE FROM events WHERE block_number >= ?`.

**Leave the route handlers untouched.** If you have to change them, the boundary was in the
wrong place — and finding that out is the real point of the exercise.

## Next

- [08 · Security](08-security.md) — the backend has its own attack surface.
- [09 · Testing](09-testing.md) — how the indexer is tested without a live chain.
