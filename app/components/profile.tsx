"use client";
import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Mic,
  Ticket,
  UserRoundCheck,
} from "lucide-react";
import { useClub } from "./provider";
import { Avatar, Loading } from "./ui";
import { AudioPlayer } from "./audio-player";
import { PostCard } from "./post-card";
export function ProfilePage({ username }: { username: string }) {
  const { state, loading, me } = useClub();
  const person = state.profiles.find((p) => p.username === username);
  if (loading) return <Loading />;
  if (!person)
    return (
      <div className="empty-state">
        <h1>
          {me
            ? "Dieser Platz ist noch frei."
            : "Profile sind für Mitglieder da."}
        </h1>
        <p>
          {me
            ? "Unter diesem Namen haben wir niemanden gefunden."
            : "Tritt mit deinem Goldenen Ticket ein, um die Menschen kennenzulernen."}
        </p>
        <Link className="button button-mango" href={me ? "/" : "/invite"}>
          {me ? "Zum Clubhaus" : "Mit Ticket eintreten"}
        </Link>
      </div>
    );
  const inviter = state.profiles.find((p) => p.id === person.invited_by_id);
  const children = state.profiles.filter((p) => p.invited_by_id === person.id);
  const posts = state.posts.filter(
    (p) => p.author_id === person.id && !p.parent_id,
  );
  const mine = person.id === me?.id;
  return (
    <div className="profile-layout">
      <Link href="/" className="back-link">
        ← Zurück zu deinen Leuten
      </Link>
      <section className="profile-card">
        <div className="profile-banner">
          <span>KEIN FILTER NÖTIG.</span>
          <UserRoundCheck size={65} />
        </div>
        <div className="profile-body">
          <Avatar profile={person} size="large" />
          <span className="profile-label">MENSCH IM CLUBHAUS</span>
          <h1>
            {person.display_name}
            <span className="mango-dot">.</span>
          </h1>
          <span className="profile-handle">@{person.username}</span>
          <p className="profile-bio">{person.bio}</p>
          {person.voice_intro_url ? (
            <AudioPlayer
              src={person.voice_intro_url}
              duration={person.voice_duration_sec || 15}
              label={`Das ist ${person.display_name}`}
            />
          ) : (
            <p className="helper-text">
              <Mic size={15} />
              Eine Vorstellung folgt bald.
            </p>
          )}
          <div className="profile-trust">
            {inviter ? (
              <Link href={`/u/${inviter.username}`}>
                <UserRoundCheck size={19} />
                <span>
                  Eingeladen von <strong>@{inviter.username}</strong>
                </span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <span>
                <UserRoundCheck size={18} />
                Gastgeber der ersten Stunde
              </span>
            )}
          </div>
        </div>
      </section>
      <section className="trust-tree">
        <span className="eyebrow">
          <GitBranch size={15} />
          VERTRAUEN WÄCHST WEITER
        </span>
        <h2>
          Gute Menschen kennen
          <br />
          gute Menschen.
        </h2>
        <p>
          {person.display_name} bürgt für {children.length}{" "}
          {children.length === 1 ? "Menschen" : "Menschen"} im Clubhaus.
        </p>
        <div className="tree-members">
          {children.map((child) => (
            <Link href={`/u/${child.username}`} key={child.id}>
              <Avatar profile={child} />
              <strong>{child.display_name}</strong>
              <span>@{child.username}</span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
        {!children.length && (
          <p className="helper-text">
            Hier beginnt bald ein neuer Ast im Vertrauens-Stammbaum.
          </p>
        )}
        {mine && (
          <Link className="button button-mango" href="/tickets">
            <Ticket size={19} />
            {person.invites_left} Goldene Tickets ansehen
            <ArrowRight size={17} />
          </Link>
        )}
      </section>
      <div className="profile-posts">
        <h2>Gedanken von {person.display_name}</h2>
        {posts.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="helper-text">Der erste Beitrag kommt bestimmt.</p>
        )}
      </div>
    </div>
  );
}
