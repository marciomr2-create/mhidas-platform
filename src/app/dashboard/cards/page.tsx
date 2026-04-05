import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type CardRow = {
  card_id: string;
  label: string | null;
  status: string | null;
  slug: string | null;
  is_published: boolean | null;
  published_at: string | null;
  issued_at: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function DashboardCardsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cards, error } = await supabase
    .from("cards")
    .select("card_id,label,status,slug,is_published,published_at,issued_at")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  const items = error ? [] : ((cards ?? []) as CardRow[]);

  function pageStyle() {
    return {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
    } as const;
  }

  function sectionStyle() {
    return {
      marginTop: 24,
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 20,
      background: "rgba(255,255,255,0.03)",
    } as const;
  }

  function cardGridStyle() {
    return {
      display: "grid",
      gap: 16,
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      marginTop: 18,
    } as const;
  }

  function cardItemStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 12,
    } as const;
  }

  function badgeStyle(active = false) {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: active ? "rgba(0,200,120,0.14)" : "rgba(255,255,255,0.06)",
      fontSize: 12,
      width: "fit-content",
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

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
          Meus perfis
        </h1>

        <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.6, maxWidth: 760 }}>
          Aqui você visualiza todos os seus perfis públicos e acessa cada perfil
          individualmente para gerenciar links, dados e configurações.
        </p>
      </header>

      <section style={sectionStyle()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
              Lista de perfis
            </h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.78 }}>
              Total encontrado: {items.length}
            </p>
          </div>

          <Link href="/dashboard" style={buttonStyle()}>
            Voltar ao início
          </Link>
        </div>

        {items.length === 0 ? (
          <div style={{ marginTop: 18, opacity: 0.82, lineHeight: 1.6 }}>
            Nenhum perfil foi encontrado para sua conta.
          </div>
        ) : (
          <div style={cardGridStyle()}>
            {items.map((card) => (
              <article key={card.card_id} style={cardItemStyle()}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>
                    {card.label ?? "Perfil sem nome"}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badgeStyle()}>
                      Status: {card.status ?? "—"}
                    </span>

                    <span style={badgeStyle(Boolean(card.is_published))}>
                      {card.is_published ? "Publicado" : "Não publicado"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6, opacity: 0.84 }}>
                  <div>ID: {card.card_id}</div>
                  <div>URL: {card.slug ?? "—"}</div>
                  <div>Criado em: {formatDate(card.issued_at)}</div>
                  <div>Publicado em: {formatDate(card.published_at)}</div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link
                    href={`/dashboard/cards/${card.card_id}`}
                    style={buttonStyle(true)}
                  >
                    Gerenciar perfil
                  </Link>

                  {card.slug ? (
                    <Link href={`/${card.slug}?mode=club`} style={buttonStyle()}>
                      Ver perfil público
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}