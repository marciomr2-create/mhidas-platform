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
import TicketIntentButton from "./TicketIntentButton";
import {
  readCanonicalPublicEventBySlug,
  type CanonicalPublicEventReadResult,
} from "@/app/api/official-events/canonical/_shared/canonicalPublicEventReadFoundation";

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
};

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
};

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

function heroStyle(heroImage: string) {
  return {
    marginTop: 8,
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundImage: heroImage
      ? `linear-gradient(90deg, rgba(5,5,8,0.96) 0%, rgba(5,5,8,0.84) 48%, rgba(5,5,8,0.34) 100%), linear-gradient(180deg, rgba(5,5,8,0.12) 0%, rgba(5,5,8,0.78) 100%), url(${heroImage})`
      : "linear-gradient(135deg, rgba(17,17,24,0.98), rgba(36,28,68,0.84), rgba(0,78,70,0.54))",
    backgroundSize: "cover",
    backgroundPosition: "center 34%",
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
    `${matchedMembers.length} ${
      matchedMembers.length === 1
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

  const commercialOfficialLinkBlocked =
    canonicalOfficialIsCommercial || confirmedOfficialIsCommercial;

  const canonicalValidationLabel = canonicalEvent
    ? getCanonicalValidationLabel(canonicalEvent.validation_status)
    : "";

  const memberTicketType =
    matchedMembers.find((member) => hasContent(member.event_ticket_type))
      ?.event_ticket_type || "";

  // Links comerciais de ingresso exigem autorização específica do evento
  // e da ticketeira. Até essa autorização existir, o guia direciona apenas
  // para o canal oficial do evento e nunca ativa ticket_url automaticamente.
  const ticketGuideValue = heroOfficialUrl
    ? "Consulte no evento oficial"
    : commercialOfficialLinkBlocked
      ? "Canal de vendas a confirmar"
      : memberTicketType || "A confirmar";

  const ticketGuideDetail = heroOfficialUrl
    ? "Confirme ingresso, regras e disponibilidade no canal oficial do evento."
    : commercialOfficialLinkBlocked
      ? "Aguardando o envio de um link autorizado pelo evento ou pela ticketeira."
      : matchedMembers.some((member) => member.event_requires_food_kg)
        ? "Leve 1 kg de alimento não perecível."
        : "Confira o ingresso antes de sair.";

  const attendees = matchedMembers;

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

  const rideOfferMembers = matchedMembers.filter(
    (member) => member.ride_status === "offer" || member.ride_status === "both"
  );

  const rideNeedMembers = matchedMembers.filter(
    (member) => member.ride_status === "need" || member.ride_status === "both"
  );

  const rideMembers = dedupeStrings([
    ...rideOfferMembers.map((member) => member.user_id),
    ...rideNeedMembers.map((member) => member.user_id),
  ])
    .map((userId) => matchedMembers.find((member) => member.user_id === userId))
    .filter(Boolean) as EventMember[];

  const meetMembers = matchedMembers.filter(
    (member) =>
      member.meet_status === "host" ||
      member.meet_status === "join" ||
      member.meet_status === "both"
  );

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

        .event-hero__ticket > section {
          margin-top: 2px !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .event-hero__ticket > section > div {
          flex-direction: row !important;
          align-items: center !important;
        }

        .event-hero__ticket button {
          width: auto !important;
          min-width: 250px !important;
          border: 1px solid rgba(0, 255, 190, 0.32) !important;
          border-radius: 14px !important;
          background: linear-gradient(135deg, rgba(0, 184, 153, 0.98), rgba(92, 70, 190, 0.92)) !important;
          color: #ffffff !important;
          box-shadow: 0 14px 34px rgba(0, 184, 153, 0.18) !important;
        }

        .event-hero__stats {
          align-self: stretch;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-left: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(180deg, rgba(8,8,13,0.34), rgba(8,8,13,0.78));
          backdrop-filter: blur(8px);
        }

        .event-hero__stat {
          display: grid;
          align-content: end;
          gap: 8px;
          min-height: 148px;
          padding: 28px;
          border-right: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
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
          font-size: 11px;
          line-height: 1.35;
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
          font-size: 13px;
          line-height: 1.25;
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

        .event-social-radar {
          width: min(1120px, calc(100vw - 48px));
          max-width: none;
          box-sizing: border-box;
          margin-left: 50%;
          transform: translateX(-50%);
          padding: clamp(18px, 2.4vw, 26px) !important;
          gap: 18px !important;
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
            background-position: center top;
          }

          .event-hero__content {
            min-height: 470px;
            padding: 24px 18px 22px;
            gap: 15px;
          }

          .event-hero__title {
            font-size: clamp(38px, 13vw, 54px);
          }

          .event-hero__description {
            font-size: 16px;
            line-height: 1.52;
          }

          .event-hero__actions {
            align-items: stretch;
          }

          .event-hero__action-secondary {
            width: 100%;
          }

          .event-hero__action-link {
            width: fit-content;
          }

          .event-hero__ticket > section > div {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .event-hero__ticket button {
            width: 100% !important;
            min-width: 0 !important;
          }

          .event-hero__stats {
            border-top: 1px solid rgba(255,255,255,0.10);
            border-left: 0;
          }

          .event-hero__stat {
            min-height: 112px;
            padding: 18px;
          }

          .event-hero__stat-value {
            font-size: 32px;
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
      `}</style>
      <section
        className="event-hero"
        data-event-image-source={heroImageSource}
        style={heroStyle(heroImage)}
      >
        <div className="event-hero__content">
          <p className="event-hero__meta">{heroMeta}</p>

          <h1 className="event-hero__title">{heroTitle}</h1>

          <p className="event-hero__description">
            Conecte-se com Clubbers, caronas e encontros deste evento.
          </p>

          <div className="event-hero__actions">
            {hasContent(heroOfficialUrl) ? (
              <a
                href={heroOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="event-hero__action-secondary"
              >
                Abrir evento oficial
              </a>
            ) : null}

            <Link
              href={heroReturnHref}
              className="event-hero__action-link"
            >
              {heroReturnLabel}
            </Link>
          </div>

          {eventGroup?.group_id ? (
            <div className="event-hero__ticket">
              <TicketIntentButton eventGroupId={eventGroup.group_id} compact />
            </div>
          ) : null}
        </div>

        <div className="event-hero__stats" aria-label="Resumo social do evento">
          <div className="event-hero__stat">
            <span className="event-hero__stat-label">Perfis no evento</span>
            <strong className="event-hero__stat-value">{attendees.length}</strong>
          </div>

          <div className="event-hero__stat">
            <span className="event-hero__stat-label">Oferta de carona</span>
            <strong className="event-hero__stat-value">
              {rideOfferMembers.length}
            </strong>
          </div>

          <div className="event-hero__stat">
            <span className="event-hero__stat-label">Busca por carona</span>
            <strong className="event-hero__stat-value">
              {rideNeedMembers.length}
            </strong>
          </div>

          <div className="event-hero__stat">
            <span className="event-hero__stat-label">Encontros ativos</span>
            <strong className="event-hero__stat-value">{meetMembers.length}</strong>
          </div>
        </div>

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


      <section
        className="event-quick-guide"
        style={sectionStyle("green")}
      >
        <div className="event-quick-guide__heading">
          <h2 className="event-quick-guide__title">
            Guia rápido do evento
          </h2>

          <p className="event-quick-guide__subtitle">
            <strong>Antes de sair de casa.</strong>{" "}
            Um resumo simples para chegar preparado, sem surpresa na entrada.
          </p>
        </div>

        <div className="event-quick-guide__grid">
          <div className="event-quick-guide__item">
            <span className="event-quick-guide__label">
              Clima previsto
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

            {heroOfficialUrl ? (
              <a
                href={heroOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="event-quick-guide__link"
              >
                Abrir evento oficial
              </a>
            ) : null}

            {canonicalValidationLabel ? (
              <p className="event-quick-guide__note">
                {canonicalValidationLabel}
              </p>
            ) : null}
          </div>

          <div className="event-quick-guide__item">
            <span className="event-quick-guide__label">
              Entrada
            </span>

            <strong className="event-quick-guide__value">
              Documento em mãos
            </strong>

            <p className="event-quick-guide__detail">
              {matchedMembers.some(
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
              {matchedMembers.find((member) =>
                hasContent(member.event_preparation_notes)
              )?.event_preparation_notes ||
                normalizeText(eventGroup?.preparation_note) ||
                "Confira ingresso, documento, rota, carona e ponto de encontro antes de sair."}
            </p>
          </div>
        </div>
      </section>

      {matchedMembers.length === 0 ? (
        <section style={sectionStyle("purple")}>
          <div style={emptyCardStyle()}>
            <strong style={{ display: "block", marginBottom: 10 }}>
              Nenhum perfil encontrado para este evento.
            </strong>
            <div style={{ marginBottom: 12 }}>
              Isso normalmente acontece quando o slug digitado não corresponde exatamente ao nome cadastrado em:
            </div>
            <div style={{ lineHeight: 1.8 }}>
              • Próximos eventos
              <br />
              • Evento da carona
              <br />
              • Evento do encontro
            </div>
          </div>
        </section>
      ) : (
        <>
          <section
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

          <RideMeetCards
            rideMembers={rideMembers}
            meetMembers={meetMembers}
            eventReturnTo={eventReturnPath}
            officialEventUrl={heroOfficialUrl}
          />
        </>
      )}
    </main>
  );
}