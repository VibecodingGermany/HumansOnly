import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (config.mode === "supabase" && code) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/onboarding", url.origin));
  }
  return NextResponse.redirect(new URL("/invite?auth_error=1", url.origin));
}
