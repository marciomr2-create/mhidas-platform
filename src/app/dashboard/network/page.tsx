// src/app/dashboard/network/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";
type ControlStatus = "suspended" | "blocked";

type ConnectionRow = {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
};

type RelationshipControlRow = {
  id: string;
  owner_user_id: string;
  target_user_id: string;
  status: ControlStatus;
  created_at: string;
  updated_at: string;
};

type ProfessionalProfileRow = {
  user_id: string;
  profession: string | null;
  company_name: string | null;
  industry: string | null;
  city: string | null;
  bio_text: string | null;
  ai_summary: string | null;
  pro_photo_url: string | null;
  accepts_professional_contact: boolean;
  whatsapp_business: string | null;
  professional_email: string | null;
};

type CardRow = {
  user_id: string;
  slug: string;
  label: string | null;
  is_published: boolean;
};

type PersonCardData = {
  user_id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  industry: string | null;
  city: string | null;
  summary: string;
  pro_photo_url: string | null;
  accepts_professional_contact: boolean;
  whatsapp_business: string | null;
  professional_email: string | null;
  is_fallback: boolean;
};

type ConnectionItem = PersonCardData & {
  connection_id: string;
  created_at: string;
  responded_at: string | null;
  status: ConnectionStatus;
};

type ControlItem = PersonCardData & {
  control_id: string;
  control_status: ControlStatus;
  created_at: string;
  updated_at: string;
};

function pageShellStyle(): CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 28%), radial-gradient(circle at 90% 0%, rgba(79,70,229,0.12), transparent 26%), #020617",
    color: "#F8FAFC",
  };
}

function pageContainerStyle(): CSSProperties {
  return {
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
    padding: "22px 14px 56px",
    color: "#F8FAFC",
    boxSizing: "border-box",
  };
}

function topNavStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  };
}

function heroPanelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(96,165,250,0.24)",
    background:
      "radial-gradient(circle at 14% 0%, rgba(37,99,235,0.26), transparent 34%), radial-gradient(circle at 88% 8%, rgba(99,102,241,0.20), transparent 32%), linear-gradient(135deg, rgba(15,23,42,0.98), rgba(3,7,18,0.98))",
    borderRadius: 30,
    padding: "24px 18px",
    display: "grid",
    gap: 18,
    boxShadow: "0 26px 82px rgba(0,0,0,0.44)",
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.16)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.74), rgba(255,255,255,0.025))",
    borderRadius: 22,
    padding: 17,
    boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
  };
}

function priorityPanelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(96,165,250,0.28)",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(79,70,229,0.07))",
    borderRadius: 24,
    padding: 18,
    display: "grid",
    gap: 12,
    boxShadow: "0 18px 50px rgba(37,99,235,0.12)",
  };
}

function statGridStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  };
}

function statCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.16)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(255,255,255,0.028))",
    borderRadius: 20,
    padding: 16,
    display: "grid",
    gap: 7,
    boxShadow: "0 14px 34px rgba(0,0,0,0.20)",
  };
}

function sectionHeaderCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.14)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.70), rgba(255,255,255,0.025))",
    borderRadius: 22,
    padding: 16,
    display: "grid",
    gap: 8,
    marginBottom: 14,
  };
}

function cardStyle(isPriority = false): CSSProperties {
  return {
    border: isPriority
      ? "1px solid rgba(96,165,250,0.32)"
      : "1px solid rgba(148,163,184,0.16)",
    background: isPriority
      ? "linear-gradient(135deg, rgba(37,99,235,0.16), rgba(15,23,42,0.82))"
      : "linear-gradient(135deg, rgba(15,23,42,0.76), rgba(255,255,255,0.028))",
    borderRadius: 24,
    padding: 17,
    display: "grid",
    gap: 15,
    boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
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
    lineHeight: 1.1,
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    border: "1px solid rgba(96,165,250,0.38)",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.96), rgba(30,64,175,0.98))",
    boxShadow: "0 14px 36px rgba(37,99,235,0.22)",
  };
}

function successButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    border: "1px solid rgba(45,212,191,0.30)",
    background:
      "linear-gradient(135deg, rgba(20,184,166,0.88), rgba(13,148,136,0.92))",
    boxShadow: "0 12px 30px rgba(20,184,166,0.16)",
  };
}

function dangerButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    border: "1px solid rgba(248,113,113,0.24)",
    background: "rgba(127,29,29,0.20)",
  };
}

function subtleButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(15,23,42,0.50)",
  };
}

function cautionButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    border: "1px solid rgba(251,191,36,0.22)",
    background: "rgba(120,53,15,0.14)",
    color: "rgba(254,243,199,0.94)",
  };
}

function statusTextStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 36,
    padding: "8px 0",
    color: "rgba(203,213,225,0.68)",
    fontSize: 13,
    fontWeight: 800,
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    border: "1px solid rgba(96,165,250,0.18)",
    background: "rgba(37,99,235,0.12)",
    color: "rgba(191,219,254,0.96)",
    borderRadius: 999,
    padding: "6px 9px",
    fontSize: 12,
    fontWeight: 850,
    letterSpacing: "0.02em",
  };
}

function quickBadgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    width: "fit-content",
    border: "1px solid rgba(148,163,184,0.15)",
    background: "rgba(15,23,42,0.60)",
    color: "rgba(203,213,225,0.88)",
    borderRadius: 999,
    padding: "6px 9px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.015em",
  };
}

function infoBoxStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.52)",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
  };
}

function actionGridStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
    alignItems: "center",
  };
}

function anchorLinkStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.62)",
    color: "#F8FAFC",
    textDecoration: "none",
    fontWeight: 800,
    minHeight: 40,
  };
}

function emptyStateStyle(): CSSProperties {
  return {
    ...panelStyle(),
    color: "rgba(226,232,240,0.92)",
  };
}

function formatDate(value: string | null): string {
  if (!value) return "Data indisponível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeText(value: string | null | undefined): string | null {
  const text = String(value || "").trim();
  return text ? text : null;
}

function compactText(value: string | null | undefined): string {
  const source = String(value || "").trim();
  let output = "";
  let previousWasSpace = false;

  for (const char of source) {
    const isSpace =
      char === " " ||
      char === "\n" ||
      char === "\r" ||
      char === "\t" ||
      char === "\f";

    if (isSpace) {
      if (!previousWasSpace && output) output += " ";
      previousWasSpace = true;
    } else {
      output += char;
      previousWasSpace = false;
    }
  }

  return output.trim();
}

function limitText(value: string | null | undefined, max = 160): string {
  const text = compactText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function digitsOnly(value: string | null | undefined): string {
  const source = String(value || "");
  let output = "";

  for (const char of source) {
    if (char >= "0" && char <= "9") output += char;
  }

  return output;
}

function whatsappHref(value: string | null | undefined): string | null {
  const digits = digitsOnly(value);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function buildPersonCardData(
  userId: string,
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): PersonCardData {
  const profile = profileByUserId.get(userId);
  const card = cardByUserId.get(userId);

  const title =
    profile?.profession?.trim() ||
    card?.label?.trim() ||
    "Profissional da rede";

  const subtitle =
    profile?.company_name?.trim() ||
    (card?.label?.trim() && profile?.profession?.trim() ? card.label : null) ||
    "Perfil em configuração";

  const summary =
    profile?.ai_summary?.trim() ||
    profile?.bio_text?.trim() ||
    "Esta pessoa ainda está configurando o perfil profissional na plataforma.";

  return {
    user_id: userId,
    slug: card?.slug ?? null,
    title,
    subtitle,
    industry: profile?.industry ?? null,
    city: profile?.city ?? null,
    summary,
    pro_photo_url: profile?.pro_photo_url ?? null,
    accepts_professional_contact: profile?.accepts_professional_contact ?? false,
    whatsapp_business: normalizeText(profile?.whatsapp_business),
    professional_email: normalizeText(profile?.professional_email),
    is_fallback: !profile || !card?.slug,
  };
}

function buildConnectionItems(
  connections: ConnectionRow[],
  lookupUserIdField: "requester_user_id" | "target_user_id",
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): ConnectionItem[] {
  return connections.map((connection) => {
    const relatedUserId = connection[lookupUserIdField];
    const base = buildPersonCardData(
      relatedUserId,
      profileByUserId,
      cardByUserId
    );

    return {
      ...base,
      connection_id: connection.id,
      created_at: connection.created_at,
      responded_at: connection.responded_at,
      status: connection.status,
    };
  });
}

function buildControlItems(
  controls: RelationshipControlRow[],
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): ControlItem[] {
  return controls.map((control) => {
    const base = buildPersonCardData(
      control.target_user_id,
      profileByUserId,
      cardByUserId
    );

    return {
      ...base,
      control_id: control.id,
      control_status: control.status,
      created_at: control.created_at,
      updated_at: control.updated_at,
    };
  });
}

function ProfileAvatar({
  photoUrl,
  title,
}: {
  photoUrl: string | null;
  title: string;
}) {
  return photoUrl ? (
    <img
      src={photoUrl}
      alt={`Foto profissional de ${title}`}
      style={{
        width: 76,
        height: 76,
        borderRadius: 20,
        objectFit: "cover",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 14px 28px rgba(0,0,0,0.28)",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      aria-label="Perfil profissional"
      style={{
        width: 76,
        height: 76,
        borderRadius: 20,
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(96,165,250,0.22)",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.24), rgba(15,23,42,0.86))",
        color: "rgba(191,219,254,0.96)",
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: "0.06em",
        flexShrink: 0,
      }}
    >
      PRO
    </div>
  );
}

function ContactCard({
  item,
  dateLabel,
  showConnectionActions = false,
  acceptAction,
  declineAction,
  emphasize = false,
  showRelationshipActions = false,
  suspendAction,
  blockAction,
}: {
  item: ConnectionItem;
  dateLabel: string;
  showConnectionActions?: boolean;
  acceptAction?: (formData: FormData) => Promise<void>;
  declineAction?: (formData: FormData) => Promise<void>;
  emphasize?: boolean;
  showRelationshipActions?: boolean;
  suspendAction?: (formData: FormData) => Promise<void>;
  blockAction?: (formData: FormData) => Promise<void>;
}) {
  const quickBadges: string[] = [];

  if (item.city) quickBadges.push(item.city);
  if (item.industry) quickBadges.push(item.industry);
  if (item.is_fallback) quickBadges.push("perfil em configuração");
  if (showConnectionActions) quickBadges.push("resposta recomendada");
  if (item.whatsapp_business) quickBadges.push("WhatsApp disponível");

  const waHref = whatsappHref(item.whatsapp_business);

  return (
    <article style={cardStyle(emphasize)}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <ProfileAvatar photoUrl={item.pro_photo_url} title={item.title} />

        <div style={{ minWidth: 0, display: "grid", gap: 7 }}>
          <span style={badgeStyle()}>
            {emphasize ? "Contato prioritário" : "Contato profissional"}
          </span>

          <div>
            <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.18 }}>
              {item.title}
            </h3>

            {item.subtitle ? (
              <p
                style={{
                  margin: "5px 0 0",
                  color: "rgba(226,232,240,0.76)",
                  lineHeight: 1.45,
                }}
              >
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {quickBadges.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {quickBadges.map((badge) => (
            <span key={badge} style={quickBadgeStyle()}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <p
        style={{
          margin: 0,
          color: "rgba(226,232,240,0.86)",
          lineHeight: 1.65,
          fontSize: 14,
        }}
      >
        {limitText(item.summary, 185)}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 10,
        }}
      >
        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 12, color: "rgba(191,219,254,0.96)" }}>
            {dateLabel}
          </strong>
          <span style={{ color: "rgba(226,232,240,0.78)", fontSize: 13 }}>
            {formatDate(item.created_at)}
          </span>
        </div>

        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 12, color: "rgba(191,219,254,0.96)" }}>
            Próximo passo
          </strong>
          <span style={{ color: "rgba(226,232,240,0.78)", fontSize: 13 }}>
            {showConnectionActions
              ? "Aceite ou recuse para manter o ritmo de conversa."
              : "Mantenha sua rede organizada com ações rápidas."}
          </span>
        </div>
      </div>

      {item.responded_at ? (
        <span style={statusTextStyle()}>
          Atualizado em: {formatDate(item.responded_at)}
        </span>
      ) : null}

      <div style={actionGridStyle()}>
        {item.slug ? (
          <Link href={`/pro/${item.slug}`} style={primaryButtonStyle()}>
            Ver perfil
          </Link>
        ) : (
          <span style={statusTextStyle()}>
            Perfil profissional ainda indisponível
          </span>
        )}

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            style={successButtonStyle()}
          >
            WhatsApp
          </a>
        ) : null}

        {item.professional_email ? (
          <a href={`mailto:${item.professional_email}`} style={subtleButtonStyle()}>
            E-mail
          </a>
        ) : null}

        {showConnectionActions && acceptAction && declineAction ? (
          <>
            <form action={acceptAction}>
              <input
                type="hidden"
                name="connection_id"
                value={item.connection_id}
              />
              <button type="submit" style={successButtonStyle()}>
                Aceitar contato
              </button>
            </form>

            <form action={declineAction}>
              <input
                type="hidden"
                name="connection_id"
                value={item.connection_id}
              />
              <button type="submit" style={dangerButtonStyle()}>
                Recusar
              </button>
            </form>
          </>
        ) : null}

        {showRelationshipActions && suspendAction ? (
          <form action={suspendAction}>
            <input type="hidden" name="target_user_id" value={item.user_id} />
            <button type="submit" style={cautionButtonStyle()}>
              Pausar contato
            </button>
          </form>
        ) : null}

        {showRelationshipActions && blockAction ? (
          <form action={blockAction}>
            <input type="hidden" name="target_user_id" value={item.user_id} />
            <button type="submit" style={dangerButtonStyle()}>
              Bloquear contato
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function ControlledProfileCard({
  item,
  restoreAction,
}: {
  item: ControlItem;
  restoreAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <article style={cardStyle(item.control_status === "blocked")}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <ProfileAvatar photoUrl={item.pro_photo_url} title={item.title} />

        <div style={{ minWidth: 0, display: "grid", gap: 7 }}>
          <span style={badgeStyle()}>
            {item.control_status === "blocked"
              ? "Contato bloqueado"
              : "Contato pausado"}
          </span>

          <div>
            <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.18 }}>
              {item.title}
            </h3>

            {item.subtitle ? (
              <p
                style={{
                  margin: "5px 0 0",
                  color: "rgba(226,232,240,0.76)",
                  lineHeight: 1.45,
                }}
              >
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {item.city ? <span style={quickBadgeStyle()}>{item.city}</span> : null}
        {item.industry ? (
          <span style={quickBadgeStyle()}>{item.industry}</span>
        ) : null}
        <span style={quickBadgeStyle()}>
          {item.control_status === "blocked"
            ? "fora da área ativa"
            : "contato pausado"}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          color: "rgba(226,232,240,0.86)",
          lineHeight: 1.65,
          fontSize: 14,
        }}
      >
        {limitText(item.summary, 185)}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 10,
        }}
      >
        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 12, color: "rgba(191,219,254,0.96)" }}>
            Aplicado em
          </strong>
          <span style={{ color: "rgba(226,232,240,0.78)", fontSize: 13 }}>
            {formatDate(item.created_at)}
          </span>
        </div>

        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 12, color: "rgba(191,219,254,0.96)" }}>
            Última atualização
          </strong>
          <span style={{ color: "rgba(226,232,240,0.78)", fontSize: 13 }}>
            {formatDate(item.updated_at)}
          </span>
        </div>
      </div>

      <div style={actionGridStyle()}>
        {item.slug ? (
          <Link href={`/pro/${item.slug}`} style={subtleButtonStyle()}>
            Ver perfil
          </Link>
        ) : null}

        <form action={restoreAction}>
          <input type="hidden" name="target_user_id" value={item.user_id} />
          <button type="submit" style={primaryButtonStyle()}>
            {item.control_status === "blocked"
              ? "Desbloquear contato"
              : "Reativar contato"}
          </button>
        </form>
      </div>
    </article>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={sectionHeaderCardStyle()}>
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.18 }}>{title}</h2>
      <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div style={statCardStyle()}>
      <span
        style={{
          color: "rgba(191,219,254,0.90)",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong style={{ fontSize: 28, lineHeight: 1 }}>{value}</strong>
      <span style={{ color: "rgba(226,232,240,0.70)", fontSize: 13 }}>
        {description}
      </span>
    </div>
  );
}

export default async function DashboardNetworkPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentUserId = user.id;

  async function acceptConnection(formData: FormData) {
    "use server";

    const connectionId = String(formData.get("connection_id") || "").trim();
    if (!connectionId) return;

    const actionSupabase = await createServerSupabaseClient();

    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    await actionSupabase
      .from("professional_connections")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("target_user_id", actionUser.id)
      .eq("status", "pending");

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/network");
    revalidatePath("/network");
    revalidatePath("/network/connections");
  }

  async function declineConnection(formData: FormData) {
    "use server";

    const connectionId = String(formData.get("connection_id") || "").trim();
    if (!connectionId) return;

    const actionSupabase = await createServerSupabaseClient();

    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    await actionSupabase
      .from("professional_connections")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("target_user_id", actionUser.id)
      .eq("status", "pending");

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/network");
    revalidatePath("/network");
    revalidatePath("/network/connections");
  }

  async function suspendProfile(formData: FormData) {
    "use server";

    const targetUserId = String(formData.get("target_user_id") || "").trim();
    if (!targetUserId) return;

    const actionSupabase = await createServerSupabaseClient();

    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    await actionSupabase.from("professional_relationship_controls").upsert(
      {
        owner_user_id: actionUser.id,
        target_user_id: targetUserId,
        status: "suspended",
      },
      {
        onConflict: "owner_user_id,target_user_id",
      }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/network");
    revalidatePath("/network");
    revalidatePath("/network/connections");
  }

  async function blockProfile(formData: FormData) {
    "use server";

    const targetUserId = String(formData.get("target_user_id") || "").trim();
    if (!targetUserId) return;

    const actionSupabase = await createServerSupabaseClient();

    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    await actionSupabase.from("professional_relationship_controls").upsert(
      {
        owner_user_id: actionUser.id,
        target_user_id: targetUserId,
        status: "blocked",
      },
      {
        onConflict: "owner_user_id,target_user_id",
      }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/network");
    revalidatePath("/network");
    revalidatePath("/network/connections");
  }

  async function restoreProfile(formData: FormData) {
    "use server";

    const targetUserId = String(formData.get("target_user_id") || "").trim();
    if (!targetUserId) return;

    const actionSupabase = await createServerSupabaseClient();

    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    await actionSupabase
      .from("professional_relationship_controls")
      .delete()
      .eq("owner_user_id", actionUser.id)
      .eq("target_user_id", targetUserId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/network");
    revalidatePath("/network");
    revalidatePath("/network/connections");
  }

  const { data: receivedPendingRows } = await supabase
    .from("professional_connections")
    .select("id, requester_user_id, target_user_id, status, created_at, responded_at")
    .eq("target_user_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: sentPendingRows } = await supabase
    .from("professional_connections")
    .select("id, requester_user_id, target_user_id, status, created_at, responded_at")
    .eq("requester_user_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: acceptedRows } = await supabase
    .from("professional_connections")
    .select("id, requester_user_id, target_user_id, status, created_at, responded_at")
    .or(`requester_user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`)
    .eq("status", "accepted")
    .order("responded_at", { ascending: false });

  const { data: controlRows } = await supabase
    .from("professional_relationship_controls")
    .select("id, owner_user_id, target_user_id, status, created_at, updated_at")
    .eq("owner_user_id", currentUserId)
    .order("updated_at", { ascending: false });

  const receivedPending = (receivedPendingRows ?? []) as ConnectionRow[];
  const sentPending = (sentPendingRows ?? []) as ConnectionRow[];
  const acceptedConnections = (acceptedRows ?? []) as ConnectionRow[];
  const controls = (controlRows ?? []) as RelationshipControlRow[];

  const relatedUserIds = Array.from(
    new Set(
      [
        ...receivedPending.map((row) => row.requester_user_id),
        ...sentPending.map((row) => row.target_user_id),
        ...acceptedConnections.map((row) =>
          row.requester_user_id === currentUserId
            ? row.target_user_id
            : row.requester_user_id
        ),
        ...controls.map((row) => row.target_user_id),
      ].filter(Boolean)
    )
  );

  let profiles: ProfessionalProfileRow[] = [];
  let cards: CardRow[] = [];

  if (relatedUserIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("professional_profiles")
      .select(
        `
        user_id,
        profession,
        company_name,
        industry,
        city,
        bio_text,
        ai_summary,
        pro_photo_url,
        accepts_professional_contact,
        whatsapp_business,
        professional_email
      `
      )
      .in("user_id", relatedUserIds);

    const { data: cardRows } = await supabase
      .from("cards")
      .select("user_id, slug, label, is_published")
      .in("user_id", relatedUserIds)
      .eq("is_published", true);

    profiles = (profileRows ?? []) as ProfessionalProfileRow[];
    cards = ((cardRows ?? []) as CardRow[]).filter((card) => card.user_id);
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

  const controlByUserId = new Map<string, ControlStatus>();
  for (const control of controls) {
    controlByUserId.set(control.target_user_id, control.status);
  }

  const receivedItems = buildConnectionItems(
    receivedPending,
    "requester_user_id",
    profileByUserId,
    cardByUserId
  );

  const sentItems = buildConnectionItems(
    sentPending,
    "target_user_id",
    profileByUserId,
    cardByUserId
  );

  const acceptedItems = buildConnectionItems(
    acceptedConnections.map((row) => ({
      ...row,
      requester_user_id:
        row.requester_user_id === currentUserId
          ? row.target_user_id
          : row.requester_user_id,
      target_user_id: currentUserId,
    })),
    "requester_user_id",
    profileByUserId,
    cardByUserId
  );

  const activeReceivedItems = receivedItems.filter(
    (item) => !controlByUserId.has(item.user_id)
  );

  const activeSentItems = sentItems.filter(
    (item) => !controlByUserId.has(item.user_id)
  );

  const activeAcceptedItems = acceptedItems.filter(
    (item) => !controlByUserId.has(item.user_id)
  );

  const suspendedItems = buildControlItems(
    controls.filter((item) => item.status === "suspended"),
    profileByUserId,
    cardByUserId
  );

  const blockedItems = buildControlItems(
    controls.filter((item) => item.status === "blocked"),
    profileByUserId,
    cardByUserId
  );

  const priorityTitle =
    activeReceivedItems.length > 0
      ? `Você tem ${activeReceivedItems.length} contato(s) aguardando sua resposta`
      : activeAcceptedItems.length > 0
        ? "Seus contatos profissionais estão ativos"
        : "Sua rede profissional está pronta para crescer";

  const priorityText =
    activeReceivedItems.length > 0
      ? "Responder agora aumenta suas chances de gerar novas conexões, negócios e continuidade de conversa."
      : activeAcceptedItems.length > 0
        ? "Você já tem contatos confirmados. Continue acompanhando sua rede para manter ritmo e qualidade de relacionamento."
        : "Quando alguém quiser falar com você, esta área será o ponto central para acompanhar tudo com clareza.";

  const priorityButtonHref =
    activeReceivedItems.length > 0 ? "#novos-contatos" : "/network";

  const priorityButtonLabel =
    activeReceivedItems.length > 0 ? "Responder agora" : "Descobrir profissionais";

  const nextUrgentItem = activeReceivedItems[0] ?? null;

  return (
    <main style={pageShellStyle()}>
      <div style={pageContainerStyle()}>
        <div style={topNavStyle()}>
          <Link href="/dashboard" style={anchorLinkStyle()}>
            Voltar à central
          </Link>

          <Link href="/network" style={anchorLinkStyle()}>
            Descobrir profissionais
          </Link>
        </div>

        <header style={heroPanelStyle()}>
          <div style={{ display: "grid", gap: 9 }}>
            <span style={badgeStyle()}>Área profissional</span>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 6vw, 48px)",
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              Meus contatos profissionais
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "rgba(226,232,240,0.82)",
                lineHeight: 1.65,
                fontSize: 15,
              }}
            >
              Acompanhe convites, contatos confirmados e oportunidades
              profissionais em uma área separada da Experiência Club.
            </p>
          </div>

          <section style={priorityPanelStyle()} aria-label="Prioridade da rede">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={quickBadgeStyle()}>Rede profissional</span>

              {activeReceivedItems.length > 0 ? (
                <span style={quickBadgeStyle()}>
                  Prioridade: responder contatos
                </span>
              ) : null}

              {blockedItems.length > 0 || suspendedItems.length > 0 ? (
                <span style={quickBadgeStyle()}>
                  Segurança: {suspendedItems.length} pausado(s) ·{" "}
                  {blockedItems.length} bloqueado(s)
                </span>
              ) : null}
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}>
                {priorityTitle}
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(226,232,240,0.78)",
                  lineHeight: 1.6,
                }}
              >
                {priorityText}
              </p>
            </div>

            <div style={actionGridStyle()}>
              <Link href={priorityButtonHref} style={primaryButtonStyle()}>
                {priorityButtonLabel}
              </Link>

              {activeReceivedItems.length > 0 ? (
                <Link href="/network" style={subtleButtonStyle()}>
                  Descobrir profissionais
                </Link>
              ) : null}

              <Link href="/network/connections" style={subtleButtonStyle()}>
                Ver minhas conexões
              </Link>
            </div>
          </section>

          <section style={statGridStyle()} aria-label="Resumo dos contatos">
            <StatCard
              label="Novos contatos"
              value={activeReceivedItems.length}
              description="Pessoas aguardando sua resposta"
            />

            <StatCard
              label="Convites enviados"
              value={activeSentItems.length}
              description="Pessoas que ainda não responderam"
            />

            <StatCard
              label="Contatos confirmados"
              value={activeAcceptedItems.length}
              description="Contatos já consolidados"
            />

            <StatCard
              label="Pausados"
              value={suspendedItems.length}
              description="Contatos pausados por você"
            />

            <StatCard
              label="Bloqueados"
              value={blockedItems.length}
              description="Contatos bloqueados por você"
            />
          </section>

          {nextUrgentItem ? (
            <section style={panelStyle()} aria-label="Resposta mais urgente">
              <span style={badgeStyle()}>Resposta mais urgente</span>
              <h2 style={{ margin: 0, fontSize: 22 }}>
                {nextUrgentItem.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "rgba(226,232,240,0.80)",
                  lineHeight: 1.6,
                }}
              >
                {limitText(nextUrgentItem.summary, 220)}
              </p>

              <div style={actionGridStyle()}>
                {nextUrgentItem.city ? (
                  <span style={quickBadgeStyle()}>{nextUrgentItem.city}</span>
                ) : null}

                {nextUrgentItem.whatsapp_business ? (
                  <span style={quickBadgeStyle()}>WhatsApp disponível</span>
                ) : null}

                {nextUrgentItem.is_fallback ? (
                  <span style={quickBadgeStyle()}>Perfil em configuração</span>
                ) : null}
              </div>

              <div style={actionGridStyle()}>
                {nextUrgentItem.slug ? (
                  <Link
                    href={`/pro/${nextUrgentItem.slug}`}
                    style={primaryButtonStyle()}
                  >
                    Ver perfil agora
                  </Link>
                ) : null}

                {whatsappHref(nextUrgentItem.whatsapp_business) ? (
                  <a
                    href={whatsappHref(nextUrgentItem.whatsapp_business) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={successButtonStyle()}
                  >
                    WhatsApp
                  </a>
                ) : null}

                {nextUrgentItem.professional_email ? (
                  <a
                    href={`mailto:${nextUrgentItem.professional_email}`}
                    style={subtleButtonStyle()}
                  >
                    E-mail
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          <div
            style={{
              color: "rgba(203,213,225,0.72)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {activeReceivedItems.length} novo(s) contato(s) ·{" "}
            {activeSentItems.length} convite(s) enviado(s) ·{" "}
            {activeAcceptedItems.length} contato(s) confirmado(s) ·{" "}
            {suspendedItems.length} pausado(s) · {blockedItems.length}{" "}
            bloqueado(s)
          </div>
        </header>

        <section style={{ marginTop: 22 }} aria-label="Navegação rápida">
          <div style={sectionHeaderCardStyle()}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Navegação rápida</h2>
            <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
              Vá direto para a área que precisa da sua atenção agora.
            </p>

            <div style={actionGridStyle()}>
              <a href="#novos-contatos" style={anchorLinkStyle()}>
                Novos contatos
              </a>
              <a href="#convites-enviados" style={anchorLinkStyle()}>
                Convites enviados
              </a>
              <a href="#meus-contatos" style={anchorLinkStyle()}>
                Meus contatos
              </a>
              <a href="#perfis-suspensos" style={anchorLinkStyle()}>
                Pausados
              </a>
              <a href="#perfis-bloqueados" style={anchorLinkStyle()}>
                Bloqueados
              </a>
            </div>
          </div>
        </section>

        <section id="novos-contatos" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Novos contatos"
            description="Pessoas interessadas em falar com você. Priorize respostas rápidas para não perder oportunidade."
          />

          {activeReceivedItems.length === 0 ? (
            <div style={emptyStateStyle()}>
              <h3 style={{ marginTop: 0 }}>Nenhum novo contato</h3>
              <p style={{ marginBottom: 0, opacity: 0.82 }}>
                Quando alguém entrar em contato com você, aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {activeReceivedItems.map((item, index) => (
                <ContactCard
                  key={item.connection_id}
                  item={item}
                  dateLabel="Pedido recebido em"
                  showConnectionActions={true}
                  acceptAction={acceptConnection}
                  declineAction={declineConnection}
                  emphasize={index === 0}
                />
              ))}
            </div>
          )}
        </section>

        <section id="convites-enviados" style={{ marginTop: 32 }}>
          <SectionHeader
            title="Convites enviados"
            description="Pessoas que você convidou para se conectar e ainda não responderam."
          />

          {activeSentItems.length === 0 ? (
            <div style={emptyStateStyle()}>
              <h3 style={{ marginTop: 0 }}>Nenhum convite enviado</h3>
              <p style={{ marginBottom: 0, opacity: 0.82 }}>
                Quando você convidar alguém para se conectar, essa pessoa
                aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {activeSentItems.map((item) => (
                <ContactCard
                  key={item.connection_id}
                  item={item}
                  dateLabel="Convite enviado em"
                />
              ))}
            </div>
          )}
        </section>

        <section id="meus-contatos" style={{ marginTop: 32 }}>
          <SectionHeader
            title="Meus contatos"
            description="Pessoas com quem você já está conectado e pode continuar conversando."
          />

          {activeAcceptedItems.length === 0 ? (
            <div style={emptyStateStyle()}>
              <h3 style={{ marginTop: 0 }}>Nenhum contato confirmado</h3>
              <p style={{ marginBottom: 0, opacity: 0.82 }}>
                Quando você aceitar um contato, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {activeAcceptedItems.map((item) => (
                <ContactCard
                  key={item.connection_id}
                  item={item}
                  dateLabel="Conectado em"
                  showRelationshipActions={true}
                  suspendAction={suspendProfile}
                  blockAction={blockProfile}
                />
              ))}
            </div>
          )}
        </section>

        <section id="perfis-suspensos" style={{ marginTop: 32 }}>
          <SectionHeader
            title="Contatos pausados"
            description="Contatos pausados por você. Eles saem da sua área ativa até você reativar."
          />

          {suspendedItems.length === 0 ? (
            <div style={emptyStateStyle()}>
              <h3 style={{ marginTop: 0 }}>Nenhum contato pausado</h3>
              <p style={{ marginBottom: 0, opacity: 0.82 }}>
                Quando você pausar alguém, o contato aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {suspendedItems.map((item) => (
                <ControlledProfileCard
                  key={item.control_id}
                  item={item}
                  restoreAction={restoreProfile}
                />
              ))}
            </div>
          )}
        </section>

        <section id="perfis-bloqueados" style={{ marginTop: 32 }}>
          <SectionHeader
            title="Contatos bloqueados"
            description="Contatos bloqueados por você. Eles ficam fora da sua área ativa até o desbloqueio."
          />

          {blockedItems.length === 0 ? (
            <div style={emptyStateStyle()}>
              <h3 style={{ marginTop: 0 }}>Nenhum contato bloqueado</h3>
              <p style={{ marginBottom: 0, opacity: 0.82 }}>
                Quando você bloquear alguém, o contato aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {blockedItems.map((item) => (
                <ControlledProfileCard
                  key={item.control_id}
                  item={item}
                  restoreAction={restoreProfile}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
