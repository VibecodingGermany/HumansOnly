import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { loadLinkPreview } from "@/lib/link-preview-server";
import { serverClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Link-Vorschau für Beiträge. Der Server ruft die Seite ab (nie private Netze, max. 5 s,
 * nur der Kopf der Seite), damit Lesende keine Verbindung zu fremden Seiten aufbauen,
 * bevor sie klicken. Im Live-Betrieb nur für angemeldete Mitglieder: kein offener Proxy.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") || "";
  if (!url || url.length > 2048)
    return NextResponse.json({ error: "Ungültige Adresse." }, { status: 400 });
  if (config.mode === "supabase") {
    const client = await serverClient();
    const { data } = await client.auth.getUser();
    if (!data.user)
      return NextResponse.json(
        { error: "Bitte melde dich an." },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
  }
  const preview = await loadLinkPreview(url);
  return NextResponse.json(
    { preview },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
