import { browserClient } from "@/lib/supabase/browser";
import { validateIdentity, validatePost } from "@/lib/model";
import { newId, validateUpload } from "./demo";
import type { Bucket, Snapshot } from "@/lib/model";
import type { ClubhouseRepository } from "./contract";
const messages: Record<string, string> = {
  INVALID_TICKET:
    "Dieses Ticket ist ungültig, abgelaufen oder bereits eingelöst.",
  INVITES_REVOKED: "Die Einladungsrechte deines Bürgen sind pausiert.",
  NO_INVITES_LEFT: "Du hast alle drei Tickets vergeben.",
  AUTH_REQUIRED: "Bitte melde dich zuerst per E-Mail an.",
  PROFILE_REQUIRED: "Bitte schließe zuerst deine Vorstellung ab.",
  SPACE_FORBIDDEN: "Du bist noch nicht Mitglied in diesem Raum.",
  POST_FORBIDDEN: "Du kannst diesen Beitrag nicht prüfen.",
  SELF_VOTE_FORBIDDEN: "Über eigene Beiträge stimmt deine Nachbarschaft ab.",
  VOICE_REQUIRED: "Bitte nimm eine Vorstellung von 1 bis 15 Sekunden auf.",
  ALREADY_ONBOARDED: "Du bist bereits Mitglied. Willkommen zurück!",
};
function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23505")
    throw new Error(
      "Dieser Nutzername ist schon vergeben oder das Ticket wurde gerade eingelöst.",
    );
  throw new Error(messages[error.message] || error.message);
}
export function createSupabaseRepository(): ClubhouseRepository {
  const client = browserClient();
  const signed = new Map<string, { url: string; expires: number }>();
  async function signPaths(bucket: Bucket, paths: (string | null)[]) {
    const unique = [
      ...new Set(paths.filter((path): path is string => Boolean(path))),
    ];
    const missing = unique.filter((path) => {
      const cached = signed.get(`${bucket}:${path}`);
      return !cached || cached.expires < Date.now() + 60000;
    });
    if (missing.length) {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrls(missing, 3600);
      check(error);
      for (const item of data || []) {
        if (item.error)
          throw new Error(
            "Ein Medium konnte nicht geladen werden. Bitte später erneut versuchen.",
          );
        if (item.path && item.signedUrl)
          signed.set(`${bucket}:${item.path}`, {
            url: item.signedUrl,
            expires: Date.now() + 3600000,
          });
      }
    }
    return (path: string | null) =>
      path ? signed.get(`${bucket}:${path}`)?.url || null : null;
  }
  return {
    async load() {
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError")
        check(authError);
      if (!auth.user)
        return {
          profiles: [],
          spaces: [],
          memberships: [],
          posts: [],
          tickets: [],
          votes: [],
          currentUserId: null,
        };
      const [p, s, m, posts, t, v] = await Promise.all([
        client.from("profiles").select("*"),
        client.from("spaces").select("*"),
        client.from("space_members").select("*"),
        client
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        client.from("invite_tickets").select("*"),
        client.from("content_votes").select("*"),
      ]);
      [p, s, m, posts, t, v].forEach((r) => check(r.error));
      const [avatarUrl, voiceUrl, postUrl] = await Promise.all([
        signPaths(
          "avatars",
          (p.data || []).map((row) => row.avatar_url),
        ),
        signPaths(
          "voice-intros",
          (p.data || []).map((row) => row.voice_intro_url),
        ),
        signPaths(
          "post-media",
          (posts.data || []).flatMap((row) => [row.image_url, row.audio_url]),
        ),
      ]);
      const profiles = (p.data || []).map((row) => ({
        ...row,
        avatar_url: avatarUrl(row.avatar_url),
        voice_intro_url: voiceUrl(row.voice_intro_url),
      }));
      const resolvedPosts = (posts.data || []).map((row) => ({
        ...row,
        image_url: postUrl(row.image_url),
        audio_url: postUrl(row.audio_url),
      }));
      const snapshot: Snapshot = {
        profiles,
        spaces: s.data || [],
        memberships: m.data || [],
        posts: resolvedPosts,
        tickets: t.data || [],
        votes: v.data || [],
        currentUserId: auth.user.id,
      };
      return snapshot;
    },
    async inspectInvite(code) {
      const { data, error } = await client.rpc("inspect_invite", {
        p_code: code,
      });
      check(error);
      return data!;
    },
    async onboard(input) {
      validateIdentity(input);
      const { data, error } = await client.rpc("redeem_invite", {
        p_code: input.code,
        p_username: input.username,
        p_display_name: input.displayName,
        p_bio: input.bio,
        p_voice_path: input.voiceUrl,
        p_voice_duration_sec: input.voiceDuration,
      });
      check(error);
      return data!;
    },
    async createTicket(spaceId) {
      const { data, error } = await client.rpc("create_invite", {
        p_space_id: spaceId,
      });
      check(error);
      return data!;
    },
    async createPost(input) {
      validatePost(input);
      const { error } = await client.rpc("create_post", {
        p_space_id: input.spaceId,
        p_text: input.text,
        p_image_path: input.imageUrl || null,
        p_audio_path: input.audioUrl || null,
        p_audio_duration_sec: input.audioDuration || null,
        p_parent_id: input.parentId || null,
      });
      check(error);
    },
    async vote(postId, vote) {
      const { error } = await client.rpc("cast_content_vote", {
        p_post_id: postId,
        p_vote: vote,
      });
      check(error);
    },
    async upload(bucket, file) {
      validateUpload(bucket, file);
      const { data, error } = await client.auth.getUser();
      check(error);
      if (!data.user) throw new Error("Bitte melde dich zuerst an.");
      const type = file.type.split(";")[0];
      const ext: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/x-m4a": "m4a",
      };
      const path = `${data.user.id}/${newId()}.${ext[type]}`;
      const result = await client.storage
        .from(bucket)
        .upload(path, file, { contentType: type, upsert: false });
      check(result.error);
      return path;
    },
    async requestLogin(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      check(error);
    },
    async verifyLogin(email, token) {
      const { error } = await client.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      check(error);
    },
    async hasSession() {
      const { data } = await client.auth.getUser();
      return Boolean(data.user);
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      check(error);
      signed.clear();
    },
    subscribe(onChange) {
      let scheduled: ReturnType<typeof setTimeout> | undefined;
      const schedule = () => {
        if (scheduled) clearTimeout(scheduled);
        scheduled = setTimeout(onChange, 200);
      };
      const channel = client
        .channel("clubhouse-posts")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "posts" },
          schedule,
        )
        .subscribe();
      const { data } = client.auth.onAuthStateChange(() => {
        schedule();
      });
      const refresh = () => schedule();
      window.addEventListener("focus", refresh);
      const timer = setInterval(onChange, 45 * 60 * 1000);
      return () => {
        void client.removeChannel(channel);
        data.subscription.unsubscribe();
        window.removeEventListener("focus", refresh);
        clearInterval(timer);
        if (scheduled) clearTimeout(scheduled);
      };
    },
  };
}
