// src/app/api/official-events/_shared/resolverTypes.ts

export type OfficialEventProvider =
  | "ticketmaster"
  | "ingresse"
  | "sympla"
  | "shotgun"
  | "blueticket"
  | "guicheweb"
  | "ticket360"
  | "eventbrite"
  | "bandsintown"
  | "manual"
  | "other";

export type OfficialEventDiscoveryType =
  | "artist"
  | "event"
  | "festival"
  | "venue"
  | "party"
  | "mixed";

export type OfficialEventSourceType =
  | "site"
  | "ticket"
  | "instagram"
  | "manual"
  | "api"
  | "other";

export type OfficialEventCandidateStatus =
  | "probable"
  | "review"
  | "confirmed"
  | "rejected"
  | "expired";

export type JsonRecord = Record<string, unknown>;

export type OfficialEventSearchInput = {
  query: string;
  normalizedQuery: string;
  discoveryType: OfficialEventDiscoveryType;
  city: string;
  state: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  size: number;
  save: boolean;
  eventGroupId: string;
};

export type OfficialEventCandidate = {
  provider: OfficialEventProvider;
  provider_event_id: string | null;
  provider_url: string | null;

  query_text: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  event_datetime: string | null;
  event_timezone: string | null;

  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;

  official_url: string | null;
  ticket_url: string | null;
  image_url: string | null;

  source_name: string;
  source_type: OfficialEventSourceType;
  candidate_status: OfficialEventCandidateStatus;
  confidence: number;

  discovery_type: OfficialEventDiscoveryType;
  normalized_query: string | null;
  query_city: string | null;
  query_state: string | null;
  query_country: string | null;
  query_start_date: string | null;
  query_end_date: string | null;
  match_reason: string | null;
  match_details: JsonRecord | null;

  event_group_id: string | null;
  raw_payload: JsonRecord;
  notes: string;
};

export type OfficialEventResolverResponseCandidate = {
  provider: OfficialEventProvider;
  provider_event_id: string | null;
  provider_url: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  event_datetime: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  image_url: string | null;
  candidate_status: OfficialEventCandidateStatus;
  confidence: number;
  discovery_type: OfficialEventDiscoveryType;
  normalized_query: string | null;
  query_city: string | null;
  query_state: string | null;
  query_country: string | null;
  query_start_date: string | null;
  query_end_date: string | null;
  match_reason: string | null;
};

export function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeForDiscovery(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDiscoveryType(value: unknown): OfficialEventDiscoveryType {
  const normalized = normalizeForDiscovery(value);

  if (normalized === "artist" || normalized === "artista" || normalized === "dj") {
    return "artist";
  }

  if (normalized === "festival") return "festival";
  if (normalized === "venue" || normalized === "local") return "venue";
  if (normalized === "party" || normalized === "festa") return "party";
  if (normalized === "event" || normalized === "evento") return "event";

  return "mixed";
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
