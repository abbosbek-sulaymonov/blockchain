import { LOCAL_CHAIN_ID, getContractAddress } from "@blockchain/shared";

import { createChainClient } from "./chain.js";
import { loadConfig } from "./config.js";
import { MilestoneIndexer } from "./indexer.js";
import { buildServer } from "./server.js";
import { EventStore } from "./store.js";

/**
 * Entry point. Order matters:
 *   1. Validate config — crash early on a bad .env.
 *   2. Build the store and (if configured) the indexer.
 *   3. Serve HTTP. The API stays up even with no contract address, so `/api/status`
 *      can tell you what is missing instead of the process dying silently.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const store = new EventStore();

  const address = getContractAddress(
    config.CHAIN_ID,
    "ProgressTracker",
    config.PROGRESS_TRACKER_ADDRESS,
  );

  let indexer: MilestoneIndexer | null = null;

  if (config.INDEXER_ENABLED && address) {
    const client = createChainClient(config);
    indexer = new MilestoneIndexer({
      client,
      store,
      config,
      address,
      confirmations: config.INDEXER_CONFIRMATIONS ?? (config.CHAIN_ID === LOCAL_CHAIN_ID ? 0n : 2n),
      logger: {
        info: (message) => console.log(`[indexer] ${message}`),
        warn: (message) => console.warn(`[indexer] ${message}`),
        error: (message) => console.error(`[indexer] ${message}`),
      },
    });
  }

  const app = await buildServer({ config, store, indexer });

  await app.listen({ port: config.API_PORT, host: config.API_HOST });

  if (!address) {
    app.log.warn(
      "ProgressTracker address unknown — the indexer is idle. " +
        "Run `pnpm deploy:local`, or set PROGRESS_TRACKER_ADDRESS in your .env.",
    );
  } else if (!config.INDEXER_ENABLED) {
    app.log.warn("INDEXER_ENABLED=false — serving whatever is already in the store.");
  } else {
    void indexer?.start();
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      app.log.info(`${signal} received, shutting down`);
      indexer?.stop();
      void app.close().then(() => process.exit(0));
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
