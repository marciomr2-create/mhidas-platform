import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type CardRow = {
  card_id: string;
  label: string | null;
  status: string | null;
};

type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";

type ConnectionRow = {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  status: ConnectionStatus;
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentUserId = user.id;

  const { data: cards } = await supabase
    .from("cards")
    .select("card_id,label,status")
    .eq("user_id", currentUserId)
    .order("issued_at", { ascending: false });

  const { data: connectionRows } = await supabase
    .from("professional_connections")
    .select("id,requester_user_id,target_user_id,status")
    .or(`requester_user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`);

  const items = (cards ?? []) as CardRow[];
  const connections = (connectionRows ?? []) as ConnectionRow[];

  const receivedPendingCount = connections.filter(
    (row) => row.target_user_id === currentUserId && row.status === "pending"
  ).length;

  const sentPendingCount = connections.filter(
    (row) => row.requester_user_id === currentUserId && row.status === "pending"
  ).length;

  const acceptedCount = connections.filter(
    (row) =>
      row.status === "accepted" &&
      (row.requester_user_id === currentUserId || row.target_user_id === currentUserId)
  ).length;

  function pageStyle() {
    return {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
    } as const;
  }

  function gridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      marginTop: 24,
    } as const;
  }

  function cardStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 20,
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 14,
    } as const;
  }

  function statBoxStyle(highlight = false) {
    return {
      border: highlight
        ? "1px solid rgba(255,255,255,0.22)"
        : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: 14,
      background: highlight ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
    } as const;
  }

  function buttonStyle(primary = false) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "11px 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: primary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 700,
      width: "fit-content",
    } as const;
  }

  function alertStyle() {
    return {
      marginTop: 20,
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.06)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
    } as const;
  }

  function tableWrapStyle() {
    return {
      marginTop: 24,
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 18,
      background: "rgba(255,255,255,0.03)",
    } as const;
  }

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Dashboard</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>Usuário: {user.email}</p>
        <p style={{ margin: 0, opacity: 0.72, maxWidth: 760, lineHeight: 1.6 }}>
          Gerencie seus cards, acompanhe seu networking profissional e acesse
          rapidamente as áreas principais da plataforma.
        </p>
      </header>

      {receivedPendingCount > 0 ? (
        <section style={alertStyle()}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {receivedPendingCount === 1
                ? "Você recebeu 1 nova solicitação profissional."
                : `Você recebeu ${receivedPendingCount} novas solicitações profissionais.`}
            </div>
            <p style={{ margin: "8px 0 0 0", opacity: 0.82, lineHeight: 1.6 }}>
              Revise suas solicitações recebidas para aceitar ou recusar novos contatos
              dentro da rede.
            </p>
          </div>

          <Link href="/dashboard/network" style={buttonStyle(true)}>
            Revisar agora
          </Link>
        </section>
      ) : null}

      <section style={gridStyle()}>
        <article style={cardStyle()}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Meus cards</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.8, lineHeight: 1.6 }}>
              Gerencie seus cards, status, publicação e acesso às páginas individuais.
            </p>
          </div>

          <div style={statBoxStyle()}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Cards encontrados</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{items.length}</div>
          </div>

          <Link href="/dashboard/cards" style={buttonStyle(true)}>
            Abrir gestão de cards
          </Link>
        </article>

        <article style={cardStyle()}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
              Networking profissional
            </h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.8, lineHeight: 1.6 }}>
              Acompanhe solicitações recebidas, solicitações enviadas e conexões
              profissionais confirmadas.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            <div style={statBoxStyle(receivedPendingCount > 0)}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {receivedPendingCount > 0 ? "Recebidas novas" : "Recebidas"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{receivedPendingCount}</div>
            </div>

            <div style={statBoxStyle()}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Enviadas</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{sentPendingCount}</div>
            </div>

            <div style={statBoxStyle()}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Confirmadas</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{acceptedCount}</div>
            </div>
          </div>

          <Link href="/dashboard/network" style={buttonStyle(true)}>
            Abrir networking
          </Link>
        </article>
      </section>

      <section style={tableWrapStyle()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Resumo dos cards</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.78 }}>
              Visualização rápida dos cards vinculados à sua conta.
            </p>
          </div>

          <Link href="/dashboard/cards" style={buttonStyle()}>
            Ver todos os cards
          </Link>
        </div>

        {items.length === 0 ? (
          <p style={{ marginTop: 18, opacity: 0.8 }}>Nenhum card encontrado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.8 }}>
                <th style={{ padding: "10px 8px" }}>Label</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}>Card ID</th>
                <th style={{ padding: "10px 8px" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.card_id}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                    {c.label ?? "—"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{c.status ?? "—"}</td>
                  <td style={{ padding: "10px 8px", opacity: 0.9 }}>{c.card_id}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <Link
                      href={`/dashboard/cards/${c.card_id}`}
                      style={{ textDecoration: "underline" }}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}