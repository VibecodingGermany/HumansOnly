"use client";
import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (installed) return null;
  return (
    <div className="install-app">
      <button
        type="button"
        className="text-button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            const result = await prompt.userChoice;
            if (result.outcome === "accepted") setInstalled(true);
            setPrompt(null);
          } else setHelp(!help);
        }}
      >
        <Download size={16} />
        Dein Clubhaus als App
      </button>
      {help && (
        <p>
          <Smartphone size={16} />
          Im Browser-Menü „Zum Home-Bildschirm“ wählen. Auf dem iPhone: Teilen →
          Zum Home-Bildschirm. Dafür die Seite über HTTPS öffnen.
        </p>
      )}
    </div>
  );
}
