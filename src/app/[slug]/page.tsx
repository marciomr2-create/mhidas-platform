// src/app/[slug]/page.tsx

// PARTE 1/4

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

type ProfileMode = "club" | "pro";

type SpotifyArtist = {
  spotify_id: string;
  name: string;
  image_url: string | null;
  spotify_url: string | null;
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
]);

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitList(value: any): string[] {
  const text = normalizeText(value);
  if (!text) return [];

  return text
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function getYoutubeEmbed(url: string | null | undefined): string {
  if (!url) return "";

  const value = String(url).trim();

  if (value.includes("list=RD_") || value.includes("start_radio=1")) {
    return "";
  }

  const watch = value.match(/[?&]v=([^&]+)/);
  if (watch?.[1]) return `https://www.youtube.com/embed/${watch[1]}`;

  const short = value.match(/youtu\.be\/([^?&]+)/);
  if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;

  const embed = value.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;

  return "";
}

function getSpotifyEmbed(url: string | null | undefined): string {
  if (!url) return "";

  const value = String(url).trim();

  const match = value.match(
    /spotify\.com\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9._-]+)/
  );

  if (!match) return "";

  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
}

function getSoundCloudEmbed(url: string | null | undefined): string {
  if (!url) return "";

  const value = String(url).trim();

  if (!value.includes("soundcloud.com")) {
    return "";
  }

  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    value
  )}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
}

function getStreamingUrl(clubProfile: any): string {
  const platform = normalizeText(clubProfile?.primary_streaming_platform).toLowerCase();

  const youtubeUrl = normalizeText(clubProfile?.youtube_url);
  const spotifyUrl = normalizeText(clubProfile?.spotify_url);
  const soundcloudUrl = normalizeText(clubProfile?.soundcloud_url);
  const appleMusicUrl = normalizeText(clubProfile?.apple_music_url);
  const deezerUrl = normalizeText(clubProfile?.deezer_url);
  const mixcloudUrl = normalizeText(clubProfile?.mixcloud_url);
  const beatportUrl = normalizeText(clubProfile?.beatport_url);

  if (platform.includes("youtube") && youtubeUrl) return youtubeUrl;
  if (platform.includes("spotify") && spotifyUrl) return spotifyUrl;
  if (platform.includes("soundcloud") && soundcloudUrl) return soundcloudUrl;
  if (platform.includes("apple") && appleMusicUrl) return appleMusicUrl;
  if (platform.includes("deezer") && deezerUrl) return deezerUrl;
  if (platform.includes("mixcloud") && mixcloudUrl) return mixcloudUrl;
  if (platform.includes("beatport") && beatportUrl) return beatportUrl;

  return (
    youtubeUrl ||
    spotifyUrl ||
    soundcloudUrl ||
    appleMusicUrl ||
    deezerUrl ||
    mixcloudUrl ||
    beatportUrl ||
    ""
  );
}

function getPlatformLabel(value: any): string {
  const key = normalizeText(value).toLowerCase();

  const map: Record<string, string> = {
    youtube: "YouTube",
    spotify: "Spotify",
    soundcloud: "SoundCloud",
    apple_music: "Apple Music",
    deezer: "Deezer",
    mixcloud: "Mixcloud",
    beatport: "Beatport",
  };

  return map[key] || normalizeText(value);
}
// PARTE 2/4

function getDisplayLinkLabel(link: any): string {
  const raw = normalizeText(link?.label || link?.platform || "Abrir link");
  const key = raw.toLowerCase().replace(/\s+/g, "");

  const names: Record<string, string> = {
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    instagram: "Instagram",
    instagram1: "Instagram",
    tiktok: "TikTok",
    spotify: "Spotify",
    soundcloud: "SoundCloud",
    beatport: "Beatport",
    mixcloud: "Mixcloud",
    telegram: "Telegram",
    website: "Website",
    site: "Website",
    linkedin: "LinkedIn",
  };

  return names[key] || raw;
}

function pillStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 11px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: 12,
    fontWeight: 750,
    color: "#fff",
  };
}

function sectionBoxStyle(): CSSProperties {
  return {
    background: "rgba(255,255,255,0.045)",
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
  };
}

function innerCardStyle(): CSSProperties {
  return {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: "0 0 14px 0",
    fontSize: 20,
    fontWeight: 850,
    letterSpacing: -0.3,
  };
}

function actionCardStyle(): CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: "15px 16px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.11)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 780,
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    display: "inline-block",
    padding: "13px 17px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 850,
  };
}

function buildEventRows(names: string[], dates: string[], links: string[]) {
  return names.map((name, index) => ({
    name,
    date: dates[index] || "",
    link: links[index] || "",
  }));
}

export default async function PublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;

  const cleanSlug = String(slug || "").trim().toLowerCase();

  if (!cleanSlug || RESERVED.has(cleanSlug)) {
    notFound();
  }

  const mode: ProfileMode = sp?.mode === "pro" ? "pro" : "club";

  if (mode === "pro") {
    permanentRedirect(`/pro/${cleanSlug}`);
  }

  const supabase = createPublicClient();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", cleanSlug)
    .eq("is_published", true)
    .single();

  if (!card?.card_id) {
    const { data: hist } = await supabase
      .from("card_slug_history")
      .select("card_id, slug, is_current")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (!hist?.card_id) {
      notFound();
    }

    const { data: current } = await supabase
      .from("cards")
      .select("slug, is_published")
      .eq("card_id", hist.card_id)
      .single();

    if (!current?.slug || !current.is_published) {
      notFound();
    }

    permanentRedirect(`/${current.slug}?mode=club`);
  }

  const { data: clubProfile } = await supabase
    .from("club_profiles")
    .select("*")
    .eq("user_id", card.user_id)
    .maybeSingle();

  const { data: linksData } = await supabase
    .from("social_links")
    .select("*")
    .eq("card_id", card.card_id)
    .eq("is_active", true)
    .in("mode", ["club", "both"])
    .order("sort_order", { ascending: true })
    .order("position", { ascending: true });

  let links: any[] = linksData || [];

  if (links.length === 0) {
    const { data: userLinks } = await supabase
      .from("social_links")
      .select("*")
      .eq("user_id", card.user_id)
      .eq("is_active", true)
      .in("mode", ["club", "both"])
      .order("sort_order", { ascending: true })
      .order("position", { ascending: true });

    links = userLinks || [];
  }

  let spotifyArtists: SpotifyArtist[] = [];

  try {
    const { data } = await supabase
      .from("club_profile_artists")
      .select("spotify_id, name, image_url, spotify_url")
      .eq("user_id", card.user_id)
      .order("created_at", { ascending: true });

    spotifyArtists = (data || []) as SpotifyArtist[];
  } catch {
    spotifyArtists = [];
  }

  const streamingUrl = getStreamingUrl(clubProfile);
  const youtubeEmbed = getYoutubeEmbed(streamingUrl);
  const spotifyEmbed = getSpotifyEmbed(streamingUrl);
  const soundcloudEmbed = getSoundCloudEmbed(streamingUrl);
  const finalEmbed = youtubeEmbed || spotifyEmbed || soundcloudEmbed;

  const profileName = normalizeText(card.label) || "Perfil Club";

  const tagline =
    normalizeText(clubProfile?.club_tagline) ||
    "Uma identidade viva para a cena eletrônica.";

  const sceneDescription =
    normalizeText(clubProfile?.scene_description) ||
    normalizeText(clubProfile?.bio_text) ||
    normalizeText(clubProfile?.about) ||
    "Perfil criado para reunir identidade musical, artistas de referência, eventos, clubes, playlists e canais de conexão.";

  const cityBase = normalizeText(clubProfile?.city_base);
  const platformLabel = getPlatformLabel(clubProfile?.primary_streaming_platform);

  const playlistTitle =
    normalizeText(clubProfile?.playlist_title) || "Playlist principal";

  const playlistDescription = normalizeText(clubProfile?.playlist_description);

  const genres = splitList(
    clubProfile?.favorite_genres ||
      clubProfile?.genres ||
      clubProfile?.music_styles ||
      clubProfile?.vertentes
  );

  const clubs = splitList(
    clubProfile?.favorite_clubs || clubProfile?.clubs || clubProfile?.clubes
  );

  const festivals = splitList(
    clubProfile?.favorite_events ||
      clubProfile?.favorite_festivals ||
      clubProfile?.festivals ||
      clubProfile?.eventos_favoritos
  );
// PARTE 3/4

  const lastEvents = splitList(
    clubProfile?.last_events || clubProfile?.events_attended
  );

  const nextEvents = splitList(
    clubProfile?.next_events || clubProfile?.upcoming_events
  );

  const nextEventDates = splitList(clubProfile?.next_events_dates);
  const nextEventLinks = splitList(clubProfile?.next_events_links);
  const nextEventRows = buildEventRows(nextEvents, nextEventDates, nextEventLinks);

  const rideStatus = normalizeText(clubProfile?.ride_status);
  const rideEventName = normalizeText(clubProfile?.ride_event_name);
  const rideEventDate = normalizeText(clubProfile?.ride_event_date);
  const rideEventUrl = normalizeText(clubProfile?.ride_event_url);
  const rideOrigin = normalizeText(clubProfile?.ride_origin);
  const rideDestination = normalizeText(clubProfile?.ride_destination);
  const rideSeats = normalizeText(clubProfile?.ride_seats);
  const rideNotes = normalizeText(clubProfile?.ride_notes);

  const meetStatus = normalizeText(clubProfile?.meet_status);
  const meetEventName = normalizeText(clubProfile?.meet_event_name);
  const meetEventDate = normalizeText(clubProfile?.meet_event_date);
  const meetEventUrl = normalizeText(clubProfile?.meet_event_url);
  const meetMeetingPoint = normalizeText(clubProfile?.meet_meeting_point);
  const meetTime = normalizeText(clubProfile?.meet_time);
  const meetNotes = normalizeText(clubProfile?.meet_notes);

  const hasRide =
    rideStatus ||
    rideEventName ||
    rideEventDate ||
    rideEventUrl ||
    rideOrigin ||
    rideDestination ||
    rideSeats ||
    rideNotes;

  const hasMeet =
    meetStatus ||
    meetEventName ||
    meetEventDate ||
    meetEventUrl ||
    meetMeetingPoint ||
    meetTime ||
    meetNotes;

  const container: CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(125,92,255,0.20), transparent 34%), radial-gradient(circle at top right, rgba(0,220,255,0.11), transparent 28%), #050505",
    color: "#fff",
    padding: 18,
  };

  const page: CSSProperties = {
    maxWidth: 1080,
    margin: "0 auto",
  };

  const topBar: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  };

  const modeButtonActive: CSSProperties = {
    padding: "10px 16px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.20)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 850,
    whiteSpace: "nowrap",
  };

  const modeButton: CSSProperties = {
    padding: "10px 16px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 780,
    whiteSpace: "nowrap",
  };

  const hero: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "210px 1fr",
    gap: 22,
    alignItems: "center",
    padding: 22,
    borderRadius: 32,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.035))",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  };

  const heroBackgroundPhoto: CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: clubProfile?.club_photo_url
      ? `url(${clubProfile.club_photo_url})`
      : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: 0.34,
    filter: "blur(12px)",
    transform: "scale(1.13)",
    zIndex: 0,
  };

  const heroOverlay: CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(5,5,5,0.20), rgba(5,5,5,0.58) 46%, rgba(5,5,5,0.78))",
    zIndex: 1,
  };

  const photoWrap: CSSProperties = {
    position: "relative",
    zIndex: 2,
    height: 280,
    borderRadius: 26,
    overflow: "hidden",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.035))",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 16px 42px rgba(0,0,0,0.35)",
  };

  const heroContent: CSSProperties = {
    position: "relative",
    zIndex: 3,
    display: "grid",
    alignContent: "center",
    gap: 13,
    minWidth: 0,
  };

  const heroTitle: CSSProperties = {
    margin: 0,
    fontSize: 27,
    lineHeight: 1.12,
    fontWeight: 720,
    letterSpacing: -0.8,
    maxWidth: 680,
  };

  const artistGrid: CSSProperties = {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    paddingBottom: 10,
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
  };

  const artistCard: CSSProperties = {
    flex: "0 0 155px",
    scrollSnapAlign: "start",
    background: "rgba(255,255,255,0.055)",
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.11)",
    textDecoration: "none",
    color: "#fff",
  };

  return (
    <main style={container}>
      <div style={page}>
        <header style={topBar}>
          <div>
            <div style={{ ...pillStyle(), marginBottom: 10 }}>Modo Club</div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.08,
                fontWeight: 900,
                letterSpacing: -0.8,
              }}
            >
              {profileName}
            </h1>

            <p style={{ opacity: 0.74, margin: "8px 0 0 0" }}>
              Perfil Club: {card.slug}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/${card.slug}?mode=club`} style={modeButtonActive}>
              Experiência Club
            </Link>

            <Link href={`/pro/${card.slug}`} style={modeButton}>
              Perfil profissional
            </Link>
          </div>
        </header>

        <section style={hero}>
          {clubProfile?.club_photo_url ? <div style={heroBackgroundPhoto} /> : null}
          <div style={heroOverlay} />

          <div style={photoWrap}>
            {clubProfile?.club_photo_url ? (
              <img
                src={clubProfile.club_photo_url}
                alt="Foto Club"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  padding: 22,
                  textAlign: "center",
                  opacity: 0.72,
                  fontWeight: 750,
                }}
              >
                Imagem Club em destaque
              </div>
            )}
          </div>

          <div style={heroContent}>
            <div style={pillStyle()}>USECLUBBERS</div>

            <h2 style={heroTitle}>{tagline}</h2>

            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.65,
                opacity: 0.86,
                maxWidth: 650,
              }}
            >
              {sceneDescription}
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cityBase ? <span style={pillStyle()}>{cityBase}</span> : null}
              {platformLabel ? <span style={pillStyle()}>{platformLabel}</span> : null}

              {genres.slice(0, 5).map((item) => (
                <span key={item} style={pillStyle()}>
                  {item}
                </span>
              ))}
            </div>

            {streamingUrl ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={streamingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={primaryButtonStyle()}
                >
                  Abrir playlist
                </a>
              </div>
            ) : null}
          </div>
        </section>
// PARTE 4/4

        {streamingUrl ? (
          <section style={sectionBoxStyle()}>
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
                <h2 style={{ ...sectionTitleStyle(), marginBottom: 6 }}>
                  {playlistTitle}
                </h2>

                {playlistDescription ? (
                  <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.55 }}>
                    {playlistDescription}
                  </p>
                ) : null}
              </div>

              <a
                href={streamingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={primaryButtonStyle()}
              >
                Abrir fora
              </a>
            </div>

            {finalEmbed ? (
              <iframe
                src={finalEmbed}
                width="100%"
                height={youtubeEmbed || soundcloudEmbed ? 420 : 180}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 20,
                  background: "#000",
                }}
              />
            ) : (
              <div style={innerCardStyle()}>
                <strong>Player não disponível para este link.</strong>
                <p style={{ margin: "8px 0 0 0", opacity: 0.78, lineHeight: 1.55 }}>
                  Este tipo de URL nao permite incorporacão direta. Use o botao para abrir na plataforma oficial.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {spotifyArtists.length > 0 ? (
          <section style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Artistas de referencia</h2>

            <div style={artistGrid}>
              {spotifyArtists.map((artist) => (
                <a
                  key={artist.spotify_id}
                  href={artist.spotify_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={artistCard}
                >
                  {artist.image_url ? (
                    <img
                      src={artist.image_url}
                      alt={artist.name}
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 160,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.06)",
                        fontWeight: 850,
                      }}
                    >
                      Spotify
                    </div>
                  )}

                  <div style={{ padding: 12 }}>
                    <strong>{artist.name}</strong>
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.72 }}>
                      Spotify
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {(clubs.length > 0 ||
          festivals.length > 0 ||
          lastEvents.length > 0 ||
          nextEvents.length > 0) ? (
          <section style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Cena, clubes e eventos</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {clubs.length > 0 ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Clubes</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {clubs.map((item) => (
                      <span key={item} style={pillStyle()}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {festivals.length > 0 ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Festivais e festas</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {festivals.map((item) => (
                      <span key={item} style={pillStyle()}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {lastEvents.length > 0 ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Últimos eventos</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {lastEvents.map((item) => (
                      <span key={item} style={pillStyle()}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {nextEventRows.length > 0 ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Próximos eventos</h3>

                  <div style={{ display: "grid", gap: 10 }}>
                    {nextEventRows.map((event, index) => (
                      <div
                        key={`${event.name}-${index}`}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.045)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <strong>{event.name}</strong>

                        {event.date ? (
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                            {event.date}
                          </div>
                        ) : null}

                        {event.link ? (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              marginTop: 8,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 780,
                              textDecoration: "underline",
                            }}
                          >
                            Abrir evento oficial
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : nextEvents.length > 0 ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Proximos eventos</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {nextEvents.map((item) => (
                      <span key={item} style={pillStyle()}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {(hasRide || hasMeet) ? (
          <section style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Conexões para eventos</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {hasRide ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Carona compartilhada</h3>

                  <div style={{ display: "grid", gap: 8, lineHeight: 1.55 }}>
                    {rideStatus ? (
                      <div>
                        <strong>Status: </strong>
                        <span>{rideStatus}</span>
                      </div>
                    ) : null}

                    {rideEventName ? (
                      <div>
                        <strong>Evento: </strong>
                        <span>{rideEventName}</span>
                      </div>
                    ) : null}

                    {rideEventDate ? (
                      <div>
                        <strong>Data: </strong>
                        <span>{rideEventDate}</span>
                      </div>
                    ) : null}

                    {rideOrigin ? (
                      <div>
                        <strong>Origem: </strong>
                        <span>{rideOrigin}</span>
                      </div>
                    ) : null}

                    {rideDestination ? (
                      <div>
                        <strong>Destino: </strong>
                        <span>{rideDestination}</span>
                      </div>
                    ) : null}

                    {rideSeats ? (
                      <div>
                        <strong>Vagas: </strong>
                        <span>{rideSeats}</span>
                      </div>
                    ) : null}

                    {rideNotes ? (
                      <p style={{ margin: 0, opacity: 0.82 }}>{rideNotes}</p>
                    ) : null}

                    {rideEventUrl ? (
                      <a
                        href={rideEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={primaryButtonStyle()}
                      >
                        Abrir evento da carona
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {hasMeet ? (
                <div style={innerCardStyle()}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Encontro combinado</h3>

                  <div style={{ display: "grid", gap: 8, lineHeight: 1.55 }}>
                    {meetStatus ? (
                      <div>
                        <strong>Status: </strong>
                        <span>{meetStatus}</span>
                      </div>
                    ) : null}

                    {meetEventName ? (
                      <div>
                        <strong>Evento: </strong>
                        <span>{meetEventName}</span>
                      </div>
                    ) : null}

                    {meetEventDate ? (
                      <div>
                        <strong>Data: </strong>
                        <span>{meetEventDate}</span>
                      </div>
                    ) : null}

                    {meetMeetingPoint ? (
                      <div>
                        <strong>Ponto: </strong>
                        <span>{meetMeetingPoint}</span>
                      </div>
                    ) : null}

                    {meetTime ? (
                      <div>
                        <strong>Horário: </strong>
                        <span>{meetTime}</span>
                      </div>
                    ) : null}

                    {meetNotes ? (
                      <p style={{ margin: 0, opacity: 0.82 }}>{meetNotes}</p>
                    ) : null}

                    {meetEventUrl ? (
                      <a
                        href={meetEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={primaryButtonStyle()}
                      >
                        Abrir evento do encontro
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {links.length > 0 ? (
          <section style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Canais Club</h2>

            <div style={{ display: "grid", gap: 12 }}>
              {links.map((link: any) => (
                <a
                  key={link.id}
                  href={`/r/${link.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={actionCardStyle()}
                >
                  <span>{getDisplayLinkLabel(link)}</span>
                  <span style={{ opacity: 0.72 }}>Abrir</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}