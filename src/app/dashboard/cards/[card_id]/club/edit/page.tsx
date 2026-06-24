// src/app/dashboard/cards/[card_id]/club/edit/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

import SocialLinksManager from "../../SocialLinksManager";
import ClubIdentityManager from "./ClubIdentityManager";

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
  slug: string | null;
  is_published: boolean;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
};

function pageStyle() {
  return {
    width: "min(100%, 860px)",
    margin: "0 auto",
    padding: "24px 16px 56px",
    color: "#fff",
  } as const;
}

function sectionStyle() {
  return {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.11)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)",
    display: "grid",
    gap: 16,
  } as const;
}

function actionStyle(primary = false) {
  return {
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(124,92,255,0.55)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary
      ? "linear-gradient(135deg, rgba(91,72,235,0.95), rgba(124,92,255,0.95))"
      : "rgba(255,255,255,0.05)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 850,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
}

export default async function CardClubEditPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: card } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,is_published")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) {
    return (
      <main style={{ padding: 24 }}>
        <h1>USECLUBBERS</h1>
        <p>Perfil não encontrado ou acesso negado.</p>
        <Link href="/dashboard/cards">Voltar</Link>
      </main>
    );
  }

  const currentCard = card as CardRow;
  const publicHref = currentCard.slug
    ? `/${currentCard.slug}?mode=club`
    : "/dashboard/cards";

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <Link
          href={`/dashboard/cards/${currentCard.card_id}/club`}
          style={{ color: "#d8d4ff", textDecoration: "none", fontWeight: 800 }}
        >
          ← Voltar ao meu perfil
        </Link>

        <div style={{ display: "grid", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#a99cff",
            }}
          >
            Perfil Clubber
          </span>

          <h1 style={{ margin: 0, fontSize: "clamp(30px, 7vw, 46px)", lineHeight: 1 }}>
            Editar meu perfil
          </h1>

          <p style={{ margin: 0, opacity: 0.74, lineHeight: 1.6, maxWidth: 680 }}>
            Atualize sua identidade principal e os canais usados para manter contato.
          </p>
        </div>
      </header>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 5 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Identidade principal</h2>
          <p style={{ margin: 0, opacity: 0.68, lineHeight: 1.55 }}>
            Foto, nome, cidade, frase de pertencimento e vertentes musicais.
          </p>
        </div>

        <ClubIdentityManager
          cardId={currentCard.card_id}
          initialLabel={currentCard.label ?? ""}
        />
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 5 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Redes e contatos</h2>
          <p style={{ margin: 0, opacity: 0.68, lineHeight: 1.55 }}>
            Mantenha somente os canais que ajudam outras pessoas a falar com você.
          </p>
        </div>

        <SocialLinksManager cardId={currentCard.card_id} scope="direct" />
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 5 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Conteúdo da experiência Clubber</h2>
          <p style={{ margin: 0, opacity: 0.68, lineHeight: 1.55 }}>
            Artistas, eventos, streaming, caronas e encontros continuam preservados na edição completa.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/dashboard/cards/${currentCard.card_id}/club/edit/advanced`}
            style={actionStyle()}
          >
            Editar conteúdo completo
          </Link>

          {currentCard.slug ? (
            <Link href={publicHref} target="_blank" style={actionStyle(true)}>
              Abrir perfil público
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
