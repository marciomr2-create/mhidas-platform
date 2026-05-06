// src/app/[slug]/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createPublicClient } from "@/utils/supabase/public";
import OwnerClubToolbar from "./OwnerClubToolbar";
import RemoveClubTokenButton from "./RemoveClubTokenButton";
import RemoveClubArtistButton from "./RemoveClubArtistButton";
import AddClubTokenButton from "./AddClubTokenButton";
import CheckInEventButton from "./CheckInEventButton";
import AddClubArtistButton from "./AddClubArtistButton";
import MoveClubTokenButton from "./MoveClubTokenButton";
import MoveClubArtistButton from "./MoveClubArtistButton";
import ClubOwnerEmptyBlock from "./ClubOwnerEmptyBlock";
import ClubOwnerEmptySceneSection from "./ClubOwnerEmptySceneSection";

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

type CheckInLocationStatus =
  | "not_checked"
  | "inside_radius"
  | "outside_radius"
  | "location_unavailable"
  | "pending_sync";

type PublicCheckInInfo = {
  status: string;
  locationStatus: CheckInLocationStatus;
};

type EventHeatScore = {
  confirmedCount: number;
  validatedCount: number;
  manualCount: number;
  outsideRadiusCount: number;
};

type EventMiniMember = {
  userId: string;
  label: string;
  slug: string;
  clubPhotoUrl: string;
  cityBase: string;
};

type ClubCatalogItem = {
  id: string;
  name: string | null;
  type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  image_url: string | null;
  official_url: string | null;
  instagram_url: string | null;
  source_url: string | null;
  source_name: string | null;
  source_provider: string | null;
  is_verified: boolean | null;
  usage_count?: number | null;
  normalized_name: string | null;
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

function normalizeUrl(value: any): string {
  const text = normalizeText(value);

  if (!text) return "";
  if (text.startsWith("http://")) return text;
  if (text.startsWith("https://")) return text;
  if (text.startsWith("/")) return text;

  return `https://${text}`;
}

function normalizeForCatalogSearch(value: any): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactCatalogText(value: any): string {
  return normalizeForCatalogSearch(value).replace(/\s+/g, "");
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

function isUsableCatalogImageUrl(value: any): boolean {
  const url = normalizeUrl(value);
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const full = url.toLowerCase();

    if (host.includes("lookaside.instagram.com")) return false;
    if (full.includes("google_widget/crawler")) return false;
    if (path.includes("/seo/")) return false;
    if (host.includes("facebook.com")) return false;
    if (host.includes("fbcdn.net")) return false;

    return true;
  } catch {
    return false;
  }
}

function getCatalogImageUrl(item?: ClubCatalogItem | null): string {
  const imageUrl = normalizeUrl(item?.image_url);

  if (!isUsableCatalogImageUrl(imageUrl)) {
    return "";
  }

  return imageUrl;
}

function isSafeCatalogHref(value: any): boolean {
  const href = normalizeUrl(value);

  if (!href) return false;

  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    const parts = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    if (host.includes("instagram.com")) {
      if (!parts.length) return false;

      const firstPart = parts[0].toLowerCase();

      const blockedInstagramPaths = new Set([
        "p",
        "reel",
        "reels",
        "stories",
        "explore",
        "tv",
        "accounts",
        "direct",
        "popular",
        "following",
        "directory",
        "about",
        "developer",
        "privacy",
        "terms",
      ]);

      return !blockedInstagramPaths.has(firstPart);
    }

    if (
      host.includes("google.") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("facebook.com") ||
      host.includes("tiktok.com") ||
      host.includes("x.com") ||
      host.includes("twitter.com") ||
      host.includes("linkedin.com")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getSafeCatalogHrefFromValue(value: any): string {
  const href = normalizeUrl(value);

  return isSafeCatalogHref(href) ? href : "";
}

function getCatalogHref(item?: ClubCatalogItem | null): string {
  return (
    getSafeCatalogHrefFromValue(item?.official_url) ||
    getSafeCatalogHrefFromValue(item?.instagram_url) ||
    getSafeCatalogHrefFromValue(item?.source_url) ||
    ""
  );
}

function getCatalogLocation(item?: ClubCatalogItem | null): string {
  const city = normalizeText(item?.city);
  const state = normalizeText(item?.state);

  if (city && state) return `${city} - ${state}`;
  if (city) return city;
  if (state) return state;

  return "";
}

function getCatalogSourceLabel(item?: ClubCatalogItem | null): string {
  return normalizeText(item?.source_name || item?.source_provider || "Fonte oficial");
}

function getCatalogTokens(values: string[]): string[] {
  const tokens = new Set<string>();

  for (const value of values) {
    const normalized = normalizeForCatalogSearch(value);
    const compact = compactCatalogText(value);

    normalized
      .split(" ")
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
      .forEach((item) => tokens.add(item));

    if (compact.length >= 5) {
      tokens.add(compact);
    }
  }

  return Array.from(tokens).slice(0, 24);
}

function scoreCatalogMatch(
  label: string,
  item: ClubCatalogItem,
  preferredTypes: string[]
): number {
  const labelNorm = normalizeForCatalogSearch(label);
  const labelCompact = compactCatalogText(label);

  if (!labelCompact || labelCompact.length < 4) {
    return 0;
  }

  const itemNameNorm = normalizeForCatalogSearch(item.name);
  const itemNameCompact = compactCatalogText(item.name);
  const itemNormalizedName = normalizeForCatalogSearch(item.normalized_name);
  const itemNormalizedCompact = compactCatalogText(item.normalized_name);

  const itemAllText = normalizeForCatalogSearch(
    `${item.name || ""} ${item.normalized_name || ""}`
  );

  let textScore = 0;

  if (itemNameNorm === labelNorm) textScore += 160;
  if (itemNormalizedName === labelNorm) textScore += 150;

  if (labelCompact.length >= 6 && itemNameCompact.includes(labelCompact)) {
    textScore += 120;
  }

  if (labelCompact.length >= 6 && itemNormalizedCompact.includes(labelCompact)) {
    textScore += 120;
  }

  if (labelNorm.length >= 6 && itemNameNorm.includes(labelNorm)) {
    textScore += 95;
  }

  if (labelNorm.length >= 6 && itemNormalizedName.includes(labelNorm)) {
    textScore += 95;
  }

  const labelTokens = labelNorm
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  let matchedTokens = 0;

  for (const token of labelTokens) {
    if (itemAllText.includes(token)) {
      matchedTokens += 1;
      textScore += token.length >= 6 ? 34 : 18;
    }
  }

  if (labelTokens.length >= 2 && matchedTokens < 2) {
    return 0;
  }

  if (labelTokens.length === 1 && textScore < 90) {
    return 0;
  }

  if (textScore <= 0) {
    return 0;
  }

  let bonusScore = 0;

  if (preferredTypes.includes(normalizeText(item.type).toLowerCase())) {
    bonusScore += 18;
  }

  if (getCatalogImageUrl(item)) bonusScore += 10;
  if (normalizeUrl(item.official_url)) bonusScore += 8;
  if (normalizeUrl(item.instagram_url)) bonusScore += 5;
  if (item.is_verified) bonusScore += 15;

  bonusScore += Math.min(Number(item.usage_count || 0), 8);

  return textScore + bonusScore;
}

function findBestCatalogItem(
  label: string,
  catalogItems: ClubCatalogItem[],
  preferredTypes: string[]
): ClubCatalogItem | null {
  const ranked = catalogItems
    .map((item) => ({
      item,
      score: scoreCatalogMatch(label, item, preferredTypes),
    }))
    .filter((entry) => entry.score >= 90)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.item || null;
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
    borderRadius: 28,
    padding: 22,
    marginTop: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
  };
}

function innerCardStyle(): CSSProperties {
  return {
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.045)",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: "0 0 8px 0",
    fontSize: 21,
    fontWeight: 900,
    letterSpacing: -0.35,
  };
}

function sectionDescriptionStyle(): CSSProperties {
  return {
    margin: "0 0 16px 0",
    opacity: 0.72,
    lineHeight: 1.55,
    fontSize: 14,
  };
}

function actionCardStyle(): CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: "15px 16px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.11)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 780,
  };
}

function primaryButtonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "12px 16px",
    borderRadius: 15,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 850,
    lineHeight: 1.1,
  };
}

function secondaryButtonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "12px 16px",
    borderRadius: 15,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.11)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 820,
    lineHeight: 1.1,
  };
}

function horizontalRailStyle(): CSSProperties {
  return {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    padding: "2px 2px 12px 2px",
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
  };
}

function editorialCardStyle(width = 235): CSSProperties {
  return {
    flex: `0 0 ${width}px`,
    scrollSnapAlign: "start",
    minHeight: 132,
    padding: 16,
    borderRadius: 22,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.095), rgba(255,255,255,0.035))",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 14px 35px rgba(0,0,0,0.18)",
    color: "#fff",
    textDecoration: "none",
    position: "relative",
    overflow: "hidden",
  };
}

function catalogCardStyle(
  width = 245,
  imageUrl = "",
  accent: "purple" | "cyan" | "neutral" = "purple"
): CSSProperties {
  const glow =
    accent === "cyan"
      ? "rgba(0,220,255,0.18)"
      : accent === "neutral"
        ? "rgba(255,255,255,0.10)"
        : "rgba(125,92,255,0.22)";

  return {
    ...editorialCardStyle(width),
    minHeight: imageUrl ? 246 : 150,
    padding: imageUrl ? 12 : 16,
    background: imageUrl
      ? "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.040))"
      : `linear-gradient(145deg, ${glow}, rgba(255,255,255,0.045))`,
  };
}

function eventCardStyle(width = 300, imageUrl = ""): CSSProperties {
  return {
    flex: `0 0 ${width}px`,
    scrollSnapAlign: "start",
    minHeight: 190,
    padding: 18,
    borderRadius: 24,
    background: imageUrl
      ? `linear-gradient(145deg, rgba(5,5,5,0.20), rgba(5,5,5,0.82)), url("${imageUrl}")`
      : "linear-gradient(145deg, rgba(132,92,255,0.18), rgba(255,255,255,0.045))",
    backgroundSize: imageUrl ? "cover" : undefined,
    backgroundPosition: imageUrl ? "center" : undefined,
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 18px 44px rgba(0,0,0,0.24)",
    color: "#fff",
    textDecoration: "none",
    position: "relative",
    overflow: "hidden",
  };
}

function microLabelStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 11,
    fontWeight: 850,
    opacity: 0.88,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  };
}

function detailRowStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 3,
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  };
}

function buildEventRows(names: string[], dates: string[], links: string[]) {
  return names.map((name, index) => ({
    name,
    date: dates[index] || "",
    link: normalizeUrl(links[index] || ""),
  }));
}

function escapeSvgText(value: string): string {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getGeneratedClubCoverImage(
  label: any,
  accent: "purple" | "cyan" | "neutral" = "purple"
): string {
  const rawTitle = normalizeText(label) || "USECLUBBERS";
  const shortTitle = rawTitle.length > 28 ? `${rawTitle.slice(0, 25)}...` : rawTitle;

  const palette =
    accent === "cyan"
      ? {
          bg: "#04171c",
          glow: "#00dcec",
          glowSoft: "#08717b",
          text: "#f3feff",
          sub: "#b6f8ff",
        }
      : accent === "neutral"
        ? {
            bg: "#111111",
            glow: "#ffffff",
            glowSoft: "#565656",
            text: "#ffffff",
            sub: "#d8d8d8",
          }
        : {
            bg: "#10091f",
            glow: "#7d5cff",
            glowSoft: "#3a227a",
            text: "#ffffff",
            sub: "#d8ccff",
          };

  const safeTitle = escapeSvgText(shortTitle);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <defs>
    <radialGradient id="g1" cx="22%" cy="18%" r="86%">
      <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.78"/>
      <stop offset="42%" stop-color="${palette.glowSoft}" stop-opacity="0.54"/>
      <stop offset="100%" stop-color="${palette.bg}" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.62"/>
    </linearGradient>
  </defs>
  <rect width="900" height="520" fill="url(#g1)"/>
  <rect width="900" height="520" fill="url(#g2)"/>
  <circle cx="705" cy="105" r="145" fill="${palette.glow}" opacity="0.18"/>
  <circle cx="790" cy="410" r="210" fill="#000000" opacity="0.34"/>
  <path d="M0 408 C180 318 320 460 515 358 C670 278 790 312 900 230 L900 520 L0 520 Z" fill="#000000" opacity="0.34"/>
  <text x="54" y="78" fill="${palette.sub}" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="900" letter-spacing="6">USECLUBBERS</text>
  <text x="54" y="326" fill="${palette.text}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="-1">${safeTitle}</text>
  <text x="58" y="374" fill="${palette.sub}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">Cena • Clubes • Eventos</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isUsableClubCoverUrl(value: any): boolean {
  const url = normalizeText(value).toLowerCase();

  if (!url) {
    return false;
  }

  if (url.startsWith("data:image/")) {
    return true;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  if (
    url.includes("instagram.com/") ||
    url.includes("cdninstagram") ||
    url.includes("fbcdn.net") ||
    url.includes("facebook.com/") ||
    url.includes("lookaside.") ||
    url.includes("scontent.") ||
    url.includes("google_widget/crawler") ||
    url.includes("tiktok.com/") ||
    url.includes("x.com/") ||
    url.includes("twitter.com/") ||
    url.includes("youtube.com/") ||
    url.includes("youtu.be/") ||
    url.includes("soundcloud.com/")
  ) {
    return false;
  }

  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".webp") ||
    url.includes(".gif") ||
    url.includes("images.unsplash.com") ||
    url.includes("i.scdn.co") ||
    url.includes("supabase.co/storage") ||
    url.includes("googleusercontent.com")
  ) {
    return true;
  }

  return false;
}

function getSafeClubCoverImage(
  label: any,
  catalog: any,
  accent: "purple" | "cyan" | "neutral" = "purple"
): string {
  const candidate = getCatalogImageUrl(catalog);

  if (isUsableClubCoverUrl(candidate)) {
    return candidate;
  }

  return getGeneratedClubCoverImage(label, accent);
}
function getEventCheckInKey(value: any): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function getStoredCheckInStatus(
  activeCheckInsByKey: Map<string, PublicCheckInInfo>,
  eventName: any
): "none" | "pending" | "active" | "expired" {
  const key = getEventCheckInKey(eventName);
  const status = normalizeText(activeCheckInsByKey.get(key)?.status).toLowerCase();

  if (status === "active") return "active";
  if (status === "pending") return "pending";
  if (status === "expired") return "expired";

  return "none";
}

function getStoredCheckInLocationStatus(
  activeCheckInsByKey: Map<string, PublicCheckInInfo>,
  eventName: any
): CheckInLocationStatus {
  const key = getEventCheckInKey(eventName);
  const locationStatus = normalizeText(
    activeCheckInsByKey.get(key)?.locationStatus
  ).toLowerCase();

  if (locationStatus === "inside_radius") return "inside_radius";
  if (locationStatus === "outside_radius") return "outside_radius";
  if (locationStatus === "location_unavailable") return "location_unavailable";
  if (locationStatus === "pending_sync") return "pending_sync";

  return "not_checked";
}
function getEventHeatScore(
  eventHeatByKey: Map<string, EventHeatScore>,
  eventName: any
): EventHeatScore {
  const key = getEventCheckInKey(eventName);

  return (
    eventHeatByKey.get(key) || {
      confirmedCount: 0,
      validatedCount: 0,
      manualCount: 0,
      outsideRadiusCount: 0,
    }
  );
}

function getEventCheckInStatus(event: any): "none" | "pending" | "active" | "expired" {
  const status = normalizeText(
    event?.checkin_status ||
      event?.check_in_status ||
      event?.club_checkin_status ||
      event?.presence_status
  ).toLowerCase();

  if (status === "active" || status === "ativo" || status === "presente") {
    return "active";
  }

  if (status === "pending" || status === "pendente" || status === "syncing") {
    return "pending";
  }

  if (status === "expired" || status === "encerrado" || status === "finalizado") {
    return "expired";
  }

  return "none";
}

function getCheckInCardGlowStyle(status: "none" | "pending" | "active" | "expired"): CSSProperties {
  if (status === "active") {
    return {
      border: "1px solid rgba(0,255,190,0.72)",
      boxShadow:
        "0 0 0 1px rgba(0,255,190,0.22), 0 0 34px rgba(0,255,190,0.26), 0 22px 70px rgba(0,0,0,0.46)",
    };
  }

  if (status === "pending") {
    return {
      border: "1px solid rgba(255,210,92,0.58)",
      boxShadow:
        "0 0 0 1px rgba(255,210,92,0.18), 0 0 30px rgba(255,210,92,0.18), 0 22px 70px rgba(0,0,0,0.42)",
    };
  }

  return {};
}

function CheckInStatusBadge({
  status,
}: {
  status: "none" | "pending" | "active" | "expired";
}) {
  if (status !== "active" && status !== "pending") {
    return null;
  }

  const isActive = status === "active";

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 11px",
        borderRadius: 999,
        border: isActive
          ? "1px solid rgba(0,255,190,0.62)"
          : "1px solid rgba(255,210,92,0.56)",
        background: isActive
          ? "linear-gradient(135deg, rgba(0,255,190,0.30), rgba(0,110,95,0.34))"
          : "linear-gradient(135deg, rgba(255,210,92,0.26), rgba(120,80,0,0.28))",
        color: "#fff",
        backdropFilter: "blur(10px)",
        boxShadow: isActive
          ? "0 0 24px rgba(0,255,190,0.28)"
          : "0 0 22px rgba(255,210,92,0.20)",
        fontSize: 11,
        fontWeight: 950,
        letterSpacing: 0.2,
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: isActive ? "#00ffbe" : "#ffd25c",
          boxShadow: isActive
            ? "0 0 16px rgba(0,255,190,0.92)"
            : "0 0 14px rgba(255,210,92,0.82)",
        }}
      />
      {isActive ? "Check-in ativo" : "Check-in sincronizando"}
    </div>
  );
}

function CheckInPresenceText({
  status,
  locationStatus = "not_checked",
}: {
  status: "none" | "pending" | "active" | "expired";
  locationStatus?: CheckInLocationStatus;
}) {
  if (status !== "active" && status !== "pending") {
    return null;
  }

  const isActive = status === "active";
  const isValidated = isActive && locationStatus === "inside_radius";
  const isOutsideRadius = isActive && locationStatus === "outside_radius";

  const label = !isActive
    ? "Presença aguardando sinal"
    : isValidated
      ? "Presença validada"
      : isOutsideRadius
        ? "Check-in fora do raio"
        : "Check-in manual";

  const border = isValidated
    ? "1px solid rgba(0,255,190,0.48)"
    : isOutsideRadius
      ? "1px solid rgba(255,210,92,0.42)"
      : isActive
        ? "1px solid rgba(150,165,255,0.42)"
        : "1px solid rgba(255,210,92,0.32)";

  const background = isValidated
    ? "rgba(0,255,190,0.14)"
    : isOutsideRadius
      ? "rgba(255,210,92,0.12)"
      : isActive
        ? "rgba(125,92,255,0.14)"
        : "rgba(255,210,92,0.10)";

  const shadow = isValidated
    ? "0 0 18px rgba(0,255,190,0.22)"
    : isOutsideRadius
      ? "0 0 16px rgba(255,210,92,0.16)"
      : "none";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        width: "fit-content",
        padding: "7px 10px",
        borderRadius: 999,
        border,
        background,
        boxShadow: shadow,
        color: "#fff",
        fontSize: 12,
        fontWeight: 850,
      }}
    >
      <span style={{ opacity: 0.92 }}>{label}</span>
    </div>
  );
}
function EventHeatScoreBadge({
  heatScore,
}: {
  heatScore?: EventHeatScore | null;
}) {
  const confirmedCount = Number(heatScore?.confirmedCount || 0);
  const validatedCount = Number(heatScore?.validatedCount || 0);

  if (confirmedCount <= 0) {
    return null;
  }

  const confirmedLabel =
    confirmedCount === 1
      ? "1 clubber confirmado"
      : `${confirmedCount} clubbers confirmados`;

  const validatedLabel =
    validatedCount > 0
      ? validatedCount === 1
        ? "1 presença validada"
        : `${validatedCount} presenças validadas`
      : "movimento em formação";

  return (
    <div
      style={{
        display: "grid",
        gap: 3,
        width: "fit-content",
        padding: "8px 10px",
        borderRadius: 14,
        border: "1px solid rgba(0,255,190,0.24)",
        background:
          "linear-gradient(135deg, rgba(0,255,190,0.12), rgba(125,92,255,0.10))",
        boxShadow:
          confirmedCount >= 3
            ? "0 0 22px rgba(0,255,190,0.18)"
            : "0 10px 22px rgba(0,0,0,0.16)",
        color: "#fff",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: -0.1 }}>
        {confirmedLabel}
      </span>
      <span style={{ fontSize: 11, opacity: 0.7 }}>{validatedLabel}</span>
    </div>
  );
}

function EventMiniAvatarStack({
  members,
}: {
  members?: EventMiniMember[] | null;
}) {
  const visibleMembers = (members || []).slice(0, 5);

  if (visibleMembers.length <= 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {visibleMembers.map((member, index) => (
          <Link
            key={`${member.userId}-${index}`}
            href={`/${member.slug}?mode=club`}
            title={member.cityBase ? `${member.label} · ${member.cityBase}` : member.label}
            style={{
              width: 31,
              height: 31,
              borderRadius: 999,
              overflow: "hidden",
              marginLeft: index === 0 ? 0 : -9,
              border: "2px solid rgba(14,14,24,0.96)",
              background:
                "linear-gradient(135deg, rgba(0,255,190,0.22), rgba(125,92,255,0.22))",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 14px rgba(0,255,190,0.16)",
              textDecoration: "none",
            }}
          >
            {member.clubPhotoUrl ? (
              <img
                src={member.clubPhotoUrl}
                alt={member.label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>
                {member.label.slice(0, 1).toUpperCase()}
              </span>
            )}
          </Link>
        ))}
      </div>

      <span style={{ fontSize: 11, opacity: 0.72, fontWeight: 750 }}>
        quem vai
      </span>
    </div>
  );
}

function CatalogRailCard({
  label,
  catalog,
  badge,
  description,
  width = 245,
  accent = "purple",
  removeAction,
}: {
  label: string;
  catalog?: ClubCatalogItem | null;
  badge: string;
  description: string;
  width?: number;
  accent?: "purple" | "cyan" | "neutral";
  removeAction?: {
    cardId: string;
    ownerUserId: string;
    field: "favorite_clubs" | "favorite_events" | "last_events" | "next_events";
    value: string;
  };
}) {
  const imageUrl = getSafeClubCoverImage(label, catalog, accent);
  const href = getCatalogHref(catalog);
  const location = getCatalogLocation(catalog);
  const source = getCatalogSourceLabel(catalog);

  const content = (
    <>
      {imageUrl ? (
        <div
          style={{
            height: 118,
            borderRadius: 17,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.38)), url("${imageUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid rgba(255,255,255,0.10)",
            marginBottom: 13,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            right: -30,
            top: -30,
            width: 100,
            height: 100,
            borderRadius: 999,
            background:
              accent === "cyan"
                ? "rgba(0,220,255,0.16)"
                : accent === "neutral"
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(125,92,255,0.22)",
            filter: "blur(4px)",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 2, display: "grid", gap: 10 }}>
        <span style={microLabelStyle()}>{badge}</span>

        <div>
          <strong
            style={{
              display: "block",
              fontSize: 18,
              lineHeight: 1.18,
              letterSpacing: -0.2,
            }}
          >
            {label}
          </strong>

          {location ? (
            <span
              style={{
                display: "block",
                marginTop: 7,
                fontSize: 12,
                opacity: 0.70,
                lineHeight: 1.35,
              }}
            >
              {location}
            </span>
          ) : null}

          <span
            style={{
              display: "block",
              marginTop: 7,
              fontSize: 13,
              opacity: 0.68,
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        </div>

        {href ? (
          <span
            style={{
              marginTop: 2,
              fontSize: 12,
              fontWeight: 850,
              opacity: 0.82,
            }}
          >
            Abrir fonte • {source}
          </span>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <div className="uc-small-card" style={{ ...catalogCardStyle(width, imageUrl, accent), paddingBottom: removeAction ? 48 : undefined }}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          {content}
        </a>

        {removeAction ? (
          <>
<MoveClubTokenButton
              cardId={removeAction.cardId}
              ownerUserId={removeAction.ownerUserId}
              field={removeAction.field}
              value={removeAction.value}
            />

            <RemoveClubTokenButton
              cardId={removeAction.cardId}
              ownerUserId={removeAction.ownerUserId}
              field={removeAction.field}
              value={removeAction.value}
            />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="uc-small-card" style={{ ...catalogCardStyle(width, imageUrl, accent), paddingBottom: removeAction ? 48 : undefined }}>
      {content}

      {removeAction ? (
        <>
<MoveClubTokenButton
            cardId={removeAction.cardId}
            ownerUserId={removeAction.ownerUserId}
            field={removeAction.field}
            value={removeAction.value}
          />

          <RemoveClubTokenButton
            cardId={removeAction.cardId}
            ownerUserId={removeAction.ownerUserId}
            field={removeAction.field}
            value={removeAction.value}
          />
        </>
      ) : null}
    </div>
  );
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

  const lastEvents = splitList(
    clubProfile?.last_events || clubProfile?.events_attended
  );

  const nextEvents = splitList(
    clubProfile?.next_events || clubProfile?.upcoming_events
  );

  const nextEventDates = splitList(clubProfile?.next_events_dates);
  const nextEventLinks = splitList(clubProfile?.next_events_links);
  const nextEventRows = buildEventRows(nextEvents, nextEventDates, nextEventLinks);

  let activeCheckInsByKey = new Map<string, PublicCheckInInfo>();
  let eventHeatByKey = new Map<string, EventHeatScore>();
  let eventMembersByKey = new Map<string, EventMiniMember[]>();

  const nextEventKeysForHeat = Array.from(
    new Set(
      nextEventRows
        .map((event) => getEventCheckInKey(event.name))
        .filter(Boolean)
    )
  );

  try {
    const { data: activeCheckIns } = await supabase
      .from("club_event_checkins")
      .select("event_name,event_key,status,location_status")
      .eq("card_id", card.card_id)
      .eq("status", "active");

    activeCheckInsByKey = new Map(
      (activeCheckIns || [])
        .map((item: any) => [
          normalizeText(item.event_key) || getEventCheckInKey(item.event_name),
          {
            status: normalizeText(item.status).toLowerCase(),
            locationStatus:
              (normalizeText(item.location_status).toLowerCase() as CheckInLocationStatus) ||
              "not_checked",
          },
        ])
        .filter(([key]) => Boolean(key)) as Array<[string, PublicCheckInInfo]>
    );
  } catch {
    activeCheckInsByKey = new Map<string, PublicCheckInInfo>();
  }

  try {
    if (nextEventKeysForHeat.length > 0) {
      const { data: eventHeatRows } = await supabase
        .from("club_event_checkins")
        .select("event_key,status,location_status")
        .in("event_key", nextEventKeysForHeat)
        .eq("status", "active");

      const nextHeatByKey = new Map<string, EventHeatScore>();

      for (const item of eventHeatRows || []) {
        const key = normalizeText((item as any).event_key);
        const locationStatus = normalizeText(
          (item as any).location_status
        ).toLowerCase();

        if (!key) {
          continue;
        }

        const current =
          nextHeatByKey.get(key) || {
            confirmedCount: 0,
            validatedCount: 0,
            manualCount: 0,
            outsideRadiusCount: 0,
          };

        current.confirmedCount += 1;

        if (locationStatus === "inside_radius") {
          current.validatedCount += 1;
        } else if (locationStatus === "outside_radius") {
          current.outsideRadiusCount += 1;
        } else {
          current.manualCount += 1;
        }

        nextHeatByKey.set(key, current);
      }

      eventHeatByKey = nextHeatByKey;
    }
  } catch {
    eventHeatByKey = new Map<string, EventHeatScore>();
  }

  try {
    if (nextEventKeysForHeat.length > 0) {
      const { data: eventMemberCheckIns } = await supabase
        .from("club_event_checkins")
        .select("event_key,user_id,checked_in_at")
        .in("event_key", nextEventKeysForHeat)
        .eq("status", "active")
        .order("checked_in_at", { ascending: false })
        .limit(80);

      const userIdsForMembers = Array.from(
        new Set(
          (eventMemberCheckIns || [])
            .map((item: any) => normalizeText(item.user_id))
            .filter(Boolean)
        )
      );

      if (userIdsForMembers.length > 0) {
        const [{ data: memberCards }, { data: memberProfiles }] = await Promise.all([
          supabase
            .from("cards")
            .select("user_id,label,slug,status,is_published")
            .in("user_id", userIdsForMembers)
            .eq("status", "active")
            .eq("is_published", true),
          supabase
            .from("club_profiles")
            .select("user_id,club_photo_url,city_base")
            .in("user_id", userIdsForMembers),
        ]);

        const cardByUserId = new Map<string, any>();
        for (const item of memberCards || []) {
          cardByUserId.set(normalizeText((item as any).user_id), item);
        }

        const profileByUserId = new Map<string, any>();
        for (const item of memberProfiles || []) {
          profileByUserId.set(normalizeText((item as any).user_id), item);
        }

        const nextMembersByKey = new Map<string, EventMiniMember[]>();

        for (const checkIn of eventMemberCheckIns || []) {
          const key = normalizeText((checkIn as any).event_key);
          const userId = normalizeText((checkIn as any).user_id);
          const memberCard = cardByUserId.get(userId);
          const memberProfile = profileByUserId.get(userId);

          if (!key || !userId || !memberCard?.slug) {
            continue;
          }

          const currentMembers = nextMembersByKey.get(key) || [];

          if (currentMembers.some((member) => member.userId === userId)) {
            continue;
          }

          if (currentMembers.length >= 5) {
            continue;
          }

          currentMembers.push({
            userId,
            label: normalizeText(memberCard.label) || "Clubber",
            slug: normalizeText(memberCard.slug),
            clubPhotoUrl: normalizeText(memberProfile?.club_photo_url),
            cityBase: normalizeText(memberProfile?.city_base),
          });

          nextMembersByKey.set(key, currentMembers);
        }

        eventMembersByKey = nextMembersByKey;
      }
    }
  } catch {
    eventMembersByKey = new Map<string, EventMiniMember[]>();
  }

  const catalogLabels = Array.from(
    new Set(
      [
        ...clubs,
        ...festivals,
        ...lastEvents,
        ...nextEvents,
        ...nextEventRows.map((event) => event.name),
      ]
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );

  let catalogItems: ClubCatalogItem[] = [];

  try {
    const tokens = getCatalogTokens(catalogLabels);

    if (tokens.length > 0) {
      const orParts = tokens.flatMap((token) => [
        `name.ilike.%${token}%`,
        `normalized_name.ilike.%${token}%`,
      ]);

      const { data } = await supabase
        .from("club_event_catalog")
        .select(
          "id,name,type,city,state,country,image_url,official_url,instagram_url,source_url,source_name,source_provider,is_verified,usage_count,normalized_name"
        )
        .or(orParts.join(","))
        .limit(80);

      catalogItems = (data || []) as ClubCatalogItem[];
    }
  } catch {
    catalogItems = [];
  }

  const clubsWithCatalog = clubs.map((name) => ({
    name,
    catalog: findBestCatalogItem(name, catalogItems, ["club", "venue"]),
  }));

  const festivalsWithCatalog = festivals.map((name) => ({
    name,
    catalog: findBestCatalogItem(name, catalogItems, [
      "festival",
      "party",
      "event",
      "venue",
      "club",
    ]),
  }));

  const lastEventsWithCatalog = lastEvents.map((name) => ({
    name,
    catalog: findBestCatalogItem(name, catalogItems, [
      "festival",
      "party",
      "event",
      "venue",
      "club",
    ]),
  }));

  const nextEventRowsWithCatalog = nextEventRows.map((event) => {
    const catalog = findBestCatalogItem(event.name, catalogItems, [
      "festival",
      "party",
      "event",
      "venue",
      "club",
    ]);

    return {
      ...event,
      catalog,
      checkin_status: getStoredCheckInStatus(activeCheckInsByKey, event.name),
      checkin_location_status: getStoredCheckInLocationStatus(activeCheckInsByKey, event.name),
      event_heat_score: getEventHeatScore(eventHeatByKey, event.name),
      event_members: eventMembersByKey.get(getEventCheckInKey(event.name)) || [],
    };
  });

  const nextEventsWithCatalog = nextEvents.map((name) => {
    const catalog = findBestCatalogItem(name, catalogItems, [
      "festival",
      "party",
      "event",
      "venue",
      "club",
    ]);

    return {
      name,
      catalog,
      checkin_status: getStoredCheckInStatus(activeCheckInsByKey, name),
      checkin_location_status: getStoredCheckInLocationStatus(activeCheckInsByKey, name),
      event_heat_score: getEventHeatScore(eventHeatByKey, name),
      event_members: eventMembersByKey.get(getEventCheckInKey(name)) || [],
    };
  });

  const rideStatus = normalizeText(clubProfile?.ride_status);
  const rideEventName = normalizeText(clubProfile?.ride_event_name);
  const rideEventDate = normalizeText(clubProfile?.ride_event_date);
  const rideEventUrl = normalizeUrl(clubProfile?.ride_event_url);
  const rideOrigin = normalizeText(clubProfile?.ride_origin);
  const rideDestination = normalizeText(clubProfile?.ride_destination);
  const rideSeats = normalizeText(clubProfile?.ride_seats);
  const rideNotes = normalizeText(clubProfile?.ride_notes);

  const meetStatus = normalizeText(clubProfile?.meet_status);
  const meetEventName = normalizeText(clubProfile?.meet_event_name);
  const meetEventDate = normalizeText(clubProfile?.meet_event_date);
  const meetEventUrl = normalizeUrl(clubProfile?.meet_event_url);
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

  const primaryEventName =
    rideEventName ||
    meetEventName ||
    nextEventRowsWithCatalog[0]?.name ||
    nextEvents[0] ||
    "";

  const primaryEventDate =
    rideEventDate || meetEventDate || nextEventRowsWithCatalog[0]?.date || "";

  const primaryEventUrl =
    rideEventUrl || meetEventUrl || nextEventRowsWithCatalog[0]?.link || "";

  const primaryEventCatalog = findBestCatalogItem(
    primaryEventName,
    catalogItems,
    ["festival", "party", "event", "venue", "club"]
  );

  const primaryEventImage = primaryEventName
    ? getSafeClubCoverImage(primaryEventName, primaryEventCatalog, "purple")
    : "";

  const primaryContactHref = links[0]?.id ? `/r/${links[0].id}` : "#canais-club";
  const hasEventConnections = Boolean(hasRide || hasMeet || primaryEventName);

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
    position: "relative",
    scrollSnapAlign: "start",
    background: "rgba(255,255,255,0.055)",
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.11)",
    textDecoration: "none",
    color: "#fff",
  };

  return (
    <main style={container}>
      <style>{`
        .uc-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .uc-scroll::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 760px) {
          .uc-page-title {
            font-size: 28px !important;
          }

          .uc-hero {
            grid-template-columns: 1fr !important;
            padding: 16px !important;
            border-radius: 26px !important;
          }

          .uc-photo {
            height: 230px !important;
          }

          .uc-section {
            padding: 16px !important;
            border-radius: 24px !important;
          }

          .uc-wide-card {
            flex-basis: 86% !important;
          }

          .uc-medium-card {
            flex-basis: 78% !important;
          }

          .uc-small-card {
            flex-basis: 68% !important;
          }

          .uc-player {
            height: 260px !important;
          }
        }
      `}</style>

      <div style={page}>
        <OwnerClubToolbar
          cardId={card.card_id}
          ownerUserId={card.user_id}
          slug={card.slug}
        />


        <header style={topBar}>
          <div>
            <div style={{ ...pillStyle(), marginBottom: 10 }}>Modo Club</div>

            <h1
              className="uc-page-title"
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

        <section className="uc-hero" style={hero}>
          {clubProfile?.club_photo_url ? <div style={heroBackgroundPhoto} /> : null}
          <div style={heroOverlay} />

          <div className="uc-photo" style={photoWrap}>
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
                  href={normalizeUrl(streamingUrl)}
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

        {streamingUrl ? (
          <section className="uc-section" style={sectionBoxStyle()}>
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
                href={normalizeUrl(streamingUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={primaryButtonStyle()}
              >
                Abrir fora
              </a>
            </div>

            {finalEmbed ? (
              <iframe
                className="uc-player"
                src={finalEmbed}
                width="100%"
                height={youtubeEmbed || soundcloudEmbed ? 420 : 180}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 22,
                  background: "#000",
                }}
              />
            ) : (
              <div style={innerCardStyle()}>
                <strong>Player não disponível para este link.</strong>
                <p style={{ margin: "8px 0 0 0", opacity: 0.78, lineHeight: 1.55 }}>
                  Este tipo de URL não permite incorporação direta. Use o botão para abrir na plataforma oficial.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {spotifyArtists.length > 0 ? (
          <section className="uc-section" style={sectionBoxStyle()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={sectionTitleStyle()}>Artistas de referência</h2>
                <p style={{ ...sectionDescriptionStyle(), marginBottom: 0 }}>
                  Referências musicais que ajudam a entender a identidade deste perfil na cena.
                </p>
              </div>

              <AddClubArtistButton
                cardId={card.card_id}
                ownerUserId={card.user_id}
                compact
              />
            </div>

            <div className="uc-scroll" style={artistGrid}>
              {spotifyArtists.map((artist) => (
                <div key={artist.spotify_id} style={artistCard}>
                  <a
                    href={artist.spotify_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      color: "#fff",
                      textDecoration: "none",
                    }}
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

                      <div style={{ padding: "12px 44px 56px 12px", minHeight: 112 }}>
                        <strong>{artist.name}</strong>
                        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.72 }}>
                          Spotify
                        </div>
                      </div>

                  </a>

                  <MoveClubArtistButton
                    cardId={card.card_id}
                    ownerUserId={card.user_id}
                    spotifyId={artist.spotify_id}
                    artistName={artist.name}
                  />

                  <RemoveClubArtistButton
                    cardId={card.card_id}
                    ownerUserId={card.user_id}
                    spotifyId={artist.spotify_id}
                    artistName={artist.name}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <ClubOwnerEmptyBlock
            cardId={card.card_id}
            ownerUserId={card.user_id}
            title="Artistas de referência"
            description="Adicione artistas para mostrar suas referências musicais principais."
            kind="artist"
            standalone
          />
        )}

        {(clubs.length > 0 ||
          festivals.length > 0 ||
          lastEvents.length > 0 ||
          nextEvents.length > 0) ? (
          <section className="uc-section" style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Cena, clubes e eventos</h2>
            <p style={sectionDescriptionStyle()}>
              Uma leitura rápida dos lugares, festas e experiências que fazem parte da trajetória deste perfil.
            </p>

            {clubsWithCatalog.length > 0 ? (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline",
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                    Clubes favoritos
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, opacity: 0.58 }}>Arraste para ver mais</span>
                    <AddClubTokenButton
                      cardId={card.card_id}
                      ownerUserId={card.user_id}
                      field="favorite_clubs"
                      type="club"
                      label="Adicionar club"
                      title="Adicionar club favorito"
                      placeholder="Ex: Surreal Park, Warung, Green Valley"
                      cityBase={cityBase}
                      compact
                    />
                  </div>
                </div>

                <div className="uc-scroll" style={horizontalRailStyle()}>
                  {clubsWithCatalog.map((item, index) => (
                    <CatalogRailCard
                      key={`${item.name}-${index}`}
                      label={item.name}
                      catalog={item.catalog}
                      badge="Clube favorito"
                      description="Presença na cena, pista e experiências ao vivo."
                      width={245}
                      accent="purple"
                      removeAction={{
                        cardId: card.card_id,
                        ownerUserId: card.user_id,
                        field: "favorite_clubs",
                        value: item.name,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ClubOwnerEmptyBlock
                cardId={card.card_id}
                ownerUserId={card.user_id}
                title="Clubes favoritos"
                description="Adicione os clubs que representam sua presença na cena."
                kind="token"
                field="favorite_clubs"
                type="club"
                label="Adicionar club"
                modalTitle="Adicionar club favorito"
                placeholder="Ex: Surreal Park, Warung, Green Valley"
                cityBase={cityBase}
              />
            )}

            {festivalsWithCatalog.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline",
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                    Festivais e festas
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, opacity: 0.58 }}>Arraste para ver mais</span>
                    <AddClubTokenButton
                      cardId={card.card_id}
                      ownerUserId={card.user_id}
                      field="favorite_events"
                      type="festival"
                      label="Adicionar festival"
                      title="Adicionar festival ou festa"
                      placeholder="Ex: Só Track Boa, X-Future, Warung Day Festival"
                      cityBase={cityBase}
                      compact
                    />
                  </div>
                </div>

                <div className="uc-scroll" style={horizontalRailStyle()}>
                  {festivalsWithCatalog.map((item, index) => (
                    <CatalogRailCard
                      key={`${item.name}-${index}`}
                      label={item.name}
                      catalog={item.catalog}
                      badge="Festival e festa"
                      description="Referência de evento dentro da identidade Club."
                      width={245}
                      accent="cyan"
                      removeAction={{
                        cardId: card.card_id,
                        ownerUserId: card.user_id,
                        field: "favorite_events",
                        value: item.name,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ClubOwnerEmptyBlock
                cardId={card.card_id}
                ownerUserId={card.user_id}
                title="Festivais e festas"
                description="Adicione festivais, festas e experiências que fazem parte da sua identidade."
                kind="token"
                field="favorite_events"
                type="festival"
                label="Adicionar festival"
                modalTitle="Adicionar festival ou festa"
                placeholder="Ex: Só Track Boa, X-Future, Warung Day Festival"
                cityBase={cityBase}
              />
            )}

            {lastEventsWithCatalog.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline",
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                    Últimos eventos
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, opacity: 0.58 }}>Histórico recente</span>
                    <AddClubTokenButton
                      cardId={card.card_id}
                      ownerUserId={card.user_id}
                      field="last_events"
                      type="event"
                      label="Adicionar último"
                      title="Adicionar último evento frequentado"
                      placeholder="Ex: Time Warp, Ame Laroc Festival"
                      cityBase={cityBase}
                      compact
                    />
                  </div>
                </div>

                <div className="uc-scroll" style={horizontalRailStyle()}>
                  {lastEventsWithCatalog.map((item, index) => (
                    <CatalogRailCard
                      key={`${item.name}-${index}`}
                      label={item.name}
                      catalog={item.catalog}
                      badge="Já viveu"
                      description="Memória de pista no perfil."
                      width={235}
                      accent="neutral"
                      removeAction={{
                        cardId: card.card_id,
                        ownerUserId: card.user_id,
                        field: "last_events",
                        value: item.name,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ClubOwnerEmptyBlock
                cardId={card.card_id}
                ownerUserId={card.user_id}
                title="Últimos eventos"
                description="Mostre eventos recentes que você viveu."
                kind="token"
                field="last_events"
                type="event"
                label="Adicionar último"
                modalTitle="Adicionar último evento frequentado"
                placeholder="Ex: Time Warp, Ame Laroc Festival"
                cityBase={cityBase}
              />
            )}

            {nextEventRowsWithCatalog.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline",
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                    Próximos eventos
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, opacity: 0.58 }}>Agenda Club</span>
                    <AddClubTokenButton
                      cardId={card.card_id}
                      ownerUserId={card.user_id}
                      field="next_events"
                      type="event"
                      label="Adicionar próximo"
                      title="Adicionar próximo evento"
                      placeholder="Ex: Time Warp, Tomorrowland Brasil"
                      cityBase={cityBase}
                      compact
                      allowNextEventDetails
                    />
                  </div>
                </div>

                <div className="uc-scroll" style={horizontalRailStyle()}>
                  {nextEventRowsWithCatalog.map((event, index) => {
                    const catalogImage = getSafeClubCoverImage(
                      event.name,
                      event.catalog,
                      "purple"
                    );
                    const catalogHref = getCatalogHref(event.catalog);
                    const finalEventLink = event.link || catalogHref;
                    const checkInStatus = getEventCheckInStatus(event);
                    const checkInLocationStatus =
                      (normalizeText(event?.checkin_location_status).toLowerCase() as CheckInLocationStatus) ||
                      "not_checked";

                    return (
                      <div
                        key={`${event.name}-${index}`}
                        className="uc-medium-card"
                        style={{
                          ...getCheckInCardGlowStyle(checkInStatus),
                          ...eventCardStyle(285, catalogImage),
                          ...getCheckInCardGlowStyle(checkInStatus),
                          paddingBottom: 52,
                        }}
                      >
                        <CheckInStatusBadge status={checkInStatus} />
                        <MoveClubTokenButton
                          cardId={card.card_id}
                          ownerUserId={card.user_id}
                          field="next_events"
                          value={event.name}
                        />

                        <RemoveClubTokenButton
                          cardId={card.card_id}
                          ownerUserId={card.user_id}
                          field="next_events"
                          value={event.name}
                        />
                        {!catalogImage ? (
                          <div
                            style={{
                              position: "absolute",
                              right: -42,
                              top: -42,
                              width: 135,
                              height: 135,
                              borderRadius: 999,
                              background: "rgba(125,92,255,0.24)",
                              filter: "blur(6px)",
                            }}
                          />
                        ) : null}

                        <div
                          style={{
                            position: "relative",
                            zIndex: 2,
                            minHeight: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: 16,
                          }}
                        >
                          <div style={{ display: "grid", gap: 10 }}>
                            <span style={microLabelStyle()}>Próximo rolê</span>

                            <strong
                              style={{
                                display: "block",
                                fontSize: 20,
                                lineHeight: 1.16,
                                letterSpacing: -0.35,
                              }}
                            >
                              {event.name}
                            </strong>

                            {event.date ? (
                              <span style={{ fontSize: 14, opacity: 0.78 }}>
                                {event.date}
                              </span>
                            ) : null}

                            {getCatalogLocation(event.catalog) ? (
                              <span style={{ fontSize: 13, opacity: 0.72 }}>
                                {getCatalogLocation(event.catalog)}
                              </span>
                            ) : null}

                            <CheckInPresenceText
                              status={checkInStatus}
                              locationStatus={checkInLocationStatus}
                            />

                            <EventHeatScoreBadge heatScore={event.event_heat_score} />

                            <EventMiniAvatarStack members={event.event_members} />
                          </div>

                          <div style={{ display: "grid", gap: 9 }}>
                            <CheckInEventButton
                              cardId={card.card_id}
                              ownerUserId={card.user_id}
                              eventName={event.name}
                              eventDate={event.date}
                              eventLink={finalEventLink}
                              catalogId={event.catalog?.id || null}
                              initialStatus={checkInStatus}
                              compact
                            />

                            {finalEventLink ? (
                              <a
                                href={finalEventLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={primaryButtonStyle()}
                              >
                                Abrir evento oficial
                              </a>
                            ) : (
                              <a href="#canais-club" style={secondaryButtonStyle()}>
                                Combinar pelos canais
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : nextEventsWithCatalog.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 900 }}>
                  Próximos eventos
                </h3>

                <div className="uc-scroll" style={horizontalRailStyle()}>
                  {nextEventsWithCatalog.map((item, index) => {
                    const catalogImage = getSafeClubCoverImage(
                      item.name,
                      item.catalog,
                      "purple"
                    );
                    const catalogHref = getCatalogHref(item.catalog);
                    const checkInStatus = getEventCheckInStatus(item);

                    return (
                      <div
                        key={`${item.name}-${index}`}
                        className="uc-medium-card"
                        style={{
                          ...getCheckInCardGlowStyle(checkInStatus), ...eventCardStyle(285, catalogImage), paddingBottom: 52 }}
                      >
                        <CheckInStatusBadge status={checkInStatus} />

                        <MoveClubTokenButton
                          cardId={card.card_id}
                          ownerUserId={card.user_id}
                          field="next_events"
                          value={item.name}
                        />

                        <RemoveClubTokenButton
                          cardId={card.card_id}
                          ownerUserId={card.user_id}
                          field="next_events"
                          value={item.name}
                        />
                        <span style={microLabelStyle()}>Próximo rolê</span>

                        <strong
                          style={{
                            display: "block",
                            marginTop: 12,
                            fontSize: 20,
                            lineHeight: 1.16,
                            letterSpacing: -0.35,
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          {item.name}
                        </strong>

                        {getCatalogLocation(item.catalog) ? (
                          <span
                            style={{
                              display: "block",
                              marginTop: 8,
                              fontSize: 13,
                              opacity: 0.72,
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            {getCatalogLocation(item.catalog)}
                          </span>
                        ) : null}

                        {catalogHref ? (
                          <a
                            href={catalogHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              ...primaryButtonStyle(),
                              marginTop: 18,
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            Abrir evento oficial
                          </a>
                        ) : (
                          <a
                            href="#canais-club"
                            style={{
                              ...secondaryButtonStyle(),
                              marginTop: 18,
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            Combinar pelos canais
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ClubOwnerEmptyBlock
                cardId={card.card_id}
                ownerUserId={card.user_id}
                title="Próximos eventos"
                description="Adicione seu próximo rolê com data e link oficial, se tiver."
                kind="token"
                field="next_events"
                type="event"
                label="Adicionar próximo"
                modalTitle="Adicionar próximo evento"
                placeholder="Ex: Time Warp, Tomorrowland Brasil"
                cityBase={cityBase}
                allowNextEventDetails
              />
            )}
          </section>
        ) : (
          <ClubOwnerEmptySceneSection
            cardId={card.card_id}
            ownerUserId={card.user_id}
            cityBase={cityBase}
          />
        )}

        {hasEventConnections ? (
          <section className="uc-section" style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Conexões para o próximo evento</h2>
            <p style={sectionDescriptionStyle()}>
              Veja o próximo rolê, combine carona, marque ponto de encontro e use os canais Club para facilitar a conexão antes da pista começar.
            </p>

            <div className="uc-scroll" style={horizontalRailStyle()}>
              {primaryEventName ? (
                <div className="uc-wide-card" style={eventCardStyle(330, primaryEventImage)}>
                  {!primaryEventImage ? (
                    <div
                      style={{
                        position: "absolute",
                        right: -50,
                        top: -50,
                        width: 150,
                        height: 150,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        filter: "blur(7px)",
                      }}
                    />
                  ) : null}

                  <div
                    style={{
                      position: "relative",
                      zIndex: 2,
                      minHeight: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ display: "grid", gap: 10 }}>
                      <span style={microLabelStyle()}>Seu próximo rolê</span>

                      <strong
                        style={{
                          display: "block",
                          fontSize: 22,
                          lineHeight: 1.12,
                          letterSpacing: -0.4,
                        }}
                      >
                        {primaryEventName}
                      </strong>

                      {primaryEventDate ? (
                        <span style={{ opacity: 0.75, fontSize: 14 }}>
                          {primaryEventDate}
                        </span>
                      ) : null}

                      {getCatalogLocation(primaryEventCatalog) ? (
                        <span style={{ opacity: 0.74, fontSize: 13 }}>
                          {getCatalogLocation(primaryEventCatalog)}
                        </span>
                      ) : null}

                      <p style={{ margin: 0, opacity: 0.72, lineHeight: 1.52 }}>
                        Use este perfil para combinar chegada, carona, ponto de encontro e contato rápido.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {primaryEventUrl || getCatalogHref(primaryEventCatalog) ? (
                        <a
                          href={primaryEventUrl || getCatalogHref(primaryEventCatalog)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={primaryButtonStyle()}
                        >
                          Abrir evento oficial
                        </a>
                      ) : null}

                      <a
                        href={primaryContactHref}
                        target={links[0]?.id ? "_blank" : undefined}
                        rel={links[0]?.id ? "noopener noreferrer" : undefined}
                        style={secondaryButtonStyle()}
                      >
                        Combinar contato
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              {hasRide ? (
                <div className="uc-wide-card" style={eventCardStyle(330)}>
                  <div
                    style={{
                      position: "absolute",
                      right: -48,
                      bottom: -48,
                      width: 150,
                      height: 150,
                      borderRadius: 999,
                      background: "rgba(0,220,255,0.16)",
                      filter: "blur(7px)",
                    }}
                  />

                  <div style={{ position: "relative", zIndex: 2 }}>
                    <span style={microLabelStyle()}>Carona colaborativa</span>

                    <h3
                      style={{
                        margin: "13px 0 10px 0",
                        fontSize: 21,
                        lineHeight: 1.15,
                        letterSpacing: -0.35,
                      }}
                    >
                      Combine a ida com mais segurança
                    </h3>

                    <div style={{ display: "grid", lineHeight: 1.45 }}>
                      {rideStatus ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Status</span>
                          <strong>{rideStatus}</strong>
                        </div>
                      ) : null}

                      {rideEventName ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Evento</span>
                          <strong>{rideEventName}</strong>
                        </div>
                      ) : null}

                      {rideOrigin ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Origem</span>
                          <strong>{rideOrigin}</strong>
                        </div>
                      ) : null}

                      {rideDestination ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Destino</span>
                          <strong>{rideDestination}</strong>
                        </div>
                      ) : null}

                      {rideSeats ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Vagas</span>
                          <strong>{rideSeats}</strong>
                        </div>
                      ) : null}

                      {rideNotes ? (
                        <p style={{ margin: "12px 0 0 0", opacity: 0.78, lineHeight: 1.55 }}>
                          {rideNotes}
                        </p>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                      <a
                        href={primaryContactHref}
                        target={links[0]?.id ? "_blank" : undefined}
                        rel={links[0]?.id ? "noopener noreferrer" : undefined}
                        style={primaryButtonStyle()}
                      >
                        Pedir carona
                      </a>

                      {rideEventUrl ? (
                        <a
                          href={rideEventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={secondaryButtonStyle()}
                        >
                          Ver evento
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {hasMeet ? (
                <div className="uc-wide-card" style={eventCardStyle(330)}>
                  <div
                    style={{
                      position: "absolute",
                      right: -48,
                      bottom: -48,
                      width: 150,
                      height: 150,
                      borderRadius: 999,
                      background: "rgba(125,92,255,0.22)",
                      filter: "blur(7px)",
                    }}
                  />

                  <div style={{ position: "relative", zIndex: 2 }}>
                    <span style={microLabelStyle()}>Encontro na pista</span>

                    <h3
                      style={{
                        margin: "13px 0 10px 0",
                        fontSize: 21,
                        lineHeight: 1.15,
                        letterSpacing: -0.35,
                      }}
                    >
                      Ponto combinado para se encontrar
                    </h3>

                    <div style={{ display: "grid", lineHeight: 1.45 }}>
                      {meetStatus ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Status</span>
                          <strong>{meetStatus}</strong>
                        </div>
                      ) : null}

                      {meetEventName ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Evento</span>
                          <strong>{meetEventName}</strong>
                        </div>
                      ) : null}

                      {meetMeetingPoint ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Ponto</span>
                          <strong>{meetMeetingPoint}</strong>
                        </div>
                      ) : null}

                      {meetTime ? (
                        <div style={detailRowStyle()}>
                          <span style={{ fontSize: 12, opacity: 0.58 }}>Horário</span>
                          <strong>{meetTime}</strong>
                        </div>
                      ) : null}

                      {meetNotes ? (
                        <p style={{ margin: "12px 0 0 0", opacity: 0.78, lineHeight: 1.55 }}>
                          {meetNotes}
                        </p>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                      <a
                        href={primaryContactHref}
                        target={links[0]?.id ? "_blank" : undefined}
                        rel={links[0]?.id ? "noopener noreferrer" : undefined}
                        style={primaryButtonStyle()}
                      >
                        Quero participar
                      </a>

                      {meetEventUrl ? (
                        <a
                          href={meetEventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={secondaryButtonStyle()}
                        >
                          Ver evento
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="uc-wide-card" style={eventCardStyle(330)}>
                <div
                  style={{
                    position: "absolute",
                    right: -48,
                    top: -48,
                    width: 150,
                    height: 150,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    filter: "blur(7px)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    minHeight: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    <span style={microLabelStyle()}>Modo sem sinal</span>

                    <strong
                      style={{
                        display: "block",
                        fontSize: 21,
                        lineHeight: 1.15,
                        letterSpacing: -0.35,
                      }}
                    >
                      Tenha contato e ponto de encontro à mão
                    </strong>

                    <p style={{ margin: 0, opacity: 0.74, lineHeight: 1.55 }}>
                      Ideal para festas e festivais com internet instável. Use os canais do perfil para salvar o contato antes do evento.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href="#canais-club" style={primaryButtonStyle()}>
                      Ver canais Club
                    </a>

                    <a
                      href={`/${card.slug}?mode=club`}
                      style={secondaryButtonStyle()}
                    >
                      Reabrir perfil
                    </a>
                  </div>
                </div>
              </div>

              <div className="uc-wide-card" style={eventCardStyle(330)}>
                <div
                  style={{
                    position: "absolute",
                    right: -48,
                    bottom: -48,
                    width: 150,
                    height: 150,
                    borderRadius: 999,
                    background: "rgba(0,220,255,0.13)",
                    filter: "blur(7px)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    minHeight: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    <span style={microLabelStyle()}>Grupo do evento</span>

                    <strong
                      style={{
                        display: "block",
                        fontSize: 21,
                        lineHeight: 1.15,
                        letterSpacing: -0.35,
                      }}
                    >
                      Conexões por cidade, evento e gosto musical
                    </strong>

                    <p style={{ margin: 0, opacity: 0.74, lineHeight: 1.55 }}>
                      Combine com pessoas da cena, encontre quem vai para o mesmo evento e facilite novas amizades antes do rolê.
                    </p>
                  </div>

                  <a
                    href={primaryContactHref}
                    target={links[0]?.id ? "_blank" : undefined}
                    rel={links[0]?.id ? "noopener noreferrer" : undefined}
                    style={primaryButtonStyle()}
                  >
                    Entrar em contato
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {links.length > 0 ? (
          <section id="canais-club" className="uc-section" style={sectionBoxStyle()}>
            <h2 style={sectionTitleStyle()}>Canais Club</h2>
            <p style={sectionDescriptionStyle()}>
              Canais principais para continuar a conexão fora do perfil.
            </p>

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























