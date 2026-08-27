// src/app/dashboard/cards/[card_id]/club/places/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubPlacesManager from "./ClubPlacesManager";

type PageProps = {
  params: Promise<{ card_id: string }>;
};

const pageCss = `
  .places-shell {
    min-height: 100vh;
    background: #050505;
    color: #F8FAFC;
    padding: 28px 18px 64px;
  }

  .places-page {
    width: min(100%, 980px);
    margin: 0 auto;
    display: grid;
    gap: 22px;
  }

  .places-topbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  .places-eyebrow {
    margin: 0 0 7px;
    color: #2A8694;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .places-topbar h1 {
    margin: 0;
    font-size: clamp(30px, 5vw, 44px);
    letter-spacing: -0.035em;
  }

  .places-topbar p:not(.places-eyebrow) {
    max-width: 680px;
    margin: 10px 0 0;
    color: #CBD5E1;
    line-height: 1.55;
  }

  .places-back {
    flex: 0 0 auto;
    color: #CBD5E1;
    font-weight: 800;
    text-decoration: none;
  }

  .places-back:hover {
    color: #F8FAFC;
  }

  @media (max-width: 720px) {
    .places-shell {
      padding: 16px 12px 44px;
    }

    .places-topbar {
      padding: 18px;
      border-radius: 14px;
      display: grid;
    }
  }
`;

function splitList(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ClubPlacesPage({ params }: PageProps) {
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
    .select("card_id,user_id")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!card) {
    redirect("/dashboard/cards");
  }

  const { data: profile } = await supabase
    .from("club_profiles")
    .select("favorite_clubs,city_base")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="places-shell">
      <style>{pageCss}</style>

      <div className="places-page">
        <header className="places-topbar">
          <div>
            <p className="places-eyebrow">Perfil Clubber</p>
            <h1>Clubes e lugares</h1>
            <p>
              Guarde os clubs e lugares que fazem parte da sua história na música eletrônica
              e ajudam outros Clubbers a entender onde você se identifica.
            </p>
          </div>

          <Link href={`/dashboard/cards/${card.card_id}/club`} className="places-back">
            ← Voltar ao meu perfil
          </Link>
        </header>

        <ClubPlacesManager
          cardId={card.card_id}
          initialPlaces={splitList(profile?.favorite_clubs)}
          cityBase={String(profile?.city_base || "")}
        />
      </div>
    </main>
  );
}
