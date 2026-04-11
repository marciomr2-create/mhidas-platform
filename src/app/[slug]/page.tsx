// src/app/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

const RESERVED = new Set([
  "api",
  "login",
  "dashboard",
  "invalid",
  "t",
  "r",
  "u",
  "_next",
  "favicon.ico",
  "pro",
]);

type PublicSocialLink = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  sort_order: number;
  position: number;
  mode: "club" | "pro" | "both" | null;
};

type ClubProfile = {
  user_id: string;
  club_tagline: string | null;
  city_base: string | null;
  favorite_genres: string | null;
  favorite_artists: string | null;
  favorite_events: string | null;
  last_events: string | null;
  next_events: string | null;
  favorite_clubs: string | null;
  playlist_title: string | null;
  playlist_description: string | null;
  club_photo_url: string | null;
  club_photo_prompt: string | null;
  club_photo_style: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  youtube_url: string | null;
  beatport_url: string | null;
  mixcloud_url: string | null;
};

type StreamingChannel = {
  label: string;
  href: string;
};

const COMMON_PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  website: "Website",
  portfolio: "Portfólio",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  beatport: "Beatport",
  mixcloud: "Mixcloud",
  email: "E-mail",
  "e-mail": "E-mail",
};

async function incrementClicks(
  supabase: ReturnType<typeof createPublicClient>,
  slug: string
): Promise<number> {
  try {
    const { data } = await supabase.rpc("increment_public_profile_click", {
      p_slug: slug,
    });
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

async function getClubLinks(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string
): Promise<PublicSocialLink[]> {
  const { data } = await supabase
    .from("social_links")
    .select("id, platform, url, label, sort_order, position, mode")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("mode", ["club", "both"])
    .order("sort_order")
    .order("position");

  return (data ?? []) as PublicSocialLink[];
}

async function getClubProfile(
  supabase: ReturnType<typeof createPublicClient>,
  userId: string
): Promise<ClubProfile | null> {
  const { data } = await supabase
    .from("club_profiles")
    .select(`
      user_id,
      club_tagline,
      city_base,
      favorite_genres,
      favorite_artists,
      favorite_events,
      last_events,
      next_events,
      favorite_clubs,
      playlist_title,
      playlist_description,
      club_photo_url,
      club_photo_prompt,
      club_photo_style,
      spotify_url,
      soundcloud_url,
      youtube_url,
      beatport_url,
      mixcloud_url
    `)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ClubProfile | null) ?? null;
}

function pageStyle(): CSSProperties {
  return {
    padding: 24,
    maxWidth: 1040,
    margin: "0 auto",
  };
}

function topBarStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  };
}

function heroStyle(): CSSProperties {
  return {
    marginTop: 20,
    padding: 22,
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
    display: "grid",
    gap: 20,
    boxShadow: "0 12px 34px rgba(0,0,0,0.22)",
  };
}

function heroKickerStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    opacity: 1,
  };
}

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: "999px",
    border: active
      ? "1px solid rgba(255,255,255,0.24)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
    marginRight: 10,
    transition: "all 0.2s ease",
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "15px 20px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    lineHeight: 1.2,
    boxShadow: "0 10px 24px rgba(0,0,0,0.20)",
  };
}

function secondaryHeroButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "15px 20px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    lineHeight: 1.2,
  };
}

function linkCardStyle(isFirst: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: isFirst ? "18px 18px" : "15px 16px",
    borderRadius: 18,
    border: isFirst
      ? "1px solid rgba(255,255,255,0.20)"
      : "1px solid rgba(255,255,255,0.12)",
    background: isFirst ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    boxShadow: isFirst ? "0 10px 24px rgba(0,0,0,0.16)" : "none",
  };
}

function sectionCardStyle(): CSSProperties {
  return {
    marginTop: 24,
    padding: 20,
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    opacity: 0.95,
    fontWeight: 700,
  };
}

function compactBadgeStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.95,
  };
}

function infoGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: 16,
  };
}

function infoCardStyle(): CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function quickPanelsGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    marginTop: 16,
  };
}

function quickPanelStyle(): CSSProperties {
  return {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function channelButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  };
}

function clubHighlightsGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: 16,
  };
}

function clubHighlightCardStyle(): CSSProperties {
  return {
    padding: 15,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
  };
}

function clubCultureGridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    marginTop: 16,
  };
}

function clubCultureCardStyle(): CSSProperties {
  return {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function heroMainGridStyle(hasPhoto: boolean): CSSProperties {
  return {
    display: "grid",
    gap: 20,
    gridTemplateColumns: hasPhoto ? "minmax(260px, 340px) 1fr" : "1fr",
    alignItems: "stretch",
  };
}

function heroPhotoWrapStyle(): CSSProperties {
  return {
    position: "relative",
    minHeight: 360,
    borderRadius: 28,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
  };
}

function heroPhotoOverlayStyle(): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.16) 60%, rgba(0,0,0,0.38) 100%)",
  };
}

function heroPhotoCaptionStyle(): CSSProperties {
  return {
    position: "absolute",
    left: 16,
    bottom: 16,
    display: "grid",
    gap: 8,
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function limitText(value: string | null | undefined, max = 120): string {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function titleCaseWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDisplayName(label: string | null, fallback: string): string {
  const rawLabel = normalizeText(label);
  const rawPlatform = normalizeText(fallback);

  const normalizeKey = (value: string) =>
    value.toLowerCase().replace(/\s+/g, "").trim();

  const resolveCommonName = (value: string): string | null => {
    const key = normalizeKey(value);

    if (COMMON_PLATFORM_NAMES[key]) return COMMON_PLATFORM_NAMES[key];

    const strippedDigits = key.replace(/\d+$/, "");
    if (strippedDigits !== key && COMMON_PLATFORM_NAMES[strippedDigits]) {
      return COMMON_PLATFORM_NAMES[strippedDigits];
    }

    return null;
  };

  if (rawLabel) {
    const common = resolveCommonName(rawLabel);
    if (common) return common;

    const hasUppercase = /[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]/.test(rawLabel);
    return hasUppercase ? rawLabel : titleCaseWords(rawLabel);
  }

  const platformCommon = resolveCommonName(rawPlatform);
  if (platformCommon) return platformCommon;

  return rawPlatform;
}

function formatClicks(count: number): string {
  if (count <= 0) return "Novo perfil";
  if (count === 1) return "1 interação registrada";
  return `${count} interações registradas`;
}

function buildClubHeadline(linksCount: number, clubProfile: ClubProfile | null): string {
  const tagline = normalizeText(clubProfile?.club_tagline);
  if (tagline) return tagline;
  if (linksCount > 1) return "Viva a identidade deste perfil na cena";
  if (linksCount === 1) return "O acesso principal deste perfil está pronto";
  return "Este perfil está preparando novos acessos";
}

function buildClubDescription(profileName: string, linksCount: number, clubProfile: ClubProfile | null): string {
  const genres = normalizeText(clubProfile?.favorite_genres);
  const cityBase = normalizeText(clubProfile?.city_base);
  const artists = normalizeText(clubProfile?.favorite_artists);

  if (genres || cityBase || artists) {
    const parts = [genres, cityBase].filter(Boolean);
    const intro = parts.length > 0 ? `${parts.join(" • ")}.` : "";
    const artistText = artists ? ` Artistas em destaque: ${limitText(artists, 110)}.` : "";
    return `${intro} Este espaço representa ${profileName} dentro da cena eletrônica.${artistText}`.trim();
  }

  if (linksCount > 1) {
    return `Este espaço reúne presença cultural, plataformas de música e acessos que representam ${profileName} dentro da cena.`;
  }

  if (linksCount === 1) {
    return `Abra agora o principal acesso público de ${profileName} com uma experiência mais direta e conectada à cena.`;
  }

  return `Este perfil está ativo e em atualização. Em breve, novos acessos culturais estarão disponíveis aqui.`;
}

function getHeroHighlights(
  linksCount: number,
  clubProfile: ClubProfile | null
): string[] {
  const items: string[] = [];
  if (normalizeText(clubProfile?.city_base)) items.push(normalizeText(clubProfile?.city_base));
  if (normalizeText(clubProfile?.favorite_genres)) items.push(limitText(clubProfile?.favorite_genres, 36));
  if (normalizeText(clubProfile?.favorite_clubs)) items.push(limitText(clubProfile?.favorite_clubs, 36));
  if (linksCount > 0) items.push(linksCount === 1 ? "1 acesso disponível" : `${linksCount} acessos disponíveis`);
  if (items.length === 0) items.push("Perfil ativo");
  return items.slice(0, 4);
}

function getClubQuickBadges(links: PublicSocialLink[], clubProfile: ClubProfile | null): string[] {
  const badges: string[] = [];

  if (normalizeText(clubProfile?.favorite_genres)) badges.push(limitText(clubProfile?.favorite_genres, 28));
  if (normalizeText(clubProfile?.city_base)) badges.push(normalizeText(clubProfile?.city_base));
  if (normalizeText(clubProfile?.playlist_title)) badges.push(limitText(clubProfile?.playlist_title, 28));

  const labels = links.map((link) => getDisplayName(link.label, link.platform));
  for (const label of labels) {
    if (!badges.includes(label)) badges.push(label);
  }

  return badges.slice(0, 4);
}

function buildClubSpotlightText(links: PublicSocialLink[], clubProfile: ClubProfile | null): string {
  const nextEvents = normalizeText(clubProfile?.next_events);
  const lastEvents = normalizeText(clubProfile?.last_events);

  if (nextEvents) {
    return `Próximos encontros na cena: ${limitText(nextEvents, 120)}.`;
  }

  if (lastEvents) {
    return `Últimos eventos vividos: ${limitText(lastEvents, 120)}.`;
  }

  if (links.length === 0) {
    return "Este perfil está ativo e em atualização para receber novos acessos.";
  }

  const first = getDisplayName(links[0].label, links[0].platform);
  if (links.length === 1) {
    return `${first} é o acesso principal deste perfil agora.`;
  }

  return `${first} está em destaque, junto com outros acessos selecionados para continuar a experiência.`;
}

function getStreamingChannels(clubProfile: ClubProfile | null): StreamingChannel[] {
  if (!clubProfile) return [];

  const channels: StreamingChannel[] = [];
  if (normalizeText(clubProfile.spotify_url)) channels.push({ label: "Spotify", href: clubProfile.spotify_url! });
  if (normalizeText(clubProfile.soundcloud_url)) channels.push({ label: "SoundCloud", href: clubProfile.soundcloud_url! });
  if (normalizeText(clubProfile.youtube_url)) channels.push({ label: "YouTube", href: clubProfile.youtube_url! });
  if (normalizeText(clubProfile.beatport_url)) channels.push({ label: "Beatport", href: clubProfile.beatport_url! });
  if (normalizeText(clubProfile.mixcloud_url)) channels.push({ label: "Mixcloud", href: clubProfile.mixcloud_url! });

  return channels;
}

function getClubCultureBlocks(clubProfile: ClubProfile | null): Array<{ title: string; value: string }> {
  if (!clubProfile) {
    return [
      {
        title: "Comunidades da cena",
        value: "Espaço preparado para clubs, artistas, festivais e conexões culturais.",
      },
      {
        title: "Próxima evolução",
        value: "Eventos, artistas favoritos, playlists e pertencimento entrarão nesta experiência.",
      },
    ];
  }

  const blocks: Array<{ title: string; value: string }> = [];

  if (normalizeText(clubProfile.favorite_artists)) {
    blocks.push({
      title: "Artistas prediletos",
      value: limitText(clubProfile.favorite_artists, 120),
    });
  }

  if (normalizeText(clubProfile.favorite_clubs)) {
    blocks.push({
      title: "Clubs e experiências",
      value: limitText(clubProfile.favorite_clubs, 120),
    });
  }

  if (normalizeText(clubProfile.favorite_events)) {
    blocks.push({
      title: "Eventos prediletos",
      value: limitText(clubProfile.favorite_events, 120),
    });
  }

  if (normalizeText(clubProfile.next_events)) {
    blocks.push({
      title: "Próximos eventos",
      value: limitText(clubProfile.next_events, 120),
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      title: "Comunidades da cena",
      value: "Espaço preparado para clubs, artistas, festivais e conexões culturais.",
    });
  }

  return blocks.slice(0, 4);
}

function getClubSocialButtons(links: PublicSocialLink[]): Array<{ label: string; href: string }> {
  const filtered = links.filter((link) => {
    const key = normalizeText(link.platform).toLowerCase();
    return key.includes("instagram") || key.includes("tiktok") || key.includes("telegram") || key.includes("whatsapp");
  });

  return filtered.slice(0, 4).map((link) => ({
    label: getDisplayName(link.label, link.platform),
    href: `/r/${link.id}`,
  }));
}

function getLinkHint(link: PublicSocialLink, index: number): string {
  const key = normalizeText(link.label || link.platform).toLowerCase();

  if (index === 0) return "Acesso principal do momento";
  if (key.includes("instagram")) return "Entrar no perfil";
  if (key.includes("youtube")) return "Assistir agora";
  if (key.includes("spotify") || key.includes("soundcloud") || key.includes("beatport") || key.includes("mixcloud")) {
    return "Ouvir agora";
  }
  if (key.includes("whatsapp")) return "Falar agora";
  return "Abrir acesso";
}

export default async function ClubPublicPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const qp = searchParams ? await searchParams : undefined;

  const s = String(slug || "").trim().toLowerCase();

  if (qp?.mode === "pro") {
    redirect(`/pro/${s}`);
  }

  if (!s || RESERVED.has(s)) notFound();

  const supabase = createPublicClient();

  const { data: card } = await supabase
    .from("cards")
    .select("card_id, slug, label, user_id, is_published")
    .eq("slug", s)
    .single();

  if (!card?.card_id) {
    const { data: hist } = await supabase
      .from("card_slug_history")
      .select("card_id, slug, is_current")
      .eq("slug", s)
      .maybeSingle();

    if (!hist?.card_id) notFound();

    const { data: current } = await supabase
      .from("cards")
      .select("slug, is_published")
      .eq("card_id", hist.card_id)
      .single();

    if (!current?.slug || !current.is_published) notFound();

    permanentRedirect(`/${current.slug}`);
  }

  if (!card.is_published) notFound();

  const clicks = await incrementClicks(supabase, card.slug);
  const userId = String(card.user_id);

  const links = await getClubLinks(supabase, userId);
  const clubProfile = await getClubProfile(supabase, userId);

  const profileName = normalizeText(card.label) || "Este perfil";
  const firstLink = links.length > 0 ? links[0] : null;
  const firstActionLink = firstLink ? `/r/${firstLink.id}` : null;
  const firstActionLabel = firstLink
    ? getDisplayName(firstLink.label, firstLink.platform)
    : null;

  const heroTitle = buildClubHeadline(links.length, clubProfile);
  const heroDescription = buildClubDescription(profileName, links.length, clubProfile);
  const heroHighlights = getHeroHighlights(links.length, clubProfile);
  const clubBadges = getClubQuickBadges(links, clubProfile);
  const clubSpotlightText = buildClubSpotlightText(links, clubProfile);
  const clubCultureBlocks = getClubCultureBlocks(clubProfile);
  const streamingChannels = getStreamingChannels(clubProfile);
  const clubSocialButtons = getClubSocialButtons(links);
  const clubPhotoUrl = normalizeText(clubProfile?.club_photo_url);

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 12 }}>
        <div style={topBarStyle()}>
          <div style={{ display: "grid", gap: 8 }}>
            <span style={badgeStyle()}>{formatClicks(clicks)}</span>

            <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: 0 }}>
              {profileName}
            </h1>

            <p style={{ opacity: 0.72, margin: 0 }}>
              Perfil Club: {card.slug}
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href={`/${card.slug}`} style={modeButtonStyle(true)}>
              Experiência Club
            </Link>

            <Link href={`/pro/${card.slug}`} style={modeButtonStyle(false)}>
              Perfil profissional
            </Link>
          </div>
        </div>
      </header>

      <section style={heroStyle()}>
        <div style={heroMainGridStyle(Boolean(clubPhotoUrl))}>
          {clubPhotoUrl ? (
            <div style={heroPhotoWrapStyle()}>
              <img
                src={clubPhotoUrl}
                alt="Foto do Club"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 360,
                  objectFit: "cover",
                  display: "block",
                }}
              />

              <div style={heroPhotoOverlayStyle()} />

              <div style={heroPhotoCaptionStyle()}>
                <span style={compactBadgeStyle()}>
                  Presença visual da cena
                </span>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 14, alignContent: "center" }}>
            <span style={heroKickerStyle()}>
              Modo Club
            </span>

            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.02 }}>
              {heroTitle}
            </div>

            <p
              style={{
                margin: 0,
                opacity: 0.92,
                maxWidth: 760,
                lineHeight: 1.7,
                fontSize: 17,
              }}
            >
              {heroDescription}
            </p>

            {heroHighlights.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {heroHighlights.map((item) => (
                  <span key={item} style={compactBadgeStyle()}>
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {firstActionLink ? (
                <a
                  href={firstActionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={primaryButtonStyle()}
                >
                  {firstActionLabel
                    ? `Entrar em ${firstActionLabel}`
                    : "Entrar no destaque"}
                </a>
              ) : null}

              {streamingChannels.length > 0 ? (
                <a
                  href={streamingChannels[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={secondaryHeroButtonStyle()}
                >
                  Ouvir agora
                </a>
              ) : null}
            </div>

            <div style={infoGridStyle()}>
              <div style={infoCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Em destaque agora
                </strong>
                <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
                  {links.length > 0
                    ? clubSpotlightText
                    : "Este perfil está ativo e pronto para receber novos acessos em breve."}
                </div>
              </div>

              <div style={infoCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Disponível agora
                </strong>
                <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
                  {links.length === 0
                    ? "Nenhum link ativo neste momento."
                    : links.length === 1
                      ? "1 acesso ativo disponível."
                      : `${links.length} acessos ativos disponíveis.`}
                </div>
              </div>

              {normalizeText(clubProfile?.city_base) ? (
                <div style={infoCardStyle()}>
                  <strong style={{ display: "block", marginBottom: 6 }}>
                    Base cultural
                  </strong>
                  <div style={{ opacity: 0.88, lineHeight: 1.55 }}>
                    {clubProfile?.city_base}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {clubBadges.length > 0 ? (
          <div style={clubHighlightsGridStyle()}>
            {clubBadges.map((badge, index) => (
              <div key={`${badge}-${index}`} style={clubHighlightCardStyle()}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  {index === 0 ? "Destaque do perfil" : "Elemento da cena"}
                </strong>
                <div style={{ opacity: 0.9, lineHeight: 1.55 }}>{badge}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section style={sectionCardStyle()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Identidade na cena</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>
          O Club Mode mostra quem é este perfil dentro dos eventos, artistas, clubs e experiências da cena.
        </p>

        <div style={clubCultureGridStyle()}>
          {clubCultureBlocks.map((block) => (
            <div key={`${block.title}-${block.value}`} style={clubCultureCardStyle()}>
              <strong style={{ display: "block", marginBottom: 8 }}>{block.title}</strong>
              <div style={{ opacity: 0.88, lineHeight: 1.6 }}>{block.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Eventos e presença</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>
          Aqui entram os eventos que este perfil viveu, quer viver e usa para se conectar com outras pessoas da cena.
        </p>

        <div style={clubCultureGridStyle()}>
          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Últimos eventos</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {normalizeText(clubProfile?.last_events) || "Ainda não informado."}
            </div>
          </div>

          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Próximos eventos</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {normalizeText(clubProfile?.next_events) || "Ainda não informado."}
            </div>
          </div>

          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Eventos prediletos</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {normalizeText(clubProfile?.favorite_events) || "Ainda não informado."}
            </div>
          </div>

          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Vertentes da cena</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {normalizeText(clubProfile?.favorite_genres) || "Ainda não informado."}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Playlist e streaming</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>
          O lado musical do perfil fica vivo aqui, com playlist principal e até cinco plataformas.
        </p>

        <div style={quickPanelsGridStyle()}>
          <div style={quickPanelStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Playlist principal</strong>
            <p style={{ margin: "0 0 10px 0", opacity: 0.84, lineHeight: 1.55 }}>
              {normalizeText(clubProfile?.playlist_title) || "Ainda não informado."}
            </p>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              {normalizeText(clubProfile?.playlist_description) || "Sem descrição no momento."}
            </div>
          </div>

          <div style={quickPanelStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Canais de streaming</strong>
            <p style={{ margin: "0 0 12px 0", opacity: 0.84, lineHeight: 1.55 }}>
              Use estes acessos para ouvir, acompanhar sets e entender melhor a identidade sonora deste perfil.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {streamingChannels.length > 0 ? (
                streamingChannels.map((channel) => (
                  <a
                    key={`${channel.label}-${channel.href}`}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={channelButtonStyle()}
                  >
                    {channel.label}
                  </a>
                ))
              ) : (
                <span style={compactBadgeStyle()}>Nenhum streaming configurado</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Comunidades e pertencimento</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>
          O objetivo do Club é aproximar pessoas que compartilham artistas, clubs, festivais e a mesma energia da cena.
        </p>

        <div style={clubCultureGridStyle()}>
          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Artistas prediletos</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {normalizeText(clubProfile?.favorite_artists) || "Ainda não informado."}
            </div>
          </div>

          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Clubs e experiências</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {normalizeText(clubProfile?.favorite_clubs) || "Ainda não informado."}
            </div>
          </div>

          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Presença social</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {clubSocialButtons.length > 0 ? (
                clubSocialButtons.map((button) => (
                  <a
                    key={`${button.label}-${button.href}`}
                    href={button.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={channelButtonStyle()}
                  >
                    {button.label}
                  </a>
                ))
              ) : (
                <span style={compactBadgeStyle()}>Nenhuma rede social ativa</span>
              )}
            </div>
          </div>

          <div style={clubCultureCardStyle()}>
            <strong style={{ display: "block", marginBottom: 8 }}>Conexão por afinidade</strong>
            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              Esta área prepara a evolução para encontros, matching por cena e conexões entre usuários nos mesmos eventos.
            </div>
          </div>
        </div>
      </section>

      <section style={sectionCardStyle()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Entrar agora</h2>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Escolha abaixo o acesso que faz mais sentido neste momento.
            </p>
          </div>

          {links.length > 0 ? (
            <span style={badgeStyle()}>
              {links.length === 1 ? "1 link ativo" : `${links.length} links ativos`}
            </span>
          ) : null}
        </div>

        {links.length === 0 ? (
          <p style={{ marginBottom: 0 }}>
            Nenhum link ativo disponível para este perfil neste momento.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {links.map((l, index) => {
              const label = getDisplayName(l.label, l.platform);
              const hint = getLinkHint(l, index);
              const isFirst = index === 0;

              return (
                <a
                  key={l.id}
                  href={`/r/${l.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkCardStyle(isFirst)}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: isFirst ? 17 : 16 }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.72 }}>{hint}</span>
                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      opacity: 0.9,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Abrir
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}