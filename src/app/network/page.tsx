// src/app/network/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
  }>;
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
  visible_in_network: boolean;
  accepts_professional_contact: boolean;
};

type CardRow = {
  user_id: string;
  slug: string;
  label: string | null;
  is_published: boolean;
};

type NetworkItem = {
  user_id: string;
  slug: string;
  card_label: string | null;
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
};

function normalize(value: string | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function containerStyle(): CSSProperties {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 24,
  };
}

function sectionCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 18,
  };
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
  };
}

function buttonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    cursor: "pointer",
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
    opacity: 0.92,
  };
}

function profileCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    padding: 18,
    display: "grid",
    gap: 14,
  };
}

function getSummary(item: NetworkItem): string {
  if (item.ai_summary?.trim()) return item.ai_summary.trim();
  if (item.bio_text?.trim()) return item.bio_text.trim();
  if (item.services?.trim()) return item.services.trim();
  return "Perfil profissional disponível para networking dentro da rede.";
}

function includesText(item: NetworkItem, q: string): boolean {
  if (!q) return true;

  const haystack = [
    item.profession,
    item.company_name,
    item.industry,
    item.city,
    item.services,
    item.looking_for,
    item.bio_text,
    item.ai_summary,
  ]
    .map((x) => String(x || "").toLowerCase())
    .join(" ");

  return haystack.includes(q);
}

function cityMatches(item: NetworkItem, city: string): boolean {
  if (!city) return true;
  return String(item.city || "").trim().toLowerCase().includes(city);
}

export default async function NetworkPage({ searchParams }: PageProps) {
  const qp = searchParams ? await searchParams : undefined;
  const q = normalize(qp?.q);
  const city = normalize(qp?.city);

  const supabase = createPublicClient();

  const { data: professionalRows, error: professionalError } = await supabase
    .from("professional_profiles")
    .select(
      [
        "user_id",
        "profession",
        "company_name",
        "industry",
        "city",
        "services",
        "looking_for",
        "business_instagram",
        "website",
        "portfolio",
        "linkedin",
        "whatsapp_business",
        "professional_email",
        "bio_text",
        "ai_summary",
        "pro_photo_url",
        "visible_in_network",
        "accepts_professional_contact",
      ].join(",")
    )
    .eq("visible_in_network", true);

  const { data: cardsRows, error: cardsError } = await supabase
    .from("cards")
    .select("user_id, slug, label, is_published")
    .eq("is_published", true);

  const professionalProfiles = (professionalRows ?? []) as ProfessionalProfileRow[];
  const publishedCards = ((cardsRows ?? []) as CardRow[]).filter((c) => c.slug);

  const cardByUserId = new Map<string, CardRow>();
  for (const card of publishedCards) {
    if (!cardByUserId.has(card.user_id)) {
      cardByUserId.set(card.user_id, card);
    }
  }

  const items: NetworkItem[] = professionalProfiles
    .map((profile) => {
      const card = cardByUserId.get(profile.user_id);
      if (!card || !card.slug) return null;

      return {
        user_id: profile.user_id,
        slug: card.slug,
        card_label: card.label,
        profession: profile.profession,
        company_name: profile.company_name,
        industry: profile.industry,
        city: profile.city,
        services: profile.services,
        looking_for: profile.looking_for,
        business_instagram: profile.business_instagram,
        website: profile.website,
        portfolio: profile.portfolio,
        linkedin: profile.linkedin,
        whatsapp_business: profile.whatsapp_business,
        professional_email: profile.professional_email,
        bio_text: profile.bio_text,
        ai_summary: profile.ai_summary,
        pro_photo_url: profile.pro_photo_url,
        accepts_professional_contact: profile.accepts_professional_contact,
      };
    })
    .filter(Boolean) as NetworkItem[];

  const filteredItems = items
    .filter((item) => includesText(item, q))
    .filter((item) => cityMatches(item, city))
    .sort((a, b) => {
      const cityA = String(a.city || "").toLowerCase();
      const cityB = String(b.city || "").toLowerCase();
      return cityA.localeCompare(cityB);
    });

  return (
    <main style={containerStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          Network profissional
        </h1>

        <p style={{ margin: 0, opacity: 0.82, maxWidth: 860, lineHeight: 1.6 }}>
          Descubra profissionais da rede USECLUBBERS que escolheram aparecer
          publicamente no networking. Encontre pessoas por profissão, área de
          atuação ou cidade e abra diretamente o perfil profissional.
        </p>
      </header>

      <section style={{ ...sectionCardStyle(), marginTop: 22 }}>
        <form
          action="/network"
          method="get"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) auto",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span>Buscar por profissão, área ou empresa</span>
            <input
              type="text"
              name="q"
              defaultValue={qp?.q || ""}
              placeholder="Ex.: advogado, tecnologia, marketing, design"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span>Filtrar por cidade</span>
            <input
              type="text"
              name="city"
              defaultValue={qp?.city || ""}
              placeholder="Ex.: São Paulo"
              style={inputStyle()}
            />
          </label>

          <button type="submit" style={buttonStyle()}>
            Buscar
          </button>
        </form>

        <div style={{ marginTop: 14, opacity: 0.78, fontSize: 14 }}>
          {professionalError || cardsError ? (
            <span>
              Alguns dados podem não ter sido carregados corretamente.
            </span>
          ) : (
            <span>
              {filteredItems.length} perfil(is) encontrado(s) no networking.
            </span>
          )}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        {filteredItems.length === 0 ? (
          <div style={sectionCardStyle()}>
            <h2 style={{ marginTop: 0 }}>Nenhum perfil encontrado</h2>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Ajuste os filtros ou aguarde novos membros publicarem seus perfis
              profissionais na rede.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            {filteredItems.map((item) => (
              <article key={item.user_id} style={profileCardStyle()}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {item.pro_photo_url ? (
                    <img
                      src={item.pro_photo_url}
                      alt="Foto profissional"
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 18,
                        objectFit: "cover",
                        border: "1px solid rgba(255,255,255,0.12)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        opacity: 0.75,
                        flexShrink: 0,
                      }}
                    >
                      PRO
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>
                      {item.profession || item.card_label || "Perfil profissional"}
                    </div>

                    {item.company_name ? (
                      <div style={{ opacity: 0.88 }}>{item.company_name}</div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {item.industry ? (
                        <span style={badgeStyle()}>{item.industry}</span>
                      ) : null}
                      {item.city ? <span style={badgeStyle()}>{item.city}</span> : null}
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
                  {getSummary(item)}
                </p>

                {item.looking_for ? (
                  <div>
                    <strong>Busca na rede:</strong>{" "}
                    <span style={{ opacity: 0.9 }}>{item.looking_for}</span>
                  </div>
                ) : null}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Link
                    href={`/${item.slug}?mode=pro`}
                    style={buttonStyle()}
                  >
                    Abrir perfil profissional
                  </Link>

                  {item.website ? (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={buttonStyle()}
                    >
                      Website
                    </a>
                  ) : null}

                  {item.linkedin ? (
                    <a
                      href={item.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={buttonStyle()}
                    >
                      LinkedIn
                    </a>
                  ) : null}

                  {item.business_instagram ? (
                    <a
                      href={item.business_instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={buttonStyle()}
                    >
                      Instagram
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
