// src/app/event/[event_slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { ReactNode } from "react";
import Link from "next/link";
import { createPublicClient } from "@/utils/supabase/public";
import EventParticipantsFilter from "./EventParticipantsFilter";
import RideMeetCards from "./RideMeetCards";
import TicketIntentButton from "./TicketIntentButton";

type PageProps = {
  params: Promise<{ event_slug: string }>;
  searchParams?: Promise<{ city?: string; state?: string; region?: string }>;
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
    padding: 14,
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.14)",
    backgroundImage: heroImage
      ? `linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.88) 100%), url(${heroImage})`
      : "linear-gradient(135deg, rgba(125,92,255,0.20), rgba(0,255,190,0.05))",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "grid",
    gap: 10,
    minHeight: 260,
    alignContent: "end",
    boxShadow: "0 22px 54px rgba(0,0,0,0.30)",
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

export default async function EventPage({ params, searchParams }: PageProps) {
  const { event_slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const eventSlug = normalizeText(event_slug).toLowerCase();
  const selectedCity = normalizeText(sp?.city);
  const selectedState = normalizeText(sp?.state).toUpperCase();
  const selectedRegion = normalizeText(sp?.region);

  const supabase = createPublicClient();

  const { data: cardsData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,status,is_published")
    .eq("status", "active")
    .eq("is_published", true);

  const cards = ((cardsData ?? []) as CardRow[]).filter((card) => hasContent(card.slug));
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

  const heroTitle =
    normalizeText(eventGroup?.event_name) ||
    normalizeText(eventGroup?.title) ||
    eventTitle;

  const heroImage =
    normalizeText(eventGroup?.event_image_url) ||
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1800&auto=format&fit=crop";

  const eventGroupOfficialStatus = normalizeText(eventGroup?.official_status);
  const confirmedOfficialUrl =
    eventGroupOfficialStatus === "confirmed" && isHttpUrl(eventGroup?.official_url)
      ? normalizeText(eventGroup?.official_url)
      : "";

  const heroOfficialUrl = confirmedOfficialUrl;

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
    const tribeSources = [
      ...((member.favorite_genres || []).map((item) => `Vertente: ${item}`)),
      ...((member.favorite_clubs || []).map((item) => `Club: ${item}`)),
      ...((member.favorite_events || []).map((item) => `Evento: ${item}`)),
      hasContent(member.city_base) ? `Cidade: ${member.city_base}` : "",
    ];

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
      `}</style>
      <section style={heroStyle(heroImage)}>
        <div style={{ display: "grid", gap: 18, maxWidth: 720 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={badgeStyle()}>PLATAFORMA MHIDAS do evento</span>
            <span style={badgeStyle()}>{matchedMembers.length} participantes mapeados</span>
          </div>

          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 0.96, fontWeight: 950 }}>
            {heroTitle}
          </h1>

          <p style={{ margin: 0, opacity: 0.92, lineHeight: 1.7, maxWidth: 680, fontSize: 18 }}>
            Este evento funciona como ponto de conexão entre perfis Club,
            caronas e encontros já cadastrados no ecossistema USECLUBBERS.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
            {hasContent(heroOfficialUrl) ? (
              <a
                href={heroOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...actionButtonStyle(true),
                  width: "fit-content",
                  padding: "15px 20px",
                }}
              >
                Abrir evento oficial
              </a>
            ) : null}

            <Link
              href="/network"
              style={{
                ...actionButtonStyle(),
                width: "fit-content",
                padding: "15px 20px",
              }}
            >
              Voltar ao ecossistema
            </Link>
          </div>

          {eventGroup?.group_id ? (
            <TicketIntentButton eventGroupId={eventGroup.group_id} compact />
          ) : null}
        </div>

        <div style={statsGridStyle()}>
          <div style={statCardStyle("purple")}>
            <span style={{ opacity: 0.84 }}>Perfis no evento</span>
            <strong style={{ fontSize: 34 }}>{attendees.length}</strong>
          </div>

          <div style={statCardStyle("green")}>
            <span style={{ opacity: 0.84 }}>Oferta de carona</span>
            <strong style={{ fontSize: 34 }}>{rideOfferMembers.length}</strong>
          </div>

          <div style={statCardStyle("blue")}>
            <span style={{ opacity: 0.84 }}>Busca por carona</span>
            <strong style={{ fontSize: 34 }}>{rideNeedMembers.length}</strong>
          </div>

          <div style={statCardStyle("yellow")}>
            <span style={{ opacity: 0.84 }}>Encontros ativos</span>
            <strong style={{ fontSize: 34 }}>{meetMembers.length}</strong>
          </div>
        </div>
      </section>

 
      <section
        style={{
          ...sectionStyle("green"),
          padding: 16,
          background:
            "linear-gradient(145deg, rgba(0,255,190,0.065), rgba(125,92,255,0.035), rgba(255,255,255,0.018))",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <span
            style={{
              width: "fit-content",
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,255,190,0.20)",
              background: "rgba(0,255,190,0.07)",
              fontSize: 12,
              fontWeight: 900,
              color: "#fff",
            }}
          >
            Guia rápido do evento
          </span>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.08,
              fontWeight: 950,
            }}
          >
            Antes de sair de casa
          </h2>

          <p style={{ margin: 0, opacity: 0.76, fontSize: 13, lineHeight: 1.45 }}>
            Um resumo simples para chegar preparado, sem surpresa na entrada.
          </p>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.09)",
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.62, fontWeight: 850 }}>
                Clima previsto
              </div>
              <strong style={{ display: "block", marginTop: 3, fontSize: 28, lineHeight: 1 }}>
                {normalizeText(eventGroup?.weather_temperature) || "A confirmar"}
              </strong>
            </div>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,255,190,0.18)",
                background: "rgba(0,255,190,0.075)",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              Clima
            </div>
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.86 }}>
            {normalizeText(eventGroup?.weather_summary) || "Previsão ainda não cadastrada."}
          </div>

          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.72 }}>
            {normalizeText(eventGroup?.weather_rain_alert) || "Sem alerta de chuva cadastrado."}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              padding: 13,
              borderRadius: 18,
              border: "1px solid rgba(125,92,255,0.16)",
              background:
                "linear-gradient(145deg, rgba(125,92,255,0.12), rgba(255,255,255,0.025))",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.64, fontWeight: 850 }}>
              Ingresso
            </div>

            <strong style={{ fontSize: 14, lineHeight: 1.25 }}>
              {matchedMembers.find((member) => hasContent(member.event_ticket_type))?.event_ticket_type ||
                "A confirmar"}
            </strong>

            <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.82 }}>
              {matchedMembers.some((member) => member.event_requires_food_kg)
                ? "Leve 1 kg de alimento não perecível."
                : "Confira o ingresso antes de sair."}
            </span>
          </div>

          <div
            style={{
              padding: 13,
              borderRadius: 18,
              border: "1px solid rgba(255,196,0,0.16)",
              background:
                "linear-gradient(145deg, rgba(255,196,0,0.10), rgba(255,255,255,0.025))",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.64, fontWeight: 850 }}>
              Entrada
            </div>

            <strong style={{ fontSize: 14, lineHeight: 1.25 }}>
              Documento em mãos
            </strong>

            <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.82 }}>
              {matchedMembers.some((member) => member.event_requires_student_document)
                ? "Leve documento e comprovante de estudante."
                : "Documento com foto sempre em mãos."}
            </span>
          </div>
        </div>

        <div
          style={{
            padding: "11px 12px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.075)",
            background: "rgba(0,0,0,0.18)",
            fontSize: 12,
            lineHeight: 1.5,
            opacity: 0.82,
          }}
        >
          {matchedMembers.find((member) => hasContent(member.event_preparation_notes))?.event_preparation_notes ||
            normalizeText(eventGroup?.preparation_note) ||
            "Confira ingresso, documento, rota, carona e ponto de encontro antes de sair."}
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
          {topTribes.length > 0 ? (
            <section style={sectionStyle("purple")}>
              <SectionTitle
                icon="▣"
                title="Tribos dominantes do evento"
                subtitle="Vertentes mais presentes entre os Clubbers conectados a este evento."
              />

              <div style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", paddingBottom: 6, scrollSnapType: "x mandatory" }}>
                {topTribes.map(([tribe, count]) => (
                  <div
                    key={tribe}
                    style={{
                      minWidth: 176,
                      padding: "13px 14px",
                      borderRadius: 18,
                      border: "1px solid rgba(0,255,190,0.20)",
                      background:
                        "linear-gradient(135deg, rgba(0,255,190,0.11), rgba(125,92,255,0.13))",
                      boxShadow: "0 12px 34px rgba(0,255,190,0.08)",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <strong style={{ fontSize: 12 }}>{tribe}</strong>
                    <span style={{ fontSize: 17, opacity: 0.82 }}>
                      {count === 1 ? "1 Clubber" : `${count} Clubbers`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section style={sectionStyle("purple")}>
            <SectionTitle
              icon="●"
              title="Quem vai para este evento"
              subtitle="Perfis Club que já se conectaram a este evento."
              actionLabel=""
            />

            <EventParticipantsFilter
              attendees={attendees}
              officialEventUrl={heroOfficialUrl}
            />
          </section>

          <RideMeetCards
            rideMembers={rideMembers}
            meetMembers={meetMembers}
            officialEventUrl={heroOfficialUrl}
          />
        </>
      )}
    </main>
  );
}