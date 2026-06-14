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

type ProfessionalSocialCounts = {
  followersCount: number;
  followingCount: number;
  connectionsCount: number;
};

type ProfessionalPublicCountsRpcRow = {
  followers_count: number | null;
  following_count: number | null;
  connections_count: number | null;
};

async function getProfessionalSocialCounts(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string
): Promise<ProfessionalSocialCounts> {
  const fallback: ProfessionalSocialCounts = {
    followersCount: 0,
    followingCount: 0,
    connectionsCount: 0,
  };

  try {
    const { data, error } = await supabase
      .rpc("get_professional_public_counts", { p_user_id: userId })
      .maybeSingle();

    if (error || !data) return fallback;

    const row = data as ProfessionalPublicCountsRpcRow;

    return {
      followersCount: Number(row.followers_count ?? 0),
      followingCount: Number(row.following_count ?? 0),
      connectionsCount: Number(row.connections_count ?? 0),
    };
  } catch {
    return fallback;
  }
}



type ProfessionalFollowPreviewItem = {
  listType: "followers" | "following";
  userId: string;
  slug: string;
  label: string | null;
  profession: string | null;
  companyName: string | null;
  city: string | null;
  proPhotoUrl: string | null;
  sortCreatedAt: string | null;
};

type ProfessionalFollowPreviewRpcRow = {
  list_type: "followers" | "following" | null;
  user_id: string | null;
  slug: string | null;
  label: string | null;
  profession: string | null;
  company_name: string | null;
  city: string | null;
  pro_photo_url: string | null;
  sort_created_at: string | null;
};

type ProfessionalFollowPreview = {
  followers: ProfessionalFollowPreviewItem[];
  following: ProfessionalFollowPreviewItem[];
};

async function getProfessionalFollowPreview(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string
): Promise<ProfessionalFollowPreview> {
  const fallback: ProfessionalFollowPreview = {
    followers: [],
    following: [],
  };

  try {
    const { data, error } = await supabase.rpc(
      "get_professional_public_follow_preview",
      {
        p_user_id: userId,
        p_limit: 6,
      }
    );

    if (error || !Array.isArray(data)) return fallback;

    const preview = data.reduce<ProfessionalFollowPreview>((acc, row) => {
      const item = row as ProfessionalFollowPreviewRpcRow;
      const listType = item.list_type;
      const slug = normalizeText(item.slug);
      const relatedUserId = normalizeText(item.user_id);

      if ((listType !== "followers" && listType !== "following") || !slug || !relatedUserId) {
        return acc;
      }

      acc[listType].push({
        listType,
        userId: relatedUserId,
        slug,
        label: item.label,
        profession: item.profession,
        companyName: item.company_name,
        city: item.city,
        proPhotoUrl: item.pro_photo_url,
        sortCreatedAt: item.sort_created_at,
      });

      return acc;
    }, fallback);

    return {
      followers: preview.followers.slice(0, 6),
      following: preview.following.slice(0, 6),
    };
  } catch {
    return fallback;
  }
}

const PRO_BORDER = "rgba(148,163,184,0.22)";
const PRO_BORDER_STRONG = "rgba(59,130,246,0.34)";
const PRO_TEXT = "#F8FAFC";
const PRO_TEXT_SECONDARY = "#CBD5E1";

function pageStyle(): CSSProperties {
  return {
    maxWidth: 1080,
    margin: "0 auto",
    padding: 24,
    color: PRO_TEXT,
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
    border: `1px solid ${PRO_BORDER_STRONG}`,
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.94) 48%, rgba(30,41,95,0.82) 100%)",
    display: "grid",
    gap: 18,
    boxShadow: "0 24px 70px rgba(2,6,23,0.42)",
  };
}

function heroKickerStyle(): CSSProperties {
  return {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#93C5FD",
  };
}

function topNavigationButtonBaseStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "9px 15px",
    borderRadius: 14,
    color: PRO_TEXT,
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  };
}

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    ...topNavigationButtonBaseStyle(),
    border: active
      ? "1px solid rgba(96,165,250,0.52)"
      : `1px solid ${PRO_BORDER}`,
    background: active
      ? "linear-gradient(135deg, rgba(37,99,235,0.86), rgba(79,70,229,0.62))"
      : "rgba(15,23,42,0.78)",
    boxShadow: active
      ? "0 0 0 1px rgba(59,130,246,0.10) inset, 0 12px 26px rgba(37,99,235,0.16)"
      : "0 0 0 1px rgba(255,255,255,0.03) inset",
  };
}

function professionalActionBaseStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 14px",
    borderRadius: 14,
    color: PRO_TEXT,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...professionalActionBaseStyle(),
    border: "1px solid rgba(96,165,250,0.48)",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(79,70,229,0.72))",
    color: "#F8FAFC",
    boxShadow:
      "0 0 0 1px rgba(59,130,246,0.10) inset, 0 14px 26px rgba(37,99,235,0.16)",
  };
}

function secondaryButtonStyle(): CSSProperties {
  return {
    ...professionalActionBaseStyle(),
    border: `1px solid ${PRO_BORDER}`,
    background: "rgba(15,23,42,0.76)",
    color: PRO_TEXT,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
  };
}

function linkCardStyle(isFirst: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "15px 16px",
    borderRadius: 16,
    border: isFirst
      ? `1px solid ${PRO_BORDER_STRONG}`
      : `1px solid ${PRO_BORDER}`,
    background: isFirst
      ? "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,23,42,0.84))"
      : "rgba(15,23,42,0.74)",
    color: PRO_TEXT,
    textDecoration: "none",
    fontWeight: 850,
  };
}

function sectionCardStyle(): CSSProperties {
  return {
    marginTop: 24,
    padding: 20,
    borderRadius: 22,
    border: `1px solid ${PRO_BORDER}`,
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(17,24,39,0.78))",
    boxShadow: "0 16px 40px rgba(2,6,23,0.24)",
  };
}

function metaLabelStyle(): CSSProperties {
  return {
    display: "inline-block",
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: 850,
    letterSpacing: 0.35,
  };
}

function highlightTextStyle(): CSSProperties {
  return {
    margin: 0,
    color: PRO_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.6,
  };
}

function businessCardHeaderStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    marginBottom: 18,
  };
}

function profileSnapshotStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    paddingTop: 2,
    color: PRO_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.55,
  };
}

function profileSnapshotItemStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 5,
    whiteSpace: "normal",
  };
}

function profileSnapshotLabelStyle(): CSSProperties {
  return {
    color: "#93C5FD",
    fontWeight: 950,
  };
}

function narrativeGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    marginTop: 18,
  };
}

function narrativeBlockStyle(): CSSProperties {
  return {
    paddingLeft: 14,
    borderLeft: "2px solid rgba(96,165,250,0.42)",
  };
}

function narrativeTitleStyle(): CSSProperties {
  return {
    display: "block",
    marginBottom: 7,
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: 950,
    letterSpacing: 0.2,
  };
}

function narrativeTextStyle(): CSSProperties {
  return {
    margin: 0,
    color: PRO_TEXT,
    opacity: 0.92,
    lineHeight: 1.7,
    fontSize: 15,
  };
}

function inlineKeywordListStyle(): CSSProperties {
  return {
    marginTop: 10,
    color: PRO_TEXT_SECONDARY,
    lineHeight: 1.8,
    fontSize: 14,
  };
}

function inlineKeywordStyle(): CSSProperties {
  return {
    color: "#DBEAFE",
    fontWeight: 950,
  };
}

function inlineChannelListStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 14px",
    marginTop: 10,
  };
}

function inlineChannelLinkStyle(): CSSProperties {
  return {
    color: "#DBEAFE",
    fontWeight: 900,
    textDecoration: "none",
    borderBottom: "1px solid rgba(147,197,253,0.35)",
    lineHeight: 1.45,
  };
}

function profileStatsRowStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: 850,
    lineHeight: 1.2,
  };
}

function profileStatTextStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 4,
  };
}

function profileStatNumberStyle(): CSSProperties {
  return {
    color: PRO_TEXT,
    fontSize: 12,
    fontWeight: 950,
  };
}


function socialPreviewGridStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginTop: 16,
  };
}

function socialPreviewColumnStyle(): CSSProperties {
  return {
    padding: 14,
    borderRadius: 18,
    border: `1px solid ${PRO_BORDER}`,
    background: "rgba(15,23,42,0.58)",
  };
}

function socialPreviewListStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 10,
    marginTop: 12,
  };
}

function socialPreviewItemStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 11px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(15,23,42,0.56)",
    color: PRO_TEXT,
    textDecoration: "none",
  };
}

function socialPreviewAvatarStyle(): CSSProperties {
  return {
    width: 38,
    height: 38,
    minWidth: 38,
    borderRadius: 999,
    border: "1px solid rgba(96,165,250,0.32)",
    background: "linear-gradient(135deg, rgba(37,99,235,0.72), rgba(15,23,42,0.86))",
    color: PRO_TEXT,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 950,
    overflow: "hidden",
  };
}

function socialPreviewTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontSize: 14,
    fontWeight: 950,
    color: PRO_TEXT,
  };
}

function socialPreviewDescriptionStyle(): CSSProperties {
  return {
    margin: "4px 0 0 0",
    color: PRO_TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 1.35,
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

function networkReturnButtonStyle(): CSSProperties {
  return {
    ...topNavigationButtonBaseStyle(),
    border: "1px solid rgba(45,212,191,0.34)",
    background: "linear-gradient(135deg, rgba(13,148,136,0.22), rgba(15,23,42,0.78))",
    color: "#A7F3D0",
    boxShadow: "0 0 0 1px rgba(45,212,191,0.06) inset",
  };
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

function formatStatCount(count: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: count >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Math.max(0, count));
}

function formatSocialLabel(label: string, value: number): string {
  if (value !== 1) return label;
  if (label === "seguidores") return "seguidor";
  if (label === "conexões") return "conexão";
  return label;
}


function getInitials(value: string | null | undefined): string {
  const text = normalizeText(value);
  if (!text) return "PRO";

  const parts = text.split(" ").filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || "PRO";
}

function getFollowPreviewSubtitle(item: ProfessionalFollowPreviewItem): string {
  const profession = normalizeText(item.profession);
  const company = normalizeText(item.companyName);
  const city = normalizeText(item.city);

  if (profession && company) return limitText(`${profession} • ${company}`, 62);
  if (profession && city) return limitText(`${profession} • ${city}`, 62);
  if (profession) return limitText(profession, 62);
  if (company) return limitText(company, 62);
  if (city) return limitText(city, 62);

  return "Perfil profissional público";
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
  if (canConnect) return "Aberto a conexoes profissionais";
  if (quickAction) return "Canal profissional disponivel";

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
    return "Perfil aberto para conexoes profissionais, parcerias e novas oportunidades.";
  }

  if (quickAction) {
    return "Perfil com canais profissionais disponiveis para continuar a conversa.";
  }

  return "Perfil profissional publico.";
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


type OfficialChannelBrand = "linkedin" | "instagram" | "whatsapp" | "youtube";

function getOfficialChannelBrand(label: string): OfficialChannelBrand | null {
  const key = normalizeText(label).toLowerCase();

  if (key.includes("linkedin")) return "linkedin";
  if (key.includes("instagram")) return "instagram";
  if (key.includes("whatsapp")) return "whatsapp";
  if (key.includes("youtube")) return "youtube";

  return null;
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

function OfficialChannelIcon({ brand }: { brand: OfficialChannelBrand }) {
  if (brand === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    );
  }

  if (brand === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.5 0h9A7.5 7.5 0 0 1 24 7.5v9a7.5 7.5 0 0 1-7.5 7.5h-9A7.5 7.5 0 0 1 0 16.5v-9A7.5 7.5 0 0 1 7.5 0zm0 2.4A5.1 5.1 0 0 0 2.4 7.5v9a5.1 5.1 0 0 0 5.1 5.1h9a5.1 5.1 0 0 0 5.1-5.1v-9a5.1 5.1 0 0 0-5.1-5.1h-9zM12 5.8a6.2 6.2 0 1 1 0 12.4 6.2 6.2 0 0 1 0-12.4zm0 2.4a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm6.45-2.65a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9z" />
      </svg>
    );
  }

  if (brand === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.49" />
    </svg>
  );
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

function getLinkHint(link: PublicSocialLink, index: number): string {
  const key = normalizeText(link.label || link.platform).toLowerCase();

  if (index === 0) return "Canal prioritário";
  if (key.includes("linkedin")) return "Ver perfil";
  if (key.includes("portfolio")) return "Ver portfólio";
  if (key.includes("website")) return "Visitar website";
  if (key.includes("instagram")) return "Ver Instagram";
  return "Abrir canal";
}

function isWhatsAppSocialLink(link: PublicSocialLink): boolean {
  const key = normalizeText(`${link.platform} ${link.label ?? ""}`).toLowerCase();
  return key.includes("whatsapp") || key.includes("whats");
}

// v4.5.3-public-pro-follow-lists-preview-mobile-profile-card-polish
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

  const heroTitle = buildProHeadline(professionalProfile, canConnect, professionalQuickAction);
  const heroDescription = buildProDescription(professionalProfile, canConnect, professionalQuickAction);
  const heroHighlights = getHeroHighlights(professionalProfile, canConnect);
  const professionalKeywords = normalizeKeywordList(professionalProfile.search_keywords);
  const socialCounts = await getProfessionalSocialCounts(supabase, userId);
  const visibleSocialStats = [
    { label: "seguidores", value: socialCounts.followersCount },
    { label: "seguindo", value: socialCounts.followingCount },
    { label: "conexões", value: socialCounts.connectionsCount },
  ].filter((item) => item.value > 0);

  const followPreview = await getProfessionalFollowPreview(supabase, userId);
  const hasFollowPreview =
    followPreview.followers.length > 0 || followPreview.following.length > 0;

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

  const narrativeBlocks = [
    { label: "O que faz", value: professionalProfile.services },
    { label: "O que busca", value: professionalProfile.looking_for },
  ].filter((item) => normalizeText(item.value).length > 0);

  const profileChannelLinks = [
    professionalProfile.professional_email
      ? {
          label: "E-mail profissional",
          href: `mailto:${professionalProfile.professional_email}`,
        }
      : null,
    professionalProfile.website
      ? { label: "Website", href: professionalProfile.website }
      : null,
    professionalProfile.portfolio
      ? { label: "Portfólio", href: professionalProfile.portfolio }
      : null,
    professionalProfile.linkedin
      ? { label: "LinkedIn", href: professionalProfile.linkedin }
      : null,
    professionalProfile.business_instagram
      ? { label: "Instagram profissional", href: professionalProfile.business_instagram }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const profileChannelLabels = new Set(
    profileChannelLinks.map((item) => item.label.toLowerCase())
  );

  const additionalChannelLinks = links
    .map((link) => ({
      label: getDisplayName(link.label, link.platform),
      href: `/r/${link.id}`,
    }))
    .filter((item) => !profileChannelLabels.has(item.label.toLowerCase()));

  const allInlineChannels = [...profileChannelLinks, ...additionalChannelLinks].slice(0, 8);


  const publicPitch =
    normalizeText(professionalProfile.bio_text) ||
    normalizeText(professionalProfile.ai_summary) ||
    normalizeText(professionalProfile.services) ||
    heroDescription;

  const roleMetaLine = [professionalProfile.profession, professionalProfile.industry]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" | ");

  const companyLine = [professionalProfile.company_name, professionalProfile.city]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" • ");

  const offersText = normalizeText(professionalProfile.services);
  const lookingForText = normalizeText(professionalProfile.looking_for);

  return (
    <main className="pro-page">
      <style>{`
        .pro-page {
          max-width: 1040px;
          width: min(1040px, calc(100% - 28px));
          margin: 0 auto;
          padding: 22px 0;
          color: #f8fafc;
        }

        .pro-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .pro-top-title {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .pro-eyebrow {
          color: #93c5fd;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1.1px;
          text-transform: uppercase;
        }

        .pro-profile-name {
          margin: 0;
          font-size: clamp(26px, 4vw, 36px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .pro-stats-line {
          color: #bfdbfe;
          font-size: 13px;
          font-weight: 850;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pro-top-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .pro-hero {
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(59,130,246,0.34);
          background:
            radial-gradient(circle at 88% 12%, rgba(59,130,246,0.28), transparent 34%),
            linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.94) 48%, rgba(30,41,95,0.82) 100%);
          box-shadow: 0 28px 80px rgba(2,6,23,0.48);
          padding: clamp(20px, 4vw, 34px);
        }

        .pro-hero-main {
          display: grid;
          grid-template-columns: 176px minmax(0, 1fr);
          gap: clamp(18px, 3vw, 28px);
          align-items: start;
        }

        .pro-photo-stats-wrap {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .pro-mobile-stats {
          display: none;
        }

        .pro-photo-wrap {
          position: relative;
          width: 168px;
          height: 168px;
          border-radius: 30px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(147,197,253,0.56), rgba(45,212,191,0.26), rgba(15,23,42,0.2));
          box-shadow: 0 18px 45px rgba(2,6,23,0.36);
        }

        .pro-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 29px;
          display: block;
        }

        .pro-photo-fallback {
          width: 100%;
          height: 100%;
          border-radius: 29px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(37,99,235,0.42), rgba(15,23,42,0.9));
          color: #dbeafe;
          font-size: 30px;
          font-weight: 950;
        }

        .pro-hero-content {
          min-width: 0;
          display: grid;
          gap: 12px;
        }

        .pro-role {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(28px, 3.2vw, 36px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .pro-professional-meta {
          color: #dbeafe;
          font-size: 16px;
          line-height: 1.45;
          font-weight: 950;
        }

        .pro-company-line {
          color: #bfdbfe;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.5;
        }

        .pro-pitch {
          max-width: 760px;
          margin: 0;
          color: #e5e7eb;
          font-size: clamp(16px, 2.2vw, 18px);
          line-height: 1.65;
          font-weight: 520;
        }

        .pro-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        }

        .pro-hero::after {
          content: "";
          position: absolute;
          right: -90px;
          top: -90px;
          width: 280px;
          height: 280px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(45,212,191,0.18), transparent 62%);
          pointer-events: none;
        }

        .pro-hero-main {
          position: relative;
          z-index: 1;
        }

        .pro-card {
          margin-top: 22px;
          padding: clamp(20px, 3.5vw, 30px);
          border-radius: 26px;
          border: 1px solid rgba(148,163,184,0.22);
          background:
            radial-gradient(circle at 10% 0%, rgba(59,130,246,0.12), transparent 36%),
            linear-gradient(135deg, rgba(15,23,42,0.9), rgba(17,24,39,0.8));
          box-shadow: 0 18px 50px rgba(2,6,23,0.26);
        }

        .pro-card-header {
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
        }

        .pro-card-title {
          margin: 0;
          font-size: clamp(24px, 3.5vw, 34px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .pro-card-subtitle {
          margin: 0;
          max-width: 760px;
          color: #cbd5e1;
          font-size: 16px;
          line-height: 1.6;
        }

        .pro-story-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .pro-story {
          min-height: 136px;
          border-radius: 22px;
          padding: 18px;
          border: 1px solid rgba(148,163,184,0.18);
          background:
            radial-gradient(circle at 92% 10%, rgba(45,212,191,0.12), transparent 30%),
            rgba(15,23,42,0.58);
        }

        .pro-story-label {
          display: block;
          margin-bottom: 10px;
          color: #93c5fd;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .pro-story-text {
          margin: 0;
          color: #f8fafc;
          font-size: 16px;
          line-height: 1.65;
        }

        .pro-text-line {
          margin-top: 18px;
          color: #dbeafe;
          font-size: 15px;
          line-height: 1.8;
          font-weight: 900;
        }

        .pro-text-line span {
          color: #93c5fd;
          font-weight: 950;
        }

        .pro-channel-section {
          margin-top: 24px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(96,165,250,0.18);
          background:
            radial-gradient(circle at 100% 0%, rgba(45,212,191,0.10), transparent 30%),
            rgba(15,23,42,0.38);
        }

        .pro-channel-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .pro-channel-title {
          display: grid;
          gap: 5px;
        }

        .pro-channel-title p {
          margin: 0;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.45;
        }

        .pro-channel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .pro-channel-card {
          display: flex;
          min-height: 66px;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          padding: 13px 14px;
          border: 1px solid rgba(148,163,184,0.20);
          background: linear-gradient(135deg, rgba(15,23,42,0.78), rgba(30,41,59,0.36));
          color: #dbeafe;
          text-decoration: none;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.025) inset;
        }

        .pro-channel-card:hover {
          border-color: rgba(96,165,250,0.38);
          background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.18));
        }

        .pro-official-brand {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .pro-official-brand svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }

        .pro-official-brand-linkedin {
          color: #ffffff;
          background: #0a66c2;
        }

        .pro-official-brand-instagram {
          color: #ffffff;
          background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%);
        }

        .pro-official-brand-whatsapp {
          color: #ffffff;
          background: #25d366;
        }

        .pro-official-brand-youtube {
          color: #ffffff;
          background: #ff0000;
        }

        .pro-channel-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
          flex: 1;
        }

        .pro-channel-copy strong {
          color: #f8fafc;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 950;
        }

        .pro-channel-copy small {
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 700;
        }

        .pro-channel-open {
          color: #93c5fd;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .pro-network-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }

        .pro-network-column {
          border-radius: 20px;
          padding: 14px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(15,23,42,0.56);
        }

        .pro-network-list {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .pro-network-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.16);
          background: rgba(15,23,42,0.52);
          color: #f8fafc;
          text-decoration: none;
        }

        .pro-network-avatar {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 999px;
          border: 1px solid rgba(96,165,250,0.32);
          background: linear-gradient(135deg, rgba(37,99,235,0.72), rgba(15,23,42,0.86));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: #f8fafc;
          font-size: 12px;
          font-weight: 950;
        }

        .pro-network-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .pro-network-title {
          margin: 0;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 950;
        }

        .pro-network-desc {
          margin: 4px 0 0 0;
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1.35;
        }

        @media (max-width: 860px) {
          .pro-page {
            width: min(100%, calc(100% - 18px));
            padding: 12px 0;
          }

          .pro-top {
            display: grid;
            gap: 12px;
          }

          .pro-top-title .pro-stats-line {
            display: none;
          }

          .pro-top-actions {
            display: grid;
            grid-template-columns: 1fr;
            justify-content: stretch;
            width: 100%;
            overflow: visible;
            gap: 8px;
          }

          .pro-top-actions a {
            width: 100%;
            min-width: 0;
          }

          .pro-hero {
            border-radius: 24px;
            padding: 18px;
          }

          .pro-hero-main {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .pro-photo-stats-wrap {
            grid-template-columns: 132px minmax(0, 1fr);
            align-items: center;
            gap: 16px;
          }

          .pro-mobile-stats {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 5px;
            min-width: 0;
            color: #bfdbfe;
            font-size: 12px;
            line-height: 1.2;
            font-weight: 850;
          }

          .pro-mobile-stats span {
            display: inline-flex;
            align-items: baseline;
            justify-content: flex-start;
            gap: 4px;
            min-height: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            text-align: left;
            white-space: nowrap;
          }

          .pro-mobile-stats strong {
            color: #f8fafc;
            font-size: 15px;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.02em;
          }

          .pro-photo-wrap {
            width: 132px;
            height: 132px;
            border-radius: 26px;
          }

          .pro-photo,
          .pro-photo-fallback {
            border-radius: 25px;
          }

          .pro-role {
            font-size: 25px;
            line-height: 1.08;
            letter-spacing: -0.035em;
          }

          .pro-professional-meta {
            font-size: 16px;
            line-height: 1.45;
          }

          .pro-company-line {
            font-size: 13px;
          }

          .pro-pitch {
            font-size: 15px;
          }

          .pro-actions {
            gap: 8px;
          }

          .pro-card {
            border-radius: 22px;
            padding: 18px;
          }

          .pro-card-title {
            font-size: 25px;
          }

          .pro-card-subtitle {
            font-size: 15px;
          }

          .pro-story {
            min-height: auto;
            padding: 16px;
          }

          .pro-story-text {
            font-size: 15px;
          }

          .pro-text-line {
            font-size: 14px;
          }

          .pro-story-grid,
          .pro-network-grid {
            grid-template-columns: 1fr;
          }

          .pro-channel-section {
            padding: 15px;
            border-radius: 20px;
          }

          .pro-channel-heading {
            display: grid;
            gap: 8px;
          }

          .pro-channel-grid {
            grid-template-columns: 1fr;
          }

          .pro-channel-card {
            min-height: 68px;
            padding: 14px 15px;
          }
        }

        @media (max-width: 420px) {
          .pro-photo-stats-wrap {
            grid-template-columns: 116px minmax(0, 1fr);
            gap: 12px;
          }

          .pro-photo-wrap {
            width: 116px;
            height: 116px;
            border-radius: 24px;
          }

          .pro-role {
            font-size: 23px;
          }

          .pro-actions {
            align-items: stretch;
          }
        }
      `}</style>

      <header className="pro-top">
        <div className="pro-top-title">
          <span className="pro-eyebrow">{formatClicks(clicks)}</span>
          <h1 className="pro-profile-name">{profileName}</h1>

          {visibleSocialStats.length > 0 ? (
            <div className="pro-stats-line" aria-label="Indicadores profissionais">
              {visibleSocialStats.map((item, index) => (
                <span key={item.label}>
                  {index > 0 ? <span aria-hidden="true">• </span> : null}
                  <strong>{formatStatCount(item.value)}</strong> {formatSocialLabel(item.label, item.value)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <nav className="pro-top-actions" aria-label="Navegacao do perfil profissional">
          {networkReturnPath ? (
            <Link href={networkReturnPath} style={networkReturnButtonStyle()}>
              Voltar para resultados
            </Link>
          ) : null}

          <Link href={`/${card.slug}`} style={modeButtonStyle(false)}>
            Ver experiência Clubber
          </Link>

          <Link href={`/pro/${card.slug}`} style={modeButtonStyle(true)}>
            Perfil profissional
          </Link>
        </nav>
      </header>

      <section className="pro-hero">
        <div className="pro-hero-main">
          <div className="pro-photo-stats-wrap">
            <div className="pro-photo-wrap">
              {professionalProfile.pro_photo_url ? (
                <img
                  src={professionalProfile.pro_photo_url}
                  alt="Foto profissional"
                  className="pro-photo"
                />
              ) : (
                <div className="pro-photo-fallback">{getInitials(profileName)}</div>
              )}
            </div>

            {visibleSocialStats.length > 0 ? (
              <div className="pro-mobile-stats" aria-label="Indicadores profissionais">
                {visibleSocialStats.map((item, index) => (
                  <span key={item.label}>
                    {index > 0 ? <span aria-hidden="true">•</span> : null}
                    <strong>{formatStatCount(item.value)}</strong>
                    {formatSocialLabel(item.label, item.value)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="pro-hero-content">
            <span className="pro-eyebrow">Área profissional</span>
            <h2 className="pro-role">{profileName}</h2>
            {roleMetaLine ? <div className="pro-professional-meta">{roleMetaLine}</div> : null}
            {companyLine ? <div className="pro-company-line">{companyLine}</div> : null}

            <p className="pro-pitch">{publicPitch}</p>

            <div className="pro-actions">
              <ProfessionalFollowButton targetUserId={String(professionalProfile.user_id)} />

              {canConnect ? (
                <ProfessionalConnectButton targetUserId={String(professionalProfile.user_id)} />
              ) : null}

              {professionalQuickAction ? (
                <a
                  href={professionalQuickAction.href}
                  target={professionalQuickAction.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={professionalQuickAction.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  style={canConnect ? secondaryButtonStyle() : primaryButtonStyle()}
                >
                  {professionalQuickAction.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="pro-card">
        <div className="pro-card-header">
          <span className="pro-eyebrow">Cartão de visitas</span>
          <h2 className="pro-card-title">O que este perfil entrega</h2>
          <p className="pro-card-subtitle">
            Uma leitura direta da atuação, do que oferece e do que procura.
          </p>
        </div>

        {(offersText || lookingForText) ? (
          <div className="pro-story-grid">
            {offersText ? (
              <article className="pro-story">
                <span className="pro-story-label">O que faz</span>
                <p className="pro-story-text">{offersText}</p>
              </article>
            ) : null}

            {lookingForText ? (
              <article className="pro-story">
                <span className="pro-story-label">O que busca</span>
                <p className="pro-story-text">{lookingForText}</p>
              </article>
            ) : null}
          </div>
        ) : null}

        {professionalKeywords.length > 0 ? (
          <div className="pro-text-line">
            <span>Temas profissionais:</span>{" "}
            {professionalKeywords.map((keyword, index) => (
              <strong key={keyword}>
                {index > 0 ? " • " : ""}
                {keyword}
              </strong>
            ))}
          </div>
        ) : null}

        {allInlineChannels.length > 0 ? (
          <div className="pro-channel-section">
            <div className="pro-channel-heading">
              <div className="pro-channel-title">
                <span className="pro-eyebrow">Canais principais</span>
                <p>Links oficiais e caminhos diretos para continuar a conversa.</p>
              </div>
            </div>

            <div className="pro-channel-grid">
              {allInlineChannels.map((channel) => {
                const brand = getOfficialChannelBrand(channel.label);

                return (
                  <a
                    key={`${channel.label}-${channel.href}`}
                    href={channel.href}
                    target={channel.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={channel.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                    className="pro-channel-card"
                  >
                    {brand ? (
                      <span className={`pro-official-brand pro-official-brand-${brand}`} aria-hidden="true">
                        <OfficialChannelIcon brand={brand} />
                      </span>
                    ) : null}
                    <span className="pro-channel-copy">
                      <strong>{channel.label}</strong>
                      <small>{getChannelDescription(channel.label)}</small>
                    </span>
                    <span className="pro-channel-open">Abrir</span>
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {hasFollowPreview ? (
        <section className="pro-card">
          <div className="pro-card-header">
            <span className="pro-eyebrow">Rede profissional</span>
            <h2 className="pro-card-title">Pessoas próximas deste perfil</h2>
            <p className="pro-card-subtitle">
              Uma prévia pública de seguidores e perfis acompanhados.
            </p>
          </div>

          <div className="pro-network-grid">
            {followPreview.followers.length > 0 ? (
              <div className="pro-network-column">
                <strong>Seguidores</strong>
                <div className="pro-network-list">
                  {followPreview.followers.map((item) => {
                    const itemName = normalizeText(item.label) || "Perfil profissional";

                    return (
                      <Link
                        key={`${item.listType}-${item.userId}`}
                        href={`/pro/${item.slug}${networkReturnQuery}`}
                        className="pro-network-item"
                      >
                        <span className="pro-network-avatar">
                          {item.proPhotoUrl ? <img src={item.proPhotoUrl} alt="" /> : getInitials(itemName)}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <p className="pro-network-title">{limitText(itemName, 44)}</p>
                          <p className="pro-network-desc">{getFollowPreviewSubtitle(item)}</p>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {followPreview.following.length > 0 ? (
              <div className="pro-network-column">
                <strong>Seguindo</strong>
                <div className="pro-network-list">
                  {followPreview.following.map((item) => {
                    const itemName = normalizeText(item.label) || "Perfil profissional";

                    return (
                      <Link
                        key={`${item.listType}-${item.userId}`}
                        href={`/pro/${item.slug}${networkReturnQuery}`}
                        className="pro-network-item"
                      >
                        <span className="pro-network-avatar">
                          {item.proPhotoUrl ? <img src={item.proPhotoUrl} alt="" /> : getInitials(itemName)}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <p className="pro-network-title">{limitText(itemName, 44)}</p>
                          <p className="pro-network-desc">{getFollowPreviewSubtitle(item)}</p>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
