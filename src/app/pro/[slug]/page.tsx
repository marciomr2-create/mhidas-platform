// src/app/pro/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";
import ProfessionalConnectButton from "@/components/network/ProfessionalConnectButton";
import ProfessionalFollowButton from "@/components/network/ProfessionalFollowButton";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    from?: string;
    returnTo?: string;
  }>;
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
  search_keywords: string[] | null;
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

type ChannelLink = {
  label: string;
  href: string;
  description: string;
  isInternal?: boolean;
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
  mixcloud: "Mixcloud",
  email: "E-mail",
  "e-mail": "E-mail",
};

const PRO_BORDER = "rgba(148,163,184,0.22)";
const PRO_BORDER_STRONG = "rgba(59,130,246,0.38)";
const PRO_TEXT = "#F8FAFC";
const PRO_TEXT_SECONDARY = "#CBD5E1";
const PRO_TEXT_MUTED = "#94A3B8";

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

async function getProLinks(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string
): Promise<PublicSocialLink[]> {
  const { data } = await supabase
    .from("social_links")
    .select("id, platform, url, label, sort_order, position, mode")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("mode", ["pro", "both"])
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
      search_keywords,
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
    minHeight: "100svh",
    color: PRO_TEXT,
    background:
      "radial-gradient(circle at 18% 0%, rgba(37,99,235,0.22), transparent 34%), radial-gradient(circle at 82% 12%, rgba(20,184,166,0.12), transparent 30%), linear-gradient(180deg, #020617 0%, #050B18 48%, #020617 100%)",
  };
}

function shellStyle(): CSSProperties {
  return {
    width: "100%",
    maxWidth: 960,
    margin: "0 auto",
    padding: "18px 14px 34px",
  };
}

function topBarStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    marginBottom: 14,
  };
}

function topStatsStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  };
}

function modeActionsStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  };
}

function topNavigationButtonBaseStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 14,
    color: PRO_TEXT,
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
    textDecoration: "none",
    textAlign: "center",
    WebkitTapHighlightColor: "transparent",
  };
}

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    ...topNavigationButtonBaseStyle(),
    border: active
      ? "1px solid rgba(96,165,250,0.56)"
      : `1px solid ${PRO_BORDER}`,
    background: active
      ? "linear-gradient(135deg, rgba(37,99,235,0.94), rgba(79,70,229,0.70))"
      : "rgba(15,23,42,0.78)",
    boxShadow: active
      ? "0 0 0 1px rgba(59,130,246,0.12) inset, 0 14px 28px rgba(37,99,235,0.16)"
      : "0 0 0 1px rgba(255,255,255,0.03) inset",
  };
}

function networkReturnButtonStyle(): CSSProperties {
  return {
    ...topNavigationButtonBaseStyle(),
    gridColumn: "1 / -1",
    border: "1px solid rgba(45,212,191,0.36)",
    background: "linear-gradient(135deg, rgba(13,148,136,0.22), rgba(15,23,42,0.78))",
    color: "#A7F3D0",
  };
}

function heroStyle(): CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gap: 18,
    padding: 18,
    borderRadius: 28,
    border: `1px solid ${PRO_BORDER_STRONG}`,
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(21,33,66,0.96) 48%, rgba(30,64,175,0.64) 100%)",
    boxShadow: "0 22px 80px rgba(2,6,23,0.46)",
  };
}

function heroProfileStyle(): CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: 16,
  };
}

function avatarStyle(): CSSProperties {
  return {
    width: 104,
    height: 104,
    borderRadius: 28,
    border: "1px solid rgba(147,197,253,0.42)",
    background: "linear-gradient(135deg, rgba(37,99,235,0.72), rgba(15,23,42,0.86))",
    color: PRO_TEXT,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 950,
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(2,6,23,0.30)",
  };
}

function heroKickerStyle(): CSSProperties {
  return {
    display: "inline-block",
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#93C5FD",
  };
}

function heroTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontSize: "clamp(30px, 10vw, 48px)",
    lineHeight: 0.96,
    letterSpacing: "-0.06em",
    fontWeight: 950,
  };
}

function heroHeadlineStyle(): CSSProperties {
  return {
    margin: "10px 0 0",
    color: "#DBEAFE",
    fontSize: 16,
    fontWeight: 950,
    lineHeight: 1.35,
  };
}

function heroDescriptionStyle(): CSSProperties {
  return {
    margin: "12px 0 0",
    maxWidth: 680,
    color: PRO_TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.65,
  };
}

function heroHighlightsStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  };
}

function heroHighlightPillStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(147,197,253,0.26)",
    background: "rgba(15,23,42,0.46)",
    color: "#DBEAFE",
    fontSize: 12,
    fontWeight: 900,
  };
}

function heroActionsStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 9,
    marginTop: 4,
  };
}

function professionalActionBaseStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "13px 15px",
    borderRadius: 16,
    color: PRO_TEXT,
    textDecoration: "none",
    textAlign: "center",
    fontWeight: 950,
    fontSize: 14,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
    WebkitTapHighlightColor: "transparent",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...professionalActionBaseStyle(),
    border: "1px solid rgba(96,165,250,0.52)",
    background: "linear-gradient(135deg, rgba(37,99,235,0.96), rgba(79,70,229,0.74))",
    color: "#F8FAFC",
    boxShadow: "0 0 0 1px rgba(59,130,246,0.12) inset, 0 16px 30px rgba(37,99,235,0.20)",
  };
}

function whatsappButtonStyle(): CSSProperties {
  return {
    ...professionalActionBaseStyle(),
    border: "1px solid rgba(45,212,191,0.42)",
    background: "linear-gradient(135deg, rgba(13,148,136,0.92), rgba(20,184,166,0.62))",
    color: "#ECFEFF",
    boxShadow: "0 0 0 1px rgba(45,212,191,0.10) inset, 0 16px 30px rgba(20,184,166,0.16)",
  };
}

function secondaryButtonStyle(): CSSProperties {
  return {
    ...professionalActionBaseStyle(),
    border: `1px solid ${PRO_BORDER}`,
    background: "rgba(15,23,42,0.74)",
    color: PRO_TEXT,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
  };
}

function sectionCardStyle(): CSSProperties {
  return {
    marginTop: 16,
    padding: 18,
    borderRadius: 26,
    border: `1px solid ${PRO_BORDER}`,
    background: "linear-gradient(145deg, rgba(15,23,42,0.90), rgba(17,24,39,0.76))",
    boxShadow: "0 18px 44px rgba(2,6,23,0.26)",
  };
}

function sectionKickerStyle(): CSSProperties {
  return {
    display: "inline-block",
    marginBottom: 8,
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontSize: "clamp(24px, 7vw, 34px)",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    fontWeight: 950,
  };
}

function sectionSubtitleStyle(): CSSProperties {
  return {
    margin: "10px 0 0",
    color: PRO_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.65,
  };
}

function factGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 10,
    marginTop: 16,
  };
}

function factCardStyle(): CSSProperties {
  return {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.42)",
  };
}

function factLabelStyle(): CSSProperties {
  return {
    display: "block",
    marginBottom: 7,
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: 950,
  };
}

function factValueStyle(): CSSProperties {
  return {
    margin: 0,
    color: PRO_TEXT,
    fontSize: 15,
    fontWeight: 750,
    lineHeight: 1.5,
  };
}

function narrativeGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    marginTop: 16,
  };
}

function narrativeBlockStyle(): CSSProperties {
  return {
    padding: 15,
    borderRadius: 20,
    border: "1px solid rgba(96,165,250,0.22)",
    background: "linear-gradient(135deg, rgba(30,64,175,0.13), rgba(15,23,42,0.62))",
  };
}

function narrativeTitleStyle(): CSSProperties {
  return {
    display: "block",
    marginBottom: 7,
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function narrativeTextStyle(): CSSProperties {
  return {
    margin: 0,
    color: PRO_TEXT,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.7,
  };
}

function keywordWrapStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  };
}

function keywordPillStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "8px 11px",
    borderRadius: 999,
    border: "1px solid rgba(96,165,250,0.28)",
    background: "rgba(37,99,235,0.15)",
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: 900,
  };
}

function channelGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 10,
    marginTop: 16,
  };
}

function channelCardStyle(isFirst: boolean): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    padding: 15,
    borderRadius: 18,
    border: isFirst
      ? "1px solid rgba(45,212,191,0.36)"
      : `1px solid ${PRO_BORDER}`,
    background: isFirst
      ? "linear-gradient(135deg, rgba(13,148,136,0.18), rgba(15,23,42,0.78))"
      : "rgba(15,23,42,0.70)",
    color: PRO_TEXT,
    textDecoration: "none",
  };
}

function channelTitleRowStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
}

function channelTitleStyle(): CSSProperties {
  return {
    margin: 0,
    color: PRO_TEXT,
    fontSize: 15,
    fontWeight: 950,
    lineHeight: 1.25,
  };
}

function channelDescriptionStyle(): CSSProperties {
  return {
    margin: 0,
    color: PRO_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.45,
  };
}

function channelActionStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 62,
    minHeight: 32,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.20)",
    color: "#DBEAFE",
    fontSize: 12,
    fontWeight: 950,
  };
}

function softNoteStyle(): CSSProperties {
  return {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(45,212,191,0.20)",
    background: "rgba(13,148,136,0.10)",
    color: "#CCFBF1",
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.55,
  };
}

function emptyTextStyle(): CSSProperties {
  return {
    margin: "12px 0 0",
    color: PRO_TEXT_MUTED,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.55,
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeKeywordList(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<string, string>();

  for (const item of value) {
    const keyword = normalizeText(item);
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, keyword);
    }
  }

  return Array.from(unique.values()).slice(0, 10);
}

function limitText(value: string | null | undefined, max = 120): string {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;

  return `${text.slice(0, max).trim()}...`;
}

function getSafeNetworkReturnPath(value: string | undefined): string | null {
  const candidate = normalizeText(value);
  if (!candidate) return null;
  if (!candidate.startsWith("/network")) return null;
  if (candidate.startsWith("//")) return null;
  if (candidate.includes("://")) return null;

  return candidate;
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

    if (COMMON_PLATFORM_NAMES[key]) return COMMON_PLATFORM_NAMES[key];

    const strippedDigits = key.replace(/\d+$/, "");
    if (strippedDigits !== key && COMMON_PLATFORM_NAMES[strippedDigits]) {
      return COMMON_PLATFORM_NAMES[strippedDigits];
    }

    return null;
  };

  if (rawLabel) {
    const common = resolveCommonName(rawLabel);
    if (common) return common;

    const hasUppercase = rawLabel !== rawLabel.toLowerCase();
    return hasUppercase ? rawLabel : titleCaseWords(rawLabel);
  }

  const platformCommon = resolveCommonName(rawPlatform);
  if (platformCommon) return platformCommon;

  return rawPlatform;
}

function formatClicks(count: number): string {
  if (count <= 0) return "Novo perfil";
  if (count === 1) return "1 interação registrada";

  return `${count} interações registradas`;
}

function getInitials(value: string | null | undefined): string {
  const text = normalizeText(value);
  if (!text) return "PRO";

  const parts = text.split(" ").filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || "PRO";
}

function buildProHeadline(
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean,
  quickAction: QuickAction | null
): string {
  const profession = normalizeText(professionalProfile?.profession);
  const industry = normalizeText(professionalProfile?.industry);
  const company = normalizeText(professionalProfile?.company_name);

  if (profession && industry) return `${profession} • ${industry}`;
  if (profession && company) return `${profession} • ${company}`;
  if (profession) return profession;
  if (company) return company;
  if (canConnect) return "Aberto a conexões profissionais";
  if (quickAction) return "Canal profissional disponível";

  return "Perfil profissional";
}

function buildProDescription(
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean,
  quickAction: QuickAction | null
): string {
  const bioText = normalizeText(professionalProfile?.bio_text);
  const aiSummary = normalizeText(professionalProfile?.ai_summary);
  const services = normalizeText(professionalProfile?.services);
  const lookingFor = normalizeText(professionalProfile?.looking_for);

  if (bioText) return bioText;
  if (aiSummary) return aiSummary;
  if (services && lookingFor) return `${services} Busca ${lookingFor}.`;
  if (services) return services;

  if (canConnect) {
    return "Perfil aberto para conexões profissionais, parcerias e novas oportunidades.";
  }

  if (quickAction) {
    return "Perfil com canais profissionais disponíveis para continuar a conversa.";
  }

  return "Perfil profissional público.";
}

function normalizeExternalHref(value: string | null | undefined): string {
  const raw = normalizeText(value);

  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("mailto:") || raw.startsWith("tel:")) return raw;

  if (raw.includes("@") && !raw.includes(" ")) {
    return `mailto:${raw}`;
  }

  if (raw.includes(".") && !raw.includes(" ")) {
    return `https://${raw}`;
  }

  return raw;
}

function getWhatsAppHref(value: string | null | undefined): string {
  const raw = normalizeText(value);

  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  return `https://wa.me/${digits}`;
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

  const whatsappHref = getWhatsAppHref(professionalProfile.whatsapp_business);
  if (whatsappHref) {
    return {
      href: whatsappHref,
      label: "Falar no WhatsApp",
    };
  }

  if (professionalProfile.professional_email) {
    return {
      href: `mailto:${professionalProfile.professional_email}`,
      label: "Enviar e-mail",
    };
  }

  const websiteHref = normalizeExternalHref(professionalProfile.website);
  if (websiteHref) {
    return {
      href: websiteHref,
      label: "Abrir website",
    };
  }

  const portfolioHref = normalizeExternalHref(professionalProfile.portfolio);
  if (portfolioHref) {
    return {
      href: portfolioHref,
      label: "Ver portfólio",
    };
  }

  const linkedinHref = normalizeExternalHref(professionalProfile.linkedin);
  if (linkedinHref) {
    return {
      href: linkedinHref,
      label: "Abrir LinkedIn",
    };
  }

  const instagramHref = normalizeExternalHref(professionalProfile.business_instagram);
  if (instagramHref) {
    return {
      href: instagramHref,
      label: "Abrir Instagram profissional",
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
  professionalProfile: ProfessionalProfile | null,
  canConnect: boolean
): string[] {
  const items: string[] = [];

  if (canConnect) items.push("Conexão profissional disponível");
  if (professionalProfile?.profession) items.push(professionalProfile.profession);
  if (professionalProfile?.industry) items.push(professionalProfile.industry);
  if (professionalProfile?.city) items.push(professionalProfile.city);

  return items.slice(0, 4);
}

function getChannelDescription(label: string): string {
  const key = normalizeText(label).toLowerCase();

  if (key.includes("e-mail") || key.includes("email")) return "Contato direto";
  if (key.includes("website") || key.includes("site")) return "Site oficial";
  if (key.includes("linkedin")) return "Perfil profissional";
  if (key.includes("instagram")) return "Presença profissional";
  if (key.includes("portfólio") || key.includes("portfolio")) return "Portfólio profissional";
  if (key.includes("marketplace") || key.includes("produto")) return "Produtos e serviços";
  if (key.includes("youtube")) return "Canal oficial";

  return "Canal profissional";
}

function isWhatsAppSocialLink(link: PublicSocialLink): boolean {
  const key = normalizeText(`${link.platform} ${link.label ?? ""}`).toLowerCase();

  return key.includes("whatsapp") || key.includes("whats");
}

function buildChannelLinks(
  professionalProfile: ProfessionalProfile,
  links: PublicSocialLink[]
): ChannelLink[] {
  const directChannels: Array<ChannelLink | null> = [
    professionalProfile.professional_email
      ? {
          label: "E-mail profissional",
          href: `mailto:${professionalProfile.professional_email}`,
          description: "Contato direto",
        }
      : null,
    professionalProfile.website
      ? {
          label: "Website",
          href: normalizeExternalHref(professionalProfile.website),
          description: "Site oficial",
        }
      : null,
    professionalProfile.portfolio
      ? {
          label: "Portfólio",
          href: normalizeExternalHref(professionalProfile.portfolio),
          description: "Trabalhos e entregas",
        }
      : null,
    professionalProfile.linkedin
      ? {
          label: "LinkedIn",
          href: normalizeExternalHref(professionalProfile.linkedin),
          description: "Perfil profissional",
        }
      : null,
    professionalProfile.business_instagram
      ? {
          label: "Instagram profissional",
          href: normalizeExternalHref(professionalProfile.business_instagram),
          description: "Presença profissional",
        }
      : null,
  ];

  const normalizedDirectLabels = new Set(
    directChannels
      .filter(Boolean)
      .map((item) => normalizeText(item?.label).toLowerCase())
  );

  const socialChannels = links
    .map((link) => {
      const label = getDisplayName(link.label, link.platform);

      return {
        label,
        href: `/r/${link.id}`,
        description: getChannelDescription(label),
        isInternal: true,
      };
    })
    .filter((item) => !normalizedDirectLabels.has(item.label.toLowerCase()));

  return [...directChannels.filter(Boolean), ...socialChannels].slice(0, 8) as ChannelLink[];
}

// v4.6.2-pro-routes-and-links-fix
export default async function ProPublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const qp = searchParams ? await searchParams : undefined;
  const s = String(slug || "").trim().toLowerCase();
  const networkReturnPath =
    qp?.from === "network" ? getSafeNetworkReturnPath(qp.returnTo) : null;
  const networkReturnQuery = networkReturnPath
    ? `?from=network&returnTo=${encodeURIComponent(networkReturnPath)}`
    : "";

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

    permanentRedirect(`/pro/${current.slug}${networkReturnQuery}`);
  }

  if (!card.is_published) notFound();

  const clicks = await incrementClicks(supabase, card.slug);
  const userId = String(card.user_id);
  const rawLinks = await getProLinks(supabase, userId);
  const links = rawLinks.filter((link) => !isWhatsAppSocialLink(link));
  const professionalProfile = await getProfessionalProfile(supabase, userId);

  if (!professionalProfile || !professionalProfile.visible_in_network) {
    notFound();
  }

  const canConnect = !!professionalProfile.accepts_professional_contact;
  const profileName = normalizeText(card.label) || "Este perfil";
  const firstLink = links.length > 0 ? links[0] : null;
  const firstActionLink = firstLink ? `/r/${firstLink.id}` : null;
  const firstActionLabel = firstLink
    ? getDisplayName(firstLink.label, firstLink.platform)
    : null;
  const professionalQuickAction = getProfessionalQuickAction(
    professionalProfile,
    firstActionLink,
    firstActionLabel
  );
  const heroTitle = buildProHeadline(
    professionalProfile,
    canConnect,
    professionalQuickAction
  );
  const heroDescription = buildProDescription(
    professionalProfile,
    canConnect,
    professionalQuickAction
  );
  const heroHighlights = getHeroHighlights(professionalProfile, canConnect);
  const professionalKeywords = normalizeKeywordList(
    professionalProfile.search_keywords
  );

  // O perfil Pro público funciona como cartão profissional, não como ranking social.
  // Seguidores, seguindo e conexões seguem no banco para ranking interno, dashboard e recomendações,
  // mas não ficam expostos no perfil público para evitar efeito de baixa relevância em uma rede nova.

  const profileFacts = [
    { label: "Atuação", value: professionalProfile.profession },
    { label: "Empresa", value: professionalProfile.company_name },
    { label: "Área", value: professionalProfile.industry },
    { label: "Cidade", value: professionalProfile.city },
  ].filter((item) => normalizeText(item.value).length > 0);

  const rawPresentationText =
    normalizeText(professionalProfile.ai_summary) ||
    normalizeText(professionalProfile.bio_text);
  const presentationText =
    rawPresentationText &&
    !normalizeText(heroDescription)
      .toLowerCase()
      .startsWith(rawPresentationText.toLowerCase())
      ? rawPresentationText
      : "";
  const offersText = normalizeText(professionalProfile.services);
  const lookingForText = normalizeText(professionalProfile.looking_for);
  const narrativeBlocks = [
    { label: "O que faz", value: offersText },
    { label: "O que busca", value: lookingForText },
  ].filter((item) => normalizeText(item.value).length > 0);
  const allChannels = buildChannelLinks(professionalProfile, links);
  const whatsappHref = getWhatsAppHref(professionalProfile.whatsapp_business);

  return (
    <main style={pageStyle()}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pro-public-shell {
              padding-left: max(14px, env(safe-area-inset-left));
              padding-right: max(14px, env(safe-area-inset-right));
            }

            .pro-public-hero-profile {
              grid-template-columns: 1fr;
            }

            .pro-public-hero-actions {
              grid-template-columns: 1fr;
            }

            .pro-public-fact-grid,
            .pro-public-narrative-grid,
            .pro-public-channel-grid {
              grid-template-columns: 1fr;
            }

            @media (min-width: 640px) {
              .pro-public-shell {
                padding: 24px 20px 48px;
              }

              .pro-public-hero-profile {
                grid-template-columns: 128px 1fr;
                align-items: center;
              }

              .pro-public-avatar {
                width: 128px !important;
                height: 128px !important;
                border-radius: 30px !important;
              }

              .pro-public-hero-actions {
                grid-template-columns: repeat(3, minmax(0, auto));
                justify-content: start;
              }

              .pro-public-fact-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .pro-public-narrative-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .pro-public-channel-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
              }
            }

            @media (min-width: 900px) {
              .pro-public-shell {
                padding-top: 30px;
              }
            }
          `,
        }}
      />

      <div className="pro-public-shell" style={shellStyle()}>
        <header style={topBarStyle()}>
          <div style={topStatsStyle()}>
            <span>{formatClicks(clicks)}</span>
            <span>Perfil Pro</span>
          </div>

          <nav style={modeActionsStyle()} aria-label="Alternar experiência pública">
            {networkReturnPath ? (
              <Link href={networkReturnPath} style={networkReturnButtonStyle()}>
                Voltar para resultados
              </Link>
            ) : null}

            <Link href={`/u/${card.slug}`} style={modeButtonStyle(false)}>
              Experiência Clubber
            </Link>

            <Link href={`/pro/${card.slug}`} style={modeButtonStyle(true)}>
              Perfil profissional
            </Link>
          </nav>
        </header>

        <section style={heroStyle()}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: -120,
              background:
                "radial-gradient(circle at 84% 18%, rgba(59,130,246,0.32), transparent 24%), radial-gradient(circle at 18% 88%, rgba(45,212,191,0.14), transparent 26%)",
              pointerEvents: "none",
            }}
          />

          <div className="pro-public-hero-profile" style={heroProfileStyle()}>
            <div className="pro-public-avatar" style={avatarStyle()}>
              {professionalProfile.pro_photo_url ? (
                <img
                  src={professionalProfile.pro_photo_url}
                  alt={`Foto profissional de ${profileName}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                getInitials(profileName)
              )}
            </div>

            <div>
              <span style={heroKickerStyle()}>Área profissional</span>
              <h1 style={heroTitleStyle()}>{profileName}</h1>

              <p style={heroHeadlineStyle()}>{heroTitle}</p>

              <p style={heroDescriptionStyle()}>{heroDescription}</p>

              {heroHighlights.length > 0 ? (
                <div style={heroHighlightsStyle()}>
                  {heroHighlights.map((item) => (
                    <span key={item} style={heroHighlightPillStyle()}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="pro-public-hero-actions" style={heroActionsStyle()}>
            {canConnect ? (
              <ProfessionalConnectButton
                targetUserId={userId}
                selfConnectionsHref="/network/connections"
                selfDashboardHref={`/dashboard/cards/${card.card_id}/pro`}
              />
            ) : null}

            <ProfessionalFollowButton targetUserId={userId} />

            {whatsappHref ? (
              <a href={whatsappHref} style={whatsappButtonStyle()}>
                Falar no WhatsApp
              </a>
            ) : professionalQuickAction ? (
              <a href={professionalQuickAction.href} style={primaryButtonStyle()}>
                {professionalQuickAction.label}
              </a>
            ) : allChannels[0] ? (
              <a href={allChannels[0].href} style={primaryButtonStyle()}>
                Abrir canal principal
              </a>
            ) : (
              <Link href="/network" style={secondaryButtonStyle()}>
                Ver rede profissional
              </Link>
            )}
          </div>
        </section>

        <section style={sectionCardStyle()}>
          <span style={sectionKickerStyle()}>Cartão de visitas</span>
          <h2 style={sectionTitleStyle()}>O que este perfil entrega</h2>
          <p style={sectionSubtitleStyle()}>
            Uma leitura rápida da atuação, do que oferece e dos melhores caminhos
            para continuar a conversa.
          </p>

          {profileFacts.length > 0 ? (
            <div className="pro-public-fact-grid" style={factGridStyle()}>
              {profileFacts.map((item) => (
                <article key={item.label} style={factCardStyle()}>
                  <strong style={factLabelStyle()}>{item.label}</strong>
                  <p style={factValueStyle()}>{item.value}</p>
                </article>
              ))}
            </div>
          ) : null}

          {presentationText ? (
            <div style={softNoteStyle()}>
              {presentationText}
            </div>
          ) : null}

          {narrativeBlocks.length > 0 ? (
            <div className="pro-public-narrative-grid" style={narrativeGridStyle()}>
              {narrativeBlocks.map((item) => (
                <article key={item.label} style={narrativeBlockStyle()}>
                  <strong style={narrativeTitleStyle()}>{item.label}</strong>
                  <p style={narrativeTextStyle()}>{item.value}</p>
                </article>
              ))}
            </div>
          ) : null}

          {professionalKeywords.length > 0 ? (
            <div style={{ marginTop: 18 }}>
              <strong style={sectionKickerStyle()}>Temas profissionais</strong>
              <div style={keywordWrapStyle()}>
                {professionalKeywords.map((keyword) => (
                  <span key={keyword} style={keywordPillStyle()}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section style={sectionCardStyle()}>
          <span style={sectionKickerStyle()}>Canais principais</span>
          <h2 style={sectionTitleStyle()}>Como continuar a conversa</h2>
          <p style={sectionSubtitleStyle()}>
            Links oficiais e caminhos diretos para contato, portfólio, produtos
            ou presença profissional.
          </p>

          {allChannels.length > 0 ? (
            <div className="pro-public-channel-grid" style={channelGridStyle()}>
              {allChannels.map((channel, index) => {
                const content = (
                  <>
                    <div style={channelTitleRowStyle()}>
                      <h3 style={channelTitleStyle()}>{channel.label}</h3>
                      <span style={channelActionStyle()}>Abrir</span>
                    </div>
                    <p style={channelDescriptionStyle()}>{channel.description}</p>
                  </>
                );

                if (channel.isInternal) {
                  return (
                    <Link
                      key={`${channel.label}-${channel.href}`}
                      href={channel.href}
                      style={channelCardStyle(index === 0)}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <a
                    key={`${channel.label}-${channel.href}`}
                    href={channel.href}
                    style={channelCardStyle(index === 0)}
                    target={
                      channel.href.startsWith("mailto:") || channel.href.startsWith("tel:")
                        ? undefined
                        : "_blank"
                    }
                    rel={
                      channel.href.startsWith("mailto:") || channel.href.startsWith("tel:")
                        ? undefined
                        : "noopener noreferrer"
                    }
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          ) : (
            <p style={emptyTextStyle()}>
              Este perfil ainda não publicou canais profissionais.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
