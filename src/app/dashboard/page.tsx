import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type CardRow = {
  card_id: string;
  label: string | null;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cards } = await supabase
    .from("cards")
    .select("card_id,label,status")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  const items = (cards ?? []) as CardRow[];

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Dashboard</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>Usuário: {user.email}</p>

      <div style={{ marginTop: 14 }}>
        <Link href="/dashboard/cards" style={{ textDecoration: "underline" }}>
          Ir para /dashboard/cards
        </Link>
      </div>

      <section
        style={{
          marginTop: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>
          Meus Cards
        </h2>

        {items.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhum card encontrado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                <tr key={c.card_id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                    {c.label ?? "—"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{c.status}</td>
                  <td style={{ padding: "10px 8px", opacity: 0.9 }}>
                    {c.card_id}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <Link href={`/dashboard/cards/${c.card_id}`} style={{ textDecoration: "underline" }}>
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