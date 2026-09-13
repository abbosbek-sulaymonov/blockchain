# Testing

Two test suites, two tools, two reasons.

| Suite                | Tool                  | Runs against                  |
| -------------------- | --------------------- | ----------------------------- |
| `packages/contracts` | Hardhat + `node:test` | An in-process EVM             |
| `apps/api`           | Vitest                | A stubbed chain client        |
| `apps/web`           | Vitest                | Pure helpers, stubbed `fetch` |

```bash
pnpm test                                  # everything
pnpm --filter @blockchain/contracts test   # contracts only
pnpm --filter @blockchain/api test         # API only
pnpm --filter @blockchain/api test:watch   # API, watch mode
pnpm --filter @blockchain/web test         # web helpers only
```

## Why contract tests matter more than usual

You cannot patch a deployed contract. There is no hotfix, no rollback, no "we will fix it
in the next release". The test suite is the last line of defence before permanence.

Test the **failure** paths at least as hard as the happy ones. Most exploits are a
successful call to a function that should have reverted.

## Contract tests

Hardhat 3 runs Node's built-in test runner against an in-process EVM. No node to start, no
network to wait for — 19 tests run in under a second.

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Greeter", async () => {
  const { viem } = await network.getOrCreate();

  it("stores the greeting given to the constructor", async () => {
    const greeter = await viem.deployContract("Greeter", ["gm"]);

    assert.equal(await greeter.read.greeting(), "gm");
  });
});
```

`viem.deployContract("Greeter", [...])` is fully typed from the compiled artifact — the
constructor arguments, the `read` methods, the `write` methods. Rename a function in
Solidity and the test stops compiling.

### A fixture per test, not per file

```ts
async function deployStack() {
  const [owner, learner] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const token = await viem.deployContract("LearnToken", [owner!.account.address]);
  const tracker = await viem.deployContract("ProgressTracker", [token.address]);

  const hash = await token.write.setMinter([tracker.address]);
  await publicClient.waitForTransactionReceipt({ hash });

  return { token, tracker, owner: owner!, learner: learner!, publicClient };
}
```

Each test deploys fresh. Shared mutable state between tests produces failures that depend
on execution order, which is the worst kind to debug.

Note that the fixture mirrors `scripts/deploy.ts` exactly, including `setMinter`. If the
tests wire the system differently from the deploy script, they are testing something you
will never ship.

### Testing as a different account

```ts
await tracker.write.completeMilestone([0], { account: learner.account });
```

Without `{ account }` everything runs as the first account, and access-control tests pass
for the wrong reason.

### Asserting reverts

```ts
await viem.assertions.revertWithCustomError(
  tracker.write.completeMilestone([12], { account: learner.account }),
  tracker,
  "InvalidMilestone",
);
```

Assert on the **specific** error. `assert.rejects` would also pass if the call failed for
an entirely unrelated reason — a typo in the address, say — and you would never know.

### Asserting events

```ts
await viem.assertions.emitWithArgs(
  tracker.write.completeMilestone([5], { account: learner.account }),
  tracker,
  "MilestoneCompleted",
  [learner.account.address, 5, (value: bigint) => value > 0n],
);
```

A predicate handles values you cannot know in advance, like `block.timestamp`.

### Time travel

```ts
await networkHelpers.time.increase(24 * 60 * 60 + 1);
```

The faucet cooldown test claims, asserts the second claim reverts, jumps a day forward, and
claims again. Testing time-dependent logic any other way means either sleeping for a day or
not testing it.

### What the contract suite covers

- Constructor state and metadata.
- Every happy path.
- Every custom error, triggered deliberately.
- Access control from the wrong account.
- Bitmap packing — that bits 0, 3 and 11 produce exactly 2057.
- The cross-contract failure: if `setMinter` was never called, `completeMilestone` reverts
  **and** leaves no partial state behind. That last assertion is the one that proves
  reverts are atomic.

## API tests

Fastify can inject requests without opening a socket:

```ts
const response = await app.inject({ method: "GET", url: "/api/leaderboard" });
expect(response.json().rows[0]).toMatchObject({ rank: 1, completedCount: 3 });
```

Fast, no ports, no cleanup.

The store is seeded by hand, so the HTTP layer is tested without a chain at all:

```ts
store.add(event(ALICE, 0, 10));
store.add(event(ALICE, 1, 11));
store.setLastIndexedBlock(13n);

const config = loadConfig({ NODE_ENV: "test", INDEXER_ENABLED: "false" });
app = await buildServer({ config, store });
```

`buildServer` taking its dependencies as arguments is what makes this possible. A module
that constructs its own chain client at import time cannot be tested without a chain.

### Testing the indexer without a chain

The indexer only calls two methods on the client, so the stub only implements two:

```ts
function stubClient(head: bigint, logsByRange: (from: bigint, to: bigint) => unknown[]) {
  return {
    getBlockNumber: vi.fn(async () => head),
    getContractEvents: vi.fn(async ({ fromBlock, toBlock }) => logsByRange(fromBlock, toBlock)),
  } as unknown as PublicClient;
}
```

That makes the genuinely hard cases trivial to test:

- **Confirmations** — with `confirmations: 2` and head 10, an event in block 9 must _not_
  be indexed yet.
- **Batching** — 13 blocks with `INDEXER_BATCH_SIZE=5` must produce exactly 3 `getLogs`
  calls.
- **Reorgs** — indexed to block 9, head comes back as 4, the store must drop the orphaned
  event and reset its cursor.

Simulating a reorg against a real chain is painful. Against a stub it is three lines.

## What is not tested here, and would be in production

- **Fuzzing / property tests.** Foundry's `forge test --fuzz` throws thousands of random
  inputs at an invariant. Worth learning after this roadmap.
- **Invariant tests.** "Total supply always equals the sum of balances", asserted across
  random call sequences.
- **Fork tests.** Running against a fork of real mainnet state, to test against real
  protocols instead of mocks.
- **Component tests.** `apps/web` covers its formatting helpers and its API client against
  a stubbed `fetch`, but renders nothing. The components are deliberately thin; testing
  them would mean jsdom plus a wagmi mock, which is a project of its own.
- **Gas snapshots.** Committing gas costs and failing CI when they regress.

## Writing a test in this repo

1. Write the test first and watch it fail. A test that has never failed proves nothing.
2. One behaviour per test, named as a sentence: `"rejects completing the same milestone twice"`.
3. Assert the specific error, not merely that something threw.
4. Test the boundary: milestone 11 works, milestone 12 reverts.
5. Test from the wrong account, not just the right one.

## Next

- [08 · Security](08-security.md) — what your tests should be trying to prove.
- [11 · Troubleshooting](11-troubleshooting.md) — when tests fail for environmental reasons.
