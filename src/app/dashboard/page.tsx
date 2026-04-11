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

  const { data: relationshipControls } = await supabase
    .from("professional_relationship_controls")
    .select("owner_user_id, target_user_id, status")
    .eq("owner_user_id", currentUserId);

  const controls = (relationshipControls ?? []) as RelationshipControlRow[];

  const suspendedCount = controls.filter((item) => item.status === "suspended").length;
  const blockedCount = controls.filter((item) => item.status === "blocked").length;

  function pageStyle() {
    return {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
    } as const;
  }

  function sectionStyle() {
    return {
      marginTop: 22,
      padding: 22,
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 14,
    } as const;
  }

  function buttonStyle(primary = false) {
    return {
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: primary ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 800,
      display: "inline-block",
    } as const;
  }

  function statStyle() {
    return {
      fontSize: 28,
      fontWeight: 900,
    };
  }

  return (
    <main style={pageStyle()}>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Dashboard</h1>

      <p style={{ marginTop: 8, opacity: 0.82 }}>
        Controle seus perfis, conexões e oportunidades em um único lugar.
      </p>

      {/* HUB DE PERFIS (PRINCIPAL) */}
      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Seus perfis</h2>

        <p style={{ opacity: 0.82 }}>
          Cada perfil possui duas identidades: Club (cultural) e Pro (profissional).
        </p>

        <div style={statStyle()}>
          {totalProfiles ?? 0} perfil(is)
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/cards" style={buttonStyle(true)}>
            Abrir meus perfis
          </Link>
        </div>
      </section>

      {/* OPORTUNIDADES */}
      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Oportunidades</h2>

        <div style={statStyle()}>
          {pendingOpportunities ?? 0}
        </div>

        <p style={{ opacity: 0.82 }}>
          Pessoas aguardando resposta para conexão profissional.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/network" style={buttonStyle(true)}>
            Ver oportunidades
          </Link>
        </div>
      </section>

      {/* CONEXÕES */}
      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Conexões ativas</h2>

        <div style={statStyle()}>
          {activeConnections ?? 0}
        </div>

        <p style={{ opacity: 0.82 }}>
          Relacionamentos profissionais já confirmados.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/network/connections" style={buttonStyle()}>
            Ver conexões
          </Link>
        </div>
      </section>

      {/* CONTROLE */}
      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Controle da rede</h2>

        <p style={{ opacity: 0.82 }}>
          {suspendedCount} suspenso(s) • {blockedCount} bloqueado(s)
        </p>
      </section>
    </main>
  );
}