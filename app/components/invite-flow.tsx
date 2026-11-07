"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mail, Ticket, UserRoundCheck } from "lucide-react";
import { useClub } from "./provider";
import { Mascot } from "./ui";
import { config } from "@/lib/config";
import { DEMO_CODE } from "@/lib/seed";
import { VoiceRecorder, type Recording } from "./voice-recorder";
const key = "humans-only-invite";
export function InvitePage() {
  const router = useRouter();
  const { repository, ready, me, refresh } = useClub();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("code");
    if (initial) setCode(initial);
    if (params.has("auth_error"))
      setError(
        "Der Anmeldelink konnte nicht bestätigt werden. Fordere bitte einen neuen Link an.",
      );
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const preview = await repository().inspectInvite(code);
      if (!preview.valid)
        throw new Error(
          "Das Ticket ist ungültig, abgelaufen oder schon eingelöst. Frag deinen Bürgen nach einem neuen.",
        );
      localStorage.setItem(
        key,
        JSON.stringify({
          code: code.trim().toUpperCase(),
          expires: Date.now() + 3600000,
        }),
      );
      router.push("/onboarding");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Ticket konnte nicht geprüft werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="entry-grid">
      <section className="entry-art">
        <span className="sticker-label">
          KEIN ALGORITHMUS. EIN GUTES GEFÜHL.
        </span>
        <h1>
          Hier kommst
          <br />
          du als Mensch
          <br />
          <span>rein.</span>
        </h1>
        <div className="entry-mascot">
          <Mascot pose="zeigen" size={430} />
          <span className="entry-bubble">
            Moin!
            <br />
            Hast du ein Ticket?
          </span>
        </div>
        <p className="hand-note">Karl-Dieter hält dir die Tür auf.</p>
      </section>
      <section className="entry-card">
        <div className="step-label">
          <span className="active">01 TICKET</span>
          <i />
          <span>02 DEIN HALLO</span>
        </div>
        <div className="entry-mobile-host">
          <Mascot pose="zeigen" size={130} />
          <p>
            Moin!
            <br />
            Ticket dabei?
          </p>
        </div>
        <span className="entry-icon">
          <Ticket size={30} />
        </span>
        <h2>
          Ein guter Mensch
          <br />
          hat an dich gedacht.
        </h2>
        <p>
          Dein Goldenes Ticket öffnet das Clubhaus und bringt dich direkt zu
          deinen Leuten.
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <label htmlFor="invite-code">Dein Goldenes Ticket</label>
          <input
            id="invite-code"
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="TICKET-CODE"
            required
            maxLength={100}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-mango full-width"
            type="submit"
            disabled={busy || !ready || !code.trim()}
          >
            {busy ? "Karl-Dieter prüft …" : "Tür aufmachen"}
            <ArrowRight size={19} />
          </button>
        </form>
        <div className="entry-promise">
          <UserRoundCheck size={19} />
          <span>
            Eine Einladung. Ein echter Kontakt.
            <br />
            <strong>So beginnt Vertrauen.</strong>
          </span>
        </div>
        {config.mode === "demo" && (
          <div className="demo-entry">
            <span>Erst mal reinschnuppern?</span>
            <button
              type="button"
              className="text-button"
              onClick={() => setCode(DEMO_CODE)}
            >
              Demo-Ticket einsetzen
              <ArrowRight size={15} />
            </button>
            <small>
              Einmal pro Demo einlösbar. Im Fußbereich kannst du neu starten.
            </small>
          </div>
        )}
        {me ? (
          <Link className="back-link" href="/">
            Zurück ins Clubhaus →
          </Link>
        ) : config.mode === "demo" ? (
          <button
            className="back-link"
            type="button"
            disabled={!ready}
            onClick={async () => {
              try {
                await repository().requestLogin("demo");
                await refresh();
                router.push("/");
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Die Demo konnte nicht geöffnet werden.",
                );
              }
            }}
          >
            Als Dennis ins Demo-Clubhaus →
          </button>
        ) : (
          <Link className="back-link" href="/onboarding?login=1">
            Schon Mitglied? Hier anmelden →
          </Link>
        )}
      </section>
    </div>
  );
}
export function OnboardingPage() {
  const { repository, ready, refresh, me } = useClub();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(config.mode === "demo");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [room, setRoom] = useState("deinem Wohnzimmer");
  const [loginOnly, setLoginOnly] = useState(false);
  useEffect(() => {
    if (!ready) return;
    setLoginOnly(new URLSearchParams(window.location.search).has("login"));
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as {
        code: string;
        expires: number;
      } | null;
      if (saved && saved.expires > Date.now()) {
        setCode(saved.code);
        void repository()
          .inspectInvite(saved.code)
          .then((p) => {
            if (p.space_name) setRoom(p.space_name);
          })
          .catch(() => {});
      } else localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
    void repository()
      .hasSession()
      .then(setSession)
      .catch(() =>
        setError(
          "Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.",
        ),
      );
  }, [ready, repository]);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (sent) {
        await repository().verifyLogin(email, token);
        setSession(true);
      } else {
        await repository().requestLogin(email);
        setSent(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Anmeldung ist fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!recording) return;
    setBusy(true);
    setError("");
    try {
      const voiceUrl = await repository().upload(
        "voice-intros",
        recording.blob,
      );
      await repository().onboard({
        code,
        username,
        displayName: name,
        bio,
        voiceUrl,
        voiceDuration: recording.duration,
      });
      await refresh();
      localStorage.removeItem(key);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Deine Vorstellung konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (config.mode === "supabase" && me)
    return (
      <div className="empty-state">
        <h1>Willkommen zurück, {me.display_name}.</h1>
        <Link href="/" className="button button-mango">
          Ins Clubhaus
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="onboarding-layout">
      <div className="onboarding-intro">
        <span className="eyebrow">DU MUSST NICHT PERFEKT KLINGEN.</span>
        <h1>
          Du musst nur
          <br />
          <span>du sein.</span>
        </h1>
        <p>
          Ein Name, ein paar Worte und deine Stimme. Mehr braucht ein gutes
          Hallo nicht.
        </p>
        <Mascot pose="podcast" size={300} />
        <div className="onboarding-perks">
          <p>
            <Check size={16} />
            Ein Platz in {room}
          </p>
          <p>
            <Check size={16} />
            Zugang zur Großen Lobby
          </p>
          <p>
            <Check size={16} />3 Tickets für deine Lieblingsmenschen
          </p>
        </div>
      </div>
      <section className="entry-card onboarding-card">
        <div className="step-label">
          <Link href="/invite">✓ TICKET</Link>
          <i />
          <span className="active">02 DEIN HALLO</span>
        </div>
        <h2>
          {loginOnly
            ? "Schön, dass du wieder da bist."
            : "Wer sitzt mit am Tisch?"}
        </h2>
        {!code && !loginOnly && (
          <p className="helper-text">
            Dein Ticket fehlt in diesem Browser.{" "}
            <Link href="/invite">Ticket eingeben</Link>
          </p>
        )}
        {!session ? (
          <form onSubmit={(e) => void login(e)}>
            <p>
              {loginOnly
                ? "Melde dich mit der E-Mail-Adresse deines Mitgliedskontos an."
                : "Bestätige kurz deine E-Mail. Dein Ticket bleibt eine Stunde für die Vorstellung vorgemerkt."}
            </p>
            <label htmlFor="auth-email">E-Mail-Adresse</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={sent}
            />
            {sent && (
              <>
                <p className="helper-text">
                  Öffne den Link aus deiner E-Mail in diesem Browser. Falls die
                  E-Mail einen Code enthält, kannst du ihn hier eingeben.
                </p>
                <label htmlFor="auth-token">E-Mail-Code</label>
                <input
                  id="auth-token"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  minLength={6}
                  maxLength={10}
                />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSent(false)}
                >
                  Andere E-Mail / erneut senden
                </button>
              </>
            )}
            <button
              type="submit"
              className="button button-mango full-width"
              disabled={!ready || busy}
            >
              <Mail size={18} />
              {busy
                ? "Einen Moment …"
                : sent
                  ? "Code bestätigen"
                  : "Anmeldelink senden"}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void submit(e)}>
            <div className="field-grid">
              <div>
                <label htmlFor="display-name">So heißt du</label>
                <input
                  id="display-name"
                  placeholder="Dein Vorname"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                />
              </div>
              <div>
                <label htmlFor="username">Dein @Nutzername</label>
                <input
                  id="username"
                  placeholder="dein_name"
                  autoCapitalize="none"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  pattern="[a-z0-9_]{3,24}"
                  title="3–24 kleine Buchstaben, Ziffern oder Unterstriche"
                  minLength={3}
                  maxLength={24}
                  required
                />
              </div>
            </div>
            <label htmlFor="bio">
              Was bringt dich hierher? <span>Optional</span>
            </label>
            <textarea
              id="bio"
              placeholder="Ich baue gerade …"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
            />
            <VoiceRecorder onChange={setRecording} />
            <p className="helper-text">
              Deine Vorstellung ist für Mitglieder hörbar. Eine Stimme schafft
              Nähe — sie ist kein technischer Identitätsnachweis.
            </p>
            <button
              type="submit"
              className="button button-mango full-width"
              disabled={busy || !ready || !recording || !code}
            >
              {busy
                ? "Dein Platz wird vorbereitet …"
                : "Hallo sagen & eintreten"}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
