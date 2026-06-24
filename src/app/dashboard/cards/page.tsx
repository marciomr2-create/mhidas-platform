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
    maxWidth: 860,
    margin: "0 auto",
    padding: "16px 12px 42px",
    boxSizing: "border-box",
    color: "#ffffff",
  } as const;
}

function heroStyle() {
  return {
    padding: "24px 18px",
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.13)",
    background:
      "radial-gradient(circle at 18% 10%, rgba(20,184,166,0.22), transparent 34%), radial-gradient(circle at 90% 8%, rgba(125,92,255,0.24), transparent 34%), linear-gradient(135deg, rgba(17,24,39,0.98), rgba(4,12,15,0.98))",
    display: "grid",
    gap: 12,
    boxShadow: "0 24px 74px rgba(0,0,0,0.38)",
  } as const;
}

function panelStyle(highlight = false) {
  return {
    marginTop: 12,
    padding: 17,
    borderRadius: 22,
    border: highlight
      ? "1px solid rgba(20,184,166,0.34)"
      : "1px solid rgba(255,255,255,0.12)",
    background: highlight
      ? "linear-gradient(135deg, rgba(20,184,166,0.12), rgba(125,92,255,0.08))"
      : "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
    display: "grid",
    gap: 14,
    boxShadow: "0 16px 42px rgba(0,0,0,0.27)",
  } as const;
}

function modePanelStyle(mode: "club" | "pro") {
  return {
    padding: 15,
    borderRadius: 20,
    border:
      mode === "club"
        ? "1px solid rgba(20,184,166,0.28)"
        : "1px solid rgba(125,92,255,0.22)",
    background:
      mode === "club"
        ? "linear-gradient(145deg, rgba(20,184,166,0.11), rgba(255,255,255,0.025))"
        : "linear-gradient(145deg, rgba(125,92,255,0.11), rgba(255,255,255,0.025))",
    display: "grid",
    gap: 11,
  } as const;
}

function gridStyle(min = 260) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 12,
  } as const;
}

function actionGridStyle(min = 180) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 9,
  } as const;
}

function buttonStyle(primary = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 15px",
    minHeight: 46,
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
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow: primary ? "0 14px 38px rgba(20,184,166,0.20)" : "none",
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

function mutedTextStyle() {
  return {
    margin: 0,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.55,
  } as const;
}

function statusLineStyle(active = false) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: active ? "rgba(165,255,230,0.94)" : "rgba(255,255,255,0.70)",
    fontSize: 13,
    fontWeight: 800,
  } as const;
}

function statusDotStyle(active = false) {
  return {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: active ? "rgba(45,212,191,0.95)" : "rgba(255,255,255,0.42)",
    boxShadow: active ? "0 0 14px rgba(45,212,191,0.34)" : "none",
  } as const;
}

export default async function ProfileHubPage() {
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
        <span style={labelStyle()}>USECLUBBERS</span>

        <h1 style={{ margin: 0, fontSize: "clamp(32px, 8.5vw, 52px)", lineHeight: 0.98, fontWeight: 950, letterSpacing: "-0.055em" }}>
          Meus perfis
        </h1>

        <p style={{ ...mutedTextStyle(), fontSize: 15, maxWidth: 620 }}>
          Escolha um perfil para editar sua Experiência Clubber ou seu Perfil profissional.
        </p>

        <div style={{ marginTop: 2, fontSize: 13, color: "rgba(255,255,255,0.70)", fontWeight: 800 }}>
          Total de perfis: <strong>{items.length}</strong>
        </div>
      </section>

      {items.length === 0 ? (
        <section style={panelStyle(true)}>
          <span style={labelStyle()}>Primeiro acesso</span>

          <h2 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.035em" }}>
            Nenhum perfil vinculado ainda.
          </h2>

          <p style={mutedTextStyle()}>
            Quando seu cartão, pulseira ou pingente USECLUBBERS estiver vinculado à sua conta, seus perfis Clubber e profissional aparecerão aqui.
          </p>

          <p style={mutedTextStyle()}>
            Se você já tem um produto USECLUBBERS e ele não apareceu, volte para a central e confirme se está acessando com a conta correta.
          </p>

          <Link href="/dashboard" style={buttonStyle()}>
            Voltar à central
          </Link>
        </section>
      ) : (
        items.map((card) => {
          const slug = card.slug ?? "";
          const hasSlug = Boolean(slug);
          const isPublished = Boolean(card.is_published);

          return (
            <article key={card.card_id} style={panelStyle(isPublished)}>
              <div style={{ display: "grid", gap: 9 }}>
                <span style={labelStyle()}>Perfil USECLUBBERS</span>

                <h2 style={{ margin: 0, fontSize: 27, lineHeight: 1.04, fontWeight: 950, letterSpacing: "-0.04em" }}>
                  {card.label || "Perfil sem nome"}
                </h2>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={statusLineStyle(isPublished)}>
                    <span style={statusDotStyle(isPublished)} />
                    {isPublished ? "Publicado" : "Ainda não publicado"}
                  </div>

                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.5 }}>
                    Link público: <strong>{slug || "ainda não definido"}</strong>
                    <br />
                    Criado em: {formatDate(card.issued_at)}
                  </div>
                </div>
              </div>

              <div style={gridStyle(260)}>
                <div style={modePanelStyle("club")}>
                  <div>
                    <strong style={{ fontSize: 19 }}>Experiência Clubber</strong>
                    <p style={{ ...mutedTextStyle(), marginTop: 6, fontSize: 13 }}>
                      Música, eventos, caronas, encontros, artistas e pertencimento na cena.
                    </p>
                  </div>

                  <div style={actionGridStyle()}>
                    <Link
                      href={`/dashboard/cards/${card.card_id}/club`}
                      style={buttonStyle(true)}
                    >
                      Gerenciar Clubber
                    </Link>

                    {hasSlug ? (
                      <Link href={`/${slug}?mode=club`} target="_blank" style={buttonStyle()}>
                        Ver perfil Clubber
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div style={modePanelStyle("pro")}>
                  <div>
                    <strong style={{ fontSize: 19 }}>Perfil profissional</strong>
                    <p style={{ ...mutedTextStyle(), marginTop: 6, fontSize: 13 }}>
                      Atuação, contatos, networking, oportunidades e negócios.
                    </p>
                  </div>

                  <div style={actionGridStyle()}>
                    <Link
                      href={`/dashboard/cards/${card.card_id}/pro`}
                      style={buttonStyle(true)}
                    >
                      Editar profissional
                    </Link>

                    {hasSlug ? (
                      <Link href={`/pro/${slug}`} target="_blank" style={buttonStyle()}>
                        Ver perfil profissional
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </main>
  );
}
