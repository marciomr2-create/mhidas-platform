// src/app/event/[event_slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { ReactNode } from "react";
import Link from "next/link";
import { createPublicClient } from "@/utils/supabase/public";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import EventParticipantsFilter from "./EventParticipantsFilter";
import RideMeetCards from "./RideMeetCards";
import StructuredRideMeetHub from "./StructuredRideMeetHub";
import TicketIntentButton from "./TicketIntentButton";
import TicketPurchaseAction from "./TicketPurchaseAction";
import TicketNetworkAvailability from "./TicketNetworkAvailability";
import {
  readCanonicalPublicEventBySlug,
  type CanonicalPublicEventReadResult,
} from "@/app/api/official-events/canonical/_shared/canonicalPublicEventReadFoundation";
import {
  readEventSocialRadar,
  type EventSocialRadarMember,
  type EventSocialRadarReadResult,
} from "@/app/api/event-ticket-intents/_shared/eventSocialRadarRead";

type PageProps = {
  params: Promise<{ event_slug: string }>;
  searchParams?: Promise<{
    city?: string;
    state?: string;
    region?: string;
    return_to?: string;
  }>;
};

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
  slug: string;
  status: string;
  is_published: boolean;
};

type ClubProfileRow = {
  user_id: string;
  city_base: string | null;
  club_tagline: string | null;
  club_photo_url: string | null;
  favorite_genres: string | null;
  favorite_clubs: string | null;
  favorite_events: string | null;
  next_events: string | null;
  next_events_links: string | null;
  ride_status: string | null;
  ride_event_name: string | null;
  ride_event_url: string | null;
  ride_origin: string | null;
  ride_destination: string | null;
  ride_seats: string | null;
  ride_notes: string | null;
  meet_status: string | null;
  meet_event_name: string | null;
  meet_event_date: string | null;
  meet_event_url: string | null;
  meet_meeting_point: string | null;
  meet_time: string | null;
  meet_notes: string | null;
  event_social_mode: string | null;
  open_to_meet: boolean | null;
  open_to_networking: boolean | null;
  event_ticket_type: string | null;
  event_requires_food_kg: boolean | null;
  event_requires_student_document: boolean | null;
  event_preparation_notes: string | null;
};

type EventGroupRow = {
  group_id: string;
  event_name: string | null;
  event_slug: string | null;
  event_url: string | null;
  official_url: string | null;
  official_status: string | null;
  official_confidence: number | null;
  official_source_type: string | null;
  event_date: string | null;
  event_image_url: string | null;
  city_base: string | null;
  title: string | null;
  description: string | null;
  weather_summary: string | null;
  weather_temperature: string | null;
  weather_rain_alert: string | null;
  preparation_note: string | null;
  partner_ticket_url: string | null;
  partner_ticket_status: string | null;
  partner_ticket_partner_name: string | null;
  partner_ticket_button_label: string | null;
  partner_ticket_expires_at: string | null;
};

type PartnerTicketRow = Pick<
  EventGroupRow,
  | "partner_ticket_url"
  | "partner_ticket_status"
  | "partner_ticket_partner_name"
  | "partner_ticket_button_label"
  | "partner_ticket_expires_at"
>;

type EventMember = {
  user_id: string;
  label: string;
  slug: string;
  city_base: string;
  club_tagline: string;
  club_photo_url: string;
  favorite_genres: string[];
  favorite_clubs: string[];
  favorite_events: string[];
  next_events: string[];
  next_events_links: string;
  ride_status: string;
  ride_event_name: string;
  ride_event_url: string;
  ride_origin: string;
  ride_destination: string;
  ride_seats: string;
  ride_notes: string;
  meet_status: string;
  meet_event_name: string;
  meet_event_date: string;
  meet_event_url: string;
  meet_meeting_point: string;
  meet_time: string;
  meet_notes: string;
  event_social_mode: string;
  open_to_meet: boolean;
  open_to_networking: boolean;
  event_ticket_type: string;
  event_requires_food_kg: boolean;
  event_requires_student_document: boolean;
  event_preparation_notes: string;
  social_participation_mode?: string;
  social_wants_group?: boolean;
  social_accepts_new_people?: boolean;
  social_meet_on_site?: boolean;
  social_first_time?: boolean;
  social_same_city?: boolean;
  social_is_accepted_connection?: boolean;
};

function createSocialEventMember(
  member: EventSocialRadarMember
): EventMember {
  return {
    user_id: member.user_id,
    label: member.label,
    slug: member.slug,
    city_base: member.city_base,
    club_tagline: member.club_tagline,
    club_photo_url: member.club_photo_url,
    favorite_genres: member.favorite_genres,
    favorite_clubs: [],
    favorite_events: [],
    next_events: [],
    next_events_links: "",
    ride_status: "",
    ride_event_name: "",
    ride_event_url: "",
    ride_origin: "",
    ride_destination: "",
    ride_seats: "",
    ride_notes: "",
    meet_status: "",
    meet_event_name: "",
    meet_event_date: "",
    meet_event_url: "",
    meet_meeting_point: "",
    meet_time: "",
    meet_notes: "",
    event_social_mode: member.participation_mode,
    open_to_meet: member.meet_on_site,
    open_to_networking:
      member.wants_group || member.accepts_new_people,
    event_ticket_type: "",
    event_requires_food_kg: false,
    event_requires_student_document: false,
    event_preparation_notes: "",
    social_participation_mode: member.participation_mode,
    social_wants_group: member.wants_group,
    social_accepts_new_people: member.accepts_new_people,
    social_meet_on_site: member.meet_on_site,
    social_first_time: member.first_time,
    social_same_city: member.same_city,
    social_is_accepted_connection: member.is_accepted_connection,
  };
}

function mergeEventMembers(
  legacyMembers: EventMember[],
  socialMembers: EventSocialRadarMember[]
): EventMember[] {
  const memberByUserId = new Map<string, EventMember>();

  for (const legacyMember of legacyMembers) {
    if (!memberByUserId.has(legacyMember.user_id)) {
      memberByUserId.set(legacyMember.user_id, legacyMember);
    }
  }

  for (const socialMember of socialMembers) {
    const normalizedSocialMember = createSocialEventMember(socialMember);
    const existingMember = memberByUserId.get(socialMember.user_id);

    if (!existingMember) {
      memberByUserId.set(socialMember.user_id, normalizedSocialMember);
      continue;
    }

    memberByUserId.set(socialMember.user_id, {
      ...existingMember,
      label: normalizedSocialMember.label || existingMember.label,
      slug: normalizedSocialMember.slug || existingMember.slug,
      city_base:
        normalizedSocialMember.city_base || existingMember.city_base,
      club_tagline:
        normalizedSocialMember.club_tagline ||
        existingMember.club_tagline,
      club_photo_url:
        normalizedSocialMember.club_photo_url ||
        existingMember.club_photo_url,
      favorite_genres:
        normalizedSocialMember.favorite_genres.length > 0
          ? normalizedSocialMember.favorite_genres
          : existingMember.favorite_genres,
      event_social_mode: normalizedSocialMember.event_social_mode,
      open_to_meet:
        existingMember.open_to_meet ||
        normalizedSocialMember.open_to_meet,
      open_to_networking:
        existingMember.open_to_networking ||
        normalizedSocialMember.open_to_networking,
      social_participation_mode:
        normalizedSocialMember.social_participation_mode,
      social_wants_group:
        normalizedSocialMember.social_wants_group,
      social_accepts_new_people:
        normalizedSocialMember.social_accepts_new_people,
      social_meet_on_site:
        normalizedSocialMember.social_meet_on_site,
      social_first_time:
        normalizedSocialMember.social_first_time,
      social_same_city:
        normalizedSocialMember.social_same_city,
      social_is_accepted_connection:
        normalizedSocialMember.social_is_accepted_connection,
    });
  }

  return Array.from(memberByUserId.values());
}

function createEmptySocialRadar(
  eventGroupId = ""
): EventSocialRadarReadResult {
  return {
    ok: false,
    event_group_id: eventGroupId,
    members: [],
    counts: {
      active_participants: 0,
      alone: 0,
      with_friends: 0,
      undecided: 0,
      wants_group: 0,
      accepts_new_people: 0,
      meet_on_site: 0,
      first_time: 0,
      same_city: 0,
      accepted_connections: 0,
    },
    group_preferences: {
      mixed_group: 0,
      women_only: 0,
      men_only: 0,
      lgbtqia_plus: 0,
    },
    truncated: false,
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toEventSlug(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStateFromCityBase(value: string): string {
  const text = normalizeText(value);
  const parts = text.split("-").map((item) => normalizeText(item));
  return (parts[1] || "").toUpperCase();
}

function getRegionFromState(state: string): string {
  const uf = normalizeText(state).toUpperCase();

  if (["PR", "SC", "RS"].includes(uf)) return "Sul";
  if (["SP", "RJ", "MG", "ES"].includes(uf)) return "Sudeste";
  if (["DF", "GO", "MT", "MS"].includes(uf)) return "Centro-Oeste";
  if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(uf)) return "Nordeste";
  if (["AM", "PA", "AC", "RO", "RR", "AP", "TO"].includes(uf)) return "Norte";

  return "";
}

function filterChipStyle(active = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 11px",
    borderRadius: 999,
    border: active ? "1px solid rgba(0,255,190,0.55)" : "1px solid rgba(255,255,255,0.14)",
    background: active
      ? "linear-gradient(135deg, rgba(0,255,190,0.18), rgba(125,92,255,0.18))"
      : "rgba(255,255,255,0.055)",
    color: "#fff",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  };
}

function splitEventList(value: string | null | undefined): string[] {
  const text = normalizeText(value);
  if (!text) return [];

  return text
    .split(/,|•|;|\|/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function hasContent(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function isHttpUrl(value: string | null | undefined): boolean {
  return /^https?:\/\//i.test(normalizeText(value));
}

const BLOCKED_TICKET_SALES_HOSTS = [
  "ingresse.com",
  "sympla.com.br",
  "eventim.com.br",
  "ticketmaster.com",
  "ticketmaster.com.br",
  "shotgun.live",
  "meaple.com.br",
  "bilheteriadigital.com",
  "uhuu.com",
  "zig.tickets",
  "ingressolive.com",
  "byma.com.br",
  "guicheweb.com.br",
];

function isTicketSalesUrl(value: string | null | undefined): boolean {
  const normalizedUrl = normalizeText(value);
  if (!isHttpUrl(normalizedUrl)) return false;

  try {
    const hostname = new URL(normalizedUrl).hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return BLOCKED_TICKET_SALES_HOSTS.some(
      (blockedHost) =>
        hostname === blockedHost || hostname.endsWith(`.${blockedHost}`)
    );
  } catch {
    return true;
  }
}

function normalizePublicHttpsTicketUrl(
  value: string | null | undefined
): string {
  const text = normalizeText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (url.protocol !== "https:") return "";
    if (!host || url.username || url.password) return "";

    if (
      host === "localhost" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^0\./.test(host) ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return "";
    }

    const private172 = host.match(/^172\.(\d{1,3})\./);

    if (private172) {
      const secondOctet = Number(private172[1]);

      if (secondOctet >= 16 && secondOctet <= 31) {
        return "";
      }
    }

    return url.toString();
  } catch {
    return "";
  }
}

function isActivePartnerTicket(
  status: string | null | undefined,
  url: string,
  expiresAt: string | null | undefined
): boolean {
  if (normalizeText(status).toLowerCase() !== "active" || !url) {
    return false;
  }

  const expiration = normalizeText(expiresAt);
  if (!expiration) return true;

  const expirationDate = new Date(expiration);

  return (
    !Number.isNaN(expirationDate.getTime()) &&
    expirationDate.getTime() > Date.now()
  );
}

const CANONICAL_IMAGE_KEYS = new Set([
  "event_image_url",
  "primary_image_url",
  "official_image_url",
  "cover_image_url",
  "banner_image_url",
  "poster_image_url",
  "poster_url",
  "image_url",
  "thumbnail_url",
  "image",
  "images",
  "cover",
  "banner",
  "poster",
  "thumbnail",
  "artwork",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPrivateOrLocalImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return true;
  }

  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (!private172) return false;

  const secondOctet = Number(private172[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function normalizeCanonicalImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";

  const normalized = normalizeText(value);
  if (!normalized) return "";

  try {
    const url = new URL(normalized);

    if (url.protocol !== "https:") return "";
    if (!url.hostname || isPrivateOrLocalImageHost(url.hostname)) return "";
    if (url.username || url.password) return "";

    return url.toString();
  } catch {
    return "";
  }
}

function findCanonicalImageUrl(
  value: unknown,
  depth = 0,
  imageContext = false
): string {
  if (depth > 6 || value === null || value === undefined) return "";

  if (typeof value === "string") {
    const normalized = normalizeText(value);

    if (
      (normalized.startsWith("{") || normalized.startsWith("[")) &&
      depth < 6
    ) {
      try {
        const parsedResult = findCanonicalImageUrl(
          JSON.parse(normalized),
          depth + 1,
          imageContext
        );

        if (parsedResult) return parsedResult;
      } catch {
        // Non-JSON strings are evaluated only as image URLs below.
      }
    }

    return imageContext ? normalizeCanonicalImageUrl(normalized) : "";
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 40)) {
      const result = findCanonicalImageUrl(
        item,
        depth + 1,
        imageContext
      );

      if (result) return result;
    }

    return "";
  }

  if (!isPlainRecord(value)) return "";

  if (imageContext) {
    const directUrl = normalizeCanonicalImageUrl(
      value.secure_url ?? value.url ?? value.src ?? value.href
    );

    if (directUrl) return directUrl;
  }

  const entries = Object.entries(value).slice(0, 60);

  for (const [key, nestedValue] of entries) {
    if (!CANONICAL_IMAGE_KEYS.has(key.toLowerCase())) continue;

    const result = findCanonicalImageUrl(
      nestedValue,
      depth + 1,
      true
    );

    if (result) return result;
  }

  for (const [key, nestedValue] of entries) {
    if (CANONICAL_IMAGE_KEYS.has(key.toLowerCase())) continue;

    const result = findCanonicalImageUrl(
      nestedValue,
      depth + 1,
      false
    );

    if (result) return result;
  }

  return "";
}

const RESERVED_RETURN_SLUGS = new Set([
  "api",
  "dashboard",
  "event",
  "invalid",
  "login",
  "network",
  "pro",
  "r",
  "t",
  "u",
]);

function getRequestedClubReturnSlug(
  value: string | null | undefined
): string {
  const candidate = String(value || "").trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return "";
  }

  const [pathname, queryString = ""] = candidate.split("?", 2);

  if (!/^\/[a-z0-9][a-z0-9_-]*$/i.test(pathname)) {
    return "";
  }

  const slug = pathname.slice(1).toLowerCase();

  if (RESERVED_RETURN_SLUGS.has(slug)) {
    return "";
  }

  const query = new URLSearchParams(queryString);

  if (query.size !== 1 || query.get("mode") !== "club") {
    return "";
  }

  return slug;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Map(values.map((item) => [normalizeForMatch(item), item])).values()
  );
}

function pageStyle() {
  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 430,
    margin: "0 auto",
    padding: "12px 14px 42px",
    boxSizing: "border-box",
  } as const;
}

function shellStyle() {
  return {
    borderRadius: 34,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "radial-gradient(circle at top left, rgba(125,92,255,0.18), rgba(255,255,255,0.03) 34%, rgba(255,255,255,0.02) 100%)",
    boxShadow: "0 28px 80px rgba(0,0,0,0.34)",
    overflow: "hidden",
  } as const;
}

function heroStyle(
  heroImage: string,
  heroImageSource: "canonical" | "event_group" | "fallback"
) {
  const usesBalancedCanonicalImage = heroImageSource === "canonical";

  return {
    marginTop: 8,
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "#07070b",
    backgroundImage: heroImage
      ? usesBalancedCanonicalImage
        ? `linear-gradient(90deg, rgba(5,5,8,0.78) 0%, rgba(5,5,8,0.54) 42%, rgba(5,5,8,0.14) 70%, rgba(5,5,8,0.03) 100%), linear-gradient(180deg, rgba(5,5,8,0.01) 0%, rgba(5,5,8,0.20) 100%), url(${heroImage})`
        : `linear-gradient(90deg, rgba(5,5,8,0.96) 0%, rgba(5,5,8,0.84) 48%, rgba(5,5,8,0.34) 100%), linear-gradient(180deg, rgba(5,5,8,0.12) 0%, rgba(5,5,8,0.78) 100%), url(${heroImage})`
      : "linear-gradient(135deg, rgba(17,17,24,0.98), rgba(36,28,68,0.84), rgba(0,78,70,0.54))",
    backgroundSize: usesBalancedCanonicalImage
      ? "100% 100%, 100% 100%, auto 100%"
      : "cover",
    backgroundPosition: usesBalancedCanonicalImage
      ? "center, center, right 3% center"
      : "center 34%",
    backgroundRepeat: "no-repeat",
    boxShadow: "0 28px 80px rgba(0,0,0,0.42)",
    overflow: "hidden",
  } as const;
}

function badgeStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.075)",
    fontSize: 11,
    fontWeight: 900,
    color: "#fff",
  } as const;
}

function sectionStyle(accent: "purple" | "green" | "yellow" = "green") {
  const border =
    accent === "purple"
      ? "rgba(125,92,255,0.26)"
      : accent === "yellow"
        ? "rgba(255,196,0,0.22)"
        : "rgba(0,255,190,0.18)";

  return {
    marginTop: 14,
    padding: 14,
    borderRadius: 24,
    border: `1px solid ${border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))",
    boxShadow: "0 18px 46px rgba(0,0,0,0.22)",
    display: "grid",
    gap: 12,
    overflow: "hidden",
  } as const;
}

function statsGridStyle() {
  return {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  } as const;
}

function statCardStyle(color: "purple" | "green" | "blue" | "yellow") {
  const colors = {
    purple: "rgba(125,92,255,0.38)",
    green: "rgba(0,255,190,0.30)",
    blue: "rgba(0,145,255,0.32)",
    yellow: "rgba(255,196,0,0.28)",
  };

  return {
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.13)",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))",
    display: "grid",
    gap: 3,
    boxShadow: `inset 0 0 18px ${colors[color]}`,
  } as const;
}

function carouselStyle() {
  return {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 2,
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
  } as const;
}

function profileCardStyle() {
  return {
    minWidth: 292,
    maxWidth: 292,
    flex: "0 0 292px",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))",
    boxShadow: "0 18px 44px rgba(0,0,0,0.34)",
    overflow: "hidden",
    scrollSnapAlign: "start",
  } as const;
}

function wideCardStyle() {
  return {
    minWidth: 292,
    maxWidth: 292,
    flex: "0 0 292px",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.025))",
    boxShadow: "0 18px 44px rgba(0,0,0,0.32)",
    overflow: "hidden",
    scrollSnapAlign: "start",
    display: "grid",
    gridTemplateColumns: "1fr",
  } as const;
}

function actionButtonStyle(primary = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 12px",
    borderRadius: 13,
    border: primary
      ? "1px solid rgba(255,255,255,0.20)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary
      ? "linear-gradient(135deg, rgba(125,34,255,1), rgba(125,92,255,0.72))"
      : "rgba(255,255,255,0.075)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 12,
    width: "100%",
    minHeight: 42,
  } as const;
}

function emptyCardStyle() {
  return {
    padding: 22,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    opacity: 0.88,
    lineHeight: 1.7,
  } as const;
}

function getRideStatusLabel(value: string) {
  if (value === "offer") return "Oferecendo carona";
  if (value === "need") return "Procurando carona";
  if (value === "both") return "Disponível para carona compartilhada";
  return "";
}

function getMeetStatusLabel(value: string) {
  if (value === "host") return "Abrindo ponto de encontro";
  if (value === "join") return "Ponto de encontro ativo";
  if (value === "both") return "Pode abrir ou entrar";
  return "";
}

function getSocialModeLabel(value: string) {
  if (value === "alone") return "Vou sozinho";
  if (value === "with_friends") return "Vou com amigos";
  if (value === "undecided") return "Ainda estou decidindo";
  if (value === "solo") return "Indo solo";
  if (value === "tribe") return "Procurando galera";
  if (value === "couple") return "Rolê em casal";
  if (value === "after") return "Buscando after";
  if (value === "networking") return "Networking no evento";
  if (value === "open") return "Aberto ao rolê";
  return "";
}

function socialBadgeStyle(kind: "vibe" | "meet" | "networking") {
  if (kind === "vibe") {
    return {
      width: "fit-content",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,0,140,0.24)",
      background: "rgba(255,0,140,0.12)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 900,
    } as const;
  }

  if (kind === "meet") {
    return {
      width: "fit-content",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(0,255,190,0.26)",
      background: "rgba(0,255,190,0.11)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 900,
    } as const;
  }

  return {
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(125,92,255,0.30)",
    background: "rgba(125,92,255,0.16)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
  } as const;
}

function SectionTitle({
  icon,
  title,
  subtitle,
  actionLabel,
}: {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: actionLabel ? "1fr auto" : "1fr",
        alignItems: "start",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 5 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: 1.05,
            fontWeight: 950,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{icon}</span>
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            opacity: 0.82,
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </p>
      </div>

      {actionLabel ? (
        <button
          type="button"
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.055)",
            color: "#fff",
            borderRadius: 14,
            padding: "10px 12px",
            fontWeight: 850,
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function ProfileCard({
  member,
  officialEventUrl,
}: {
  member: EventMember;
  officialEventUrl?: string;
}) {
  const socialModeLabel = getSocialModeLabel(member.event_social_mode);
  const genres = member.favorite_genres.slice(0, 2);
  const photo = member.club_photo_url;

  return (
    <article style={profileCardStyle()}>
      <div
        style={{
          height: 205,
          position: "relative",
          background: photo
            ? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.78)), url(${photo})`
            : "linear-gradient(135deg, rgba(125,92,255,0.32), rgba(0,255,190,0.12))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            padding: "7px 10px",
            borderRadius: 999,
            border: "1px solid rgba(0,255,190,0.30)",
            background: "rgba(0,0,0,0.48)",
            color: "#fff",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          Online
        </span>

        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            display: "grid",
            gap: 5,
          }}
        >
          <strong style={{ fontSize: 12, lineHeight: 1.05 }}>{member.label}</strong>
          {hasContent(member.city_base) ? (
            <span style={{ opacity: 0.86 }}>{member.city_base}</span>
          ) : null}
        </div>
      </div>

      <div style={{ padding: 16, display: "grid", gap: 13 }}>
        {hasContent(member.club_tagline) ? (
          <p style={{ margin: 0, lineHeight: 1.55, opacity: 0.88 }}>
            {member.club_tagline}
          </p>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {genres.map((genre) => (
            <span key={`${member.user_id}-${genre}`} style={socialBadgeStyle("meet")}>
              {genre}
            </span>
          ))}
          {member.favorite_events.length > 0 ? (
            <span style={socialBadgeStyle("meet")}>Eventos em comum</span>
          ) : null}
          {socialModeLabel ? (
            <span style={socialBadgeStyle("vibe")}>{socialModeLabel}</span>
          ) : null}
          {member.open_to_meet ? (
            <span style={socialBadgeStyle("meet")}>Aberto para conhecer pessoas</span>
          ) : null}
          {member.open_to_networking ? (
            <span style={socialBadgeStyle("networking")}>Networking ativo</span>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/${member.slug}?mode=club`} style={actionButtonStyle(true)}>
            Ver perfil Club
          </Link>

          {hasContent(officialEventUrl) ? (
            <a
              href={officialEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={actionButtonStyle()}
            >
              Evento oficial
            </a>
          ) : (
            <span style={actionButtonStyle()}>Evento oficial</span>
          )}
        </div>
      </div>
    </article>
  );
}

function RideCard({
  member,
  officialEventUrl,
}: {
  member: EventMember;
  officialEventUrl?: string;
}) {
  const photo = member.club_photo_url;

  return (
    <article style={wideCardStyle()}>
      <div
        style={{
          minHeight: 176,
          background: photo
            ? `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.32)), url(${photo})`
            : "linear-gradient(135deg, rgba(0,255,190,0.18), rgba(125,92,255,0.18))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div style={{ padding: 15, display: "grid", gap: 9 }}>
        <div>
          <strong style={{ fontSize: 22 }}>{member.label}</strong>
          {hasContent(member.city_base) ? (
            <div style={{ opacity: 0.82, marginTop: 4 }}>{member.city_base}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <span style={socialBadgeStyle("meet")}>
            {getRideStatusLabel(member.ride_status) || "Carona"}
          </span>
          {hasContent(member.ride_seats) ? (
            <span style={socialBadgeStyle("networking")}>{member.ride_seats} vagas</span>
          ) : null}
        </div>

        <div style={{ lineHeight: 1.5, opacity: 0.92 }}>
          {hasContent(member.ride_event_name) ? (
            <div>
              <strong>Evento:</strong> {member.ride_event_name}
            </div>
          ) : null}
          {hasContent(member.ride_origin) ? (
            <div>
              <strong>Origem:</strong> {member.ride_origin}
            </div>
          ) : null}
          {hasContent(member.ride_destination) ? (
            <div>
              <strong>Destino:</strong> {member.ride_destination}
            </div>
          ) : null}
          {hasContent(member.ride_notes) ? (
            <div>
              <strong>Observações:</strong> {member.ride_notes}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/${member.slug}?mode=club`} style={actionButtonStyle(true)}>
            Ver perfil Club
          </Link>
          <a
            href={member.ride_event_url || officialEventUrl || `/${member.slug}?mode=club`}
            target={member.ride_event_url || officialEventUrl ? "_blank" : undefined}
            rel={member.ride_event_url || officialEventUrl ? "noopener noreferrer" : undefined}
            style={actionButtonStyle()}
          >
            Evento oficial
          </a>
        </div>
      </div>
    </article>
  );
}

function MeetCard({
  member,
  officialEventUrl,
}: {
  member: EventMember;
  officialEventUrl?: string;
}) {
  const photo = member.club_photo_url;

  return (
    <article style={wideCardStyle()}>
      <div
        style={{
          minHeight: 176,
          background: photo
            ? `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.36)), url(${photo})`
            : "linear-gradient(135deg, rgba(255,196,0,0.20), rgba(125,92,255,0.18))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div style={{ padding: 15, display: "grid", gap: 9 }}>
        <div>
          <strong style={{ fontSize: 22 }}>{member.label}</strong>
          {hasContent(member.city_base) ? (
            <div style={{ opacity: 0.82, marginTop: 4 }}>{member.city_base}</div>
          ) : null}
        </div>

        <span style={socialBadgeStyle("vibe")}>
          {getMeetStatusLabel(member.meet_status) || "Encontro ativo"}
        </span>

        <div style={{ lineHeight: 1.5, opacity: 0.92 }}>
          {hasContent(member.meet_event_name) ? (
            <div>
              <strong>Evento:</strong> {member.meet_event_name}
            </div>
          ) : null}
          {hasContent(member.meet_meeting_point) ? (
            <div>
              <strong>Ponto:</strong> {member.meet_meeting_point}
            </div>
          ) : null}
          {hasContent(member.meet_time) ? (
            <div>
              <strong>Horário:</strong> {member.meet_time}
            </div>
          ) : null}
          {hasContent(member.meet_notes) ? (
            <div>
              <strong>Observações:</strong> {member.meet_notes}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/${member.slug}?mode=club`} style={actionButtonStyle(true)}>
            Ver perfil Club
          </Link>
          <a
            href={member.meet_event_url || officialEventUrl || `/${member.slug}?mode=club`}
            target={member.meet_event_url || officialEventUrl ? "_blank" : undefined}
            rel={member.meet_event_url || officialEventUrl ? "noopener noreferrer" : undefined}
            style={actionButtonStyle()}
          >
            Evento oficial
          </a>
        </div>
      </div>
    </article>
  );
}


function formatCanonicalEventDate(
  eventDateKey: string | null | undefined,
  startsAt: string | null | undefined
): string {
  const normalizedDateKey = normalizeText(eventDateKey);
  const dateSource = /^\d{4}-\d{2}-\d{2}$/.test(normalizedDateKey)
    ? `${normalizedDateKey}T12:00:00.000Z`
    : normalizeText(startsAt);

  if (!dateSource) return "";

  const date = new Date(dateSource);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(/\./g, "");
}

function buildCanonicalEventLocation(
  venueName: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined
): string {
  const venue = normalizeText(venueName);
  const cityState = [
    normalizeText(city),
    normalizeText(state).toUpperCase(),
  ]
    .filter(Boolean)
    .join(", ");

  return dedupeStrings([venue, cityState]).join(" · ");
}

function getCanonicalValidationLabel(
  validationStatus: string | null | undefined
): string {
  const status = normalizeText(validationStatus).toLowerCase();

  if (status === "published") {
    return "Evento oficial publicado e validado";
  }

  if (status === "validated") {
    return "Evento oficial validado";
  }

  return "";
}

async function readCanonicalEventSafe(
  eventSlug: string
): Promise<CanonicalPublicEventReadResult | null> {
  try {
    return await readCanonicalPublicEventBySlug(eventSlug);
  } catch {
    // Canonical read must never affect public event page rendering.
    return null;
  }
}
export default async function EventPage({ params, searchParams }: PageProps) {
  const { event_slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const eventSlug = normalizeText(event_slug).toLowerCase();
  const canonicalReadResult = await readCanonicalEventSafe(eventSlug);
  const canonicalEventCandidate = canonicalReadResult?.canonical_event ?? null;
  const canonicalEvent =
    canonicalReadResult?.ok &&
    canonicalReadResult.found &&
    canonicalEventCandidate?.is_100_percent_validated === true &&
    ["validated", "published"].includes(
      normalizeText(canonicalEventCandidate.validation_status).toLowerCase()
    )
      ? canonicalEventCandidate
      : null;
  const selectedCity = normalizeText(sp?.city);
  const selectedState = normalizeText(sp?.state).toUpperCase();
  const selectedRegion = normalizeText(sp?.region);
  const requestedClubReturnSlug = getRequestedClubReturnSlug(sp?.return_to);

  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user: authenticatedUser },
  } = await authSupabase.auth.getUser();

  const supabase = createPublicClient();

  const { data: cardsData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,status,is_published")
    .eq("status", "active")
    .eq("is_published", true);

  const cards = ((cardsData ?? []) as CardRow[]).filter((card) => hasContent(card.slug));
  const returnCard = requestedClubReturnSlug
    ? cards.find(
        (card) =>
          normalizeText(card.slug).toLowerCase() === requestedClubReturnSlug
      )
    : undefined;
  const eventReturnQuery = new URLSearchParams();

  if (selectedCity) eventReturnQuery.set("city", selectedCity);
  if (selectedState) eventReturnQuery.set("state", selectedState);
  if (selectedRegion) eventReturnQuery.set("region", selectedRegion);

  const eventReturnSearch = eventReturnQuery.toString();
  const eventReturnPath = `/event/${eventSlug}${
    eventReturnSearch ? `?${eventReturnSearch}` : ""
  }`;

  const heroReturnHref = returnCard
    ? `/${returnCard.slug}?mode=club`
    : authenticatedUser
      ? "/dashboard"
      : `/login?next=${encodeURIComponent(eventReturnPath)}`;
  const heroReturnLabel = returnCard
    ? "Voltar ao perfil Club"
    : authenticatedUser
      ? "Abrir minha central"
      : "Entrar no USECLUBBERS";
  const userIds = dedupeStrings(cards.map((card) => card.user_id));

  const { data: eventCheckInsData } = await supabase
    .from("club_event_checkins")
    .select("user_id,event_name,event_key,event_slug,status,checked_in_at")
    .or(`event_slug.eq.${eventSlug},event_key.eq.${eventSlug}`)
    .eq("status", "active")
    .order("checked_in_at", { ascending: false });

  const checkedInUserIds = Array.from(
    new Set(
      (eventCheckInsData || [])
        .map((item: any) => normalizeText(item.user_id))
        .filter(Boolean)
    )
  );

  const allUserIds = Array.from(new Set([...userIds, ...checkedInUserIds]));

  const { data: profilesData } = allUserIds.length
    ? await supabase
        .from("club_profiles")
        .select(`
          user_id,
          city_base,
          club_tagline,
          club_photo_url,
          favorite_genres,
          favorite_clubs,
          favorite_events,
          next_events,
          next_events_links,
          ride_status,
          ride_event_name,
          ride_event_url,
          ride_origin,
          ride_destination,
          ride_seats,
          ride_notes,
          meet_status,
          meet_event_name,
          meet_event_date,
          meet_event_url,
          meet_meeting_point,
          meet_time,
          meet_notes,
          event_social_mode,
          open_to_meet,
          open_to_networking,
          event_ticket_type,
          event_requires_food_kg,
          event_requires_student_document,
          event_preparation_notes
        `)
        .in("user_id", allUserIds)
    : { data: [] as ClubProfileRow[] };

  const profileMap = new Map<string, ClubProfileRow>();
  for (const profile of (profilesData ?? []) as ClubProfileRow[]) {
    profileMap.set(profile.user_id, profile);
  }

  const checkedInUserIdSet = new Set(checkedInUserIds);
  const matchedMembers: EventMember[] = [];

  for (const card of cards) {
    const profile = profileMap.get(card.user_id);
    if (!profile) continue;

    const favoriteGenres = splitEventList(profile.favorite_genres);
    const favoriteClubs = splitEventList(profile.favorite_clubs);
    const favoriteEvents = splitEventList(profile.favorite_events);

    const nextEvents = splitEventList(
      profile.next_events ||
        (profile as any).nextEvents ||
        (profile as any).upcoming_events
    );

    const nextEventsMatch = nextEvents.some((item) => toEventSlug(item) === eventSlug);
    const rideMatch = toEventSlug(profile.ride_event_name) === eventSlug;
    const meetMatch = toEventSlug(profile.meet_event_name) === eventSlug;

    const checkInMatch = checkedInUserIdSet.has(card.user_id);

    if (!checkInMatch && !nextEventsMatch && !rideMatch && !meetMatch) continue;

    matchedMembers.push({
      user_id: card.user_id,
      label: normalizeText(card.label) || "Clubber",
      slug: normalizeText(card.slug),
      city_base: normalizeText(profile.city_base),
      club_tagline: normalizeText(profile.club_tagline),
      club_photo_url: normalizeText(profile.club_photo_url),
      favorite_genres: favoriteGenres,
      favorite_clubs: favoriteClubs,
      favorite_events: favoriteEvents,
      next_events: nextEvents,
      next_events_links: normalizeText(profile.next_events_links),
      ride_status: normalizeText(profile.ride_status),
      ride_event_name: normalizeText(profile.ride_event_name),
      ride_event_url: normalizeText(profile.ride_event_url),
      ride_origin: normalizeText(profile.ride_origin),
      ride_destination: normalizeText(profile.ride_destination),
      ride_seats: normalizeText(profile.ride_seats),
      ride_notes: normalizeText(profile.ride_notes),
      meet_status: normalizeText(profile.meet_status),
      meet_event_name: normalizeText(profile.meet_event_name),
      meet_event_date: normalizeText(profile.meet_event_date),
      meet_event_url: normalizeText(profile.meet_event_url),
      meet_meeting_point: normalizeText(profile.meet_meeting_point),
      meet_time: normalizeText(profile.meet_time),
      meet_notes: normalizeText(profile.meet_notes),
      event_social_mode: normalizeText(profile.event_social_mode),
      open_to_meet: Boolean(profile.open_to_meet),
      open_to_networking: Boolean(profile.open_to_networking),
      event_ticket_type: normalizeText(profile.event_ticket_type),
      event_requires_food_kg: Boolean(profile.event_requires_food_kg),
      event_requires_student_document: Boolean(profile.event_requires_student_document),
      event_preparation_notes: normalizeText(profile.event_preparation_notes),
    });
  }

  const canonicalNames = dedupeStrings(
    matchedMembers
      .flatMap((member) => [
        ...member.next_events.filter((item) => toEventSlug(item) === eventSlug),
        toEventSlug(member.ride_event_name) === eventSlug ? member.ride_event_name : "",
        toEventSlug(member.meet_event_name) === eventSlug ? member.meet_event_name : "",
      ])
      .filter(Boolean)
  );

  const eventTitle = canonicalNames[0] || eventSlug.replace(/-/g, " ");

  const officialEventUrl =
    matchedMembers.find((member) => isHttpUrl(member.next_events_links))?.next_events_links ||
    matchedMembers.find((member) => isHttpUrl(member.ride_event_url))?.ride_event_url ||
    matchedMembers.find((member) => isHttpUrl(member.meet_event_url))?.meet_event_url ||
    "";

  const { data: eventGroupsData } = await supabase
    .from("event_groups")
    .select("group_id,event_name,event_slug,event_url,official_url,official_status,official_confidence,official_source_type,event_date,event_image_url,city_base,title,description,weather_summary,weather_temperature,weather_rain_alert,preparation_note")
    .eq("event_slug", eventSlug)
    .limit(1);

  const eventGroup =
    ((eventGroupsData ?? [])[0] as EventGroupRow | undefined) || null;

  let partnerTicket: PartnerTicketRow | null = null;

  if (eventGroup?.group_id) {
    const { data: partnerTicketData } = await supabase
      .from("event_groups")
      .select(
        "partner_ticket_url,partner_ticket_status,partner_ticket_partner_name,partner_ticket_button_label,partner_ticket_expires_at"
      )
      .eq("group_id", eventGroup.group_id)
      .limit(1);

    partnerTicket =
      ((partnerTicketData ?? [])[0] as PartnerTicketRow | undefined) || null;
  }

  const socialRadar = eventGroup?.group_id
    ? await readEventSocialRadar({
        eventGroupId: eventGroup.group_id,
        viewerUserId: authenticatedUser?.id || null,
      })
    : createEmptySocialRadar();

  const attendees = mergeEventMembers(
    matchedMembers,
    socialRadar.members
  );

  const canonicalHeroTitle = normalizeText(canonicalEvent?.event_name);

  const heroTitle =
    canonicalHeroTitle ||
    normalizeText(eventGroup?.event_name) ||
    normalizeText(eventGroup?.title) ||
    eventTitle;

  const canonicalEventDate = formatCanonicalEventDate(
    canonicalEvent?.event_date_key,
    canonicalEvent?.starts_at
  );

  const canonicalEventLocation = buildCanonicalEventLocation(
    canonicalEvent?.venue_name,
    canonicalEvent?.city,
    canonicalEvent?.state
  );

  const canonicalHeroDetails = dedupeStrings([
    canonicalEventDate,
    canonicalEventLocation,
  ]).join(" · ");

  const heroMeta =
    canonicalHeroDetails ||
    `${attendees.length} ${
      attendees.length === 1
        ? "participante mapeado"
        : "participantes mapeados"
    }`;

  const canonicalHeroImage = canonicalEvent
    ? findCanonicalImageUrl(canonicalReadResult)
    : "";

  const eventGroupHeroImage = isHttpUrl(eventGroup?.event_image_url)
    ? normalizeText(eventGroup?.event_image_url)
    : "";

  const fallbackHeroImage =
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1800&auto=format&fit=crop";

  const heroImage =
    canonicalHeroImage || eventGroupHeroImage || fallbackHeroImage;

  const heroImageSource = canonicalHeroImage
    ? "canonical"
    : eventGroupHeroImage
      ? "event_group"
      : "fallback";

  const eventGroupOfficialStatus = normalizeText(eventGroup?.official_status);
  const confirmedOfficialUrl =
    eventGroupOfficialStatus === "confirmed" && isHttpUrl(eventGroup?.official_url)
      ? normalizeText(eventGroup?.official_url)
      : "";

  const canonicalOfficialUrl = isHttpUrl(canonicalEvent?.official_url)
    ? normalizeText(canonicalEvent?.official_url)
    : "";

  const canonicalTicketReferenceUrl = isHttpUrl(canonicalEvent?.ticket_url)
    ? normalizeText(canonicalEvent?.ticket_url)
    : "";

  const canonicalOfficialIsCommercial =
    hasContent(canonicalOfficialUrl) &&
    (
      isTicketSalesUrl(canonicalOfficialUrl) ||
      (
        hasContent(canonicalTicketReferenceUrl) &&
        canonicalOfficialUrl === canonicalTicketReferenceUrl
      )
    );

  const confirmedOfficialIsCommercial =
    hasContent(confirmedOfficialUrl) &&
    isTicketSalesUrl(confirmedOfficialUrl);

  const safeCanonicalOfficialUrl = canonicalOfficialIsCommercial
    ? ""
    : canonicalOfficialUrl;

  const safeConfirmedOfficialUrl = confirmedOfficialIsCommercial
    ? ""
    : confirmedOfficialUrl;

  const heroOfficialUrl =
    safeCanonicalOfficialUrl || safeConfirmedOfficialUrl;

  const normalizedPartnerTicketUrl = normalizePublicHttpsTicketUrl(
    partnerTicket?.partner_ticket_url
  );

  const activePartnerTicketUrl = isActivePartnerTicket(
    partnerTicket?.partner_ticket_status,
    normalizedPartnerTicketUrl,
    partnerTicket?.partner_ticket_expires_at
  )
    ? normalizedPartnerTicketUrl
    : "";

  const activePartnerTicketLabel =
    normalizeText(partnerTicket?.partner_ticket_button_label) ||
    "Adquirir ingresso";

  // O Guia rápido é exclusivamente informativo. A compra permanece
  // no ponto dedicado do cabeçalho quando existe link autorizado e ativo.
  // Nenhum CTA ou fallback externo é repetido dentro do Guia rápido.
  const ticketGuideValue = hasContent(activePartnerTicketUrl)
    ? "Ingressos disponíveis"
    : "Disponibilidade a confirmar";

  const ticketGuideDetail = hasContent(activePartnerTicketUrl)
    ? "A opção de compra está disponível no topo do evento."
    : "Acompanhe as atualizações deste evento.";

  const availableCities = Array.from(
    new Set(attendees.map((member) => normalizeText(member.city_base)).filter(Boolean))
  ).slice(0, 8);

  const availableStates = Array.from(
    new Set(attendees.map((member) => getStateFromCityBase(member.city_base)).filter(Boolean))
  ).slice(0, 8);

  const availableRegions = Array.from(
    new Set(availableStates.map((state) => getRegionFromState(state)).filter(Boolean))
  ).slice(0, 5);

  const filteredAttendees = attendees.filter((member) => {
    const memberCity = normalizeText(member.city_base);
    const memberState = getStateFromCityBase(member.city_base);
    const memberRegion = getRegionFromState(memberState);

    if (selectedCity && memberCity !== selectedCity) return false;
    if (selectedState && memberState !== selectedState) return false;
    if (selectedRegion && memberRegion !== selectedRegion) return false;

    return true;
  });

  const tribeMap = new Map<string, number>();

  for (const member of attendees) {
    const tribeSources = member.favorite_genres || [];

    for (const source of tribeSources) {
      const tribe = normalizeText(source);
      if (!tribe) continue;
      tribeMap.set(tribe, (tribeMap.get(tribe) || 0) + 1);
    }
  }

  const topTribes = Array.from(tribeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const rideOfferMembers = attendees.filter(
    (member) => member.ride_status === "offer" || member.ride_status === "both"
  );

  const rideNeedMembers = attendees.filter(
    (member) => member.ride_status === "need" || member.ride_status === "both"
  );

  const rideMembers = dedupeStrings([
    ...rideOfferMembers.map((member) => member.user_id),
    ...rideNeedMembers.map((member) => member.user_id),
  ])
    .map((userId) => attendees.find((member) => member.user_id === userId))
    .filter(Boolean) as EventMember[];

  const meetMembers = attendees.filter(
    (member) =>
      member.meet_status === "host" ||
      member.meet_status === "join" ||
      member.meet_status === "both"
  );

  const persistedSocialStats = [
    {
      key: "alone",
      label: "Vou sozinho",
      count: socialRadar.counts.alone,
      members: attendees.filter(
        (member) => member.social_participation_mode === "alone"
      ),
      emptyLabel: "Ninguém marcou ainda",
    },
    {
      key: "with-friends",
      label: "Vou com amigos",
      count: socialRadar.counts.with_friends,
      members: attendees.filter(
        (member) => member.social_participation_mode === "with_friends"
      ),
      emptyLabel: "Ninguém marcou ainda",
    },
    {
      key: "undecided",
      label: "Ainda decidindo",
      count: socialRadar.counts.undecided,
      members: attendees.filter(
        (member) => member.social_participation_mode === "undecided"
      ),
      emptyLabel: "Ninguém marcou ainda",
    },
    {
      key: "wants-group",
      label: "Quer entrar em grupo",
      count: socialRadar.counts.wants_group,
      members: attendees.filter(
        (member) => member.social_wants_group === true
      ),
      emptyLabel: "Nenhum interesse ainda",
    },
    {
      key: "accepts-people",
      label: "Aceita novas pessoas",
      count: socialRadar.counts.accepts_new_people,
      members: attendees.filter(
        (member) => member.social_accepts_new_people === true
      ),
      emptyLabel: "Nenhum grupo aberto",
    },
    {
      key: "meet-on-site",
      label: "Encontro no local",
      count: socialRadar.counts.meet_on_site,
      members: attendees.filter(
        (member) => member.social_meet_on_site === true
      ),
      emptyLabel: "Ninguém marcou ainda",
    },
    {
      key: "first-time",
      label: "Primeira vez",
      count: socialRadar.counts.first_time,
      members: attendees.filter(
        (member) => member.social_first_time === true
      ),
      emptyLabel: "Ninguém marcou ainda",
    },
    {
      key: "same-city",
      label: "Pessoas da cidade",
      count: socialRadar.counts.same_city,
      members: attendees.filter(
        (member) => member.social_same_city === true
      ),
      emptyLabel: "Nenhuma preferência",
    },
    {
      key: "accepted-connections",
      label: "Conexões aceitas",
      count: socialRadar.counts.accepted_connections,
      members: attendees.filter(
        (member) => member.social_is_accepted_connection === true
      ),
      emptyLabel: authenticatedUser
        ? "Nenhuma conexão aqui"
        : "Entre para comparar",
    },
  ] satisfies Array<{
    key: string;
    label: string;
    count: number;
    members: EventMember[];
    emptyLabel: string;
  }>;

  const groupPreferenceStats = [
    {
      key: "mixed-group",
      label: "Misto",
      count: socialRadar.group_preferences.mixed_group,
    },
    {
      key: "women-only",
      label: "Feminino",
      count: socialRadar.group_preferences.women_only,
    },
    {
      key: "men-only",
      label: "Masculino",
      count: socialRadar.group_preferences.men_only,
    },
    {
      key: "lgbtqia-plus",
      label: "LGBTQIA+",
      count: socialRadar.group_preferences.lgbtqia_plus,
    },
  ];

  const visibleGroupPreferenceStats = groupPreferenceStats.filter(
    (item) => item.count > 0
  );

  const socialStats = [
    {
      key: "attendees",
      label: "Perfis no evento",
      count: attendees.length,
      members: attendees,
      emptyLabel: "Descobrir pessoas",
      href: "#event-social-radar",
    },
    {
      key: "ride-offers",
      label: "Oferta de carona",
      count: rideOfferMembers.length,
      members: rideOfferMembers,
      emptyLabel: "Nenhuma oferta ainda",
      href:
        rideOfferMembers.length > 0
          ? "#event-rides-meets"
          : "#event-social-radar",
    },
    {
      key: "ride-needs",
      label: "Busca por carona",
      count: rideNeedMembers.length,
      members: rideNeedMembers,
      emptyLabel: "Ninguém procurando",
      href:
        rideNeedMembers.length > 0
          ? "#event-rides-meets"
          : "#event-social-radar",
    },
    {
      key: "meetups",
      label: "Encontros ativos",
      count: meetMembers.length,
      members: meetMembers,
      emptyLabel: "Nenhum encontro ainda",
      href:
        meetMembers.length > 0
          ? "#event-rides-meets"
          : "#event-social-radar",
    },
  ] satisfies Array<{
    key: string;
    label: string;
    count: number;
    members: EventMember[];
    emptyLabel: string;
    href: string;
  }>;

  return (
    <main style={pageStyle()}>
      <style>{`
        *::-webkit-scrollbar {
          display: none;
        }

        * {
          scrollbar-width: none;
        }

        body {
          background: #050505;
        }

        .event-hero {
          width: min(1120px, calc(100vw - 48px));
          margin-left: 50%;
          transform: translateX(-50%);
          display: grid;
          grid-template-columns: minmax(0, 1.16fr) minmax(300px, 0.84fr);
          min-height: 430px;
        }

        .event-hero__content {
          display: grid;
          align-content: end;
          gap: 18px;
          padding: clamp(28px, 4.6vw, 58px);
          min-width: 0;
        }

        .event-hero__meta {
          margin: 0;
          color: rgba(222, 222, 232, 0.76);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .event-hero__title {
          margin: 0;
          max-width: 720px;
          color: #f7f7fb;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 0.94;
          letter-spacing: -0.055em;
          font-weight: 950;
        }

        .event-hero__description {
          margin: 0;
          max-width: 640px;
          color: rgba(224, 224, 232, 0.82);
          font-size: clamp(16px, 1.7vw, 20px);
          line-height: 1.58;
        }

        .event-hero__actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .event-hero__action-primary,
        .event-hero__action-secondary,
        .event-hero__action-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 14px;
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        .event-hero__action-primary {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background:
            linear-gradient(135deg, rgba(125, 34, 255, 1), rgba(125, 92, 255, 0.76));
          box-shadow: 0 16px 38px rgba(125, 34, 255, 0.28);
        }

        .event-hero__action-secondary {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(15, 15, 22, 0.54);
          backdrop-filter: blur(12px);
        }

        .event-hero__action-link {
          min-height: 0;
          padding: 10px 2px;
          border-radius: 0;
          gap: 8px;
          color: rgba(232, 232, 240, 0.78);
          transition: color 160ms ease;
        }

        .event-hero__action-link::after {
          content: "→";
          color: #18d8c0;
          font-size: 16px;
          font-weight: 800;
          line-height: 1;
          transition: transform 160ms ease;
        }

        .event-hero__action-link:hover {
          color: #ffffff;
        }

        .event-hero__action-link:hover::after {
          transform: translateX(3px);
        }

        .event-hero__stats {
          align-self: stretch;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-left: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(180deg, rgba(8,8,13,0.34), rgba(8,8,13,0.78));
          backdrop-filter: blur(8px);
        }

        .event-hero[data-event-image-source="canonical"] .event-hero__content {
          text-shadow: 0 2px 22px rgba(0,0,0,0.92);
        }

        .event-hero[data-event-image-source="canonical"] .event-hero__stats {
          background:
            linear-gradient(180deg, rgba(8,8,13,0.16), rgba(8,8,13,0.48));
          backdrop-filter: none;
        }

        .event-hero[data-event-image-source="canonical"] .event-hero__stat {
          background: rgba(7,7,11,0.08);
        }

        .event-hero__stat {
          display: grid;
          align-content: end;
          gap: 12px;
          min-height: 148px;
          padding: 28px;
          border-right: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          color: inherit;
          text-decoration: none;
          transition:
            background 160ms ease,
            border-color 160ms ease;
        }

        .event-hero__stat:hover,
        .event-hero__stat:focus-visible {
          background: rgba(20, 184, 166, 0.08);
          border-color: rgba(20, 184, 166, 0.24);
          outline: none;
        }

        .event-hero__stat-copy {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .event-hero__stat:nth-child(2n) {
          border-right: 0;
        }

        .event-hero__stat:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .event-hero__stat-label {
          color: rgba(216, 216, 226, 0.68);
          font-size: 13px;
          line-height: 1.35;
        }

        .event-hero__stat-value {
          color: #f8f8fb;
          font-size: 38px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .event-hero__stat-preview {
          display: flex;
          align-items: center;
          min-height: 28px;
          min-width: 0;
        }

        .event-hero__stat-avatar,
        .event-hero__stat-more {
          width: 28px;
          height: 28px;
          margin-left: -7px;
          border-radius: 999px;
          border: 2px solid rgba(8, 8, 13, 0.92);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            linear-gradient(145deg, rgba(20, 184, 166, 0.28), rgba(79, 70, 229, 0.22)),
            #10141e;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          color: rgba(248, 250, 252, 0.92);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: -0.02em;
          flex: 0 0 auto;
        }

        .event-hero__stat-avatar:first-child,
        .event-hero__stat-more:first-child {
          margin-left: 0;
        }

        .event-hero__stat-more {
          background: rgba(17, 24, 39, 0.94);
          font-size: 9px;
        }

        .event-hero__stat-empty {
          color: rgba(203, 213, 225, 0.68);
          font-size: 11px;
          line-height: 1.25;
          font-weight: 750;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-hero__tribes {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(170px, 0.42fr) minmax(0, 1.58fr);
          align-items: center;
          gap: 22px;
          padding: 16px clamp(24px, 3vw, 38px);
          border-top: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(90deg, rgba(8,8,13,0.88), rgba(12,10,22,0.82));
          backdrop-filter: blur(10px);
        }

        .event-hero__tribes-heading {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .event-hero__tribes-title {
          color: #f7f7fb;
          font-size: 12px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .event-hero__tribes-subtitle {
          color: rgba(210,210,222,0.62);
          font-size: 9px;
          line-height: 1.25;
        }

        .event-hero__tribes-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          min-width: 0;
        }

        .event-hero__tribe {
          min-width: 0;
          display: grid;
          grid-template-columns: 7px minmax(0, 1fr);
          gap: 2px 8px;
          padding: 4px 12px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .event-hero__tribe-dot {
          grid-row: 1 / span 2;
          align-self: center;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #00e7b0;
          box-shadow: 0 0 12px rgba(0,231,176,0.38);
        }

        .event-hero__tribe-name {
          min-width: 0;
          overflow: visible;
          color: rgba(245,245,250,0.94);
          font-size: 11px;
          line-height: 1.2;
          font-weight: 900;
          text-overflow: clip;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .event-hero__tribe-count {
          color: rgba(210,210,222,0.64);
          font-size: 11px;
          line-height: 1.25;
        }

        .event-persisted-radar {
          width: min(1120px, calc(100vw - 48px));
          margin: 18px 0 0 50%;
          transform: translateX(-50%);
          display: grid;
          gap: 18px;
          padding: 24px;
          box-sizing: border-box;
          border: 1px solid rgba(20, 184, 166, 0.18);
          border-radius: 24px;
          background:
            radial-gradient(circle at 0 0, rgba(20, 184, 166, 0.10), transparent 34%),
            linear-gradient(145deg, rgba(11, 16, 32, 0.96), rgba(5, 7, 13, 0.98));
          overflow: hidden;
        }

        .event-persisted-radar__heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
        }

        .event-persisted-radar__copy {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .event-persisted-radar__eyebrow {
          color: #14b8a6;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .event-persisted-radar__title {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(24px, 2.6vw, 34px);
          line-height: 1;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .event-persisted-radar__description {
          margin: 0;
          max-width: 760px;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.55;
        }

        .event-persisted-radar__total {
          flex: 0 0 auto;
          display: grid;
          justify-items: end;
          gap: 4px;
        }

        .event-persisted-radar__total-value {
          color: #f8fafc;
          font-size: 32px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .event-persisted-radar__total-label {
          color: rgba(203, 213, 225, 0.68);
          font-size: 10px;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .event-persisted-radar__track {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(154px, 1fr);
          gap: 10px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: inline mandatory;
        }

        .event-persisted-radar__item {
          min-width: 0;
          min-height: 112px;
          display: grid;
          align-content: space-between;
          gap: 12px;
          padding: 15px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 17px;
          background: rgba(17, 24, 39, 0.68);
          color: inherit;
          text-decoration: none;
          scroll-snap-align: start;
          transition:
            border-color 160ms ease,
            background 160ms ease;
        }

        .event-persisted-radar__item:hover,
        .event-persisted-radar__item:focus-visible {
          border-color: rgba(20, 184, 166, 0.42);
          background: rgba(20, 184, 166, 0.08);
          outline: none;
        }

        .event-persisted-radar__item-copy {
          display: grid;
          gap: 5px;
        }

        .event-persisted-radar__item-label {
          color: rgba(203, 213, 225, 0.72);
          font-size: 11px;
          line-height: 1.3;
          font-weight: 800;
        }

        .event-persisted-radar__item-value {
          color: #f8fafc;
          font-size: 27px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .event-persisted-radar__preview {
          display: flex;
          align-items: center;
          min-height: 25px;
          min-width: 0;
        }

        .event-persisted-radar__avatar,
        .event-persisted-radar__more {
          width: 25px;
          height: 25px;
          margin-left: -6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #0b1020;
          border-radius: 999px;
          background:
            linear-gradient(135deg, rgba(20, 184, 166, 0.30), rgba(13, 148, 136, 0.15)),
            #111827;
          background-position: center;
          background-size: cover;
          color: #f8fafc;
          font-size: 9px;
          line-height: 1;
          font-weight: 950;
          overflow: hidden;
        }

        .event-persisted-radar__avatar:first-child,
        .event-persisted-radar__more:first-child {
          margin-left: 0;
        }

        .event-persisted-radar__more {
          background: #0d9488;
        }

        .event-persisted-radar__empty {
          color: rgba(203, 213, 225, 0.58);
          font-size: 10px;
          line-height: 1.3;
          font-weight: 750;
        }

        .event-persisted-radar__groups {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          overflow-x: auto;
          padding-top: 2px;
        }

        .event-persisted-radar__groups-label {
          flex: 0 0 auto;
          color: rgba(203, 213, 225, 0.64);
          font-size: 10px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .event-persisted-radar__group {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          padding: 7px 9px;
          border-bottom: 1px solid rgba(20, 184, 166, 0.30);
          color: #cbd5e1;
          font-size: 9px;
          line-height: 1.15;
          font-weight: 800;
        }

        .event-persisted-radar__group strong {
          color: #f8fafc;
          font-size: 13px;
          font-weight: 950;
        }

        .event-persisted-radar__notice {
          margin: 0;
          color: rgba(203, 213, 225, 0.52);
          font-size: 10px;
          line-height: 1.45;
        }

        .event-social-radar {
          width: min(1120px, calc(100vw - 48px));
          max-width: none;
          box-sizing: border-box;
          margin-left: 50%;
          transform: translateX(-50%);
          padding: clamp(18px, 2.4vw, 26px) !important;
          gap: 18px !important;
        }

        .event-ticket-journey {
          --journey-inline-pad: clamp(22px, 3vw, 36px);
          width: min(1120px, calc(100vw - 48px));
          max-width: none;
          box-sizing: border-box;
          margin: 18px 0 0 50%;
          transform: translateX(-50%);
          padding: clamp(25px, 3vw, 36px) var(--journey-inline-pad) 0;
          display: grid;
          gap: 24px;
          border: 1px solid rgba(125, 92, 255, 0.20);
          border-radius: 26px;
          background:
            radial-gradient(circle at 91% 4%, rgba(96, 72, 220, 0.13), transparent 34%),
            radial-gradient(circle at 4% 100%, rgba(0, 231, 176, 0.07), transparent 30%),
            linear-gradient(145deg, rgba(16, 16, 24, 0.97), rgba(7, 7, 11, 0.99));
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
          overflow: hidden;
        }

        .event-ticket-journey__heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 28px;
        }

        .event-journey-mobile-nav {
          display: none;
        }

        .event-ticket-journey__copy {
          min-width: 0;
          display: grid;
          gap: 7px;
        }

        .event-ticket-journey__eyebrow {
          color: #4ce5c8;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .event-ticket-journey__title {
          margin: 0;
          color: #f8f8fb;
          font-size: clamp(26px, 3vw, 35px);
          line-height: 1.03;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .event-ticket-journey__description {
          margin: 0;
          max-width: 720px;
          color: rgba(220, 220, 232, 0.68);
          font-size: 14px;
          line-height: 1.55;
        }

        .event-ticket-journey__status {
          min-width: 230px;
          display: grid;
          grid-template-columns: 8px auto;
          grid-template-areas:
            "dot label"
            "dot value";
          align-items: center;
          column-gap: 10px;
          row-gap: 2px;
          padding: 0 0 3px;
        }

        .event-ticket-journey__status-dot {
          grid-area: dot;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.72);
          box-shadow: 0 0 14px rgba(148, 163, 184, 0.20);
        }

        .event-ticket-journey[data-status="interested"] .event-ticket-journey__status-dot,
        .event-ticket-journey[data-status="wants_ticket"] .event-ticket-journey__status-dot {
          background: #4ce5c8;
          box-shadow: 0 0 14px rgba(76, 229, 200, 0.34);
        }

        .event-ticket-journey[data-status="ticket_acquired"] .event-ticket-journey__status-dot,
        .event-ticket-journey[data-status="checked_in"] .event-ticket-journey__status-dot {
          background: #86efac;
          box-shadow: 0 0 14px rgba(134, 239, 172, 0.34);
        }

        .event-ticket-journey[data-status="cancelled"] .event-ticket-journey__status-dot {
          background: rgba(248, 113, 113, 0.78);
          box-shadow: 0 0 14px rgba(248, 113, 113, 0.20);
        }

        .event-ticket-journey__status-label {
          grid-area: label;
          color: rgba(205, 205, 218, 0.48);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .event-ticket-journey__status-value {
          grid-area: value;
          color: rgba(248, 248, 251, 0.94);
          font-size: 13px;
          line-height: 1.35;
          font-weight: 900;
        }

        .event-ticket-journey__actions {
          margin-inline: calc(var(--journey-inline-pad) * -1);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .event-ticket-journey__action {
          position: relative;
          min-width: 0;
          min-height: 116px;
          padding: 22px 20px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0;
          background: transparent;
          color: #ffffff;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          transition:
            background 170ms ease,
            color 170ms ease;
        }

        .event-ticket-journey__action:last-child {
          border-right: 0;
        }

        .event-ticket-journey__action::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 2px;
          background: transparent;
          transition: background 170ms ease, box-shadow 170ms ease;
        }

        .event-ticket-journey__action:hover:not(:disabled) {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018));
        }

        .event-ticket-journey__action:focus-visible {
          outline: 2px solid rgba(76, 229, 200, 0.78);
          outline-offset: -3px;
        }

        .event-ticket-journey__action:disabled {
          cursor: default;
        }

        .event-ticket-journey__action--active {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02));
        }

        .event-ticket-journey__action--active.event-ticket-journey__action--interest::before,
        .event-ticket-journey__action--active.event-ticket-journey__action--ticket::before {
          background: linear-gradient(90deg, #27d9b7, #715cff);
          box-shadow: 0 0 22px rgba(76, 229, 200, 0.28);
        }

        .event-ticket-journey__action--active.event-ticket-journey__action--confirmed::before {
          background: linear-gradient(90deg, #4ade80, #27d9b7);
          box-shadow: 0 0 22px rgba(74, 222, 128, 0.24);
        }

        .event-ticket-journey__action--active.event-ticket-journey__action--cancelled::before {
          background: rgba(248, 113, 113, 0.62);
        }

        .event-ticket-journey__action--cancelled {
          color: rgba(232, 232, 239, 0.64);
        }

        .event-ticket-journey__action-index {
          align-self: start;
          padding-top: 2px;
          color: rgba(205, 205, 218, 0.38);
          font-size: 10px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.10em;
        }

        .event-ticket-journey__action-copy {
          min-width: 0;
          display: grid;
          gap: 7px;
        }

        .event-ticket-journey__action-title {
          color: inherit;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 950;
          letter-spacing: -0.01em;
        }

        .event-ticket-journey__action-state {
          color: rgba(134, 239, 172, 0.90);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .event-ticket-journey__action-arrow {
          color: rgba(230, 230, 240, 0.46);
          font-size: 18px;
          line-height: 1;
          transition: transform 170ms ease, color 170ms ease;
        }

        .event-ticket-journey__action:hover:not(:disabled) .event-ticket-journey__action-arrow {
          color: rgba(76, 229, 200, 0.90);
          transform: translateX(3px);
        }

        .event-ticket-journey__action--cancelled .event-ticket-journey__action-arrow {
          color: rgba(232, 232, 239, 0.24);
        }

        .event-ticket-journey__feedback {
          margin: -8px calc(var(--journey-inline-pad) * -1) 0;
          padding: 14px var(--journey-inline-pad) 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          color: rgba(134, 239, 172, 0.94);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 800;
        }

        .event-ticket-journey__feedback--error {
          color: rgba(248, 113, 113, 0.96);
        }

        .event-social-journey {
          margin-inline: calc(var(--journey-inline-pad) * -1);
          padding: clamp(22px, 2.8vw, 30px) var(--journey-inline-pad) 26px;
          display: grid;
          gap: 22px;
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          background:
            radial-gradient(circle at 100% 0%, rgba(20, 184, 166, 0.10), transparent 34%),
            linear-gradient(180deg, rgba(5, 7, 13, 0.10), rgba(5, 7, 13, 0.52));
        }

        .event-social-journey__heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 24px;
        }

        .event-social-journey__copy {
          min-width: 0;
          display: grid;
          gap: 7px;
        }

        .event-social-journey__eyebrow {
          color: #14b8a6;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .event-social-journey__title {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(21px, 2.4vw, 28px);
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .event-social-journey__description {
          margin: 0;
          max-width: 720px;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.55;
        }

        .event-social-journey__status {
          min-width: 210px;
          display: grid;
          gap: 3px;
          padding-bottom: 2px;
          text-align: right;
        }

        .event-social-journey__status span {
          color: rgba(203, 213, 225, 0.52);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .event-social-journey__status strong {
          color: #f8fafc;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 900;
        }

        .event-social-journey__modes {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        }

        .event-social-journey__mode {
          min-width: 0;
          min-height: 124px;
          padding: 20px 18px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 8px;
          border: 0;
          border-right: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 0;
          background: transparent;
          color: #f8fafc;
          text-align: left;
          cursor: pointer;
          transition: background 160ms ease, box-shadow 160ms ease;
        }

        .event-social-journey__mode:last-child {
          border-right: 0;
        }

        .event-social-journey__mode:hover:not(:disabled),
        .event-social-journey__mode:focus-visible {
          background: rgba(20, 184, 166, 0.07);
        }

        .event-social-journey__mode:focus-visible,
        .event-social-journey__preference:focus-visible,
        .event-social-journey__group-preference-option:focus-visible {
          outline: 2px solid rgba(20, 184, 166, 0.78);
          outline-offset: -3px;
        }

        .event-social-journey__mode:disabled,
        .event-social-journey__preference:disabled,
        .event-social-journey__group-preference-option:disabled {
          cursor: default;
          opacity: 0.76;
        }

        .event-social-journey__mode--featured {
          background: rgba(13, 148, 136, 0.07);
        }

        .event-social-journey__mode--active {
          background:
            linear-gradient(180deg, rgba(20, 184, 166, 0.16), rgba(13, 148, 136, 0.07));
          box-shadow: inset 0 3px 0 #14b8a6;
        }

        .event-social-journey__mode-title {
          color: inherit;
          font-size: 15px;
          line-height: 1.3;
          font-weight: 950;
        }

        .event-social-journey__mode-detail {
          color: rgba(203, 213, 225, 0.68);
          font-size: 12px;
          line-height: 1.45;
        }

        .event-social-journey__mode-state {
          color: rgba(20, 184, 166, 0.92);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .event-social-journey__preferences {
          display: grid;
          gap: 14px;
        }

        .event-social-journey__preferences-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 18px;
        }

        .event-social-journey__preferences-heading strong {
          color: #f8fafc;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 900;
        }

        .event-social-journey__preferences-heading span {
          color: rgba(203, 213, 225, 0.58);
          font-size: 11px;
          line-height: 1.4;
        }

        .event-social-journey__preference-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(148, 163, 184, 0.14);
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
        }

        .event-social-journey__preference {
          min-width: 0;
          min-height: 84px;
          padding: 15px 16px;
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          align-items: start;
          gap: 11px;
          border: 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
          border-right: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 0;
          background: transparent;
          color: #f8fafc;
          text-align: left;
          cursor: pointer;
          transition: background 160ms ease;
        }

        .event-social-journey__preference:nth-child(even),
        .event-social-journey__group-preference:nth-child(even) {
          border-right: 0;
        }

        .event-social-journey__preference:nth-last-child(-n + 2),
        .event-social-journey__group-preference:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .event-social-journey__preference:hover:not(:disabled) {
          background: rgba(20, 184, 166, 0.055);
        }

        .event-social-journey__preference--active {
          background: rgba(13, 148, 136, 0.10);
        }

        .event-social-journey__preference-check {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(148, 163, 184, 0.30);
          border-radius: 6px;
          color: rgba(203, 213, 225, 0.74);
          font-size: 13px;
          line-height: 1;
          font-weight: 950;
        }

        .event-social-journey__preference--active .event-social-journey__preference-check {
          border-color: rgba(20, 184, 166, 0.74);
          background: rgba(20, 184, 166, 0.16);
          color: #5eead4;
        }

        .event-social-journey__preference-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .event-social-journey__preference-copy strong {
          color: inherit;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 900;
        }

        .event-social-journey__preference-copy span {
          color: rgba(203, 213, 225, 0.60);
          font-size: 11px;
          line-height: 1.42;
        }

        .event-social-journey__group-preference {
          min-width: 0;
          min-height: 84px;
          padding: 12px 16px;
          display: grid;
          align-content: center;
          gap: 10px;
          border: 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
          border-right: 1px solid rgba(148, 163, 184, 0.12);
          background: transparent;
          color: #f8fafc;
        }

        .event-social-journey__group-preference--active {
          background: rgba(13, 148, 136, 0.10);
        }

        .event-social-journey__group-preference-heading {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .event-social-journey__group-preference-heading strong {
          min-width: 0;
          color: #f8fafc;
          font-size: 13px;
          line-height: 1.3;
          font-weight: 900;
        }

        .event-social-journey__group-preference-heading span {
          min-width: 0;
          overflow: hidden;
          color: rgba(203, 213, 225, 0.58);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .event-social-journey__group-preference-options {
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }

        .event-social-journey__group-preference-option {
          min-width: 0;
          min-height: 27px;
          padding: 5px 6px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 7px;
          background: rgba(15, 23, 42, 0.34);
          color: rgba(203, 213, 225, 0.78);
          font-size: 9px;
          line-height: 1.15;
          font-weight: 900;
          text-align: center;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .event-social-journey__group-preference-option:hover:not(:disabled) {
          border-color: rgba(20, 184, 166, 0.56);
          background: rgba(20, 184, 166, 0.08);
          color: #f8fafc;
        }

        .event-social-journey__group-preference-option--active {
          border-color: rgba(20, 184, 166, 0.72);
          background: rgba(20, 184, 166, 0.16);
          color: #5eead4;
        }

        .event-social-journey__feedback {
          margin: 0;
          padding: 13px 15px;
          border-left: 2px solid #14b8a6;
          background: rgba(20, 184, 166, 0.08);
          color: #99f6e4;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 800;
        }

        .event-social-journey__feedback--error {
          border-left-color: rgba(248, 113, 113, 0.82);
          background: rgba(127, 29, 29, 0.18);
          color: rgba(254, 202, 202, 0.96);
        }

        .event-quick-guide {
          width: min(1120px, calc(100vw - 48px));
          max-width: none;
          box-sizing: border-box;
          margin-left: 50%;
          transform: translateX(-50%);
          padding: clamp(18px, 2.4vw, 26px) !important;
          gap: 18px !important;
          border-color: rgba(0, 255, 190, 0.14) !important;
          background:
            linear-gradient(145deg, rgba(20, 20, 28, 0.96), rgba(8, 8, 13, 0.98)) !important;
        }

        .event-quick-guide__heading {
          display: grid;
          gap: 6px;
        }

        .event-quick-guide__title {
          margin: 0;
          color: #f7f7fb;
          font-size: clamp(24px, 3vw, 32px);
          line-height: 1.05;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .event-quick-guide__subtitle {
          margin: 0;
          max-width: 680px;
          color: rgba(220, 220, 230, 0.74);
          font-size: 14px;
          line-height: 1.55;
        }

        .event-quick-guide__subtitle strong {
          color: rgba(247, 247, 251, 0.92);
        }

        .event-quick-guide__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-top: 1px solid rgba(255, 255, 255, 0.10);
        }

        .event-quick-guide__item {
          min-width: 0;
          padding: 20px 22px 20px 0;
          display: grid;
          align-content: start;
          gap: 7px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .event-quick-guide__item:nth-child(odd) {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .event-quick-guide__item:nth-child(even) {
          padding-left: 22px;
        }

        .event-quick-guide__label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(210, 210, 222, 0.64);
          font-size: 11px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .event-quick-guide__label::before {
          content: "";
          width: 6px;
          height: 6px;
          flex: 0 0 6px;
          border-radius: 50%;
          background: #00e7b0;
          box-shadow: 0 0 14px rgba(0, 231, 176, 0.42);
        }

        .event-quick-guide__value {
          color: #f7f7fb;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 900;
        }

        .event-quick-guide__detail {
          margin: 0;
          color: rgba(220, 220, 230, 0.78);
          font-size: 13px;
          line-height: 1.5;
        }

        .event-quick-guide__note {
          margin: 0;
          color: rgba(196, 196, 208, 0.62);
          font-size: 12px;
          line-height: 1.5;
        }

        .event-quick-guide__link {
          width: fit-content;
          color: #38e8c5;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 900;
          text-decoration: none;
        }

        .event-quick-guide__link:hover {
          text-decoration: underline;
        }

        @media (max-width: 760px) {
          .event-persisted-radar {
            width: 100%;
            max-width: 100%;
            margin: 10px 0 0;
            transform: none;
            gap: 9px;
            padding: 12px 0;
            border-left: 0;
            border-right: 0;
            border-radius: 0;
          }

          .event-persisted-radar__heading {
            align-items: start;
            gap: 8px;
            padding: 0 14px;
          }

          .event-persisted-radar__copy {
            gap: 3px;
          }

          .event-persisted-radar__eyebrow {
            font-size: 8px;
            letter-spacing: 0.10em;
          }

          .event-persisted-radar__title {
            font-size: 18px;
            line-height: 1.05;
          }

          .event-persisted-radar__description {
            display: none;
          }

          .event-persisted-radar__total {
            gap: 2px;
          }

          .event-persisted-radar__total-value {
            font-size: 24px;
          }

          .event-persisted-radar__total-label {
            max-width: 64px;
            font-size: 8px;
            line-height: 1.1;
            text-align: right;
          }

          .event-persisted-radar__track {
            grid-template-rows: repeat(2, 62px);
            grid-auto-flow: column;
            grid-auto-columns: 126px;
            gap: 7px;
            padding: 0 14px;
            scroll-padding-inline: 14px;
          }

          .event-persisted-radar__item {
            min-height: 0;
            height: 62px;
            padding: 8px 9px;
            gap: 4px;
            border-radius: 12px;
            scroll-snap-stop: always;
          }

          .event-persisted-radar__item-copy {
            gap: 2px;
          }

          .event-persisted-radar__item-label {
            font-size: 8.5px;
            line-height: 1.12;
          }

          .event-persisted-radar__item-value {
            font-size: 20px;
          }

          .event-persisted-radar__preview {
            min-height: 16px;
          }

          .event-persisted-radar__avatar,
          .event-persisted-radar__more {
            width: 18px;
            height: 18px;
            margin-left: -4px;
            border-width: 1px;
            font-size: 7px;
          }

          .event-persisted-radar__empty {
            overflow: hidden;
            font-size: 7.5px;
            line-height: 1.1;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .event-persisted-radar__groups {
            padding: 0 14px;
            scroll-padding-inline: 14px;
          }

          .event-persisted-radar__notice {
            display: -webkit-box;
            overflow: hidden;
            padding: 0 14px;
            font-size: 8.5px;
            line-height: 1.3;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }

          .event-social-radar {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            margin-left: 0;
            margin-right: 0;
            transform: none;
            overflow: hidden;
          }

          .event-ticket-journey {
            --journey-inline-pad: 14px;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            margin: 10px 0 0;
            transform: none;
            padding: 13px 0 0;
            gap: 0;
            border-radius: 18px;
          }

          .event-ticket-journey__heading {
            grid-template-columns: minmax(0, 1fr);
            align-items: stretch;
            gap: 0;
            padding: 0 var(--journey-inline-pad) 10px;
          }

          .event-ticket-journey__copy {
            gap: 3px;
          }

          .event-ticket-journey__title {
            font-size: 20px;
            line-height: 1.04;
          }

          .event-ticket-journey__description,
          .event-ticket-journey__status {
            display: none;
          }

          .event-journey-mobile-nav {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(5, 7, 13, 0.38);
          }

          .event-journey-mobile-nav__button {
            position: relative;
            min-width: 0;
            min-height: 58px;
            padding: 8px 9px 7px;
            display: grid;
            align-content: center;
            gap: 2px;
            border: 0;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            background: transparent;
            color: #f8fafc;
            text-align: left;
            cursor: pointer;
          }

          .event-journey-mobile-nav__button:last-child {
            border-right: 0;
          }

          .event-journey-mobile-nav__button::before {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            left: 0;
            height: 2px;
            background: transparent;
          }

          .event-journey-mobile-nav__button--active {
            background:
              linear-gradient(
                180deg,
                rgba(20, 184, 166, 0.13),
                rgba(20, 184, 166, 0.035)
              );
          }

          .event-journey-mobile-nav__button--active::before {
            background: #14b8a6;
            box-shadow: 0 0 14px rgba(20, 184, 166, 0.38);
          }

          .event-journey-mobile-nav__label {
            color: rgba(203, 213, 225, 0.56);
            font-size: 8px;
            line-height: 1.15;
            font-weight: 950;
            letter-spacing: 0.09em;
            text-transform: uppercase;
          }

          .event-journey-mobile-nav__value {
            min-width: 0;
            overflow: hidden;
            color: #f8fafc;
            font-size: 11px;
            line-height: 1.22;
            font-weight: 950;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .event-journey-mobile-nav__action {
            color: rgba(203, 213, 225, 0.46);
            font-size: 7px;
            line-height: 1.1;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .event-journey-mobile-nav__button--active
            .event-journey-mobile-nav__label,
          .event-journey-mobile-nav__button--active
            .event-journey-mobile-nav__action {
            color: #5eead4;
          }

          .event-ticket-journey[data-mobile-panel="social"]
            .event-ticket-journey__actions,
          .event-ticket-journey[data-mobile-panel="preferences"]
            .event-ticket-journey__actions,
          .event-ticket-journey[data-mobile-panel="moment"]
            .event-social-journey {
            display: none;
          }

          .event-ticket-journey[data-mobile-panel="social"]
            .event-social-journey__preferences {
            display: none;
          }

          .event-ticket-journey[data-mobile-panel="preferences"]
            .event-social-journey__modes {
            display: none;
          }

          .event-ticket-journey__actions {
            margin-inline: 0;
            padding: 10px var(--journey-inline-pad) 12px;
            display: flex;
            gap: 6px;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scroll-snap-type: inline mandatory;
            scroll-padding-inline: var(--journey-inline-pad);
            border-top: 0;
          }

          .event-ticket-journey__action {
            flex: 0 0 132px;
            width: auto;
            min-height: 58px;
            padding: 9px 9px;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 7px;
            scroll-snap-align: start;
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 12px;
          }

          .event-ticket-journey__action:last-child {
            border-right: 1px solid rgba(255, 255, 255, 0.09);
          }

          .event-ticket-journey__action-index {
            align-self: center;
            font-size: 9px;
          }

          .event-ticket-journey__action-copy {
            gap: 3px;
          }

          .event-ticket-journey__action-title {
            font-size: 12px;
            line-height: 1.22;
          }

          .event-ticket-journey__action-state {
            font-size: 8px;
          }

          .event-ticket-journey__action-arrow {
            display: none;
          }

          .event-social-journey {
            margin-inline: 0;
            padding: 10px var(--journey-inline-pad) 12px;
            gap: 8px;
            border-top: 0;
            background: transparent;
          }

          .event-social-journey__heading {
            display: none;
          }

          .event-social-journey__modes {
            display: flex;
            gap: 7px;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scroll-snap-type: inline mandatory;
            scroll-padding-inline: var(--journey-inline-pad);
            border-top: 0;
            border-bottom: 0;
          }

          .event-social-journey__mode {
            flex: 0 0 132px;
            min-height: 72px;
            padding: 10px 9px;
            gap: 4px;
            scroll-snap-align: start;
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 12px;
          }

          .event-social-journey__mode:last-child {
            border-right: 1px solid rgba(148, 163, 184, 0.16);
          }

          .event-social-journey__mode-title {
            font-size: 12px;
            line-height: 1.25;
          }

          .event-social-journey__mode-detail {
            display: none;
          }

          .event-social-journey__mode-state {
            align-self: end;
            font-size: 8px;
          }

          .event-social-journey__preferences {
            gap: 0;
          }

          .event-social-journey__preferences-heading {
            display: none;
          }

          .event-social-journey__preference-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            border-top: 0;
            border-bottom: 0;
          }

          .event-social-journey__preference,
          .event-social-journey__preference:nth-child(even),
          .event-social-journey__preference:nth-last-child(-n + 2),
          .event-social-journey__group-preference,
          .event-social-journey__group-preference:nth-child(even),
          .event-social-journey__group-preference:nth-last-child(-n + 2) {
            min-height: 58px;
            padding: 9px 9px;
            border: 1px solid rgba(148, 163, 184, 0.14);
            border-radius: 12px;
          }

          .event-social-journey__preference {
            grid-template-columns: 20px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
          }

          .event-social-journey__group-preference {
            align-content: center;
            gap: 6px;
          }

          .event-social-journey__preference-check {
            width: 20px;
            height: 20px;
            border-radius: 5px;
            font-size: 12px;
          }

          .event-social-journey__preference-copy {
            gap: 0;
          }

          .event-social-journey__preference-copy strong {
            font-size: 11px;
            line-height: 1.25;
          }

          .event-social-journey__preference-copy span {
            display: none;
          }

          .event-social-journey__group-preference-heading {
            gap: 6px;
          }

          .event-social-journey__group-preference-heading strong {
            font-size: 10px;
            line-height: 1.2;
          }

          .event-social-journey__group-preference-heading span {
            max-width: 72px;
            font-size: 7px;
          }

          .event-social-journey__group-preference-options {
            display: flex;
            gap: 4px;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
          }

          .event-social-journey__group-preference-options::-webkit-scrollbar {
            display: none;
          }

          .event-social-journey__group-preference-option {
            flex: 0 0 auto;
            min-width: 58px;
            min-height: 23px;
            padding: 4px 6px;
            border-radius: 6px;
            font-size: 7.5px;
            line-height: 1.1;
            scroll-snap-align: start;
          }

          .event-social-journey__feedback {
            margin-top: 2px;
            padding: 9px 10px;
            font-size: 10px;
            line-height: 1.35;
          }

          .event-quick-guide {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            margin-left: 0;
            margin-right: 0;
            transform: none;
            padding: 18px 16px !important;
            gap: 16px !important;
            overflow: hidden;
          }

          .event-quick-guide__heading,
          .event-quick-guide__grid,
          .event-quick-guide__item,
          .event-quick-guide__title,
          .event-quick-guide__subtitle,
          .event-quick-guide__value,
          .event-quick-guide__detail,
          .event-quick-guide__note,
          .event-quick-guide__link {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .event-quick-guide__title {
            font-size: 23px;
            line-height: 1.12;
          }

          .event-quick-guide__subtitle {
            font-size: 13px;
            line-height: 1.5;
          }

          .event-quick-guide__grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .event-quick-guide__item,
          .event-quick-guide__item:nth-child(even) {
            padding: 17px 0;
          }

          .event-quick-guide__item:nth-child(odd) {
            border-right: 0;
          }

          .event-quick-guide__label {
            font-size: 10px;
          }

          .event-quick-guide__value {
            font-size: 17px;
            line-height: 1.25;
          }

          .event-quick-guide__detail,
          .event-quick-guide__note {
            font-size: 13px;
          }

          .event-quick-guide__item:last-child {
            border-bottom: 0;
          }
        }

        @media (max-width: 760px) {
          .event-hero {
            width: auto;
            margin-left: 0;
            transform: none;
            grid-template-columns: 1fr;
            min-height: 0;
            background-position: center 24%;
          }

          .event-hero__content {
            min-height: 218px;
            padding: 16px 16px 13px;
            gap: 7px;
            align-content: end;
          }

          .event-hero__meta {
            font-size: 8px;
            letter-spacing: 0.065em;
          }

          .event-hero__title {
            display: -webkit-box;
            max-width: 100%;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-size: clamp(27px, 7.8vw, 32px);
            line-height: 0.98;
            letter-spacing: -0.04em;
          }

          .event-hero__description {
            display: -webkit-box;
            max-width: 100%;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            font-size: 12px;
            line-height: 1.3;
          }

          .event-hero__actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 8px;
          }

          .event-hero__action-primary,
          .event-hero__action-secondary {
            width: 100%;
            min-height: 34px;
            padding: 0 10px;
            border-radius: 10px;
            font-size: 10px;
          }

          .event-hero__action-link {
            width: fit-content;
            padding: 6px 0;
            font-size: 10px;
            white-space: nowrap;
          }

          .event-hero__stats {
            display: flex;
            gap: 7px;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scroll-snap-type: inline mandatory;
            scroll-padding-inline: 14px;
            border-top: 1px solid rgba(255,255,255,0.10);
            border-left: 0;
            padding: 8px 14px 10px;
            background: linear-gradient(180deg, rgba(8,8,13,0.72), rgba(8,8,13,0.94));
          }

          .event-hero__stat,
          .event-hero__stat:nth-child(2n),
          .event-hero__stat:nth-last-child(-n + 2) {
            flex: 0 0 126px;
            min-height: 62px;
            padding: 8px 10px;
            gap: 5px;
            align-content: space-between;
            scroll-snap-align: start;
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 12px;
            background: rgba(13, 15, 22, 0.78);
          }

          .event-hero__stat-copy {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 8px;
          }

          .event-hero__stat-label {
            max-width: 82px;
            font-size: 9px;
            line-height: 1.15;
          }

          .event-hero__stat-value {
            font-size: 20px;
          }

          .event-hero__stat-preview {
            min-height: 18px;
          }

          .event-hero__stat-empty {
            font-size: 8px;
          }

          .event-hero__stat-avatar,
          .event-hero__stat-more {
            width: 20px;
            height: 20px;
            border-width: 1px;
            font-size: 7px;
          }

          .event-hero__stat-avatar,
          .event-hero__stat-more {
            width: 24px;
            height: 24px;
            margin-left: -6px;
            border-width: 1px;
            font-size: 9px;
          }

          .event-hero__stat-empty {
            font-size: 10px;
          }

          .event-hero__tribes {
            grid-column: auto;
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 15px 18px 18px;
          }

          .event-hero__tribes-heading {
            gap: 2px;
          }

          .event-hero__tribes-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .event-hero__tribe {
            padding: 9px 10px 9px 0;
            border-left: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .event-hero__tribe:nth-child(even) {
            padding-left: 10px;
            border-left: 1px solid rgba(255,255,255,0.07);
          }

          .event-hero__tribe-name {
            overflow: visible;
            text-overflow: clip;
            white-space: normal;
          }
        }

        .event-hero > .event-quick-guide {
          grid-column: 1 / -1;
          width: 100%;
          min-width: 0;
          max-width: none;
          margin: 0;
          transform: none;
          padding: 8px clamp(16px, 2vw, 24px) 9px !important;
          gap: 5px !important;
          border: 0 !important;
          border-top: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 0 !important;
          background:
            linear-gradient(90deg, rgba(8,8,13,0.90), rgba(12,10,22,0.84)) !important;
          overflow: hidden;
        }

        .event-hero > .event-quick-guide .event-quick-guide__heading {
          display: flex;
          align-items: baseline;
          gap: 10px;
          min-width: 0;
        }

        .event-hero > .event-quick-guide .event-quick-guide__title {
          flex: 0 0 auto;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .event-hero > .event-quick-guide .event-quick-guide__subtitle {
          min-width: 0;
          max-width: none;
          font-size: 11px;
          line-height: 1.35;
        }

        .event-hero > .event-quick-guide .event-quick-guide__grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-top: 0;
        }

        .event-hero > .event-quick-guide .event-quick-guide__item,
        .event-hero > .event-quick-guide .event-quick-guide__item:nth-child(even),
        .event-hero > .event-quick-guide .event-quick-guide__item:nth-child(odd) {
          min-width: 0;
          padding: 5px 10px;
          gap: 2px;
          border: 0;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .event-hero > .event-quick-guide .event-quick-guide__item:first-child {
          padding-left: 0;
          border-left: 0;
        }

        .event-hero > .event-quick-guide .event-quick-guide__label {
          font-size: 8px;
          letter-spacing: 0.065em;
        }

        .event-hero > .event-quick-guide .event-quick-guide__label::before {
          width: 4px;
          height: 4px;
          flex-basis: 4px;
        }

        .event-hero > .event-quick-guide .event-quick-guide__value {
          font-size: 13px;
          line-height: 1.25;
        }

        .event-hero > .event-quick-guide .event-quick-guide__detail,
        .event-hero > .event-quick-guide .event-quick-guide__note,
        .event-hero > .event-quick-guide .event-quick-guide__link {
          font-size: 9px;
          line-height: 1.25;
        }

        .event-hero > .event-quick-guide .event-quick-guide__detail,
        .event-hero > .event-quick-guide .event-quick-guide__note {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .event-hero > .event-quick-guide .event-quick-guide__note {
          display: none;
        }

        .event-quick-guide__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 760px) {
          .event-hero > .event-quick-guide {
            padding: 5px 14px 7px !important;
            gap: 3px !important;
          }

          .event-hero > .event-quick-guide .event-quick-guide__heading {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0;
          }

          .event-hero > .event-quick-guide .event-quick-guide__title {
            font-size: 7px;
            line-height: 1.1;
            letter-spacing: 0.075em;
          }

          .event-hero > .event-quick-guide .event-quick-guide__subtitle {
            display: none;
          }

          .event-hero > .event-quick-guide .event-quick-guide__grid {
            display: flex;
            gap: 7px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: 0;
            scrollbar-width: none;
            padding: 0 0 1px;
          }

          .event-hero > .event-quick-guide .event-quick-guide__grid::-webkit-scrollbar {
            display: none;
          }

          .event-hero > .event-quick-guide .event-quick-guide__item,
          .event-hero > .event-quick-guide .event-quick-guide__item:nth-child(even),
          .event-hero > .event-quick-guide .event-quick-guide__item:nth-child(odd),
          .event-hero > .event-quick-guide .event-quick-guide__item:first-child {
            flex: 0 0 126px;
            width: 126px;
            min-height: 50px;
            padding: 5px 6px;
            gap: 1px;
            align-content: center;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 8px;
            background: rgba(13,15,22,0.72);
            scroll-snap-align: start;
            scroll-snap-stop: always;
          }

          .event-hero > .event-quick-guide .event-quick-guide__label {
            font-size: 6px;
            line-height: 1.05;
            letter-spacing: 0.055em;
          }

          .event-hero > .event-quick-guide .event-quick-guide__label::before {
            width: 3px;
            height: 3px;
            flex-basis: 3px;
          }

          .event-hero > .event-quick-guide .event-quick-guide__value {
            display: -webkit-box;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-size: 8.5px;
            line-height: 1.12;
          }

          .event-hero > .event-quick-guide .event-quick-guide__detail,
          .event-hero > .event-quick-guide .event-quick-guide__note,
          .event-hero > .event-quick-guide .event-quick-guide__link {
            display: none;
          }
        }
      `}</style>
      <section
        className="event-hero"
        data-event-image-source={heroImageSource}
        data-event-image-layout={
          heroImageSource === "canonical" ? "sharp_right_poster" : "cover"
        }
        style={heroStyle(heroImage, heroImageSource)}
      >
        <div className="event-hero__content">
          <p className="event-hero__meta">{heroMeta}</p>

          <h1 className="event-hero__title">{heroTitle}</h1>

          <p className="event-hero__description">
            Conecte-se com Clubbers, caronas e encontros deste evento.
          </p>

          <div className="event-hero__actions">
            {hasContent(activePartnerTicketUrl) ? (
              <TicketPurchaseAction
                eventGroupId={eventGroup?.group_id || null}
                href={activePartnerTicketUrl}
                label={activePartnerTicketLabel}
                className="event-hero__action-primary"
              />
            ) : null}

            {hasContent(heroOfficialUrl) ? (
              <a
                href={heroOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="event-hero__action-secondary"
              >
                Ver evento oficial
              </a>
            ) : null}

            <Link
              href={heroReturnHref}
              className="event-hero__action-link"
            >
              {heroReturnLabel}
            </Link>
          </div>

        </div>

        <div className="event-hero__stats" aria-label="Resumo social do evento">
          {socialStats.map((stat) => (
            <a
              className="event-hero__stat"
              href={stat.href}
              key={stat.key}
            >
              <div className="event-hero__stat-copy">
                <span className="event-hero__stat-label">{stat.label}</span>
                <strong className="event-hero__stat-value">{stat.count}</strong>
              </div>

              <div
                className="event-hero__stat-preview"
                aria-label={
                  stat.count > 0
                    ? `Prévia de ${stat.label.toLowerCase()}`
                    : stat.emptyLabel
                }
              >
                {stat.members.slice(0, 3).map((member) => {
                  const memberInitial =
                    normalizeText(member.label || member.slug)
                      .charAt(0)
                      .toUpperCase() || "C";

                  return (
                    <span
                      className="event-hero__stat-avatar"
                      key={`${stat.key}-${member.user_id}`}
                      title={member.label}
                      style={
                        member.club_photo_url
                          ? {
                              backgroundImage: `url("${member.club_photo_url}")`,
                            }
                          : undefined
                      }
                    >
                      {member.club_photo_url ? "" : memberInitial}
                    </span>
                  );
                })}

                {stat.count > 3 ? (
                  <span className="event-hero__stat-more">
                    +{stat.count - 3}
                  </span>
                ) : null}

                {stat.count === 0 ? (
                  <span className="event-hero__stat-empty">
                    {stat.emptyLabel}
                  </span>
                ) : null}
              </div>
            </a>
          ))}
        </div>

        <section
          className="event-quick-guide"
          aria-label="Guia rápido do evento"
        >
          <div className="event-quick-guide__heading">
            <h2 className="event-quick-guide__title">
              Guia rápido
            </h2>

            <p className="event-quick-guide__subtitle">
              Informações essenciais antes de sair de casa.
            </p>
          </div>

          <div className="event-quick-guide__grid">
            <div className="event-quick-guide__item">
              <span className="event-quick-guide__label">
                Clima
              </span>

              <strong className="event-quick-guide__value">
                {normalizeText(eventGroup?.weather_temperature) || "A confirmar"}
              </strong>

              <p className="event-quick-guide__detail">
                {normalizeText(eventGroup?.weather_summary) ||
                  "Previsão ainda não cadastrada."}
              </p>

              <p className="event-quick-guide__note">
                {normalizeText(eventGroup?.weather_rain_alert) ||
                  "Sem alerta de chuva cadastrado."}
              </p>
            </div>

            <div className="event-quick-guide__item">
              <span className="event-quick-guide__label">
                Ingresso
              </span>

              <strong className="event-quick-guide__value">
                {ticketGuideValue}
              </strong>

              <p className="event-quick-guide__detail">
                {ticketGuideDetail}
              </p>

            </div>

            <div className="event-quick-guide__item">
              <span className="event-quick-guide__label">
                Entrada
              </span>

              <strong className="event-quick-guide__value">
                Documento em mãos
              </strong>

              <p className="event-quick-guide__detail">
                {attendees.some(
                  (member) => member.event_requires_student_document
                )
                  ? "Leve documento e comprovante de estudante."
                  : "Documento com foto sempre em mãos."}
              </p>
            </div>

            <div className="event-quick-guide__item">
              <span className="event-quick-guide__label">
                Antes de sair
              </span>

              <strong className="event-quick-guide__value">
                Última conferência
              </strong>

              <p className="event-quick-guide__detail">
                {attendees.find((member) =>
                  hasContent(member.event_preparation_notes)
                )?.event_preparation_notes ||
                  normalizeText(eventGroup?.preparation_note) ||
                  "Confira ingresso, documento, rota, carona e ponto de encontro antes de sair."}
              </p>
            </div>
          </div>
        </section>

        {topTribes.length > 0 ? (
          <div
            className="event-hero__tribes"
            aria-label="Tribos dominantes do evento"
          >
            <div className="event-hero__tribes-heading">
              <strong className="event-hero__tribes-title">
                Tribos dominantes
              </strong>

              <span className="event-hero__tribes-subtitle">
                Afinidades mais presentes
              </span>
            </div>

            <div className="event-hero__tribes-list">
              {topTribes.map(([tribe, count]) => (
                <div className="event-hero__tribe" key={tribe}>
                  <span
                    className="event-hero__tribe-dot"
                    aria-hidden="true"
                  />

                  <strong className="event-hero__tribe-name">
                    {tribe}
                  </strong>

                  <span className="event-hero__tribe-count">
                    {count === 1 ? "1 Clubber" : `${count} Clubbers`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {eventGroup?.group_id ? (
        <section
          id="event-social-radar-summary"
          className="event-persisted-radar"
          aria-label="Estados sociais compartilhados no evento"
        >
          <div className="event-persisted-radar__heading">
            <div className="event-persisted-radar__copy">
              <span className="event-persisted-radar__eyebrow">
                Radar social real
              </span>

              <h2 className="event-persisted-radar__title">
                Como as pessoas estão se organizando
              </h2>

              <p className="event-persisted-radar__description">
                Estados compartilhados por Clubbers neste evento. O acesso
                social independe da compra do ingresso.
              </p>
            </div>

            <div
              className="event-persisted-radar__total"
              aria-label={`${socialRadar.counts.active_participants} participantes sociais ativos`}
            >
              <strong className="event-persisted-radar__total-value">
                {socialRadar.ok
                  ? socialRadar.counts.active_participants
                  : "—"}
              </strong>

              <span className="event-persisted-radar__total-label">
                {socialRadar.ok
                  ? "participantes sociais"
                  : "radar indisponível"}
              </span>
            </div>
          </div>

          {socialRadar.ok ? (
            <div className="event-persisted-radar__track">
              {persistedSocialStats.map((stat) => (
                <a
                  href="#event-social-radar"
                  className="event-persisted-radar__item"
                  key={stat.key}
                  aria-label={`${stat.label}: ${stat.count}. Abrir radar social.`}
                >
                  <div className="event-persisted-radar__item-copy">
                    <span className="event-persisted-radar__item-label">
                      {stat.label}
                    </span>

                    <strong className="event-persisted-radar__item-value">
                      {stat.count}
                    </strong>
                  </div>

                  <div
                    className="event-persisted-radar__preview"
                    aria-label={
                      stat.count > 0
                        ? `Prévia de ${stat.label.toLowerCase()}`
                        : stat.emptyLabel
                    }
                  >
                    {stat.members.slice(0, 3).map((member) => {
                      const memberInitial =
                        normalizeText(member.label || member.slug)
                          .charAt(0)
                          .toUpperCase() || "C";

                      return (
                        <span
                          className="event-persisted-radar__avatar"
                          key={`${stat.key}-${member.user_id}`}
                          title={member.label}
                          style={
                            member.club_photo_url
                              ? {
                                  backgroundImage: `url("${member.club_photo_url}")`,
                                }
                              : undefined
                          }
                        >
                          {member.club_photo_url ? "" : memberInitial}
                        </span>
                      );
                    })}

                    {stat.count > 3 ? (
                      <span className="event-persisted-radar__more">
                        +{stat.count - 3}
                      </span>
                    ) : null}

                    {stat.count === 0 ? (
                      <span className="event-persisted-radar__empty">
                        {stat.emptyLabel}
                      </span>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="event-persisted-radar__notice">
              O radar social não pôde ser carregado agora. A página continua
              disponível sem expor dados incompletos.
            </p>
          )}

          {socialRadar.ok && visibleGroupPreferenceStats.length > 0 ? (
            <div
              className="event-persisted-radar__groups"
              aria-label="Preferências de grupo agregadas"
            >
              <span className="event-persisted-radar__groups-label">
                Preferência de grupo
              </span>

              {visibleGroupPreferenceStats.map((item) => (
                <span
                  className="event-persisted-radar__group"
                  key={item.key}
                >
                  {item.label}
                  <strong>{item.count}</strong>
                </span>
              ))}
            </div>
          ) : null}

          {socialRadar.ok ? (
            <p className="event-persisted-radar__notice">
              Preferências de composição de grupo aparecem somente de forma
              agregada e a partir de três pessoas. Localização precisa e dados
              privados não são publicados.
              {socialRadar.truncated
                ? " A leitura atingiu o limite operacional desta fundação."
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {eventGroup?.group_id ? (
        <>
          <TicketIntentButton eventGroupId={eventGroup.group_id} />
          <TicketNetworkAvailability eventGroupId={eventGroup.group_id} />
        </>
      ) : null}



      {eventGroup?.group_id ? (
        <StructuredRideMeetHub
          eventGroupId={eventGroup.group_id}
          eventReturnTo={eventReturnPath}
          isAuthenticated={Boolean(authenticatedUser)}
        />
      ) : null}

      {attendees.length === 0 ? (
        <section id="event-social-radar" style={sectionStyle("purple")}>
          <div style={emptyCardStyle()}>
            <strong style={{ display: "block", marginBottom: 10 }}>
              Ainda não há Clubbers vinculados a este evento.
            </strong>
            <div>
              Participantes, caronas e encontros aparecerão aqui conforme forem informados.
            </div>
          </div>
        </section>
      ) : (
        <>
          <section
            id="event-social-radar"
            className="event-social-radar"
            style={sectionStyle("purple")}
          >
            <SectionTitle
              icon="●"
              title="Quem vai para este evento"
              subtitle="Encontre Clubbers por afinidade musical, localização e intenção de conexão."
              actionLabel=""
            />

            <EventParticipantsFilter
              attendees={attendees}
              eventReturnTo={eventReturnPath}
              officialEventUrl={heroOfficialUrl}
            />
          </section>

          <div id="event-rides-meets">
            <RideMeetCards
              rideMembers={rideMembers}
              meetMembers={meetMembers}
              eventReturnTo={eventReturnPath}
              officialEventUrl={heroOfficialUrl}
            />
          </div>
        </>
      )}
    </main>
  );
}
