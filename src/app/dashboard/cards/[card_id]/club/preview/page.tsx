// src/app/dashboard/cards/[card_id]/club/preview/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubProfileOverviewActions from "./ClubProfileOverviewActions";

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
  slug: string | null;
  is_published: boolean;
};

type ClubProfileRow = {
  club_tagline: string | null;
  city_base: string | null;
  favorite_genres: string | null;
  next_events: string | null;
  club_photo_url: string | null;
  ride_status: string | null;
  ride_event_name: string | null;
  meet_status: string | null;
  meet_event_name: string | null;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toEventSlug(value: unknown): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitList(value: unknown): string[] {
  const text = cleanText(value);

  if (!text) {
    return [];
  }

  return Array.from(
    new Set(
      text
        .split(/\r?\n|,|;|\|/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export default async function ClubProfileOverviewPreviewPage({ params }: PageProps) {
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
      <main className="club-shell">
        <style>{pageCss}</style>
        <section className="club-page club-empty-state">
          <h1>Perfil não encontrado</h1>
          <p>
            Não foi possível abrir este Perfil Clubber ou o acesso não foi autorizado.
          </p>
          <Link href="/dashboard/cards" className="club-primary-button">
            Voltar aos meus perfis
          </Link>
        </section>
      </main>
    );
  }

  const card = cardData as CardRow;

  const [profileResult, artistCountResult, socialCountResult, checkInCountResult] =
    await Promise.all([
      supabase
        .from("club_profiles")
        .select(
          "club_tagline,city_base,favorite_genres,next_events,club_photo_url,ride_status,ride_event_name,meet_status,meet_event_name"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("club_profile_artists")
        .select("spotify_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("social_links")
        .select("id", { count: "exact", head: true })
        .eq("card_id", card.card_id)
        .eq("is_active", true)
        .in("mode", ["club", "both"]),
      supabase
        .from("club_event_checkins")
        .select("id", { count: "exact", head: true })
        .eq("card_id", card.card_id)
        .eq("status", "active"),
    ]);

  const profile = (profileResult.data ?? null) as ClubProfileRow | null;
  const profileName = cleanText(card.label) || "Meu perfil Clubber";
  const city = cleanText(profile?.city_base) || "Cidade ainda não informada";
  const identity =
    cleanText(profile?.club_tagline) ||
    "Sua identidade na cena aparecerá aqui conforme você completar o perfil.";
  const allGenres = splitList(profile?.favorite_genres);
  const visibleGenres = allGenres.slice(0, 3);
  const hiddenGenreCount = Math.max(allGenres.length - visibleGenres.length, 0);
  const nextEvents = splitList(profile?.next_events);
  const artistCount = artistCountResult.count ?? 0;
  const socialCount = socialCountResult.count ?? 0;
  const activeCheckIns = checkInCountResult.count ?? 0;
  const hasRide = Boolean(cleanText(profile?.ride_status));
  const hasMeet = Boolean(cleanText(profile?.meet_status));
  const hasPublicProfile = Boolean(card.slug && card.is_published);
  const rideMeetEventName =
    cleanText(profile?.ride_event_name) || cleanText(profile?.meet_event_name);
  const rideMeetEventSlug = toEventSlug(rideMeetEventName);

  const overviewHref = "/dashboard/cards";
  const editHref = `/dashboard/cards/${card.card_id}/club`;
  const publicHref = card.slug ? `/${card.slug}?mode=club` : overviewHref;
  const artistsHref = card.slug ? `${publicHref}#artistas` : overviewHref;
  const eventsHref = card.slug ? `${publicHref}#agenda-club` : overviewHref;
  const socialHref = card.slug
    ? `/${card.slug}?mode=club#canais-club`
    : overviewHref;
  const professionalHref = card.slug
    ? `/pro/${card.slug}`
    : `/dashboard/cards/${card.card_id}/pro`;
  const qrPath = card.slug ? `/api/qr/${card.slug}?mode=club` : "";
  const rideMeetHref = rideMeetEventSlug
    ? `/event/${rideMeetEventSlug}${
        card.slug ? `?return_to=${encodeURIComponent(publicHref)}` : ""
      }`
    : "";

  return (
    <main className="club-shell">
      <style>{pageCss}</style>

      <div className="club-page">
        <header className="club-topbar">
          <div>
            <p className="club-eyebrow">Perfil Clubber</p>
            <h1>Meu perfil</h1>
          </div>

          <Link href={overviewHref} className="club-back-link">
            ← Meus perfis
          </Link>
        </header>

        <section className="club-hero">
          <div
            className="club-hero-image"
            style={{
              backgroundImage: profile?.club_photo_url
                ? `linear-gradient(180deg, rgba(6,7,12,0.10), rgba(6,7,12,0.92)), url(${profile.club_photo_url})`
                : "linear-gradient(145deg, rgba(111,103,255,0.26), rgba(9,10,17,0.94))",
            }}
          >
            <div className="club-hero-copy">
              <h2>{profileName}</h2>
              <p className="club-location">{city}</p>
            </div>
          </div>

          <div className="club-hero-content">
            <div className="club-identity-block">
              <p className="club-eyebrow">Minha identidade na cena</p>
              <p className="club-identity-text">{identity}</p>
            </div>

            {visibleGenres.length > 0 ? (
              <p className="club-genres" aria-label="Vertentes musicais">
                {visibleGenres.join(" · ")}
                {hiddenGenreCount > 0 ? ` · +${hiddenGenreCount}` : ""}
              </p>
            ) : null}

            <div className="club-hero-actions">
              <Link href={editHref} className="club-primary-button">
                Editar meu perfil
              </Link>

              <div className="club-text-links">
                {hasPublicProfile ? (
                  <Link href={publicHref} target="_blank">
                    Ver meu perfil público
                  </Link>
                ) : (
                  <span>Perfil ainda não publicado</span>
                )}

                <Link href={professionalHref} target={card.slug ? "_blank" : undefined}>
                  Ver perfil profissional
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="club-section">
          <div className="club-section-heading">
            <div>
              <p className="club-eyebrow">Minha experiência</p>
              <h2>Sua presença na cena</h2>
            </div>
          </div>

          <nav className="club-nav-list" aria-label="Resumo da experiência Clubber">
            <Link href={artistsHref} target="_blank" className="club-nav-row">
              <span className="club-nav-number">{artistCount}</span>
              <span className="club-nav-label">Artistas</span>
              <span className="club-nav-arrow" aria-hidden="true">
                ›
              </span>
            </Link>

            <Link href={eventsHref} target="_blank" className="club-nav-row">
              <span className="club-nav-number">{nextEvents.length}</span>
              <span className="club-nav-label">Próximos eventos</span>
              <span className="club-nav-arrow" aria-hidden="true">
                ›
              </span>
            </Link>

            <Link href={eventsHref} target="_blank" className="club-nav-row">
              <span className="club-nav-number">{activeCheckIns}</span>
              <span className="club-nav-label">Check-ins e presenças</span>
              <span className="club-nav-arrow" aria-hidden="true">
                ›
              </span>
            </Link>

            <Link href={socialHref} target="_blank" className="club-nav-row">
              <span className="club-nav-number">{socialCount}</span>
              <span className="club-nav-label">Redes e contatos</span>
              <span className="club-nav-arrow" aria-hidden="true">
                ›
              </span>
            </Link>

            {rideMeetHref ? (
              <Link href={rideMeetHref} target="_blank" className="club-nav-row">
                <span className="club-nav-number club-nav-symbol">◎</span>
                <span className="club-nav-label">Caronas e encontros</span>
                <span className="club-nav-meta">Abrir evento configurado</span>
                <span className="club-nav-arrow" aria-hidden="true">
                  ›
                </span>
              </Link>
            ) : (
              <div className="club-nav-row club-nav-row-disabled" aria-disabled="true">
                <span className="club-nav-number club-nav-symbol">◎</span>
                <span className="club-nav-label">Caronas e encontros</span>
                <span className="club-nav-meta">
                  {hasRide || hasMeet
                    ? "Defina o evento da atividade"
                    : "Nenhuma atividade ativa"}
                </span>
                <span className="club-nav-arrow club-nav-arrow-muted" aria-hidden="true">
                  —
                </span>
              </div>
            )}
          </nav>
        </section>

        <section className="club-nfc-panel">
          <div>
            <p className="club-eyebrow">Presença física e digital</p>
            <h2>Meu NFC e QR Code</h2>
            <p>
              Compartilhe seu Perfil Clubber presencialmente e mantenha a conexão depois
              do encontro.
            </p>
          </div>

          <ClubProfileOverviewActions
            profileName={profileName}
            publicPath={publicHref}
            qrPath={qrPath}
            hasPublicProfile={hasPublicProfile}
          />
        </section>
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

  .club-shell {
    min-height: 100vh;
    padding: 30px 22px 110px;
    background:
      radial-gradient(circle at 12% 0%, rgba(111, 103, 255, 0.13), transparent 30%),
      radial-gradient(circle at 92% 8%, rgba(61, 76, 128, 0.10), transparent 25%),
      #07080c;
    color: #f5f6fa;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .club-page {
    width: min(100%, 920px);
    margin: 0 auto;
    display: grid;
    gap: 28px;
  }

  .club-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }

  .club-topbar h1,
  .club-hero h2,
  .club-section h2,
  .club-nfc-panel h2,
  .club-empty-state h1 {
    margin: 0;
  }

  .club-topbar h1 {
    margin-top: 6px;
    font-size: clamp(30px, 4vw, 42px);
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .club-eyebrow,
  .club-overline {
    margin: 0;
    color: #a9a4ff;
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 850;
  }

  .club-back-link,
  .club-text-links a,
  .club-secondary-link {
    color: #cfd2dc;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
  }

  .club-back-link:hover,
  .club-text-links a:hover,
  .club-secondary-link:hover {
    color: #ffffff;
  }

  .club-hero {
    overflow: hidden;
    border: 1px solid #242733;
    border-radius: 28px;
    background: #101219;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.32);
  }

  .club-hero-image {
    min-height: 380px;
    padding: 30px;
    display: grid;
    align-content: end;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }

  .club-hero-copy {
    display: grid;
    gap: 9px;
  }

  .club-overline {
    color: rgba(245, 246, 250, 0.76);
  }

  .club-hero-copy h2 {
    max-width: 760px;
    font-size: clamp(36px, 6vw, 60px);
    line-height: 0.98;
    letter-spacing: -0.05em;
    font-weight: 900;
  }

  .club-location {
    margin: 0;
    color: rgba(245, 246, 250, 0.82);
    font-size: 16px;
    font-weight: 700;
  }

  .club-hero-content {
    padding: 28px;
    display: grid;
    gap: 21px;
  }

  .club-identity-block {
    display: grid;
    gap: 9px;
  }

  .club-identity-text {
    max-width: 820px;
    margin: 0;
    color: #eef0f6;
    font-size: clamp(18px, 2.4vw, 22px);
    line-height: 1.62;
    font-weight: 620;
  }

  .club-genres {
    margin: 0;
    color: #b8bdca;
    font-size: 14px;
    line-height: 1.6;
    font-weight: 650;
  }

  .club-hero-actions {
    display: grid;
    gap: 15px;
  }

  .club-primary-button {
    min-height: 50px;
    padding: 13px 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(122, 114, 255, 0.88);
    border-radius: 14px;
    background: linear-gradient(180deg, #776fff, #625ae8);
    color: #ffffff;
    text-align: center;
    text-decoration: none;
    font-size: 14px;
    font-weight: 850;
    box-shadow: 0 14px 34px rgba(98, 90, 232, 0.24);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .club-primary-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 40px rgba(98, 90, 232, 0.30);
  }

  .club-primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.46;
    transform: none;
    box-shadow: none;
  }

  .club-action-button,
  .club-secondary-button {
    width: 100%;
    font-family: inherit;
    cursor: pointer;
  }

  .club-secondary-button {
    padding: 0;
    border: 0;
    background: transparent;
  }

  .club-text-links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 22px;
  }

  .club-text-links span {
    color: #737886;
    font-size: 13px;
    font-weight: 650;
  }

  .club-section {
    padding: 2px 0 0;
  }

  .club-section-heading h2,
  .club-nfc-panel h2 {
    margin-top: 7px;
    font-size: clamp(24px, 3vw, 34px);
    line-height: 1.12;
    letter-spacing: -0.035em;
    font-weight: 850;
  }

  .club-nav-list {
    margin-top: 18px;
    border-top: 1px solid #242733;
  }

  .club-nav-row {
    min-height: 78px;
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) auto 24px;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #242733;
    color: inherit;
    text-decoration: none;
    transition: background 160ms ease, padding 160ms ease;
  }

  .club-nav-row:hover {
    padding-inline: 10px;
    background: rgba(122, 114, 255, 0.055);
  }

  .club-nav-row-disabled {
    cursor: default;
    opacity: 0.72;
  }

  .club-nav-row-disabled:hover {
    padding-inline: 0;
    background: transparent;
  }

  .club-nav-number {
    color: #ffffff;
    font-size: 30px;
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .club-nav-symbol {
    color: #9b95ff;
    font-size: 25px;
  }

  .club-nav-label {
    color: #f2f3f7;
    font-size: 16px;
    font-weight: 780;
  }

  .club-nav-meta {
    color: #858b99;
    font-size: 12px;
    text-align: right;
  }

  .club-nav-arrow {
    color: #8f95a3;
    font-size: 24px;
    text-align: right;
  }

  .club-nav-arrow-muted {
    color: #565b68;
    font-size: 16px;
  }

  .club-nfc-panel {
    padding: 30px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.52fr);
    align-items: end;
    gap: 30px;
    border: 1px solid rgba(122, 114, 255, 0.24);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, rgba(122, 114, 255, 0.18), transparent 42%),
      linear-gradient(145deg, #12141d, #0d0f16);
    box-shadow: 0 26px 70px rgba(0, 0, 0, 0.26);
  }

  .club-nfc-panel p:not(.club-eyebrow),
  .club-empty-state p {
    margin: 12px 0 0;
    color: #aeb3bf;
    font-size: 14px;
    line-height: 1.7;
  }

  .club-nfc-actions {
    display: grid;
    gap: 14px;
  }

  .club-secondary-link {
    text-align: center;
  }

  .club-action-feedback {
    margin: 0;
    color: #aeb3bf;
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
  }

  .club-qr-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    padding: 20px;
    display: grid;
    place-items: center;
    background: rgba(3, 4, 8, 0.82);
    backdrop-filter: blur(14px);
  }

  .club-qr-dialog {
    width: min(100%, 720px);
    max-height: calc(100vh - 40px);
    overflow: auto;
    padding: 26px;
    border: 1px solid rgba(122, 114, 255, 0.30);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, rgba(122, 114, 255, 0.16), transparent 38%),
      #101219;
    box-shadow: 0 32px 110px rgba(0, 0, 0, 0.62);
  }

  .club-qr-dialog-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .club-qr-dialog-header h2 {
    margin: 7px 0 0;
    font-size: clamp(24px, 4vw, 34px);
    letter-spacing: -0.035em;
  }

  .club-qr-close {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid #303440;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: #f5f6fa;
    font-family: inherit;
    font-size: 25px;
    line-height: 1;
    cursor: pointer;
  }

  .club-qr-content {
    margin-top: 24px;
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    align-items: center;
    gap: 28px;
  }

  .club-qr-image-wrap {
    padding: 14px;
    display: grid;
    place-items: center;
    border-radius: 22px;
    background: #ffffff;
  }

  .club-qr-image-wrap img {
    width: 100%;
    height: auto;
    display: block;
  }

  .club-qr-copy {
    display: grid;
    gap: 18px;
  }

  .club-qr-copy > p {
    margin: 0;
    color: #b8bdca;
    font-size: 14px;
    line-height: 1.7;
  }

  .club-qr-dialog-actions {
    display: grid;
    gap: 14px;
  }

  .club-empty-state {
    padding: 28px;
    display: grid;
    gap: 16px;
    border: 1px solid #242733;
    border-radius: 24px;
    background: #101219;
  }

  @media (max-width: 760px) {
    .club-shell {
      padding: 16px 14px 96px;
    }

    .club-page {
      gap: 22px;
    }

    .club-topbar {
      align-items: flex-start;
    }

    .club-back-link {
      text-align: right;
      line-height: 1.35;
      white-space: nowrap;
    }

    .club-hero {
      border-radius: 22px;
    }

    .club-hero-image {
      min-height: 260px;
      padding: 20px;
    }

    .club-hero-content {
      padding: 21px;
    }

    .club-text-links {
      display: grid;
      gap: 11px;
    }

    .club-nav-row {
      min-height: 72px;
      grid-template-columns: 54px minmax(0, 1fr) 20px;
    }

    .club-nav-meta {
      display: none;
    }

    .club-nav-number {
      font-size: 27px;
    }

    .club-nav-label {
      font-size: 15px;
    }

    .club-nfc-panel {
      grid-template-columns: 1fr;
      gap: 22px;
      padding: 24px;
    }

    .club-qr-content {
      grid-template-columns: 1fr;
    }

    .club-qr-image-wrap {
      width: min(100%, 300px);
      margin: 0 auto;
    }
  }

  @media (max-width: 420px) {
    .club-shell {
      padding-inline: 10px;
    }

    .club-topbar h1 {
      font-size: 31px;
    }

    .club-back-link {
      font-size: 12px;
    }

    .club-hero-image {
      min-height: 248px;
    }

    .club-hero-copy h2 {
      font-size: 40px;
    }

    .club-location {
      font-size: 15px;
    }

    .club-identity-text {
      font-size: 18px;
    }
  }
`;
