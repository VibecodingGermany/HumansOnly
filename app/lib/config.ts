export type DataMode = "demo" | "supabase";
export function readConfig(env: { mode?: string; url?: string; key?: string }) {
  const mode = env.mode || "demo";
  if (mode !== "demo" && mode !== "supabase")
    throw new Error("NEXT_PUBLIC_DATA_MODE muss demo oder supabase sein.");
  if (mode === "supabase" && (!env.url || !env.key))
    throw new Error("Supabase-Modus benötigt URL und Publishable Key.");
  return { mode: mode as DataMode, url: env.url || "", key: env.key || "" };
}
export const config = readConfig({
  mode: process.env.NEXT_PUBLIC_DATA_MODE,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
