import { NextResponse } from "next/server";

type ExchangeCode = (code: string) => Promise<{ error: unknown }>;

export async function handleAuthCallback(
  request: Request,
  exchangeCode?: ExchangeCode,
) {
  const code = new URL(request.url).searchParams.get("code");
  let location = "/invite?auth_error=1";
  if (code && exchangeCode) {
    const { error } = await exchangeCode(code);
    if (!error) location = "/onboarding";
  }
  // Keep redirects on the browser's origin, even behind an internal proxy host.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}
