import { config } from "@/lib/config";
import type { ClubhouseRepository } from "./contract";
export async function createRepository(): Promise<ClubhouseRepository> {
  if (config.mode === "demo") {
    const { createDemoRepository } = await import("./demo");
    return createDemoRepository();
  }
  const { createSupabaseRepository } = await import("./supabase");
  return createSupabaseRepository();
}
