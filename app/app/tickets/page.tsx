import type { Metadata } from "next";
import { TicketsPage } from "@/components/tickets";
export const metadata: Metadata = { title: "Goldene Tickets" };
export default function Page() {
  return <TicketsPage />;
}
