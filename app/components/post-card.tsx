"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Gem,
  Heart,
  ImagePlus,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { canDeletePost } from "@/lib/model";
import type { Post, SlopStatus } from "@/lib/model";
import { firstUrl } from "@/lib/links";
import { likeSummary, timeAgo } from "@/lib/time";
import { useClub } from "./provider";
import { Avatar, Mascot, Modal } from "./ui";
import { AudioPlayer } from "./audio-player";
import { Composer } from "./composer";
import { RichText } from "./rich-text";
import { LinkPreviewCard } from "./link-preview";
const statusText: Record<SlopStatus, string> = {
  clean: "Noch ungeprüft",
  under_review: "Community prüft",
  hidden: "Ausgeblendet",
  valuable_verified: "Wertvoller Content",
};
/** Wie viele Kommentare ohne Aufklappen sichtbar sind. */
const PREVIEW_COMMENTS = 2;

function useLike(post: Post) {
  const { state, me, repository, refresh, report } = useClub();
  const [pending, setPending] = useState<boolean | null>(null);
  const liked =
    pending ??
    state.likes.some((l) => l.post_id === post.id && l.user_id === me?.id);
  const base = state.likes.some(
    (l) => l.post_id === post.id && l.user_id === me?.id,
  );
  const count =
    post.likes_count +
    (pending === null ? 0 : (pending ? 1 : 0) - (base ? 1 : 0));
  const own = me?.id === post.author_id;
  async function toggle() {
    if (!me || own || pending !== null) return;
    setPending(!liked); // Sofort sichtbar, der Server bestätigt.
    try {
      await repository().toggleLike(post.id);
      await refresh();
    } catch (err) {
      report(err);
    } finally {
      setPending(null);
    }
  }
  const names = state.likes
    .filter((l) => l.post_id === post.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((l) => state.profiles.find((p) => p.id === l.user_id))
    .filter((p) => !!p);
  return { liked, count: Math.max(0, count), own, toggle, people: names };
}

function LikeButton({ post, small = false }: { post: Post; small?: boolean }) {
  const { me, ready } = useClub();
  const like = useLike(post);
  const hidden = post.slop_status === "hidden";
  return (
    <button
      type="button"
      className={`like-button ${like.liked ? "liked" : ""} ${small ? "like-small" : ""}`}
      onClick={() => void like.toggle()}
      disabled={!ready || !me || like.own || hidden}
      aria-pressed={like.liked}
      aria-label={
        like.own
          ? `Dein Beitrag gefällt ${like.count} Menschen`
          : like.liked
            ? "Gefällt mir nicht mehr"
            : "Gefällt mir"
      }
      title={like.own ? "Eigene Beiträge kannst du nicht liken." : undefined}
    >
      <Heart
        size={small ? 14 : 17}
        fill={like.liked ? "currentColor" : "none"}
      />
      {small ? like.count || "" : like.count ? like.count : "Gefällt mir"}
    </button>
  );
}

function DeleteButton({ post, label }: { post: Post; label: string }) {
  const { state, me, repository, refresh, notify, report } = useClub();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me || !canDeletePost(state, post)) return null;
  const foreign = post.author_id !== me.id;
  async function remove() {
    setBusy(true);
    try {
      await repository().deletePost(post.id);
      await refresh();
      setOpen(false);
      notify(
        post.parent_id
          ? "Dein Kommentar ist gelöscht."
          : "Der Beitrag ist gelöscht.",
      );
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="icon-action"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
      >
        <Trash2 size={15} />
      </button>
      <Modal
        open={open}
        onOpenChange={(v) => !busy && setOpen(v)}
        title={post.parent_id ? "Kommentar löschen?" : "Beitrag löschen?"}
        description={
          foreign
            ? "Du löschst als Gastgeber oder Moderation einen fremden Beitrag."
            : "Das lässt sich nicht rückgängig machen."
        }
      >
        <p className="helper-text">
          {post.parent_id
            ? "Der Kommentar und seine Herzen verschwinden."
            : "Der Beitrag verschwindet samt allen Kommentaren, Herzen und Stimmen."}
        </p>
        <div className="form-footer">
          <button
            type="button"
            className="button"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => void remove()}
            disabled={busy}
          >
            <Trash2 size={16} />
            {busy ? "Wird gelöscht …" : "Endgültig löschen"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function Comment({ item }: { item: Post }) {
  const { state } = useClub();
  const person = state.profiles.find((p) => p.id === item.author_id);
  if (!person) return null;
  const hidden = item.slop_status === "hidden";
  return (
    <li className="comment" id={`beitrag-${item.id}`}>
      <Link
        href={`/u/${person.username}`}
        aria-label={`Profil von ${person.display_name}`}
      >
        <Avatar profile={person} size="small" />
      </Link>
      <div className="comment-body">
        <div className="comment-bubble">
          <div className="comment-head">
            <Link href={`/u/${person.username}`}>{person.display_name}</Link>
            <time dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
          </div>
          {hidden ? (
            <p className="comment-text muted">
              Diese Antwort wurde ausgeblendet.
            </p>
          ) : (
            <>
              {item.text && (
                <RichText className="comment-text" text={item.text} />
              )}
              {item.audio_url && (
                <AudioPlayer
                  src={item.audio_url}
                  duration={item.audio_duration_sec || 15}
                  label={`Antwort von ${person.display_name}`}
                />
              )}
              {item.image_url && (
                <img
                  className="comment-image"
                  src={item.image_url}
                  alt={`Bild in der Antwort von ${person.display_name}`}
                  loading="lazy"
                />
              )}
            </>
          )}
        </div>
        <div className="comment-actions">
          <LikeButton post={item} small />
          <DeleteButton post={item} label="Kommentar löschen" />
        </div>
      </div>
    </li>
  );
}

function CommentForm({ post, onMore }: { post: Post; onMore: () => void }) {
  const { me, repository, refresh, report, ready } = useClub();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await repository().createPost({
        spaceId: post.space_id,
        text,
        parentId: post.id,
      });
      setText("");
      await refresh();
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="comment-form" onSubmit={(e) => void send(e)}>
      <Avatar profile={me} size="small" />
      <label className="sr-only" htmlFor={`comment-${post.id}`}>
        Kommentar schreiben
      </label>
      <textarea
        id={`comment-${post.id}`}
        rows={1}
        maxLength={2000}
        placeholder="Schreib einen Kommentar …"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
        disabled={busy}
      />
      <button
        type="button"
        className="icon-action"
        onClick={onMore}
        aria-label="Mit Bild oder Sprachnotiz antworten"
        title="Bild oder Sprachnotiz"
      >
        <ImagePlus size={17} />
      </button>
      <button
        type="submit"
        className="icon-action send"
        disabled={!ready || busy || !text.trim()}
        aria-label="Kommentar senden"
      >
        <Send size={17} />
      </button>
    </form>
  );
}

export function PostCard({
  post,
  expanded = false,
}: {
  post: Post;
  /** Auf der Einzelseite: alle Kommentare offen. */
  expanded?: boolean;
}) {
  const { state, me, repository, refresh, report, ready, notify } = useClub();
  const [review, setReview] = useState(false);
  const [reply, setReply] = useState(false);
  const [showAll, setShowAll] = useState(expanded);
  const [commenting, setCommenting] = useState(expanded);
  const [likers, setLikers] = useState(false);
  const [busy, setBusy] = useState(false);
  const like = useLike(post);
  const author = state.profiles.find((p) => p.id === post.author_id);
  const inviter = state.profiles.find((p) => p.id === author?.invited_by_id);
  const myVote = state.votes.find(
    (v) => v.post_id === post.id && v.voter_id === me?.id,
  );
  const replies = state.posts
    .filter((p) => p.parent_id === post.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const canComment =
    !!me &&
    (post.space_id === null ||
      state.memberships.some(
        (m) => m.space_id === post.space_id && m.user_id === me.id,
      ));
  if (!author) return null;
  const hidden = post.slop_status === "hidden";
  const link = hidden ? null : firstUrl(post.text);
  const visible = showAll ? replies : replies.slice(-PREVIEW_COMMENTS);
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
  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    const text = post.text.slice(0, 120);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({
          title: `${author!.display_name} bei Humans Only`,
          text,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify("Link kopiert. Teilen kannst du ihn mit Mitgliedern des Raums.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      window.prompt("Link zum Beitrag:", url);
    }
  }
  return (
    <article
      className={`post-card ${hidden ? "post-hidden" : ""}`}
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
            <Link href={`/p/${post.id}`} className="post-permalink">
              <time
                dateTime={post.created_at}
                title={new Date(post.created_at).toLocaleString("de-DE", {
                  timeZone: "Europe/Berlin",
                })}
              >
                {timeAgo(post.created_at)}
              </time>
            </Link>
          </div>
        </div>
        {post.slop_status === "valuable_verified" && (
          <span className="quality-mark">
            <Gem size={13} />
            WERTVOLL
          </span>
        )}
        <span
          className={
            post.slop_status === "valuable_verified" ? "" : "post-menu-push"
          }
        >
          <DeleteButton post={post} label="Beitrag löschen" />
        </span>
      </div>
      {hidden ? (
        <div className="hidden-message">
          <ShieldCheck size={25} />
          <p>Die Nachbarschaft hat diesen Beitrag ausgeblendet.</p>
          <small>Der Prüfbereich bleibt für eine neue Bewertung offen.</small>
        </div>
      ) : (
        <>
          {post.text && <RichText className="post-text" text={post.text} />}
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
          {link && !post.image_url && <LinkPreviewCard url={link} />}
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
      {like.people.length > 0 && (
        <button
          type="button"
          className="like-summary"
          onClick={() => setLikers(true)}
        >
          <span className="like-faces" aria-hidden>
            {like.people.slice(0, 3).map((p) => (
              <Avatar key={p.id} profile={p} size="small" />
            ))}
          </span>
          {likeSummary(
            like.people.map((p) =>
              p.id === me?.id ? "dir" : p.display_name.split(" ")[0],
            ),
          )}
        </button>
      )}
      <div className="post-actions">
        <div className="post-actions-main">
          <LikeButton post={post} />
          <button
            type="button"
            className="reply-button"
            onClick={() => {
              setCommenting(true);
              setShowAll(true);
              setTimeout(
                () => document.getElementById(`comment-${post.id}`)?.focus(),
                30,
              );
            }}
            disabled={!canComment}
          >
            <MessageCircle size={17} />
            {replies.length ? replies.length : "Kommentieren"}
          </button>
          <button
            type="button"
            className="reply-button"
            onClick={() => void share()}
          >
            <Share2 size={17} />
            <span className="action-label">Teilen</span>
          </button>
        </div>
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
      {(replies.length > 0 || commenting) && (
        <section className="comments" aria-label="Kommentare">
          {replies.length > visible.length && (
            <button
              type="button"
              className="text-button"
              onClick={() => setShowAll(true)}
            >
              Alle {replies.length} Kommentare ansehen
            </button>
          )}
          <ul>
            {visible.map((item) => (
              <Comment key={item.id} item={item} />
            ))}
          </ul>
          {canComment && (
            <CommentForm post={post} onMore={() => setReply(true)} />
          )}
        </section>
      )}
      <Modal
        open={likers}
        onOpenChange={setLikers}
        title="Das gefällt"
        description={`${like.count} ${like.count === 1 ? "Mensch mag" : "Menschen mögen"} diesen Beitrag.`}
      >
        <ul className="liker-list">
          {like.people.map((p) => (
            <li key={p.id}>
              <Link href={`/u/${p.username}`} onClick={() => setLikers(false)}>
                <Avatar profile={p} size="small" />
                <strong>{p.display_name}</strong>
                <span>@{p.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
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
            : "Ab 3 Slop-Stimmen Überhang wird ein Beitrag ausgeblendet. Eine Wertvoll-Mehrheit vergibt das Qualitätssiegel. Ein Herz ist davon unabhängig."}
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
