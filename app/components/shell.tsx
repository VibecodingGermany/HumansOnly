"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Home,
  Ticket,
  UserRound,
  Plus,
  Sun,
  Moon,
  LogOut,
  X,
  Zap,
  RotateCcw,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useClub } from "./provider";
import { config } from "@/lib/config";
import { Avatar } from "./ui";
import { Composer } from "./composer";
import { InstallApp } from "./pwa";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const {
    me,
    state,
    ready,
    error,
    notice,
    dismiss,
    repository,
    refresh,
    report,
    activeSpaceId,
  } = useClub();
  const [dark, setDark] = useState(false);
  const [compose, setCompose] = useState(false);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    try {
      const value = localStorage.getItem("humans-only-theme") === "dark";
      setDark(value);
      document.documentElement.dataset.theme = value ? "dark" : "light";
    } catch {}
  }, []);
  function theme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("humans-only-theme", next ? "dark" : "light");
    } catch {}
  }
  const profile = me ? `/u/${me.username}` : "/invite";
  const pending = state.waitlist.filter((e) => e.status === "pending").length;
  const entry =
    path === "/invite" || path === "/onboarding" || path === "/warteliste";
  const links = [
    { href: "/", label: "Das Clubhaus", Icon: Home },
    { href: "/tickets", label: "Goldene Tickets", Icon: Ticket },
    { href: profile, label: "Mein Profil", Icon: UserRound },
    ...(me
      ? [{ href: "/einstellungen", label: "Einstellungen", Icon: Settings }]
      : []),
    ...(state.isAdmin
      ? [{ href: "/admin", label: "Warteliste", Icon: ShieldCheck }]
      : []),
  ];
  async function signOut() {
    try {
      await repository().signOut();
      await refresh();
      router.push("/invite");
    } catch (err) {
      report(err);
    }
  }
  return (
    <div className={`app-shell ${entry ? "entry-shell" : ""}`}>
      <a href="#main-content" className="skip-link">
        Zum Inhalt
      </a>
      <aside className="sidebar">
        <Link
          href="/"
          className="wordmark"
          aria-label="Humans Only — Startseite"
        >
          <span className="brand-symbol">
            h<span>o</span>
            <i />
          </span>
          <span>
            HUMANS
            <br />
            ONLY<span className="wordmark-dot">®</span>
          </span>
        </Link>
        <span className="sidebar-claim">Das Internet. Wieder menschlich.</span>
        <nav className="desktop-nav" aria-label="Hauptnavigation">
          {links.map(({ href, label, Icon }) => (
            <Link
              key={label}
              href={href}
              className={
                (href === "/" ? path === "/" : path === href) ? "active" : ""
              }
            >
              <Icon size={20} />
              {label}
              {label === "Goldene Tickets" && (
                <span className="nav-count">{me?.invites_left ?? 0}</span>
              )}
              {href === "/admin" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-spaces">
          <span className="eyebrow">DEIN WOHNZIMMER</span>
          <Link href="/" className="sidebar-room">
            <span className="room-mark">
              <Zap size={19} fill="currentColor" />
            </span>
            <span>
              Vibecoding
              <br />
              <b>Germany</b>
            </span>
            <span className="online-dot" />
          </Link>
          <span className="sidebar-soon">Neue Räume? Wachsen mit uns.</span>
        </div>
        <div className="sidebar-bottom">
          <div className="human-stamp">
            <img
              src="/assets/ho-logo-icon.png"
              width="32"
              height="32"
              alt="Humans Only Badge"
            />
            <span>
              Von Menschen.
              <br />
              <strong>Für Menschen.</strong>
            </span>
          </div>
          <InstallApp />
          {me && (
            <div className="sidebar-account">
              <Link href={profile}>
                <Avatar profile={me} size="small" />
                <span>
                  <strong>{me.display_name}</strong>
                  <small>@{me.username}</small>
                </span>
              </Link>
              <button
                className="icon-button"
                type="button"
                aria-label="Abmelden"
                onClick={() => void signOut()}
              >
                <LogOut size={17} />
              </button>
            </div>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <Link href="/" className="mobile-wordmark">
            HUMANS ONLY<span>®</span>
          </Link>
          <span className="topbar-tagline">
            <span className="online-dot" />
            EIN GUTER ORT IM INTERNET.
          </span>
          <div className="topbar-actions">
            {config.mode === "demo" && (
              <span className="demo-chip">DEMO CLUBHAUS</span>
            )}
            <button
              className="icon-button"
              onClick={theme}
              aria-label={
                dark ? "Tag-Modus aktivieren" : "Nacht-Modus aktivieren"
              }
            >
              {dark ? <Sun size={20} /> : <Moon size={19} />}
            </button>
            {me && (
              <Link
                href={profile}
                className="topbar-profile"
                aria-label="Mein Profil"
              >
                <Avatar profile={me} size="small" />
              </Link>
            )}
          </div>
        </header>
        <div className="mobile-tools">
          <InstallApp />
          {state.isAdmin && (
            <Link className="text-button" href="/admin">
              <ShieldCheck size={13} />
              Warteliste{pending > 0 ? ` (${pending})` : ""}
            </Link>
          )}
          {me && (
            <Link className="text-button" href="/einstellungen">
              <Settings size={13} />
              Einstellungen
            </Link>
          )}
          {me && (
            <button className="text-button" onClick={() => void signOut()}>
              <LogOut size={13} />
              Abmelden
            </button>
          )}
        </div>
        {(error || notice) && (
          <div
            className={`notification ${error ? "notification-error" : ""}`}
            role={error ? "alert" : "status"}
          >
            <span>{error || notice}</span>
            <button
              className="icon-button"
              aria-label="Meldung schließen"
              onClick={dismiss}
            >
              <X size={17} />
            </button>
          </div>
        )}
        <main
          id="main-content"
          className={entry ? "entry-main" : "main-content"}
        >
          {children}
        </main>
        <footer className="page-footer">
          <span>WENIGER SCROLLEN. MEHR VERBINDUNG.</span>
          <span>
            Humans Only 2.0 <span className="footer-heart">♡</span> Vibecoding
            Germany
          </span>
          {config.mode === "demo" && (
            <div className="demo-note">
              Fiktive Mitglieder · synthetische Beispielstimmen · Daten nur in
              diesem Browser.
              <button
                type="button"
                className="text-button"
                onClick={() => setReset(!reset)}
              >
                <RotateCcw size={12} />
                Demo zurücksetzen
              </button>
              {reset && (
                <span className="reset-confirm">
                  Lokale Beiträge, Aufnahmen und Tickets verwerfen?{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      localStorage.removeItem("humans-only-v2-demo-1");
                      localStorage.removeItem("humans-only-invite");
                      window.location.assign("/");
                    }}
                  >
                    Ja, Demo neu starten
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setReset(false)}
                  >
                    Abbrechen
                  </button>
                </span>
              )}
            </div>
          )}
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        <Link href="/" aria-current={path === "/" ? "page" : undefined}>
          <Home size={21} />
          <span>Clubhaus</span>
        </Link>
        <Link
          href="/tickets"
          aria-current={path === "/tickets" ? "page" : undefined}
        >
          <Ticket size={21} />
          <span>Tickets</span>
        </Link>
        <button
          className="mobile-compose"
          disabled={!ready}
          onClick={() => (me ? setCompose(true) : router.push("/invite"))}
          aria-label="Beitrag erstellen"
        >
          <Plus size={28} />
        </button>
        <Link
          href={profile}
          aria-current={path === profile ? "page" : undefined}
        >
          <UserRound size={21} />
          <span>Du</span>
        </Link>
        <Link href="/invite">
          <ArrowUpRight size={21} />
          <span>Eintreten</span>
        </Link>
      </nav>
      {compose && (
        <Composer
          open={compose}
          onOpenChange={setCompose}
          spaceId={
            state.memberships.some(
              (m) => m.user_id === me?.id && m.space_id === activeSpaceId,
            )
              ? activeSpaceId
              : null
          }
        />
      )}
    </div>
  );
}
