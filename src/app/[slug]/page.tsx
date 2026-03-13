// src/app/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string }>;
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

type ProfileMode = "club" | "pro";

type PublicSocialLink = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  sort_order: number;
  position: number;
  mode: "club" | "pro" | "both" | null;
};

function normalizeMode(input: string | undefined): ProfileMode {
  const value = String(input || "")
    .trim()
    .toLowerCase();

  if (value === "pro") return "pro";
  return "club";
}

function getModeLabel(mode: ProfileMode): string {
  return mode === "pro" ? "Pro Mode" : "Club Mode";
}

async function incrementAndGetClicksSafe(
  supabase: ReturnType<typeof createPublicClient>,
  slug: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("increment_public_profile_click", {
      p_slug: slug,
    });

    if (error) return 0;

    const n = typeof data === "string" ? Number(data) : Number(data ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function getActiveSocialLinksSafe(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string,
  mode: ProfileMode
): Promise<PublicSocialLink[]> {
  try {
    const { data, error } = await supabase
      .from("social_links")
      .select("id, platform, url, label, sort_order, position, mode")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("mode", [mode, "both"])
      .order("sort_order", { ascending: true })
      .order("position", { ascending: true });

    if (error || !data) return [];
    return data as PublicSocialLink[];
  } catch {
    return [];
  }
}

export default async function PremiumProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const qp = searchParams ? await searchParams : undefined;

  const s = String(slug || "").trim().toLowerCase();
  const mode = normalizeMode(qp?.mode);

  if (!s || RESERVED.has(s)) notFound();

  const supabase = createPublicClient();

  const { data: card } = await supabase
    .from("cards")
    .select("card_id, slug, is_published, label, user_id")
    .eq("slug", s)
    .single();

  if (card?.card_id) {
    if (!card.is_published) notFound();

    const clicks = await incrementAndGetClicksSafe(supabase, card.slug);

    const userId = String((card as any).user_id || "");
    const socialLinks = userId
      ? await getActiveSocialLinksSafe(supabase, userId, mode)
      : [];

    return (
      <main style={{ padding: 24, maxWidth: 920 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
          {card.label ?? "USECLUBBERS"}
        </h1>

        <p style={{ marginTop: 10, opacity: 0.85 }}>Perfil público: {card.slug}</p>

        <div
          style={{
            marginTop: 12,
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            fontWeight: 800,
          }}
        >
          {getModeLabel(mode)}
        </div>

        <div style={{ marginTop: 14 }}>
          <strong>Cliques</strong>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{clicks}</div>
        </div>

        <div style={{ marginTop: 18 }}>
          <strong>Links</strong>

          {socialLinks.length === 0 ? (
            <p style={{ marginTop: 8, opacity: 0.75 }}>
              Nenhum link ativo disponível para este modo.
            </p>
          ) : (
            <ul style={{ marginTop: 10, paddingLeft: 18 }}>
              {socialLinks.map((l) => (
                <li key={l.id} style={{ marginBottom: 8 }}>
                  <a href={`/r/${l.id}`} rel="noopener noreferrer" target="_blank">
                    {l.label?.trim() ? l.label : l.platform}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    );
  }

  const { data: hist } = await supabase
    .from("card_slug_history")
    .select("card_id, slug, is_current")
    .eq("slug", s)
    .single();

  if (!hist?.card_id) notFound();

  const { data: current } = await supabase
    .from("cards")
    .select("slug, is_published")
    .eq("card_id", hist.card_id)
    .single();

  if (!current?.slug || !current.is_published) notFound();

  permanentRedirect(`/${current.slug}`);
}