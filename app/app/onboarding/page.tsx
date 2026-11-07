import type { Metadata } from "next";
import { OnboardingPage } from "@/components/invite-flow";
export const metadata: Metadata = { title: "Dein erstes Hallo" };
export default function Page() {
  return <OnboardingPage />;
}
