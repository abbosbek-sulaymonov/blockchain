"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

/**
 * Two providers, in this order:
 *   WagmiProvider   — holds the connection, account and chain state.
 *   QueryClientProvider — wagmi's hooks are TanStack Query hooks under the hood;
 *                         this is what gives you caching, refetching and loading flags.
 *
 * The QueryClient is created inside `useState` so each browser session gets exactly one,
 * and a server render never shares a cache between two users' requests.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Chain data changes on a block cadence; a short stale time avoids RPC spam.
            staleTime: 10_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
