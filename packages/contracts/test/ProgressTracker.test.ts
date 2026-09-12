import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("ProgressTracker", async () => {
  const { viem } = await network.getOrCreate();

  /** Deploys the token + tracker pair and wires the minter, exactly like scripts/deploy.ts. */
  async function deployStack() {
    const [owner, learner] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    const token = await viem.deployContract("LearnToken", [owner!.account.address]);
    const tracker = await viem.deployContract("ProgressTracker", [token.address]);

    const hash = await token.write.setMinter([tracker.address]);
    await publicClient.waitForTransactionReceipt({ hash });

    return { token, tracker, owner: owner!, learner: learner!, publicClient };
  }

  it("starts empty", async () => {
    const { tracker, learner } = await deployStack();

    assert.equal(await tracker.read.TOTAL_MILESTONES(), 12);
    assert.equal(await tracker.read.learnerCount(), 0n);
    assert.equal(await tracker.read.completedBitmap([learner.account.address]), 0n);
    assert.equal(await tracker.read.completedCount([learner.account.address]), 0);
  });

  it("records a completion and mints the reward", async () => {
    const { tracker, token, learner, publicClient } = await deployStack();

    const hash = await tracker.write.completeMilestone([0], { account: learner.account });
    await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(await tracker.read.hasCompleted([learner.account.address, 0]), true);
    assert.equal(await tracker.read.hasCompleted([learner.account.address, 1]), false);
    assert.equal(await tracker.read.completedCount([learner.account.address]), 1);
    assert.equal(await tracker.read.learnerCount(), 1n);
    assert.equal(await token.read.balanceOf([learner.account.address]), parseEther("10"));
  });

  it("packs several milestones into one bitmap", async () => {
    const { tracker, learner, publicClient } = await deployStack();

    for (const id of [0, 3, 11] as const) {
      const hash = await tracker.write.completeMilestone([id], { account: learner.account });
      await publicClient.waitForTransactionReceipt({ hash });
    }

    // bits 0, 3 and 11 set = 1 + 8 + 2048
    assert.equal(await tracker.read.completedBitmap([learner.account.address]), 2057n);
    assert.equal(await tracker.read.completedCount([learner.account.address]), 3);

    const flags = await tracker.read.completionFlags([learner.account.address]);
    assert.deepEqual(
      [...flags],
      [true, false, false, true, false, false, false, false, false, false, false, true],
    );
  });

  it("counts each learner once", async () => {
    const { tracker, learner, publicClient } = await deployStack();

    for (const id of [0, 1] as const) {
      const hash = await tracker.write.completeMilestone([id], { account: learner.account });
      await publicClient.waitForTransactionReceipt({ hash });
    }

    assert.equal(await tracker.read.learnerCount(), 1n);
  });

  it("emits MilestoneCompleted", async () => {
    const { tracker, learner } = await deployStack();

    await viem.assertions.emitWithArgs(
      tracker.write.completeMilestone([5], { account: learner.account }),
      tracker,
      "MilestoneCompleted",
      [learner.account.address, 5, (value: bigint) => value > 0n],
    );
  });

  it("rejects an out-of-range milestone", async () => {
    const { tracker, learner } = await deployStack();

    await viem.assertions.revertWithCustomError(
      tracker.write.completeMilestone([12], { account: learner.account }),
      tracker,
      "InvalidMilestone",
    );
  });

  it("rejects completing the same milestone twice", async () => {
    const { tracker, learner, publicClient } = await deployStack();

    const hash = await tracker.write.completeMilestone([2], { account: learner.account });
    await publicClient.waitForTransactionReceipt({ hash });

    await viem.assertions.revertWithCustomError(
      tracker.write.completeMilestone([2], { account: learner.account }),
      tracker,
      "AlreadyCompleted",
    );
  });

  it("reverts the whole transaction when it is not the token minter", async () => {
    const [owner, learner] = await viem.getWalletClients();
    const token = await viem.deployContract("LearnToken", [owner!.account.address]);
    const tracker = await viem.deployContract("ProgressTracker", [token.address]);

    // setMinter was deliberately NOT called here.
    await viem.assertions.revertWithCustomError(
      tracker.write.completeMilestone([0], { account: learner!.account }),
      token,
      "NotMinter",
    );

    assert.equal(await tracker.read.hasCompleted([learner!.account.address, 0]), false);
  });
});
