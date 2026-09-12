import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("LearnToken", async () => {
  const { viem, networkHelpers } = await network.getOrCreate();

  async function deploy() {
    const [owner, other] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();
    const token = await viem.deployContract("LearnToken", [owner!.account.address]);
    return { token, owner: owner!, other: other!, publicClient };
  }

  it("deploys with the right metadata and no supply", async () => {
    const { token } = await deploy();

    assert.equal(await token.read.name(), "Learn Token");
    assert.equal(await token.read.symbol(), "LEARN");
    assert.equal(await token.read.decimals(), 18);
    assert.equal(await token.read.totalSupply(), 0n);
  });

  it("lets the owner set the minter", async () => {
    const { token, other, publicClient } = await deploy();

    const hash = await token.write.setMinter([other.account.address]);
    await publicClient.waitForTransactionReceipt({ hash });

    assert.equal((await token.read.minter()).toLowerCase(), other.account.address.toLowerCase());
  });

  it("blocks a non-owner from setting the minter", async () => {
    const { token, other } = await deploy();

    await viem.assertions.revertWithCustomError(
      token.write.setMinter([other.account.address], { account: other.account }),
      token,
      "OwnableUnauthorizedAccount",
    );
  });

  it("blocks anyone but the minter from minting rewards", async () => {
    const { token, other } = await deploy();

    await viem.assertions.revertWithCustomError(
      token.write.mintReward([other.account.address, parseEther("1")]),
      token,
      "NotMinter",
    );
  });

  it("hands out 100 LEARN from the faucet", async () => {
    const { token, owner, publicClient } = await deploy();

    const hash = await token.write.claimFaucet();
    await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(await token.read.balanceOf([owner.account.address]), parseEther("100"));
    assert.equal(await token.read.totalSupply(), parseEther("100"));
  });

  it("enforces the faucet cooldown, then allows a second claim", async () => {
    const { token, owner, publicClient } = await deploy();

    const hash = await token.write.claimFaucet();
    await publicClient.waitForTransactionReceipt({ hash });

    await viem.assertions.revertWithCustomError(
      token.write.claimFaucet(),
      token,
      "FaucetCooldownActive",
    );

    // Jump one day + 1 second into the future on the simulated chain.
    await networkHelpers.time.increase(24 * 60 * 60 + 1);

    const second = await token.write.claimFaucet();
    await publicClient.waitForTransactionReceipt({ hash: second });

    assert.equal(await token.read.balanceOf([owner.account.address]), parseEther("200"));
  });
});
