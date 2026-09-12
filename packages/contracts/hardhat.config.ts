import "dotenv/config";

import type { HardhatUserConfig } from "hardhat/config";

import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  plugins: [
    hardhatViem,
    hardhatViemAssertions,
    hardhatNetworkHelpers,
    hardhatNodeTestRunner,
    hardhatVerify,
  ],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: {
    // In-process EVM used by `hardhat test`. Fast, disposable, no node to start.
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // The standalone node started by `pnpm chain` (http://127.0.0.1:8545, chain id 31337).
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    // A real public testnet. Needs SEPOLIA_PRIVATE_KEY in .env — use a throwaway wallet.
    sepolia: {
      type: "http",
      chainType: "l1",
      url: sepoliaRpcUrl,
      accounts: sepoliaPrivateKey ? [sepoliaPrivateKey] : [],
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY ?? "",
    },
  },
};

export default config;
