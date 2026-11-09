import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile";
import { loadPublicProfile } from "@/lib/public-profile";
type Props = { params: Promise<{ username: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const person = await loadPublicProfile(username);
  if (!person) return { title: `@${username}`, robots: { index: false } };
  return {
    title: `${person.display_name} (@${person.username})`,
    description:
      person.bio || `${person.display_name} ist Mitglied bei Humans Only.`,
  };
}
export default async function Page({ params }: Props) {
  const { username } = await params;
  const publicProfile = await loadPublicProfile(username);
  return <ProfilePage username={username} publicProfile={publicProfile} />;
}
