export type Vote = "valuable" | "slop";
export type SlopStatus =
  "clean" | "under_review" | "hidden" | "valuable_verified";
export type Visibility = "members" | "public" | "hidden";
export type ProfileLink = { label: string; url: string };
export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  location: string;
  pronouns: string;
  links: ProfileLink[];
  visibility: Visibility;
  show_posts: boolean;
  show_trust_tree: boolean;
  voice_intro_url: string | null;
  voice_duration_sec: number | null;
  invited_by_id: string | null;
  invites_left: number;
  can_invite: boolean;
  created_at: string;
};
export type Pin = { title: string; text: string; url?: string };
export type Space = {
  id: string;
  slug: string;
  name: string;
  description: string;
  owner_id: string | null;
  pinned_info: Pin[];
  access_type: "invite" | "paid";
  price_cents: number;
  created_at: string;
};
export type Membership = {
  space_id: string;
  user_id: string;
  role: "owner" | "moderator" | "member";
  joined_at: string;
};
export type Ticket = {
  id: string;
  code: string;
  creator_id: string;
  target_space_id: string;
  redeemed_by_id: string | null;
  redeemed_at: string | null;
  expires_at: string;
};
export type Post = {
  id: string;
  author_id: string;
  space_id: string | null;
  text: string;
  image_url: string | null;
  audio_url: string | null;
  audio_duration_sec: number | null;
  parent_id: string | null;
  slop_status: SlopStatus;
  valuable_votes_count: number;
  slop_votes_count: number;
  /** Anzahl „Gefällt mir“. Getrennt von der Community-Prüfung. */
  likes_count: number;
  created_at: string;
};
export type PostLike = {
  post_id: string;
  user_id: string;
  created_at: string;
};
export type ContentVote = {
  id: string;
  post_id: string;
  voter_id: string;
  vote: Vote;
  created_at: string;
};
export type WaitlistStatus = "pending" | "approved" | "rejected";
export type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  status: WaitlistStatus;
  ticket_id: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  invited_at: string | null;
  invite_count: number;
};
export type NotificationSettings = {
  notify_replies: boolean;
  notify_ticket_redeemed: boolean;
  notify_news: boolean;
};
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  notify_replies: true,
  notify_ticket_redeemed: true,
  notify_news: false,
};
export type ProfileUpdate = {
  displayName: string;
  bio: string;
  location: string;
  pronouns: string;
  links: ProfileLink[];
  visibility: Visibility;
  showPosts: boolean;
  showTrustTree: boolean;
};
/** Das, was ohne Login unter /u/name sichtbar ist (nur bei visibility = public). */
export type PublicProfile = {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  location: string;
  pronouns: string;
  links: ProfileLink[];
  member_since: string;
};
export type Snapshot = {
  profiles: Profile[];
  spaces: Space[];
  memberships: Membership[];
  posts: Post[];
  tickets: Ticket[];
  votes: ContentVote[];
  /** Likes zu den geladenen Beiträgen (alle Personen, nicht nur die eigenen). */
  likes: PostLike[];
  currentUserId: string | null;
  /** E-Mail-Adresse des angemeldeten Kontos. */
  email: string | null;
  /** Eigene Benachrichtigungs-Einstellungen. */
  settings: NotificationSettings;
  /** Nur für Admins gefüllt; für alle anderen leer. */
  waitlist: WaitlistEntry[];
  isAdmin: boolean;
};
export type InvitePreview = {
  valid: boolean;
  space_slug: string | null;
  space_name: string | null;
  inviter_username: string | null;
};
export type OnboardingInput = {
  code: string;
  username: string;
  displayName: string;
  bio: string;
  voiceUrl: string;
  voiceDuration: number;
};
export type PostInput = {
  spaceId: string | null;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  parentId?: string;
};
export type Bucket = "avatars" | "voice-intros" | "post-media";
export function moderationStatus(valuable: number, slop: number): SlopStatus {
  if (slop - valuable >= 3) return "hidden";
  if (valuable > slop) return "valuable_verified";
  return slop > 0 ? "under_review" : "clean";
}
export function validateIdentity(input: OnboardingInput) {
  if (!/^[a-z0-9_]{3,24}$/.test(input.username))
    throw new Error(
      "Dein Nutzername braucht 3–24 kleine Buchstaben, Ziffern oder Unterstriche.",
    );
  if (!input.displayName.trim() || input.displayName.trim().length > 60)
    throw new Error("Bitte gib einen Namen mit höchstens 60 Zeichen ein.");
  if (input.bio.length > 300)
    throw new Error("Deine Bio darf höchstens 300 Zeichen haben.");
  if (
    !input.voiceUrl ||
    !Number.isFinite(input.voiceDuration) ||
    input.voiceDuration < 1 ||
    input.voiceDuration > 15
  )
    throw new Error("Bitte nimm eine Vorstellung von 1 bis 15 Sekunden auf.");
}
export function validatePost(input: PostInput) {
  if (input.text.length > 2000)
    throw new Error("Dein Beitrag darf höchstens 2.000 Zeichen haben.");
  if (!input.text.trim() && !input.imageUrl && !input.audioUrl)
    throw new Error("Dein Beitrag ist noch leer.");
  if (
    input.audioUrl &&
    (!input.audioDuration ||
      input.audioDuration > 60 ||
      input.audioDuration < 1)
  )
    throw new Error("Sprachnotizen dürfen 1 bis 60 Sekunden dauern.");
}
export function validateWaitlist(name: string, email: string) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName || cleanName.length > 80)
    throw new Error("Bitte gib deinen Namen mit höchstens 80 Zeichen ein.");
  if (cleanEmail.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail))
    throw new Error("Bitte gib eine gültige E-Mail-Adresse ein.");
  return { name: cleanName, email: cleanEmail };
}
export const VISIBILITIES: Visibility[] = ["members", "public", "hidden"];
export const MAX_LINKS = 5;
/** Ergänzt https://, erlaubt nur http(s) und verlangt einen Hostnamen mit Punkt. */
export function normalizeLinkUrl(raw: string) {
  const text = raw.trim();
  if (!text) throw new Error("Bitte gib die Adresse deines Links ein.");
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error(`„${text}“ ist keine gültige Adresse.`);
  }
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    !parsed.hostname.includes(".") ||
    parsed.username ||
    parsed.password
  )
    throw new Error(
      `„${text}“ ist keine gültige Adresse. Erlaubt sind http- und https-Links.`,
    );
  if (parsed.href.length > 200)
    throw new Error("Ein Link darf höchstens 200 Zeichen haben.");
  return parsed.href;
}
export function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
/** Prüft und bereinigt das Profilformular; wirft verständliche deutsche Fehler. */
export function validateProfileUpdate(input: ProfileUpdate): ProfileUpdate {
  const displayName = input.displayName.trim();
  const location = input.location.trim();
  const pronouns = input.pronouns.trim();
  if (!displayName || displayName.length > 60)
    throw new Error("Bitte gib einen Namen mit höchstens 60 Zeichen ein.");
  if (input.bio.length > 300)
    throw new Error("Deine Bio darf höchstens 300 Zeichen haben.");
  if (location.length > 60)
    throw new Error("Dein Ort darf höchstens 60 Zeichen haben.");
  if (pronouns.length > 30)
    throw new Error("Deine Pronomen dürfen höchstens 30 Zeichen haben.");
  if (!VISIBILITIES.includes(input.visibility))
    throw new Error("Bitte wähle, wer dein Profil sehen darf.");
  const rows = input.links.filter((l) => l.label.trim() || l.url.trim());
  if (rows.length > MAX_LINKS)
    throw new Error(`Du kannst höchstens ${MAX_LINKS} Links hinterlegen.`);
  const links = rows.map((row) => {
    const url = normalizeLinkUrl(row.url);
    const label = row.label.trim() || linkHost(url);
    if (label.length > 40)
      throw new Error("Ein Link-Titel darf höchstens 40 Zeichen haben.");
    return { label, url };
  });
  return {
    displayName,
    bio: input.bio,
    location,
    pronouns,
    links,
    visibility: input.visibility,
    showPosts: input.showPosts,
    showTrustTree: input.showTrustTree,
  };
}
export function validateEmailAddress(email: string) {
  const clean = email.trim().toLowerCase();
  if (clean.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean))
    throw new Error("Bitte gib eine gültige E-Mail-Adresse ein.");
  return clean;
}

/** Wer einen Beitrag löschen darf: Autor, Gastgeber/Moderation des Raums, Admin. */
export function canDeletePost(
  state: Pick<Snapshot, "currentUserId" | "isAdmin" | "memberships">,
  post: Post,
) {
  const me = state.currentUserId;
  if (!me) return false;
  if (post.author_id === me || state.isAdmin) return true;
  return state.memberships.some(
    (m) =>
      m.space_id === post.space_id &&
      m.user_id === me &&
      (m.role === "owner" || m.role === "moderator"),
  );
}
