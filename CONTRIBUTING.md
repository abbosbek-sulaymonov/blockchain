# Contributing

This is a learning repo. Contributions that make it a better teacher are welcome:
clearer explanations, a milestone exercise that lands better, a fix for something that
breaks on a fresh clone.

## Setup

```bash
git clone https://github.com/abbosbek-sulaymonov/blockchain.git
cd blockchain
corepack enable
pnpm install
pnpm build
```

Full walkthrough: [docs/01-getting-started.md](docs/01-getting-started.md).

## Before opening a pull request

```bash
pnpm format      # write formatting
pnpm build       # compile contracts, regenerate ABIs, build every package
pnpm typecheck   # TypeScript across the workspace
pnpm test        # contract tests + API tests
```

CI runs exactly these. Green locally means green there.

## Ground rules

**Never commit a secret.** `.env` is gitignored. Check `git status` before every commit. A
private key in a public repo is drained within minutes — see
[docs/08-security.md](docs/08-security.md).

**Contract changes need tests.** A test that fails without your change and passes with it.
Cover the failure paths, not just the happy one — see [docs/09-testing.md](docs/09-testing.md).

**Do not edit generated files.** `packages/shared/src/generated/` is written by
`pnpm --filter @blockchain/contracts build`. Change the contract, rebuild.

**Milestone ids are permanent.** Bit `n` of a learner's on-chain bitmap means milestone
`n`, and the chain has already recorded what the old numbers meant. Append new milestones;
never renumber existing ones. Changing `TOTAL_MILESTONES` means changing the contract, its
tests, and `packages/shared/src/milestones.ts` together.

**Respect the dependency direction.** `contracts -> shared -> (api, web)`. Nothing in
`packages/shared` may import from an app.

## Commit messages

Conventional commits, imperative mood:

```
feat: add a supply cap to LearnToken
fix: stop the indexer re-scanning from genesis on restart
docs: explain why ProgressTracker uses a bitmap
test: cover the faucet cooldown boundary
chore: bump viem to 2.57
```

Explain **why** in the body when it is not obvious from the diff. A year from now the
reasoning is the part nobody can reconstruct.

## Branches and pull requests

Branch from `main`, one topic per branch. Do not stack branches — merging the top of a
stack silently merges everything under it.

```bash
git checkout main && git pull
git checkout -b docs/clearer-gas-explanation
```

The PR template's checklist is the same one above. Fill it in honestly; a failing box is
useful information, not a blocker to hide.

## Writing documentation

The docs have a house style, and it is worth matching:

- **Explain why, not just what.** "Use a bitmap" teaches nothing. "A storage slot costs
  ~20,000 gas the first time you write it, so twelve booleans in one slot costs one write
  instead of twelve" teaches something.
- **Name the mistake.** Anything marked **Gotcha** is something that is easy to do and hard
  to diagnose. Those paragraphs save the most time.
- **Show the smallest code that makes the point.** Then link to the real file.
- **No hype.** No price talk, no "revolutionary", no emoji.
- Code blocks are wrapped at 100 characters by Prettier; prose follows the same width.
