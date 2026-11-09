"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Send, Type, X } from "lucide-react";
import { Modal } from "./ui";
import { VoiceRecorder, type Recording } from "./voice-recorder";
import { useClub } from "./provider";
import { LinkPreviewCard } from "./link-preview";
import { firstUrl } from "@/lib/links";
export function Composer({
  open,
  onOpenChange,
  spaceId,
  parentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string | null;
  parentId?: string;
}) {
  const { repository, refresh, notify, state } = useClub();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"text" | "image" | "voice">("text");
  const [image, setImage] = useState<File | null>(null);
  const [voice, setVoice] = useState<Recording | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  // Vorschau erst, wenn kurz nicht mehr getippt wird (nicht bei jedem Tastendruck).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewUrl(firstUrl(text)), 700);
    return () => clearTimeout(timer);
  }, [text]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const repo = repository();
      const imageUrl = image
        ? await repo.upload("post-media", image)
        : undefined;
      const audioUrl = voice
        ? await repo.upload("post-media", voice.blob)
        : undefined;
      await repo.createPost({
        spaceId,
        text,
        imageUrl,
        audioUrl,
        audioDuration: voice?.duration,
        parentId,
      });
      await refresh();
      onOpenChange(false);
      setText("");
      setImage(null);
      setVoice(null);
      notify(
        parentId ? "Deine Antwort ist da." : "Dein Beitrag ist im Clubhaus.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Dein Beitrag konnte nicht gesendet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  const room =
    state.spaces.find((s) => s.id === spaceId)?.name || "Große Lobby";
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
      title={parentId ? "Das Gespräch geht weiter." : "Was bewegt dich?"}
      description={`Dein Beitrag für ${room}. Eine echte Idee ist mehr wert als ein perfekter Post.`}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="composer-types" aria-label="Beitragsformat">
          {(
            [
              { id: "text", label: "Gedanken", Icon: Type },
              { id: "image", label: "Bild", Icon: ImagePlus },
              { id: "voice", label: "Sprachnotiz", Icon: Mic },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              disabled={recordingBusy || busy}
              onClick={() => setKind(id)}
              className={kind === id ? "active" : ""}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="post-text">
          Dein Beitrag
        </label>
        <textarea
          id="post-text"
          autoFocus
          placeholder="Eine Idee, eine Frage, ein kleiner Erfolg …"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={5}
        />
        <div className="character-count">{text.length} / 2.000</div>
        {previewUrl && !image && (
          <div className="composer-preview">
            <LinkPreviewCard url={previewUrl} />
          </div>
        )}
        {kind === "image" && (
          <div className="upload-zone">
            <ImagePlus size={28} />
            <p>Zeig uns deine Perspektive.</p>
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Bild auswählen"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            <small>JPG, PNG oder WebP · max. 10 MB</small>
          </div>
        )}
        {image && (
          <div className="attachment-label">
            {image.name}
            <button
              type="button"
              className="icon-button"
              aria-label="Bild entfernen"
              onClick={() => {
                setImage(null);
                if (file.current) file.current.value = "";
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div hidden={kind !== "voice"}>
          <VoiceRecorder
            maxSeconds={60}
            onChange={setVoice}
            onRecordingChange={setRecordingBusy}
          />
        </div>
        {voice && kind !== "voice" && (
          <p className="attachment-label">
            Sprachnotiz angehängt · {voice.duration}s
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <small>Mit KI bauen? Ja. Gedankenlos kopieren? Nö.</small>
          <button
            className="button button-mango"
            type="submit"
            disabled={
              busy || recordingBusy || (!text.trim() && !image && !voice)
            }
          >
            <Send size={17} />
            {busy ? "Wird geteilt …" : "Mit Menschen teilen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
