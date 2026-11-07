"use client";
import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  Copy,
  Plus,
  QrCode,
  Ticket,
  UserRoundCheck,
} from "lucide-react";
import type { Ticket as TicketModel } from "@/lib/model";
import { useClub } from "./provider";
import { Loading, Mascot, Modal } from "./ui";
export function TicketsPage() {
  const { state, me, loading, ready, repository, refresh, report, notify } =
    useClub();
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<TicketModel | null>(null);
  const [copied, setCopied] = useState("");
  const [fallback, setFallback] = useState("");
  if (loading) return <Loading />;
  if (!me)
    return (
      <div className="empty-state">
        <h1>Dein Ticket ist der Anfang.</h1>
        <p>Nach deiner Vorstellung bekommst du drei eigene Einladungen.</p>
        <Link className="button button-mango" href="/invite">
          Mit Ticket eintreten
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  const space = state.spaces.find((s) => s.slug === "vibecoding-germany");
  const tickets = state.tickets.filter((t) => t.creator_id === me.id);
  const canIssue =
    space &&
    state.memberships.some(
      (m) => m.space_id === space.id && m.user_id === me.id,
    ) &&
    me.can_invite;
  function ticketUrl(ticket: TicketModel) {
    return `${window.location.origin}/invite?code=${encodeURIComponent(ticket.code)}`;
  }
  async function issue() {
    if (!space) return;
    setBusy(true);
    try {
      await repository().createTicket(space.id);
      await refresh();
      notify(
        "Dein Goldenes Ticket ist bereit. Teile es mit einem Menschen, dem du vertraust.",
      );
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  async function copy(ticket: TicketModel) {
    const url = ticketUrl(ticket);
    try {
      if (!navigator.clipboard) throw new Error();
      await navigator.clipboard.writeText(url);
      setCopied(ticket.id);
    } catch {
      setFallback(url);
    }
  }
  const allSlots = [
    ...tickets,
    ...Array.from({ length: me.invites_left }, () => null),
  ];
  return (
    <div className="wallet">
      <div className="wallet-heading">
        <div>
          <span className="eyebrow">GUTE LEUTE KENNEN GUTE LEUTE.</span>
          <h1>
            Drei Tickets.
            <br />
            <span>Unzählige Möglichkeiten.</span>
          </h1>
          <p>Du kennst jemanden, der hier fehlt? Mach die Tür auf.</p>
        </div>
        <Mascot pose="sticker/bin-dabei" size={200} />
      </div>
      <div className="wallet-summary">
        <span className="ticket-count">{me.invites_left}</span>
        <span>
          <strong>Einladungen übrig</strong>
          <br />
          Dein Kombi-Pass für Clubhaus + Vibecoding Germany
        </span>
        <Ticket size={28} />
      </div>
      <div className="ticket-grid">
        {allSlots.map((ticket, i) => {
          const redeemed = Boolean(ticket?.redeemed_at);
          const expired = ticket
            ? new Date(ticket.expires_at) <= new Date()
            : false;
          return (
            <section
              className={`golden-ticket ${redeemed || expired ? "ticket-used" : ""}`}
              key={ticket?.id || `slot-${i}`}
            >
              <div className="ticket-topline">
                <span>HUMANS ONLY®</span>
                <span>NO. {String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="ticket-punch">
                <span />
                <span />
              </div>
              <div className="ticket-main">
                <span className="ticket-star">✳</span>
                <h2>
                  GOLDEN
                  <br />
                  TICKET
                </h2>
                <span className="ticket-room">↗ VIBECODING GERMANY</span>
                <p>
                  Ein guter Mensch.
                  <br />
                  Ein neuer Platz am Tisch.
                </p>
              </div>
              <div className="ticket-tear" />
              <div className="ticket-bottom">
                {ticket ? (
                  <>
                    <span className="ticket-code">
                      {redeemed
                        ? "BEREITS EINGELÖST"
                        : expired
                          ? "ABGELAUFEN"
                          : `GÜLTIG BIS ${new Date(ticket.expires_at).toLocaleDateString("de-DE")}`}
                    </span>
                    <div className="ticket-buttons">
                      <button
                        type="button"
                        disabled={redeemed || expired}
                        onClick={() => void copy(ticket)}
                      >
                        <Copy size={16} />
                        {copied === ticket.id ? "Kopiert!" : "Link kopieren"}
                      </button>
                      <button
                        type="button"
                        disabled={redeemed || expired}
                        onClick={() => setQr(ticket)}
                        aria-label={`QR-Code für Ticket ${i + 1}`}
                      >
                        <QrCode size={19} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="ticket-code">NOCH NICHT VERGEBEN</span>
                    <button
                      className="ticket-create"
                      type="button"
                      disabled={busy || !ready || !canIssue}
                      onClick={() => void issue()}
                    >
                      <Plus size={17} />
                      {busy ? "Wird ausgestellt …" : "Ticket ausstellen"}
                    </button>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {!me.can_invite && (
        <p className="form-error">
          Deine Einladungsrechte sind pausiert. Bereits ausgestellte Tickets
          sind ebenfalls gesperrt.
        </p>
      )}
      <div className="sponsor-note">
        <UserRoundCheck size={25} />
        <div>
          <h3>Du lädst nicht irgendwen ein. Du bürgst.</h3>
          <p>
            Dein Name steht im Profil deines Gastes. Lade Menschen ein, die du
            hier wirklich dabeihaben möchtest. Bei Missbrauch können
            Einladungsrechte pausiert werden.
          </p>
          <small>
            Ein Ticket wird beim Ausstellen verbraucht und ist 30 Tage gültig.
            Ablauf erstattet kein Ticket.
          </small>
        </div>
      </div>
      {fallback && (
        <div className="manual-copy">
          <label htmlFor="copy-link">Link zum Kopieren</label>
          <input
            id="copy-link"
            readOnly
            value={fallback}
            onFocus={(e) => e.target.select()}
          />
          <small>
            Kopieren ist in diesem Browser nicht automatisch verfügbar. Markiere
            den Link und kopiere ihn manuell.
          </small>
        </div>
      )}
      <Modal
        open={Boolean(qr)}
        onOpenChange={(value) => {
          if (!value) setQr(null);
        }}
        title="Ein Scan. Ein neuer Mensch."
        description="Dein Goldenes Ticket für das Clubhaus und Vibecoding Germany."
      >
        {qr && (
          <div className="qr-ticket">
            <QRCodeSVG
              value={ticketUrl(qr)}
              size={220}
              marginSize={3}
              level="M"
              title="Einladungslink als QR-Code"
            />
            <code>{qr.code}</code>
            <button
              className="button button-mango"
              onClick={() => void copy(qr)}
            >
              <Copy size={17} />
              {copied === qr.id ? "Kopiert!" : "Einladungslink kopieren"}
            </button>
            <p className="helper-text">
              Für einen Scan vom Handy muss die Adresse auf dem Handy erreichbar
              sein. localhost verweist immer auf das jeweilige Gerät.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
