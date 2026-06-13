// src/app/network/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ProfessionalConnectButton from "@/components/network/ProfessionalConnectButton";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    industry?: string;
    sort?: string;
  }>;
};

type RelationshipControlStatus = "suspended" | "blocked";

type RelationshipControlRow = {
  owner_user_id: string;
  target_user_id: string;
  status: RelationshipControlStatus;
};

type ProfessionalProfileRow = {
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
  search_keywords: string[] | null;
  accepts_professional_contact: boolean;
  visible_in_network: boolean;
};

type CardRow = {
  user_id: string;
  slug: string;
  label: string | null;
  is_published: boolean;
};

type NetworkProfileItem = {
  user_id: string;
  slug: string;
  profile_name: string;
  profession: string | null;
  company_name: string | null;
  industry: string | null;
  city: string | null;
  services: string | null;
  looking_for: string | null;
  website: string | null;
  portfolio: string | null;
  linkedin: string | null;
  business_instagram: string | null;
  whatsapp_business: string | null;
  professional_email: string | null;
  ai_summary: string | null;
  bio_text: string | null;
  pro_photo_url: string | null;
  search_keywords: string[] | null;
  accepts_professional_contact: boolean;
  relevanceScore: number;
  completenessScore: number;
  hasQuickContact: boolean;
  isFeaturedProfile: boolean;
};

type SortOption =
  | "relevance"
  | "city_asc"
  | "city_desc"
  | "industry_asc"
  | "industry_desc"
  | "name_asc"
  | "name_desc";

function normalizeSort(value: string | undefined): SortOption {
  const sort = String(value || "").trim().toLowerCase();

  if (
    sort === "city_asc" ||
    sort === "city_desc" ||
    sort === "industry_asc" ||
    sort === "industry_desc" ||
    sort === "name_asc" ||
    sort === "name_desc"
  ) {
    return sort;
  }

  return "relevance";
}

function sortLabel(sort: SortOption): string {
  if (sort === "name_asc") return "Nome A-Z";
  if (sort === "name_desc") return "Nome Z-A";
  if (sort === "city_asc") return "Cidade A-Z";
  if (sort === "city_desc") return "Cidade Z-A";
  if (sort === "industry_asc") return "Área A-Z";
  if (sort === "industry_desc") return "Área Z-A";

  return "Relevância";
}

function pageContainerStyle(): CSSProperties {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "16px 12px 44px",
    color: "#F8FAFC",
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.16)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.74), rgba(255,255,255,0.025))",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
  };
}

function heroStyle(): CSSProperties {
  return {
    marginTop: 24,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "radial-gradient(circle at 18% 10%, rgba(37,99,235,0.20), transparent 34%), radial-gradient(circle at 88% 8%, rgba(79,70,229,0.18), transparent 34%), linear-gradient(135deg, rgba(15,23,42,0.98), rgba(3,7,18,0.98))",
    borderRadius: 28,
    padding: "24px 18px",
    display: "grid",
    gap: 18,
    boxShadow: "0 24px 74px rgba(0,0,0,0.36)",
  };
}

function formGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  };
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(15,23,42,0.72)",
    color: "#F8FAFC",
    outline: "none",
    boxSizing: "border-box",
  };
}

function selectStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(15,23,42,0.72)",
    color: "#F8FAFC",
    outline: "none",
    colorScheme: "dark",
    boxSizing: "border-box",
  };
}

function optionStyle(): CSSProperties {
  return {
    background: "#0F172A",
    color: "#F8FAFC",
  };
}

function buttonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(15,23,42,0.72)",
    color: "#F8FAFC",
    textDecoration: "none",
    fontWeight: 800,
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    border: "1px solid rgba(96,165,250,0.34)",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.94), rgba(30,64,175,0.96))",
    boxShadow: "0 14px 36px rgba(37,99,235,0.20)",
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    color: "rgba(191,219,254,0.94)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.02em",
  };
}

function quickBadgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    color: "rgba(203,213,225,0.86)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.015em",
  };
}

function keywordChipStyle(isMatched = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 10px",
    borderRadius: 999,
    border: isMatched
      ? "1px solid rgba(45,212,191,0.52)"
      : "1px solid rgba(96,165,250,0.24)",
    background: isMatched
      ? "linear-gradient(135deg, rgba(20,184,166,0.22), rgba(37,99,235,0.14))"
      : "rgba(30,64,175,0.18)",
    color: isMatched ? "#A7F3D0" : "#BFDBFE",
    fontSize: 12,
    fontWeight: 850,
    lineHeight: 1.1,
    boxShadow: isMatched ? "0 10px 24px rgba(20,184,166,0.12)" : "none",
  };
}

function cardStyle(isFeatured = false): CSSProperties {
  return {
    border: isFeatured
      ? "1px solid rgba(37,99,235,0.30)"
      : "1px solid rgba(148,163,184,0.16)",
    background: isFeatured
      ? "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.05))"
      : "linear-gradient(135deg, rgba(15,23,42,0.72), rgba(255,255,255,0.025))",
    borderRadius: 22,
    padding: 17,
    display: "grid",
    gap: 15,
    boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
  };
}

function statCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.16)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.72), rgba(255,255,255,0.025))",
    borderRadius: 20,
    padding: 16,
    display: "grid",
    gap: 7,
    boxShadow: "0 14px 34px rgba(0,0,0,0.20)",
  };
}

function infoGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  };
}

function infoCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.52)",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
  };
}

function actionGroupStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  };
}

function carouselCardStyle(): CSSProperties {
  return {
    minWidth: 174,
    maxWidth: 174,
    scrollSnapAlign: "start",
    border: "1px solid rgba(96,165,250,0.18)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.58))",
    borderRadius: 16,
    padding: 13,
    display: "grid",
    justifyItems: "center",
    gap: 9,
    color: "#F8FAFC",
    textDecoration: "none",
    boxShadow: "0 14px 30px rgba(0,0,0,0.20)",
  };
}

function carouselPhotoStyle(): CSSProperties {
  return {
    width: 78,
    height: 78,
    borderRadius: 999,
    objectFit: "cover",
    border: "2px solid rgba(96,165,250,0.38)",
    boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
  };
}

function carouselActionStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 32,
    borderRadius: 10,
    background: "linear-gradient(135deg, rgba(37,99,235,0.94), rgba(30,64,175,0.96))",
    color: "#F8FAFC",
    fontWeight: 900,
    fontSize: 12,
  };
}

function carouselInfoPillStyle(isMatched = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "100%",
    padding: "4px 7px",
    borderRadius: 999,
    border: isMatched
      ? "1px solid rgba(45,212,191,0.54)"
      : "1px solid rgba(96,165,250,0.30)",
    background: isMatched ? "rgba(20,184,166,0.14)" : "rgba(37,99,235,0.13)",
    color: isMatched ? "#A7F3D0" : "#BFDBFE",
    fontSize: 10.5,
    fontWeight: 900,
    lineHeight: 1.12,
    textAlign: "center",
  };
}

function carouselContextStyle(): CSSProperties {
  return {
    color: "rgba(203,213,225,0.82)",
    fontSize: 11.5,
    lineHeight: 1.22,
    textAlign: "center",
  };
}

function statusSealStyle(kind: "complete" | "quick_contact" | "featured"): CSSProperties {
  if (kind === "featured") {
    return {
      display: "inline-block",
      color: "rgba(191,219,254,0.96)",
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: "0.02em",
    };
  }

  if (kind === "quick_contact") {
    return {
      display: "inline-block",
      color: "rgba(165,180,252,0.94)",
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: "0.02em",
    };
  }

  return {
    display: "inline-block",
    color: "rgba(203,213,225,0.86)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.02em",
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizedLower(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase();
}

function limitText(value: string | null | undefined, max = 150): string {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function buildSummary(item: NetworkProfileItem): string {
  const aiSummary = normalizeText(item.ai_summary);
  if (aiSummary) return limitText(aiSummary, 170);

  const services = normalizeText(item.services);
  if (services) return limitText(services, 170);

  const bioText = normalizeText(item.bio_text);
  if (bioText) return limitText(bioText, 170);

  const lookingFor = normalizeText(item.looking_for);
  if (lookingFor) return `Busca atual: ${limitText(lookingFor, 150)}`;

  return "Perfil profissional disponível para novas conexões.";
}

function buildProfileName(label: string | null, profession: string | null): string {
  const safeLabel = normalizeText(label);
  const safeProfession = normalizeText(profession);

  if (safeLabel) return safeLabel;
  if (safeProfession) return safeProfession;
  return "Perfil profissional";
}

function includesSearch(haystack: string | null | undefined, query: string): boolean {
  return normalizedLower(haystack).includes(query);
}

function normalizeKeywordList(value: string[] | null | undefined): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value ?? []) {
    const keyword = normalizeText(item);
    const key = keyword.toLowerCase();

    if (!keyword || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(keyword);
  }

  return normalized.slice(0, 10);
}

function includesKeywordSearch(
  keywords: string[] | null | undefined,
  query: string
): boolean {
  if (!query) return false;

  const normalizedKeywords = normalizeKeywordList(keywords).map((keyword) =>
    keyword.toLowerCase()
  );

  return normalizedKeywords.some((keyword) => keyword.includes(query));
}

function keywordMatchesCurrentSearch(keyword: string, query: string): boolean {
  const normalizedKeyword = normalizedLower(keyword);
  const normalizedQuery = normalizedLower(query);

  if (!normalizedKeyword || !normalizedQuery) {
    return false;
  }

  if (
    normalizedKeyword === normalizedQuery ||
    normalizedKeyword.startsWith(normalizedQuery) ||
    normalizedKeyword.includes(normalizedQuery)
  ) {
    return true;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  return (
    queryTokens.length > 1 &&
    queryTokens.every((token) => normalizedKeyword.includes(token))
  );
}

function computeKeywordRelevanceBonus(
  keywords: string[] | null | undefined,
  query: string
): number {
  const normalizedKeywords = normalizeKeywordList(keywords).map((keyword) =>
    keyword.toLowerCase()
  );

  if (normalizedKeywords.length === 0) {
    return 0;
  }

  let bonus = Math.min(normalizedKeywords.length, 10) * 2;

  if (!query) {
    return bonus;
  }

  const keywordBlob = normalizedKeywords.join(" " );
  const queryTokens = query.split(" " ).filter(Boolean);

  if (normalizedKeywords.some((keyword) => keyword === query)) {
    bonus += 70;
  } else if (normalizedKeywords.some((keyword) => keyword.startsWith(query))) {
    bonus += 52;
  } else if (normalizedKeywords.some((keyword) => keyword.includes(query))) {
    bonus += 40;
  } else if (queryTokens.length > 1 && queryTokens.every((token) => keywordBlob.includes(token))) {
    bonus += 26;
  }

  return bonus;
}

function computeCompletenessScore(
  item: Omit<
    NetworkProfileItem,
    "relevanceScore" | "completenessScore" | "hasQuickContact" | "isFeaturedProfile"
  >
): number {
  let score = 0;

  if (normalizeText(item.profession)) score += 1;
  if (normalizeText(item.company_name)) score += 1;
  if (normalizeText(item.industry)) score += 1;
  if (normalizeText(item.city)) score += 1;
  if (normalizeText(item.services)) score += 1;
  if (normalizeText(item.looking_for)) score += 1;
  if (normalizeText(item.ai_summary)) score += 1;
  if (normalizeText(item.pro_photo_url)) score += 1;
  if (item.accepts_professional_contact) score += 1;
  if (normalizeText(item.whatsapp_business)) score += 1;
  if (normalizeKeywordList(item.search_keywords).length >= 3) score += 1;

  return score;
}

function computeRelevanceScore(
  item: Omit<
    NetworkProfileItem,
    "relevanceScore" | "completenessScore" | "hasQuickContact" | "isFeaturedProfile"
  >,
  query: string,
  cityFilter: string,
  industryFilter: string
): number {
  let score = 0;

  if (normalizeText(item.profession)) score += 10;
  if (normalizeText(item.company_name)) score += 8;
  if (normalizeText(item.industry)) score += 8;
  if (normalizeText(item.city)) score += 6;
  if (normalizeText(item.services)) score += 12;
  if (normalizeText(item.looking_for)) score += 10;
  if (normalizeText(item.ai_summary)) score += 14;
  if (normalizeText(item.pro_photo_url)) score += 15;

  score += computeKeywordRelevanceBonus(item.search_keywords, query);

  if (item.accepts_professional_contact) score += 10;
  if (normalizeText(item.whatsapp_business)) score += 20;
  if (normalizeText(item.professional_email)) score += 6;
  if (normalizeText(item.linkedin)) score += 5;
  if (normalizeText(item.website)) score += 5;
  if (normalizeText(item.portfolio)) score += 4;

  if (query) {
    const profileName = normalizedLower(item.profile_name);
    const profession = normalizedLower(item.profession);
    const companyName = normalizedLower(item.company_name);
    const industry = normalizedLower(item.industry);
    const city = normalizedLower(item.city);
    const services = normalizedLower(item.services);
    const lookingFor = normalizedLower(item.looking_for);
    const aiSummary = normalizedLower(item.ai_summary);

    if (profileName.includes(query)) score += 40;
    if (profession.includes(query)) score += 35;
    if (companyName.includes(query)) score += 25;
    if (industry.includes(query)) score += 18;
    if (city.includes(query)) score += 12;
    if (services.includes(query)) score += 16;
    if (lookingFor.includes(query)) score += 12;
    if (aiSummary.includes(query)) score += 14;
  }

  if (cityFilter && includesSearch(item.city, cityFilter)) score += 20;
  if (industryFilter && includesSearch(item.industry, industryFilter)) score += 20;

  return score;
}

function compareTextAsc(a: string | null | undefined, b: string | null | undefined): number {
  return normalizeText(a).localeCompare(normalizeText(b), "pt-BR");
}

function sortItems(items: NetworkProfileItem[], sort: SortOption): NetworkProfileItem[] {
  const sorted = [...items];

  if (sort === "city_asc") {
    sorted.sort((a, b) => {
      const cityDiff = compareTextAsc(a.city, b.city);
      if (cityDiff !== 0) return cityDiff;
      return compareTextAsc(a.profile_name, b.profile_name);
    });
    return sorted;
  }

  if (sort === "city_desc") {
    sorted.sort((a, b) => {
      const cityDiff = compareTextAsc(b.city, a.city);
      if (cityDiff !== 0) return cityDiff;
      return compareTextAsc(a.profile_name, b.profile_name);
    });
    return sorted;
  }

  if (sort === "industry_asc") {
    sorted.sort((a, b) => {
      const industryDiff = compareTextAsc(a.industry, b.industry);
      if (industryDiff !== 0) return industryDiff;
      return compareTextAsc(a.profile_name, b.profile_name);
    });
    return sorted;
  }

  if (sort === "industry_desc") {
    sorted.sort((a, b) => {
      const industryDiff = compareTextAsc(b.industry, a.industry);
      if (industryDiff !== 0) return industryDiff;
      return compareTextAsc(a.profile_name, b.profile_name);
    });
    return sorted;
  }

  if (sort === "name_asc") {
    sorted.sort((a, b) => compareTextAsc(a.profile_name, b.profile_name));
    return sorted;
  }

  if (sort === "name_desc") {
    sorted.sort((a, b) => compareTextAsc(b.profile_name, a.profile_name));
    return sorted;
  }

  sorted.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }

    if (b.completenessScore !== a.completenessScore) {
      return b.completenessScore - a.completenessScore;
    }

    if (normalizeText(b.whatsapp_business) !== normalizeText(a.whatsapp_business)) {
      return normalizeText(b.whatsapp_business) ? 1 : -1;
    }

    return compareTextAsc(a.profile_name, b.profile_name);
  });

  return sorted;
}

function getAvailabilityText(item: NetworkProfileItem): string {
  if (item.accepts_professional_contact && item.whatsapp_business) {
    return "Conexão profissional e WhatsApp disponíveis.";
  }

  if (item.accepts_professional_contact && item.professional_email) {
    return "Conexão profissional e e-mail disponíveis.";
  }

  if (item.accepts_professional_contact) {
    return "Conexão profissional disponível.";
  }

  if (item.website || item.linkedin || item.portfolio || item.business_instagram) {
    return "Canais profissionais disponíveis para avaliação.";
  }

  return "Perfil visível para descoberta na rede.";
}

function getPrimaryValueText(item: NetworkProfileItem): string {
  const services = normalizeText(item.services);
  if (services) return limitText(services, 95);

  const aiSummary = normalizeText(item.ai_summary);
  if (aiSummary) return limitText(aiSummary, 95);

  const bioText = normalizeText(item.bio_text);
  if (bioText) return limitText(bioText, 95);

  return "Perfil profissional preparado para iniciar novas conversas.";
}

function getCurrentGoalText(item: NetworkProfileItem): string {
  const lookingFor = normalizeText(item.looking_for);
  if (lookingFor) return limitText(lookingFor, 95);

  if (item.industry) return item.industry;
  if (item.city) return `Atuação em ${item.city}`;
  return "Aberto a novas conexões";
}

function getQuickBadges(item: NetworkProfileItem): string[] {
  const badges: string[] = [];

  if (item.accepts_professional_contact) {
    badges.push("Conexão disponível");
  }

  if (item.whatsapp_business) {
    badges.push("WhatsApp");
  }

  if (item.profession) {
    badges.push(item.profession);
  }

  if (item.industry) {
    badges.push(item.industry);
  }

  if (item.city) {
    badges.push(item.city);
  }

  return badges.slice(0, 4);
}


function buildNetworkReturnPath(
  qRaw: string,
  cityRaw: string,
  industryRaw: string,
  sort: SortOption
): string {
  const params = new URLSearchParams();

  if (qRaw) params.set("q", qRaw);
  if (cityRaw) params.set("city", cityRaw);
  if (industryRaw) params.set("industry", industryRaw);

  params.set("sort", sort);

  const query = params.toString();
  return query ? `/network?${query}` : "/network";
}

function buildProProfileHref(slug: string, returnPath: string): string {
  return `/pro/${slug}?from=network&returnTo=${encodeURIComponent(returnPath)}`;
}

function getSecondaryChannels(item: NetworkProfileItem): Array<{ label: string; href: string }> {
  const channels: Array<{ label: string; href: string }> = [];

  if (item.linkedin) {
    channels.push({ label: "LinkedIn", href: item.linkedin });
  }

  if (item.website) {
    channels.push({ label: "Website", href: item.website });
  }

  if (item.portfolio) {
    channels.push({ label: "Portfólio", href: item.portfolio });
  }

  if (item.business_instagram) {
    channels.push({ label: "Instagram", href: item.business_instagram });
  }

  return channels.slice(0, 3);
}

// v4.4.8-pro-profile-return-to-network
export default async function NetworkPage({ searchParams }: PageProps) {
  const qp = searchParams ? await searchParams : undefined;

  const qRaw = normalizeText(qp?.q);
  const q = qRaw.toLowerCase();
  const cityRaw = normalizeText(qp?.city);
  const industryRaw = normalizeText(qp?.industry);
  const cityFilter = cityRaw.toLowerCase();
  const industryFilter = industryRaw.toLowerCase();
  const sort = normalizeSort(qp?.sort);

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentUserId = user.id;

  const { data: controlRows } = await supabase
    .from("professional_relationship_controls")
    .select("owner_user_id, target_user_id, status")
    .eq("owner_user_id", currentUserId);

  const controls = (controlRows ?? []) as RelationshipControlRow[];

  const hiddenUserIds = new Set(
    controls
      .filter((row) => row.status === "suspended" || row.status === "blocked")
      .map((row) => row.target_user_id)
  );

  const { data: profileRows } = await supabase
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
      search_keywords,
      accepts_professional_contact,
      visible_in_network
    `)
    .eq("visible_in_network", true);

  const profiles = ((profileRows ?? []) as ProfessionalProfileRow[])
    .filter((profile) => profile.user_id !== currentUserId)
    .filter((profile) => !hiddenUserIds.has(profile.user_id));

  const profileUserIds = profiles.map((profile) => profile.user_id);

  let cards: CardRow[] = [];

  if (profileUserIds.length > 0) {
    const { data: cardRows } = await supabase
      .from("cards")
      .select("user_id, slug, label, is_published")
      .in("user_id", profileUserIds)
      .eq("is_published", true);

    cards = ((cardRows ?? []) as CardRow[]).filter((card) => !!card.slug);
  }

  const cardByUserId = new Map<string, CardRow>();
  for (const card of cards) {
    if (!cardByUserId.has(card.user_id)) {
      cardByUserId.set(card.user_id, card);
    }
  }

  const baseItems = profiles
    .map((profile) => {
      const card = cardByUserId.get(profile.user_id);
      if (!card?.slug) return null;

      return {
        user_id: profile.user_id,
        slug: card.slug,
        profile_name: buildProfileName(card.label, profile.profession),
        profession: profile.profession,
        company_name: profile.company_name,
        industry: profile.industry,
        city: profile.city,
        services: profile.services,
        looking_for: profile.looking_for,
        website: profile.website,
        portfolio: profile.portfolio,
        linkedin: profile.linkedin,
        business_instagram: profile.business_instagram,
        whatsapp_business: profile.whatsapp_business,
        professional_email: profile.professional_email,
        ai_summary: profile.ai_summary,
        bio_text: profile.bio_text,
        pro_photo_url: profile.pro_photo_url,
        search_keywords: profile.search_keywords,
        accepts_professional_contact: profile.accepts_professional_contact,
      };
    })
    .filter(Boolean) as Omit<
    NetworkProfileItem,
    "relevanceScore" | "completenessScore" | "hasQuickContact" | "isFeaturedProfile"
  >[];

  const items: NetworkProfileItem[] = baseItems.map((item) => {
    const completenessScore = computeCompletenessScore(item);
    const hasQuickContact = !!normalizeText(item.whatsapp_business);
    const relevanceScore = computeRelevanceScore(item, q, cityFilter, industryFilter);

    return {
      ...item,
      relevanceScore,
      completenessScore,
      hasQuickContact,
      isFeaturedProfile: false,
    };
  });

  const filteredItems = items.filter((item) => {
    const matchesQ =
      !q ||
      includesSearch(item.profile_name, q) ||
      includesSearch(item.profession, q) ||
      includesSearch(item.company_name, q) ||
      includesSearch(item.industry, q) ||
      includesSearch(item.city, q) ||
      includesSearch(item.services, q) ||
      includesSearch(item.looking_for, q) ||
      includesSearch(item.ai_summary, q) ||
      includesSearch(item.bio_text, q) ||
      includesKeywordSearch(item.search_keywords, q);

    const matchesCity = !cityFilter || includesSearch(item.city, cityFilter);
    const matchesIndustry =
      !industryFilter || includesSearch(item.industry, industryFilter);

    return matchesQ && matchesCity && matchesIndustry;
  });

  const sortedItems = sortItems(filteredItems, sort).map((item, index) => ({
    ...item,
    isFeaturedProfile: index === 0 && sort === "relevance",
  }));

  const currentSortLabel = sortLabel(sort);
  const networkReturnPath = buildNetworkReturnPath(qRaw, cityRaw, industryRaw, sort);

  const uniqueCities = Array.from(
    new Set(items.map((item) => normalizeText(item.city)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const uniqueIndustries = Array.from(
    new Set(items.map((item) => normalizeText(item.industry)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <main style={pageContainerStyle()}>
      <style>{`
        .network-result-card-mobile-polish {
          scroll-margin-top: 24px;
        }

        .network-result-card-title {
          overflow-wrap: anywhere;
        }

        .network-carousel-mobile-polish {
          scroll-margin-top: 20px;
        }

        .network-profile-carousel {
          scrollbar-width: thin;
          scrollbar-color: rgba(96,165,250,0.42) rgba(15,23,42,0.30);
        }

        .network-profile-carousel::-webkit-scrollbar {
          height: 8px;
        }

        .network-profile-carousel::-webkit-scrollbar-track {
          background: rgba(15,23,42,0.30);
          border-radius: 999px;
        }

        .network-profile-carousel::-webkit-scrollbar-thumb {
          background: rgba(96,165,250,0.42);
          border-radius: 999px;
        }

        .network-carousel-card-title {
          overflow-wrap: anywhere;
        }

        .network-mobile-sort-chip {
          display: none;
        }

        @media (max-width: 720px) {
          .network-stats-section {
            margin-top: 16px !important;
            display: grid !important;
            gap: 9px !important;
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .network-mobile-sort-chip {
            display: inline-flex !important;
          }

          .network-stats-track {
            display: flex !important;
            gap: 9px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 1px 2px 9px !important;
            scroll-snap-type: x proximity !important;
            scrollbar-width: none !important;
          }

          .network-stats-track::-webkit-scrollbar {
            display: none !important;
          }

          .network-stat-card-mobile {
            min-width: 132px !important;
            max-width: 142px !important;
            padding: 10px !important;
            border-radius: 15px !important;
            gap: 4px !important;
            scroll-snap-align: start !important;
            box-shadow: 0 10px 24px rgba(0,0,0,0.18) !important;
          }

          .network-stat-label {
            font-size: 9.5px !important;
            letter-spacing: 0.035em !important;
            line-height: 1.1 !important;
          }

          .network-stat-value {
            font-size: 24px !important;
            line-height: 1 !important;
          }

          .network-stat-description {
            font-size: 10.5px !important;
            line-height: 1.28 !important;
          }

          .network-stat-sort-card {
            display: none !important;
          }

          .network-carousel-mobile-polish {
            gap: 10px !important;
            margin-top: 18px !important;
          }

          .network-profile-carousel {
            gap: 10px !important;
            padding: 2px 2px 10px !important;
            scrollbar-width: none !important;
          }

          .network-profile-carousel::-webkit-scrollbar {
            display: none !important;
          }

          .network-profile-carousel-card {
            min-width: 158px !important;
            max-width: 158px !important;
            padding: 11px !important;
            border-radius: 16px !important;
            gap: 7px !important;
          }

          .network-carousel-photo {
            width: 70px !important;
            height: 70px !important;
          }

          .network-carousel-card-title {
            font-size: 13px !important;
            min-height: 28px !important;
          }

          .network-carousel-context {
            font-size: 10.5px !important;
          }

          .network-carousel-match {
            font-size: 10px !important;
            padding: 4px 6px !important;
          }

          .network-carousel-action {
            min-height: 30px !important;
            font-size: 11px !important;
          }

          .network-results-list {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 14px !important;
          }

          .network-result-card-mobile-polish {
            padding: 14px !important;
            border-radius: 20px !important;
            gap: 12px !important;
          }

          .network-result-card-header {
            align-items: flex-start !important;
            gap: 10px !important;
          }

          .network-result-photo {
            width: 58px !important;
            height: 58px !important;
            border-radius: 16px !important;
          }

          .network-result-copy {
            gap: 5px !important;
          }

          .network-result-card-title {
            font-size: 19px !important;
            line-height: 1.12 !important;
          }

          .network-result-badges {
            gap: 6px !important;
          }

          .network-result-summary {
            font-size: 14px !important;
            line-height: 1.48 !important;
          }

          .network-keywords-box {
            padding: 11px !important;
            border-radius: 15px !important;
            gap: 8px !important;
          }

          .network-keywords-header {
            gap: 6px !important;
          }

          .network-keyword-chips {
            gap: 6px !important;
          }

          .network-info-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 8px !important;
          }

          .network-info-card {
            padding: 10px !important;
            border-radius: 14px !important;
          }

          .network-primary-actions {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 8px !important;
          }

          .network-primary-actions a,
          .network-primary-actions button {
            width: 100% !important;
            min-height: 42px !important;
            padding: 10px 12px !important;
          }

          .network-secondary-actions {
            gap: 8px !important;
          }

          .network-secondary-actions a {
            min-height: 38px !important;
            padding: 8px 11px !important;
          }
        }

        @media (max-width: 480px) {
          .network-result-card-mobile-polish {
            padding: 13px !important;
          }

          .network-result-photo {
            width: 52px !important;
            height: 52px !important;
            border-radius: 14px !important;
          }

          .network-result-card-title {
            font-size: 18px !important;
          }
        }
      `}</style>

      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          Descobrir profissionais
        </h1>

        <p style={{ margin: 0, opacity: 0.82, maxWidth: 900, lineHeight: 1.6 }}>
          Encontre profissionais ativos na rede, filtre por atuação e abra
          conversas com mais contexto.
        </p>

        <div style={{ marginTop: 8 }}>
          <Link href="/dashboard" style={{ color: "#BFDBFE", textDecoration: "none", fontWeight: 800 }}>
            Voltar à central
          </Link>
        </div>
      </header>

      <section style={heroStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <span style={badgeStyle()}>Área profissional</span>

          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
            Profissionais disponíveis para novas conexões
          </div>

          <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.6, maxWidth: 860 }}>
            Esta página mostra apenas perfis ativos na rede profissional. Contatos
            pausados ou bloqueados por você não aparecem aqui.
          </p>
        </div>

        <form method="GET" style={{ display: "grid", gap: 12 }}>
          <div style={formGridStyle()}>
            <input
              type="text"
              name="q"
              defaultValue={qRaw}
              placeholder="Buscar por nome, atuação, empresa, cidade ou oferta"
              style={inputStyle()}
            />

            <select
              name="city"
              defaultValue={cityRaw}
              style={selectStyle()}
            >
              <option value="" style={optionStyle()}>
                Todas as cidades
              </option>
              {uniqueCities.map((city) => (
                <option key={city} value={city} style={optionStyle()}>
                  {city}
                </option>
              ))}
            </select>

            <select
              name="industry"
              defaultValue={industryRaw}
              style={selectStyle()}
            >
              <option value="" style={optionStyle()}>
                Todas as áreas
              </option>
              {uniqueIndustries.map((industry) => (
                <option key={industry} value={industry} style={optionStyle()}>
                  {industry}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={sort}
              style={selectStyle()}
            >
              <option value="relevance" style={optionStyle()}>
                Ordenar por relevância
              </option>
              <option value="name_asc" style={optionStyle()}>
                Nome de A a Z
              </option>
              <option value="name_desc" style={optionStyle()}>
                Nome de Z a A
              </option>
              <option value="city_asc" style={optionStyle()}>
                Cidade de A a Z
              </option>
              <option value="city_desc" style={optionStyle()}>
                Cidade de Z a A
              </option>
              <option value="industry_asc" style={optionStyle()}>
                Área de A a Z
              </option>
              <option value="industry_desc" style={optionStyle()}>
                Área de Z a A
              </option>
            </select>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="submit" style={primaryButtonStyle()}>
              Aplicar busca
            </button>

            <Link href="/network" style={buttonStyle()}>
              Limpar filtros
            </Link>

            <Link href="/network/connections" style={buttonStyle()}>
              Ver minhas conexões
            </Link>
          </div>
        </form>
      </section>

      <section
        className="network-stats-section"
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div
          className="network-mobile-sort-chip"
          style={{
            alignItems: "center",
            width: "fit-content",
            padding: "7px 10px",
            borderRadius: 999,
            border: "1px solid rgba(96,165,250,0.22)",
            background: "rgba(15,23,42,0.68)",
            color: "#BFDBFE",
            fontSize: 11,
            fontWeight: 850,
            lineHeight: 1,
          }}
        >
          Ordenando por: {currentSortLabel}
        </div>

        <div className="network-stats-track" style={{ display: "contents" }}>
          <div className="network-stat-card-mobile" style={statCardStyle()}>
            <div className="network-stat-label" style={{ fontSize: 12, opacity: 0.72 }}>
              PERFIS VISÍVEIS
            </div>
            <div className="network-stat-value" style={{ fontSize: 34, fontWeight: 900 }}>
              {items.length}
            </div>
            <div className="network-stat-description" style={{ opacity: 0.8 }}>
              Disponíveis para descoberta
            </div>
          </div>

          <div className="network-stat-card-mobile" style={statCardStyle()}>
            <div className="network-stat-label" style={{ fontSize: 12, opacity: 0.72 }}>
              RESULTADO
            </div>
            <div className="network-stat-value" style={{ fontSize: 34, fontWeight: 900 }}>
              {sortedItems.length}
            </div>
            <div className="network-stat-description" style={{ opacity: 0.8 }}>
              Encontrados com os filtros
            </div>
          </div>

          <div className="network-stat-card-mobile" style={statCardStyle()}>
            <div className="network-stat-label" style={{ fontSize: 12, opacity: 0.72 }}>
              OCULTADOS
            </div>
            <div className="network-stat-value" style={{ fontSize: 34, fontWeight: 900 }}>
              {hiddenUserIds.size}
            </div>
            <div className="network-stat-description" style={{ opacity: 0.8 }}>
              Pausados ou bloqueados
            </div>
          </div>

          <div className="network-stat-card-mobile network-stat-sort-card" style={statCardStyle()}>
            <div className="network-stat-label" style={{ fontSize: 12, opacity: 0.72 }}>
              ORDEM ATUAL
            </div>
            <div className="network-stat-value" style={{ fontSize: 20, fontWeight: 900 }}>
              {currentSortLabel}
            </div>
            <div className="network-stat-description" style={{ opacity: 0.8 }}>
              Critério ativo na descoberta
            </div>
          </div>
        </div>
      </section>

      {sortedItems.length > 0 ? (
        <section
          className="network-carousel-mobile-polish"
          style={{
            marginTop: 24,
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 5 }}>
              <span style={badgeStyle()}>Descoberta rápida</span>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
                Profissionais disponíveis
              </h2>
              <p style={{ margin: 0, opacity: 0.74, lineHeight: 1.5 }}>
                Arraste para o lado e abra o perfil de quem combina com sua busca.
              </p>
            </div>

            <span style={{ color: "rgba(191,219,254,0.86)", fontSize: 13, fontWeight: 850 }}>
              {sortedItems.length} perfil{sortedItems.length > 1 ? "s" : ""}
            </span>
          </div>

          <div
            className="network-profile-carousel"
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              overscrollBehaviorX: "contain",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
              padding: "2px 2px 12px",
            }}
          >
            {sortedItems.map((item) => {
              const subtitle =
                normalizeText(item.profession) ||
                normalizeText(item.industry) ||
                "Perfil profissional";
              const companyOrCity =
                normalizeText(item.company_name) ||
                normalizeText(item.city) ||
                "Disponível na rede";
              const keywords = normalizeKeywordList(item.search_keywords);
              const matchedKeywords = q
                ? keywords.filter((keyword) => keywordMatchesCurrentSearch(keyword, q))
                : [];
              const featuredKeyword = matchedKeywords[0] || keywords[0] || "";
              const hasMatchedKeyword = !!featuredKeyword && matchedKeywords.includes(featuredKeyword);
              const contactLabel = item.accepts_professional_contact
                ? "Contato disponível"
                : "Perfil completo";

              return (
                <Link
                  key={`carousel-${item.user_id}`}
                  href={buildProProfileHref(item.slug, networkReturnPath)}
                  className="network-profile-carousel-card"
                  style={carouselCardStyle()}
                >
                  {item.pro_photo_url ? (
                    <img
                      src={item.pro_photo_url}
                      alt="Foto profissional"
                      className="network-carousel-photo"
                      style={carouselPhotoStyle()}
                    />
                  ) : (
                    <div
                      className="network-carousel-photo"
                      style={{
                        ...carouselPhotoStyle(),
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(15,23,42,0.72)",
                        fontWeight: 900,
                        objectFit: undefined,
                      }}
                    >
                      PRO
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 4, textAlign: "center", width: "100%" }}>
                    <strong
                      className="network-carousel-card-title"
                      style={{
                        fontSize: 15,
                        lineHeight: 1.14,
                        minHeight: 31,
                        display: "grid",
                        alignItems: "center",
                      }}
                    >
                      {limitText(item.profile_name, 34)}
                    </strong>

                    <span className="network-carousel-context" style={carouselContextStyle()}>
                      {limitText(subtitle, 30)}
                    </span>

                    <span className="network-carousel-context" style={carouselContextStyle()}>
                      {limitText(companyOrCity, 30)}
                    </span>
                  </div>

                  {featuredKeyword ? (
                    <span
                      className="network-carousel-match"
                      style={carouselInfoPillStyle(hasMatchedKeyword)}
                    >
                      {hasMatchedKeyword ? "Busca: " : "Tema: "}
                      {limitText(featuredKeyword, 24)}
                    </span>
                  ) : (
                    <span className="network-carousel-match" style={carouselInfoPillStyle(false)}>
                      {contactLabel}
                    </span>
                  )}

                  <span className="network-carousel-action" style={carouselActionStyle()}>
                    Ver perfil
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 32 }}>
        {sortedItems.length === 0 ? (
          <div style={panelStyle()}>
            <h2 style={{ marginTop: 0 }}>Nenhum perfil encontrado</h2>
            <p style={{ marginBottom: 0, opacity: 0.82, lineHeight: 1.6 }}>
              Ajuste a busca ou limpe os filtros para ver outros profissionais
              disponíveis na rede.
            </p>
          </div>
        ) : (
          <div
            className="network-results-list"
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            }}
          >
            {sortedItems.map((item) => {
              const quickBadges = getQuickBadges(item);
              const secondaryChannels = getSecondaryChannels(item);
              const profileKeywords = normalizeKeywordList(item.search_keywords);
              const matchedKeywords = profileKeywords.filter((keyword) =>
                keywordMatchesCurrentSearch(keyword, q)
              );
              const isCompleteProfile = item.completenessScore >= 8;

              return (
                <article
                  key={item.user_id}
                  className="network-result-card-mobile-polish"
                  style={cardStyle(item.isFeaturedProfile)}
                >
                  <div
                    className="network-result-card-header"
                    style={{ display: "flex", gap: 14, alignItems: "center" }}
                  >
                    {item.pro_photo_url ? (
                      <img
                        src={item.pro_photo_url}
                        alt="Foto profissional"
                        className="network-result-photo"
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 20,
                          objectFit: "cover",
                          border: "1px solid rgba(148,163,184,0.18)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        className="network-result-photo"
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 20,
                          border: "1px solid rgba(148,163,184,0.18)",
                          background: "rgba(15,23,42,0.56)",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          opacity: 0.75,
                          flexShrink: 0,
                        }}
                      >
                        PRO
                      </div>
                    )}

                    <div
                      className="network-result-copy"
                      style={{ display: "grid", gap: 6, minWidth: 0 }}
                    >
                      <div
                        className="network-result-badges"
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {item.isFeaturedProfile ? (
                          <span style={statusSealStyle("featured")}>Destaque da rede</span>
                        ) : null}

                        {item.hasQuickContact ? (
                          <span style={statusSealStyle("quick_contact")}>Contato rápido</span>
                        ) : null}

                        {isCompleteProfile ? (
                          <span style={statusSealStyle("complete")}>Perfil completo</span>
                        ) : null}
                      </div>

                      <div
                        className="network-result-card-title"
                        style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}
                      >
                        {item.profile_name}
                      </div>

                      {item.company_name ? (
                        <div style={{ opacity: 0.88, lineHeight: 1.4 }}>
                          {item.company_name}
                        </div>
                      ) : null}

                      {quickBadges.length > 0 ? (
                        <div
                          className="network-result-badges"
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {quickBadges.map((badge) => (
                            <span key={badge} style={badgeStyle()}>
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p
                    className="network-result-summary"
                    style={{ margin: 0, opacity: 0.92, lineHeight: 1.65 }}
                  >
                    {buildSummary(item)}
                  </p>

                  {profileKeywords.length > 0 ? (
                    <div
                      className="network-keywords-box"
                      style={{
                        border: "1px solid rgba(96,165,250,0.16)",
                        background: "rgba(15,23,42,0.40)",
                        borderRadius: 16,
                        padding: 13,
                        display: "grid",
                        gap: 9,
                      }}
                    >
                      <div
                        className="network-keywords-header"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: 13 }}>
                          {matchedKeywords.length > 0
                            ? "Encontrado por palavras-chave"
                            : "Temas profissionais"}
                        </strong>

                        {matchedKeywords.length > 0 ? (
                          <span style={{ color: "#A7F3D0", fontSize: 12, fontWeight: 850 }}>
                            {matchedKeywords.length} termo{matchedKeywords.length > 1 ? "s" : ""} ligado{matchedKeywords.length > 1 ? "s" : ""} à busca
                          </span>
                        ) : null}
                      </div>

                      <div
                        className="network-keyword-chips"
                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                      >
                        {profileKeywords.map((keyword) => {
                          const isMatched = keywordMatchesCurrentSearch(keyword, q);

                          return (
                            <span
                              key={`${item.user_id}-${keyword}`}
                              style={keywordChipStyle(isMatched)}
                            >
                              {keyword}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="network-info-grid" style={infoGridStyle()}>
                    <div className="network-info-card" style={infoCardStyle()}>
                      <strong style={{ fontSize: 14 }}>Entrega principal</strong>
                      <span style={{ opacity: 0.82, lineHeight: 1.55 }}>
                        {getPrimaryValueText(item)}
                      </span>
                    </div>

                    <div className="network-info-card" style={infoCardStyle()}>
                      <strong style={{ fontSize: 14 }}>Busca atual</strong>
                      <span style={{ opacity: 0.82, lineHeight: 1.55 }}>
                        {getCurrentGoalText(item)}
                      </span>
                    </div>

                    <div className="network-info-card" style={infoCardStyle()}>
                      <strong style={{ fontSize: 14 }}>Disponível agora</strong>
                      <span style={{ opacity: 0.82, lineHeight: 1.55 }}>
                        {getAvailabilityText(item)}
                      </span>
                    </div>
                  </div>

                  <div className="network-primary-actions" style={actionGroupStyle()}>
                    <Link href={buildProProfileHref(item.slug, networkReturnPath)} style={primaryButtonStyle()}>
                      Abrir perfil profissional
                    </Link>

                    <ProfessionalConnectButton targetUserId={item.user_id} />

                    {item.accepts_professional_contact && item.whatsapp_business ? (
                      <a
                        href={item.whatsapp_business}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={buttonStyle()}
                      >
                        Falar no WhatsApp
                      </a>
                    ) : null}
                  </div>

                  {secondaryChannels.length > 0 ? (
                    <div
                      className="network-secondary-actions"
                      style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
                    >
                      {secondaryChannels.map((channel) => (
                        <a
                          key={`${item.user_id}-${channel.label}`}
                          href={channel.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={buttonStyle()}
                        >
                          {channel.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}