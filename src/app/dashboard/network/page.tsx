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

function pageContainerStyle(): CSSProperties {
  return {
    maxWidth: 1120,
    margin: "0 auto",
    padding: 24,
  };
}

function heroPanelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    borderRadius: 24,
    padding: 22,
    display: "grid",
    gap: 14,
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

function priorityPanelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,180,0,0.35)",
    background: "rgba(255,180,0,0.08)",
    borderRadius: 22,
    padding: 18,
    display: "grid",
    gap: 10,
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

function sectionHeaderCardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 8,
    marginBottom: 16,
  };
}

function cardStyle(isPriority = false): CSSProperties {
  return {
    border: isPriority
      ? "1px solid rgba(255,180,0,0.28)"
      : "1px solid rgba(255,255,255,0.12)",
    background: isPriority
      ? "rgba(255,180,0,0.05)"
      : "rgba(255,255,255,0.03)",
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

function successButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(255,255,255,0.14)",
  };
}

function dangerButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(255,255,255,0.03)",
  };
}

function subtleButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(255,255,255,0.04)",
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

function infoBoxStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
  };
}

function anchorLinkStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
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

function limitText(value: string | null | undefined, max = 160): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
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
    "Pessoa da rede";

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
    const base = buildPersonCardData(relatedUserId, profileByUserId, cardByUserId);

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
  if (item.is_fallback) quickBadges.push("perfil em configuração");
  if (showConnectionActions) quickBadges.push("resposta recomendada");
  if (item.whatsapp_business) quickBadges.push("WhatsApp disponível");

  return (
    <article key={item.connection_id} style={cardStyle(emphasize)}>
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
          <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>

          {item.subtitle ? (
            <div style={{ opacity: 0.88 }}>{item.subtitle}</div>
          ) : null}

          {quickBadges.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quickBadges.map((badge) => (
                <span key={badge} style={quickBadgeStyle()}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
        {limitText(item.summary, 180)}
      </p>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 14 }}>{dateLabel}</strong>
          <span style={{ opacity: 0.8 }}>{formatDate(item.created_at)}</span>
        </div>

        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 14 }}>Próximo passo</strong>
          <span style={{ opacity: 0.8 }}>
            {showConnectionActions
              ? "Aceite ou recuse agora para não perder timing de conversa."
              : "Mantenha a sua rede organizada com ações rápidas quando necessário."}
          </span>
        </div>
      </div>

      {item.responded_at ? (
        <div style={{ fontSize: 13, opacity: 0.72 }}>
          Atualizado em: {formatDate(item.responded_at)}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {item.slug ? (
          <Link href={`/${item.slug}?mode=pro`} style={primaryButtonStyle()}>
            Ver perfil
          </Link>
        ) : (
          <span style={{ ...buttonStyle(), opacity: 0.55, cursor: "default" }}>
            Perfil ainda indisponível
          </span>
        )}

        {item.whatsapp_business ? (
          <a
            href={item.whatsapp_business}
            target="_blank"
            rel="noopener noreferrer"
            style={buttonStyle()}
          >
            WhatsApp
          </a>
        ) : null}

        {item.professional_email ? (
          <a href={`mailto:${item.professional_email}`} style={buttonStyle()}>
            E-mail
          </a>
        ) : null}

        {showConnectionActions && acceptAction && declineAction ? (
          <>
            <form action={acceptAction}>
              <input type="hidden" name="connection_id" value={item.connection_id} />
              <button type="submit" style={successButtonStyle()}>
                Aceitar contato
              </button>
            </form>

            <form action={declineAction}>
              <input type="hidden" name="connection_id" value={item.connection_id} />
              <button type="submit" style={dangerButtonStyle()}>
                Recusar
              </button>
            </form>
          </>
        ) : null}

        {showRelationshipActions && suspendAction ? (
          <form action={suspendAction}>
            <input type="hidden" name="target_user_id" value={item.user_id} />
            <button type="submit" style={subtleButtonStyle()}>
              Suspender perfil
            </button>
          </form>
        ) : null}

        {showRelationshipActions && blockAction ? (
          <form action={blockAction}>
            <input type="hidden" name="target_user_id" value={item.user_id} />
            <button type="submit" style={dangerButtonStyle()}>
              Bloquear perfil
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
    <article style={cardStyle()}>
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
          <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>

          {item.subtitle ? (
            <div style={{ opacity: 0.88 }}>{item.subtitle}</div>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {item.city ? <span style={quickBadgeStyle()}>{item.city}</span> : null}
            <span style={quickBadgeStyle()}>
              {item.control_status === "blocked" ? "perfil bloqueado" : "perfil suspenso"}
            </span>
          </div>
        </div>
      </div>

      <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
        {limitText(item.summary, 180)}
      </p>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 14 }}>Aplicado em</strong>
          <span style={{ opacity: 0.8 }}>{formatDate(item.created_at)}</span>
        </div>

        <div style={infoBoxStyle()}>
          <strong style={{ fontSize: 14 }}>Última atualização</strong>
          <span style={{ opacity: 0.8 }}>{formatDate(item.updated_at)}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {item.slug ? (
          <Link href={`/${item.slug}?mode=pro`} style={buttonStyle()}>
            Ver perfil
          </Link>
        ) : null}

        <form action={restoreAction}>
          <input type="hidden" name="target_user_id" value={item.user_id} />
          <button type="submit" style={primaryButtonStyle()}>
            {item.control_status === "blocked"
              ? "Desbloquear perfil"
              : "Reativar perfil"}
          </button>
        </form>
      </div>
    </article>
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

    await actionSupabase
      .from("professional_relationship_controls")
      .upsert(
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

    await actionSupabase
      .from("professional_relationship_controls")
      .upsert(
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
      .select(`
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
      `)
      .in("user_id", relatedUserIds);

    const { data: cardRows } = await supabase
      .from("cards")
      .select("user_id, slug, label, is_published")
      .in("user_id", relatedUserIds)
      .eq("is_published", true);

    profiles = (profileRows ?? []) as ProfessionalProfileRow[];
    cards = ((cardRows ?? []) as CardRow[]).filter((c) => c.user_id);
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
      ? "Sua rede já está ativa"
      : "Sua rede profissional está pronta para crescer";

  const priorityText =
    activeReceivedItems.length > 0
      ? "Responder agora aumenta suas chances de gerar novas conexões, negócios e continuidade de conversa."
      : activeAcceptedItems.length > 0
      ? "Você já tem conexões confirmadas. Continue acompanhando sua rede para manter ritmo e qualidade de relacionamento."
      : "Quando alguém quiser falar com você, esta área será o ponto central para acompanhar tudo com clareza.";

  const priorityButtonHref =
    activeReceivedItems.length > 0 ? "#novos-contatos" : "/network";
  const priorityButtonLabel =
    activeReceivedItems.length > 0 ? "Responder agora" : "Descobrir profissionais";

  const nextUrgentItem = activeReceivedItems[0] ?? null;

  return (
    <main style={pageContainerStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          Meus contatos
        </h1>

        <p style={{ margin: 0, opacity: 0.82, maxWidth: 880, lineHeight: 1.6 }}>
          Pessoas interessadas em se conectar com você. Responder rápido aumenta suas oportunidades e mantém sua rede organizada.
        </p>

        <div style={{ marginTop: 8 }}>
          <Link href="/dashboard" style={{ textDecoration: "underline" }}>
            Voltar para minha área
          </Link>
        </div>
      </header>

      <section style={{ ...heroPanelStyle(), marginTop: 24 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={quickBadgeStyle()}>Central da sua rede</span>
          {activeReceivedItems.length > 0 ? (
            <span style={quickBadgeStyle()}>
              Prioridade alta: responder contatos
            </span>
          ) : null}
          {blockedItems.length > 0 || suspendedItems.length > 0 ? (
            <span style={quickBadgeStyle()}>
              Controles ativos: {suspendedItems.length} suspenso(s) • {blockedItems.length} bloqueado(s)
            </span>
          ) : null}
        </div>

        <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
          {priorityTitle}
        </div>

        <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.6, maxWidth: 760 }}>
          {priorityText}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href={priorityButtonHref} style={primaryButtonStyle()}>
            {priorityButtonLabel}
          </Link>

          <Link href="/network" style={buttonStyle()}>
            Abrir busca principal
          </Link>

          <Link href="/network/connections" style={buttonStyle()}>
            Ver minhas conexões
          </Link>
        </div>
      </section>

      <section style={{ ...priorityPanelStyle(), marginTop: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 0.4, opacity: 0.8 }}>
          PRÓXIMA AÇÃO RECOMENDADA
        </div>

        <div style={{ fontSize: 28, fontWeight: 900 }}>{priorityTitle}</div>

        <div style={{ opacity: 0.88, lineHeight: 1.6, maxWidth: 760 }}>
          {priorityText}
        </div>

        <div style={{ marginTop: 4 }}>
          <Link href={priorityButtonHref} style={primaryButtonStyle()}>
            {priorityButtonLabel}
          </Link>
        </div>
      </section>

      <section
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>NOVOS CONTATOS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{activeReceivedItems.length}</div>
          <div style={{ opacity: 0.8 }}>Pessoas aguardando sua resposta</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>CONVITES ENVIADOS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{activeSentItems.length}</div>
          <div style={{ opacity: 0.8 }}>Pessoas que ainda não responderam</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>CONTATOS CONFIRMADOS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{activeAcceptedItems.length}</div>
          <div style={{ opacity: 0.8 }}>Conexões já consolidadas</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>SUSPENSOS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{suspendedItems.length}</div>
          <div style={{ opacity: 0.8 }}>Perfis pausados por você</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>BLOQUEADOS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{blockedItems.length}</div>
          <div style={{ opacity: 0.8 }}>Perfis impedidos por você</div>
        </div>
      </section>

      {nextUrgentItem ? (
        <section style={{ marginTop: 24 }}>
          <div style={panelStyle()}>
            <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 8 }}>
              RESPOSTA MAIS URGENTE
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
              {nextUrgentItem.title}
            </div>
            <div style={{ opacity: 0.82, lineHeight: 1.6, marginBottom: 16 }}>
              {limitText(nextUrgentItem.summary, 220)}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
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

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                href={
                  nextUrgentItem.slug
                    ? `/${nextUrgentItem.slug}?mode=pro`
                    : "#novos-contatos"
                }
                style={primaryButtonStyle()}
              >
                Ver perfil agora
              </Link>

              {nextUrgentItem.whatsapp_business ? (
                <a
                  href={nextUrgentItem.whatsapp_business}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={buttonStyle()}
                >
                  WhatsApp
                </a>
              ) : null}

              {nextUrgentItem.professional_email ? (
                <a
                  href={`mailto:${nextUrgentItem.professional_email}`}
                  style={buttonStyle()}
                >
                  E-mail
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ ...panelStyle(), marginTop: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.82 }}>
          {activeReceivedItems.length} novo(s) contato(s) • {activeSentItems.length} convite(s) enviado(s) •{" "}
          {activeAcceptedItems.length} contato(s) confirmado(s) •{" "}
          {suspendedItems.length} suspenso(s) • {blockedItems.length} bloqueado(s)
        </div>
      </section>

      <section style={{ ...sectionHeaderCardStyle(), marginTop: 24 }}>
        <strong style={{ fontSize: 16 }}>Navegação rápida</strong>
        <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
          Vá direto para a área que precisa da sua atenção agora.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
            Suspensos
          </a>
          <a href="#perfis-bloqueados" style={anchorLinkStyle()}>
            Bloqueados
          </a>
        </div>
      </section>

      <section id="novos-contatos" style={{ marginTop: 32 }}>
        <div style={sectionHeaderCardStyle()}>
          <h2 style={{ margin: 0 }}>Novos contatos</h2>
          <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
            Pessoas interessadas em falar com você. Priorize respostas rápidas para não perder oportunidade.
          </p>
        </div>

        {activeReceivedItems.length === 0 ? (
          <div style={panelStyle()}>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            {activeReceivedItems.map((item, index) => (
              <ContactCard
                key={item.connection_id}
                item={item}
                dateLabel="Recebido em"
                showConnectionActions={true}
                acceptAction={acceptConnection}
                declineAction={declineConnection}
                showRelationshipActions={true}
                suspendAction={suspendProfile}
                blockAction={blockProfile}
                emphasize={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      <section id="convites-enviados" style={{ marginTop: 32 }}>
        <div style={sectionHeaderCardStyle()}>
          <h2 style={{ margin: 0 }}>Convites enviados</h2>
          <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
            Pessoas que você convidou para se conectar e ainda não responderam.
          </p>
        </div>

        {activeSentItems.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhum convite enviado</h3>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Quando você convidar alguém para se conectar, essa pessoa aparecerá aqui.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            {activeSentItems.map((item) => (
              <ContactCard
                key={item.connection_id}
                item={item}
                dateLabel="Enviado em"
                showRelationshipActions={true}
                suspendAction={suspendProfile}
                blockAction={blockProfile}
              />
            ))}
          </div>
        )}
      </section>

      <section id="meus-contatos" style={{ marginTop: 32 }}>
        <div style={sectionHeaderCardStyle()}>
          <h2 style={{ margin: 0 }}>Meus contatos</h2>
          <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
            Pessoas com quem você já está conectado e pode continuar conversando.
          </p>
        </div>

        {activeAcceptedItems.length === 0 ? (
          <div style={panelStyle()}>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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
        <div style={sectionHeaderCardStyle()}>
          <h2 style={{ margin: 0 }}>Perfis suspensos</h2>
          <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
            Perfis pausados por você. Eles saem da sua área ativa até você reativar.
          </p>
        </div>

        {suspendedItems.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhum perfil suspenso</h3>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Quando você suspender alguém, o perfil aparecerá aqui.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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
        <div style={sectionHeaderCardStyle()}>
          <h2 style={{ margin: 0 }}>Perfis bloqueados</h2>
          <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.6 }}>
            Perfis bloqueados por você. Eles ficam fora da sua área ativa até o desbloqueio.
          </p>
        </div>

        {blockedItems.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhum perfil bloqueado</h3>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Quando você bloquear alguém, o perfil aparecerá aqui.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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
    </main>
  );
}