import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import zlib from "node:zlib";
import {
  decodeEntities,
  detectEmbed,
  isPrivateAddress,
  parsePreview,
  safeHref,
  type LinkPreview,
} from "./links";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 600_000;
const MAX_REDIRECTS = 3;
const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: LinkPreview | null }>();

/**
 * DNS-Auflösung, die private, Loopback- und Link-Local-Ziele ablehnt. Weil Node genau
 * diese Adresse für die Verbindung verwendet, hilft auch DNS-Rebinding nicht weiter.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as unknown as { address: string; family: number }[];
    const ok = list.filter((a) => !isPrivateAddress(a.address));
    if (!ok.length || ok.length !== list.length)
      return callback(
        Object.assign(new Error("Blocked address"), { code: "EBLOCKED" }),
        "",
        0,
      );
    if (options.all) return callback(null, ok as never);
    callback(null, ok[0].address, ok[0].family);
  });
};

type Fetched = { url: string; type: string; body: string };

function fetchOnce(target: URL): Promise<Fetched | { redirect: string }> {
  return new Promise((resolve, reject) => {
    const client = target.protocol === "https:" ? https : http;
    const req = client.request(
      target,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          // Viele Seiten liefern Open-Graph-Daten nur an bekannte Vorschau-Bots aus.
          "user-agent":
            "Mozilla/5.0 (compatible; HumansOnlyLinkPreview/1.0; +https://humans-only.de)",
          accept: "text/html,application/xhtml+xml,application/json;q=0.9",
          "accept-language": "de-DE,de;q=0.9,en;q=0.7",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({
            redirect: new URL(res.headers.location, target).href,
          });
        }
        const type = String(res.headers["content-type"] || "").toLowerCase();
        if (
          status < 200 ||
          status >= 300 ||
          !(type.includes("html") || type.includes("json"))
        ) {
          res.resume();
          return reject(new Error(`Unusable response ${status} ${type}`));
        }
        const encoding = String(res.headers["content-encoding"] || "");
        const stream =
          encoding === "gzip"
            ? res.pipe(zlib.createGunzip())
            : encoding === "br"
              ? res.pipe(zlib.createBrotliDecompress())
              : encoding === "deflate"
                ? res.pipe(zlib.createInflate())
                : res;
        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          const raw = Buffer.concat(chunks);
          const charset = type.match(/charset=([\w-]+)/)?.[1];
          let body: string;
          try {
            body = new TextDecoder(charset || "utf-8").decode(raw);
          } catch {
            body = raw.toString("utf8");
          }
          resolve({ url: target.href, type, body });
        };
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          chunks.push(chunk);
          // Der <head> reicht; wir lesen nie ganze Seiten.
          if (size >= MAX_BYTES) {
            finish();
            req.destroy();
          }
        });
        stream.on("end", finish);
        stream.on("error", (err) => (done ? undefined : reject(err)));
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    req.end();
  });
}

function allowedTarget(raw: string) {
  const href = safeHref(raw);
  if (!href) return null;
  const url = new URL(href);
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  if (/^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) {
    if (isPrivateAddress(url.hostname)) return null;
  }
  if (/(^|\.)(localhost|local|internal|lan|home|arpa)$/i.test(url.hostname))
    return null;
  return url;
}

async function fetchPage(raw: string): Promise<Fetched> {
  let current = allowedTarget(raw);
  for (let hop = 0; current && hop <= MAX_REDIRECTS; hop++) {
    const result = await fetchOnce(current);
    if (!("redirect" in result)) return result;
    current = allowedTarget(result.redirect);
  }
  throw new Error("Blocked or too many redirects");
}

/** Spotify und YouTube liefern über oEmbed verlässliche Titel und Cover. */
async function oembed(href: string): Promise<Partial<LinkPreview> | null> {
  const embed = detectEmbed(href);
  if (!embed) return null;
  const endpoint =
    embed.provider === "spotify"
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(href)}`
      : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(href)}`;
  try {
    const page = await fetchPage(endpoint);
    const data = JSON.parse(page.body) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
    };
    const image =
      data.thumbnail_url && /^https:\/\//.test(data.thumbnail_url)
        ? data.thumbnail_url
        : null;
    return {
      title: decodeEntities(data.title || "").slice(0, 140),
      description: decodeEntities(data.author_name || "").slice(0, 240),
      image,
      siteName: embed.provider === "spotify" ? "Spotify" : "YouTube",
    };
  } catch {
    return null;
  }
}

export async function loadLinkPreview(raw: string) {
  const target = allowedTarget(raw);
  if (!target) return null;
  const key = target.href;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: LinkPreview | null = null;
  const embed = detectEmbed(key);
  const fromOembed = embed ? await oembed(key) : null;
  // Die Seite selbst liefert Cover und Beschreibung, wenn oEmbed sie nicht hat (Spotify).
  let page: LinkPreview | null = null;
  if (!fromOembed?.image) {
    try {
      const fetched = await fetchPage(key);
      if (fetched.type.includes("html"))
        page = parsePreview(fetched.body, fetched.url);
    } catch {
      page = null;
    }
  }
  if (fromOembed?.title || page || embed)
    value = {
      // Weiterleitungen dürfen weder Adresse noch Einbettung umbiegen.
      url: key,
      title: fromOembed?.title || page?.title || "",
      description: page?.description || fromOembed?.description || "",
      image: fromOembed?.image || page?.image || null,
      siteName:
        fromOembed?.siteName ||
        (embed ? (embed.provider === "spotify" ? "Spotify" : "YouTube") : "") ||
        page?.siteName ||
        "",
      embed,
    };
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), value });
  return value;
}
