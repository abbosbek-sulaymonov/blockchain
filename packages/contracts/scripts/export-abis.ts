/**
 * Reads compiled Hardhat artifacts and writes typed ABI constants into `@blockchain/shared`.
 *
 * Why a generated file instead of importing JSON at runtime?
 * viem infers argument and return types from an ABI only when it is a literal `as const`.
 * Generating one keeps the frontend fully typed with zero manual ABI maintenance.
 *
 * Run with: pnpm --filter @blockchain/contracts build
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contractsRoot = join(here, "..");
const sharedGeneratedDir = join(contractsRoot, "..", "shared", "src", "generated");

/** Contracts whose ABIs the rest of the monorepo needs. */
const EXPORTED = [
  { contract: "Greeter", source: "Greeter.sol", constName: "greeterAbi" },
  { contract: "LearnToken", source: "LearnToken.sol", constName: "learnTokenAbi" },
  { contract: "ProgressTracker", source: "ProgressTracker.sol", constName: "progressTrackerAbi" },
] as const;

async function readAbi(source: string, contract: string): Promise<unknown[]> {
  const artifactPath = join(contractsRoot, "artifacts", "contracts", source, `${contract}.json`);
  const raw = await readFile(artifactPath, "utf8");
  const artifact = JSON.parse(raw) as { abi: unknown[] };
  return artifact.abi;
}

async function main(): Promise<void> {
  const blocks: string[] = [];

  for (const { contract, source, constName } of EXPORTED) {
    const abi = await readAbi(source, contract);
    blocks.push(
      `/** ABI of \`${contract}\`, generated from \`contracts/${source}\`. */\n` +
        `export const ${constName} = ${JSON.stringify(abi, null, 2)} as const;`,
    );
  }

  const header = [
    "// AUTO-GENERATED — DO NOT EDIT BY HAND.",
    "// Regenerate with: pnpm --filter @blockchain/contracts build",
    "",
  ].join("\n");

  await mkdir(sharedGeneratedDir, { recursive: true });
  await writeFile(join(sharedGeneratedDir, "abis.ts"), `${header}${blocks.join("\n\n")}\n`, "utf8");

  console.log(`Exported ${EXPORTED.length} ABIs to packages/shared/src/generated/abis.ts`);
}

await main();
