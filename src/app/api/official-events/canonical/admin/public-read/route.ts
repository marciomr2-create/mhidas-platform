// src/app/api/official-events/canonical/admin/public-read/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROUTE_VERSION = "v4.8.63-event-canonical-admin-public-read-route";

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

type NormalizedInput = {
  event_slug: string | null;
  canonical_event_id: string | null;
};

type PublicReadResult = {
  db_read_performed: boolean;
  db_read_error: string | null;
  db_read_error_details: Record<string, unknown> | null;
  lookup_strategy: string[];
  found: boolean;
  canonical_event_id: string | null;
  canonical_event: Record<string, unknown> | null;
  sources: Array<Record<string, unknown>>;
  search_documents: Array<Record<string, unknown>>;
  feature_feeds: Array<Record<string, unknown>>;
  summary: {
    canonical_events: number;
    sources: number;
    search_documents: number;
    feature_feeds: number;
    enabled_feature_feeds: number;
    disabled_feature_feeds: number;
  };
};

function getResolverSecret(): string {
  return String(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET || "").trim();
}

function getRequestSecret(request: NextRequest): string {
  const fromHeader =
    request.headers.get("x-official-events-secret") ||
    request.headers.get("x-resolver-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  const fromQuery = request.nextUrl.searchParams.get("secret") || "";

  return String(fromHeader || fromQuery || "").trim();
}

function isAuthorized(request: NextRequest): boolean {
  const expected = getResolverSecret();
  const received = getRequestSecret(request);

  if (!expected) return false;
  if (!received) return false;

  return received === expected;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInputFromRequest(request: NextRequest): NormalizedInput {
  return {
    event_slug: normalizeString(request.nextUrl.searchParams.get("eventSlug")),
    canonical_event_id: normalizeString(
      request.nextUrl.searchParams.get("canonicalEventId")
    ),
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

function getRecordString(record: Record<string, unknown>, key: string): string | null {
  return asString(record[key]);
}

function isEnabledFeed(record: Record<string, unknown>): boolean {
  return record.enabled === true;
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
      "Unknown public read DB error.";

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
    message: "Unknown public read DB error.",
    details: null,
  };
}

function emptyResult(): PublicReadResult {
  return {
    db_read_performed: false,
    db_read_error: null,
    db_read_error_details: null,
    lookup_strategy: [],
    found: false,
    canonical_event_id: null,
    canonical_event: null,
    sources: [],
    search_documents: [],
    feature_feeds: [],
    summary: {
      canonical_events: 0,
      sources: 0,
      search_documents: 0,
      feature_feeds: 0,
      enabled_feature_feeds: 0,
      disabled_feature_feeds: 0,
    },
  };
}

async function runPublicRead(input: NormalizedInput): Promise<PublicReadResult> {
  const result = emptyResult();

  if (!input.event_slug && !input.canonical_event_id) {
    result.lookup_strategy.push("no_lookup_fields_provided");
    return result;
  }

  result.db_read_performed = true;

  try {
    const supabase = createAdminSupabaseClient();

    let eventRecord: Record<string, unknown> | null = null;

    if (input.canonical_event_id) {
      result.lookup_strategy.push("canonical_events.id");

      const response = await supabase
        .from(TABLES.canonicalEvents)
        .select(CANONICAL_EVENT_SELECT)
        .eq("id", input.canonical_event_id)
        .maybeSingle();

      if (response.error) throw response.error;

      eventRecord = asRecord(response.data as unknown);
    }

    if (!eventRecord && input.event_slug) {
      result.lookup_strategy.push("canonical_events.slug");

      const response = await supabase
        .from(TABLES.canonicalEvents)
        .select(CANONICAL_EVENT_SELECT)
        .eq("slug", input.event_slug)
        .maybeSingle();

      if (response.error) throw response.error;

      eventRecord = asRecord(response.data as unknown);
    }

    const canonicalEventId = eventRecord
      ? getRecordString(eventRecord, "id")
      : null;

    if (!eventRecord || !canonicalEventId) {
      result.found = false;
      result.summary = {
        canonical_events: 0,
        sources: 0,
        search_documents: 0,
        feature_feeds: 0,
        enabled_feature_feeds: 0,
        disabled_feature_feeds: 0,
      };

      return result;
    }

    result.lookup_strategy.push("canonical_event_sources.canonical_event_id");

    const sourcesResponse = await supabase
      .from(TABLES.canonicalEventSources)
      .select(SOURCE_SELECT)
      .eq("canonical_event_id", canonicalEventId)
      .order("authority_score", { ascending: false })
      .limit(50);

    if (sourcesResponse.error) throw sourcesResponse.error;

    result.lookup_strategy.push("canonical_event_search_documents.canonical_event_id");

    const searchDocumentsResponse = await supabase
      .from(TABLES.canonicalEventSearchDocuments)
      .select(SEARCH_DOCUMENT_SELECT)
      .eq("canonical_event_id", canonicalEventId)
      .order("search_rank_score", { ascending: false })
      .limit(10);

    if (searchDocumentsResponse.error) throw searchDocumentsResponse.error;

    result.lookup_strategy.push("canonical_event_feature_feeds.canonical_event_id");

    const featureFeedsResponse = await supabase
      .from(TABLES.canonicalEventFeatureFeeds)
      .select(FEATURE_FEED_SELECT)
      .eq("canonical_event_id", canonicalEventId)
      .order("feature_key", { ascending: true })
      .limit(50);

    if (featureFeedsResponse.error) throw featureFeedsResponse.error;

    const sources = asRecordArray(sourcesResponse.data as unknown);
    const searchDocuments = asRecordArray(searchDocumentsResponse.data as unknown);
    const featureFeeds = asRecordArray(featureFeedsResponse.data as unknown);
    const enabledFeatureFeeds = featureFeeds.filter(isEnabledFeed).length;

    result.found = true;
    result.canonical_event_id = canonicalEventId;
    result.canonical_event = eventRecord;
    result.sources = sources;
    result.search_documents = searchDocuments;
    result.feature_feeds = featureFeeds;
    result.summary = {
      canonical_events: 1,
      sources: sources.length,
      search_documents: searchDocuments.length,
      feature_feeds: featureFeeds.length,
      enabled_feature_feeds: enabledFeatureFeeds,
      disabled_feature_feeds: featureFeeds.length - enabledFeatureFeeds,
    };

    return result;
  } catch (error) {
    const describedError = describeError(error);

    result.db_read_error = describedError.message;
    result.db_read_error_details = describedError.details;

    return result;
  }
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "forbidden",
      database_write_performed: false,
      supabase_operation_performed: false,
      supabase_read_performed: false,
      write_blocked_by_design: true,
    },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return forbiddenResponse();
  }

  const input = normalizeInputFromRequest(request);
  const result = await runPublicRead(input);

  return NextResponse.json({
    ok: result.db_read_error === null,
    version: ROUTE_VERSION,
    mode: "canonical_admin_public_read",
    route: "/api/official-events/canonical/admin/public-read",
    method: "GET",
    database_write_performed: false,
    supabase_operation_performed: result.db_read_performed,
    supabase_read_performed: result.db_read_performed,
    write_blocked_by_design: true,
    runtime_route_changed: false,
    visual_change_performed: false,
    social_feature_enabled: false,
    input,
    result,
  });
}