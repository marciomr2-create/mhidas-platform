// src/app/dashboard/cards/page.tsx
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

function pageStyle() {
  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 460,
    margin: "0 auto",
    padding: "18px 14px 42px",
    boxSizing: "border-box",
  } as const;
}

function heroStyle() {
  return {
    padding: 20,
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(145deg, rgba(125,92,255,0.16), rgba(0,200,120,0.07), rgba(255,255,255,0.025))",
    display: "grid",
    gap: 10,
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
  } as const;
}

function nfcCardStyle() {
  return {
    marginTop: 16,
    padding: 18,
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))",
    display: "grid",
    gap: 16,
    boxShadow: "0 18px 46px rgba(0,0,0,0.26)",
  } as const;
}

function badgeStyle(active = false) {
  return {
    width: "fit-content",
    padding: "7px 10px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(0,200,120,0.26)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(0,200,120,0.10)" : "rgba(255,255,255,0.055)",
    fontSize: 12,
    fontWeight: 850,
  } as const;
}

function modeCardStyle(mode: "club" | "pro") {
  return {
    padding: 14,
    borderRadius: 20,
    border:
      mode === "club"
        ? "1px solid rgba(0,200,120,0.18)"
        : "1px solid rgba(80,150,255,0.18)",
    background:
      mode === "club"
        ? "linear-gradient(145deg, rgba(0,200,120,0.10), rgba(255,255,255,0.025))"
        : "linear-gradient(145deg, rgba(80,150,255,0.10), rgba(255,255,255,0.025))",
    display: "grid",
    gap: 10,
  } as const;
}

function buttonStyle(primary = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 14px",
    minHeight: 44,
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(255,255,255,0.24)"
      : "1px solid rgba(255,255,255,0.13)",
    background: primary
      ? "linear-gradient(135deg, rgba(125,92,255,0.95), rgba(0,200,120,0.36))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  } as const;
}

function subtleButtonStyle() {
  return {
    ...buttonStyle(false),
    minHeight: 40,
    fontSize: 13,
    opacity: 0.86,
  } as const;
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

  return (
    <main style={pageStyle()}>
      <section style={heroStyle()}>
        <span style={badgeStyle(true)}>USECLUBBERS</span>

        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.02, fontWeight: 950 }}>
          Minhas tags
        </h1>

        <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.55, fontSize: 14 }}>
          Escolha uma tag e edite rapidamente sua Identidade Clubber ou Identidade Profissional.
        </p>

        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.74 }}>
          Total de tags: <strong>{items.length}</strong>
        </div>
      </section>

      {items.length === 0 ? (
        <section style={nfcCardStyle()}>
          <strong>Nenhuma tag encontrada.</strong>
          <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.55 }}>
            Quando uma tag estiver vinculada à sua conta, ela aparecerá aqui.
          </p>
          <Link href="/dashboard" style={buttonStyle()}>
            Voltar
          </Link>
        </section>
      ) : (
        items.map((card) => {
          const slug = card.slug ?? "";
          const hasSlug = Boolean(slug);

          return (
            <article key={card.card_id} style={nfcCardStyle()}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle(Boolean(card.is_published))}>
                    {card.is_published ? "Publicado" : "Não publicado"}
                  </span>

                  <span style={badgeStyle()}>
                    {card.status || "Status indefinido"}
                  </span>
                </div>

                <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.08, fontWeight: 950 }}>
                  {card.label || "Tag sem nome"}
                </h2>

                <div style={{ fontSize: 13, opacity: 0.72, lineHeight: 1.5 }}>
                  Link: <strong>{slug || "ainda sem slug"}</strong>
                  <br />
                  Criada em: {formatDate(card.issued_at)}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={modeCardStyle("club")}>
                  <div>
                    <strong style={{ fontSize: 17 }}>Identidade Clubber</strong>
                    <p style={{ margin: "5px 0 0", opacity: 0.76, fontSize: 13, lineHeight: 1.45 }}>
                      Perfil cultural, eventos, carona, encontros, música e cena.
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/cards/${card.card_id}/club`}
                    style={buttonStyle(true)}
                  >
                    Editar Clubber
                  </Link>

                  {hasSlug ? (
                    <Link href={`/${slug}?mode=club`} target="_blank" style={subtleButtonStyle()}>
                      Ver perfil Clubber
                    </Link>
                  ) : null}
                </div>

                <div style={modeCardStyle("pro")}>
                  <div>
                    <strong style={{ fontSize: 17 }}>Identidade Profissional</strong>
                    <p style={{ margin: "5px 0 0", opacity: 0.76, fontSize: 13, lineHeight: 1.45 }}>
                      Perfil profissional, networking, contatos e negócios.
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/cards/${card.card_id}/pro`}
                    style={buttonStyle(true)}
                  >
                    Editar Profissional
                  </Link>

                  {hasSlug ? (
                    <Link href={`/pro/${slug}`} target="_blank" style={subtleButtonStyle()}>
                      Ver perfil Profissional
                    </Link>
                  ) : null}
                </div>
              </div>

              <Link
                href={`/dashboard/cards/${card.card_id}`}
                style={{
                  ...subtleButtonStyle(),
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                Configurações da tag
              </Link>
            </article>
          );
        })
      )}
    </main>
  );
}