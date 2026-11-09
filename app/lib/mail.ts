// Nur serverseitig verwenden. SMTP-Zugangsdaten kommen ausschließlich aus Server-Umgebungsvariablen
// (niemals NEXT_PUBLIC_*), damit sie nicht in Browser-Bundles landen.
export type MailConfig =
  | { enabled: false; reason: string }
  | {
      enabled: true;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: string;
      replyTo: string;
      siteUrl: string;
    };

type MailEnv = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;
  SMTP_REPLY_TO?: string;
  SITE_URL?: string;
};

export function readMailConfig(env: MailEnv): MailConfig {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  const site = env.SITE_URL?.trim();
  if (!host || !from || !site)
    return {
      enabled: false,
      reason: "SMTP_HOST, SMTP_FROM und SITE_URL sind nicht gesetzt.",
    };
  let siteUrl: string;
  try {
    const url = new URL(site);
    if (url.protocol !== "https:" && url.hostname !== "localhost")
      throw new Error();
    siteUrl = url.origin;
  } catch {
    return { enabled: false, reason: "SITE_URL ist keine gültige https-URL." };
  }
  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    return { enabled: false, reason: "SMTP_PORT ist ungültig." };
  return {
    enabled: true,
    host,
    port,
    secure: port === 465,
    user: env.SMTP_USER?.trim() || "",
    password: env.SMTP_PASSWORD || "",
    from,
    replyTo: env.SMTP_REPLY_TO?.trim() || "",
    siteUrl,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildInviteMail(input: {
  name: string;
  code: string;
  expiresAt: string;
  inviterName: string;
  siteUrl: string;
  canReply: boolean;
}) {
  const footer = input.canReply
    ? "Du bekommst diese Mail, weil du dich auf der Warteliste von Humans Only eingetragen hast. Antworte einfach, wenn wir deinen Eintrag löschen sollen."
    : "Du bekommst diese Mail, weil du dich auf der Warteliste von Humans Only eingetragen hast.";
  const first = input.name.trim().split(/\s+/)[0] || "Mensch";
  const url = `${input.siteUrl}/invite?code=${encodeURIComponent(input.code)}`;
  const until = new Date(input.expiresAt).toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
  });
  const subject = "Dein Goldenes Ticket für Humans Only";
  const text = [
    `Moin ${first},`,
    "",
    "du hattest dich auf die Warteliste von Humans Only gesetzt – jetzt ist dein Platz frei!",
    "",
    "Mit diesem Goldenen Ticket kommst du ins Clubhaus und direkt in den Raum Vibecoding Germany:",
    url,
    "",
    `Das Ticket ist bis ${until} gültig und nur einmal einlösbar. Beim Eintreten nimmst du eine kurze Sprach-Vorstellung auf (höchstens 15 Sekunden) – so wissen alle, dass hier echte Menschen sind.`,
    "",
    "Bis gleich im Clubhaus!",
    input.inviterName,
    "",
    "--",
    footer,
  ].join("\n");
  const html = `<!doctype html><html lang="de"><body style="margin:0;background:#faf7ef;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:12px;font-weight:bold;letter-spacing:.08em;margin:0 0 18px">HUMANS ONLY®</p>
<div style="background:#ffffff;border:2px solid #0a0a0a;border-radius:8px;padding:28px;box-shadow:5px 5px 0 #0a0a0a">
<p style="font-size:16px;margin:0 0 14px">Moin ${escapeHtml(first)},</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 14px">du hattest dich auf die Warteliste von Humans Only gesetzt – <strong>jetzt ist dein Platz frei!</strong></p>
<p style="font-size:15px;line-height:1.6;margin:0 0 22px">Mit deinem Goldenen Ticket kommst du ins Clubhaus und direkt in den Raum Vibecoding Germany.</p>
<p style="margin:0 0 22px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#fca50a;color:#0a0a0a;border:2px solid #0a0a0a;border-radius:6px;padding:12px 20px;font-weight:bold;text-decoration:none">Goldenes Ticket einlösen →</a></p>
<p style="font-size:13px;line-height:1.6;color:#4a4740;margin:0 0 14px">Gültig bis ${escapeHtml(until)}, nur einmal einlösbar. Beim Eintreten nimmst du eine kurze Sprach-Vorstellung auf (höchstens 15 Sekunden) – so wissen alle, dass hier echte Menschen sind.</p>
<p style="font-size:12px;line-height:1.5;color:#4a4740;margin:0 0 18px;word-break:break-all">Falls der Button nicht geht: ${escapeHtml(url)}</p>
<p style="font-size:15px;margin:0">Bis gleich im Clubhaus!<br>${escapeHtml(input.inviterName)}</p>
</div>
<p style="font-size:11px;line-height:1.5;color:#6b675e;margin:18px 0 0">${escapeHtml(footer)}</p>
</div></body></html>`;
  return { subject, text, html, url };
}
