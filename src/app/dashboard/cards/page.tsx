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
};

function pageStyle() {
  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 860,
    margin: "0 auto",
    padding: "16px 12px 42px",
    boxSizing: "border-box",
    color: "#F8FAFC",
  } as const;
}

function heroStyle() {
  return {
    padding: "24px 18px",
    borderRadius: 28,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "var(--mhidas-card-dark)",
    display: "grid",
    gap: 12,
    boxShadow: "0 24px 74px rgba(5,7,13,0.38)",
  } as const;
}

function panelStyle(highlight = false) {
  return {
    marginTop: 12,
    padding: 17,
    borderRadius: 22,
    border: highlight
      ? "1px solid rgba(42,134,148,0.28)"
      : "1px solid rgba(148,163,184,0.18)",
    background: highlight
      ? "var(--mhidas-card-dark)"
      : "var(--mhidas-card-dark)",
    display: "grid",
    gap: 14,
    boxShadow: "0 16px 42px rgba(5,7,13,0.27)",
  } as const;
}

function modePanelStyle(mode: "club" | "pro") {
  return {
    padding: 15,
    borderRadius: 20,
    border:
      mode === "club"
        ? "1px solid rgba(42,134,148,0.28)"
        : "1px solid rgba(29,78,216,0.34)",
    background:
      mode === "club"
        ? "var(--mhidas-card-dark)"
        : "linear-gradient(145deg, #0F172A, rgba(79,70,229,0.16))",
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

function buttonStyle(tone: "secondary" | "clubber" | "pro" = "secondary") {
  const isClubber = tone === "clubber";
  const isPro = tone === "pro";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 15px",
    minHeight: 46,
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
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow: isClubber
      ? "none"
      : isPro
        ? "0 10px 24px rgba(29,78,216,0.16)"
        : "none",
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

function mutedTextStyle() {
  return {
    margin: 0,
    color: "#CBD5E1",
    lineHeight: 1.55,
  } as const;
}

function statusLineStyle(active = false) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: active ? "var(--mhidas-clubber-action)" : "rgba(255,255,255,0.70)",
    fontSize: 13,
    fontWeight: 800,
  } as const;
}

function statusDotStyle(active = false) {
  return {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: active ? "var(--mhidas-clubber-action)" : "rgba(255,255,255,0.42)",
    boxShadow: active ? "none" : "none",
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
    .select("card_id,label,slug,status,is_published")
    .eq("user_id", user.id)
    .order("label", { ascending: true });

  const items = (cards ?? []) as CardRow[];
  const hasCardsLoadError = Boolean(error);

  const { count: professionalProfilesCount } = await supabase
    .from("professional_profiles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasProfessionalProfile = (professionalProfilesCount ?? 0) > 0;

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

        <div style={{ marginTop: 2, fontSize: 13, color: "#CBD5E1", fontWeight: 800 }}>
          Total de perfis: <strong>{hasCardsLoadError ? "—" : items.length}</strong>
        </div>
      </section>

      {hasCardsLoadError ? (
        <section style={panelStyle()}>
          <span style={labelStyle()}>Perfis indisponíveis</span>

          <h2 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.035em" }}>
            Não foi possível carregar seus perfis.
          </h2>

          <p style={mutedTextStyle()}>
            Nenhum novo perfil foi criado. Volte à central e tente novamente.
          </p>

          <Link href="/dashboard" style={buttonStyle()}>
            Voltar à central
          </Link>
        </section>
      ) : items.length === 0 ? (
        <section style={panelStyle(true)}>
          <span style={labelStyle()}>Primeiro acesso</span>

          <h2 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.035em" }}>
            Crie seu perfil Clubber.
          </h2>

          <p style={mutedTextStyle()}>
            Sua identidade digital nasce pela conta. Você já pode entrar no radar, participar de eventos e criar conexões sem possuir nenhum produto NFC.
          </p>

          <p style={mutedTextStyle()}>
            Cartão, pulseira, pingente e tag profissional são opcionais e poderão ser vinculados depois ao mesmo cadastro.
          </p>

          <Link href="/onboarding" style={buttonStyle("clubber")}>
            Criar meu perfil Clubber
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

                  <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.5 }}>
                    Link público: <strong>{slug || "ainda não definido"}</strong>
                  </div>
                </div>
              </div>

              <div style={gridStyle(260)}>
                <div style={modePanelStyle("club")}>
                  <div>
                    <strong style={{ fontSize: 19 }}>Experiência Clubber</strong>
                    <p style={{ ...mutedTextStyle(), marginTop: 6, fontSize: 13 }}>
                      Música, eventos, caronas, encontros, artistas, pertencimento na cena e descoberta de eventos.
                    </p>
                  </div>

                  <div style={actionGridStyle()}>
                    <Link
                      href={`/dashboard/cards/${card.card_id}/club`}
                      style={buttonStyle("clubber")}
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
                      Este é o seu perfil profissional para negócios. Use-o para
                      divulgar sua atuação, portfólio, contatos e oportunidades.
                      No dia a dia, ele funciona como seu cartão de visitas
                      profissional e pode ser compartilhado com um toque NFC.
                    </p>
                  </div>

                  <div style={actionGridStyle()}>
                    {hasProfessionalProfile ? (
                      <>
                        <Link
                          href={`/dashboard/cards/${card.card_id}/pro`}
                          style={buttonStyle("pro")}
                        >
                          Editar perfil profissional
                        </Link>

                        {hasSlug ? (
                          <Link
                            href={`/pro/${slug}`}
                            target="_blank"
                            style={buttonStyle()}
                          >
                            Ver perfil profissional
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <Link
                        href={`/dashboard/cards/${card.card_id}/pro`}
                        style={buttonStyle("pro")}
                      >
                        Ativar perfil profissional
                      </Link>
                    )}
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
