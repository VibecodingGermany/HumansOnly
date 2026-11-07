import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import type { Database } from "./database";
export async function serverClient() {
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value, options }) =>
          store.set(name, value, options),
        );
      },
    },
  });
}
