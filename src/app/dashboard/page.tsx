// src/app/dashboard/page.tsx
import Link from "next/link";
import DashboardNotificationsPanel from "@/components/notifications/DashboardNotificationsPanel";
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

  const { count: clubberProfilesCount } = await supabase
    .from("club_profiles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUserId);

  const { count: professionalProfilesCount } = await supabase
    .from("professional_profiles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUserId);

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
  const hasClubberProfile = (clubberProfilesCount ?? 0) > 0;
  const hasProfessionalProfile = (professionalProfilesCount ?? 0) > 0;
  const profileHubHref = hasProfiles ? "/dashboard/cards" : "/onboarding";
  const primaryCard = profiles[0] ?? null;
  const proHubHref = hasProfessionalProfile
    ? "/dashboard/network"
    : primaryCard
      ? `/dashboard/cards/${primaryCard.card_id}/pro`
      : "/onboarding";
  const firstPublishedClubProfile = profiles.find(
    (profile) => profile.slug && profile.status === "active" && profile.is_published
  );

  function pageStyle() {
    return {
      width: "min(960px, 100vw)",
      maxWidth: "100%",
      minWidth: 0,
      margin: "0 auto",
      padding: "16px 12px 42px",
      color: "#F8FAFC",
      boxSizing: "border-box",
      overflowX: "clip",
    } as const;
  }

  function heroStyle() {
    return {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
      boxSizing: "border-box",
      borderRadius: 28,
      border: "1px solid rgba(148,163,184,0.18)",
      background: "var(--mhidas-card-dark)",
      boxShadow: "0 24px 74px rgba(5,7,13,0.38)",
      padding: "24px 18px",
      display: "grid",
      gap: 17,
    } as const;
  }

  function glassCardStyle(tone: "neutral" | "clubber" | "pro" = "neutral") {
    return {
      borderRadius: 22,
      border:
        tone === "clubber"
          ? "1px solid rgba(42,134,148,0.28)"
          : tone === "pro"
            ? "1px solid rgba(29,78,216,0.34)"
            : "1px solid rgba(148,163,184,0.18)",
      background:
        tone === "clubber"
          ? "var(--mhidas-card-dark)"
          : tone === "pro"
            ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(79,70,229,0.12))"
            : "var(--mhidas-card-dark)",
      boxShadow: "0 16px 42px rgba(5,7,13,0.27)",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      padding: 17,
      display: "grid",
      gap: 12,
      boxSizing: "border-box",
      overflowWrap: "anywhere",
    } as const;
  }

  function gridStyle(min = 230) {
    return {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
      gap: 12,
      marginTop: 12,
      boxSizing: "border-box",
    } as const;
  }

  function actionGridStyle(min = 220) {
    return {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
      gap: 9,
      boxSizing: "border-box",
    } as const;
  }

  function buttonStyle(tone: "secondary" | "clubber" | "pro" = "secondary") {
    const isClubber = tone === "clubber";
    const isPro = tone === "pro";

    return {
      minHeight: 46,
      padding: "12px 15px",
      borderRadius: 14,
      border: isClubber
        ? "1px solid rgba(36,124,136,0.52)"
        : isPro
          ? "1px solid rgba(29,78,216,0.52)"
          : "1px solid rgba(148,163,184,0.18)",
      background: isClubber
        ? "var(--mhidas-clubber-action-strong)"
        : isPro
          ? "#1D4ED8"
          : "var(--mhidas-card-secondary)",
      color: "#F8FAFC",
      textDecoration: "none",
      fontWeight: 900,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      boxShadow: isClubber
        ? "none"
        : isPro
          ? "0 10px 24px rgba(29,78,216,0.16)"
          : "none",
      textAlign: "center",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      lineHeight: 1.25,
    } as const;
  }

  function labelStyle() {
    return {
      width: "fit-content",
      color: "var(--mhidas-clubber-action)",
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
      color: "#CBD5E1",
      lineHeight: 1.55,
      overflowWrap: "anywhere",
    } as const;
  }

  return (
    <main className="mhidas-dashboard-shell" style={pageStyle()}>
      <style>{`
        .mhidas-dashboard-shell,
        .mhidas-dashboard-hero,
        .mhidas-dashboard-grid,
        .mhidas-dashboard-actions,
        .mhidas-dashboard-card,
        .mhidas-dashboard-content,
        .mhidas-dashboard-title {
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }

        .mhidas-dashboard-title {
          overflow-wrap: anywhere;
        }

        @media (max-width: 640px) {
          .mhidas-dashboard-shell {
            width: 100dvw !important;
            max-width: 100dvw !important;
            margin: 0 !important;
            padding: 12px 10px 36px !important;
            overflow-x: clip !important;
          }

          .mhidas-dashboard-hero {
            width: 100% !important;
            padding: 20px 15px !important;
            border-radius: 22px !important;
          }

          .mhidas-dashboard-grid,
          .mhidas-dashboard-actions {
            width: 100% !important;
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .mhidas-dashboard-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .mhidas-dashboard-title {
            font-size: clamp(30px, 10vw, 42px) !important;
            line-height: 1.02 !important;
            letter-spacing: -0.045em !important;
          }

          .mhidas-dashboard-shell a {
            min-width: 0 !important;
            max-width: 100% !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
          }
        }
      `}</style>

      <section className="mhidas-dashboard-hero" style={heroStyle()}>
        <div className="mhidas-dashboard-content" style={{ display: "grid", gap: 11, maxWidth: 760, minWidth: 0 }}>
          <span style={labelStyle()}>USECLUBBERS</span>

          <h1
            className="mhidas-dashboard-title"
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
            Organize sua presença Clubber, acompanhe seus eventos e mantenha suas conexões em um só lugar.
          </p>
        </div>

        <div className="mhidas-dashboard-actions" style={actionGridStyle()}>
          <Link href={profileHubHref} style={buttonStyle("clubber")}>
            {hasProfiles ? "Abrir meus perfis" : "Criar meu perfil Clubber"}
          </Link>

          {firstPublishedClubProfile?.slug ? (
            <Link href={`/${firstPublishedClubProfile.slug}?mode=club`} style={buttonStyle()}>
              Ver meu perfil Clubber
            </Link>
          ) : null}

          {hasClubberProfile ? (
            <Link href="/dashboard/organizations" style={buttonStyle("clubber")}>
              Minhas organizações
            </Link>
          ) : null}

          {hasClubberProfile ? (
            <Link href={proHubHref} style={buttonStyle("pro")}>
              {hasProfessionalProfile
                ? "Ver oportunidades Pro"
                : "Ativar perfil profissional"}
            </Link>
          ) : null}
        </div>
      </section>

      <DashboardNotificationsPanel />

      <section className="mhidas-dashboard-grid" style={gridStyle(180)}>
        <article className="mhidas-dashboard-card" style={glassCardStyle("clubber")}>
          <span style={{ color: "#CBD5E1", fontWeight: 800 }}>
            Perfis
          </span>
          <strong style={statNumberStyle()}>{profileCount}</strong>
          <p style={mutedTextStyle()}>
            Suas identidades Clubber e Pro.
          </p>
        </article>

        <article className="mhidas-dashboard-card" style={glassCardStyle()}>
          <span style={{ color: "#CBD5E1", fontWeight: 800 }}>
            Ingressos
          </span>
          <strong style={statNumberStyle()}>{ticketCount}</strong>
          <p style={mutedTextStyle()}>
            Eventos com presença marcada.
          </p>
        </article>

        <article className="mhidas-dashboard-card" style={glassCardStyle()}>
          <span style={{ color: "#CBD5E1", fontWeight: 800 }}>
            Oportunidades
          </span>
          <strong style={statNumberStyle()}>{pendingCount}</strong>
          <p style={mutedTextStyle()}>
            Pessoas aguardando resposta.
          </p>
        </article>

        <article className="mhidas-dashboard-card" style={glassCardStyle()}>
          <span style={{ color: "#CBD5E1", fontWeight: 800 }}>
            Conexões
          </span>
          <strong style={statNumberStyle()}>{connectionCount}</strong>
          <p style={mutedTextStyle()}>
            Contatos já confirmados.
          </p>
        </article>
      </section>

      <section className="mhidas-dashboard-grid" style={gridStyle(300)}>
        <article className="mhidas-dashboard-card" style={glassCardStyle("clubber")}>
          <span style={labelStyle()}>Próximo passo</span>

          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.035em" }}>
            {hasProfiles ? "Fortaleça sua presença Clubber" : "Prepare seu perfil Clubber"}
          </h2>

          <p style={mutedTextStyle()}>
            {hasProfiles
              ? "Atualize artistas, vertentes, eventos e links para aparecer melhor no radar social."
              : "Esse é o ponto de partida para entrar no radar, se conectar com pessoas e participar dos eventos."}
          </p>

          <div className="mhidas-dashboard-actions" style={actionGridStyle(180)}>
            <Link href={profileHubHref} style={buttonStyle("clubber")}>
              {hasProfiles ? "Editar meu perfil" : "Criar meu perfil Clubber"}
            </Link>

            {firstPublishedClubProfile?.slug ? (
              <Link href={`/${firstPublishedClubProfile.slug}?mode=club`} style={buttonStyle()}>
                Abrir perfil público
              </Link>
            ) : null}
          </div>
        </article>

        <article className="mhidas-dashboard-card" style={glassCardStyle()}>
          <span style={labelStyle()}>Radar social</span>

          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.035em" }}>
            Eventos, presença e conexões no mesmo fluxo.
          </h2>

          <p style={mutedTextStyle()}>
            Marque presença, encontre Clubbers compatíveis e use o radar para caronas, encontros e novas conexões.
          </p>

          <div className="mhidas-dashboard-actions" style={actionGridStyle(180)}>
            <Link href="/clubbers" style={buttonStyle("clubber")}>
              Descobrir Clubbers
            </Link>

            <Link href="/event/ame-club" style={buttonStyle()}>
              Eventos no radar
            </Link>

            <Link href="/network/connections" style={buttonStyle()}>
              Ver conexões
            </Link>
          </div>
        </article>
      </section>

      <section className="mhidas-dashboard-grid" style={gridStyle(280)}>
        <article className="mhidas-dashboard-card" style={glassCardStyle("clubber")}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Experiência Clubber</h2>
          <p style={mutedTextStyle()}>
            Música, eventos, artistas, lugares favoritos, pertencimento na cena e descoberta de eventos.
          </p>
          <Link href={profileHubHref} style={buttonStyle("clubber")}>
            {hasProfiles ? "Gerenciar Clubber" : "Criar meu perfil Clubber"}
          </Link>
        </article>

        <article className="mhidas-dashboard-card" style={glassCardStyle("pro")}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Perfil profissional</h2>
          <p style={mutedTextStyle()}>
            Este é o seu perfil profissional para negócios. Use-o para divulgar
            sua atuação, portfólio, contatos e oportunidades. No dia a dia,
            ele funciona como seu cartão de visitas profissional e pode ser
            compartilhado com um toque NFC.
          </p>
          <Link href={proHubHref} style={buttonStyle("pro")}>
            {hasProfessionalProfile
              ? "Gerenciar Pro"
              : hasClubberProfile
                ? "Ativar perfil profissional"
                : "Crie seu perfil Clubber primeiro"}
          </Link>
        </article>

        <article className="mhidas-dashboard-card" style={glassCardStyle()}>
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
