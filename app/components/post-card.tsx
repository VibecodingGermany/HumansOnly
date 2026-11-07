"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Gem,
  MessageCircle,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import type { Post, SlopStatus } from "@/lib/model";
import { useClub } from "./provider";
import { Avatar, Mascot, Modal } from "./ui";
import { AudioPlayer } from "./audio-player";
import { Composer } from "./composer";
const statusText: Record<SlopStatus, string> = {
  clean: "Noch ungeprüft",
  under_review: "Community prüft",
  hidden: "Ausgeblendet",
  valuable_verified: "Wertvoller Content",
};
export function PostCard({ post }: { post: Post }) {
  const { state, me, repository, refresh, report, ready } = useClub();
  const [review, setReview] = useState(false);
  const [reply, setReply] = useState(false);
  const [busy, setBusy] = useState(false);
  const author = state.profiles.find((p) => p.id === post.author_id);
  const inviter = state.profiles.find((p) => p.id === author?.invited_by_id);
  const myVote = state.votes.find(
    (v) => v.post_id === post.id && v.voter_id === me?.id,
  );
  const replies = state.posts.filter((p) => p.parent_id === post.id);
  if (!author) return null;
  async function vote(value: "valuable" | "slop") {
    setBusy(true);
    try {
      await repository().vote(post.id, value);
      await refresh();
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`post-card ${post.slop_status === "hidden" ? "post-hidden" : ""}`}
      id={`beitrag-${post.id}`}
    >
      <div className="post-author">
        <Link
          href={`/u/${author.username}`}
          aria-label={`Profil von ${author.display_name}`}
        >
          <Avatar profile={author} />
        </Link>
        <div>
          <Link className="author-name" href={`/u/${author.username}`}>
            {author.display_name}
            <span className="human-check" title="Mitglied im Clubhaus">
              <UserRoundCheck size={14} />
            </span>
          </Link>
          <div className="post-meta">
            @{author.username}
            <span>·</span>
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "short",
                timeZone: "Europe/Berlin",
              })}
            </time>
          </div>
        </div>
        {post.slop_status === "valuable_verified" && (
          <span className="quality-mark">
            <Gem size={13} />
            WERTVOLL
          </span>
        )}
      </div>
      {post.slop_status === "hidden" ? (
        <div className="hidden-message">
          <ShieldCheck size={25} />
          <p>Die Nachbarschaft hat diesen Beitrag ausgeblendet.</p>
          <small>Der Prüfbereich bleibt für eine neue Bewertung offen.</small>
        </div>
      ) : (
        <>
          <p className="post-text">{post.text}</p>
          {post.image_url && (
            <div className="post-image">
              <img
                src={post.image_url}
                alt={`Bild zum Beitrag von ${author.display_name}`}
                loading="lazy"
                width="800"
                height="430"
              />
            </div>
          )}
          {post.audio_url && (
            <AudioPlayer
              src={post.audio_url}
              duration={post.audio_duration_sec || 15}
              label={`Sprachnotiz von ${author.display_name}`}
            />
          )}
        </>
      )}
      <div className="post-trust">
        {inviter ? (
          <Link href={`/u/${inviter.username}`}>
            <UserRoundCheck size={12} />
            Eingeladen von <strong>@{inviter.username}</strong>
          </Link>
        ) : (
          <span>
            <UserRoundCheck size={12} />
            Gastgeber der ersten Stunde
          </span>
        )}
      </div>
      <div className="post-actions">
        <button
          type="button"
          className="reply-button"
          onClick={() => setReply(true)}
          disabled={!me}
        >
          <MessageCircle size={17} />
          {replies.length ? `${replies.length} Antworten` : "Antworten"}
        </button>
        <button
          type="button"
          className={`review-button status-${post.slop_status}`}
          onClick={() => setReview(true)}
        >
          <ShieldCheck size={17} />
          <span>
            {post.slop_status === "clean"
              ? "Community-Check"
              : statusText[post.slop_status]}
          </span>
          <b>{post.valuable_votes_count + post.slop_votes_count || "↗"}</b>
        </button>
      </div>
      {replies.length > 0 && (
        <details className="replies">
          <summary>Gespräch ansehen</summary>
          {replies.map((item) => {
            const person = state.profiles.find((p) => p.id === item.author_id);
            return (
              <div key={item.id}>
                <Link href={`/u/${person?.username}`}>@{person?.username}</Link>
                <p>
                  {item.slop_status === "hidden"
                    ? "Diese Antwort wurde ausgeblendet."
                    : item.text}
                </p>
                {item.slop_status !== "hidden" && item.audio_url && (
                  <AudioPlayer
                    src={item.audio_url}
                    duration={item.audio_duration_sec || 15}
                    label="Antwort"
                  />
                )}
                {item.slop_status !== "hidden" && item.image_url && (
                  <img
                    src={item.image_url}
                    alt="Bild in einer Antwort"
                    width="200"
                  />
                )}
              </div>
            );
          })}
        </details>
      )}
      <Modal
        open={review}
        onOpenChange={setReview}
        title="Gute Nachbarn schauen hin."
        description="Wir sind für KI als Werkzeug. Und für Gedanken, hinter denen ein Mensch steht."
      >
        <div className="review-intro">
          <Mascot pose="sticker/hmm" size={140} />
          <p>
            Hat dieser Beitrag einen echten Mehrwert?
            <br />
            <strong>Deine Stimme zählt.</strong>
            <small>
              Eine Stimme pro Mensch. Du kannst sie jederzeit ändern.
            </small>
          </p>
        </div>
        <span className={`status-badge status-${post.slop_status}`}>
          {statusText[post.slop_status]}
        </span>
        <div className="vote-options">
          <button
            type="button"
            className={myVote?.vote === "valuable" ? "selected" : ""}
            disabled={busy || !ready || !me || me.id === post.author_id}
            onClick={() => void vote("valuable")}
            aria-pressed={myVote?.vote === "valuable"}
          >
            <Gem size={25} />
            <strong>Wertvoller Content</strong>
            <span>Mehr davon!</span>
            <b>{post.valuable_votes_count}</b>
          </button>
          <button
            type="button"
            className={myVote?.vote === "slop" ? "selected" : ""}
            disabled={busy || !ready || !me || me.id === post.author_id}
            onClick={() => void vote("slop")}
            aria-pressed={myVote?.vote === "slop"}
          >
            <Trash2 size={25} />
            <strong>AI-Slop / Weg damit</strong>
            <span>Gedankenloses Copy-Paste.</span>
            <b>{post.slop_votes_count}</b>
          </button>
        </div>
        <p className="helper-text">
          {me?.id === post.author_id
            ? "Über deine eigenen Beiträge stimmt deine Nachbarschaft ab."
            : "Ab 3 Slop-Stimmen Überhang wird ein Beitrag ausgeblendet. Eine Wertvoll-Mehrheit vergibt das Qualitätssiegel."}
        </p>
      </Modal>
      {reply && (
        <Composer
          open={reply}
          onOpenChange={setReply}
          spaceId={post.space_id}
          parentId={post.id}
        />
      )}
    </article>
  );
}
