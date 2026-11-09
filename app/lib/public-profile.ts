import { config } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/model";

/**
 * Lädt ein Profil, das sein Mitglied auf „öffentlich“ gestellt hat.
 * Die Datenbank liefert nur dann etwas, wenn visibility = 'public' (siehe get_public_profile).
 * Alles andere — auch Fehler — ist für Besucher ohne Login schlicht „nicht gefunden“.
 */
export async function loadPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  if (config.mode !== "supabase") return null;
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return null;
  try {
    const client = await serverClient();
    const { data, error } = await client.rpc("get_public_profile", {
      p_username: username,
    });
    if (error || !data) return null;
    let avatar_url: string | null = null;
    if (data.avatar_path) {
      const signed = await client.storage
        .from("avatars")
        .createSignedUrl(data.avatar_path, 3600);
      avatar_url = signed.data?.signedUrl ?? null;
    }
    return {
      username: data.username,
      display_name: data.display_name,
      bio: data.bio,
      avatar_url,
      location: data.location,
      pronouns: data.pronouns,
      links: Array.isArray(data.links) ? data.links : [],
      member_since: data.member_since,
    };
  } catch {
    return null;
  }
}
