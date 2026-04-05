// src/app/network/connections/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type ConnectionRow = {
  requester_user_id: string;
  target_user_id: string;
  created_at: string;
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

type ConnectionItem = {
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
  created_at: string;
};

function pageContainerStyle(): CSSProperties {
  return {
    maxWidth: 1100,
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

function cardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    padding: 18,
    display: "grid",
    gap: 16,
  };
}

function buttonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(255,255,255,0.12)",
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getSummary(item: ConnectionItem): string {
  if (item.ai_summary?.trim()) return item.ai_summary.trim();
  if (item.bio_text?.trim()) return item.bio_text.trim();
  if (item.services?.trim()) return item.services.trim();
  return "Perfil profissional disponível para networking.";
}

function buildConnectionItems(
  connections: ConnectionRow[],
  lookupUserIdField: "requester_user_id" | "target_user_id",
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): ConnectionItem[] {
  return connections
    .map((connection) => {
      const lookupUserId = connection[lookupUserIdField];
      const profile = profileByUserId.get(lookupUserId);
      const card = cardByUserId.get(lookupUserId);

      if (!profile || !card || !card.slug) return null;

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
        created_at: connection.created_at,
      };
    })
    .filter(Boolean) as ConnectionItem[];
}

function ConnectionGrid({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: ConnectionItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <div style={panelStyle()}>
        <h2 style={{ marginTop: 0 }}>{emptyTitle}</h2>
        <p style={{ marginBottom: 0, opacity: 0.82 }}>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 18,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}
    >
      {items.map((item) => (
        <article key={`${item.user_id}-${item.created_at}`} style={cardStyle()}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {item.pro_photo_url ? (
              <img
                src={item.pro_photo_url}
                alt="Foto profissional"
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 18,
                  objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.12)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 76,
                  height: 76,
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

          <div style={{ fontSize: 13, opacity: 0.72 }}>
            Registro em: {formatDate(item.created_at)}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link
              href={`/${item.slug}?mode=pro`}
              style={primaryButtonStyle()}
            >
              Abrir perfil profissional
            </Link>

            {item.accepts_professional_contact && item.whatsapp_business ? (
              <a
                href={item.whatsapp_business}
                target="_blank"
                rel="noopener noreferrer"
                style={buttonStyle()}
              >
                WhatsApp
              </a>
            ) : null}

            {item.accepts_professional_contact && item.professional_email ? (
              <a
                href={`mailto:${item.professional_email}`}
                style={buttonStyle()}
              >
                E-mail
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
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function NetworkConnectionsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentUserId = user.id;

  const { data: incomingRows } = await supabase
    .from("professional_connections")
    .select("requester_user_id, target_user_id, created_at")
    .eq("target_user_id", currentUserId)
    .order("created_at", { ascending: false });

  const { data: outgoingRows } = await supabase
    .from("professional_connections")
    .select("requester_user_id, target_user_id, created_at")
    .eq("requester_user_id", currentUserId)
    .order("created_at", { ascending: false });

  const { data: controlRows } = await supabase
    .from("professional_relationship_controls")
    .select("owner_user_id, target_user_id, status")
    .eq("owner_user_id", currentUserId);

  const incomingConnections = (incomingRows ?? []) as ConnectionRow[];
  const outgoingConnections = (outgoingRows ?? []) as ConnectionRow[];
  const controls = (controlRows ?? []) as RelationshipControlRow[];

  const hiddenUserIds = new Set(
    controls
      .filter((row) => row.status === "suspended" || row.status === "blocked")
      .map((row) => row.target_user_id)
  );

  const visibleIncomingConnections = incomingConnections.filter(
    (row) => !hiddenUserIds.has(row.requester_user_id)
  );

  const visibleOutgoingConnections = outgoingConnections.filter(
    (row) => !hiddenUserIds.has(row.target_user_id)
  );

  const relatedUserIds = Array.from(
    new Set([
      ...visibleIncomingConnections.map((row) => row.requester_user_id),
      ...visibleOutgoingConnections.map((row) => row.target_user_id),
    ].filter(Boolean))
  );

  let profiles: ProfessionalProfileRow[] = [];
  let cards: CardRow[] = [];

  if (relatedUserIds.length > 0) {
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
      .in("user_id", relatedUserIds)
      .eq("visible_in_network", true);

    const { data: cardRows } = await supabase
      .from("cards")
      .select("user_id, slug, label, is_published")
      .in("user_id", relatedUserIds)
      .eq("is_published", true);

    profiles = (profileRows ?? []) as ProfessionalProfileRow[];
    cards = ((cardRows ?? []) as CardRow[]).filter((c) => c.slug);
  }

  const profileByUserId = new Map<string, ProfessionalProfileRow>();
  for (const profile of profiles) {
    profileByUserId.set(profile.user_id, profile);
  }

  const cardByUserId = new Map<string, CardRow>();
  for (const card of cards) {
    if (!cardByUserId.has(card.user_id)) {
      cardByUserId.set(card.user_id, card);
    }
  }

  const incomingItems = buildConnectionItems(
    visibleIncomingConnections,
    "requester_user_id",
    profileByUserId,
    cardByUserId
  );

  const outgoingItems = buildConnectionItems(
    visibleOutgoingConnections,
    "target_user_id",
    profileByUserId,
    cardByUserId
  );

  return (
    <main style={pageContainerStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          Minhas conexões
        </h1>

        <p style={{ margin: 0, opacity: 0.82, maxWidth: 880, lineHeight: 1.6 }}>
          Visualize os profissionais que se conectaram com você e também aqueles
          com quem você já se conectou dentro da rede USECLUBBERS.
        </p>
      </header>

      <section style={{ ...panelStyle(), marginTop: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.82 }}>
          {incomingItems.length} conexão(ões) recebida(s) •{" "}
          {outgoingItems.length} conexão(ões) iniciada(s)
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Conectaram comigo</h2>

        <ConnectionGrid
          items={incomingItems}
          emptyTitle="Ainda não há conexões recebidas"
          emptyDescription="Quando outros membros clicarem em conectar no seu perfil dentro da rede, eles aparecerão aqui."
        />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Conectei com</h2>

        <ConnectionGrid
          items={outgoingItems}
          emptyTitle="Você ainda não iniciou conexões"
          emptyDescription="Quando você clicar em conectar nos perfis da rede, eles aparecerão aqui."
        />
      </section>
    </main>
  );
}