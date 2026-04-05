import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count: totalProfiles } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: pendingOpportunities } = await supabase
    .from("professional_connections")
    .select("*", { count: "exact", head: true })
    .eq("target_user_id", user.id)
    .eq("status", "pending");

  function pageStyle() {
    return {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
    } as const;
  }

  function sectionStyle() {
    return {
      marginTop: 20,
      padding: 20,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.03)",
    } as const;
  }

  function opportunityStyle() {
    return {
      marginTop: 20,
      padding: 18,
      borderRadius: 16,
      border: "1px solid rgba(255,180,0,0.35)",
      background: "rgba(255,180,0,0.08)",
    } as const;
  }

  function buttonStyle() {
    return {
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.1)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 700,
      display: "inline-block",
    } as const;
  }

  return (
    <main style={pageStyle()}>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Início</h1>

      <p style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6, maxWidth: 760 }}>
        Acompanhe suas oportunidades, visualize seus perfis e acesse rapidamente
        as principais áreas da sua conta.
      </p>

      {(pendingOpportunities ?? 0) > 0 && (
        <section style={opportunityStyle()}>
          <strong style={{ fontSize: 16 }}>
            Você tem {pendingOpportunities} oportunidade(s) aguardando resposta
          </strong>

          <div style={{ marginTop: 8, opacity: 0.86, lineHeight: 1.6 }}>
            Pessoas já demonstraram interesse em falar com você. Responder agora
            pode gerar novas conexões.
          </div>

          <div style={{ marginTop: 12 }}>
            <Link href="/dashboard/network" style={buttonStyle()}>
              Ver oportunidades
            </Link>
          </div>
        </section>
      )}

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Seu perfil</h2>

        <p style={{ marginTop: 8, opacity: 0.82 }}>
          Total de perfis encontrados: {totalProfiles ?? 0}
        </p>

        <div style={{ marginTop: 10 }}>
          <Link href="/dashboard/cards" style={buttonStyle()}>
            Gerenciar meu perfil
          </Link>
        </div>
      </section>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0 }}>Contatos profissionais</h2>

        <p style={{ marginTop: 8, opacity: 0.82 }}>
          Acompanhe quem quer falar com você e veja suas conexões profissionais.
        </p>

        <div style={{ marginTop: 10 }}>
          <Link href="/dashboard/network" style={buttonStyle()}>
            Abrir contatos
          </Link>
        </div>
      </section>
    </main>
  );
}