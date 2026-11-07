"use client";
import { useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
const bars = [
  22, 35, 19, 48, 32, 58, 26, 44, 62, 38, 28, 50, 34, 66, 44, 26, 54, 38, 60,
  30, 46, 22, 56, 36, 48, 28, 64, 38, 20, 44, 56, 30,
];
export function AudioPlayer({
  src,
  duration = 15,
  label,
  compact = false,
}: {
  src: string;
  duration?: number;
  label: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(duration);
  const [error, setError] = useState("");
  async function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    try {
      setError("");
      await audio.play();
    } catch {
      setError("Audio konnte nicht gestartet werden. Bitte erneut versuchen.");
    }
  }
  return (
    <div className={compact ? "voice-compact" : "voice-player"}>
      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={() => {
          setPlaying(true);
          document.querySelectorAll("audio").forEach((a) => {
            if (a !== ref.current) a.pause();
          });
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setTime(ref.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          const d = ref.current?.duration;
          if (d && Number.isFinite(d)) setLength(d);
        }}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onError={() => setError("Diese Aufnahme ist gerade nicht verfügbar.")}
      />
      <button
        type="button"
        className="audio-play"
        onClick={() => void toggle()}
        aria-label={`${playing ? "Pausieren" : "Anhören"}: ${label}`}
        aria-pressed={playing}
      >
        {playing ? (
          <Pause size={compact ? 13 : 19} fill="currentColor" />
        ) : (
          <Play size={compact ? 13 : 19} fill="currentColor" />
        )}
      </button>
      {!compact && (
        <>
          <div className="audio-body">
            <span className="audio-label">
              <Volume2 size={13} />
              {label}
            </span>
            <div className="waveform" aria-hidden="true">
              {bars.map((h, i) => (
                <i
                  key={i}
                  style={{
                    height: `${h}%`,
                    opacity: i / bars.length <= time / length ? 1 : 0.35,
                  }}
                />
              ))}
            </div>
            <input
              aria-label={`Position: ${label}`}
              type="range"
              min="0"
              max={length}
              step="0.1"
              value={Math.min(time, length)}
              onChange={(e) => {
                if (ref.current) {
                  ref.current.currentTime = Number(e.target.value);
                  setTime(Number(e.target.value));
                }
              }}
            />
          </div>
          <span className="audio-time">
            {Math.floor(playing ? time : length)}s
          </span>
        </>
      )}
      {error && (
        <span className="audio-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
