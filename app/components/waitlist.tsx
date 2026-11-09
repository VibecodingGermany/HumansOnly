"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Copy,
  Mail,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { Ticket, WaitlistEntry, WaitlistStatus } from "@/lib/model";
import { useClub } from "./provider";
import { Loading, Mascot } from "./ui";

export function WaitlistPage() {
  const { repository, ready, me } = useClub();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    // Honeypot: Bots füllen das versteckte Feld, Menschen nicht.
    if (trap) {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      await repository().joinWaitlist(name, email);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das hat gerade nicht geklappt. Bitte versuche es noch einmal.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="entry-grid">
      <section className="entry-art">
        <span className="sticker-label">BALD GEHT DIE TÜR AUF.</span>
        <h1>
          Setz dich
          <br />
          auf die
          <br />
          <span>Liste.</span>
        </h1>
        <div className="entry-mascot">
          <Mascot pose="zeigen" size={430} />
          <span className="entry-bubble">
            Moin!
            <br />
            Ich merk mir dich.
          </span>
        </div>
        <p className="hand-note">Karl-Dieter schreibt dich auf.</p>
      </section>
      <section className="entry-card">
        <div className="entry-mobile-host">
          <Mascot pose="zeigen" size={130} />
          <p>
            Moin!
            <br />
            Ich merk mir dich.
          </p>
        </div>
        <span className="entry-icon">
          <ClipboardList size={30} />
        </span>
        {done ? (
          <div className="waitlist-done" role="status">
            <h2>
              Du stehst
              <br />
              auf der Liste.
            </h2>
            <p>
              Danke, {name.trim().split(" ")[0] || "Mensch"}! Sobald dein Platz
              frei ist, bekommst du dein Goldenes Ticket per E-Mail an{" "}
              <strong>{email.trim()}</strong>. Wenn du dich schon eingetragen
              hattest, bleibt alles beim Alten.
            </p>
            <Link className="back-link" href="/">
              Zur Startseite →
            </Link>
          </div>
        ) : (
          <>
            <h2>
              Noch kein Ticket?
              <br />
              Kein Problem.
            </h2>
            <p>
              Humans Only startet mit der Vibecoding-Germany-Community. Trag
              dich ein, wir schalten dich frei und schicken dir dein Goldenes
              Ticket per Mail.
            </p>
            <form onSubmit={(e) => void submit(e)}>
              <label htmlFor="waitlist-name">Dein Name</label>
              <input
                id="waitlist-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vorname Nachname"
                required
                maxLength={80}
              />
              <label htmlFor="waitlist-email">Deine E-Mail</label>
              <input
                id="waitlist-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@beispiel.de"
                required
                maxLength={254}
              />
              <div className="waitlist-trap" aria-hidden="true">
                <label htmlFor="waitlist-website">Website</label>
                <input
                  id="waitlist-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trap}
                  onChange={(e) => setTrap(e.target.value)}
                />
              </div>
              <label className="consent" htmlFor="waitlist-consent">
                <input
                  id="waitlist-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>
                  Ich bin einverstanden, dass Humans Only meinen Namen und meine
                  E-Mail-Adresse speichert, um mich einzuladen. Kein
                  Newsletter, keine Weitergabe. Auf Wunsch löschen wir den
                  Eintrag jederzeit.
                </span>
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-mango full-width"
                type="submit"
                disabled={busy || !ready || !consent}
              >
                {busy ? "Karl-Dieter schreibt …" : "Auf die Warteliste"}
                <ArrowRight size={19} />
              </button>
            </form>
            <div className="entry-promise">
              <UserRoundCheck size={19} />
              <span>
                Echte Menschen. Handverlesen freigegeben.
                <br />
                <strong>Ohne Algorithmus.</strong>
              </span>
            </div>
            <Link className="back-link" href={me ? "/" : "/invite"}>
              {me ? "Zurück ins Clubhaus →" : "Du hast schon ein Ticket? →"}
            </Link>
          </>
        )}
      </section>
    </div>
  );
}

type Filter = WaitlistStatus | "all";
const filters: { key: Filter; label: string }[] = [
  { key: "pending", label: "Offen" },
  { key: "approved", label: "Freigegeben" },
  { key: "rejected", label: "Abgelehnt" },
  { key: "all", label: "Alle" },
];
const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function AdminPage() {
  const { state, me, loading, ready, repository, refresh, report, notify } =
    useClub();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [copied, setCopied] = useState("");
  const [fallback, setFallback] = useState("");
  const [mail, setMail] = useState({ enabled: false, simulated: false });
  const [bulk, setBulk] = useState<"idle" | "confirm" | "running">("idle");
  const [progress, setProgress] = useState("");
  const isAdmin = state.isAdmin;
  useEffect(() => {
    if (!isAdmin || !ready) return;
    let active = true;
    Promise.resolve()
      .then(() => repository().mailStatus())
      .then((status) => {
        if (active) setMail(status);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdmin, ready, repository]);
  const tickets = useMemo(
    () => new Map(state.tickets.map((t) => [t.id, t])),
    [state.tickets],
  );
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: 0 };
    for (const e of state.waitlist) {
      c[e.status] += 1;
      c.all += 1;
    }
    return c;
  }, [state.waitlist]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.waitlist
      .filter((e) => filter === "all" || e.status === filter)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        filter === "pending"
          ? a.created_at.localeCompare(b.created_at)
          : (b.decided_at || b.created_at).localeCompare(
              a.decided_at || a.created_at,
            ),
      );
  }, [state.waitlist, filter, query]);

  if (loading) return <Loading />;
  if (!me || !state.isAdmin)
    return (
      <div className="empty-state">
        <h1>Nur für Gastgeber.</h1>
        <p>Dieser Bereich ist für die Admins von Humans Only reserviert.</p>
        <Link className="button button-mango" href="/">
          Zurück ins Clubhaus
          <ArrowRight size={18} />
        </Link>
      </div>
    );

  function inviteUrl(ticket: Ticket) {
    return `${window.location.origin}/invite?code=${encodeURIComponent(ticket.code)}`;
  }
  function mailto(entry: WaitlistEntry, ticket: Ticket) {
    const first = entry.name.split(" ")[0];
    const until = new Date(ticket.expires_at).toLocaleDateString("de-DE");
    const body = [
      `Moin ${first},`,
      "",
      "du hattest dich auf die Warteliste von Humans Only gesetzt – jetzt ist dein Platz frei!",
      "",
      "Mit diesem Goldenen Ticket kommst du ins Clubhaus und direkt in den Raum Vibecoding Germany:",
      inviteUrl(ticket),
      "",
      `Das Ticket ist bis ${until} gültig und nur einmal einlösbar. Beim Eintreten nimmst du eine kurze Sprach-Vorstellung auf (höchstens 15 Sekunden) – so wissen alle, dass hier echte Menschen sind.`,
      "",
      "Bis gleich im Clubhaus!",
      me?.display_name || "",
    ].join("\n");
    // "@" bleibt lesbar (manche Mailprogramme dekodieren %40 nicht); nur URL-Sonderzeichen kodieren.
    const to = entry.email.replace(/[?&#%\s]/g, encodeURIComponent);
    return `mailto:${to}?subject=${encodeURIComponent(
      "Dein Goldenes Ticket für Humans Only",
    )}&body=${encodeURIComponent(body)}`;
  }
  async function run(id: string, action: () => Promise<unknown>, message: string) {
    setBusy(id);
    try {
      await action();
      await refresh();
      notify(message);
    } catch (err) {
      report(err);
    } finally {
      setBusy("");
    }
  }
  const demoNote = mail.simulated ? " (Demo: keine echte Mail verschickt)" : "";
  function invite(entry: WaitlistEntry) {
    return run(
      entry.id,
      () => repository().sendWaitlistInvite(entry.id),
      `Einladung an ${entry.email} ist raus.${demoNote}`,
    );
  }
  async function inviteAllPending() {
    const queue = state.waitlist
      .filter((e) => e.status === "pending")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    setBulk("running");
    let sent = 0;
    try {
      for (const entry of queue) {
        setProgress(`${sent + 1} von ${queue.length}: ${entry.name}`);
        await repository().sendWaitlistInvite(entry.id);
        sent += 1;
      }
      notify(`${sent} Einladungen verschickt.${demoNote}`);
    } catch (err) {
      report(
        new Error(
          `${sent} von ${queue.length} verschickt, dann Abbruch: ${
            err instanceof Error ? err.message : "unbekannter Fehler"
          }`,
        ),
      );
    } finally {
      setBulk("idle");
      setProgress("");
      await refresh();
    }
  }
  async function copy(entry: WaitlistEntry, ticket: Ticket) {
    const url = inviteUrl(ticket);
    try {
      if (!navigator.clipboard) throw new Error();
      await navigator.clipboard.writeText(url);
      setCopied(entry.id);
    } catch {
      setFallback(url);
    }
  }

  return (
    <div className="admin-page">
      <div className="wallet-heading">
        <div>
          <span className="eyebrow">ADMIN · WARTELISTE</span>
          <h1>
            Wer darf
            <br />
            <span>rein?</span>
          </h1>
          <p>
            Freigeben stellt ein Goldenes Ticket für Vibecoding Germany aus.
            Dein eigenes Drei-Ticket-Budget bleibt unberührt.{" "}
            {mail.enabled
              ? "Die Einladung geht direkt per Mail raus."
              : "Danach Mail schreiben oder Link kopieren und verschicken."}
          </p>
        </div>
        <Mascot pose="sticker/bin-dabei" size={180} />
      </div>
      <div className="admin-toolbar">
        <div className="admin-filters" role="group" aria-label="Status filtern">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={filter === f.key ? "active" : ""}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="nav-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <label className="admin-search" htmlFor="admin-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Suchen</span>
          <input
            id="admin-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder E-Mail"
          />
        </label>
      </div>
      {mail.enabled && counts.pending > 0 && (
        <div className="admin-bulk" aria-live="polite">
          {bulk === "running" ? (
            <span>Verschicke Einladungen … {progress}</span>
          ) : bulk === "confirm" ? (
            <>
              <span>
                Alle {counts.pending} offenen Anfragen freigeben und
                Einladungen verschicken?
              </span>
              <button
                type="button"
                className="button button-mango"
                onClick={() => void inviteAllPending()}
              >
                <Send size={16} />
                Ja, alle einladen
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setBulk("idle")}
              >
                Abbrechen
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button-ink"
              disabled={Boolean(busy)}
              onClick={() => setBulk("confirm")}
            >
              <Send size={16} />
              Alle {counts.pending} offenen einladen
            </button>
          )}
        </div>
      )}
      {fallback && (
        <div className="manual-copy">
          <label htmlFor="admin-copy-link">Link zum Kopieren</label>
          <input
            id="admin-copy-link"
            readOnly
            value={fallback}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
      {visible.length === 0 ? (
        <p className="admin-empty">
          {query
            ? "Niemand passt zu deiner Suche."
            : filter === "pending"
              ? "Keine offenen Anfragen. Zeit für einen Kaffee."
              : "Hier ist noch niemand."}
        </p>
      ) : (
        <ul className="admin-list">
          {visible.map((entry) => {
            const ticket = entry.ticket_id
              ? tickets.get(entry.ticket_id)
              : undefined;
            const redeemed = Boolean(ticket?.redeemed_at);
            const expired =
              ticket && !redeemed && new Date(ticket.expires_at) <= new Date();
            const working = busy === entry.id || bulk === "running";
            return (
              <li key={entry.id} className={`admin-row status-${entry.status}`}>
                <div className="admin-person">
                  <strong>{entry.name}</strong>
                  <a href={`mailto:${entry.email}`}>{entry.email}</a>
                  <small>
                    Eingetragen {dateFormat.format(new Date(entry.created_at))}
                    {entry.status === "approved" &&
                      (redeemed
                        ? " · Ticket eingelöst ✓"
                        : expired
                          ? " · Ticket abgelaufen"
                          : ticket
                            ? ` · Ticket gültig bis ${new Date(ticket.expires_at).toLocaleDateString("de-DE")}`
                            : "")}
                    {entry.status === "rejected" && " · abgelehnt"}
                    {entry.invited_at &&
                      ` · Mail verschickt ${dateFormat.format(new Date(entry.invited_at))}${
                        entry.invite_count > 1 ? ` (${entry.invite_count}×)` : ""
                      }`}
                  </small>
                </div>
                <div className="admin-actions">
                  {entry.status === "pending" && (
                    <>
                      {mail.enabled ? (
                        <button
                          type="button"
                          className="button button-mango"
                          disabled={working}
                          onClick={() => void invite(entry)}
                        >
                          <Send size={16} />
                          {busy === entry.id ? "Sende …" : "Freigeben & einladen"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-mango"
                          disabled={working}
                          onClick={() =>
                            void run(
                              entry.id,
                              () => repository().approveWaitlist(entry.id),
                              `${entry.name} ist freigegeben. Jetzt noch das Ticket schicken.`,
                            )
                          }
                        >
                          <Check size={16} />
                          {busy === entry.id ? "Moment …" : "Freigeben"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="button button-ink"
                        disabled={working}
                        onClick={() =>
                          void run(
                            entry.id,
                            () => repository().rejectWaitlist(entry.id),
                            `${entry.name} wurde abgelehnt.`,
                          )
                        }
                      >
                        <X size={16} />
                        Ablehnen
                      </button>
                    </>
                  )}
                  {entry.status === "approved" && ticket && !expired && !redeemed && (
                    <>
                      {mail.enabled ? (
                        <button
                          type="button"
                          className={`button ${entry.invited_at ? "button-ink" : "button-mango"}`}
                          disabled={working}
                          onClick={() => void invite(entry)}
                        >
                          <Send size={16} />
                          {busy === entry.id
                            ? "Sende …"
                            : entry.invited_at
                              ? "Erneut senden"
                              : "Einladung senden"}
                        </button>
                      ) : (
                        <a
                          className="button button-mango"
                          href={mailto(entry, ticket)}
                        >
                          <Mail size={16} />
                          Mail schreiben
                        </a>
                      )}
                      <button
                        type="button"
                        className="button button-ink"
                        onClick={() => void copy(entry, ticket)}
                      >
                        <Copy size={16} />
                        {copied === entry.id ? "Kopiert!" : "Link kopieren"}
                      </button>
                    </>
                  )}
                  {entry.status === "approved" && (expired || !ticket) && (
                    <button
                      type="button"
                      className="button button-mango"
                      disabled={working}
                      onClick={() =>
                        mail.enabled
                          ? void invite(entry)
                          : void run(
                              entry.id,
                              () => repository().approveWaitlist(entry.id),
                              `Neues Ticket für ${entry.name} ist bereit.`,
                            )
                      }
                    >
                      <RotateCcw size={16} />
                      Neues Ticket
                    </button>
                  )}
                  {entry.status === "rejected" && (
                    <button
                      type="button"
                      className="button button-mango"
                      disabled={working}
                      onClick={() =>
                        mail.enabled
                          ? void invite(entry)
                          : void run(
                              entry.id,
                              () => repository().approveWaitlist(entry.id),
                              `${entry.name} ist doch freigegeben.`,
                            )
                      }
                    >
                      <Check size={16} />
                      Doch freigeben
                    </button>
                  )}
                  {confirmDelete === entry.id ? (
                    <span className="admin-confirm">
                      Endgültig löschen?
                      <button
                        type="button"
                        className="text-button"
                        disabled={working}
                        onClick={() => {
                          setConfirmDelete("");
                          void run(
                            entry.id,
                            () => repository().deleteWaitlist(entry.id),
                            "Eintrag gelöscht.",
                          );
                        }}
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setConfirmDelete("")}
                      >
                        Nein
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Eintrag von ${entry.name} löschen`}
                      onClick={() => setConfirmDelete(entry.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="helper-text admin-note">
        Freigegebene Tickets sind 30 Tage gültig und nur einmal einlösbar. Im
        Profil der neuen Person steht „Eingeladen von @{me.username}“. Löschen
        entfernt nur den Wartelisten-Eintrag; ein schon verschicktes Ticket
        bleibt gültig.
      </p>
    </div>
  );
}
