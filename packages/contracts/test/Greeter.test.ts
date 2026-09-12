import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Greeter", async () => {
  const { viem } = await network.getOrCreate();

  it("stores the greeting given to the constructor", async () => {
    const greeter = await viem.deployContract("Greeter", ["gm"]);

    assert.equal(await greeter.read.greeting(), "gm");
    assert.equal(await greeter.read.changeCount(), 0n);
  });

  it("records the deployer", async () => {
    const [wallet] = await viem.getWalletClients();
    const greeter = await viem.deployContract("Greeter", ["gm"]);

    assert.equal(
      (await greeter.read.deployer()).toLowerCase(),
      wallet!.account.address.toLowerCase(),
    );
  });

  it("updates the greeting and counts the change", async () => {
    const greeter = await viem.deployContract("Greeter", ["gm"]);
    const publicClient = await viem.getPublicClient();

    const hash = await greeter.write.setGreeting(["gn"]);
    await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(await greeter.read.greeting(), "gn");
    assert.equal(await greeter.read.changeCount(), 1n);
  });

  it("emits GreetingChanged with the old and new values", async () => {
    const greeter = await viem.deployContract("Greeter", ["gm"]);

    await viem.assertions.emitWithArgs(
      greeter.write.setGreeting(["gn"]),
      greeter,
      "GreetingChanged",
      [(await viem.getWalletClients())[0]!.account.address, "gm", "gn"],
    );
  });

  it("rejects an empty greeting", async () => {
    const greeter = await viem.deployContract("Greeter", ["gm"]);

    await viem.assertions.revertWithCustomError(
      greeter.write.setGreeting([""]),
      greeter,
      "EmptyGreeting",
    );
  });
});
