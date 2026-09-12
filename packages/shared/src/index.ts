/**
 * `@blockchain/shared` — the single source of truth that both `apps/api` and `apps/web` import.
 *
 * Nothing in here may import from an app. The dependency arrow points one way:
 *   contracts -> shared -> (api, web)
 */
export * from "./generated/abis.js";
export * from "./addresses.js";
export * from "./chains.js";
export * from "./milestones.js";
export * from "./types.js";
