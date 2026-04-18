// src/app/dashboard/cards/[card_id]/club/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

import QrBlock from "../QrBlock";
import SocialLinksManager from "../SocialLinksManager";
import ClubProfileManager from "../ClubProfileManager";

type CardRow = {
  card_id: string;
  user_id: string;
  status: string;
  label: string | null;
  slug: string | null;
  is_published: boolean;
  published_at: string | null;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
};

function pageStyle() {
  return {
    padding: 24,
    maxWidth: 980,
    margin: "0 auto",
  } as const;
}

function heroStyle() {
  return {
    marginTop: 18,
    padding: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    display: "grid",
    gap: 16,
  } as const;
}

function sectionStyle() {
  return {
    marginTop: 24,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 14,
  } as const;
}

function infoGridStyle() {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  } as const;
}

function infoCardStyle() {
  return {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    gap: 8,
  } as const;
}

function miniTagStyle() {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 700,
    width: "fit-content",
  } as const;
}

function buttonStyle(primary = false) {
  return {
    padding: "11px 14px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(255,255,255,0.24)"
      : "1px solid rgba(255,255,255,0.16)",
    background: primary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    display: "inline-block",
  } as const;
}

export default async function CardClubPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: card } = await supabase
    .from("cards")
    .select("card_id,user_id,status,label,slug,is_published,published_at")
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

  const c = card as CardRow;
  const slug = c.slug ?? "";
  const hasPublicSlug = !!slug;
  const clubPublicHref = hasPublicSlug ? `/${slug}` : "";

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ fontWeight: 900, margin: 0 }}>Club Mode</h1>

        <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.6, maxWidth: 760 }}>
          Estruture a identidade cultural do perfil, organize artistas, eventos,
          streaming e presença na cena eletrônica.
        </p>
      </header>

      <section style={heroStyle()}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={miniTagStyle()}>Perfil: {c.label ?? "Sem nome"}</span>
          <span style={miniTagStyle()}>
            {c.is_published ? "Club publicado" : "Club não publicado"}
          </span>
          {slug ? <span style={miniTagStyle()}>URL: {slug}</span> : null}
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <div style={infoCardStyle()}>
            <strong>Identidade da cena</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Frase do perfil, cidade, vertentes e estética cultural do usuário.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong>Artistas e eventos</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Últimos eventos, próximos eventos, artistas prediletos e clubs de afinidade.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong>Streaming e presença</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Playlist principal, Spotify, SoundCloud, YouTube e links culturais.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/dashboard/cards/${c.card_id}`} style={buttonStyle()}>
            Voltar ao hub
          </Link>

          {hasPublicSlug ? (
            <Link href={clubPublicHref} target="_blank" style={buttonStyle(true)}>
              Abrir Club público
            </Link>
          ) : null}
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <h2 style={{ margin: 0, fontWeight: 900 }}>Estrutura do Club</h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            Preencha os blocos abaixo pensando no Club como uma identidade viva da
            cena, não apenas como um perfil com links.
          </p>
        </div>

        <div style={infoGridStyle()}>
          <div style={infoCardStyle()}>
            <strong>1. Identidade</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Defina frase do Club, base cultural, vertentes e estilo visual.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong>2. Artistas</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Liste nomes fortes da cena que realmente representam o perfil.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong>3. Eventos</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Organize eventos favoritos, últimos eventos e próximos encontros.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong>4. Streaming</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Priorize canais musicais e playlist principal antes dos demais links.
            </div>
          </div>
        </div>

        <ClubProfileManager
          clubPublicHref={clubPublicHref}
          hasPublicSlug={hasPublicSlug}
          isPublished={c.is_published}
        />
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <h2 style={{ margin: 0, fontWeight: 900 }}>QR e links do Club</h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            Nesta área ficam os acessos que serão usados no fluxo do Club.
          </p>
        </div>

        <div style={infoGridStyle()}>
          <div style={infoCardStyle()}>
            <strong>QR Club</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Use este QR para acesso rápido ao perfil cultural.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <strong>Links culturais</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              Organize primeiro streaming, depois redes e acessos principais da cena.
            </div>
          </div>
        </div>

        <QrBlock slug={slug} />
        <SocialLinksManager cardId={c.card_id} />
      </section>
    </main>
  );
}