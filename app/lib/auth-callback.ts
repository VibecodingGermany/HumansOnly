import { NextResponse } from "next/server";

type ExchangeCode = (code: string) => Promise<{ error: unknown }>;

/** Nur feste, lokale Ziele — nie eine frei übergebene Adresse (Open Redirect). */
const NEXT_TARGETS = ["/einstellungen"];

export async function handleAuthCallback(
  request: Request,
  exchangeCode?: ExchangeCode,
) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const next = params.get("next");
  let location = "/invite?auth_error=1";
  if (code && exchangeCode) {
    const { error } = await exchangeCode(code);
    if (!error)
      location = next && NEXT_TARGETS.includes(next) ? next : "/onboarding";
  }
  // Keep redirects on the browser's origin, even behind an internal proxy host.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}
