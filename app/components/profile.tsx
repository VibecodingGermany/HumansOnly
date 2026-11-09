"use client";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  GitBranch,
  Globe,
  Lock,
  MapPin,
  Mic,
  Settings,
  Ticket,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useClub } from "./provider";
import { Avatar, Loading } from "./ui";
import { AudioPlayer } from "./audio-player";
import { PostCard } from "./post-card";
import type { ProfileLink, PublicProfile, Visibility } from "@/lib/model";
const VISIBILITY_LABEL: Record<
  Visibility,
  { text: string; Icon: typeof Users }
> = {
  members: { text: "Nur Mitglieder", Icon: Users },
  public: { text: "Öffentlich", Icon: Globe },
  hidden: { text: "Zurückhaltend", Icon: Lock },
};
function ProfileMeta({
  pronouns,
  location,
}: {
  pronouns: string;
  location: string;
}) {
  if (!pronouns && !location) return null;
  return (
    <p className="profile-meta">
      {pronouns && <span>{pronouns}</span>}
      {location && (
        <span>
          <MapPin size={14} aria-hidden />
          {location}
        </span>
      )}
    </p>
  );
}
function ProfileLinks({ links }: { links: ProfileLink[] }) {
  const safe = links.filter((l) => /^https?:\/\//i.test(l.url));
  if (!safe.length) return null;
  return (
    <ul className="profile-links" aria-label="Links">
      {safe.map((link) => (
        <li key={`${link.label}-${link.url}`}>
          <a href={link.url} target="_blank" rel="noopener noreferrer nofollow">
            {link.label}
            <ExternalLink size={13} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
/** Was Besucher ohne Login sehen, wenn ein Mitglied sein Profil öffentlich gestellt hat. */
function PublicProfileView({ profile }: { profile: PublicProfile }) {
  return (
    <div className="profile-layout">
      <section className="profile-card">
        <div className="profile-banner">
          <span>KEIN FILTER NÖTIG.</span>
          <UserRoundCheck size={65} />
        </div>
        <div className="profile-body">
          <Avatar profile={profile} size="large" />
          <span className="profile-label">MENSCH IM CLUBHAUS</span>
          <h1>
            {profile.display_name}
            <span className="mango-dot">.</span>
          </h1>
          <span className="profile-handle">@{profile.username}</span>
          <ProfileMeta
            pronouns={profile.pronouns}
            location={profile.location}
          />
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <ProfileLinks links={profile.links} />
          <p className="helper-text">
            <Globe size={15} />
            Dieses Profil ist öffentlich. Beiträge und Stimme bleiben im Club.
          </p>
          <Link className="button button-mango" href="/invite">
            Mit Ticket eintreten
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
export function ProfilePage({
  username,
  publicProfile = null,
}: {
  username: string;
  publicProfile?: PublicProfile | null;
}) {
  const { state, loading, me } = useClub();
  const person = state.profiles.find((p) => p.username === username);
  if (!person && publicProfile && (loading || !me))
    return <PublicProfileView profile={publicProfile} />;
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
  const hearts = state.posts
    .filter((p) => p.author_id === person.id)
    .reduce((sum, p) => sum + p.likes_count, 0);
  // Zurückhaltende Profile zeigen anderen Mitgliedern nur Name, Nutzername und Bild.
  const restricted = person.visibility === "hidden" && !mine;
  const showTree = !restricted && (person.show_trust_tree || mine);
  const showPosts = !restricted && (person.show_posts || mine);
  const visibility = VISIBILITY_LABEL[person.visibility];
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
          {!restricted && (
            <p className="profile-stats">
              <span>
                <strong>{posts.length}</strong>
                {posts.length === 1 ? "Beitrag" : "Beiträge"}
              </span>
              <span>
                <strong>{hearts}</strong>
                {hearts === 1 ? "Herz" : "Herzen"} erhalten
              </span>
            </p>
          )}
          {mine && (
            <div className="profile-owner-bar">
              <span className="visibility-chip">
                <visibility.Icon size={14} aria-hidden />
                {visibility.text}
              </span>
              <Link className="button" href="/einstellungen">
                <Settings size={16} />
                Profil bearbeiten
              </Link>
            </div>
          )}
          {restricted ? (
            <p className="helper-text">
              <Lock size={15} />
              {person.display_name} zeigt auf dem Profil nur Namen und Bild.
            </p>
          ) : (
            <>
              <ProfileMeta
                pronouns={person.pronouns}
                location={person.location}
              />
              {person.bio && <p className="profile-bio">{person.bio}</p>}
              <ProfileLinks links={person.links} />
            </>
          )}
          {restricted ? null : person.voice_intro_url ? (
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
          {showTree && (
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
          )}
        </div>
      </section>
      {showTree && (
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
      )}
      {showPosts && (
        <div className="profile-posts">
          <h2>Gedanken von {person.display_name}</h2>
          {posts.length ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <p className="helper-text">Der erste Beitrag kommt bestimmt.</p>
          )}
        </div>
      )}
    </div>
  );
}
