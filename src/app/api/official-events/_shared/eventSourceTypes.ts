// src/app/api/official-events/_shared/eventSourceTypes.ts

export const EVENT_SOURCE_ROLES = [
  "ticketing_platform",
  "official_venue",
  "official_promoter",
  "official_producer",
  "artist_agency",
  "festival_organizer",
  "editorial_discovery",
  "partner_feed",
  "organizer_account",
  "community_source",
] as const;

export type EventSourceRole = (typeof EVENT_SOURCE_ROLES)[number];

export const EVENT_SOURCE_TRUST_TIERS = [
  "official",
  "trusted",
  "discovery",
  "community",
] as const;

export type EventSourceTrustTier =
  (typeof EVENT_SOURCE_TRUST_TIERS)[number];

export const EVENT_SOURCE_AUTHORITY_SCOPES = [
  "global_catalog",
  "own_events_only",
  "own_venue_only",
  "own_brands_only",
  "represented_artists_signal",
  "discovery_only",
  "community_only",
] as const;

export type EventSourceAuthorityScope =
  (typeof EVENT_SOURCE_AUTHORITY_SCOPES)[number];

export const EVENT_SOURCE_INGESTION_MODES = [
  "api",
  "json_ld",
  "public_page",
  "sitemap",
  "feed",
  "organizer_submission",
  "community_submission",
] as const;

export type EventSourceIngestionMode =
  (typeof EVENT_SOURCE_INGESTION_MODES)[number];

export const EVENT_SOURCE_INTEGRATION_STATUSES = [
  "active",
  "planned",
  "partnership_required",
  "research_required",
  "manual",
  "suspended",
] as const;

export type EventSourceIntegrationStatus =
  (typeof EVENT_SOURCE_INTEGRATION_STATUSES)[number];

export type EventSourceDefinition = {
  source_id: string;
  source_key: string;
  display_name: string;
  roles: EventSourceRole[];
  trust_tier: EventSourceTrustTier;
  authority_scope: EventSourceAuthorityScope;
  domains: string[];
  ingestion_modes: EventSourceIngestionMode[];
  integration_status: EventSourceIntegrationStatus;
  parent_source_id: string | null;
  automatic_candidate_eligible: boolean;
  automatic_publish_eligible: boolean;
  requires_secondary_confirmation: boolean;
  city: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function normalizeEventSourceKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function canEventSourcePublishAutomatically(
  source: Pick<
    EventSourceDefinition,
    | "is_active"
    | "trust_tier"
    | "authority_scope"
    | "automatic_publish_eligible"
    | "requires_secondary_confirmation"
  >
): boolean {
  if (!source.is_active) return false;
  if (!source.automatic_publish_eligible) return false;
  if (source.requires_secondary_confirmation) return false;

  if (source.trust_tier !== "official" && source.trust_tier !== "trusted") {
    return false;
  }

  return (
    source.authority_scope !== "discovery_only" &&
    source.authority_scope !== "community_only"
  );
}
