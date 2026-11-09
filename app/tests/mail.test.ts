import test from "node:test";
import assert from "node:assert/strict";
import { buildInviteMail, readMailConfig } from "../lib/mail";
import { createDemoSnapshot } from "../lib/seed";
import { inviteDemoWaitlist } from "../lib/repositories/demo";

test("mail stays disabled until host, sender and https site URL are set", () => {
  assert.equal(readMailConfig({}).enabled, false);
  assert.equal(
    readMailConfig({ SMTP_HOST: "smtp.example.org", SMTP_FROM: "a@b.de" })
      .enabled,
    false,
  );
  assert.equal(
    readMailConfig({
      SMTP_HOST: "smtp.example.org",
      SMTP_FROM: "a@b.de",
      SITE_URL: "http://humans-only.de",
    }).enabled,
    false,
  );
  const cfg = readMailConfig({
    SMTP_HOST: "smtp.example.org",
    SMTP_PORT: "465",
    SMTP_FROM: "Humans Only <noreply@example.org>",
    SITE_URL: "https://humans-only.de/irgendwas",
  });
  assert(cfg.enabled);
  assert.equal(cfg.siteUrl, "https://humans-only.de");
  assert.equal(cfg.secure, true);
  assert.equal(cfg.port, 465);
});
test("invite mail uses the canonical site URL and escapes names", () => {
  const mail = buildInviteMail({
    name: '<b>Eve</b> "Hack"',
    code: "ABC123",
    expiresAt: "2026-12-09T10:00:00.000Z",
    inviterName: "Dennis",
    siteUrl: "https://humans-only.de",
    canReply: false,
  });
  assert.equal(mail.url, "https://humans-only.de/invite?code=ABC123");
  assert(mail.text.includes(mail.url));
  assert(mail.text.includes("9.12.2026"));
  assert(!mail.html.includes("<b>Eve</b>"));
  assert(mail.html.includes("&lt;b&gt;Eve&lt;/b&gt;"));
  assert(!mail.text.includes("Antworte"));
});
test("demo invite approves once and logs each send", () => {
  const s = createDemoSnapshot();
  const entry = s.waitlist[0];
  inviteDemoWaitlist(s, entry.id);
  inviteDemoWaitlist(s, entry.id);
  assert.equal(entry.status, "approved");
  assert.equal(entry.invite_count, 2);
  assert(entry.invited_at);
  assert.equal(s.tickets.filter((t) => t.id === entry.ticket_id).length, 1);
});
