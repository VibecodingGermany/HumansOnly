"use client";
import Link from "next/link";
import { useClub } from "./provider";
import { Loading } from "./ui";
import { PostCard } from "./post-card";
/** Einzelansicht eines Beitrags, z. B. aus einem geteilten Link. Kommentare sind offen. */
export function PostDetail({ id }: { id: string }) {
  const { state, me, loading } = useClub();
  if (loading) return <Loading />;
  const found = state.posts.find((p) => p.id === id);
  // Ein geteilter Kommentar öffnet das ganze Gespräch.
  const post = found?.parent_id
    ? state.posts.find((p) => p.id === found.parent_id)
    : found;
  if (!me || !post)
    return (
      <div className="empty-state">
        <h1>
          {me
            ? "Dieser Beitrag ist nicht (mehr) da."
            : "Beiträge sind für Mitglieder da."}
        </h1>
        <p>
          {me
            ? "Vielleicht wurde er gelöscht, oder er liegt in einem Raum, in dem du noch nicht Mitglied bist."
            : "Melde dich an oder tritt mit deinem Goldenen Ticket ein, um das Gespräch zu sehen."}
        </p>
        <Link className="button button-mango" href={me ? "/" : "/invite"}>
          {me ? "Zum Clubhaus" : "Mit Ticket eintreten"}
        </Link>
      </div>
    );
  const room =
    state.spaces.find((s) => s.id === post.space_id)?.name || "Große Lobby";
  return (
    <div className="post-detail">
      <Link href="/" className="back-link">
        ← Zurück zum Clubhaus
      </Link>
      <span className="eyebrow">GESPRÄCH IN {room.toUpperCase()}</span>
      <PostCard post={post} expanded />
    </div>
  );
}
