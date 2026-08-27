// src/app/dashboard/cards/[card_id]/club/identity/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubIdentityFocusedManager from "./ClubIdentityFocusedManager";

type PageProps = {
  params: Promise<{ card_id: string }>;
};

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
};

type ClubProfileRow = {
  city_base: string | null;
  club_tagline: string | null;
  favorite_genres: string | null;
  favorite_artists: string | null;
  favorite_clubs: string | null;
  favorite_events: string | null;
};

export default async function ClubIdentityPage({ params }: PageProps) {
  const { card_id: cardId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cardData } = await supabase
    .from("cards")
    .select("card_id,user_id,label")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!cardData) {
    return (
      <main className="identity-shell">
        <style>{pageCss}</style>

        <section className="identity-page identity-empty">
          <h1>Perfil não encontrado</h1>
          <p>Não foi possível abrir este Perfil Clubber ou o acesso não foi autorizado.</p>

          <Link href="/dashboard/cards" className="identity-primary">
            Voltar aos meus perfis
          </Link>
        </section>
      </main>
    );
  }

  const card = cardData as CardRow;

  const { data: profileData } = await supabase
    .from("club_profiles")
    .select(
      "city_base,club_tagline,favorite_genres,favorite_artists,favorite_clubs,favorite_events"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = (profileData ?? null) as ClubProfileRow | null;

  return (
    <main className="identity-shell">
      <style>{pageCss}</style>

      <div className="identity-page">
        <header className="identity-topbar">
          <div>
            <p className="identity-eyebrow">Perfil Clubber</p>
            <h1>Minha identidade</h1>
            <p className="identity-intro">
              Conte um pouco sobre você: sua cidade e os estilos musicais que mais
              representam você.
            </p>
          </div>

          <Link href={`/dashboard/cards/${card.card_id}/club`} className="identity-back">
            ← Meu perfil
          </Link>
        </header>

        <ClubIdentityFocusedManager
          cardId={card.card_id}
          initialCity={profile?.city_base ?? ""}
          initialDescription={profile?.club_tagline ?? ""}
          initialGenres={profile?.favorite_genres ?? ""}
          favoriteArtists={profile?.favorite_artists ?? ""}
          favoriteClubs={profile?.favorite_clubs ?? ""}
          favoriteEvents={profile?.favorite_events ?? ""}
        />
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

  .identity-shell {
    min-height: 100vh;
    padding: 30px 22px 110px;
    background: #050505;
    color: #f8fafc;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .identity-page {
    width: min(100%, 920px);
    margin: 0 auto;
    display: grid;
    gap: 28px;
  }

  .identity-topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 28px;
  }

  .identity-topbar > div {
    max-width: 720px;
  }

  .identity-topbar h1,
  .identity-empty h1 {
    margin: 0;
  }

  .identity-topbar h1 {
    margin-top: 6px;
    font-size: clamp(30px, 4vw, 42px);
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .identity-intro,
  .identity-empty p {
    margin: 12px 0 0;
    color: #aeb6c2;
    font-size: 14px;
    line-height: 1.7;
  }

  .identity-eyebrow {
    margin: 0;
    color: #2a8694;
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 850;
  }

  .identity-back {
    color: #cbd5e1;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
  }

  .identity-back:hover {
    color: #ffffff;
  }

  .identity-primary {
    min-height: 48px;
    padding: 13px 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(42, 134, 148, 0.52);
    border-radius: 14px;
    background: #247c88;
    color: #ffffff;
    text-decoration: none;
    font: inherit;
    font-size: 14px;
    font-weight: 850;
  }

  .identity-empty {
    padding: 28px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 22px;
    background: #0e0e0e;
  }

  @media (max-width: 760px) {
    .identity-shell {
      padding: 14px 12px 78px;
    }

    .identity-page {
      gap: 18px;
    }

    .identity-topbar {
      gap: 14px;
    }

    .identity-topbar h1 {
      font-size: 30px;
    }

    .identity-back {
      padding-top: 3px;
      white-space: nowrap;
      font-size: 12px;
    }
  }

  @media (max-width: 420px) {
    .identity-shell {
      padding-inline: 10px;
    }

    .identity-topbar h1 {
      font-size: 28px;
    }

    .identity-back {
      font-size: 11px;
    }
  }
`;