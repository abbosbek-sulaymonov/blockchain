# Security

Milestone 11, and required reading before any deployment.

Smart contract bugs are different from web bugs in three ways: the code cannot be patched,
the money is immediately at stake, and the attackers are automated, well funded and
watching every new deployment.

## Key handling

This is where beginners actually lose money — not to clever exploits, to leaked keys.

**Rules:**

1. **Never commit a private key.** `.env` is gitignored here. Check `git status` before
   every commit.
2. **Never reuse a testnet key on mainnet.** Testnet keys end up in logs, screenshots and
   shell history.
3. **Never paste a key into a website**, however official it looks.
4. **Use a separate wallet per purpose.** Deployment, testing, and personal funds should
   never share a key.
5. **A key in a public repo is gone within minutes.** Bots watch GitHub's event firehose
   for exactly this. Assume compromise the moment it is pushed, even if you force-push it
   away — the commit is already cloned.

The private keys `pnpm chain` prints are publicly known. They are safe on a local chain
and nowhere else.

## Reentrancy

The classic. An external call hands control to code you do not own, and that code can call
back into you before your function has finished.

**Vulnerable:**

```solidity
function withdraw() external {
  uint256 amount = balances[msg.sender];
  (bool ok, ) = msg.sender.call{ value: amount }(""); // interaction FIRST
  require(ok);
  balances[msg.sender] = 0; // effect too late
}
```

The attacker's `receive()` calls `withdraw()` again. `balances[msg.sender]` is still
unchanged, so it pays out again. And again.

**Fixed — checks-effects-interactions:**

```solidity
function withdraw() external {
  uint256 amount = balances[msg.sender]; // checks
  balances[msg.sender] = 0; // effects
  (bool ok, ) = msg.sender.call{ value: amount }(""); // interactions LAST
  require(ok);
}
```

Now the re-entry sees a zero balance and gets nothing.

`ProgressTracker.completeMilestone` follows this ordering deliberately: the bitmap is
written before `rewardToken.mintReward` is called. The comment in the source says so.

For extra safety, OpenZeppelin's `ReentrancyGuard` adds a `nonReentrant` modifier. Use it
as a belt to the ordering's braces, not as a replacement for it.

The DAO hack in 2016 lost about $60M to exactly this bug, and it still ships in new code
today. Milestone 11 is to write a working exploit yourself.

## Access control

The most common vulnerability in the wild is simply a missing modifier.

```solidity
function setMinter(address newMinter) external { ... }             // anyone can call this
function setMinter(address newMinter) external onlyOwner { ... }   // fixed
```

**Every state-changing function needs an explicit answer to "who may call this?"** — even
when the answer is "anyone". Write the answer down in a comment if it is not obvious from
a modifier.

Checklist:

- [ ] Every `external`/`public` state-changing function has a deliberate access decision.
- [ ] Ownership transfer is two-step (`Ownable2Step`), so a typo cannot orphan the contract.
- [ ] Privileged addresses are a multisig, not one key, for anything that matters.
- [ ] Role grants emit events, so permissions are auditable from outside.

## Integer issues

Since Solidity 0.8, overflow and underflow revert by default. Two things still bite:

**Division truncates.** There are no floats. `7 / 2` is 3.

```solidity
uint256 share = total / participants;         // remainder silently lost
uint256 fee   = amount * feeBps / 10_000;     // multiply BEFORE dividing
```

Doing it the other way (`amount / 10_000 * feeBps`) loses precision for small amounts —
often all of it.

**`unchecked` removes the guard.** Only use it where you have proven overflow is
impossible, such as a loop counter bounded by a constant.

## Untrusted input and untrusted callers

`msg.sender` may be a contract, not a person. Anything you call may be adversarial.

- **Do not trust return values from unknown contracts.** Some ERC-20s return nothing on
  transfer instead of `true`. Use OpenZeppelin's `SafeERC20`.
- **Do not loop over user-supplied arrays without a bound.** An attacker supplies 10,000
  elements and the function exceeds the block gas limit — permanently, for everyone.
- **Do not assume a token is well behaved.** Fee-on-transfer and rebasing tokens break
  naive accounting. Measure balances before and after rather than trusting the amount.

## Randomness

There is none on-chain.

```solidity
uint256 bad = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))); // predictable
```

Validators choose the timestamp and see the transaction before including it. Anything
derived from block data can be gamed by whoever produces the block. If you need real
randomness, use a VRF such as Chainlink's — and understand its trust assumptions first.

## Front-running and MEV

The mempool is public. Between broadcasting a transaction and its inclusion, anyone can
read it and submit their own with a higher priority fee.

Consequences to design around:

- A trade with no slippage limit can be sandwiched — bought before and sold after, with you
  paying the spread.
- A "first to claim wins" mechanism will be won by a bot, every time.
- Revealing a secret in calldata reveals it to everyone the moment you broadcast, not when
  it is mined. Commit-reveal schemes exist for this.

## Denial of service

- **Unbounded loops** over arrays that anyone can grow.
- **Push payments** to a list of addresses — one address that reverts on receive blocks
  everyone. Use a pull pattern: recipients withdraw their own funds.
- **External calls in a critical path** — if the callee reverts, your function cannot
  complete.

## Frontend and backend

The chain is not the only attack surface.

- **`NEXT_PUBLIC_*` is public.** It is inlined into the JavaScript bundle and readable in
  devtools. Addresses and RPC URLs are fine there; keys and API secrets are not.
- **Validate every input server-side.** `apps/api` validates addresses with viem's
  `isAddress` before touching the store. A route parameter is attacker-controlled.
- **The server holds no private key.** `createChainClient` builds a read-only public
  client. A backend that can sign is a backend worth stealing.
- **Scope CORS.** `CORS_ORIGIN` defaults to `http://localhost:3000`, not `*`.
- **Rate-limit public endpoints.** `@fastify/rate-limit` caps each IP at `RATE_LIMIT_MAX`
  requests per `RATE_LIMIT_WINDOW_MS`, with `/health` exempt so a load balancer probe never
  trips it. Without a limit a public read API is a free amplifier: one HTTP loop becomes
  thousands of upstream RPC calls, and the provider cuts _you_ off, not the attacker.
- **Treat chain data as untrusted input.** A learner address in an event is attacker-chosen
  and goes into your HTML. React escapes it; string concatenation would not.

## Before you deploy

- [ ] `pnpm test` passes, including failure-path tests.
- [ ] Every state-changing function has a deliberate access decision.
- [ ] Checks-effects-interactions holds everywhere an external call is made.
- [ ] No secrets in the repo, the bundle, or the git history.
- [ ] You deployed the identical bytecode to a testnet and used it.
- [ ] You know what is immutable and what is upgradeable.
- [ ] Someone else has read the code.
- [ ] For real value: a professional audit. Not optional.

## Milestone 11

1. Work this checklist against the contracts in this repo. Write down what you find.
2. Copy `ProgressTracker` and move the `mintReward` call **before** the bitmap write.
3. Write an attacking contract whose callback re-enters `completeMilestone` and collects
   the reward more than once.
4. Prove the exploit in a test, then fix it and watch the test fail.

Writing the exploit is the part that makes it stick. Reading about reentrancy does not.

## Next

- [12 · Resources](12-resources.md) — audit reports and security contests.
