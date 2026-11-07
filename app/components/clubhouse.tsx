"use client";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Gem,
  Mic,
  Pin,
  Plus,
  Sofa,
  Sparkles,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import { useClub } from "./provider";
import { Avatar, Loading, Mascot } from "./ui";
import { AudioPlayer } from "./audio-player";
import { Composer } from "./composer";
import { PostCard } from "./post-card";
export function Clubhouse() {
  const {
    state,
    me,
    loading,
    ready,
    error,
    refresh,
    activeSpaceId,
    setActiveSpaceId,
  } = useClub();
  const room =
    activeSpaceId === null
      ? "lobby"
      : state.spaces.find((s) => s.id === activeSpaceId)?.slug ||
        "vibecoding-germany";
  const [filter, setFilter] = useState<"all" | "valuable" | "voice">("all");
  const [compose, setCompose] = useState(false);
  const space = state.spaces.find((s) => s.slug === room);
  const lobby = room === "lobby";
  const members = state.memberships
    .filter((m) => m.space_id === space?.id)
    .map((m) => state.profiles.find((p) => p.id === m.user_id))
    .filter((p) => !!p);
  const isMember = state.memberships.some(
    (m) => m.space_id === space?.id && m.user_id === me?.id,
  );
  const posts = state.posts
    .filter(
      (p) =>
        !p.parent_id &&
        (lobby ? p.space_id === null : p.space_id === space?.id),
    )
    .filter(
      (p) =>
        filter === "all" ||
        (filter === "valuable"
          ? p.slop_status === "valuable_verified"
          : Boolean(p.audio_url)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (loading) return <Loading />;
  if (!me)
    return (
      <section className="welcome-gate">
        <Mascot pose="zeigen" size={260} />
        <span className="eyebrow">SCHÖN, DASS DU DA BIST</span>
        <h1>
          Das Internet hat
          <br />
          noch gute Ecken.
        </h1>
        <p>
          Ein Clubhaus für Menschen mit eigenen Gedanken. Dein Goldenes Ticket
          macht die Tür auf.
        </p>
        <Link className="button button-mango" href="/invite">
          Mit Ticket eintreten
          <ArrowRight size={18} />
        </Link>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEINE LEUTE. DEIN ORT.</span>
          <h1>
            Moin, {me.display_name.split(" ")[0]}
            <span className="mango-dot">.</span>
          </h1>
        </div>
        <p className="hand-note">
          Schön, dass du da bist. <span>↙</span>
        </p>
      </div>
      <Tabs.Root
        value={room}
        onValueChange={(value) => {
          setActiveSpaceId(
            value === "lobby"
              ? null
              : state.spaces.find((s) => s.slug === value)?.id || null,
          );
          setFilter("all");
        }}
      >
        <Tabs.List className="room-switch" aria-label="Raum wechseln">
          <Tabs.Trigger value="lobby">
            <Sofa size={19} />
            Große Lobby<span className="tab-small">Alle Menschen</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="vibecoding-germany">
            <Zap size={19} fill="currentColor" />
            Vibecoding Germany
            <span className="room-live" />
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value={room} asChild>
          <div className="club-grid">
            <div className="feed-column">
              <section className={`room-hero ${lobby ? "lobby-hero" : ""}`}>
                <div className="hero-copy">
                  <span className="hero-eyebrow">
                    <span className="online-dot" />
                    {lobby
                      ? "DAS WOHNZIMMER FÜR ALLE"
                      : "DEIN ERSTES WOHNZIMMER"}
                  </span>
                  <h2>
                    {lobby ? (
                      <>
                        Große
                        <br />
                        Lobby<span>↗</span>
                      </>
                    ) : (
                      <>
                        Vibecoding
                        <br />
                        Germany<span>↗</span>
                      </>
                    )}
                  </h2>
                  <p>
                    {lobby
                      ? "Ein Hallo kann der Anfang von etwas Gutem sein."
                      : "Gute Ideen. Echte Menschen. Einfach machen."}
                  </p>
                  <div className="hero-members">
                    <Users size={15} />
                    <span>
                      {lobby ? state.profiles.length : members.length} Menschen
                      · {lobby ? "Viele Perspektiven" : "Ein guter Vibe"}
                    </span>
                  </div>
                </div>
                <div className="hero-art">
                  <span className="hero-scribble">Hier bist du richtig!</span>
                  <Mascot size={280} />
                </div>
                <span className="hero-edition">EST. 2026 / VOL. 01</span>
              </section>
              {!lobby && space && (
                <details className="mobile-pinboard">
                  <summary>
                    <Pin size={16} />
                    An der Pinwand
                    <span>{space.pinned_info.length} Hinweise</span>
                  </summary>
                  <div>
                    {space.pinned_info.map((pin) => (
                      <div className="pin-note" key={pin.title}>
                        <h4>{pin.title}</h4>
                        <p>{pin.text}</p>
                        {pin.url && /^https:\/\//.test(pin.url) && (
                          <a href={pin.url} target="_blank" rel="noreferrer">
                            Mehr erfahren
                            <ArrowUpRight size={15} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {!lobby && (
                <section className="member-wall">
                  <div className="section-heading">
                    <h3>
                      <Mic size={16} />
                      Die Menschen hinter den Ideen
                    </h3>
                    <span>
                      Hör mal rein <span>↗</span>
                    </span>
                  </div>
                  <div className="member-list">
                    {members.map((person) => (
                      <div className="member" key={person.id}>
                        <div className="member-picture">
                          <Link
                            href={`/u/${person.username}`}
                            aria-label={`Profil von ${person.display_name}`}
                          >
                            <Avatar profile={person} />
                          </Link>
                          {person.voice_intro_url && (
                            <AudioPlayer
                              compact
                              src={person.voice_intro_url}
                              duration={person.voice_duration_sec || 15}
                              label={`Vorstellung von ${person.display_name}`}
                            />
                          )}
                        </div>
                        <Link href={`/u/${person.username}`}>
                          {person.display_name.split(" ")[0]}
                        </Link>
                      </div>
                    ))}
                  </div>
                  {!isMember && (
                    <p className="helper-text">
                      Für diesen Raum brauchst du ein Goldenes Ticket von einem
                      Mitglied.
                    </p>
                  )}
                </section>
              )}
              {(lobby || isMember) && (
                <button
                  className="composer-prompt"
                  type="button"
                  disabled={!ready}
                  onClick={() => setCompose(true)}
                >
                  <Avatar profile={me} size="small" />
                  <span>
                    Was geht dir durch den Kopf, {me.display_name.split(" ")[0]}
                    ?
                  </span>
                  <span className="prompt-plus">
                    <Plus size={23} />
                  </span>
                </button>
              )}
              <div className="feed-heading">
                <div className="feed-filters" aria-label="Feed filtern">
                  {(
                    [
                      { id: "all", label: "Am Küchentisch" },
                      { id: "valuable", label: "Wertvoll" },
                      { id: "voice", label: "Sprachnotizen" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFilter(item.id)}
                      aria-pressed={filter === item.id}
                      className={filter === item.id ? "active" : ""}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <span className="chronological">NEUESTE ZUERST</span>
              </div>
              <div className="post-list">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {posts.length === 0 && (
                  <div className="empty-state">
                    <Coffee size={32} />
                    <h3>
                      {error
                        ? "Der Feed macht gerade Pause."
                        : "Hier ist Platz für deine Gedanken."}
                    </h3>
                    <p>
                      {error
                        ? "Bitte lade das Clubhaus noch einmal."
                        : "Der erste gute Beitrag muss nicht perfekt sein."}
                    </p>
                    {error ? (
                      <button className="button" onClick={() => void refresh()}>
                        Erneut laden
                      </button>
                    ) : (
                      (lobby || isMember) && (
                        <button
                          className="button button-mango"
                          onClick={() => setCompose(true)}
                        >
                          Gespräch beginnen
                          <Plus size={17} />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
              <div className="feed-end">
                <Sparkles size={18} />
                <p>Du bist auf dem Laufenden.</p>
                <small>Geh kurz raus. Die Welt ist auch ganz schön.</small>
              </div>
            </div>
            <aside className="club-aside">
              <section className="pinboard">
                <div className="section-heading">
                  <h3>
                    <Pin size={17} />
                    An der Pinwand
                  </h3>
                  <span className="pin-dot" />
                </div>
                <p className="pinboard-intro">
                  Von deinem Gastgeber. Für uns alle.
                </p>
                {(
                  space?.pinned_info || [
                    {
                      title: "Ein guter Anfang",
                      text: "Sag Hallo und erzähl uns, was dich bewegt.",
                    },
                  ]
                ).map((pin, i) => (
                  <div className="pin-note" key={pin.title}>
                    <span className="pin-number">0{i + 1}</span>
                    <h4>{pin.title}</h4>
                    <p>{pin.text}</p>
                    {pin.url && /^https:\/\//.test(pin.url) && (
                      <a href={pin.url} target="_blank" rel="noreferrer">
                        Mehr erfahren
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                ))}
                <div className="pinboard-signature">
                  Bis gleich am Küchentisch!
                  <span>
                    —{" "}
                    {state.profiles.find((p) => p.id === space?.owner_id)
                      ?.display_name || "Deine Gastgeber"}
                  </span>
                </div>
              </section>
              <section className="ticket-teaser">
                <span className="sticker-label">
                  GUTE LEUTE KENNEN GUTE LEUTE
                </span>
                <Ticket size={35} />
                <h3>
                  Ein Platz für
                  <br />
                  deine Lieblingsmenschen.
                </h3>
                <p>
                  Du hast {me.invites_left} Goldene Tickets. Wen hättest du gern
                  dabei?
                </p>
                <Link href="/tickets">
                  Jemanden einladen
                  <ArrowRight size={17} />
                </Link>
              </section>
              <section className="club-rules">
                <Gem size={22} />
                <h3>Wertvoll statt laut.</h3>
                <p>
                  Keine Algorithmen, die dich festhalten. Keine Jagd nach
                  Reichweite. Dafür eine Nachbarschaft, die aufeinander
                  achtgibt.
                </p>
                <span>GEMEINSAM HALTEN WIR’S MENSCHLICH.</span>
              </section>
              <section className="future-spaces">
                <span className="eyebrow">HIER WÄCHST NOCH WAS</span>
                <h3>
                  Mehr Platz für
                  <br />
                  deine Welt.
                </h3>
                <p>Ateliers, Musikzimmer & Creator-Räume.</p>
                <span className="coming-soon">Noch in der Werkstatt</span>
              </section>
            </aside>
          </div>
        </Tabs.Content>
      </Tabs.Root>
      {compose && (
        <Composer
          open={compose}
          onOpenChange={setCompose}
          spaceId={lobby ? null : space?.id || null}
        />
      )}
    </>
  );
}
