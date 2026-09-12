# Troubleshooting

Ordered roughly by how often each one happens.

## Wallet and transactions

### "Nonce too high" / "Invalid nonce" after restarting the chain

The chain reset to block 0; your wallet still remembers nonce 7.

**Fix (MetaMask):** Settings → Advanced → **Clear activity tab data**. This clears the
cached nonce, not your account.

Expect this every time you restart `pnpm chain`. It is not a bug in your code.

### The transaction succeeded but the UI shows the old value

A read was cached and nothing invalidated it. After a write, wait for the receipt and then
refetch:

```tsx
const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

useEffect(() => {
  if (isSuccess) void refetch();
}, [isSuccess, refetch]);
```

See [06 · Frontend dApp](06-frontend-dapp.md).

### Everything reads as zero or empty

Almost always the wrong network. The app is configured for one chain id and the wallet is
on another, so it is reading an address that holds no code.

Check the banner at the top of the page, and check `NEXT_PUBLIC_CHAIN_ID` matches the
network in your wallet.

### "Execution reverted" with no reason

Read the first line of the error — viem decodes custom errors into names. Common ones here:

| Error                        | Cause                                                |
| ---------------------------- | ---------------------------------------------------- |
| `AlreadyCompleted`           | That milestone is already done for this address.     |
| `InvalidMilestone`           | Id outside 0–11.                                     |
| `NotMinter`                  | `setMinter` was never called after deployment.       |
| `FaucetCooldownActive`       | Less than 24 hours since the last claim.             |
| `OwnableUnauthorizedAccount` | Calling an owner-only function from another account. |

If the reason really is missing, simulate the call — `useSimulateContract` or
`publicClient.simulateContract` — which runs it without sending and returns a decoded error.

### The wallet never opens

Usually a missing `"use client"` at the top of the component, or the component is being
server-rendered. Wagmi hooks only work in client components.

## Local chain

### `ECONNREFUSED 127.0.0.1:8545`

`pnpm chain` is not running, or it died. Check the terminal you started it in.

### Deployment addresses differ from the committed ones

Addresses are derived from deployer and nonce. If you deployed something else first, or
deployed twice without restarting the node, the nonce differs and so do the addresses.

Restart `pnpm chain` for a clean nonce, redeploy, and the addresses match again.

### The indexer shows events but the leaderboard is empty (or vice versa)

Check `GET /api/status`. It tells you which contract address the indexer is watching. If it
does not match the address the frontend is using, one of them has a stale `.env` value or a
stale `deployments.json`.

### The newest events never appear in the feed

On a public chain this is normal — the indexer stays `INDEXER_CONFIRMATIONS` blocks behind
the head on purpose.

On a local chain it means confirmations are not zero. The Hardhat node only mines when you
send a transaction, so the last N blocks never get more confirmations. Set
`INDEXER_CONFIRMATIONS=0`, or rely on the default, which is 0 for chain id 31337.

## Build and install

### `Cannot find module '@blockchain/shared'`

Run `pnpm install` at the repo root, then `pnpm build`. `@blockchain/shared` is compiled to
`dist/`, and the apps import the build output, not the source.

### `Cannot find module '@blockchain/tsconfig/node.json'`

The package declaring that `extends` is missing `@blockchain/tsconfig` from its
`devDependencies`. Add `"@blockchain/tsconfig": "workspace:*"` and reinstall.

### Contract types are `any`, or `.read` does not exist in a test

Hardhat writes type augmentations into `artifacts/**/artifacts.d.ts`. They only exist after
a compile, and the tsconfig must include them.

```bash
pnpm --filter @blockchain/contracts build
```

`artifacts/` is gitignored, so this is the first thing that breaks on a fresh clone.

### The frontend does not see a function you just added to a contract

ABIs are generated at build time. Rebuild:

```bash
pnpm --filter @blockchain/contracts build
```

That recompiles and regenerates `packages/shared/src/generated/abis.ts`.

### `pnpm format:check` fails in CI but passes locally

Run `pnpm format` and commit the result. Generated files under
`packages/shared/src/generated` are in `.prettierignore` on purpose.

### Turbo says a task is cached but you want it to rerun

```bash
pnpm build --force
```

Or `rm -rf .turbo` for a full reset.

## Testnet

### The deployment hangs forever

The RPC is rate-limiting, or the gas price you offered is below the current base fee. Try a
different endpoint; a free Alchemy or Infura key is far more reliable than the public ones.

### Verification fails with a bytecode mismatch

Three usual causes:

1. Constructor arguments do not match exactly — including address checksum casing.
2. The optimizer settings differ from the ones used to deploy.
3. A different compiler version.

All three must match the deployment exactly.

### The indexer is slow or gets rate-limited on Sepolia

`INDEXER_START_BLOCK` is still 0, so it is scanning the chain from genesis. Set it to the
block your contract was deployed in. Lower `INDEXER_BATCH_SIZE` if the provider caps
`getLogs` ranges below 2,000.

## Still stuck

1. `GET /api/status` — what is the indexer actually doing?
2. Browser devtools console — the real error is usually the first line, not the stack.
3. The terminal running `pnpm chain` — it logs every transaction and every revert reason.
4. `pnpm test` — if the contract tests pass, the bug is in the wiring, not the contract.
