// src/app/dashboard/cards/[card_id]/club/content/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubContentManager, { type ClubContentProfile } from "./ClubContentManager";

type PageProps = {
  params: Promise<{ card_id: string }>;
};

const pageCss = `
  .content-shell {
    min-height: 100vh;
    background: #050505;
    color: #F8FAFC;
    padding: 28px 18px 64px;
  }

  .content-page {
    width: min(100%, 980px);
    margin: 0 auto;
    display: grid;
    gap: 22px;
  }

  .content-topbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  .content-eyebrow {
    margin: 0 0 7px;
    color: #2A8694;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .content-topbar h1 {
    margin: 0;
    font-size: clamp(30px, 5vw, 44px);
    letter-spacing: -0.035em;
  }

  .content-topbar p:not(.content-eyebrow) {
    max-width: 680px;
    margin: 10px 0 0;
    color: #CBD5E1;
    line-height: 1.55;
  }

  .content-back {
    flex: 0 0 auto;
    color: #CBD5E1;
    font-weight: 800;
    text-decoration: none;
  }

  .content-back:hover {
    color: #F8FAFC;
  }

  .content-empty {
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  @media (max-width: 720px) {
    .content-shell {
      padding: 16px 12px 44px;
    }

    .content-topbar {
      padding: 18px;
      border-radius: 14px;
      display: grid;
    }
  }
`;

export default async function ClubContentPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: card } = await supabase
    .from("cards")
    .select("card_id,user_id,label")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!card) {
    return (
      <main className="content-shell">
        <style>{pageCss}</style>
        <section className="content-page">
          <div className="content-empty">
            <h1>Perfil não encontrado</h1>
            <p>Não foi possível abrir os canais deste Perfil Clubber.</p>
          </div>
        </section>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("club_profiles")
    .select(
      "youtube_url,spotify_url,soundcloud_url,beatport_url,mixcloud_url,apple_music_url,deezer_url,primary_streaming_platform,playlist_title,playlist_description"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const overviewHref = `/dashboard/cards/${card.card_id}/club`;

  return (
    <main className="content-shell">
      <style>{pageCss}</style>

      <div className="content-page">
        <header className="content-topbar">
          <div>
            <p className="content-eyebrow">Perfil Clubber</p>
            <h1>Canais e conteúdo</h1>
            <p>
              Reúna seus canais de música e vídeo em um só lugar. Adicione apenas o que
              representa sua experiência e escolha qual canal merece mais destaque no perfil.
            </p>
          </div>

          <Link href={overviewHref} className="content-back">
            ← Voltar ao meu perfil
          </Link>
        </header>

        <ClubContentManager initialProfile={(profile || null) as ClubContentProfile | null} />
      </div>
    </main>
  );
}
