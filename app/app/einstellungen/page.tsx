import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings";
export const metadata: Metadata = {
  title: "Einstellungen",
  robots: { index: false },
};
export default function Page() {
  return <SettingsPage />;
}
