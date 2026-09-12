# Resources

Curated, not exhaustive. This ecosystem moves fast and half the tutorials you will find are
written against tooling that no longer exists — prefer official documentation, and check
the date on everything else.

## Documentation you will keep open

| Resource                                                            | For                                          |
| ------------------------------------------------------------------- | -------------------------------------------- |
| [Solidity docs](https://docs.soliditylang.org/)                     | The language. The reference, not a tutorial. |
| [viem docs](https://viem.sh/)                                       | Every client method, with examples.          |
| [wagmi docs](https://wagmi.sh/)                                     | Hooks reference.                             |
| [Hardhat docs](https://hardhat.org/docs)                            | Build, test, deploy.                         |
| [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)   | The audited building blocks.                 |
| [ethereum.org developers](https://ethereum.org/en/developers/docs/) | Concepts, well written, vendor-neutral.      |

## Learning by doing

- **[CryptoZombies](https://cryptozombies.io/)** — the gentlest Solidity introduction.
  Dated in places, still effective.
- **[Speedrun Ethereum](https://speedrunethereum.com/)** — challenge-based, built on
  Scaffold-ETH. The closest thing to this roadmap in spirit.
- **[Ethernaut](https://ethernaut.openzeppelin.com/)** — security puzzles where you break
  contracts. Do these after milestone 11; they will change how you read code.
- **[Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz/)** — harder, DeFi-specific
  exploitation. A serious step up.

## Security

- **[Smart Contract Security Field Guide](https://scsfg.io/)** — vulnerability classes with
  real examples.
- **[SWC Registry](https://swcregistry.io/)** — a catalogue of known weakness patterns.
- **[rekt.news](https://rekt.news/)** — post-mortems of actual hacks. Grim and educational.
- **[Code4rena](https://code4rena.com/) / [Sherlock](https://www.sherlock.xyz/)** — audit
  contests. Read winning submissions before you try competing.
- **Published audit reports** — OpenZeppelin, Trail of Bits and Spearbit publish theirs.
  This is the best free advanced Solidity education available.

## Tooling worth learning next

- **[Foundry](https://book.getfoundry.sh/)** — Solidity-native testing, fuzzing and
  invariant testing. Most protocol teams use it. The natural next step after Hardhat.
- **[The Graph](https://thegraph.com/docs/)** — hosted indexing. Compare a subgraph against
  the indexer in `apps/api` to see the trade-off.
- **[Tenderly](https://tenderly.co/)** — transaction simulation and debugging. Invaluable
  when a transaction reverts for reasons you cannot see.
- **[Slither](https://github.com/crytic/slither)** — static analysis. Run it on your own
  contracts; it will find something.

## Reading

- **[The Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf)** — the
  formal specification. Dense, and worth skimming once so you know what is in it.
- **[Ethereum Improvement Proposals](https://eips.ethereum.org/)** — where standards are
  defined. ERC-20 is EIP-20; read it.
- **[Solidity by Example](https://solidity-by-example.org/)** — short, focused snippets.
- **[EVM Deep Dives](https://noxx.substack.com/)** — how storage, memory and calldata work
  at the opcode level.

## Staying current

- **[Week in Ethereum News](https://weekinethereumnews.com/)** — a weekly digest without
  the price talk.
- Protocol engineering blogs: Paradigm, a16z crypto, Optimism, Arbitrum.
- Follow the people building the tools you use, not the accounts posting charts.

## What to ignore

- Anything leading with price, market cap or returns.
- Tutorials with no date, or using `web3.js` and `truffle` — both are effectively retired.
- "Learn Web3 in 24 hours" content. This roadmap is ~59 hours and it is an introduction.
- Anyone promising guaranteed yield. That is a different industry wearing the same clothes.

## Practising for real

1. Deploy something to Sepolia that you will actually use yourself.
2. Read one audit report a week.
3. Do one Ethernaut level a week.
4. Rebuild a small piece of a protocol you use, from its documentation, without looking at
   its source.

Building a bad version of something real teaches more than finishing ten tutorials.
