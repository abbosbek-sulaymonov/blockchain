# Security policy

This is a learning repository. Nothing here is audited, and nothing here should hold real
value on a mainnet.

## Reporting a vulnerability

Open a [security advisory](https://github.com/abbosbek-sulaymonov/blockchain/security/advisories/new)
rather than a public issue, and give it a few days before disclosing publicly.

Useful things to include: what an attacker gains, the smallest steps that reproduce it,
and which file and line it starts from.

## Scope

In scope:

- Contract bugs in `packages/contracts` — access control, reentrancy, arithmetic, state
  that can be corrupted by an untrusted caller.
- Server issues in `apps/api` — unvalidated input, resource exhaustion, anything that
  turns the indexer into an amplifier.
- Anything in the repo that leaks a secret, or teaches a reader to leak one.

Out of scope:

- The deliberate simplifications documented in
  [docs/02-architecture.md](docs/02-architecture.md) — the in-memory store, the polling
  indexer, the single-address `minter`. They are stated exercises, not oversights.
- The Hardhat test keys. They are publicly known by design and safe only on a local chain.

## If you leaked a key

Assume it is compromised the moment it is pushed, even if you force-push it away — the
commit is already cloned and scrapers watch GitHub's event firehose in real time.

1. Move any remaining funds out, immediately.
2. Generate a new key and rotate anything that trusted the old one.
3. Revoke the leaked key's approvals wherever it granted them.
4. Do not reuse it anywhere, on any network, ever.

More on key handling: [docs/08-security.md](docs/08-security.md).
