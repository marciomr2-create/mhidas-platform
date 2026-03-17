// src/app/dashboard/network/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";

type ConnectionRow = {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
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
};

type CardRow = {
  user_id: string;
  slug: string;
  label: string | null;
  is_published: boolean;
};

type ConnectionItem = {
  connection_id: string;
  user_id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  city: string | null;
  summary: string;
  pro_photo_url: string | null;
  accepts_professional_contact: boolean;
  created_at: string;
  responded_at: string | null;
  status: ConnectionStatus;
  is_fallback: boolean;
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

function dangerButtonStyle(): CSSProperties {
  return {
    ...buttonStyle(),
    background: "rgba(255,255,255,0.03)",
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

function formatDate(value: string | null): string {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildItems(
  connections: ConnectionRow[],
  lookupUserIdField: "requester_user_id" | "target_user_id",
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): ConnectionItem[] {
  return connections.map((connection) => {
    const relatedUserId = connection[lookupUserIdField];
    const profile = profileByUserId.get(relatedUserId);
    const card = cardByUserId.get(relatedUserId);

    const title =
      profile?.profession?.trim() ||
      card?.label?.trim() ||
      "Usuário da rede";

    const subtitle =
      profile?.company_name?.trim() ||
      (card?.label?.trim() && profile?.profession?.trim()
        ? card.label
        : null) ||
      "Perfil em configuração";

    const summary =
      profile?.ai_summary?.trim() ||
      profile?.bio_text?.trim() ||
      "Este usuário ainda está configurando o perfil profissional na plataforma.";

    return {
      connection_id: connection.id,
      user_id: relatedUserId,
      slug: card?.slug ?? null,
      title,
      subtitle,
      city: profile?.city ?? null,
      summary,
      pro_photo_url: profile?.pro_photo_url ?? null,
      accepts_professional_contact: profile?.accepts_professional_contact ?? false,
      created_at: connection.created_at,
      responded_at: connection.responded_at,
      status: connection.status,
      is_fallback: !profile || !card?.slug,
    };
  });
}

export default async function DashboardNetworkPage() {
  const supabase = await createClient();

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

    const actionSupabase = await createClient();

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
  }

  async function declineConnection(formData: FormData) {
    "use server";

    const connectionId = String(formData.get("connection_id") || "").trim();
    if (!connectionId) return;

    const actionSupabase = await createClient();

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

  const receivedPending = (receivedPendingRows ?? []) as ConnectionRow[];
  const sentPending = (sentPendingRows ?? []) as ConnectionRow[];
  const acceptedConnections = (acceptedRows ?? []) as ConnectionRow[];

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
        visible_in_network
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

  const receivedItems = buildItems(
    receivedPending,
    "requester_user_id",
    profileByUserId,
    cardByUserId
  );

  const sentItems = buildItems(
    sentPending,
    "target_user_id",
    profileByUserId,
    cardByUserId
  );

  const acceptedItems = buildItems(
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

  return (
    <main style={pageContainerStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          Network profissional
        </h1>

        <p style={{ margin: 0, opacity: 0.82, maxWidth: 880, lineHeight: 1.6 }}>
          Aqui você acompanha quem tentou se conectar com você, o que você enviou
          e suas conexões profissionais confirmadas.
        </p>

        <div style={{ marginTop: 8 }}>
          <Link href="/dashboard" style={{ textDecoration: "underline" }}>
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      <section style={{ ...panelStyle(), marginTop: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.82 }}>
          {receivedItems.length} recebida(s) • {sentItems.length} enviada(s) •{" "}
          {acceptedItems.length} confirmada(s)
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Solicitações recebidas</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.78 }}>
          Veja quem entrou em contato com você pela rede profissional.
        </p>

        {receivedItems.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhuma solicitação recebida</h3>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Quando outro profissional enviar uma solicitação para você, ela aparecerá aqui.
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
            {receivedItems.map((item) => (
              <article key={item.connection_id} style={cardStyle()}>
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
                      {item.city ? <span style={badgeStyle()}>{item.city}</span> : null}
                      <span style={badgeStyle()}>{item.status}</span>
                      {item.is_fallback ? (
                        <span style={badgeStyle()}>perfil em configuração</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
                  {item.summary}
                </p>

                <div style={{ fontSize: 13, opacity: 0.72 }}>
                  Recebida em: {formatDate(item.created_at)}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {item.slug ? (
                    <Link href={`/${item.slug}?mode=pro`} style={primaryButtonStyle()}>
                      Abrir perfil profissional
                    </Link>
                  ) : (
                    <span style={{ ...buttonStyle(), opacity: 0.55, cursor: "default" }}>
                      Perfil ainda indisponível
                    </span>
                  )}

                  <form action={acceptConnection}>
                    <input type="hidden" name="connection_id" value={item.connection_id} />
                    <button type="submit" style={primaryButtonStyle()}>
                      Aceitar
                    </button>
                  </form>

                  <form action={declineConnection}>
                    <input type="hidden" name="connection_id" value={item.connection_id} />
                    <button type="submit" style={dangerButtonStyle()}>
                      Recusar
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Solicitações enviadas</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.78 }}>
          Acompanhe os contatos profissionais que você já iniciou.
        </p>

        {sentItems.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhuma solicitação enviada</h3>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Quando você enviar novas solicitações profissionais, elas aparecerão aqui.
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
            {sentItems.map((item) => (
              <article key={item.connection_id} style={cardStyle()}>
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
                      {item.city ? <span style={badgeStyle()}>{item.city}</span> : null}
                      <span style={badgeStyle()}>{item.status}</span>
                      {item.is_fallback ? (
                        <span style={badgeStyle()}>perfil em configuração</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
                  {item.summary}
                </p>

                <div style={{ fontSize: 13, opacity: 0.72 }}>
                  Enviada em: {formatDate(item.created_at)}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {item.slug ? (
                    <Link href={`/${item.slug}?mode=pro`} style={primaryButtonStyle()}>
                      Abrir perfil profissional
                    </Link>
                  ) : (
                    <span style={{ ...buttonStyle(), opacity: 0.55, cursor: "default" }}>
                      Perfil ainda indisponível
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Conexões confirmadas</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.78 }}>
          Aqui ficam seus contatos profissionais já confirmados.
        </p>

        {acceptedItems.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhuma conexão confirmada</h3>
            <p style={{ marginBottom: 0, opacity: 0.82 }}>
              Quando uma solicitação for aceita, a conexão aparecerá aqui.
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
            {acceptedItems.map((item) => (
              <article key={item.connection_id} style={cardStyle()}>
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
                      {item.city ? <span style={badgeStyle()}>{item.city}</span> : null}
                      <span style={badgeStyle()}>{item.status}</span>
                      {item.is_fallback ? (
                        <span style={badgeStyle()}>perfil em configuração</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>
                  {item.summary}
                </p>

                <div style={{ fontSize: 13, opacity: 0.72 }}>
                  Criada em: {formatDate(item.created_at)}
                </div>

                {item.responded_at ? (
                  <div style={{ fontSize: 13, opacity: 0.72 }}>
                    Atualizado em: {formatDate(item.responded_at)}
                  </div>
                ) : null}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {item.slug ? (
                    <Link href={`/${item.slug}?mode=pro`} style={primaryButtonStyle()}>
                      Abrir perfil profissional
                    </Link>
                  ) : (
                    <span style={{ ...buttonStyle(), opacity: 0.55, cursor: "default" }}>
                      Perfil ainda indisponível
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}