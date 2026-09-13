import type { Metadata } from "next";

import { LearnerProfile } from "@/components/LearnerProfile";

interface LearnerPageProps {
  // In the Next.js App Router, route params arrive as a promise.
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: LearnerPageProps): Promise<Metadata> {
  const { address } = await params;

  return {
    title: `${address.slice(0, 10)}… · Web3 Learning Path`,
    description: `Roadmap progress for ${address}.`,
  };
}

export default async function LearnerPage({ params }: LearnerPageProps) {
  const { address } = await params;

  return (
    <main>
      <LearnerProfile address={address} />
    </main>
  );
}
