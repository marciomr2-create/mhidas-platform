// src/app/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";
import ProfessionalConnectButton from "@/components/network/ProfessionalConnectButton";

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
  visible_in_network: boolean;
  accepts_professional_contact: boolean;
};

type QuickAction = {
  href: string;
  label: string;
};

const COMMON_PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  website: "Website",
  portfolio: "Portfólio",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  beatport: "Beatport",
  email: "E-mail",
  "e-mail": "E-mail",
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
  const { data } = await supabase
    .from("professional_profiles")
    .select(`
      user_id,
      profession,
      company_name,
      industry,
      city,
      services,
      looking_for,
      business_instagram,
      website,
      portfolio,
      linkedin,
      whatsapp_business,
      professional_email,
      bio_text,
      ai_summary,
      pro_photo_url,
      visible_in_network,
      accepts_professional_contact
    `)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ProfessionalProfile | null) ?? null;
}

function pageStyle(): CSSProperties {
  return {
    padding: 24,
    maxWidth: 980,
    margin: "0 auto",
  };
}

function topBarStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  };
}

function heroStyle(): CSSProperties {
  return {
    marginTop: 20,
    padding: 24,
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    display: "grid",
    gap: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  };
}

function heroKickerStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    opacity: 0.95,
  };
}

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: "999px",
    border: active
      ? "1px solid rgba(255,255,255,0.24)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
    marginRight: 10,
    transition: "all 0.2s ease",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "14px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    lineHeight: 1.2,
    boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
  };
}

function secondaryButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "14px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    lineHeight: 1.2,
  };
}

function linkCardStyle(isFirst: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 16,
    border: isFirst
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid rgba(255,255,255,0.12)",
    background: isFirst ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
  };
}

function sectionCardStyle(): CSSProperties {
  return {
    marginTop: 24,
    padding: 20,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    opacity: 0.95,
    fontWeight: 700,
  };
}

function compactBadgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.95,
  };
}

function infoGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: 16,
  };
}

function infoCardStyle(): CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function quickPanelsGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    marginTop: 16,
  };
}

function quickPanelStyle(): CSSProperties {
  return {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function authorityStripStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    marginTop: 16,
  };
}

function authorityCardStyle(): CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    minHeight: 90,
  };
}

function channelButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  };
}

function emptyCalloutStyle(): CSSProperties {
  return {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    lineHeight: 1.6,
    opacity: 0.9,
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function limitText(value: string | null | undefined, max = 120): string {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function titleCaseWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDisplayName(label: string | null, fallback: string): string {
  const rawLabel = normalizeText(label);
  const rawPlatform = normalizeText(fallback);

  const normalizeKey = (value: string) =>
    value.toLowerCase().replace(/\s+/g, "").trim();

  const resolveCommonName = (value: string): string | null => {
    const key = normalizeKey(value);

    if (COMMON_PLATFORM_NAMES[key]) {
      return COMMON_PLATFORM_NAMES[key];
    }

    const strippedDigits = key.replace(/\d+$/, "");
    if (strippedDigits !== key && COMMON_PLATFORM_NAMES[strippedDigits]) {
      return COMMON_PLATFORM_NAMES[strippedDigits];
    }

    return null;
  };

  if (rawLabel) {
    const common = resolveCommonName(rawLabel);
    if (common) return common;

    const hasUppercase = /[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]/.test(rawLabel);
    return hasUppercase ? rawLabel : titleCaseWords(rawLabel);
  }

  const platformCommon = resolveCommonName(rawPlatform);
  if (platformCommon) return platformCommon;

  return rawPlatform;
}

function getLinkHint(
  link: PublicSocialLink,
  index: number,
  mode: ProfileMode
): string {
  const key = normalizeText(link.label || link.platform).toLowerCase();

  if (mode === "club") {
    if (index === 0) return "Canal em destaque";
    if (key.includes("instagram")) return "Ver perfil";
    if (key.includes("youtube")) return "Assistir canal";
    if (
      key.includes("spotify") ||
      key.includes("soundcloud") ||
      key.includes("beatport")
    ) {
      return "Ouvir agora";
    }
    if (key.includes("whatsapp")) return "Falar agora";
    return "Abrir acesso";
  }

  if (index === 0) return "Canal prioritário";
  if (key.includes("linkedin")) return "Ver perfil";
  if (key.includes("portfolio")) return "Ver portfólio";
  if (key.includes("website")) return "Visitar website";
  if (key.includes("instagram")) return "Ver Instagram";
  return "Abrir canal";
}

function formatClicks(count: number): string {
  if (count <= 0) return "Novo perfil";
  if (count === 1) return "1 interação registrada";
  return `${count} interações registradas`;
}

function buildClubHeadline(linksCount: number): string {
  if (linksCount > 1) {
    return "Os principais acessos deste perfil estão aqui";
  }

  if (linksCount === 1) {
    return "O acesso principal deste perfil está pronto para abrir";
  }

  return "Este perfil está preparando novos acessos";
}

function buildProHeadline(
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean,
  quickAction: QuickAction | null
): string {
  const profession = normalizeText(professionalProfile?.profession);
  const company = normalizeText(professionalProfile?.company_name);
  const industry = normalizeText(professionalProfile?.industry);
  const services = normalizeText(professionalProfile?.services);

  if (canConnect && profession && company) {
    return `${profession} na ${company}, pronto para novas conversas profissionais`;
  }

  if (canConnect && profession && industry) {
    return `${profession} com atuação em ${industry}`;
  }

  if (canConnect && profession) {
    return `${profession} disponível para novas conexões`;
  }

  if (canConnect && services) {
    return "Este perfil está aberto para negócios, parcerias e novas conexões";
  }

  if (canConnect) {
    return "Este perfil está aberto para novas conexões profissionais";
  }

  if (quickAction) {
    return "Fale diretamente com este perfil profissional";
  }

  return "Conheça este perfil profissional";
}

function buildClubDescription(profileName: string, linksCount: number): string {
  if (linksCount > 1) {
    return `Entre nos canais em destaque de ${profileName} e escolha o melhor caminho para continuar.`;
  }

  if (linksCount === 1) {
    return `Abra agora o principal acesso público de ${profileName} com uma experiência mais rápida e direta.`;
  }

  return `Este perfil está ativo e em atualização. Em breve, novos acessos estarão disponíveis aqui.`;
}

function buildProDescription(
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean,
  quickAction: QuickAction | null
): string {
  const aiSummary = normalizeText(professionalProfile?.ai_summary);
  const bioText = normalizeText(professionalProfile?.bio_text);
  const services = normalizeText(professionalProfile?.services);
  const lookingFor = normalizeText(professionalProfile?.looking_for);

  if (aiSummary && canConnect) {
    return `${aiSummary} Inicie pela conexão profissional ou avance direto pelo canal mais rápido.`;
  }

  if (bioText && canConnect) {
    return `${bioText} Inicie pela conexão profissional ou avance direto pelo canal mais rápido.`;
  }

  if (services && lookingFor && canConnect) {
    return `${services} Atualmente busca ${lookingFor.toLowerCase()}.`;
  }

  if (services && canConnect) {
    return `${services} Este perfil está pronto para novas conversas profissionais.`;
  }

  if (aiSummary) return aiSummary;
  if (bioText) return bioText;
  if (services) return services;

  if (quickAction) {
    return "Este perfil disponibiliza canais diretos para acelerar o próximo passo.";
  }

  return "Veja a atuação, os canais e as informações profissionais disponíveis neste perfil.";
}

function getProfessionalQuickAction(
  professionalProfile: ProfessionalProfile | null,
  fallbackLink: string | null,
  fallbackLabel: string | null
): QuickAction | null {
  if (!professionalProfile) {
    if (fallbackLink && fallbackLabel) {
      return {
        href: fallbackLink,
        label: `Abrir ${fallbackLabel}`,
      };
    }
    return null;
  }

  if (professionalProfile.whatsapp_business) {
    return {
      href: professionalProfile.whatsapp_business,
      label: "Falar no WhatsApp",
    };
  }

  if (professionalProfile.professional_email) {
    return {
      href: `mailto:${professionalProfile.professional_email}`,
      label: "Enviar e-mail",
    };
  }

  if (professionalProfile.website) {
    return {
      href: professionalProfile.website,
      label: "Abrir website",
    };
  }

  if (professionalProfile.portfolio) {
    return {
      href: professionalProfile.portfolio,
      label: "Ver portfólio",
    };
  }

  if (professionalProfile.linkedin) {
    return {
      href: professionalProfile.linkedin,
      label: "Abrir LinkedIn",
    };
  }

  if (professionalProfile.business_instagram) {
    return {
      href: professionalProfile.business_instagram,
      label: "Abrir Instagram do negócio",
    };
  }

  if (fallbackLink && fallbackLabel) {
    return {
      href: fallbackLink,
      label: `Abrir ${fallbackLabel}`,
    };
  }

  return null;
}

function getHeroHighlights(
  mode: ProfileMode,
  linksCount: number,
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean
): string[] {
  if (mode === "club") {
    const items = ["Perfil público ativo"];
    if (linksCount > 0) {
      items.push(linksCount === 1 ? "1 acesso ativo" : `${linksCount} acessos ativos`);
    }
    return items;
  }

  const items: string[] = [];

  if (canConnect) items.push("Conexão profissional disponível");
  if (professionalProfile?.profession) items.push(professionalProfile.profession);
  if (professionalProfile?.industry) items.push(professionalProfile.industry);
  if (professionalProfile?.city) items.push(professionalProfile.city);

  return items.slice(0, 4);
}

function getAuthorityBlocks(
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean
): Array<{ title: string; value: string }> {
  if (!professionalProfile) return [];

  const blocks: Array<{ title: string; value: string }> = [];

  if (professionalProfile.services) {
    blocks.push({
      title: "Entrega principal",
      value: limitText(professionalProfile.services, 110),
    });
  }

  if (professionalProfile.looking_for) {
    blocks.push({
      title: "Busca atual",
      value: limitText(professionalProfile.looking_for, 110),
    });
  }

  if (canConnect) {
    if (professionalProfile.whatsapp_business) {
      blocks.push({
        title: "Canal mais rápido",
        value: "WhatsApp profissional disponível para contato direto.",
      });
    } else if (professionalProfile.professional_email) {
      blocks.push({
        title: "Canal direto",
        value: "E-mail profissional disponível para continuidade da conversa.",
      });
    }
  }

  if (professionalProfile.company_name) {
    blocks.push({
      title: "Marca ou empresa",
      value: professionalProfile.company_name,
    });
  }

  return blocks.slice(0, 4);
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
    !!professionalProfile &&
    professionalProfile.visible_in_network;

  const visibleProfessionalProfile = showProfessionalBlock ? professionalProfile : null;

  const canConnect =
    !!visibleProfessionalProfile &&
    !!visibleProfessionalProfile.accepts_professional_contact;

  const profileName = normalizeText(card.label) || "Este perfil";
  const firstLink = links.length > 0 ? links[0] : null;
  const firstActionLink = firstLink ? `/r/${firstLink.id}` : null;
  const firstActionLabel = firstLink
    ? getDisplayName(firstLink.label, firstLink.platform)
    : null;

  const professionalQuickAction =
    mode === "pro"
      ? visibleProfessionalProfile
        ? getProfessionalQuickAction(
            visibleProfessionalProfile,
            firstActionLink,
            firstActionLabel
          )
        : firstActionLink && firstActionLabel
        ? {
            href: firstActionLink,
            label: `Abrir ${firstActionLabel}`,
          }
        : null
      : null;

  const heroTitle =
    mode === "club"
      ? buildClubHeadline(links.length)
      : buildProHeadline(visibleProfessionalProfile, canConnect, professionalQuickAction);

  const heroDescription =
    mode === "club"
      ? buildClubDescription(profileName, links.length)
      : buildProDescription(visibleProfessionalProfile, canConnect, professionalQuickAction);

  const showLinksSection = mode === "club" || links.length > 0;
  const aboutHeading =
    mode === "pro" && canConnect
      ? "Por que este perfil vale a conversa"
      : "Sobre este perfil";

  const heroHighlights = getHeroHighlights(
    mode,
    links.length,
    visibleProfessionalProfile,
    canConnect
  );

  const authorityBlocks = getAuthorityBlocks(visibleProfessionalProfile, canConnect);

  const hasProfessionalChannels = !!(
    visibleProfessionalProfile?.website ||
    visibleProfessionalProfile?.portfolio ||
    visibleProfessionalProfile?.linkedin ||
    visibleProfessionalProfile?.business_instagram
  );

  const contactSummary =
    visibleProfessionalProfile?.whatsapp_business ||
    visibleProfessionalProfile?.professional_email
      ? "Escolha o canal que preferir para continuar a conversa."
      : "A conexão profissional é o principal caminho deste perfil no momento.";

  const showQuickSummary = !!(
    visibleProfessionalProfile?.services ||
    visibleProfessionalProfile?.looking_for ||
    visibleProfessionalProfile?.industry
  );

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 12 }}>
        <div style={topBarStyle()}>
          <div style={{ display: "grid", gap: 8 }}>
            <span style={badgeStyle()}>{formatClicks(clicks)}</span>

            <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: 0 }}>
              {profileName}
            </h1>

            <p style={{ opacity: 0.72, margin: 0 }}>
              Perfil público: {card.slug}
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link
              href={`/${card.slug}?mode=club`}
              style={modeButtonStyle(mode === "club")}
            >
              Experiência Club
            </Link>

            <Link
              href={`/${card.slug}?mode=pro`}
              style={modeButtonStyle(mode === "pro")}
            >
              Perfil profissional
            </Link>
          </div>
        </div>
      </header>

      <section style={heroStyle()}>
        <div style={{ display: "grid", gap: 12 }}>
          <span style={heroKickerStyle()}>
            {mode === "club" ? "Modo Club" : "Modo Profissional"}
          </span>

          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>
            {heroTitle}
          </div>

          <p
            style={{
              margin: 0,
              opacity: 0.9,
              maxWidth: 760,
              lineHeight: 1.65,
              fontSize: 16,
            }}
          >
            {heroDescription}
          </p>

          {heroHighlights.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {heroHighlights.map((item) => (
                <span key={item} style={compactBadgeStyle()}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {mode === "pro" && canConnect ? (
            <ProfessionalConnectButton
              targetUserId={String(visibleProfessionalProfile!.user_id)}
            />
          ) : null}

          {mode === "pro" && professionalQuickAction ? (
            <a
              href={professionalQuickAction.href}
              target={
                professionalQuickAction.href.startsWith("mailto:")
                  ? undefined
                  : "_blank"
              }
              rel={
                professionalQuickAction.href.startsWith("mailto:")
                  ? undefined
                  : "noopener noreferrer"
              }
              style={canConnect ? secondaryButtonStyle() : primaryButtonStyle()}
            >
              {professionalQuickAction.label}
            </a>
          ) : null}

          {mode === "club" && firstActionLink ? (
            <a
              href={firstActionLink}
              target="_blank"
              rel="noopener noreferrer"
              style={primaryButtonStyle()}
            >
              {firstActionLabel
                ? `Abrir ${firstActionLabel}`
                : "Abrir acesso em destaque"}
            </a>
          ) : null}
        </div>

        <div style={infoGridStyle()}>
          <div style={infoCardStyle()}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              Melhor caminho agora
            </strong>
            <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
              {mode === "pro" && canConnect
                ? "Comece pela conexão profissional e avance para o canal direto quando quiser acelerar a conversa."
                : mode === "pro" && professionalQuickAction
                ? "Este perfil prioriza contato rápido para levar você ao próximo passo com mais agilidade."
                : links.length > 0
                ? "O objetivo deste perfil é levar você direto ao acesso mais relevante."
                : "Este perfil está ativo e pronto para receber novos acessos em breve."}
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              Disponível agora
            </strong>
            <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
              {mode === "pro" && canConnect
                ? "Conexão profissional e canal direto disponíveis."
                : links.length === 0
                ? "Nenhum link ativo neste momento."
                : links.length === 1
                ? "1 acesso ativo disponível."
                : `${links.length} acessos ativos disponíveis.`}
            </div>
          </div>

          {mode === "pro" && visibleProfessionalProfile?.city ? (
            <div style={infoCardStyle()}>
              <strong style={{ display: "block", marginBottom: 6 }}>
                Localização
              </strong>
              <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
                {visibleProfessionalProfile.city}
              </div>
            </div>
          ) : null}
        </div>

        {mode === "pro" && authorityBlocks.length > 0 ? (
          <div style={authorityStripStyle()}>
            {authorityBlocks.map((block) => (
              <div key={`${block.title}-${block.value}`} style={authorityCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  {block.title}
                </strong>
                <div style={{ opacity: 0.88, lineHeight: 1.55 }}>{block.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {showProfessionalBlock ? (
        <section style={sectionCardStyle()}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>{aboutHeading}</h2>

          {visibleProfessionalProfile &&
          (visibleProfessionalProfile.accepts_professional_contact ||
            hasProfessionalChannels) ? (
            <div style={quickPanelsGridStyle()}>
              {visibleProfessionalProfile.accepts_professional_contact ? (
                <div style={quickPanelStyle()}>
                  <strong style={{ display: "block", marginBottom: 8 }}>
                    Contato rápido
                  </strong>
                  <p
                    style={{ margin: "0 0 12px 0", opacity: 0.84, lineHeight: 1.55 }}
                  >
                    {contactSummary}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    {visibleProfessionalProfile.whatsapp_business ? (
                      <a
                        href={visibleProfessionalProfile.whatsapp_business}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={channelButtonStyle()}
                      >
                        WhatsApp profissional
                      </a>
                    ) : null}

                    {visibleProfessionalProfile.professional_email ? (
                      <a
                        href={`mailto:${visibleProfessionalProfile.professional_email}`}
                        style={channelButtonStyle()}
                      >
                        E-mail profissional
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {hasProfessionalChannels ? (
                <div style={quickPanelStyle()}>
                  <strong style={{ display: "block", marginBottom: 8 }}>
                    Canais profissionais
                  </strong>
                  <p
                    style={{ margin: "0 0 12px 0", opacity: 0.84, lineHeight: 1.55 }}
                  >
                    Veja os principais canais disponíveis para continuar conhecendo
                    este perfil.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    {visibleProfessionalProfile.website ? (
                      <a
                        href={visibleProfessionalProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={channelButtonStyle()}
                      >
                        Website
                      </a>
                    ) : null}

                    {visibleProfessionalProfile.portfolio ? (
                      <a
                        href={visibleProfessionalProfile.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={channelButtonStyle()}
                      >
                        Portfólio
                      </a>
                    ) : null}

                    {visibleProfessionalProfile.linkedin ? (
                      <a
                        href={visibleProfessionalProfile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={channelButtonStyle()}
                      >
                        LinkedIn
                      </a>
                    ) : null}

                    {visibleProfessionalProfile.business_instagram ? (
                      <a
                        href={visibleProfessionalProfile.business_instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={channelButtonStyle()}
                      >
                        Instagram do negócio
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              marginTop:
                visibleProfessionalProfile &&
                (visibleProfessionalProfile.accepts_professional_contact ||
                  hasProfessionalChannels)
                  ? 20
                  : 16,
              display: "grid",
              gridTemplateColumns: visibleProfessionalProfile?.pro_photo_url
                ? "120px 1fr"
                : "1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            {visibleProfessionalProfile?.pro_photo_url ? (
              <div>
                <img
                  src={visibleProfessionalProfile.pro_photo_url}
                  alt="Foto profissional"
                  style={{
                    width: 110,
                    height: 110,
                    objectFit: "cover",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "block",
                  }}
                />
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 12 }}>
              {visibleProfessionalProfile &&
              (visibleProfessionalProfile.ai_summary ||
                visibleProfessionalProfile.bio_text) ? (
                <div>
                  <strong>Apresentação</strong>
                  <p style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.65 }}>
                    {normalizeText(visibleProfessionalProfile.ai_summary)
                      ? visibleProfessionalProfile.ai_summary
                      : visibleProfessionalProfile.bio_text}
                  </p>
                </div>
              ) : null}

              <div style={infoGridStyle()}>
                {visibleProfessionalProfile?.profession ? (
                  <div style={infoCardStyle()}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      Atuação
                    </strong>
                    <div>{visibleProfessionalProfile.profession}</div>
                  </div>
                ) : null}

                {visibleProfessionalProfile?.company_name ? (
                  <div style={infoCardStyle()}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      Empresa ou marca
                    </strong>
                    <div>{visibleProfessionalProfile.company_name}</div>
                  </div>
                ) : null}

                {visibleProfessionalProfile?.industry ? (
                  <div style={infoCardStyle()}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      Área de atuação
                    </strong>
                    <div>{visibleProfessionalProfile.industry}</div>
                  </div>
                ) : null}

                {visibleProfessionalProfile?.city ? (
                  <div style={infoCardStyle()}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      Cidade
                    </strong>
                    <div>{visibleProfessionalProfile.city}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {visibleProfessionalProfile?.services ? (
            <div style={{ marginTop: 18 }}>
              <strong>O que oferece</strong>
              <p style={{ marginTop: 8, lineHeight: 1.65 }}>
                {visibleProfessionalProfile.services}
              </p>
            </div>
          ) : null}

          {visibleProfessionalProfile?.looking_for ? (
            <div style={{ marginTop: 18 }}>
              <strong>O que busca</strong>
              <p style={{ marginTop: 8, lineHeight: 1.65 }}>
                {visibleProfessionalProfile.looking_for}
              </p>
            </div>
          ) : null}

          {!links.length && mode === "pro" ? (
            <div style={emptyCalloutStyle()}>
              Este perfil está priorizando conexão e contato direto. Quando houver
              canais adicionais ativos, eles aparecerão aqui com destaque.
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "pro" && showProfessionalBlock && visibleProfessionalProfile && showQuickSummary ? (
        <section style={sectionCardStyle()}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Resumo rápido</h2>

          <div style={infoGridStyle()}>
            {visibleProfessionalProfile.services ? (
              <div style={infoCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Entrega principal
                </strong>
                <div style={{ lineHeight: 1.55 }}>
                  {limitText(visibleProfessionalProfile.services, 120)}
                </div>
              </div>
            ) : null}

            {visibleProfessionalProfile.looking_for ? (
              <div style={infoCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Busca atual
                </strong>
                <div style={{ lineHeight: 1.55 }}>
                  {limitText(visibleProfessionalProfile.looking_for, 120)}
                </div>
              </div>
            ) : null}

            {visibleProfessionalProfile.industry ? (
              <div style={infoCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Segmento
                </strong>
                <div style={{ lineHeight: 1.55 }}>
                  {visibleProfessionalProfile.industry}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {showLinksSection ? (
        <section style={sectionCardStyle()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 6 }}>
                {mode === "club" ? "Acessos disponíveis" : "Canais adicionais"}
              </h2>
              <p style={{ margin: 0, opacity: 0.78 }}>
                {links.length > 0
                  ? "Escolha abaixo o melhor caminho para continuar."
                  : "Ainda não há links ativos disponíveis neste perfil."}
              </p>
            </div>

            {links.length > 0 ? (
              <span style={badgeStyle()}>
                {links.length === 1 ? "1 link ativo" : `${links.length} links ativos`}
              </span>
            ) : null}
          </div>

          {links.length === 0 ? (
            <p style={{ marginBottom: 0 }}>
              Nenhum link ativo disponível para este perfil neste momento.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {links.map((l, index) => {
                const label = getDisplayName(l.label, l.platform);
                const hint = getLinkHint(l, index, mode);
                const isFirst = index === 0;

                return (
                  <a
                    key={l.id}
                    href={`/r/${l.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkCardStyle(isFirst)}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 16 }}>{label}</span>
                      <span style={{ fontSize: 12, opacity: 0.72 }}>{hint}</span>
                    </div>

                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        opacity: 0.9,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Abrir
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}