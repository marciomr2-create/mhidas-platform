// src/utils/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: any;
};

function parseCookieHeader(cookieHeader: string): Array<{ name: string; value: string }> {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return { name: part, value: "" };
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      return { name, value };
    });
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const anyStore = cookieStore as any;

          if (typeof anyStore.getAll === "function") {
            return anyStore.getAll();
          }

          const h = headers() as any;
          const cookieHeader =
            typeof h.get === "function" ? h.get("cookie") || "" : "";

          return parseCookieHeader(cookieHeader).map(({ name, value }) => ({
            name,
            value,
          }));
        },

        setAll(cookiesToSet: CookieToSet[]) {
          const anyStore = cookieStore as any;

          if (typeof anyStore.set !== "function") return;

          try {
            for (const { name, value, options } of cookiesToSet) {
              anyStore.set(name, value, options);
            }
          } catch {
          }
        },
      },
    }
  );
}
