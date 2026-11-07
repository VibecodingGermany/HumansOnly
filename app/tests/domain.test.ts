import test from "node:test";
import assert from "node:assert/strict";
import { createDemoSnapshot, DEMO_CODE, SPACE_ID } from "../lib/seed";
import { moderationStatus, validateIdentity, validatePost } from "../lib/model";
import { readConfig } from "../lib/config";
import {
  addDemoPost,
  castDemoVote,
  issueDemoTicket,
  redeemDemoTicket,
  validateUpload,
} from "../lib/repositories/demo";
const identity = {
  code: DEMO_CODE,
  username: "neuer_mensch",
  displayName: "Neuer Mensch",
  bio: "Hallo!",
  voiceUrl: "data:audio/webm;base64,AAAA",
  voiceDuration: 12,
};
test("three issuance credits cannot issue a fourth ticket", () => {
  const s = createDemoSnapshot();
  const me = s.profiles[0];
  for (let i = 0; i < 3; i++) issueDemoTicket(s, SPACE_ID);
  assert.equal(me.invites_left, 0);
  assert.equal(s.tickets.filter((t) => t.creator_id === me.id).length, 3);
  assert.throws(() => issueDemoTicket(s, SPACE_ID), /alle drei/);
});
test("redemption creates profile, inviter relationship, room membership and consumes one ticket", () => {
  const s = createDemoSnapshot();
  const ticket = s.tickets[0];
  const p = redeemDemoTicket(s, identity);
  assert.equal(p.invites_left, 3);
  assert.equal(p.invited_by_id, ticket.creator_id);
  assert.equal(s.currentUserId, p.id);
  assert(
    s.memberships.some((m) => m.user_id === p.id && m.space_id === SPACE_ID),
  );
  assert.equal(ticket.redeemed_by_id, p.id);
  assert.throws(
    () => redeemDemoTicket(s, { ...identity, username: "noch_einer" }),
    /bereits eingelöst/,
  );
});
test("expired and revoked invitations never admit a guest", () => {
  const s = createDemoSnapshot();
  s.tickets[0].expires_at = "2000-01-01T00:00:00Z";
  assert.throws(() => redeemDemoTicket(s, identity), /ungültig/);
  s.tickets[0].expires_at = "2037-01-01T00:00:00Z";
  s.profiles[1].can_invite = false;
  assert.throws(() => redeemDemoTicket(s, identity), /ungültig/);
  assert.equal(s.profiles.length, 6);
});
test("duplicate usernames and invalid voice duration fail before redemption", () => {
  const s = createDemoSnapshot();
  assert.throws(
    () => redeemDemoTicket(s, { ...identity, username: "mira" }),
    /vergeben/,
  );
  assert.throws(
    () => redeemDemoTicket(s, { ...identity, voiceDuration: 16 }),
    /15 Sekunden/,
  );
  assert.equal(s.tickets[0].redeemed_at, null);
});
test("vote switching is idempotent, hiding and rehabilitation share exact thresholds", () => {
  const s = createDemoSnapshot();
  const p = s.posts[2];
  castDemoVote(s, p.id, "slop");
  assert.equal(p.slop_status, "hidden");
  assert.equal(p.slop_votes_count, 3);
  castDemoVote(s, p.id, "slop");
  assert.equal(p.slop_votes_count, 3);
  castDemoVote(s, p.id, "valuable");
  assert.equal(p.slop_votes_count, 2);
  assert.equal(p.valuable_votes_count, 1);
  assert.equal(p.slop_status, "under_review");
  s.currentUserId = s.profiles[1].id;
  castDemoVote(s, p.id, "valuable");
  assert.equal(p.slop_status, "valuable_verified");
  assert.equal(p.slop_votes_count, 1);
  assert.equal(p.valuable_votes_count, 2);
});
test("own votes and room actions by nonmembers are rejected", () => {
  const s = createDemoSnapshot();
  assert.throws(() => castDemoVote(s, s.posts[3].id, "slop"), /eigene/);
  s.memberships = s.memberships.filter((m) => m.user_id !== s.currentUserId);
  assert.throws(() => castDemoVote(s, s.posts[0].id, "slop"), /Mitglied/);
  assert.throws(
    () => addDemoPost(s, { spaceId: SPACE_ID, text: "no" }),
    /Mitglied/,
  );
  assert.throws(() => issueDemoTicket(s, SPACE_ID), /Mitglied/);
});
test("lobby text, image, voice and replies retain correct scope", () => {
  const s = createDemoSnapshot();
  addDemoPost(s, { spaceId: null, text: "Hallo Lobby" });
  const parent = s.posts[0];
  assert.equal(parent.space_id, null);
  addDemoPost(s, {
    spaceId: null,
    text: "",
    audioUrl: "data:audio/webm;base64,AAAA",
    audioDuration: 12,
    parentId: parent.id,
  });
  assert.equal(s.posts[0].parent_id, parent.id);
  assert.throws(
    () =>
      addDemoPost(s, {
        spaceId: SPACE_ID,
        text: "wrong room",
        parentId: parent.id,
      }),
    /nicht in diesen Raum/,
  );
  assert.throws(() => validatePost({ spaceId: null, text: " " }), /leer/);
});
test("media validation rejects executable SVG and oversized voice uploads", () => {
  assert.throws(
    () =>
      validateUpload(
        "avatars",
        new Blob(["<svg/>"], { type: "image/svg+xml" }),
      ),
    /Bitte nutze/,
  );
  assert.throws(
    () =>
      validateUpload(
        "voice-intros",
        new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "audio/webm" }),
      ),
    /5 MB/,
  );
  assert.doesNotThrow(() =>
    validateUpload(
      "voice-intros",
      new Blob(["voice"], { type: "audio/webm;codecs=opus" }),
    ),
  );
});
test("missing live configuration is an explicit error and cannot silently use demo", () => {
  assert.equal(readConfig({}).mode, "demo");
  assert.throws(() => readConfig({ mode: "supabase" }), /benötigt/);
  assert.throws(() => readConfig({ mode: "production" }), /demo oder supabase/);
});
test("status ordering and username constraints", () => {
  assert.equal(moderationStatus(0, 0), "clean");
  assert.equal(moderationStatus(2, 2), "under_review");
  assert.equal(moderationStatus(3, 2), "valuable_verified");
  assert.equal(moderationStatus(2, 5), "hidden");
  assert.throws(
    () => validateIdentity({ ...identity, username: "Bad Name" }),
    /Nutzername/,
  );
  assert.throws(
    () => validateIdentity({ ...identity, voiceDuration: NaN }),
    /15 Sekunden/,
  );
});
