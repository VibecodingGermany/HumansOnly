import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ClubProvider } from "@/components/provider";
import { Shell } from "@/components/shell";
import "./globals.css";
const display = localFont({
  src: "./fonts/Anton-Regular.woff2",
  variable: "--font-display",
  display: "swap",
});
const head = localFont({
  src: [
    { path: "./fonts/BarlowCondensed-Bold.woff2", weight: "700" },
    { path: "./fonts/BarlowCondensed-ExtraBold.woff2", weight: "800" },
    { path: "./fonts/BarlowCondensed-Medium.woff2", weight: "500" },
  ],
  variable: "--font-head",
  display: "swap",
});
const sans = localFont({
  src: "./fonts/HankenGrotesk-Variable.woff2",
  variable: "--font-sans",
  display: "swap",
});
const hand = localFont({
  src: "./fonts/Kalam-Regular.woff2",
  variable: "--font-hand",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Humans Only — Dein Clubhaus",
    template: "%s · Humans Only",
  },
  description:
    "Ein warmes Clubhaus für echte Menschen. Goldene Tickets, eigene Gedanken und deine Stimme. Willkommen bei Humans Only 2.0.",
  applicationName: "Humans Only",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Humans Only",
  },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7ef",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${display.variable} ${head.variable} ${sans.variable} ${hand.variable}`}
    >
      <body>
        <ClubProvider>
          <Shell>{children}</Shell>
        </ClubProvider>
      </body>
    </html>
  );
}
