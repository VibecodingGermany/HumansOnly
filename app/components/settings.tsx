"use client";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Eye,
  Globe,
  LogOut,
  Mic,
  Plus,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  X,
  Lock,
} from "lucide-react";
import { useClub } from "./provider";
import { Avatar, Loading } from "./ui";
import { AudioPlayer } from "./audio-player";
import { VoiceRecorder, type Recording } from "./voice-recorder";
import { config } from "@/lib/config";
import { prepareAvatar } from "@/lib/image";
import { MAX_LINKS } from "@/lib/model";
import type {
  NotificationSettings,
  Profile,
  ProfileLink,
  Visibility,
} from "@/lib/model";

type Draft = {
  displayName: string;
  bio: string;
  location: string;
  pronouns: string;
  links: ProfileLink[];
  visibility: Visibility;
  showPosts: boolean;
  showTrustTree: boolean;
};
function toDraft(p: Profile): Draft {
  return {
    displayName: p.display_name,
    bio: p.bio,
    location: p.location,
    pronouns: p.pronouns,
    links: p.links.map((l) => ({ ...l })),
    visibility: p.visibility,
    showPosts: p.show_posts,
    showTrustTree: p.show_trust_tree,
  };
}
const VISIBILITY_OPTIONS: {
  value: Visibility;
  title: string;
  text: string;
  Icon: typeof Users;
}[] = [
  {
    value: "members",
    title: "Nur Mitglieder",
    text: "Alle Mitglieder von Humans Only sehen dein Profil. Ohne Login sieht niemand etwas. Das ist die Standard-Einstellung.",
    Icon: Users,
  },
  {
    value: "public",
    title: "Öffentlich",
    text: "Jeder mit dem Link sieht Namen, Bild, Bio, Ort, Pronomen und Links, auch ohne Login und in Suchmaschinen. Beiträge, Vertrauensbaum und deine Stimme bleiben im Club.",
    Icon: Globe,
  },
  {
    value: "hidden",
    title: "Zurückhaltend",
    text: "Andere Mitglieder sehen auf deinem Profil nur Namen, Nutzernamen und Bild. Deine Beiträge im Clubhaus bleiben für Mitglieder sichtbar.",
    Icon: Lock,
  },
];

export function SettingsPage() {
  const { me, loading } = useClub();
  if (loading) return <Loading />;
  if (!me)
    return (
      <div className="empty-state">
        <h1>Einstellungen sind für Mitglieder da.</h1>
        <p>
          Tritt mit deinem Goldenen Ticket ein, um dein Profil zu gestalten.
        </p>
        <Link className="button button-mango" href="/invite">
          Mit Ticket eintreten
        </Link>
      </div>
    );
  return <SettingsBody key={me.id} me={me} />;
}

function SettingsBody({ me }: { me: Profile }) {
  const { repository, refresh, notify } = useClub();
  const [tab, setTab] = useState("profil");
  const savedKey = JSON.stringify(toDraft(me));
  const saved = useMemo(() => JSON.parse(savedKey) as Draft, [savedKey]);
  const [draft, setDraft] = useState<Draft>(saved);
  // Neu laden (Fokus, Realtime) darf ungespeicherte Eingaben nicht überschreiben;
  // erst wenn sich die gespeicherten Werte selbst ändern, wird das Formular neu aufgesetzt.
  useEffect(() => setDraft(saved), [saved]);
  const dirty = JSON.stringify(draft) !== savedKey;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setError("");
    try {
      await repository().updateProfile(draft);
      await refresh();
      notify("Dein Profil ist gespeichert.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Profil konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }
  const saveBar = (
    <div className="settings-save">
      <span className="helper-text" role="status">
        {dirty ? "Du hast ungespeicherte Änderungen." : "Alles gespeichert."}
      </span>
      <button
        type="submit"
        className="button button-mango"
        disabled={!dirty || saving}
      >
        {saving ? "Wird gespeichert …" : "Änderungen speichern"}
      </button>
    </div>
  );
  return (
    <div className="settings-layout">
      <Link href={`/u/${me.username}`} className="back-link">
        ← Zurück zu deinem Profil
      </Link>
      <span className="eyebrow">DEIN PLATZ IM CLUBHAUS</span>
      <h1 className="settings-title">
        Einstellungen<span className="mango-dot">.</span>
      </h1>
      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="settings-tabs" aria-label="Einstellungen">
          <Tabs.Trigger value="profil">
            <UserRound size={17} />
            Profil
          </Tabs.Trigger>
          <Tabs.Trigger value="privatsphaere">
            <Eye size={17} />
            Privatsphäre
          </Tabs.Trigger>
          <Tabs.Trigger value="benachrichtigungen">
            <Bell size={17} />
            Mitteilungen
          </Tabs.Trigger>
          <Tabs.Trigger value="konto">
            <ShieldAlert size={17} />
            Konto
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="profil" className="settings-panel">
          <AvatarEditor me={me} />
          <VoiceIntroEditor me={me} />
          <form onSubmit={(e) => void save(e)}>
            <div className="field-grid">
              <div>
                <label htmlFor="set-name">Anzeigename</label>
                <input
                  id="set-name"
                  value={draft.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                  maxLength={60}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label htmlFor="set-username">
                  Nutzername <span>Fest</span>
                </label>
                <input id="set-username" value={`@${me.username}`} readOnly />
              </div>
            </div>
            <label htmlFor="set-bio">
              Über dich <span>{draft.bio.length}/300</span>
            </label>
            <textarea
              id="set-bio"
              rows={4}
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
              maxLength={300}
              placeholder="Ich baue gerade …"
            />
            <div className="field-grid">
              <div>
                <label htmlFor="set-location">
                  Ort <span>Optional</span>
                </label>
                <input
                  id="set-location"
                  value={draft.location}
                  onChange={(e) => set("location", e.target.value)}
                  maxLength={60}
                  placeholder="Oldenburg"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label htmlFor="set-pronouns">
                  Pronomen <span>Optional</span>
                </label>
                <input
                  id="set-pronouns"
                  value={draft.pronouns}
                  onChange={(e) => set("pronouns", e.target.value)}
                  maxLength={30}
                  placeholder="sie/ihr, er/ihm, they/them …"
                />
              </div>
            </div>
            <fieldset className="links-editor">
              <legend>
                Links <small>bis zu {MAX_LINKS}</small>
              </legend>
              {draft.links.map((link, i) => (
                <div className="link-row" key={i}>
                  <input
                    aria-label={`Link ${i + 1}: Titel`}
                    placeholder="Titel (z. B. Website)"
                    maxLength={40}
                    value={link.label}
                    onChange={(e) =>
                      set(
                        "links",
                        draft.links.map((l, n) =>
                          n === i ? { ...l, label: e.target.value } : l,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Link ${i + 1}: Adresse`}
                    placeholder="https://…"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={200}
                    value={link.url}
                    onChange={(e) =>
                      set(
                        "links",
                        draft.links.map((l, n) =>
                          n === i ? { ...l, url: e.target.value } : l,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Link ${i + 1} entfernen`}
                    onClick={() =>
                      set(
                        "links",
                        draft.links.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-button"
                disabled={draft.links.length >= MAX_LINKS}
                onClick={() =>
                  set("links", [...draft.links, { label: "", url: "" }])
                }
              >
                <Plus size={14} />
                Link hinzufügen
              </button>
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {saveBar}
          </form>
        </Tabs.Content>
        <Tabs.Content value="privatsphaere" className="settings-panel">
          <form onSubmit={(e) => void save(e)}>
            <fieldset className="radio-group">
              <legend>Wer darf dein Profil sehen?</legend>
              {VISIBILITY_OPTIONS.map(({ value, title, text, Icon }) => (
                <label
                  key={value}
                  className={`radio-card ${draft.visibility === value ? "checked" : ""}`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={draft.visibility === value}
                    onChange={() => set("visibility", value)}
                  />
                  <Icon size={20} aria-hidden />
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {draft.visibility === "public" && (
              <p className="helper-text">
                Dein öffentliches Profil erreichst du unter{" "}
                <strong>/u/{me.username}</strong>. Wähle „Nur Mitglieder“, um es
                jederzeit wieder zu schließen.
              </p>
            )}
            <fieldset className="radio-group">
              <legend>Auf deinem Profil zeigen</legend>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={draft.showPosts}
                  disabled={draft.visibility === "hidden"}
                  onChange={(e) => set("showPosts", e.target.checked)}
                />
                <span>
                  <strong>Meine Beiträge</strong>
                  <small>Die Liste deiner Gedanken unter dem Profil.</small>
                </span>
              </label>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={draft.showTrustTree}
                  disabled={draft.visibility === "hidden"}
                  onChange={(e) => set("showTrustTree", e.target.checked)}
                />
                <span>
                  <strong>Vertrauensbaum</strong>
                  <small>Wer dich eingeladen hat und für wen du bürgst.</small>
                </span>
              </label>
            </fieldset>
            <p className="helper-text">
              Diese Einstellungen bestimmen, was deine Profilseite zeigt.
              Beiträge, die du im Clubhaus schreibst, sehen die Mitglieder des
              jeweiligen Raums weiterhin.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {saveBar}
            <Link className="text-button" href={`/u/${me.username}`}>
              So sehen Mitglieder dein Profil
            </Link>
          </form>
        </Tabs.Content>
        <Tabs.Content value="benachrichtigungen" className="settings-panel">
          <NotificationsForm />
        </Tabs.Content>
        <Tabs.Content value="konto" className="settings-panel">
          <AccountPanel me={me} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function AvatarEditor({ me }: { me: Profile }) {
  const { repository, refresh, notify, report } = useClub();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await prepareAvatar(file);
      const repo = repository();
      const path = await repo.upload("avatars", blob);
      await repo.setAvatar(path);
      await refresh();
      notify("Dein Profilbild ist aktualisiert.");
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await repository().setAvatar(null);
      await refresh();
      notify("Dein Profilbild ist entfernt.");
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="avatar-editor">
      <Avatar profile={me} size="large" />
      <div>
        <strong>Profilbild</strong>
        <p className="helper-text">
          JPG, PNG oder WebP. Wir schneiden es quadratisch zu.
        </p>
        <div className="avatar-actions">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Profilbild auswählen"
            onChange={(e) => void pick(e)}
          />
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Camera size={17} />
            {busy
              ? "Einen Moment …"
              : me.avatar_url
                ? "Bild ändern"
                : "Bild hochladen"}
          </button>
          {me.avatar_url && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void remove()}
            >
              Bild entfernen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Die Stimme ist das Herz von Humans Only: hier lässt sie sich neu aufnehmen. */
function VoiceIntroEditor({ me }: { me: Profile }) {
  const { repository, refresh, notify, report } = useClub();
  const [editing, setEditing] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!recording) return;
    setBusy(true);
    try {
      const repo = repository();
      const path = await repo.upload("voice-intros", recording.blob);
      await repo.setVoiceIntro(path, recording.duration);
      await refresh();
      setEditing(false);
      setRecording(null);
      notify("Deine neue Vorstellung ist gespeichert.");
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="voice-editor">
      <strong>Deine Stimme</strong>
      <p className="helper-text">
        Bis zu 15 Sekunden: So hören die anderen, wer hinter deinem Profil
        steckt.
      </p>
      {me.voice_intro_url && !editing && (
        <AudioPlayer
          src={me.voice_intro_url}
          duration={me.voice_duration_sec || 15}
          label="Deine aktuelle Vorstellung"
        />
      )}
      {editing ? (
        <>
          <VoiceRecorder
            maxSeconds={15}
            onChange={setRecording}
            onRecordingChange={setActive}
          />
          <div className="avatar-actions">
            <button
              type="button"
              className="button button-mango"
              disabled={!recording || active || busy}
              onClick={() => void save()}
            >
              {busy ? "Wird gespeichert …" : "Neue Vorstellung speichern"}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy || active}
              onClick={() => {
                setEditing(false);
                setRecording(null);
              }}
            >
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <div className="avatar-actions">
          <button
            type="button"
            className="button"
            onClick={() => setEditing(true)}
          >
            <Mic size={17} />
            {me.voice_intro_url ? "Neu aufnehmen" : "Vorstellung aufnehmen"}
          </button>
        </div>
      )}
    </div>
  );
}

const NOTIFICATION_OPTIONS: {
  key: keyof NotificationSettings;
  title: string;
  text: string;
}[] = [
  {
    key: "notify_replies",
    title: "Antworten auf meine Beiträge",
    text: "Wenn jemand auf einen deiner Gedanken antwortet.",
  },
  {
    key: "notify_ticket_redeemed",
    title: "Ein Goldenes Ticket wurde eingelöst",
    text: "Wenn ein Mensch durch deine Einladung ins Clubhaus kommt.",
  },
  {
    key: "notify_news",
    title: "Neuigkeiten aus dem Clubhaus",
    text: "Gelegentlich: neue Räume und Funktionen. Aus, bis du es einschaltest.",
  },
];

function NotificationsForm() {
  const { state, repository, refresh, notify } = useClub();
  const key = JSON.stringify(state.settings);
  const saved = useMemo(() => JSON.parse(key) as NotificationSettings, [key]);
  const [draft, setDraft] = useState<NotificationSettings>(saved);
  useEffect(() => setDraft(saved), [saved]);
  const dirty = JSON.stringify(draft) !== key;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await repository().updateNotifications(draft);
      await refresh();
      notify("Deine Mitteilungs-Einstellungen sind gespeichert.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={(e) => void save(e)}>
      <fieldset className="radio-group">
        <legend>Per E-Mail benachrichtigen bei</legend>
        {NOTIFICATION_OPTIONS.map(({ key: id, title, text }) => (
          <label className="switch-row" key={id}>
            <input
              type="checkbox"
              checked={draft[id]}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [id]: e.target.checked }))
              }
            />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="helper-text">
        Der automatische Versand dieser Mitteilungen ist noch in Vorbereitung.
        Deine Auswahl wird schon jetzt gespeichert und gilt, sobald er startet.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-save">
        <span className="helper-text" role="status">
          {dirty ? "Du hast ungespeicherte Änderungen." : "Alles gespeichert."}
        </span>
        <button
          type="submit"
          className="button button-mango"
          disabled={!dirty || saving}
        >
          {saving ? "Wird gespeichert …" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}

function AccountPanel({ me }: { me: Profile }) {
  const { state, repository, refresh, notify, report } = useClub();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function changeEmail(event: React.FormEvent) {
    event.preventDefault();
    setEmailBusy(true);
    setEmailError("");
    try {
      await repository().requestEmailChange(email);
      setEmail("");
      await refresh();
      notify(
        config.mode === "demo"
          ? "Demo: Deine E-Mail-Adresse ist geändert."
          : "Wir haben dir eine Bestätigung geschickt. Die Adresse ändert sich erst, wenn du den Link darin öffnest.",
      );
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : "Die Adresse konnte nicht geändert werden.",
      );
    } finally {
      setEmailBusy(false);
    }
  }
  async function signOut() {
    try {
      await repository().signOut();
      await refresh();
      router.push("/invite");
    } catch (err) {
      report(err);
    }
  }
  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      await repository().deleteAccount();
      await refresh();
      notify("Dein Konto ist gelöscht. Danke, dass du dabei warst.");
      router.push("/invite");
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Das Konto konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="account-panel">
      <section>
        <h2>Anmeldung</h2>
        <p className="account-email">
          Du bist angemeldet als <strong>{state.email || "—"}</strong>
        </p>
        <form onSubmit={(e) => void changeEmail(e)}>
          <label htmlFor="set-email">Neue E-Mail-Adresse</label>
          <div className="inline-form">
            <input
              id="set-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="neu@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="button"
              disabled={emailBusy || !email.trim()}
            >
              {emailBusy ? "Wird gesendet …" : "Ändern"}
            </button>
          </div>
          {emailError && (
            <p className="form-error" role="alert">
              {emailError}
            </p>
          )}
        </form>
        <button type="button" className="button" onClick={() => void signOut()}>
          <LogOut size={17} />
          Abmelden
        </button>
      </section>
      <section className="danger-zone">
        <h2>Konto löschen</h2>
        <p className="helper-text">
          Dein Profil, deine Beiträge samt den Antworten darauf, deine Stimmen
          und deine noch offenen Goldenen Tickets werden unwiderruflich
          gelöscht. Das lässt sich nicht rückgängig machen.
        </p>
        {!confirming ? (
          <button
            type="button"
            className="button button-danger"
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={17} />
            Konto löschen …
          </button>
        ) : (
          <div>
            <label htmlFor="set-confirm">
              Tippe zur Bestätigung deinen Nutzernamen: <b>{me.username}</b>
            </label>
            <div className="inline-form">
              <input
                id="set-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoCapitalize="none"
                autoComplete="off"
              />
              <button
                type="button"
                className="button button-danger"
                disabled={typed.trim() !== me.username || deleting}
                onClick={() => void deleteAccount()}
              >
                {deleting ? "Wird gelöscht …" : "Endgültig löschen"}
              </button>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
            >
              Abbrechen
            </button>
          </div>
        )}
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
      </section>
    </div>
  );
}
