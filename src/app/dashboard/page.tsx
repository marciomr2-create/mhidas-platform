// src/app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type RelationshipControlStatus = "suspended" | "blocked";

type RelationshipControlRow = {
  owner_user_id: string;
  target_user_id: string;
  status: RelationshipControlStatus;
};

type CardSummaryRow = {
  card_id: string;
  label: string | null;
  slug: string | null;
  status: string | null;
  is_published: boolean | null;
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentUserId = user.id;

  const { data: profilesData, count: totalProfiles } = await supabase
    .from("cards")
    .select("card_id,label,slug,status,is_published", { count: "exact" })
    .eq("user_id", currentUserId)
    .order("label", { ascending: true });

  const { count: pendingOpportunities } = await supabase
    .from("professional_connections")
    .select("*", { count: "exact", head: true })
    .eq("target_user_id", currentUserId)
    .eq("status", "pending");

  const { count: activeConnections } = await supabase
    .from("professional_connections")
    .select("*", { count: "exact", head: true })
    .or(`requester_user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`)
    .eq("status", "accepted");

  const { count: ticketsMarked } = await supabase
    .from("event_ticket_intents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUserId)
    .eq("status", "ticket_acquired");

  const { data: relationshipControls } = await supabase
    .from("professional_relationship_controls")
    .select("owner_user_id, target_user_id, status")
    .eq("owner_user_id", currentUserId);

  const profiles = (profilesData ?? []) as CardSummaryRow[];
  const controls = (relationshipControls ?? []) as RelationshipControlRow[];

  const suspendedCount = controls.filter((item) => item.status === "suspended").length;
  const blockedCount = controls.filter((item) => item.status === "blocked").length;

  const profileCount = totalProfiles ?? 0;
  const pendingCount = pendingOpportunities ?? 0;
  const connectionCount = activeConnections ?? 0;
  const ticketCount = ticketsMarked ?? 0;
  const hasProfiles = profileCount > 0;
  const firstPublishedClubProfile = profiles.find(
    (profile) => profile.slug && profile.status === "active" && profile.is_published
  );

  function pageStyle() {
    return {
      maxWidth: 960,
      margin: "0 auto",
      padding: "16px 12px 42px",
      color: "#ffffff",
    } as const;
  }

  function heroStyle() {
    return {
      overflow: "hidden",
      borderRadius: 28,
      border: "1px solid rgba(255,255,255,0.13)",
      background:
        "radial-gradient(circle at 18% 10%, rgba(20,184,166,0.22), transparent 34%), radial-gradient(circle at 90% 8%, rgba(125,92,255,0.24), transparent 34%), linear-gradient(135deg, rgba(17,24,39,0.98), rgba(4,12,15,0.98))",
      boxShadow: "0 24px 74px rgba(0,0,0,0.38)",
      padding: "24px 18px",
      display: "grid",
      gap: 17,
    } as const;
  }

  function glassCardStyle(highlight = false) {
    return {
      borderRadius: 22,
      border: highlight
        ? "1px solid rgba(20,184,166,0.34)"
        : "1px solid rgba(255,255,255,0.12)",
      background: highlight
        ? "linear-gradient(135deg, rgba(20,184,166,0.12), rgba(125,92,255,0.08))"
        : "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
      boxShadow: "0 16px 42px rgba(0,0,0,0.27)",
      padding: 17,
      display: "grid",
      gap: 12,
    } as const;
  }

  function gridStyle(min = 230) {
    return {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      gap: 12,
      marginTop: 12,
    } as const;
  }

  function actionGridStyle(min = 220) {
    return {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      gap: 9,
    } as const;
  }

  function buttonStyle(primary = false) {
    return {
      minHeight: 46,
      padding: "12px 15px",
      borderRadius: 999,
      border: primary
        ? "1px solid rgba(45,212,191,0.34)"
        : "1px solid rgba(255,255,255,0.16)",
      background: primary
        ? "linear-gradient(135deg, rgba(20,184,166,0.94), rgba(5,150,105,0.95))"
        : "rgba(255,255,255,0.075)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 900,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      boxSizing: "border-box",
      boxShadow: primary ? "0 14px 38px rgba(20,184,166,0.20)" : "none",
      textAlign: "center",
    } as const;
  }

  function labelStyle() {
    return {
      width: "fit-content",
      color: "rgba(125,245,228,0.96)",
      fontSize: 11,
      fontWeight: 950,
      letterSpacing: "0.055em",
      textTransform: "uppercase",
    } as const;
  }

  function statNumberStyle() {
    return {
      fontSize: 32,
      lineHeight: 1,
      fontWeight: 950,
      letterSpacing: "-0.04em",
    } as const;
  }

  function mutedTextStyle() {
    return {
      margin: 0,
      color: "rgba(255,255,255,0.76)",
      lineHeight: 1.55,
    } as const;
  }

  return (
    <main style={pageStyle()}>
      <section style={heroStyle()}>
        <div style={{ display: "grid", gap: 11, maxWidth: 760 }}>
          <span style={labelStyle()}>USECLUBBERS</span>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(31px, 8.5vw, 56px)",
              lineHeight: 0.98,
              fontWeight: 950,
              letterSpacing: "-0.055em",
            }}
          >
            Sua central de perfis, eventos e conexões.
          </h1>

          <p
            style={{
              ...mutedTextStyle(),
              fontSize: 15,
              maxWidth: 650,
            }}
          >
            Organize sua presença Club, acompanhe seus eventos e mantenha suas conexões em um só lugar.
          </p>
        </div>

        <div style={actionGridStyle()}>
          <Link href="/dashboard/cards" style={buttonStyle(true)}>
            {hasProfiles ? "Abrir meus perfis" : "Criar meu perfil Club"}
          </Link>

          {firstPublishedClubProfile?.slug ? (
            <Link href={`/${firstPublishedClubProfile.slug}?mode=club`} style={buttonStyle()}>
              Ver meu perfil Club
            </Link>
          ) : null}

          <Link href="/dashboard/network" style={buttonStyle()}>
            Ver oportunidades Pro
          </Link>
        </div>
      </section>

      <section style={gridStyle(180)}>
        <article style={glassCardStyle(true)}>
          <span style={{ color: "rgba(255,255,255,0.64)", fontWeight: 800 }}>
            Perfis
          </span>
          <strong style={statNumberStyle()}>{profileCount}</strong>
          <p style={mutedTextStyle()}>
            Suas identidades Club e Pro.
          </p>
        </article>

        <article style={glassCardStyle()}>
          <span style={{ color: "rgba(255,255,255,0.64)", fontWeight: 800 }}>
            Ingressos
          </span>
          <strong style={statNumberStyle()}>{ticketCount}</strong>
          <p style={mutedTextStyle()}>
            Eventos com presença marcada.
          </p>
        </article>

        <article style={glassCardStyle()}>
          <span style={{ color: "rgba(255,255,255,0.64)", fontWeight: 800 }}>
            Oportunidades
          </span>
          <strong style={statNumberStyle()}>{pendingCount}</strong>
          <p style={mutedTextStyle()}>
            Pessoas aguardando resposta.
          </p>
        </article>

        <article style={glassCardStyle()}>
          <span style={{ color: "rgba(255,255,255,0.64)", fontWeight: 800 }}>
            Conexões
          </span>
          <strong style={statNumberStyle()}>{connectionCount}</strong>
          <p style={mutedTextStyle()}>
            Contatos já confirmados.
          </p>
        </article>
      </section>

      <section style={gridStyle(300)}>
        <article style={glassCardStyle(true)}>
          <span style={labelStyle()}>Próximo passo</span>

          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.035em" }}>
            {hasProfiles ? "Fortaleça sua presença Club" : "Crie seu perfil Club"}
          </h2>

          <p style={mutedTextStyle()}>
            {hasProfiles
              ? "Atualize artistas, vertentes, eventos e links para aparecer melhor no radar social."
              : "Esse é o ponto de partida para entrar no radar, se conectar com pessoas e participar dos eventos."}
          </p>

          <div style={actionGridStyle(180)}>
            <Link href="/dashboard/cards" style={buttonStyle(true)}>
              {hasProfiles ? "Editar meu perfil" : "Começar agora"}
            </Link>

            {firstPublishedClubProfile?.slug ? (
              <Link href={`/${firstPublishedClubProfile.slug}?mode=club`} style={buttonStyle()}>
                Abrir perfil público
              </Link>
            ) : null}
          </div>
        </article>

        <article style={glassCardStyle()}>
          <span style={labelStyle()}>Radar social</span>

          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.035em" }}>
            Eventos, presença e conexões no mesmo fluxo.
          </h2>

          <p style={mutedTextStyle()}>
            Marque presença, encontre Clubbers compatíveis e use o radar para caronas, encontros e novas conexões.
          </p>

          <div style={actionGridStyle(180)}>
            <Link href="/event/ame-club" style={buttonStyle(true)}>
              Eventos no radar
            </Link>

            <Link href="/network/connections" style={buttonStyle()}>
              Ver conexões
            </Link>
          </div>
        </article>
      </section>

      <section style={gridStyle(280)}>
        <article style={glassCardStyle()}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Experiência Club</h2>
          <p style={mutedTextStyle()}>
            Música, eventos, artistas, lugares favoritos e pertencimento na cena.
          </p>
          <Link href="/dashboard/cards" style={buttonStyle(true)}>
            Gerenciar Club
          </Link>
        </article>

        <article style={glassCardStyle()}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Perfil profissional</h2>
          <p style={mutedTextStyle()}>
            Área profissional separada da experiência Club, com conexões e oportunidades.
          </p>
          <Link href="/dashboard/network" style={buttonStyle()}>
            Gerenciar Pro
          </Link>
        </article>

        <article style={glassCardStyle()}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Segurança da conta</h2>
          <p style={mutedTextStyle()}>
            {suspendedCount} suspenso(s) · {blockedCount} bloqueado(s)
          </p>
          <p style={mutedTextStyle()}>
            Controle para manter suas interações saudáveis.
          </p>
        </article>
      </section>
    </main>
  );
}
