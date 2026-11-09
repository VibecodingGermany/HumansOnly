import type { Metadata } from "next";
import { AdminPage } from "@/components/waitlist";
export const metadata: Metadata = {
  title: "Admin · Warteliste",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AdminPage />;
}
