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

function pageShellStyle(): CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 18% 0%, rgba(37,99,235,0.24), transparent 30%), radial-gradient(circle at 86% 8%, rgba(20,184,166,0.12), transparent 30%), linear-gradient(180deg, #020617 0%, #030712 46%, #050505 100%)",
    color: "#F8FAFC",
  };
}

function pageContainerStyle(): CSSProperties {
  return {
    width: "100%",
    maxWidth: 780,
    margin: "0 auto",
    padding: "18px 14px 54px",
    boxSizing: "border-box",
  };
}

function heroStyle(): CSSProperties {
  return {
    border: "1px solid rgba(96,165,250,0.26)",
    background:
      "radial-gradient(circle at 12% 12%, rgba(37,99,235,0.30), transparent 32%), radial-gradient(circle at 88% 8%, rgba(79,70,229,0.22), transparent 34%), linear-gradient(135deg, rgba(15,23,42,0.98), rgba(3,7,18,0.98))",
    borderRadius: 28,
    padding: "22px 20px",
    display: "grid",
    gap: 18,
    boxShadow: "0 26px 82px rgba(0,0,0,0.42)",
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.82), rgba(255,255,255,0.025))",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 18px 48px rgba(0,0,0,0.30)",
  };
}

function cardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(255,255,255,0.025))",
    borderRadius: 24,
    padding: 18,
    display: "grid",
    gap: 16,
    boxShadow: "0 18px 48px rgba(0,0,0,0.30)",
  };
}

function statGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    marginTop: 14,
  };
}

function statCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(255,255,255,0.025))",
    borderRadius: 22,
    padding: 18,
    display: "grid",
    gap: 8,
    boxShadow: "0 16px 38px rgba(0,0,0,0.24)",
  };
}

function buttonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(15,23,42,0.78)",
    color: "#F8FAFC",
    textDecoration: "none",
    fontWeight: 900,
    lineHeight: 1.15,
    cursor: "pointer",
    boxSizing: "border-box",
    textAlign: "center",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    border: "1px solid rgba(96,165,250,0.42)",
    background: "linear-gradient(135deg, rgba(37,99,235,0.96), rgba(30,64,175,0.98))",
    boxShadow: "0 14px 36px rgba(37,99,235,0.24)",
  };
}

function actionGroupStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  };
}

function eyebrowStyle(): CSSProperties {
  return {
    margin: 0,
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: "0 0 16px",
    color: "#F8FAFC",
    fontSize: "clamp(1.55rem, 5vw, 2.1rem)",
    fontWeight: 950,
    letterSpacing: "-0.035em",
    lineHeight: 1.05,
  };
}

function textMutedStyle(): CSSProperties {
  return {
    margin: 0,
    color: "rgba(226,232,240,0.78)",
    lineHeight: 1.65,
  };
}

function photoStyle(): CSSProperties {
  return {
    width: 88,
    height: 88,
    borderRadius: 22,
    objectFit: "cover",
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(15,23,42,0.9)",
    flexShrink: 0,
  };
}

function emptyPhotoStyle(): CSSProperties {
  return {
    ...photoStyle(),
    display: "grid",
    placeItems: "center",
    color: "#93C5FD",
    fontWeight: 950,
    letterSpacing: "0.08em",
  };
}

function pillStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(96,165,250,0.26)",
    background: "rgba(30,64,175,0.22)",
    color: "rgba(219,234,254,0.96)",
    fontSize: 13,
    fontWeight: 850,
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
  return "Perfil profissional disponível para contato.";
}

function normalizeExternalUrl(value: string | null): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function normalizeWhatsapp(value: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (!digits.startsWith("55") && digits.length >= 10) {
    digits = `55${digits}`;
  }

  return `https://wa.me/${digits}`;
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

function ConnectionCard({ item }: { item: ConnectionItem }) {
  const whatsappUrl = item.accepts_professional_contact
    ? normalizeWhatsapp(item.whatsapp_business)
    : null;
  const emailUrl = item.accepts_professional_contact && item.professional_email
    ? `mailto:${item.professional_email}`
    : null;
  const linkedinUrl = normalizeExternalUrl(item.linkedin);
  const websiteUrl = normalizeExternalUrl(item.website);
  const portfolioUrl = normalizeExternalUrl(item.portfolio);
  const title = item.profession || item.card_label || "Perfil profissional";

  return (
    <article style={cardStyle()}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {item.pro_photo_url ? (
          <img src={item.pro_photo_url} alt="Foto profissional" style={photoStyle()} />
        ) : (
          <div style={emptyPhotoStyle()}>PRO</div>
        )}

        <div style={{ minWidth: 0, flex: "1 1 220px" }}>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: "clamp(1.45rem, 5.8vw, 1.95rem)",
              lineHeight: 1.08,
              fontWeight: 950,
              letterSpacing: "-0.035em",
            }}
          >
            {title}
          </h3>

          {item.company_name ? (
            <p style={{ margin: "0 0 8px", color: "rgba(226,232,240,0.88)", fontSize: 16 }}>
              {item.company_name}
            </p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {item.industry ? <span style={pillStyle()}>{item.industry}</span> : null}
            {item.city ? <span style={pillStyle()}>{item.city}</span> : null}
          </div>
        </div>
      </div>

      <p style={{ margin: 0, color: "rgba(248,250,252,0.92)", lineHeight: 1.65, fontSize: 16 }}>
        {getSummary(item)}
      </p>

      <p style={{ margin: 0, color: "rgba(147,197,253,0.90)", fontSize: 13, fontWeight: 750 }}>
        Registro em: {formatDate(item.created_at)}
      </p>

      <div style={actionGroupStyle()}>
        <Link href={`/pro/${item.slug}`} style={primaryButtonStyle()}>
          Abrir perfil profissional
        </Link>

        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noreferrer" style={buttonStyle()}>
            WhatsApp
          </a>
        ) : null}

        {emailUrl ? (
          <a href={emailUrl} style={buttonStyle()}>
            E-mail
          </a>
        ) : null}

        {linkedinUrl ? (
          <a href={linkedinUrl} target="_blank" rel="noreferrer" style={buttonStyle()}>
            LinkedIn
          </a>
        ) : null}

        {websiteUrl ? (
          <a href={websiteUrl} target="_blank" rel="noreferrer" style={buttonStyle()}>
            Website
          </a>
        ) : null}

        {!websiteUrl && portfolioUrl ? (
          <a href={portfolioUrl} target="_blank" rel="noreferrer" style={buttonStyle()}>
            Portfólio
          </a>
        ) : null}
      </div>
    </article>
  );
}

function ConnectionList({
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
        <p style={eyebrowStyle()}>Área profissional</p>
        <h3 style={{ ...sectionTitleStyle(), marginTop: 10 }}>{emptyTitle}</h3>
        <p style={textMutedStyle()}>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {items.map((item) => (
        <ConnectionCard key={`${item.user_id}-${item.created_at}`} item={item} />
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
    cards = ((cardRows ?? []) as CardRow[]).filter((card) => card.slug);
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
    <main style={pageShellStyle()}>
      <div style={pageContainerStyle()}>
        <section style={heroStyle()}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <p style={eyebrowStyle()}>Área profissional</p>
            <Link
              href="/dashboard/network"
              style={{
                color: "#BFDBFE",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              Voltar aos contatos
            </Link>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.15rem, 8.5vw, 3.35rem)",
                lineHeight: 0.98,
                fontWeight: 950,
                letterSpacing: "-0.055em",
              }}
            >
              Minhas conexões profissionais
            </h1>

            <p
              style={{
                margin: 0,
                color: "rgba(226,232,240,0.86)",
                fontSize: "clamp(1rem, 3.8vw, 1.12rem)",
                lineHeight: 1.65,
                maxWidth: 620,
              }}
            >
              Acompanhe quem demonstrou interesse profissional em você e os contatos que você iniciou dentro da rede USECLUBBERS.
            </p>
          </div>

          <div style={actionGroupStyle()}>
            <Link href="/network" style={primaryButtonStyle()}>
              Descobrir profissionais
            </Link>
            <Link href="/dashboard/network" style={buttonStyle()}>
              Voltar à central profissional
            </Link>
          </div>
        </section>

        <section style={statGridStyle()}>
          <div style={statCardStyle()}>
            <span style={{ color: "rgba(191,219,254,0.82)", fontSize: 14 }}>Conexões recebidas</span>
            <strong style={{ fontSize: 34, lineHeight: 1 }}>{incomingItems.length}</strong>
            <span style={{ color: "rgba(226,232,240,0.72)", lineHeight: 1.5 }}>
              Profissionais que chegaram até você
            </span>
          </div>

          <div style={statCardStyle()}>
            <span style={{ color: "rgba(191,219,254,0.82)", fontSize: 14 }}>Conexões iniciadas</span>
            <strong style={{ fontSize: 34, lineHeight: 1 }}>{outgoingItems.length}</strong>
            <span style={{ color: "rgba(226,232,240,0.72)", lineHeight: 1.5 }}>
              Contatos que você começou
            </span>
          </div>
        </section>

        <section style={{ marginTop: 30 }}>
          <h2 style={sectionTitleStyle()}>Conectaram comigo</h2>
          <ConnectionList
            items={incomingItems}
            emptyTitle="Ainda não há conexões recebidas"
            emptyDescription="Quando outros membros iniciarem contato profissional com você, eles aparecerão aqui."
          />
        </section>

        <section style={{ marginTop: 34 }}>
          <h2 style={sectionTitleStyle()}>Conectei com</h2>
          <ConnectionList
            items={outgoingItems}
            emptyTitle="Você ainda não iniciou conexões"
            emptyDescription="Quando você abrir uma conexão profissional, o contato aparecerá aqui para continuar a conversa."
          />
        </section>
      </div>
    </main>
  );
}
