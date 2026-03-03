// src/app/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const RESERVED = new Set([
  "api",
  "login",
  "dashboard",
  "invalid",
  "t",
  "r",
  "u",
  "_next",
  "favicon.ico",
]);

async function incrementAndGetClicksSafe(supabase: ReturnType<typeof createPublicClient>, slug: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("increment_public_profile_click", { p_slug: slug });
    if (error) return 0;

    const n = typeof data === "string" ? Number(data) : Number(data ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export default async function PremiumProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const s = String(slug || "").trim().toLowerCase();

  if (!s || RESERVED.has(s)) notFound();

  const supabase = createPublicClient();

  // 1) Tenta resolver como slug atual (cards.slug)
  const { data: card } = await supabase
    .from("cards")
    .select("card_id, slug, is_published, label")
    .eq("slug", s)
    .single();

  if (card?.card_id) {
    if (!card.is_published) notFound();

    // TESTE 1: incrementa e lê contador sem quebrar SSR
    const clicks = await incrementAndGetClicksSafe(supabase, card.slug);

    // Render mínimo estável (não mexe em arquitetura)
    return (
      <main style={{ padding: 24, maxWidth: 920 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{card.label ?? "MHIDAS"}</h1>
        <p style={{ marginTop: 10, opacity: 0.85 }}>Perfil público: {card.slug}</p>

        <div style={{ marginTop: 14 }}>
          <strong>Cliques</strong>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{clicks}</div>
        </div>
      </main>
    );
  }

  // 2) Se não achou, tenta resolver como slug antigo no histórico
  const { data: hist } = await supabase
    .from("card_slug_history")
    .select("card_id, slug, is_current")
    .eq("slug", s)
    .single();

  if (!hist?.card_id) notFound();

  // Descobre slug atual do card e redireciona permanentemente (308)
  const { data: current } = await supabase
    .from("cards")
    .select("slug, is_published")
    .eq("card_id", hist.card_id)
    .single();

  if (!current?.slug || !current.is_published) notFound();

  permanentRedirect(`/${current.slug}`);
}