import { createDemoSnapshot } from "@/lib/seed";
import { moderationStatus, validateIdentity, validatePost } from "@/lib/model";
import type {
  Bucket,
  OnboardingInput,
  PostInput,
  Snapshot,
  Vote,
} from "@/lib/model";
import type { ClubhouseRepository } from "./contract";
export const DEMO_STORAGE_KEY = "humans-only-v2-demo-1";
export function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}
function actor(state: Snapshot) {
  const user = state.profiles.find((p) => p.id === state.currentUserId);
  if (!user)
    throw new Error("Bitte tritt zuerst mit einem Goldenen Ticket ein.");
  return user;
}
function requireSpace(state: Snapshot, spaceId: string | null) {
  const user = actor(state);
  if (
    spaceId &&
    !state.memberships.some(
      (m) => m.space_id === spaceId && m.user_id === user.id,
    )
  )
    throw new Error("Du bist noch nicht Mitglied in diesem Raum.");
}
export function issueDemoTicket(
  state: Snapshot,
  spaceId: string,
  now = new Date(),
) {
  const user = actor(state);
  requireSpace(state, spaceId);
  const space = state.spaces.find((s) => s.id === spaceId);
  if (!space?.owner_id || space.access_type !== "invite")
    throw new Error("Dieser Raum vergibt noch keine Tickets.");
  if (!user.can_invite)
    throw new Error("Deine Einladungsrechte sind pausiert.");
  if (user.invites_left <= 0)
    throw new Error("Du hast bereits alle drei Tickets vergeben.");
  const ticket = {
    id: newId(),
    code: newId().replaceAll("-", "").toUpperCase(),
    creator_id: user.id,
    target_space_id: spaceId,
    redeemed_by_id: null,
    redeemed_at: null,
    expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
  };
  state.tickets.push(ticket);
  user.invites_left -= 1;
  return ticket;
}
export function redeemDemoTicket(
  state: Snapshot,
  input: OnboardingInput,
  now = new Date(),
) {
  validateIdentity(input);
  const ticket = state.tickets.find(
    (t) => t.code === input.code.trim().toUpperCase(),
  );
  const creator = state.profiles.find((p) => p.id === ticket?.creator_id);
  const space = state.spaces.find((s) => s.id === ticket?.target_space_id);
  if (
    !ticket ||
    ticket.redeemed_at ||
    new Date(ticket.expires_at) <= now ||
    !creator?.can_invite ||
    !space?.owner_id ||
    space.access_type !== "invite"
  )
    throw new Error(
      "Dieses Ticket ist ungültig, abgelaufen oder bereits eingelöst.",
    );
  if (state.profiles.some((p) => p.username === input.username))
    throw new Error("Dieser Nutzername ist schon vergeben.");
  const profile = {
    id: newId(),
    username: input.username,
    display_name: input.displayName.trim(),
    bio: input.bio,
    avatar_url: null,
    voice_intro_url: input.voiceUrl,
    voice_duration_sec: input.voiceDuration,
    invited_by_id: creator.id,
    invites_left: 3,
    can_invite: true,
    created_at: now.toISOString(),
  };
  state.profiles.push(profile);
  state.memberships.push({
    space_id: ticket.target_space_id,
    user_id: profile.id,
    role: "member",
    joined_at: now.toISOString(),
  });
  ticket.redeemed_by_id = profile.id;
  ticket.redeemed_at = now.toISOString();
  state.currentUserId = profile.id;
  return profile;
}
export function castDemoVote(state: Snapshot, postId: string, vote: Vote) {
  const user = actor(state);
  const post = state.posts.find((p) => p.id === postId);
  if (!post) throw new Error("Beitrag nicht gefunden.");
  requireSpace(state, post.space_id);
  if (user.id === post.author_id)
    throw new Error("Über eigene Beiträge stimmt deine Nachbarschaft ab.");
  if (vote !== "valuable" && vote !== "slop")
    throw new Error("Ungültige Stimme.");
  const existing = state.votes.find(
    (v) => v.post_id === postId && v.voter_id === user.id,
  );
  if (existing) existing.vote = vote;
  else
    state.votes.push({
      id: newId(),
      post_id: postId,
      voter_id: user.id,
      vote,
      created_at: new Date().toISOString(),
    });
  const votes = state.votes.filter((v) => v.post_id === postId);
  post.valuable_votes_count = votes.filter((v) => v.vote === "valuable").length;
  post.slop_votes_count = votes.filter((v) => v.vote === "slop").length;
  post.slop_status = moderationStatus(
    post.valuable_votes_count,
    post.slop_votes_count,
  );
}
export function addDemoPost(state: Snapshot, input: PostInput) {
  validatePost(input);
  const user = actor(state);
  requireSpace(state, input.spaceId);
  if (
    input.parentId &&
    !state.posts.some(
      (p) => p.id === input.parentId && p.space_id === input.spaceId,
    )
  )
    throw new Error("Die Antwort gehört nicht in diesen Raum.");
  state.posts.unshift({
    id: newId(),
    author_id: user.id,
    space_id: input.spaceId,
    text: input.text.trim(),
    image_url: input.imageUrl || null,
    audio_url: input.audioUrl || null,
    audio_duration_sec: input.audioDuration || null,
    parent_id: input.parentId || null,
    slop_status: "clean",
    valuable_votes_count: 0,
    slop_votes_count: 0,
    created_at: new Date().toISOString(),
  });
}
export function validateUpload(bucket: Bucket, file: Blob) {
  const type = file.type.split(";")[0];
  const image = ["image/jpeg", "image/png", "image/webp"].includes(type);
  const audio = [
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/x-m4a",
  ].includes(type);
  if (
    bucket === "avatars"
      ? !image
      : bucket === "voice-intros"
        ? !audio
        : !image && !audio
  )
    throw new Error(
      "Bitte nutze ein JPG-, PNG-, WebP-Bild oder eine unterstützte Audiodatei.",
    );
  const max = bucket === "post-media" ? 10 : 5;
  if (!file.size || file.size > max * 1024 * 1024)
    throw new Error(
      `Die Datei muss kleiner als ${max} MB sein und Inhalt enthalten.`,
    );
}
export function createDemoRepository(): ClubhouseRepository {
  function read(): Snapshot {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return createDemoSnapshot();
    try {
      const state = JSON.parse(raw) as Snapshot;
      if (
        !Array.isArray(state.profiles) ||
        !Array.isArray(state.posts) ||
        !Array.isArray(state.tickets) ||
        !Array.isArray(state.votes) ||
        !Array.isArray(state.memberships) ||
        !Array.isArray(state.spaces)
      )
        throw new Error();
      return state;
    } catch {
      throw new Error(
        "Der lokale Demo-Speicher ist beschädigt. Setze die Demo über das Menü zurück.",
      );
    }
  }
  async function mutate<T>(fn: (state: Snapshot) => T): Promise<T> {
    const run = () => {
      const state = read();
      const result = fn(state);
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
      } catch {
        throw new Error(
          "Dein Demo-Speicher ist voll oder gesperrt. Verwende kleinere Medien oder setze die Demo zurück.",
        );
      }
      window.dispatchEvent(new Event("clubhouse-change"));
      return result;
    };
    return navigator.locks
      ? navigator.locks.request(DEMO_STORAGE_KEY, run)
      : run();
  }
  return {
    async load() {
      return read();
    },
    async inspectInvite(code) {
      const state = read();
      const ticket = state.tickets.find(
        (t) =>
          t.code === code.trim().toUpperCase() &&
          !t.redeemed_at &&
          new Date(t.expires_at) > new Date(),
      );
      const creator = state.profiles.find(
        (p) => p.id === ticket?.creator_id && p.can_invite,
      );
      const space = state.spaces.find(
        (s) =>
          s.id === ticket?.target_space_id &&
          s.owner_id &&
          s.access_type === "invite",
      );
      return {
        valid: Boolean(ticket && creator && space),
        space_slug: space?.slug || null,
        space_name: space?.name || null,
        inviter_username: creator?.username || null,
      };
    },
    onboard: (input) => mutate((state) => redeemDemoTicket(state, input)),
    createTicket: (spaceId) =>
      mutate((state) => issueDemoTicket(state, spaceId)),
    createPost: (input) => mutate((state) => addDemoPost(state, input)),
    vote: (postId, vote) =>
      mutate((state) => castDemoVote(state, postId, vote)),
    async upload(bucket, file) {
      validateUpload(bucket, file);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("Datei konnte nicht gelesen werden."));
        reader.readAsDataURL(file);
      });
    },
    async requestLogin() {
      await mutate((state) => {
        state.currentUserId =
          state.profiles.find((p) => p.username === "dennis")?.id || null;
      });
    },
    async verifyLogin() {},
    async hasSession() {
      return true;
    },
    async signOut() {
      await mutate((state) => {
        state.currentUserId = null;
      });
    },
    subscribe(onChange) {
      const storage = (event: StorageEvent) => {
        if (event.key === DEMO_STORAGE_KEY) onChange();
      };
      window.addEventListener("storage", storage);
      window.addEventListener("clubhouse-change", onChange);
      return () => {
        window.removeEventListener("storage", storage);
        window.removeEventListener("clubhouse-change", onChange);
      };
    },
  };
}
