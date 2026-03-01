// src/utils/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

type CookiePair = { name: string; value: string };

function parseCookieHeader(cookieHeader: string): CookiePair[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return { name: part, value: "" };
      return {
        name: part.slice(0, eq).trim(),
        value: part.slice(eq + 1).trim(),
      };
    });
}

export async function createClient() {
  // No seu runtime, cookies()/headers() podem ser async.
  const cookieStore: any = await cookies();
  const headerStore: any = await headers();

  const getCookieHeader = () => {
    if (headerStore && typeof headerStore.get === "function") {
      return headerStore.get("cookie") || "";
    }
    // fallback ultra defensivo
    const raw = headerStore?.cookie || headerStore?.Cookie || "";
    return typeof raw === "string" ? raw : "";
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Se existir getAll, ótimo.
          if (cookieStore && typeof cookieStore.getAll === "function") {
            return cookieStore.getAll();
          }

          // Senão, parse do header Cookie.
          const cookieHeader = getCookieHeader();
          return parseCookieHeader(cookieHeader);
        },

        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          // Em Server Components, set pode falhar. Mantemos resiliente.
          if (!cookieStore || typeof cookieStore.set !== "function") return;

          try {
            for (const c of cookiesToSet) {
              cookieStore.set(c.name, c.value, c.options);
            }
          } catch {
            // não quebra render
          }
        },
      },
    }
  );
}