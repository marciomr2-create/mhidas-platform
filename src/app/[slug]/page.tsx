// src/app/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

type ProfileMode = "club" | "pro";

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

type PublicSocialLink = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  sort_order: number;
  position: number;
  mode: "club" | "pro" | "both" | null;
};

type ProfessionalProfile = {
  id: string;
  user_id: string;
  profession: string | null;
  company_name: string | null;
  industry: string | null;
  city: string | null;
  services: string | null;
  looking_for: string | null;
  business_instagram: string | null;
  website: string | null;
  portfolio: string | null;
  linkedin: string | null;
  whatsapp_business: string | null;
  professional_email: string | null;
  bio_text: string | null;
  ai_summary: string | null;
  pro_photo_url: string | null;
  pro_photo_prompt: string | null;
  pro_photo_style: string | null;
  visible_in_network: boolean;
  accepts_professional_contact: boolean;
  created_at: string;
  updated_at: string;
};

function normalizeMode(input: string | undefined): ProfileMode {
  const value = String(input || "").trim().toLowerCase();
  if (value === "pro") return "pro";
  return "club";
}

async function incrementClicks(
  supabase: ReturnType<typeof createPublicClient>,
  slug: string
): Promise<number> {
  try {
    const { data } = await supabase.rpc("increment_public_profile_click", {
      p_slug: slug,
    });
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

async function getLinks(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string,
  mode: ProfileMode
): Promise<PublicSocialLink[]> {
  const { data } = await supabase
    .from("social_links")
    .select("id, platform, url, label, sort_order, position, mode")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("mode", [mode, "both"])
    .order("sort_order")
    .order("position");

  return (data ?? []) as PublicSocialLink[];
}

async function getProfessionalProfile(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string
): Promise<ProfessionalProfile | null> {
  const { data, error } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfessionalProfile;
}

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 700,
    textDecoration: "none",
    marginRight: 10,
    transition: "all .2s ease",
  };
}

function cardStyle(): CSSProperties {
  return {
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
  };
}

function channelButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  };
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
    .select("card_id, slug, label, user_id, is_published")
    .eq("slug", s)
    .single();

  if (!card?.card_id) {
    const { data: hist } = await supabase
      .from("card_slug_history")
      .select("card_id, slug, is_current")
      .eq("slug", s)
      .maybeSingle();

    if (!hist?.card_id) notFound();

    const { data: current } = await supabase
      .from("cards")
      .select("slug, is_published")
      .eq("card_id", hist.card_id)
      .single();

    if (!current?.slug || !current.is_published) notFound();

    permanentRedirect(`/${current.slug}`);
  }

  if (!card.is_published) notFound();

  const clicks = await incrementClicks(supabase, card.slug);
  const userId = String(card.user_id);

  const links = await getLinks(supabase, userId, mode);
  const professionalProfile =
    mode === "pro" ? await getProfessionalProfile(supabase, userId) : null;

  const showProfessionalBlock =
    mode === "pro" &&
    professionalProfile &&
    professionalProfile.visible_in_network;

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>{card.label}</h1>

      <p style={{ opacity: 0.7, marginTop: 10 }}>Perfil público: {card.slug}</p>

      <div style={{ marginTop: 18 }}>
        <Link
          href={`/${card.slug}?mode=club`}
          style={modeButtonStyle(mode === "club")}
        >
          Club Mode
        </Link>

        <Link
          href={`/${card.slug}?mode=pro`}
          style={modeButtonStyle(mode === "pro")}
        >
          Pro Mode
        </Link>
      </div>

      <div style={{ marginTop: 20 }}>
        <strong>Cliques</strong>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{clicks}</div>
      </div>

      {showProfessionalBlock ? (
        <section style={cardStyle()}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Perfil profissional</h2>

          {professionalProfile.pro_photo_url ? (
            <div style={{ marginBottom: 18 }}>
              <img
                src={professionalProfile.pro_photo_url}
                alt="Foto profissional"
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "block",
                }}
              />
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            {professionalProfile.profession ? (
              <div>
                <strong>Profissão:</strong> {professionalProfile.profession}
              </div>
            ) : null}

            {professionalProfile.company_name ? (
              <div>
                <strong>Empresa ou marca:</strong> {professionalProfile.company_name}
              </div>
            ) : null}

            {professionalProfile.industry ? (
              <div>
                <strong>Área de atuação:</strong> {professionalProfile.industry}
              </div>
            ) : null}

            {professionalProfile.city ? (
              <div>
                <strong>Cidade:</strong> {professionalProfile.city}
              </div>
            ) : null}
          </div>

          {professionalProfile.ai_summary || professionalProfile.bio_text ? (
            <div style={{ marginTop: 18 }}>
              <strong>Apresentação</strong>
              <p style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.6 }}>
                {professionalProfile.ai_summary?.trim()
                  ? professionalProfile.ai_summary
                  : professionalProfile.bio_text}
              </p>
            </div>
          ) : null}

          {professionalProfile.services ? (
            <div style={{ marginTop: 18 }}>
              <strong>O que oferece</strong>
              <p style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.6 }}>
                {professionalProfile.services}
              </p>
            </div>
          ) : null}

          {professionalProfile.looking_for ? (
            <div style={{ marginTop: 18 }}>
              <strong>O que procura</strong>
              <p style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.6 }}>
                {professionalProfile.looking_for}
              </p>
            </div>
          ) : null}

          <div style={{ marginTop: 20 }}>
            <strong>Canais profissionais</strong>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {professionalProfile.business_instagram ? (
                <a
                  href={professionalProfile.business_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={channelButtonStyle()}
                >
                  Instagram do negócio
                </a>
              ) : null}

              {professionalProfile.website ? (
                <a
                  href={professionalProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={channelButtonStyle()}
                >
                  Website
                </a>
              ) : null}

              {professionalProfile.portfolio ? (
                <a
                  href={professionalProfile.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={channelButtonStyle()}
                >
                  Portfólio
                </a>
              ) : null}

              {professionalProfile.linkedin ? (
                <a
                  href={professionalProfile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={channelButtonStyle()}
                >
                  LinkedIn
                </a>
              ) : null}

              {professionalProfile.whatsapp_business ? (
                <a
                  href={professionalProfile.whatsapp_business}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={channelButtonStyle()}
                >
                  WhatsApp profissional
                </a>
              ) : null}

              {professionalProfile.professional_email ? (
                <a
                  href={`mailto:${professionalProfile.professional_email}`}
                  style={channelButtonStyle()}
                >
                  E-mail profissional
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <strong>Links</strong>

        {links.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            Nenhum link ativo disponível para este modo.
          </p>
        ) : (
          <ul>
            {links.map((l) => (
              <li key={l.id}>
                <a href={`/r/${l.id}`} target="_blank" rel="noopener noreferrer">
                  {l.label ?? l.platform}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}