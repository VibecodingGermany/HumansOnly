import test from "node:test";
import assert from "node:assert/strict";
import { createDemoSnapshot, SPACE_ID } from "../lib/seed";
import {
  DEFAULT_NOTIFICATIONS,
  normalizeLinkUrl,
  validateEmailAddress,
  validateProfileUpdate,
} from "../lib/model";
import type { ProfileUpdate } from "../lib/model";
import {
  addDemoPost,
  changeDemoEmail,
  deleteDemoAccount,
  setDemoAvatar,
  updateDemoNotifications,
  updateDemoProfile,
} from "../lib/repositories/demo";
import { handleAuthCallback } from "../lib/auth-callback";

const valid: ProfileUpdate = {
  displayName: "  Dennis  ",
  bio: "Hallo",
  location: " Oldenburg ",
  pronouns: "er/ihm",
  links: [{ label: "", url: "example.org/me" }],
  visibility: "public",
  showPosts: true,
  showTrustTree: false,
};

test("link addresses get https, and only http(s) with a real host pass", () => {
  assert.equal(normalizeLinkUrl("example.org"), "https://example.org/");
  assert.equal(
    normalizeLinkUrl(" http://example.org/a?b=1 "),
    "http://example.org/a?b=1",
  );
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "ftp://example.org",
    "https://localhost",
    "https://user:pw@example.org",
    "not a url",
    "",
    "   ",
  ])
    assert.throws(() => normalizeLinkUrl(bad), bad);
  assert.throws(
    () => normalizeLinkUrl(`https://example.org/${"a".repeat(200)}`),
    /200 Zeichen/,
  );
});

test("profile update is trimmed, links get a host-based title", () => {
  const clean = validateProfileUpdate(valid);
  assert.equal(clean.displayName, "Dennis");
  assert.equal(clean.location, "Oldenburg");
  assert.deepEqual(clean.links, [
    { label: "example.org", url: "https://example.org/me" },
  ]);
  assert.equal(clean.visibility, "public");
});

test("empty link rows are dropped, the sixth link and bad fields are rejected", () => {
  assert.deepEqual(
    validateProfileUpdate({ ...valid, links: [{ label: " ", url: " " }] })
      .links,
    [],
  );
  const link = { label: "x", url: "https://example.org" };
  assert.throws(
    () => validateProfileUpdate({ ...valid, links: Array(6).fill(link) }),
    /höchstens 5/,
  );
  assert.throws(
    () => validateProfileUpdate({ ...valid, displayName: " " }),
    /Namen/,
  );
  assert.throws(
    () => validateProfileUpdate({ ...valid, bio: "x".repeat(301) }),
    /300/,
  );
  assert.throws(
    () => validateProfileUpdate({ ...valid, location: "x".repeat(61) }),
    /60/,
  );
  assert.throws(
    () => validateProfileUpdate({ ...valid, pronouns: "x".repeat(31) }),
    /30/,
  );
  assert.throws(
    () =>
      validateProfileUpdate({
        ...valid,
        visibility: "everyone" as unknown as "public",
      }),
    /sehen darf/,
  );
  assert.throws(
    () =>
      validateProfileUpdate({
        ...valid,
        links: [{ label: "x".repeat(41), url: "https://example.org" }],
      }),
    /40 Zeichen/,
  );
});

test("email addresses are validated and lower-cased", () => {
  assert.equal(validateEmailAddress(" A@Example.ORG "), "a@example.org");
  assert.throws(() => validateEmailAddress("kaputt"), /gültige/);
});

test("demo: saving the profile writes every field to the current member only", () => {
  const s = createDemoSnapshot();
  const others = JSON.stringify(s.profiles.slice(1));
  const me = updateDemoProfile(s, valid);
  assert.equal(me.id, s.currentUserId);
  assert.equal(me.display_name, "Dennis");
  assert.equal(me.visibility, "public");
  assert.equal(me.show_trust_tree, false);
  assert.equal(me.links[0].url, "https://example.org/me");
  assert.equal(JSON.stringify(s.profiles.slice(1)), others);
});

test("demo: invalid updates and logged-out sessions change nothing", () => {
  const s = createDemoSnapshot();
  const before = JSON.stringify(s.profiles);
  assert.throws(() => updateDemoProfile(s, { ...valid, displayName: "" }));
  assert.equal(JSON.stringify(s.profiles), before);
  s.currentUserId = null;
  assert.throws(() => updateDemoProfile(s, valid), /Ticket/);
  assert.throws(() => setDemoAvatar(s, "x"), /Ticket/);
});

test("demo: avatar can be set and removed", () => {
  const s = createDemoSnapshot();
  assert.equal(
    setDemoAvatar(s, "data:image/webp;base64,AAAA").avatar_url,
    "data:image/webp;base64,AAAA",
  );
  assert.equal(setDemoAvatar(s, null).avatar_url, null);
});

test("demo: notification settings and e-mail are stored", () => {
  const s = createDemoSnapshot();
  assert.deepEqual(s.settings, DEFAULT_NOTIFICATIONS);
  updateDemoNotifications(s, {
    notify_replies: false,
    notify_ticket_redeemed: false,
    notify_news: true,
  });
  assert.deepEqual(s.settings, {
    notify_replies: false,
    notify_ticket_redeemed: false,
    notify_news: true,
  });
  changeDemoEmail(s, "Neu@Example.org");
  assert.equal(s.email, "neu@example.org");
  assert.throws(() => changeDemoEmail(s, "nope"));
});

test("demo: a room host cannot delete the account", () => {
  const s = createDemoSnapshot();
  assert.ok(s.spaces.some((sp) => sp.owner_id === s.currentUserId));
  assert.throws(() => deleteDemoAccount(s), /Gastgeber/);
  assert.ok(s.profiles.some((p) => p.id === s.currentUserId));
});

test("demo: deleting an account removes the member, their posts, replies, votes and tickets", () => {
  const s = createDemoSnapshot();
  const host = s.currentUserId!;
  const leaver = s.profiles.find((p) => p.id !== host)!;
  s.currentUserId = leaver.id;
  addDemoPost(s, { spaceId: SPACE_ID, text: "Bald weg" });
  const mine = s.posts[0];
  s.currentUserId = host;
  addDemoPost(s, { spaceId: SPACE_ID, text: "Antwort", parentId: mine.id });
  s.votes.push({
    id: "v-1",
    post_id: mine.id,
    voter_id: host,
    vote: "valuable",
    created_at: "2026-11-01T10:00:00.000Z",
  });
  s.votes.push({
    id: "v-2",
    post_id: s.posts[s.posts.length - 1].id,
    voter_id: leaver.id,
    vote: "valuable",
    created_at: "2026-11-01T10:00:00.000Z",
  });
  s.tickets.push({
    id: "t-1",
    code: "WEG",
    creator_id: leaver.id,
    target_space_id: SPACE_ID,
    redeemed_by_id: null,
    redeemed_at: null,
    expires_at: "2027-01-01T00:00:00.000Z",
  });
  const invited = s.profiles.find((p) => p.id !== host && p.id !== leaver.id)!;
  invited.invited_by_id = leaver.id;
  s.currentUserId = leaver.id;
  deleteDemoAccount(s);
  assert.equal(s.currentUserId, null);
  assert.ok(!s.profiles.some((p) => p.id === leaver.id));
  assert.ok(
    !s.posts.some(
      (p) =>
        p.author_id === leaver.id ||
        p.id === mine.id ||
        p.parent_id === mine.id,
    ),
  );
  assert.ok(s.posts.length > 0, "posts of other members stay");
  assert.ok(
    !s.votes.some((v) => v.voter_id === leaver.id || v.post_id === mine.id),
  );
  assert.ok(!s.tickets.some((t) => t.creator_id === leaver.id));
  assert.ok(!s.memberships.some((m) => m.user_id === leaver.id));
  assert.equal(
    s.profiles.find((p) => p.id === invited.id)!.invited_by_id,
    null,
  );
});

test("auth callback honors only the allow-listed settings destination", async () => {
  const ok = async () => ({ error: null });
  const target = async (next: string) =>
    (
      await handleAuthCallback(
        new Request(
          `https://x.test/auth/callback?code=c&next=${encodeURIComponent(next)}`,
        ),
        ok,
      )
    ).headers.get("Location");
  assert.equal(await target("/einstellungen"), "/einstellungen");
  for (const evil of [
    "https://evil.example",
    "//evil.example",
    "/admin",
    "/einstellungen/../x",
    "",
  ])
    assert.equal(await target(evil), "/onboarding", evil);
  const failed = await handleAuthCallback(
    new Request("https://x.test/auth/callback?code=c&next=/einstellungen"),
    async () => ({ error: new Error("expired") }),
  );
  assert.equal(failed.headers.get("Location"), "/invite?auth_error=1");
});
