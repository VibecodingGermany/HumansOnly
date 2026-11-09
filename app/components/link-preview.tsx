"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { detectEmbed, displayUrl, type LinkPreview } from "@/lib/links";

const cache = new Map<string, Promise<LinkPreview | null>>();
function load(url: string) {
  let hit = cache.get(url);
  if (!hit) {
    hit = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : { preview: null }))
      .then((body: { preview: LinkPreview | null }) => body.preview)
      .catch(() => null);
    cache.set(url, hit);
  }
  return hit;
}

/**
 * Vorschau-Karte unter einem Beitrag. Spotify und YouTube zeigen ein Cover mit Play-Knopf;
 * erst ein Klick lädt den echten Player (Zwei-Klick-Lösung: vorher keine Verbindung dorthin).
 */
export function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreview | null | undefined>();
  const [playing, setPlaying] = useState(false);
  const instant = detectEmbed(url);
  useEffect(() => {
    let alive = true;
    void load(url).then((p) => alive && setPreview(p));
    return () => {
      alive = false;
    };
  }, [url]);
  const embed = preview?.embed || instant;
  if (embed && playing)
    return (
      <div
        className={`link-embed embed-${embed.provider}`}
        style={embed.height ? { height: embed.height } : undefined}
      >
        <iframe
          src={`${embed.src}${embed.provider === "youtube" ? (embed.src.includes("?") ? "&" : "?") + "autoplay=1" : ""}`}
          title={
            preview?.title ||
            `${embed.provider === "spotify" ? "Spotify" : "YouTube"}-Player`
          }
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  if (preview === undefined && !embed)
    return <div className="link-card link-card-loading" aria-hidden />;
  if (!preview && !embed) return null;
  const title = preview?.title || displayUrl(url);
  const site =
    preview?.siteName ||
    (embed ? (embed.provider === "spotify" ? "Spotify" : "YouTube") : "");
  if (embed)
    return (
      <div className={`link-card link-card-media media-${embed.provider}`}>
        <button
          type="button"
          className="media-cover"
          onClick={() => setPlaying(true)}
          aria-label={`${title} abspielen`}
        >
          {preview?.image ? (
            <img
              src={preview.image}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="media-fallback">{site}</span>
          )}
          <span className="media-play">
            <Play size={22} fill="currentColor" />
          </span>
        </button>
        <div className="link-card-body">
          <span className="link-site">{site}</span>
          <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc">
            <strong>{title}</strong>
          </a>
          {preview?.description && <small>{preview.description}</small>}
          <button
            type="button"
            className="text-button"
            onClick={() => setPlaying(true)}
          >
            <Play size={13} fill="currentColor" />
            Hier abspielen
          </button>
          <small className="embed-note">Lädt den Player von {site}.</small>
        </div>
      </div>
    );
  return (
    <a
      className={`link-card ${preview?.image ? "has-image" : ""}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
    >
      {preview?.image && (
        <span className="link-card-image">
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </span>
      )}
      <span className="link-card-body">
        <span className="link-site">
          {site}
          <ExternalLink size={11} aria-hidden />
        </span>
        <strong>{title}</strong>
        {preview?.description && <small>{preview.description}</small>}
      </span>
    </a>
  );
}
