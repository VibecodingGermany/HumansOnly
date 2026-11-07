import { config } from "@/lib/config";
import { handleAuthCallback } from "@/lib/auth-callback";
import { serverClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  return handleAuthCallback(
    request,
    config.mode === "supabase"
      ? async (code) => {
          const client = await serverClient();
          return client.auth.exchangeCodeForSession(code);
        }
      : undefined,
  );
}
