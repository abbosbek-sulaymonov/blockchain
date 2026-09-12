# Solidity

Milestones 3, 4 and 5. Written against the three contracts in `packages/contracts`.

## The mindset

Solidity looks like JavaScript and behaves nothing like it. Four facts change how you write:

1. **Code is immutable.** Once deployed, it cannot be patched. A bug is permanent.
2. **Everything is public.** `private` hides a variable from other _contracts_, not from
   people. All storage is readable by anyone with an RPC endpoint.
3. **Every operation costs money.** A loop over an unbounded array can become physically
   impossible to execute.
4. **Anyone can call anything.** Every `public` and `external` function is an API endpoint
   open to the entire internet, including contracts written to attack yours.

## Anatomy of a contract

From `Greeter.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Greeter {
  string public greeting; // storage — persists, costs gas
  address public immutable deployer; // set once in the constructor, then baked into code
  uint256 public changeCount;

  event GreetingChanged(address indexed author, string oldGreeting, string newGreeting);
  error EmptyGreeting();

  constructor(string memory initialGreeting) {
    greeting = initialGreeting;
    deployer = msg.sender;
  }

  function setGreeting(string calldata newGreeting) external {
    if (bytes(newGreeting).length == 0) revert EmptyGreeting();
    // ...
  }
}
```

Worth noticing:

- **`public` on a state variable generates a getter.** `greeting()` exists for free; you
  did not write it.
- **`immutable`** is stored in the contract's bytecode rather than in a storage slot.
  Reading it is nearly free. Use it for anything set once at deployment.
- **`msg.sender`** is whoever called this function — which may be a user, or another
  contract. Never assume it is a human.

## Storage, memory and calldata

The three data locations, and the reason gas bills look the way they do:

| Location   | Lifetime            | Cost                       | Used for                         |
| ---------- | ------------------- | -------------------------- | -------------------------------- |
| `storage`  | Forever, on-chain   | ~20,000 gas per fresh slot | State the contract must remember |
| `memory`   | One function call   | Cheap, grows quadratically | Scratch space                    |
| `calldata` | One call, read-only | Cheapest                   | `external` function arguments    |

Rule of thumb: use `calldata` for `external` parameters you only read, `memory` when you
need to modify a copy, and touch `storage` as little as you can.

A storage slot is 32 bytes. Writing one that was previously zero costs ~20,000 gas;
changing a non-zero one costs ~5,000. This single fact explains most Solidity design
decisions you will read about.

### The bitmap, and why milestone 5 exists

The obvious way to track 12 completions:

```solidity
mapping(address => mapping(uint8 => bool)) public completed; // ~20,000 gas per milestone
```

What `ProgressTracker` does instead:

```solidity
mapping(address learner => uint256 bitmap) private _completedBitmap;

uint256 mask = 1 << milestoneId;
if (bitmap & mask != 0) revert AlreadyCompleted(milestoneId);
_completedBitmap[msg.sender] = bitmap | mask;
```

One `uint256` holds 256 booleans in one slot. The first completion pays ~20,000 gas; the
next eleven pay ~5,000 each, because the slot is already non-zero. Reading all twelve
flags is a single storage read instead of twelve.

The cost: bit arithmetic instead of a readable mapping, and a hard 256-milestone ceiling.
That trade is the actual lesson — measure before you assume.

Milestone 5 is to build both and measure the difference yourself.

## Events

Events write to the transaction log, not to storage. They cost roughly 375 gas plus 375
per indexed parameter — far cheaper than storage.

```solidity
event MilestoneCompleted(address indexed learner, uint8 indexed milestoneId, uint256 completedAt);
```

**`indexed`** parameters become searchable topics. `getLogs` can filter on them; non-indexed
parameters are just data in the body. You get at most three indexed parameters per event.

**Contracts cannot read their own events.** Logs exist for the outside world. If contract
logic needs a value, it has to live in storage. This is exactly the split between
`ProgressTracker`'s bitmap (which the contract reads) and its events (which the indexer
reads).

## Errors

Three ways to fail, one of which you should actually use:

```solidity
revert EmptyGreeting();                  // custom error — cheap, typed, decodable
require(x > 0, "x must be positive");    // string — costs gas per character
assert(invariant);                        // for "this can never happen" only
```

Custom errors are cheaper (a 4-byte selector instead of a stored string) and carry
structured data:

```solidity
error InvalidMilestone(uint8 milestoneId);
```

viem and wagmi decode that back into a typed object, so the frontend can show
"Milestone 12 does not exist" rather than a hex blob. Prefer them.

**Reverting undoes everything** in the transaction — every storage write, every call to
another contract. There is no partial success. `ProgressTracker` relies on this: if the
reward mint fails, the milestone is not marked complete either. There is a test for
exactly that.

## Functions and visibility

| Modifier   | Callable from                               |
| ---------- | ------------------------------------------- |
| `external` | Outside only. Cheapest for large arguments. |
| `public`   | Outside and inside.                         |
| `internal` | This contract and children.                 |
| `private`  | This contract only.                         |

And state mutability:

| Modifier  | Meaning                                       |
| --------- | --------------------------------------------- |
| `view`    | Reads state, changes nothing. Free off-chain. |
| `pure`    | Touches no state at all.                      |
| `payable` | Can receive ETH.                              |
| (none)    | Modifies state. Costs gas.                    |

`view` functions called from outside cost nothing — they run via `eth_call` on one node.
Called from inside another transaction, they cost normal gas.

## Access control

`LearnToken` shows two patterns side by side:

```solidity
function setMinter(address newMinter) external onlyOwner { ... }   // a human
function mintReward(address to, uint256 amount) external onlyMinter { ... } // a contract
```

`onlyOwner` comes from OpenZeppelin's `Ownable`; `onlyMinter` is a hand-written modifier.
A modifier runs before the body, and `_;` is where the body is spliced in.

For anything beyond two roles, use OpenZeppelin's `AccessControl` — role-based permissions
with events, so who-can-do-what is auditable from outside.

**Gotcha:** forgetting access control on one function is the most common contract
vulnerability there is. Every state-changing function needs an answer to "who may call
this?", even if the answer is "anyone".

## Contract-to-contract calls

`ProgressTracker` calls `LearnToken`:

```solidity
rewardToken.mintReward(msg.sender, REWARD_PER_MILESTONE);
```

Note where it sits in the function: **last**, after every storage write. That is
checks-effects-interactions, and it is not a style preference:

```solidity
// 1. Checks    — validate inputs, revert early
if (milestoneId >= TOTAL_MILESTONES) revert InvalidMilestone(milestoneId);

// 2. Effects   — update your own state
_completedBitmap[msg.sender] = bitmap | mask;

// 3. Interactions — call out to other contracts
rewardToken.mintReward(msg.sender, REWARD_PER_MILESTONE);
```

An external call hands control to code you do not own. That code can call back into you
before your function has finished. If your state is already updated, the re-entry sees
correct values and there is nothing to exploit. If it is not, you have a reentrancy bug —
which is milestone 11. See [08 · Security](08-security.md).

## Inheritance and OpenZeppelin

```solidity
contract LearnToken is ERC20, Ownable { ... }
```

Do not hand-roll standards. OpenZeppelin's ERC-20 has been audited and attacked for years;
yours has not. Reading its source is one of the most useful exercises in this roadmap —
writing your own replacement is how people lose money.

Install pattern already set up here:

```solidity
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
```

Named imports (`{ERC20}`) rather than whole-file imports keep the compiled artifact
smaller and make dependencies obvious.

## Integer behaviour

Since Solidity 0.8, arithmetic reverts on overflow and underflow by default. Before that
it wrapped silently, which caused real exploits. You can opt out with `unchecked { }` when
you have proven a value cannot overflow — as in a bounded loop counter.

There are **no floating-point numbers**. Token amounts are integers scaled by their
decimals: 100 LEARN is `100 * 10^18`. All formatting happens off-chain:

```ts
formatUnits(balance, 18); // "100.0"
parseEther("100"); // 100000000000000000000n
```

Do not try to represent fractions in Solidity. Scale up, and divide last.

## Milestone exercises

**Milestone 3** — add a per-author change counter to `Greeter` plus an event for it. Write
the test first, watch it fail, then make it pass.

**Milestone 4** — give `LearnToken` a supply cap enforced on every mint, and a `burn`
function. Test the failure paths, not just the happy one.

**Milestone 5** — build both tracker designs, measure gas for each, and write down why the
difference exists.

## Next

- [09 · Testing](09-testing.md) — how to prove any of this works.
- [05 · Deploying](05-deploying.md) — getting it onto a real network.
- [08 · Security](08-security.md) — read before you deploy anything.
