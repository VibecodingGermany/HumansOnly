"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw } from "lucide-react";
import { AudioPlayer } from "./audio-player";
export type Recording = { blob: Blob; duration: number; url: string };
export function VoiceRecorder({
  maxSeconds = 15,
  onChange,
  onRecordingChange,
}: {
  maxSeconds?: number;
  onChange: (recording: Recording | null) => void;
  onRecordingChange?: (active: boolean) => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "requesting" | "recording" | "ready"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef(0);
  const preview = useRef("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  const context = useRef<AudioContext | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    onRecordingChange?.(status === "recording" || status === "requesting");
  }, [status, onRecordingChange]);
  function cleanup() {
    if (timer.current) clearInterval(timer.current);
    if (timeout.current) clearTimeout(timeout.current);
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      cleanup();
      if (preview.current) URL.revokeObjectURL(preview.current);
    };
  }, []);
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function start() {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Für das Mikrofon brauchst du HTTPS oder localhost. Öffne die Handy-Vorschau über HTTPS.",
      );
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError(
        "Dieser Browser unterstützt keine Aufnahme. Bitte verwende einen aktuellen Safari, Chrome oder Firefox.",
      );
      return;
    }
    setStatus("requesting");
    try {
      const input = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!mounted.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const capture = new MediaRecorder(
        input,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = capture;
      const chunks: Blob[] = [];
      capture.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        cleanup();
        if (mounted.current) {
          setStatus("idle");
          setError(
            "Die Aufnahme wurde unterbrochen. Bitte versuche es erneut.",
          );
        }
      };
      capture.onstop = () => {
        const duration = Math.min(
          maxSeconds,
          (performance.now() - startTime.current) / 1000,
        );
        cleanup();
        if (!mounted.current) return;
        if (duration < 1 || chunks.length === 0) {
          setStatus("idle");
          setError("Sprich bitte mindestens eine Sekunde.");
          return;
        }
        const blob = new Blob(chunks, {
          type: capture.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        preview.current = url;
        const result = { blob, duration: Math.round(duration * 10) / 10, url };
        setRecording(result);
        setStatus("ready");
        onChange(result);
      };
      const ac = new AudioContext();
      context.current = ac;
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      ac.createMediaStreamSource(input).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        const cv = canvas.current;
        const ctx = cv?.getContext("2d");
        if (cv && ctx) {
          analyser.getByteFrequencyData(values);
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.fillStyle = "#0a0a0a";
          for (let i = 0; i < 40; i++) {
            const h = Math.max(3, (values[i * 2] / 255) * cv.height);
            ctx.fillRect(
              (i * cv.width) / 40,
              (cv.height - h) / 2,
              cv.width / 60,
              h,
            );
          }
        }
        frame.current = requestAnimationFrame(draw);
      };
      startTime.current = performance.now();
      capture.start(100);
      setStatus("recording");
      setSeconds(0);
      draw();
      timer.current = setInterval(
        () =>
          setSeconds(
            Math.min(
              maxSeconds,
              (performance.now() - startTime.current) / 1000,
            ),
          ),
        100,
      );
      timeout.current = setTimeout(stop, maxSeconds * 1000);
    } catch (err) {
      cleanup();
      setStatus("idle");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Das Mikrofon ist gesperrt. Erlaube den Zugriff in deinen Browser-Einstellungen."
          : "Das Mikrofon konnte nicht geöffnet werden. Bitte prüfe, ob es verfügbar ist.",
      );
    }
  }
  function reset() {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = "";
    setRecording(null);
    setSeconds(0);
    setStatus("idle");
    onChange(null);
  }
  return (
    <div className="recorder">
      <div className="recorder-heading">
        <span>
          <Mic size={17} />
          Deine Stimme. Dein Hallo.
        </span>
        <b>
          {Math.ceil(seconds).toString().padStart(2, "0")} / {maxSeconds}s
        </b>
      </div>
      {status === "ready" && recording ? (
        <AudioPlayer
          src={recording.url}
          duration={recording.duration}
          label="Deine Aufnahme"
        />
      ) : (
        <>
          <canvas
            ref={canvas}
            width="600"
            height="70"
            aria-label="Lautstärke deiner Aufnahme"
          />
          <p>
            {status === "recording"
              ? "Wir hören zu. Erzähl uns von dir."
              : `„Hey, ich bin … und gerade baue ich …“`}
          </p>
        </>
      )}
      <div className="recorder-actions">
        {status === "ready" ? (
          <button type="button" className="text-button" onClick={reset}>
            <RotateCcw size={16} />
            Noch einmal aufnehmen
          </button>
        ) : (
          <button
            type="button"
            className="button button-ink"
            disabled={status === "requesting"}
            onClick={() => (status === "recording" ? stop() : void start())}
          >
            {status === "recording" ? (
              <Square size={16} fill="currentColor" />
            ) : (
              <Mic size={17} />
            )}
            {status === "recording"
              ? "Aufnahme beenden"
              : status === "requesting"
                ? "Mikrofon wird geöffnet …"
                : "Aufnahme starten"}
          </button>
        )}
        <small>Max. {maxSeconds} Sekunden</small>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
