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

function pageContainerStyle(): CSSProperties {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 24,
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    padding: 18,
  };
}

function heroStyle(): CSSProperties {
  return {
    marginTop: 24,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    borderRadius: 28,
    padding: 24,
    display: "grid",
    gap: 18,
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
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
  };
}

function selectStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    colorScheme: "dark",
  };
}

function optionStyle(): CSSProperties {
  return {
    background: "#111111",
    color: "#ffffff",
  };
}

function buttonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(255,255,255,0.14)",
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    opacity: 0.94,
  };
}

function quickBadgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.94,
  };
}

function cardStyle(isFeatured = false): CSSProperties {
  return {
    border: isFeatured
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid rgba(255,255,255,0.12)",
    background: isFeatured
      ? "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)"
      : "rgba(255,255,255,0.03)",
    borderRadius: 24,
    padding: 18,
    display: "grid",
    gap: 16,
    boxShadow: isFeatured ? "0 10px 28px rgba(0,0,0,0.16)" : "none",
  };
}

function statCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 6,
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
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
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

function statusSealStyle(kind: "complete" | "quick_contact" | "featured"): CSSProperties {
  if (kind === "featured") {
    return {
      display: "inline-block",
      padding: "7px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,184,0,0.28)",
      background: "rgba(255,184,0,0.10)",
      fontSize: 12,
      fontWeight: 800,
    };
  }

  if (kind === "quick_contact") {
    return {
      display: "inline-block",
      padding: "7px 10px",
      borderRadius: 999,
      border: "1px solid rgba(0,200,120,0.28)",
      background: "rgba(0,200,120,0.10)",
      fontSize: 12,
      fontWeight: 800,
    };
  }

  return {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 800,
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
      includesSearch(item.bio_text, q);

    const matchesCity = !cityFilter || includesSearch(item.city, cityFilter);
    const matchesIndustry =
      !industryFilter || includesSearch(item.industry, industryFilter);

    return matchesQ && matchesCity && matchesIndustry;
  });

  const sortedItems = sortItems(filteredItems, sort).map((item, index) => ({
    ...item,
    isFeaturedProfile: index === 0 && sort === "relevance",
  }));

  const uniqueCities = Array.from(
    new Set(items.map((item) => normalizeText(item.city)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const uniqueIndustries = Array.from(
    new Set(items.map((item) => normalizeText(item.industry)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <main style={pageContainerStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          Descobrir profissionais
        </h1>

        <p style={{ margin: 0, opacity: 0.82, maxWidth: 900, lineHeight: 1.6 }}>
          Encontre perfis profissionais ativos na rede, descubra novas conexões e
          abra conversas com mais rapidez.
        </p>

        <div style={{ marginTop: 8 }}>
          <Link href="/dashboard" style={{ textDecoration: "underline" }}>
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      <section style={heroStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <span style={badgeStyle()}>Busca profissional da rede</span>

          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
            Perfis visíveis para novas conexões
          </div>

          <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.6, maxWidth: 860 }}>
            Esta página mostra apenas perfis ativos na rede profissional. Perfis
            suspensos ou bloqueados por você não aparecem aqui.
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
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>PERFIS VISÍVEIS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{items.length}</div>
          <div style={{ opacity: 0.8 }}>Perfis disponíveis para descoberta</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>RESULTADO FILTRADO</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{sortedItems.length}</div>
          <div style={{ opacity: 0.8 }}>Perfis encontrados com os filtros atuais</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>OCULTADOS POR VOCÊ</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{hiddenUserIds.size}</div>
          <div style={{ opacity: 0.8 }}>Suspensos ou bloqueados fora da busca</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>ORDEM ATUAL</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {sort === "relevance" && "Relevância"}
            {sort === "name_asc" && "Nome A-Z"}
            {sort === "name_desc" && "Nome Z-A"}
            {sort === "city_asc" && "Cidade A-Z"}
            {sort === "city_desc" && "Cidade Z-A"}
            {sort === "industry_asc" && "Área A-Z"}
            {sort === "industry_desc" && "Área Z-A"}
          </div>
          <div style={{ opacity: 0.8 }}>Critério ativo na descoberta</div>
        </div>
      </section>

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
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            }}
          >
            {sortedItems.map((item) => {
              const quickBadges = getQuickBadges(item);
              const secondaryChannels = getSecondaryChannels(item);
              const isCompleteProfile = item.completenessScore >= 8;

              return (
                <article key={item.user_id} style={cardStyle(item.isFeaturedProfile)}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {item.pro_photo_url ? (
                      <img
                        src={item.pro_photo_url}
                        alt="Foto profissional"
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 20,
                          objectFit: "cover",
                          border: "1px solid rgba(255,255,255,0.12)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 20,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.05)",
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

                    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

                      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
                        {item.profile_name}
                      </div>

                      {item.company_name ? (
                        <div style={{ opacity: 0.88, lineHeight: 1.4 }}>
                          {item.company_name}
                        </div>
                      ) : null}

                      {quickBadges.length > 0 ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {quickBadges.map((badge) => (
                            <span key={badge} style={badgeStyle()}>
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p style={{ margin: 0, opacity: 0.92, lineHeight: 1.65 }}>
                    {buildSummary(item)}
                  </p>

                  <div style={infoGridStyle()}>
                    <div style={infoCardStyle()}>
                      <strong style={{ fontSize: 14 }}>Entrega principal</strong>
                      <span style={{ opacity: 0.82, lineHeight: 1.55 }}>
                        {getPrimaryValueText(item)}
                      </span>
                    </div>

                    <div style={infoCardStyle()}>
                      <strong style={{ fontSize: 14 }}>Busca atual</strong>
                      <span style={{ opacity: 0.82, lineHeight: 1.55 }}>
                        {getCurrentGoalText(item)}
                      </span>
                    </div>

                    <div style={infoCardStyle()}>
                      <strong style={{ fontSize: 14 }}>Disponível agora</strong>
                      <span style={{ opacity: 0.82, lineHeight: 1.55 }}>
                        {getAvailabilityText(item)}
                      </span>
                    </div>
                  </div>

                  <div style={actionGroupStyle()}>
                    <Link href={`/${item.slug}?mode=pro`} style={primaryButtonStyle()}>
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
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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