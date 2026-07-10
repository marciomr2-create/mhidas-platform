// src/app/api/official-events/canonical/admin/readback-db/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROUTE_VERSION = "v4.8.59-event-canonical-admin-readback-db-audit";

const TABLES = {
  canonicalEvents: "canonical_events",
  canonicalEventSources: "canonical_event_sources",
  canonicalEventSearchDocuments: "canonical_event_search_documents",
  canonicalEventFeatureFeeds: "canonical_event_feature_feeds",
} as const;

const CANONICAL_EVENT_SELECT =
  "id,slug,event_name,normalized_event_name,starts_at,ends_at,event_date_key,venue_name,city,state,country,official_url,ticket_url,primary_provider_key,primary_external_event_id,validation_status";

const SOURCE_SELECT =
  "id,canonical_event_id,source_key,source_kind,provider_key,external_event_id,source_url,authority_score,ingestion_mode,integration_status,last_seen_at";

const SEARCH_DOCUMENT_SELECT =
  "id,canonical_event_id,search_title,normalized_title,event_date_key,canonical_slug,venue_name,city,state,country,search_rank_score,is_publicly_searchable";

const FEATURE_FEED_SELECT =
  "id,canonical_event_id,feature_key,is_enabled,is_publicly_visible";

type ReadbackDbRequest = {
  eventSlug?: unknown;
  canonicalEventId?: unknown;
  externalEventId?: unknown;
  provider?: unknown;
};

type NormalizedInput = {
  event_slug: string | null;
  canonical_event_id: string | null;
  external_event_id: string | null;
  provider: string | null;
};

type DbAuditResult = {
  db_read_performed: boolean;
  db_read_error: string | null;
  lookup_strategy: string[];
  matched_canonical_event_ids: string[];
  matched_count: {
    canonical_events: number;
    canonical_event_sources: number;
    canonical_event_search_documents: number;
    canonical_event_feature_feeds: number;
  };
  canonical_events: Array<Record<string, unknown>>;
  canonical_event_sources: Array<Record<string, unknown>>;
  canonical_event_search_documents: Array<Record<string, unknown>>;
  canonical_event_feature_feeds: Array<Record<string, unknown>>;
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

function normalizeInput(payload: ReadbackDbRequest): NormalizedInput {
  return {
    event_slug: normalizeString(payload.eventSlug),
    canonical_event_id: normalizeString(payload.canonicalEventId),
    external_event_id: normalizeString(payload.externalEventId),
    provider: normalizeString(payload.provider),
  };
}

function getLookupFields(input: NormalizedInput): string[] {
  const fields: string[] = [];

  if (input.event_slug) fields.push("event_slug");
  if (input.canonical_event_id) fields.push("canonical_event_id");
  if (input.external_event_id) fields.push("external_event_id");
  if (input.provider) fields.push("provider");

  return fields;
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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function uniqueRecordsById(
  records: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const output: Array<Record<string, unknown>> = [];

  for (const record of records) {
    const id = getRecordString(record, "id");

    if (!id) {
      output.push(record);
      continue;
    }

    if (seen.has(id)) continue;

    seen.add(id);
    output.push(record);
  }

  return output;
}

function emptyAudit(): DbAuditResult {
  return {
    db_read_performed: false,
    db_read_error: null,
    lookup_strategy: [],
    matched_canonical_event_ids: [],
    matched_count: {
      canonical_events: 0,
      canonical_event_sources: 0,
      canonical_event_search_documents: 0,
      canonical_event_feature_feeds: 0,
    },
    canonical_events: [],
    canonical_event_sources: [],
    canonical_event_search_documents: [],
    canonical_event_feature_feeds: [],
  };
}

async function runDbAudit(input: NormalizedInput): Promise<DbAuditResult> {
  const audit = emptyAudit();
  const lookupFields = getLookupFields(input);

  if (lookupFields.length === 0) {
    audit.lookup_strategy.push("no_lookup_fields_provided");
    return audit;
  }

  audit.db_read_performed = true;

  try {
    const supabase = createAdminSupabaseClient();

    const canonicalEventMatches: Array<Record<string, unknown>> = [];
    const sourceMatches: Array<Record<string, unknown>> = [];

    if (input.canonical_event_id) {
      audit.lookup_strategy.push("canonical_events.id");

      const response = await supabase
        .from(TABLES.canonicalEvents)
        .select(CANONICAL_EVENT_SELECT)
        .eq("id", input.canonical_event_id)
        .limit(10);

      if (response.error) throw response.error;

      canonicalEventMatches.push(...asRecordArray(response.data as unknown));
    }

    if (input.event_slug) {
      audit.lookup_strategy.push("canonical_events.slug");

      const response = await supabase
        .from(TABLES.canonicalEvents)
        .select(CANONICAL_EVENT_SELECT)
        .eq("slug", input.event_slug)
        .limit(10);

      if (response.error) throw response.error;

      canonicalEventMatches.push(...asRecordArray(response.data as unknown));
    }

    if (input.provider && input.external_event_id) {
      audit.lookup_strategy.push("canonical_events.primary_provider_external_id");

      const canonicalResponse = await supabase
        .from(TABLES.canonicalEvents)
        .select(CANONICAL_EVENT_SELECT)
        .eq("primary_provider_key", input.provider)
        .eq("primary_external_event_id", input.external_event_id)
        .limit(10);

      if (canonicalResponse.error) throw canonicalResponse.error;

      canonicalEventMatches.push(...asRecordArray(canonicalResponse.data as unknown));

      audit.lookup_strategy.push("canonical_event_sources.provider_external_id");

      const sourceResponse = await supabase
        .from(TABLES.canonicalEventSources)
        .select(SOURCE_SELECT)
        .eq("provider_key", input.provider)
        .eq("external_event_id", input.external_event_id)
        .limit(20);

      if (sourceResponse.error) throw sourceResponse.error;

      sourceMatches.push(...asRecordArray(sourceResponse.data as unknown));
    }

    const idsFromEvents = canonicalEventMatches.map((record) =>
      getRecordString(record, "id")
    );

    const idsFromSources = sourceMatches.map((record) =>
      getRecordString(record, "canonical_event_id")
    );

    const allCanonicalIds = uniqueStrings([
      ...idsFromEvents,
      ...idsFromSources,
      input.canonical_event_id,
    ]);

    let canonicalEventsFromIds: Array<Record<string, unknown>> = [];
    let relatedSources: Array<Record<string, unknown>> = [];
    let relatedSearchDocuments: Array<Record<string, unknown>> = [];
    let relatedFeatureFeeds: Array<Record<string, unknown>> = [];

    if (allCanonicalIds.length > 0) {
      audit.lookup_strategy.push("canonical_events.id.in");

      const canonicalResponse = await supabase
        .from(TABLES.canonicalEvents)
        .select(CANONICAL_EVENT_SELECT)
        .in("id", allCanonicalIds)
        .limit(50);

      if (canonicalResponse.error) throw canonicalResponse.error;

      canonicalEventsFromIds = asRecordArray(canonicalResponse.data as unknown);

      audit.lookup_strategy.push("canonical_event_sources.canonical_event_id.in");

      const sourcesResponse = await supabase
        .from(TABLES.canonicalEventSources)
        .select(SOURCE_SELECT)
        .in("canonical_event_id", allCanonicalIds)
        .limit(100);

      if (sourcesResponse.error) throw sourcesResponse.error;

      relatedSources = asRecordArray(sourcesResponse.data as unknown);

      audit.lookup_strategy.push(
        "canonical_event_search_documents.canonical_event_id.in"
      );

      const searchResponse = await supabase
        .from(TABLES.canonicalEventSearchDocuments)
        .select(SEARCH_DOCUMENT_SELECT)
        .in("canonical_event_id", allCanonicalIds)
        .limit(50);

      if (searchResponse.error) throw searchResponse.error;

      relatedSearchDocuments = asRecordArray(searchResponse.data as unknown);

      audit.lookup_strategy.push("canonical_event_feature_feeds.canonical_event_id.in");

      const featureResponse = await supabase
        .from(TABLES.canonicalEventFeatureFeeds)
        .select(FEATURE_FEED_SELECT)
        .in("canonical_event_id", allCanonicalIds)
        .limit(100);

      if (featureResponse.error) throw featureResponse.error;

      relatedFeatureFeeds = asRecordArray(featureResponse.data as unknown);
    }

    const canonicalEvents = uniqueRecordsById([
      ...canonicalEventMatches,
      ...canonicalEventsFromIds,
    ]);

    const canonicalEventSources = uniqueRecordsById([
      ...sourceMatches,
      ...relatedSources,
    ]);

    const matchedCanonicalEventIds = uniqueStrings([
      ...canonicalEvents.map((record) => getRecordString(record, "id")),
      ...canonicalEventSources.map((record) =>
        getRecordString(record, "canonical_event_id")
      ),
    ]);

    audit.canonical_events = canonicalEvents;
    audit.canonical_event_sources = canonicalEventSources;
    audit.canonical_event_search_documents = uniqueRecordsById(relatedSearchDocuments);
    audit.canonical_event_feature_feeds = uniqueRecordsById(relatedFeatureFeeds);
    audit.matched_canonical_event_ids = matchedCanonicalEventIds;
    audit.matched_count = {
      canonical_events: audit.canonical_events.length,
      canonical_event_sources: audit.canonical_event_sources.length,
      canonical_event_search_documents:
        audit.canonical_event_search_documents.length,
      canonical_event_feature_feeds: audit.canonical_event_feature_feeds.length,
    };

    return audit;
  } catch (error) {
    audit.db_read_error =
      error instanceof Error ? error.message : "Unknown readback DB audit error.";

    return audit;
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

function buildJsonResponse(params: {
  method: "GET" | "POST";
  input: NormalizedInput;
  dbAudit: DbAuditResult;
}) {
  const lookupFields = getLookupFields(params.input);

  return NextResponse.json({
    ok: params.dbAudit.db_read_error === null,
    version: ROUTE_VERSION,
    mode: "readback_db_audit",
    route: "/api/official-events/canonical/admin/readback-db",
    method: params.method,
    database_write_performed: false,
    supabase_operation_performed: params.dbAudit.db_read_performed,
    supabase_read_performed: params.dbAudit.db_read_performed,
    write_blocked_by_design: true,
    input: params.input,
    audit: {
      requested_lookup_fields: lookupFields,
      lookup_ready: lookupFields.length > 0,
      can_be_used_before_real_write_test: true,
      notes: [
        "This route performs read-only Supabase SELECT operations.",
        "This route does not call the canonical write route.",
        "This route does not insert, update, delete, or upsert any record.",
        "This route is isolated from the v4.8.58 readback route.",
      ],
    },
    db_audit: params.dbAudit,
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return forbiddenResponse();
  }

  const input = normalizeInput({
    eventSlug: request.nextUrl.searchParams.get("eventSlug"),
    canonicalEventId: request.nextUrl.searchParams.get("canonicalEventId"),
    externalEventId: request.nextUrl.searchParams.get("externalEventId"),
    provider: request.nextUrl.searchParams.get("provider"),
  });

  const dbAudit = await runDbAudit(input);

  return buildJsonResponse({
    method: "GET",
    input,
    dbAudit,
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return forbiddenResponse();
  }

  let payload: ReadbackDbRequest = {};

  try {
    payload = (await request.json()) as ReadbackDbRequest;
  } catch {
    payload = {};
  }

  const input = normalizeInput(payload);
  const dbAudit = await runDbAudit(input);

  return buildJsonResponse({
    method: "POST",
    input,
    dbAudit,
  });
}