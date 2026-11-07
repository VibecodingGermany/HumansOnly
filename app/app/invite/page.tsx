import type { Metadata } from "next";
import { InvitePage } from "@/components/invite-flow";
export const metadata: Metadata = { title: "Dein Goldenes Ticket" };
export default function Page() {
  return <InvitePage />;
}
