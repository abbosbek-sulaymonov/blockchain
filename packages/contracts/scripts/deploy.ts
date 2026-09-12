/**
 * Deploys the full stack and records the addresses where the API and the web app can find them.
 *
 *   pnpm deploy:local     # against `pnpm chain` on http://127.0.0.1:8545
 *   pnpm --filter @blockchain/contracts deploy:sepolia
 *
 * Deployment order matters:
 *   1. LearnToken   — owned by the deployer.
 *   2. ProgressTracker — needs the token address in its constructor.
 *   3. token.setMinter(tracker) — without this, completing a milestone reverts with NotMinter.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";
import { formatEther } from "viem";

const here = dirname(fileURLToPath(import.meta.url));
const deploymentsFile = join(here, "..", "..", "shared", "src", "generated", "deployments.json");

interface DeploymentRecord {
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: {
    LearnToken: string;
    ProgressTracker: string;
    Greeter: string;
  };
}

async function loadDeployments(): Promise<Record<string, DeploymentRecord>> {
  try {
    return JSON.parse(await readFile(deploymentsFile, "utf8")) as Record<string, DeploymentRecord>;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const connection = await network.create();
  const { viem } = connection;

  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  if (!deployer) {
    throw new Error(
      "No wallet client available. For a testnet, set SEPOLIA_PRIVATE_KEY in your .env file.",
    );
  }

  const chainId = await publicClient.getChainId();
  const deployerAddress = deployer.account.address;
  const balance = await publicClient.getBalance({ address: deployerAddress });

  console.log(`\nDeploying to chain ${chainId}`);
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance:  ${formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has zero balance. Fund it before deploying.");
  }

  const greeter = await viem.deployContract("Greeter", ["gm, welcome to Web3"]);
  console.log(`Greeter         -> ${greeter.address}`);

  const learnToken = await viem.deployContract("LearnToken", [deployerAddress]);
  console.log(`LearnToken      -> ${learnToken.address}`);

  const progressTracker = await viem.deployContract("ProgressTracker", [learnToken.address]);
  console.log(`ProgressTracker -> ${progressTracker.address}`);

  const setMinterHash = await learnToken.write.setMinter([progressTracker.address]);
  await publicClient.waitForTransactionReceipt({ hash: setMinterHash });
  console.log(`\nLearnToken.setMinter(ProgressTracker) confirmed in ${setMinterHash}`);

  const deployments = await loadDeployments();
  deployments[String(chainId)] = {
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      Greeter: greeter.address,
      LearnToken: learnToken.address,
      ProgressTracker: progressTracker.address,
    },
  };

  await mkdir(dirname(deploymentsFile), { recursive: true });
  await writeFile(deploymentsFile, `${JSON.stringify(deployments, null, 2)}\n`, "utf8");

  console.log(`\nAddresses written to packages/shared/src/generated/deployments.json`);
  console.log("Copy these into your .env before starting the API and the web app:\n");
  console.log(`  PROGRESS_TRACKER_ADDRESS=${progressTracker.address}`);
  console.log(`  NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=${progressTracker.address}`);
  console.log(`  NEXT_PUBLIC_LEARN_TOKEN_ADDRESS=${learnToken.address}\n`);

  await connection.close();
}

await main();
