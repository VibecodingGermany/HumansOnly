export type Vote = "valuable" | "slop";
export type SlopStatus =
  | "clean"
  | "under_review"
  | "hidden"
  | "valuable_verified";
export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
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
  created_at: string;
};
export type ContentVote = {
  id: string;
  post_id: string;
  voter_id: string;
  vote: Vote;
  created_at: string;
};
export type Snapshot = {
  profiles: Profile[];
  spaces: Space[];
  memberships: Membership[];
  posts: Post[];
  tickets: Ticket[];
  votes: ContentVote[];
  currentUserId: string | null;
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
