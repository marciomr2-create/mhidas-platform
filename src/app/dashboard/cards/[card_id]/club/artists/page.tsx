// src/app/dashboard/cards/[card_id]/club/artists/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import SpotifyArtistPicker from "@/components/SpotifyArtistPicker";
import { createServerSupabaseClient } from "@/utils/supabase/server";

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

export default async function ClubArtistsPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cardData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,is_published")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!cardData) {
    return (
      <main className="artists-shell">
        <style>{pageCss}</style>
        <section className="artists-page artists-empty-state">
          <p className="artists-eyebrow">Perfil Clubber</p>
          <h1>Perfil não encontrado</h1>
          <p>Não foi possível abrir os artistas deste perfil ou o acesso não foi autorizado.</p>
          <Link href="/dashboard/cards" className="artists-primary-button">
            Voltar aos meus perfis
          </Link>
        </section>
      </main>
    );
  }

  const card = cardData as CardRow;
  const overviewHref = `/dashboard/cards/${card.card_id}/club`;
  const publicHref = card.slug ? `/${card.slug}?mode=club#artistas` : "";
  const profileName = card.label?.trim() || "Meu Perfil Clubber";
  const hasPublicProfile = Boolean(card.slug && card.is_published);

  return (
    <main className="artists-shell">
      <style>{pageCss}</style>

      <div className="artists-page">
        <header className="artists-topbar">
          <div>
            <p className="artists-eyebrow">Perfil Clubber</p>
            <h1>Meus artistas</h1>
          </div>

          <Link href={overviewHref} className="artists-back-link">
            ← Voltar ao meu perfil
          </Link>
        </header>

        <section className="artists-hero">
          <div>
            <p className="artists-eyebrow">Identidade musical</p>
            <h2>{profileName}</h2>
            <p>
              Organize as referências que representam sua presença na cena. A ordem definida
              aqui será usada no Perfil Clubber público.
            </p>
          </div>

          <div className="artists-hero-actions">
            <span className="artists-status">
              {hasPublicProfile ? "Perfil Clubber publicado" : "Perfil Clubber não publicado"}
            </span>

            {hasPublicProfile ? (
              <Link href={publicHref} target="_blank" className="artists-public-link">
                Ver artistas no perfil público
              </Link>
            ) : null}
          </div>
        </section>

        <SpotifyArtistPicker
          title="Buscar e organizar artistas"
          description="Adicione artistas reais do Spotify, remova referências e ajuste a sequência com as setas."
        />

        <footer className="artists-footer">
          <Link href={overviewHref} className="artists-primary-button">
            Concluir e voltar ao Perfil Clubber
          </Link>
        </footer>
      </div>
    </main>
  );
}

const pageCss = `
  :root {
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  .artists-shell {
    min-height: 100vh;
    padding: 30px 22px 110px;
    background: var(--mhidas-bg-main);
    color: #f5f6fa;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .artists-page {
    width: min(100%, 920px);
    margin: 0 auto;
    display: grid;
    gap: 24px;
  }

  .artists-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }

  .artists-topbar h1,
  .artists-hero h2,
  .artists-empty-state h1 {
    margin: 0;
  }

  .artists-topbar h1 {
    margin-top: 6px;
    font-size: clamp(30px, 4vw, 42px);
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .artists-eyebrow {
    margin: 0;
    color: var(--mhidas-clubber-action);
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 850;
  }

  .artists-back-link,
  .artists-public-link {
    color: #d4d6df;
    text-decoration: none;
    font-size: 13px;
    font-weight: 750;
  }

  .artists-back-link:hover,
  .artists-public-link:hover {
    color: #ffffff;
  }

  .artists-hero {
    padding: 26px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 24px;
    border: 1px solid rgba(42, 134, 148, 0.28);
    border-radius: 24px;
    background: var(--mhidas-card-dark);
    box-shadow: 0 26px 70px rgba(0, 0, 0, 0.26);
  }

  .artists-hero h2 {
    margin-top: 8px;
    font-size: clamp(25px, 4vw, 38px);
    line-height: 1.08;
    letter-spacing: -0.04em;
    font-weight: 880;
  }

  .artists-hero p:not(.artists-eyebrow),
  .artists-empty-state p {
    max-width: 660px;
    margin: 12px 0 0;
    color: #aeb3bf;
    font-size: 14px;
    line-height: 1.7;
  }

  .artists-hero-actions {
    display: grid;
    justify-items: end;
    gap: 12px;
  }

  .artists-status {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--mhidas-clubber-action);
    font-size: 11px;
    font-weight: 780;
  }

  .artists-footer {
    display: flex;
    justify-content: flex-end;
  }

  .artists-primary-button {
    min-height: 50px;
    padding: 13px 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(42, 134, 148, 0.52);
    border-radius: 14px;
    background: var(--mhidas-clubber-action-strong);
    color: #ffffff;
    text-align: center;
    text-decoration: none;
    font-size: 14px;
    font-weight: 850;
    box-shadow: none;
  }

  .artists-empty-state {
    padding: 28px;
    border: 1px solid var(--mhidas-border);
    border-radius: 24px;
    background: var(--mhidas-card-dark);
  }

  .artists-empty-state .artists-primary-button {
    margin-top: 16px;
  }

  @media (max-width: 720px) {
    .artists-shell {
      padding: 16px 14px 88px;
    }

    .artists-page {
      gap: 20px;
    }

    .artists-topbar {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }

    .artists-hero {
      padding: 20px;
      grid-template-columns: 1fr;
    }

    .artists-hero-actions {
      justify-items: start;
    }

    .artists-footer,
    .artists-primary-button {
      width: 100%;
    }
  }
`;
