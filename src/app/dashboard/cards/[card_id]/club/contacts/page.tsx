// src/app/dashboard/cards/[card_id]/club/contacts/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

import ClubContactsManager from "./ClubContactsManager";

type PageProps = {
  params: Promise<{ card_id: string }>;
};

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
  slug: string | null;
  status: string | null;
  is_published: boolean | null;
};

type SocialLinkResolverRow = {
  card_id: string | null;
  platform: string;
  mode: string | null;
  is_active: boolean;
};

const DIRECT_PLATFORMS = ["instagram", "whatsapp", "telegram", "tiktok"] as const;

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueCardIds(rows: SocialLinkResolverRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => cleanText(row.card_id))
        .filter((value): value is string => Boolean(value))
    )
  );
}

const pageCss = `
  .contacts-shell {
    min-height: 100vh;
    background: #050505;
    color: #F8FAFC;
    padding: 24px;
  }

  .contacts-page {
    width: min(100%, 920px);
    margin: 0 auto;
    display: grid;
    gap: 18px;
  }

  .contacts-topbar,
  .contacts-state {
    border: 1px solid rgba(255,255,255,0.10);
    background: #0E0E0E;
    border-radius: 22px;
    padding: 20px;
    display: grid;
    gap: 14px;
  }

  .contacts-panel {
    display: grid;
    gap: 14px;
  }

  .contacts-eyebrow {
    margin: 0 0 5px;
    color: #2A8694;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .contacts-title {
    margin: 0;
    font-size: clamp(28px, 5vw, 38px);
    line-height: 1.04;
    letter-spacing: -0.03em;
  }

  .contacts-copy {
    max-width: 690px;
    margin: 0;
    color: #CBD5E1;
    font-size: 16px;
    line-height: 1.58;
  }

  .contacts-back {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    color: #CBD5E1;
    text-decoration: none;
    font-weight: 800;
  }

  .contacts-back:hover {
    color: #F8FAFC;
  }

  @media (max-width: 620px) {
    .contacts-shell {
      padding: 14px;
    }

    .contacts-topbar,
    .contacts-state {
      border-radius: 18px;
      padding: 16px;
    }

    .contacts-copy {
      font-size: 15px;
    }
  }
`;

export default async function ClubContactsPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: requestedCardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: requestedCardData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,status,is_published")
    .eq("card_id", requestedCardId)
    .eq("user_id", user.id)
    .single();

  if (!requestedCardData) {
    return (
      <main className="contacts-shell">
        <style>{pageCss}</style>
        <div className="contacts-page">
          <section className="contacts-state">
            <h1 className="contacts-title">Redes e contatos</h1>
            <p className="contacts-copy">
              Este Perfil Clubber não está disponível para esta conta.
            </p>
            <Link href="/dashboard/cards" className="contacts-back">
              Voltar aos meus perfis
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const requestedCard = requestedCardData as CardRow;

  const { data: ownerCardsData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,status,is_published")
    .eq("user_id", user.id)
    .eq("status", "active");

  const ownerCards = (ownerCardsData ?? []) as CardRow[];
  const activeCardIds = new Set(ownerCards.map((card) => card.card_id));

  const { data: clubLinksData } = await supabase
    .from("social_links")
    .select("card_id,platform,mode,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("mode", ["club", "both"]);

  const clubLinks = ((clubLinksData ?? []) as SocialLinkResolverRow[]).filter(
    (row) => cleanText(row.card_id) && activeCardIds.has(cleanText(row.card_id))
  );

  const directLinks = clubLinks.filter((row) =>
    DIRECT_PLATFORMS.includes(
      cleanText(row.platform).toLowerCase() as (typeof DIRECT_PLATFORMS)[number]
    )
  );

  const directCandidateIds = uniqueCardIds(directLinks);
  const anyClubCandidateIds = uniqueCardIds(clubLinks);
  const publishedCards = ownerCards.filter((card) => Boolean(card.is_published));

  let resolvedCard: CardRow | null = null;

  if (directCandidateIds.length === 1) {
    resolvedCard =
      ownerCards.find((card) => card.card_id === directCandidateIds[0]) ?? null;
  } else if (anyClubCandidateIds.length === 1) {
    resolvedCard =
      ownerCards.find((card) => card.card_id === anyClubCandidateIds[0]) ?? null;
  } else if (publishedCards.length === 1) {
    resolvedCard = publishedCards[0];
  } else if (ownerCards.length === 1) {
    resolvedCard = ownerCards[0];
  } else if (
    directCandidateIds.length === 0 &&
    anyClubCandidateIds.length === 0 &&
    activeCardIds.has(requestedCard.card_id)
  ) {
    resolvedCard = requestedCard;
  }

  if (!resolvedCard) {
    return (
      <main className="contacts-shell">
        <style>{pageCss}</style>
        <div className="contacts-page">
          <section className="contacts-state">
            <p className="contacts-eyebrow">Perfil Clubber</p>
            <h1 className="contacts-title">Redes e contatos</h1>
            <p className="contacts-copy">
              Há mais de uma identidade histórica nesta conta e não foi possível
              escolher com segurança qual delas deve administrar os contatos Clubber.
              Nenhum dado foi alterado.
            </p>
            <Link
              href={`/dashboard/cards/${requestedCard.card_id}/club`}
              className="contacts-back"
            >
              Voltar ao Perfil Clubber
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (resolvedCard.card_id !== requestedCard.card_id) {
    redirect(`/dashboard/cards/${resolvedCard.card_id}/club/contacts`);
  }

  const overviewHref = `/dashboard/cards/${resolvedCard.card_id}/club`;

  return (
    <main className="contacts-shell">
      <style>{pageCss}</style>

      <div className="contacts-page">
        <header className="contacts-topbar">
          <div>
            <p className="contacts-eyebrow">Perfil Clubber</p>
            <h1 className="contacts-title">Redes e contatos</h1>
          </div>

          <p className="contacts-copy">
            Escolha como outros Clubbers podem encontrar você. Você controla
            quais contatos aparecem no seu perfil.
          </p>

          <Link href={overviewHref} className="contacts-back">
            ← Voltar ao meu perfil
          </Link>
        </header>

        <section className="contacts-panel">
          <ClubContactsManager cardId={resolvedCard.card_id} />
        </section>
      </div>
    </main>
  );
}
