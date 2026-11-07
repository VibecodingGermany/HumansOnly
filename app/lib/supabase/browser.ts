import { createBrowserClient } from "@supabase/ssr";
import { config } from "@/lib/config";
import type { Database } from "./database";
export function browserClient() {
  if (config.mode !== "supabase")
    throw new Error("Supabase ist in dieser Demo nicht aktiv.");
  return createBrowserClient<Database>(config.url, config.key);
}
