import type { Metadata } from "next";
import { WaitlistPage } from "@/components/waitlist";
export const metadata: Metadata = {
  title: "Warteliste",
  description:
    "Noch kein Goldenes Ticket? Trag dich auf die Warteliste von Humans Only ein.",
};
export default function Page() {
  return <WaitlistPage />;
}
