import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { buildInviteMail, readMailConfig } from "@/lib/mail";
import { serverClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };
const messages: Record<string, string> = {
  ADMIN_REQUIRED: "Dafür brauchst du Admin-Rechte.",
  WAITLIST_NOT_FOUND: "Dieser Eintrag existiert nicht mehr.",
  WAITLIST_NOT_APPROVED: "Dieser Eintrag ist noch nicht freigegeben.",
  SPACE_FORBIDDEN: "Der Raum Vibecoding Germany vergibt gerade keine Tickets.",
};
function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: noStore });
}
function mailConfig() {
  const env = process.env;
  return readMailConfig({
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASSWORD: env.SMTP_PASSWORD,
    SMTP_FROM: env.SMTP_FROM,
    SMTP_REPLY_TO: env.SMTP_REPLY_TO,
    SITE_URL: env.SITE_URL,
  });
}

export async function GET() {
  const mail = config.mode === "supabase" ? mailConfig() : null;
  return NextResponse.json(
    { enabled: Boolean(mail?.enabled) },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  if (config.mode !== "supabase")
    return fail(404, "Mailversand gibt es nur im Live-Betrieb.");
  // CSRF-Schutz: Fremde Seiten können diesen Header nicht ohne CORS-Preflight setzen.
  if (
    request.headers.get("x-humans-only") !== "admin" ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return fail(403, "Ungültige Anfrage.");
  const mail = mailConfig();
  if (!mail.enabled)
    return fail(503, "Mailversand ist auf dem Server nicht eingerichtet.");
  let entryId = "";
  try {
    const body = (await request.json()) as { entryId?: unknown };
    if (typeof body.entryId === "string") entryId = body.entryId;
  } catch {}
  if (!/^[0-9a-f-]{36}$/i.test(entryId)) return fail(400, "Ungültiger Eintrag.");

  const client = await serverClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return fail(401, "Bitte melde dich zuerst an.");

  // Rechte prüft die Datenbank (ADMIN_REQUIRED); die Route handelt als angemeldete Person.
  const approved = await client.rpc("approve_waitlist_entry", {
    p_entry_id: entryId,
  });
  if (approved.error)
    return fail(
      approved.error.code === "42501" ? 403 : 400,
      messages[approved.error.message] || "Die Freigabe hat nicht geklappt.",
    );
  const ticket = approved.data!;
  if (ticket.redeemed_at)
    return fail(409, "Das Ticket wurde schon eingelöst. Keine neue Mail nötig.");
  const [entry, inviter] = await Promise.all([
    client.from("waitlist_entries").select("*").eq("id", entryId).single(),
    client
      .from("profiles")
      .select("display_name")
      .eq("id", auth.user.id)
      .single(),
  ]);
  if (entry.error || !entry.data) return fail(404, messages.WAITLIST_NOT_FOUND);

  const message = buildInviteMail({
    name: entry.data.name,
    code: ticket.code,
    expiresAt: ticket.expires_at,
    inviterName: inviter.data?.display_name || "Dein Humans-Only-Team",
    siteUrl: mail.siteUrl,
    canReply: Boolean(mail.replyTo),
  });
  try {
    const { createTransport } = await import("nodemailer");
    const transport = createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      requireTLS: !mail.secure && mail.host !== "localhost" && mail.host !== "127.0.0.1",
      auth: mail.user ? { user: mail.user, pass: mail.password } : undefined,
    });
    await transport.sendMail({
      from: mail.from,
      to: entry.data.email,
      replyTo: mail.replyTo || undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (err) {
    // Keine SMTP-Details an den Browser; im Server-Log steht der Grund.
    console.error("waitlist invite mail failed", entryId, err);
    return fail(
      502,
      "Freigegeben, aber die Mail konnte nicht verschickt werden. Versuch es gleich noch einmal oder kopiere den Link.",
    );
  }
  const marked = await client.rpc("mark_waitlist_invited", {
    p_entry_id: entryId,
  });
  if (marked.error)
    console.error("waitlist invite mark failed", entryId, marked.error.message);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
