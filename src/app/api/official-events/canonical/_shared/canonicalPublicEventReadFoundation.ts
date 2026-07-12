// src/app/api/official-events/canonical/_shared/canonicalPublicEventReadFoundation.ts
import { createClient } from "@supabase/supabase-js";

export const CANONICAL_PUBLIC_EVENT_READ_FOUNDATION_VERSION =
  "v4.8.64-event-canonical-public-event-read-foundation";

export const CANONICAL_PUBLIC_EVENT_OFFICIAL_IMAGE_READ_VERSION =
  "v4.8.76-event-canonical-image-source-recapture-public-read";

const TABLES = {
  canonicalEvents: "canonical_events",
  canonicalEventSources: "canonical_event_sources",
  canonicalEventSearchDocuments: "canonical_event_search_documents",
  canonicalEventFeatureFeeds: "canonical_event_feature_feeds",
} as const;

const CANONICAL_EVENT_SELECT =
  "id,slug,event_name,normalized_event_name,starts_at,ends_at,event_date_key,venue_name,city,state,country,official_url,ticket_url,primary_provider_key,primary_external_event_id,validation_status,validation_method,is_100_percent_validated,source_confidence_score,metadata,updated_at";

const SOURCE_SELECT =
  "id,canonical_event_id,source_key,source_kind,provider_key,external_event_id,source_url,authority_score,ingestion_mode,integration_status,last_seen_at";

const SEARCH_DOCUMENT_SELECT =
  "id,canonical_event_id,search_title,normalized_title,event_date_key,canonical_slug,venue_name,city,state,country,search_tokens,availability_scope,search_rank_score,is_publicly_searchable,updated_at";

const FEATURE_FEED_SELECT =
  "id,canonical_event_id,feature_key,enabled,feed_policy,starts_at,ends_at,updated_at";

export type CanonicalPublicEventReadInput = {
  eventSlug?: string | null;
  canonicalEventId?: string | null;
};

export type CanonicalPublicEventOfficialImage = {
  image_url: string;
  alt_text: string | null;
  source_label: string | null;
  usage_scope: "event_page_hero";
  capture_mode:
    | "validated_source_auto_capture"
    | "validated_source_page_recapture"
    | "legacy_authorized_registration";
  provenance_status: "validated_source" | "legacy_authorized";
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
  captured_at: string | null;
  validation_method: string | null;
  source_confidence_score: number | null;
  authorization_status: "authorized" | null;
  authorization_type: string | null;
  authorized_at: string | null;
  registered_at: string | null;
};

export type CanonicalPublicEventRecord = {
  id: string;
  slug: string;
  event_name: string;
  normalized_event_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  event_date_key: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  primary_provider_key: string | null;
  primary_external_event_id: string | null;
  validation_status: string | null;
  validation_method: string | null;
  is_100_percent_validated: boolean | null;
  source_confidence_score: number | null;
  official_image: CanonicalPublicEventOfficialImage | null;
  updated_at: string | null;
};

export type CanonicalPublicEventSource = {
  id: string;
  canonical_event_id: string;
  source_key: string | null;
  source_kind: string | null;
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
  authority_score: number | null;
  ingestion_mode: string | null;
  integration_status: string | null;
  last_seen_at: string | null;
};

export type CanonicalPublicEventSearchDocument = {
  id: string;
  canonical_event_id: string;
  search_title: string | null;
  normalized_title: string | null;
  event_date_key: string | null;
  canonical_slug: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  search_tokens: string[] | null;
  availability_scope: string[] | null;
  search_rank_score: number | null;
  is_publicly_searchable: boolean | null;
  updated_at: string | null;
};

export type CanonicalPublicEventFeatureFeed = {
  id: string;
  canonical_event_id: string;
  feature_key: string | null;
  enabled: boolean;
  feed_policy: Record<string, unknown> | null;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

export type CanonicalPublicEventFeatureFlags = {
  ticket_intent: boolean;
  check_in: boolean;
  rides: boolean;
  meetups: boolean;
  connections: boolean;
  social_radar: boolean;
  search_autocomplete: boolean;
};

export type CanonicalPublicEventReadSummary = {
  canonical_events: number;
  sources: number;
  search_documents: number;
  feature_feeds: number;
  enabled_feature_feeds: number;
  disabled_feature_feeds: number;
  social_feature_enabled: boolean;
  database_write_performed: false;
  supabase_read_performed: boolean;
};

export type CanonicalPublicEventReadResult = {
  ok: boolean;
  version: typeof CANONICAL_PUBLIC_EVENT_READ_FOUNDATION_VERSION;
  mode: "canonical_public_event_read_foundation";
  found: boolean;
  input: {
    event_slug: string | null;
    canonical_event_id: string | null;
  };
  lookup_strategy: string[];
  canonical_event_id: string | null;
  canonical_event: CanonicalPublicEventRecord | null;
  sources: CanonicalPublicEventSource[];
  search_documents: CanonicalPublicEventSearchDocument[];
  feature_feeds: CanonicalPublicEventFeatureFeed[];
  feature_flags: CanonicalPublicEventFeatureFlags;
  summary: CanonicalPublicEventReadSummary;
  safety: {
    read_only: true;
    database_write_performed: false;
    supabase_operation_performed: boolean;
    supabase_read_performed: boolean;
    route_created: false;
    visual_change_performed: false;
    social_feature_enabled: boolean;
    public_event_page_changed: false;
    free_text_event_interaction_allowed: false;
  };
  error: string | null;
  error_details: Record<string, unknown> | null;
};

type SupabaseClientLike = ReturnType<typeof createAdminSupabaseClient>;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Record<string, unknown> => {
    return item !== null && typeof item === "object" && !Array.isArray(item);
  });
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const strings = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return strings.length > 0 ? strings : [];
}

function getRecordString(record: Record<string, unknown>, key: string): string | null {
  return asString(record[key]);
}

function getRecordBoolean(record: Record<string, unknown>, key: string): boolean | null {
  return asBoolean(record[key]);
}

function getRecordNumber(record: Record<string, unknown>, key: string): number | null {
  return asNumber(record[key]);
}

function getRecordObject(
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  return asRecord(record[key]);
}

function isPrivateOrLocalHostname(hostname: string): boolean {
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

function normalizePublicHttpsUrl(value: unknown): string | null {
  const normalized = asString(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);

    if (url.protocol !== "https:") return null;
    if (!url.hostname || isPrivateOrLocalHostname(url.hostname)) return null;
    if (url.username || url.password) return null;

    return url.toString();
  } catch {
    return null;
  }
}

function mapOfficialImage(
  metadata: Record<string, unknown> | null
): CanonicalPublicEventOfficialImage | null {
  const officialImage = metadata
    ? getRecordObject(metadata, "official_image")
    : null;

  if (!officialImage) return null;

  const imageUrl = normalizePublicHttpsUrl(officialImage.image_url);
  const usageScope = getRecordString(officialImage, "usage_scope");
  const captureMode = getRecordString(officialImage, "capture_mode");
  const provenanceStatus = getRecordString(
    officialImage,
    "provenance_status"
  );
  const authorizationStatus = getRecordString(
    officialImage,
    "authorization_status"
  );

  const isValidatedSourceCapture =
    (captureMode === "validated_source_auto_capture" ||
      captureMode === "validated_source_page_recapture") &&
    provenanceStatus === "validated_source";

  const isLegacyAuthorizedRegistration =
    authorizationStatus === "authorized";

  if (
    !imageUrl ||
    usageScope !== "event_page_hero" ||
    (!isValidatedSourceCapture && !isLegacyAuthorizedRegistration)
  ) {
    return null;
  }

  return {
    image_url: imageUrl,
    alt_text: getRecordString(officialImage, "alt_text"),
    source_label: getRecordString(officialImage, "source_label"),
    usage_scope: "event_page_hero",
    capture_mode: isValidatedSourceCapture
      ? captureMode === "validated_source_page_recapture"
        ? "validated_source_page_recapture"
        : "validated_source_auto_capture"
      : "legacy_authorized_registration",
    provenance_status: isValidatedSourceCapture
      ? "validated_source"
      : "legacy_authorized",
    provider_key: getRecordString(officialImage, "provider_key"),
    external_event_id: getRecordString(
      officialImage,
      "external_event_id"
    ),
    source_url: normalizePublicHttpsUrl(officialImage.source_url),
    captured_at: getRecordString(officialImage, "captured_at"),
    validation_method: getRecordString(
      officialImage,
      "validation_method"
    ),
    source_confidence_score: getRecordNumber(
      officialImage,
      "source_confidence_score"
    ),
    authorization_status: isLegacyAuthorizedRegistration
      ? "authorized"
      : null,
    authorization_type: getRecordString(
      officialImage,
      "authorization_type"
    ),
    authorized_at: getRecordString(officialImage, "authorized_at"),
    registered_at: getRecordString(officialImage, "registered_at"),
  };
}

function mapCanonicalEventRecord(
  record: Record<string, unknown>
): CanonicalPublicEventRecord | null {
  const id = getRecordString(record, "id");
  const slug = getRecordString(record, "slug");
  const eventName = getRecordString(record, "event_name");

  if (!id || !slug || !eventName) return null;

  return {
    id,
    slug,
    event_name: eventName,
    normalized_event_name: getRecordString(record, "normalized_event_name"),
    starts_at: getRecordString(record, "starts_at"),
    ends_at: getRecordString(record, "ends_at"),
    event_date_key: getRecordString(record, "event_date_key"),
    venue_name: getRecordString(record, "venue_name"),
    city: getRecordString(record, "city"),
    state: getRecordString(record, "state"),
    country: getRecordString(record, "country"),
    official_url: getRecordString(record, "official_url"),
    ticket_url: getRecordString(record, "ticket_url"),
    primary_provider_key: getRecordString(record, "primary_provider_key"),
    primary_external_event_id: getRecordString(
      record,
      "primary_external_event_id"
    ),
    validation_status: getRecordString(record, "validation_status"),
    validation_method: getRecordString(record, "validation_method"),
    is_100_percent_validated: getRecordBoolean(
      record,
      "is_100_percent_validated"
    ),
    source_confidence_score: getRecordNumber(record, "source_confidence_score"),
    official_image: mapOfficialImage(getRecordObject(record, "metadata")),
    updated_at: getRecordString(record, "updated_at"),
  };
}

function mapSourceRecord(
  record: Record<string, unknown>
): CanonicalPublicEventSource | null {
  const id = getRecordString(record, "id");
  const canonicalEventId = getRecordString(record, "canonical_event_id");

  if (!id || !canonicalEventId) return null;

  return {
    id,
    canonical_event_id: canonicalEventId,
    source_key: getRecordString(record, "source_key"),
    source_kind: getRecordString(record, "source_kind"),
    provider_key: getRecordString(record, "provider_key"),
    external_event_id: getRecordString(record, "external_event_id"),
    source_url: getRecordString(record, "source_url"),
    authority_score: getRecordNumber(record, "authority_score"),
    ingestion_mode: getRecordString(record, "ingestion_mode"),
    integration_status: getRecordString(record, "integration_status"),
    last_seen_at: getRecordString(record, "last_seen_at"),
  };
}

function mapSearchDocumentRecord(
  record: Record<string, unknown>
): CanonicalPublicEventSearchDocument | null {
  const id = getRecordString(record, "id");
  const canonicalEventId = getRecordString(record, "canonical_event_id");

  if (!id || !canonicalEventId) return null;

  return {
    id,
    canonical_event_id: canonicalEventId,
    search_title: getRecordString(record, "search_title"),
    normalized_title: getRecordString(record, "normalized_title"),
    event_date_key: getRecordString(record, "event_date_key"),
    canonical_slug: getRecordString(record, "canonical_slug"),
    venue_name: getRecordString(record, "venue_name"),
    city: getRecordString(record, "city"),
    state: getRecordString(record, "state"),
    country: getRecordString(record, "country"),
    search_tokens: asStringArray(record.search_tokens),
    availability_scope: asStringArray(record.availability_scope),
    search_rank_score: getRecordNumber(record, "search_rank_score"),
    is_publicly_searchable: getRecordBoolean(record, "is_publicly_searchable"),
    updated_at: getRecordString(record, "updated_at"),
  };
}

function mapFeatureFeedRecord(
  record: Record<string, unknown>
): CanonicalPublicEventFeatureFeed | null {
  const id = getRecordString(record, "id");
  const canonicalEventId = getRecordString(record, "canonical_event_id");
  const featureKey = getRecordString(record, "feature_key");

  if (!id || !canonicalEventId || !featureKey) return null;

  return {
    id,
    canonical_event_id: canonicalEventId,
    feature_key: featureKey,
    enabled: getRecordBoolean(record, "enabled") === true,
    feed_policy: getRecordObject(record, "feed_policy"),
    starts_at: getRecordString(record, "starts_at"),
    ends_at: getRecordString(record, "ends_at"),
    updated_at: getRecordString(record, "updated_at"),
  };
}

function createEmptyFeatureFlags(): CanonicalPublicEventFeatureFlags {
  return {
    ticket_intent: false,
    check_in: false,
    rides: false,
    meetups: false,
    connections: false,
    social_radar: false,
    search_autocomplete: false,
  };
}

function buildFeatureFlags(
  featureFeeds: CanonicalPublicEventFeatureFeed[]
): CanonicalPublicEventFeatureFlags {
  const flags = createEmptyFeatureFlags();

  for (const feed of featureFeeds) {
    if (!feed.feature_key) continue;

    if (feed.feature_key === "ticket_intent") {
      flags.ticket_intent = feed.enabled;
    }

    if (feed.feature_key === "check_in") {
      flags.check_in = feed.enabled;
    }

    if (feed.feature_key === "rides") {
      flags.rides = feed.enabled;
    }

    if (feed.feature_key === "meetups") {
      flags.meetups = feed.enabled;
    }

    if (feed.feature_key === "connections") {
      flags.connections = feed.enabled;
    }

    if (feed.feature_key === "social_radar") {
      flags.social_radar = feed.enabled;
    }

    if (feed.feature_key === "search_autocomplete") {
      flags.search_autocomplete = feed.enabled;
    }
  }

  return flags;
}

function hasAnySocialFeatureEnabled(
  featureFlags: CanonicalPublicEventFeatureFlags
): boolean {
  return (
    featureFlags.ticket_intent ||
    featureFlags.check_in ||
    featureFlags.rides ||
    featureFlags.meetups ||
    featureFlags.connections ||
    featureFlags.social_radar
  );
}

function describeError(error: unknown): {
  message: string;
  details: Record<string, unknown> | null;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack ?? null,
      },
    };
  }

  const record = asRecord(error);

  if (record) {
    const message =
      asString(record.message) ||
      asString(record.error_description) ||
      asString(record.error) ||
      "Unknown canonical public event read error.";

    return {
      message,
      details: record,
    };
  }

  if (typeof error === "string" && error.trim()) {
    return {
      message: error.trim(),
      details: null,
    };
  }

  return {
    message: "Unknown canonical public event read error.",
    details: null,
  };
}

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createEmptyResult(
  input: CanonicalPublicEventReadInput
): CanonicalPublicEventReadResult {
  const eventSlug = normalizeString(input.eventSlug);
  const canonicalEventId = normalizeString(input.canonicalEventId);

  return {
    ok: true,
    version: CANONICAL_PUBLIC_EVENT_READ_FOUNDATION_VERSION,
    mode: "canonical_public_event_read_foundation",
    found: false,
    input: {
      event_slug: eventSlug,
      canonical_event_id: canonicalEventId,
    },
    lookup_strategy: [],
    canonical_event_id: null,
    canonical_event: null,
    sources: [],
    search_documents: [],
    feature_feeds: [],
    feature_flags: createEmptyFeatureFlags(),
    summary: {
      canonical_events: 0,
      sources: 0,
      search_documents: 0,
      feature_feeds: 0,
      enabled_feature_feeds: 0,
      disabled_feature_feeds: 0,
      social_feature_enabled: false,
      database_write_performed: false,
      supabase_read_performed: false,
    },
    safety: {
      read_only: true,
      database_write_performed: false,
      supabase_operation_performed: false,
      supabase_read_performed: false,
      route_created: false,
      visual_change_performed: false,
      social_feature_enabled: false,
      public_event_page_changed: false,
      free_text_event_interaction_allowed: false,
    },
    error: null,
    error_details: null,
  };
}

async function fetchCanonicalEvent(
  supabase: SupabaseClientLike,
  input: {
    eventSlug: string | null;
    canonicalEventId: string | null;
  },
  lookupStrategy: string[]
): Promise<CanonicalPublicEventRecord | null> {
  if (input.canonicalEventId) {
    lookupStrategy.push("canonical_events.id");

    const response = await supabase
      .from(TABLES.canonicalEvents)
      .select(CANONICAL_EVENT_SELECT)
      .eq("id", input.canonicalEventId)
      .maybeSingle();

    if (response.error) throw response.error;

    return mapCanonicalEventRecord(asRecord(response.data as unknown) || {});
  }

  if (input.eventSlug) {
    lookupStrategy.push("canonical_events.slug");

    const response = await supabase
      .from(TABLES.canonicalEvents)
      .select(CANONICAL_EVENT_SELECT)
      .eq("slug", input.eventSlug)
      .maybeSingle();

    if (response.error) throw response.error;

    return mapCanonicalEventRecord(asRecord(response.data as unknown) || {});
  }

  lookupStrategy.push("no_lookup_fields_provided");

  return null;
}

async function fetchSources(
  supabase: SupabaseClientLike,
  canonicalEventId: string,
  lookupStrategy: string[]
): Promise<CanonicalPublicEventSource[]> {
  lookupStrategy.push("canonical_event_sources.canonical_event_id");

  const response = await supabase
    .from(TABLES.canonicalEventSources)
    .select(SOURCE_SELECT)
    .eq("canonical_event_id", canonicalEventId)
    .order("authority_score", { ascending: false })
    .limit(50);

  if (response.error) throw response.error;

  return asRecordArray(response.data as unknown)
    .map(mapSourceRecord)
    .filter((record): record is CanonicalPublicEventSource => record !== null);
}

async function fetchSearchDocuments(
  supabase: SupabaseClientLike,
  canonicalEventId: string,
  lookupStrategy: string[]
): Promise<CanonicalPublicEventSearchDocument[]> {
  lookupStrategy.push("canonical_event_search_documents.canonical_event_id");

  const response = await supabase
    .from(TABLES.canonicalEventSearchDocuments)
    .select(SEARCH_DOCUMENT_SELECT)
    .eq("canonical_event_id", canonicalEventId)
    .order("search_rank_score", { ascending: false })
    .limit(20);

  if (response.error) throw response.error;

  return asRecordArray(response.data as unknown)
    .map(mapSearchDocumentRecord)
    .filter(
      (record): record is CanonicalPublicEventSearchDocument => record !== null
    );
}

async function fetchFeatureFeeds(
  supabase: SupabaseClientLike,
  canonicalEventId: string,
  lookupStrategy: string[]
): Promise<CanonicalPublicEventFeatureFeed[]> {
  lookupStrategy.push("canonical_event_feature_feeds.canonical_event_id");

  const response = await supabase
    .from(TABLES.canonicalEventFeatureFeeds)
    .select(FEATURE_FEED_SELECT)
    .eq("canonical_event_id", canonicalEventId)
    .order("feature_key", { ascending: true })
    .limit(50);

  if (response.error) throw response.error;

  return asRecordArray(response.data as unknown)
    .map(mapFeatureFeedRecord)
    .filter(
      (record): record is CanonicalPublicEventFeatureFeed => record !== null
    );
}

export async function readCanonicalPublicEvent(
  input: CanonicalPublicEventReadInput
): Promise<CanonicalPublicEventReadResult> {
  const result = createEmptyResult(input);

  if (!result.input.event_slug && !result.input.canonical_event_id) {
    result.lookup_strategy.push("no_lookup_fields_provided");

    return result;
  }

  result.safety.supabase_operation_performed = true;
  result.safety.supabase_read_performed = true;
  result.summary.supabase_read_performed = true;

  try {
    const supabase = createAdminSupabaseClient();

    const canonicalEvent = await fetchCanonicalEvent(
      supabase,
      {
        eventSlug: result.input.event_slug,
        canonicalEventId: result.input.canonical_event_id,
      },
      result.lookup_strategy
    );

    if (!canonicalEvent) {
      result.found = false;
      result.summary = {
        ...result.summary,
        canonical_events: 0,
      };

      return result;
    }

    const canonicalEventId = canonicalEvent.id;

    const [sources, searchDocuments, featureFeeds] = await Promise.all([
      fetchSources(supabase, canonicalEventId, result.lookup_strategy),
      fetchSearchDocuments(supabase, canonicalEventId, result.lookup_strategy),
      fetchFeatureFeeds(supabase, canonicalEventId, result.lookup_strategy),
    ]);

    const featureFlags = buildFeatureFlags(featureFeeds);
    const enabledFeatureFeeds = featureFeeds.filter((feed) => feed.enabled).length;
    const socialFeatureEnabled = hasAnySocialFeatureEnabled(featureFlags);

    result.found = true;
    result.canonical_event_id = canonicalEventId;
    result.canonical_event = canonicalEvent;
    result.sources = sources;
    result.search_documents = searchDocuments;
    result.feature_feeds = featureFeeds;
    result.feature_flags = featureFlags;
    result.summary = {
      canonical_events: 1,
      sources: sources.length,
      search_documents: searchDocuments.length,
      feature_feeds: featureFeeds.length,
      enabled_feature_feeds: enabledFeatureFeeds,
      disabled_feature_feeds: featureFeeds.length - enabledFeatureFeeds,
      social_feature_enabled: socialFeatureEnabled,
      database_write_performed: false,
      supabase_read_performed: true,
    };
    result.safety.social_feature_enabled = socialFeatureEnabled;

    return result;
  } catch (error) {
    const describedError = describeError(error);

    result.ok = false;
    result.error = describedError.message;
    result.error_details = describedError.details;

    return result;
  }
}

export async function readCanonicalPublicEventBySlug(
  eventSlug: string
): Promise<CanonicalPublicEventReadResult> {
  return readCanonicalPublicEvent({
    eventSlug,
    canonicalEventId: null,
  });
}

export async function readCanonicalPublicEventById(
  canonicalEventId: string
): Promise<CanonicalPublicEventReadResult> {
  return readCanonicalPublicEvent({
    eventSlug: null,
    canonicalEventId,
  });
}