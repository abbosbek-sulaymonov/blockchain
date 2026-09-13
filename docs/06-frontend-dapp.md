# The frontend dApp

Milestones 7, 8 and 9. wagmi + viem in a Next.js App Router app.

## The two libraries

**viem** is the low-level client: encode a call, send it, decode the result. Framework
agnostic. The API uses it directly, with no React involved.

**wagmi** wraps viem in React hooks and adds the things a UI needs — connection state,
account, chain, caching. Under the hood every wagmi hook is a TanStack Query hook, which
is why `isLoading`, `isError` and `refetch` are all there.

Rule of thumb: hooks in components, viem directly in scripts and servers.

## Setup

Three pieces, in `src/lib/wagmi.ts` and `src/app/providers.tsx`:

```ts
export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(env.rpcUrl),
    [sepolia.id]: http(),
  },
  ssr: true,
});
```

- **`chains`** — every network the app supports. Declaring both means switching networks
  in the wallet does not break the app.
- **`connectors`** — `injected()` covers any EIP-1193 browser wallet: MetaMask, Rabby,
  Brave, Coinbase extension. Adding WalletConnect later is one more entry here.
- **`ssr: true`** — without it, wagmi reaches for `window` during server rendering and the
  page crashes on first load.

Then the providers, in this order:

```tsx
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
</WagmiProvider>
```

The `QueryClient` is created inside `useState` so each browser session gets exactly one and
a server render never shares a cache between two users' requests.

**Gotcha:** anything using a wagmi hook must be a client component. A wallet lives in the
browser; a server component cannot reach it. Missing `"use client"` produces a confusing
error about hooks in server components.

## Connecting a wallet (milestone 7)

```tsx
const { address, isConnected } = useAccount();
const { connectors, connect, isPending, error } = useConnect();
const { disconnect } = useDisconnect();
```

`ConnectWallet.tsx` handles the three states people actually hit:

1. **No wallet installed** — `connectors` is empty. Link somewhere useful rather than
   rendering a button that cannot work.
2. **Not connected** — a button per connector.
3. **Connecting** — disable the button. Without this, users double-click and fire two
   requests, and the wallet's second dialog looks like a bug.

And the fourth, in `NetworkBanner.tsx`: **connected to the wrong chain**. A wallet can be
on any network it likes, including one your app has never heard of. Reading a contract
address for the wrong chain returns nothing, and "why is everything zero?" is the most
common first-dApp bug there is. Detect it and offer `switchChain`.

Milestone 7 is to break each of these on purpose and fix what you find.

## Reading contract state (milestone 8)

```tsx
const {
  data: bitmap,
  refetch,
  isLoading,
} = useReadContract({
  address: contractAddress,
  abi: progressTrackerAbi,
  functionName: "completedBitmap",
  args: address ? [address] : undefined,
  query: {
    enabled: Boolean(address && contractAddress),
  },
});
```

Points worth dwelling on:

- **`enabled`** stops the call firing before you have an address and a deployment.
  Without it wagmi throws on every render while the user is disconnected.
- **The ABI is a typed constant.** Because `progressTrackerAbi` is `as const`,
  TypeScript knows `completedBitmap` takes one address and returns a `bigint`. Rename the
  function in Solidity, rebuild, and this line becomes a compile error rather than a
  runtime failure.
- **One call, twelve booleans.** `completedBitmap` returns a packed `uint256`, decoded
  client-side by `decodeBitmap`. Calling `hasCompleted` twelve times would be twelve
  round trips.

### Why the UI goes stale

A read is cached. The chain moves. Nothing tells React.

`staleTime: 10_000` in the `QueryClient` bounds how long a cached value is served without
refetching. After a write, invalidate explicitly — see below. Do not raise `staleTime`
to hide a bug; reach for it only when you have decided a few seconds of staleness is
acceptable for that value.

## Writing to a contract (milestone 9)

Four steps, and beginners stop after the second:

```tsx
// 1. Ask the wallet to sign and broadcast.
const { writeContract, data: txHash, isPending: isSigning, error } = useWriteContract();

// 2. Wait for it to be mined.
const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({
  hash: txHash,
});

// 3. When it is mined, the chain changed — read it again.
useEffect(() => {
  if (isMined) void refetch();
}, [isMined, refetch]);
```

**A transaction hash is a promise, not a result.** `writeContract` resolving means the
wallet accepted it, nothing more. Until the receipt arrives the transaction may still
fail — and a receipt with `status: "reverted"` means it failed _and_ the user paid.

The states a user can be in, all of which need UI:

| State                  | What they see                          |
| ---------------------- | -------------------------------------- |
| Idle                   | An enabled button.                     |
| Waiting on the wallet  | "Check your wallet", button disabled.  |
| Rejected in the wallet | A readable message, button re-enabled. |
| Mining                 | "Confirming…", with the tx hash shown. |
| Mined                  | Fresh data, an explorer link.          |
| Reverted               | The revert reason, in plain language.  |

### Simulate first

The improvement milestone 9 asks for:

```tsx
const { data: simulation, error: simulationError } = useSimulateContract({
  address: contractAddress,
  abi: progressTrackerAbi,
  functionName: "completeMilestone",
  args: [milestoneId],
});

// Only enable the button when the simulation succeeds.
writeContract(simulation!.request);
```

Simulation runs the transaction against current state without sending it. If it would
revert, you know **before** the wallet dialog opens — so the user never pays gas to
discover that they already completed that milestone.

### Errors are enormous

Wallet and RPC errors arrive as multi-paragraph dumps with stack traces. The useful part
is the first line:

```tsx
function shortenError(message: string): string {
  return message.split("\n")[0] ?? message;
}
```

Showing the whole thing trains users to ignore errors entirely.

Because the contracts use custom errors, viem decodes them: `AlreadyCompleted(2)` comes
back as a named error with arguments, not a hex blob. That is worth the small extra
effort in Solidity.

## Reading from the chain versus reading from the API

Both appear in this app, deliberately:

| Data                      | Source   | Why                                        |
| ------------------------- | -------- | ------------------------------------------ |
| This user's completions   | Contract | Must be current. One cheap `eth_call`.     |
| This user's LEARN balance | Contract | Same.                                      |
| Leaderboard               | API      | Needs every event ever emitted.            |
| Activity feed             | API      | History means scanning a block range.      |
| Per-milestone stats       | API      | An aggregate across all users.             |
| Another learner's profile | API      | Public history for an address you are not. |

Get this split wrong and you either build something unusably slow (aggregates from the
chain) or something that lies (live balances from a cache).

## BigInt in the UI

Every on-chain number is a `bigint`. Two consequences:

```ts
formatUnits(balance, 18); // 100000000000000000000n -> "100.0"
parseEther("100"); // "100" -> 100000000000000000000n
```

And `JSON.stringify` throws on a `bigint`. The API serializes them as decimal strings —
see `bigintReplacer` in `apps/api/src/server.ts` — and the frontend parses them back with
`BigInt(value)` where it needs arithmetic.

Never convert a token amount to `Number` for anything but display. `Number` loses
precision above 2^53, and balances routinely exceed it.

## Next

- [07 · Indexing](07-indexing-backend.md) — where the leaderboard comes from.
- [11 · Troubleshooting](11-troubleshooting.md) — when the UI will not update.
