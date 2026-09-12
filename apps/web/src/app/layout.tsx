import type { Metadata } from "next";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web3 Learning Path",
  description:
    "A learn-by-building Web3 stack: Solidity contracts, an event indexer, and a Next.js dApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
