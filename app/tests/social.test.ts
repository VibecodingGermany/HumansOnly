import test from "node:test";
import assert from "node:assert/strict";
import {
  detectEmbed,
  displayUrl,
  firstUrl,
  isPrivateAddress,
  parsePreview,
  tokenize,
} from "../lib/links";
import { likeSummary, timeAgo } from "../lib/time";
import { canDeletePost } from "../lib/model";
import { createDemoSnapshot, SPACE_ID } from "../lib/seed";
import {
  addDemoPost,
  deleteDemoAccount,
  deleteDemoPost,
  setDemoVoiceIntro,
  toggleDemoLike,
} from "../lib/repositories/demo";

test("links in text become clickable segments without trailing punctuation", () => {
  const parts = tokenize(
    "Schau mal: https://example.org/a?b=1. Und www.heise.de, oder (https://de.wikipedia.org/wiki/Kiel_(Begriffsklärung))!",
  );
  const urls = parts.filter((p) => p.kind === "url").map((p) => p.href);
  assert.deepEqual(urls, [
    "https://example.org/a?b=1",
    "https://www.heise.de/",
    "https://de.wikipedia.org/wiki/Kiel_(Begriffskl%C3%A4rung)",
  ]);
  assert.equal(
    parts.map((p) => p.text).join(""),
    "Schau mal: https://example.org/a?b=1. Und www.heise.de, oder (https://de.wikipedia.org/wiki/Kiel_(Begriffsklärung))!",
  );
});

test("dangerous or incomplete schemes never become links", () => {
  const parts = tokenize(
    "javascript:alert(1) data:text/html,x http://localhost",
  );
  assert.equal(parts.filter((p) => p.kind === "url").length, 0);
});

test("mentions are recognised, e-mail addresses are not", () => {
  const parts = tokenize("Hallo @Mira und mail@example.org");
  assert.deepEqual(
    parts
      .filter((p) => p.kind === "mention")
      .map((p) => p.kind === "mention" && p.username),
    ["mira"],
  );
});

test("first url wins the preview; long links are shortened for display", () => {
  assert.equal(
    firstUrl("a https://one.org b https://two.org"),
    "https://one.org/",
  );
  assert.equal(firstUrl("kein Link hier"), null);
  assert.ok(displayUrl(`https://example.org/${"x".repeat(80)}`).endsWith("…"));
});

test("spotify and youtube links map to fixed player urls", () => {
  assert.deepEqual(
    detectEmbed(
      "https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=abc",
    ),
    {
      provider: "spotify",
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      height: 152,
    },
  );
  assert.equal(
    detectEmbed("https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6")
      ?.height,
    352,
  );
  assert.equal(
    detectEmbed("https://youtu.be/dQw4w9WgXcQ?t=42")?.src,
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42",
  );
  assert.equal(
    detectEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x")?.src,
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  assert.equal(
    detectEmbed("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.provider,
    "youtube",
  );
  assert.equal(detectEmbed("https://open.spotify.com/track/<script>"), null);
  assert.equal(
    detectEmbed(
      "https://evil.example/open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
    ),
    null,
  );
});

test("open graph metadata is parsed, decoded and only https images are kept", () => {
  const html = `<html><head><title>Fallback</title>
    <meta property="og:title" content="Gr&uuml;&szlig;e &amp; mehr">
    <meta content='Eine Beschreibung' name='description'>
    <meta property="og:image" content="/bild.png">
    <meta property="og:site_name" content="Beispiel">
  </head></html>`;
  const p = parsePreview(html, "https://example.org/artikel");
  assert.equal(p.title, "Grüße & mehr");
  assert.equal(p.description, "Eine Beschreibung");
  assert.equal(p.image, "https://example.org/bild.png");
  assert.equal(p.siteName, "Beispiel");
  const insecure = parsePreview(
    '<meta property="og:image" content="http://x.org/a.png"><title>T</title>',
    "http://x.org/",
  );
  assert.equal(insecure.image, null);
  assert.equal(insecure.title, "T");
  assert.equal(insecure.siteName, "x.org");
});

test("private and special addresses are blocked for previews", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "nonsense",
  ])
    assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ["93.184.216.34", "2a00:1450:4001:80b::200e", "172.32.0.1"])
    assert.equal(isPrivateAddress(ip), false, ip);
});

test("likes toggle, are counted and never apply to own posts", () => {
  const s = createDemoSnapshot();
  const me = s.currentUserId!;
  const foreign = s.posts.find(
    (p) =>
      p.author_id !== me &&
      !p.parent_id &&
      !s.likes.some((l) => l.post_id === p.id && l.user_id === me),
  )!;
  const before = foreign.likes_count;
  assert.deepEqual(toggleDemoLike(s, foreign.id), {
    liked: true,
    likes_count: before + 1,
  });
  assert.deepEqual(toggleDemoLike(s, foreign.id), {
    liked: false,
    likes_count: before,
  });
  const own = s.posts.find((p) => p.author_id === me)!;
  assert.throws(() => toggleDemoLike(s, own.id), /Eigene Beiträge/);
});

test("seeded like counts match the like rows", () => {
  const s = createDemoSnapshot();
  for (const post of s.posts)
    assert.equal(
      post.likes_count,
      s.likes.filter((l) => l.post_id === post.id).length,
    );
  assert.ok(
    s.likes.every(
      (l) => s.posts.find((p) => p.id === l.post_id)?.author_id !== l.user_id,
    ),
  );
});

test("deleting a post removes its comments, likes and votes; others may not delete", () => {
  const s = createDemoSnapshot();
  const me = s.currentUserId!;
  addDemoPost(s, { spaceId: null, text: "Mein Gedanke" });
  const mine = s.posts[0];
  s.currentUserId = s.profiles[1].id;
  addDemoPost(s, { spaceId: null, text: "Kommentar", parentId: mine.id });
  toggleDemoLike(s, mine.id);
  const comment = s.posts[0];
  assert.throws(() => deleteDemoPost(s, mine.id), /nicht löschen/);
  deleteDemoPost(s, comment.id);
  assert.equal(
    s.posts.some((p) => p.id === comment.id),
    false,
  );
  s.currentUserId = me;
  deleteDemoPost(s, mine.id);
  assert.equal(
    s.posts.some((p) => p.id === mine.id),
    false,
  );
  assert.equal(
    s.likes.some((l) => l.post_id === mine.id),
    false,
  );
});

test("room owners and admins can moderate, members only their own posts", () => {
  const s = createDemoSnapshot();
  const roomPost = s.posts.find(
    (p) => p.space_id === SPACE_ID && p.author_id !== s.currentUserId,
  )!;
  assert.equal(canDeletePost({ ...s, isAdmin: false }, roomPost), true); // Dennis ist Gastgeber.
  s.currentUserId = s.profiles[2].id;
  assert.equal(
    canDeletePost({ ...s, isAdmin: false }, roomPost),
    roomPost.author_id === s.currentUserId,
  );
  const lobbyPost = s.posts.find(
    (p) => p.space_id === null && p.author_id !== s.currentUserId,
  )!;
  assert.equal(canDeletePost({ ...s, isAdmin: false }, lobbyPost), false);
  assert.equal(canDeletePost({ ...s, isAdmin: true }, lobbyPost), true);
});

test("account deletion removes the person's likes and recounts", () => {
  const s = createDemoSnapshot();
  s.currentUserId = s.profiles[1].id; // Mira ist keine Gastgeberin.
  deleteDemoAccount(s);
  assert.equal(
    s.likes.some(
      (l) => l.user_id === s.profiles.find((p) => p.username === "mira")?.id,
    ),
    false,
  );
  for (const post of s.posts)
    assert.equal(
      post.likes_count,
      s.likes.filter((l) => l.post_id === post.id).length,
    );
});

test("voice intro can be re-recorded within 1-15 seconds", () => {
  const s = createDemoSnapshot();
  assert.throws(
    () => setDemoVoiceIntro(s, "data:audio/webm;base64,AA", 16),
    /1 bis 15/,
  );
  const me = setDemoVoiceIntro(s, "data:audio/webm;base64,AA", 9);
  assert.equal(me.voice_duration_sec, 9);
});

test("like summaries and relative times read naturally", () => {
  assert.equal(likeSummary(["Mira"]), "Gefällt Mira");
  assert.equal(likeSummary(["Mira", "Jonas"]), "Gefällt Mira und Jonas");
  assert.equal(
    likeSummary(["Mira", "Jonas", "Lea"]),
    "Gefällt Mira, Jonas und einer weiteren Person",
  );
  assert.equal(
    likeSummary(["Mira", "Jonas", "Lea", "Tom"]),
    "Gefällt Mira, Jonas und 2 weiteren",
  );
  const now = Date.parse("2026-11-09T12:00:00Z");
  assert.equal(timeAgo("2026-11-09T11:59:50Z", now), "gerade eben");
  assert.equal(timeAgo("2026-11-09T11:55:00Z", now), "vor 5 Minuten");
  assert.equal(timeAgo("2026-11-08T12:00:00Z", now), "gestern");
});
