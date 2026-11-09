import { browserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_NOTIFICATIONS,
  validateEmailAddress,
  validateIdentity,
  validatePost,
  validateProfileUpdate,
  validateWaitlist,
} from "@/lib/model";
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
  INVALID_NAME: "Bitte gib deinen Namen mit höchstens 80 Zeichen ein.",
  INVALID_EMAIL: "Bitte gib eine gültige E-Mail-Adresse ein.",
  WAITLIST_BUSY:
    "Gerade tragen sich sehr viele Menschen ein. Bitte versuche es in ein paar Minuten noch einmal.",
  ADMIN_REQUIRED: "Dafür brauchst du Admin-Rechte.",
  WAITLIST_NOT_FOUND: "Dieser Eintrag existiert nicht mehr.",
  INVALID_DISPLAY_NAME: "Bitte gib einen Namen mit höchstens 60 Zeichen ein.",
  INVALID_BIO: "Deine Bio darf höchstens 300 Zeichen haben.",
  INVALID_LOCATION: "Dein Ort darf höchstens 60 Zeichen haben.",
  INVALID_PRONOUNS: "Deine Pronomen dürfen höchstens 30 Zeichen haben.",
  INVALID_LINKS:
    "Mindestens ein Link ist ungültig. Erlaubt sind bis zu fünf http- oder https-Adressen.",
  INVALID_VISIBILITY: "Bitte wähle, wer dein Profil sehen darf.",
  INVALID_SETTINGS: "Diese Einstellung konnte nicht gespeichert werden.",
  INVALID_MEDIA:
    "Dieses Bild gehört nicht zu deinem Konto. Bitte lade es neu hoch.",
  OWNER_CANNOT_DELETE:
    "Du bist Gastgeber eines Raums. Übergib ihn zuerst, bevor du dein Konto löschst.",
  WAITLIST_ALREADY_APPROVED:
    "Dieser Mensch ist schon freigegeben und hat ein Ticket.",
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
          email: null,
          settings: { ...DEFAULT_NOTIFICATIONS },
          waitlist: [],
          isAdmin: false,
        };
      const [p, s, m, posts, t, v, admin, prefs] = await Promise.all([
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
        client.rpc("is_admin"),
        client.from("profile_settings").select("*").maybeSingle(),
      ]);
      [p, s, m, posts, t, v, admin, prefs].forEach((r) => check(r.error));
      let waitlist: Snapshot["waitlist"] = [];
      if (admin.data) {
        const w = await client
          .from("waitlist_entries")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(1000);
        check(w.error);
        waitlist = w.data || [];
      }
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
        email: auth.user.email ?? null,
        settings: prefs.data
          ? {
              notify_replies: prefs.data.notify_replies,
              notify_ticket_redeemed: prefs.data.notify_ticket_redeemed,
              notify_news: prefs.data.notify_news,
            }
          : { ...DEFAULT_NOTIFICATIONS },
        waitlist,
        isAdmin: Boolean(admin.data),
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
    async updateProfile(input) {
      const clean = validateProfileUpdate(input);
      const { error } = await client.rpc("update_profile", {
        p_display_name: clean.displayName,
        p_bio: clean.bio,
        p_location: clean.location,
        p_pronouns: clean.pronouns,
        p_links: clean.links,
        p_visibility: clean.visibility,
        p_show_posts: clean.showPosts,
        p_show_trust_tree: clean.showTrustTree,
      });
      check(error);
    },
    async setAvatar(path) {
      const { error } = await client.rpc("set_avatar", { p_path: path });
      check(error);
    },
    async updateNotifications(settings) {
      const { error } = await client.rpc("update_notification_settings", {
        p_replies: settings.notify_replies,
        p_ticket_redeemed: settings.notify_ticket_redeemed,
        p_news: settings.notify_news,
      });
      check(error);
    },
    async requestEmailChange(email) {
      const clean = validateEmailAddress(email);
      const { error } = await client.auth.updateUser(
        { email: clean },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/einstellungen`,
        },
      );
      check(error);
    },
    async deleteAccount() {
      const { error } = await client.rpc("delete_my_account");
      check(error);
      // Die Sitzung gehört zu einem gelöschten Konto; lokal abmelden ist hier nur Aufräumen.
      await client.auth.signOut({ scope: "local" });
      signed.clear();
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
    async joinWaitlist(name, email) {
      const clean = validateWaitlist(name, email);
      const { error } = await client.rpc("join_waitlist", {
        p_name: clean.name,
        p_email: clean.email,
      });
      check(error);
    },
    async approveWaitlist(entryId) {
      const { data, error } = await client.rpc("approve_waitlist_entry", {
        p_entry_id: entryId,
      });
      check(error);
      return data!;
    },
    async mailStatus() {
      try {
        const res = await fetch("/api/admin/waitlist/invite", {
          cache: "no-store",
        });
        const body = (await res.json()) as { enabled?: boolean };
        return { enabled: Boolean(res.ok && body.enabled), simulated: false };
      } catch {
        return { enabled: false, simulated: false };
      }
    },
    async sendWaitlistInvite(entryId) {
      const res = await fetch("/api/admin/waitlist/invite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-humans-only": "admin",
        },
        body: JSON.stringify({ entryId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error || "Die Einladung konnte nicht verschickt werden.",
        );
      }
    },
    async rejectWaitlist(entryId) {
      const { error } = await client.rpc("reject_waitlist_entry", {
        p_entry_id: entryId,
      });
      check(error);
    },
    async deleteWaitlist(entryId) {
      const { error } = await client.rpc("delete_waitlist_entry", {
        p_entry_id: entryId,
      });
      check(error);
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
