import type { Metadata } from "next";
import { PostDetail } from "@/components/post-detail";
type Props = { params: Promise<{ id: string }> };
export const metadata: Metadata = {
  title: "Beitrag",
  // Beiträge sind nur für Mitglieder sichtbar; Suchmaschinen sehen hier nichts.
  robots: { index: false },
};
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
