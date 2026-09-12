import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @blockchain/shared ships TypeScript-built ESM from the workspace; Next compiles it inline.
  transpilePackages: ["@blockchain/shared"],
  env: {
    NEXT_PUBLIC_APP_NAME: "Web3 Learning Path",
  },
};

export default nextConfig;
