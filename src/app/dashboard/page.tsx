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

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentUserId = user.id;

  const { count: totalProfiles } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUserId);

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

  const { count: sentConnections } = await supabase
    .from("professional_connections")
    .select("*", { count: "exact", head: true })
    .eq("requester_user_id", currentUserId)
    .eq("status", "pending");

  const { data: relationshipControls } = await supabase
    .from("professional_relationship_controls")
    .select("owner_user_id, target_user_id, status")
    .eq("owner_user_id", currentUserId);

  const controls = (relationshipControls ?? []) as RelationshipControlRow[];

  const suspendedCount = controls.filter(
    (item) => item.status === "suspended"
  ).length;

  const blockedCount = controls.filter(
    (item) => item.status === "blocked"
  ).length;

  const { count: visibleProfiles } = await supabase
    .from("professional_profiles")
    .select("*", { count: "exact", head: true })
    .eq("visible_in_network", true);

  const activeVisibleProfiles = Math.max(
    0,
    Number(visibleProfiles ?? 0) - suspendedCount - blockedCount
  );

  const nextPrimaryHref =
    (pendingOpportunities ?? 0) > 0 ? "/dashboard/network" : "/network";

  const nextPrimaryLabel =
    (pendingOpportunities ?? 0) > 0
      ? "Responder oportunidades agora"
      : "Descobrir profissionais";

  const nextPrimaryText =
    (pendingOpportunities ?? 0) > 0
      ? "Você já tem pessoas aguardando sua resposta. Este é o movimento mais importante agora."
      : "Sua próxima oportunidade pode estar na busca principal da rede profissional.";

  function pageStyle() {
    return {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
    } as const;
  }

  function heroStyle() {
    return {
      marginTop: 22,
      padding: 24,
      borderRadius: 22,
      border: "1px solid rgba(255,255,255,0.12)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
      display: "grid",
      gap: 16,
    } as const;
  }

  function sectionStyle() {
    return {
      marginTop: 20,
      padding: 20,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.03)",
    } as const;
  }

  function opportunityStyle() {
    return {
      marginTop: 20,
      padding: 18,
      borderRadius: 18,
      border: "1px solid rgba(255,180,0,0.35)",
      background: "rgba(255,180,0,0.08)",
      display: "grid",
      gap: 10,
    } as const;
  }

  function statGridStyle() {
    return {
      marginTop: 20,
      display: "grid",
      gap: 14,
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    } as const;
  }

  function statCardStyle() {
    return {
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 6,
    } as const;
  }

  function buttonStyle() {
    return {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.1)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 700,
      display: "inline-block",
    } as const;
  }

  function primaryButtonStyle() {
    return {
      ...buttonStyle(),
      background: "rgba(255,255,255,0.16)",
    } as const;
  }

  function badgeStyle() {
    return {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      fontSize: 12,
      fontWeight: 700,
      opacity: 0.94,
    } as const;
  }

  return (
    <main style={pageStyle()}>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Início</h1>

      <p
        style={{
          marginTop: 8,
          opacity: 0.82,
          lineHeight: 1.6,
          maxWidth: 760,
        }}
      >
        Acompanhe suas oportunidades, visualize seus perfis e acesse rapidamente
        as principais áreas da sua conta.
      </p>

      <section style={heroStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <span style={badgeStyle()}>Próxima ação recomendada</span>

          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
            {(pendingOpportunities ?? 0) > 0
              ? "Você já tem oportunidade esperando resposta"
              : "Sua rede está pronta para gerar novas conexões"}
          </div>

          <p
            style={{
              margin: 0,
              opacity: 0.88,
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            {nextPrimaryText}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href={nextPrimaryHref} style={primaryButtonStyle()}>
            {nextPrimaryLabel}
          </Link>

          <Link href="/dashboard/cards" style={buttonStyle()}>
            Gerenciar meu perfil
          </Link>

          <Link href="/dashboard/network" style={buttonStyle()}>
            Abrir contatos
          </Link>
        </div>
      </section>

      {(pendingOpportunities ?? 0) > 0 && (
        <section style={opportunityStyle()}>
          <strong style={{ fontSize: 16 }}>
            Você tem {pendingOpportunities} oportunidade(s) aguardando resposta
          </strong>

          <div style={{ opacity: 0.86, lineHeight: 1.6 }}>
            Pessoas já demonstraram interesse em falar com você. Responder agora
            pode gerar novas conexões, negócios e continuidade mais rápida.
          </div>

          <div>
            <Link href="/dashboard/network" style={primaryButtonStyle()}>
              Ver oportunidades
            </Link>
          </div>
        </section>
      )}

      <section style={statGridStyle()}>
        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>SEUS PERFIS</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {totalProfiles ?? 0}
          </div>
          <div style={{ opacity: 0.82 }}>Perfis disponíveis na sua conta</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>OPORTUNIDADES</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {pendingOpportunities ?? 0}
          </div>
          <div style={{ opacity: 0.82 }}>Contatos aguardando sua resposta</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>CONEXÕES ATIVAS</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {activeConnections ?? 0}
          </div>
          <div style={{ opacity: 0.82 }}>Relacionamentos já confirmados</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>CONVITES ENVIADOS</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {sentConnections ?? 0}
          </div>
          <div style={{ opacity: 0.82 }}>Aguardando retorno de outras pessoas</div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>PROFISSIONAIS VISÍVEIS</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {activeVisibleProfiles}
          </div>
          <div style={{ opacity: 0.82 }}>
            Disponíveis hoje para descoberta na rede
          </div>
        </div>

        <div style={statCardStyle()}>
          <div style={{ fontSize: 12, opacity: 0.72 }}>PERFIS OCULTADOS</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {suspendedCount + blockedCount}
          </div>
          <div style={{ opacity: 0.82 }}>
            {suspendedCount} suspenso(s) • {blockedCount} bloqueado(s)
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Seu perfil</h2>

        <p style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6 }}>
          Ajuste sua apresentação, organize seus canais e fortaleça a conversão
          do seu perfil profissional.
        </p>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href="/dashboard/cards" style={buttonStyle()}>
            Gerenciar meu perfil
          </Link>

          <Link href="/network" style={buttonStyle()}>
            Ver como a rede está hoje
          </Link>
        </div>
      </section>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Contatos profissionais</h2>

        <p style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6 }}>
          Acompanhe quem quer falar com você, veja suas conexões confirmadas e
          mantenha sua rede organizada.
        </p>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href="/dashboard/network" style={buttonStyle()}>
            Abrir contatos
          </Link>

          <Link href="/network/connections" style={buttonStyle()}>
            Ver minhas conexões
          </Link>
        </div>
      </section>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Descoberta da rede</h2>

        <p style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6 }}>
          Use a busca principal para encontrar profissionais visíveis na rede e
          abrir novas conexões com mais agilidade.
        </p>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href="/network" style={primaryButtonStyle()}>
            Descobrir profissionais
          </Link>
        </div>
      </section>
    </main>
  );
}