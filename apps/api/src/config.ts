import "dotenv/config";

import { z } from "zod";

import { LOCAL_CHAIN_ID } from "@blockchain/shared";

/**
 * Every environment variable the API reads, validated once at startup.
 *
 * Fail fast: a typo in `.env` should crash on boot with a readable message,
 * not surface as `undefined` three layers deep in a request handler.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("127.0.0.1"),
  RPC_URL: z.url().default("http://127.0.0.1:8545"),
  CHAIN_ID: z.coerce.number().int().positive().default(LOCAL_CHAIN_ID),
  PROGRESS_TRACKER_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 20-byte address")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /** Block to start the backfill from. 0 is fine locally; use the deploy block on a testnet. */
  INDEXER_START_BLOCK: z.coerce.bigint().nonnegative().default(0n),
  /** How often to poll for new blocks, in milliseconds. */
  INDEXER_POLL_MS: z.coerce.number().int().min(500).default(4000),
  /** Max block span per `getLogs` call. Public RPCs commonly cap this at 10k. */
  INDEXER_BATCH_SIZE: z.coerce.bigint().positive().default(2000n),
  /**
   * Blocks to wait before treating one as final. Leave unset to pick a sane default per
   * chain: 0 on a local Hardhat node (it only mines on demand), 2 on a public chain.
   */
  INDEXER_CONFIRMATIONS: z.coerce.bigint().nonnegative().optional(),
  /** Set to "false" to run the HTTP API without the indexer loop (useful in tests). */
  INDEXER_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value !== "false"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return parsed.data;
}
