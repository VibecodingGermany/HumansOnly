import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Humans Only — Dein Clubhaus",
    short_name: "Humans Only",
    description: "Deine Leute. Deine Stimme. Dein Clubhaus.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf7ef",
    theme_color: "#faf7ef",
    lang: "de",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
