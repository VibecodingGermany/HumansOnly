/**
 * Links in Beiträgen: Erkennung im Text, Einbettungen (Spotify, YouTube) und das
 * Auslesen von Vorschau-Metadaten aus HTML. Alles hier ist rein und läuft in Browser,
 * Server und Tests gleich. Der eigentliche Netzabruf liegt in link-preview-server.ts.
 */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "url"; text: string; href: string }
  | { kind: "mention"; text: string; username: string };

export type Embed = {
  provider: "spotify" | "youtube";
  /** iframe-Quelle, ausschließlich aus geprüften IDs gebaut. */
  src: string;
  /** Höhe des Players in Pixeln (YouTube nutzt 16:9 statt fester Höhe). */
  height: number | null;
};

export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  embed: Embed | null;
};

const TOKEN =
  /(https?:\/\/[^\s<>"'`]+|www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>"'`]*)|(^|[^\w@/.])@([a-z0-9_]{3,24})\b/gi;
const TRAILING = /[.,;:!?…»«“”"'’\]}>]/;
const count = (text: string, ch: string) => text.split(ch).length - 1;

/** Schneidet Satzzeichen am Ende ab, behält aber ausgeglichene Klammern (Wikipedia-Links). */
function trimUrl(raw: string) {
  let url = raw;
  while (url.length) {
    const ch = url[url.length - 1];
    if (ch === ")" ? count(url, "(") < count(url, ")") : TRAILING.test(ch))
      url = url.slice(0, -1);
    else break;
  }
  return url;
}

/** Normalisiert auf eine sichere http(s)-Adresse oder null. */
export function safeHref(raw: string) {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.username || url.password)
      return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Zerlegt Beitragstext in Text, Links und @Erwähnungen. */
export function tokenize(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  const push = (t: string) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev?.kind === "text") prev.text += t;
    else out.push({ kind: "text", text: t });
  };
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (match[1]) {
      const raw = trimUrl(match[1]);
      const href = safeHref(raw);
      push(text.slice(last, start));
      if (href) out.push({ kind: "url", text: raw, href });
      else push(raw);
      last = start + raw.length;
    } else if (match[3]) {
      const lead = match[2] || "";
      push(text.slice(last, start) + lead);
      out.push({
        kind: "mention",
        text: `@${match[3]}`,
        username: match[3].toLowerCase(),
      });
      last = start + lead.length + 1 + match[3].length;
    }
  }
  push(text.slice(last));
  return out;
}

export function extractUrls(text: string) {
  return tokenize(text)
    .filter((s): s is Extract<Segment, { kind: "url" }> => s.kind === "url")
    .map((s) => s.href);
}

/** Erste Adresse im Text: sie bekommt die Vorschau. */
export function firstUrl(text: string) {
  return extractUrls(text)[0] || null;
}

/** Kurze Anzeige für lange Links: Host + gekürzter Pfad. */
export function displayUrl(href: string, max = 48) {
  try {
    const url = new URL(href);
    const shown =
      url.hostname.replace(/^www\./, "") +
      (url.pathname === "/" ? "" : url.pathname) +
      url.search;
    return shown.length > max ? `${shown.slice(0, max - 1)}…` : shown;
  } catch {
    return href;
  }
}

const SPOTIFY_TYPES = [
  "track",
  "album",
  "playlist",
  "episode",
  "show",
  "artist",
];

/** Erkennt Spotify- und YouTube-Links und baut daraus eine feste Player-Adresse. */
export function detectEmbed(href: string): Embed | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "open.spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    // Lokalisierte Pfade wie /intl-de/track/… überspringen.
    if (parts[0]?.startsWith("intl-")) parts.shift();
    if (parts[0] === "embed") parts.shift();
    const [type, id] = parts;
    if (SPOTIFY_TYPES.includes(type) && /^[A-Za-z0-9]{10,40}$/.test(id || ""))
      return {
        provider: "spotify",
        src: `https://open.spotify.com/embed/${type}/${id}`,
        height: type === "track" || type === "episode" ? 152 : 352,
      };
    return null;
  }
  let video: string | null = null;
  if (host === "youtu.be") video = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") video = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);
      video = m?.[1] || null;
    }
  }
  if (video && /^[A-Za-z0-9_-]{11}$/.test(video)) {
    const t = url.searchParams.get("t") || url.searchParams.get("start");
    const start = t && /^\d+s?$/.test(t) ? `?start=${parseInt(t, 10)}` : "";
    return {
      provider: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${video}${start}`,
      height: null,
    };
  }
  return null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  hellip: "…",
  ndash: "–",
  mdash: "—",
};
export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000
        ? String.fromCodePoint(n)
        : all;
    }
    return ENTITIES[code] ?? all;
  });
}

function clean(text: string | undefined, max: number) {
  if (!text) return "";
  const t = decodeEntities(text).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function attr(tag: string, name: string) {
  const m = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"),
  );
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : undefined;
}

/** Liest Open-Graph-, Twitter- und Standard-Metadaten aus dem <head> einer Seite. */
export function parsePreview(html: string, pageUrl: string): LinkPreview {
  const head = html.slice(0, 300_000);
  const meta = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, "property") || attr(tag, "name") || "")
      .toLowerCase()
      .trim();
    const content = attr(tag, "content");
    if (key && content !== undefined && !meta.has(key)) meta.set(key, content);
  }
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const imageRaw =
    meta.get("og:image:secure_url") ||
    meta.get("og:image") ||
    meta.get("twitter:image") ||
    meta.get("twitter:image:src");
  let image: string | null = null;
  if (imageRaw) {
    try {
      const resolved = new URL(decodeEntities(imageRaw.trim()), pageUrl);
      // Nur https: kein Mixed Content, keine data:/javascript:-Adressen.
      if (resolved.protocol === "https:") image = resolved.href;
    } catch {}
  }
  let host = pageUrl;
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {}
  return {
    url: pageUrl,
    title: clean(
      meta.get("og:title") || meta.get("twitter:title") || titleTag,
      140,
    ),
    description: clean(
      meta.get("og:description") ||
        meta.get("twitter:description") ||
        meta.get("description"),
      240,
    ),
    image,
    siteName: clean(meta.get("og:site_name"), 60) || host,
    embed: detectEmbed(pageUrl),
  };
}

/** IPv4/IPv6-Adressen, die nie von einem öffentlichen Vorschau-Abruf erreicht werden dürfen. */
export function isPrivateAddress(address: string) {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (!ip.includes(":")) return true; // Unbekanntes Format: lieber sperren.
  return (
    ip === "::" ||
    ip === "::1" ||
    /^f[cd]/.test(ip) ||
    /^fe[89ab]/.test(ip) ||
    /^ff/.test(ip) ||
    ip.startsWith("64:ff9b:") ||
    ip.startsWith("2001:db8")
  );
}
