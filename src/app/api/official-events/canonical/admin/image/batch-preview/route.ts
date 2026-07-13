import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const ROUTE_VERSION =
  "v4.8.77-event-canonical-image-batch-preview-safe" as const;
const SOURCE_AUTHORITY_MINIMUM = 80;
const DEFAULT_RESULT_LIMIT = 25;
const MAX_RESULT_LIMIT = 100;
const DEFAULT_SCAN_LIMIT = 200;
const MAX_SCAN_LIMIT = 500;

const TABLES = {
  canonicalEvents: "canonical_events",
  canonicalEventSources: "canonical_event_sources",
} as const;

const SUPPORTED_PROVIDER_HOSTS: Record<string, readonly string[]> = {
  ingresse: ["ingresse.com"],
};

type JsonObject = Record<string, unknown>;

type RouteBody = JsonObject & {
  limit?: unknown;
  scanLimit?: unknown;
  includeBlocked?: unknown;
};

type CanonicalEventRow = {
  id: string;
  slug: string;
  event_name: string;
  normalized_event_name: string | null;
  starts_at: string | null;
  event_date_key: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  primary_provider_key: string | null;
  primary_external_event_id: string | null;
  validation_status: string | null;
  validation_method: string | null;
  is_100_percent_validated: boolean | null;
  source_confidence_score: number | null;
  metadata: JsonObject | null;
  updated_at: string | null;
};

type CanonicalSourceRow = {
  id: string;
  canonical_event_id: string;
  source_key: string | null;
  source_kind: string | null;
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
  authority_score: number | null;
  integration_status: string | null;
  last_seen_at: string | null;
};

type SourceSelection = {
  source: CanonicalSourceRow | null;
  match_mode: "exact_primary" | "highest_authority_fallback" | "none";
};

type BatchPreviewItem = {
  canonical_event: {
    id: string;
    slug: string;
    event_name: string;
    starts_at: string | null;
    event_date_key: string | null;
    venue_name: string | null;
    city: string | null;
    state: string | null;
    validation_status: string | null;
    validation_method: string | null;
    source_confidence_score: number;
    is_100_percent_validated: true;
    existing_official_image_present: false;
  };
  source: {
    source_key: string | null;
    source_kind: string | null;
    provider_key: string | null;
    external_event_id: string | null;
    source_url: string | null;
    authority_score: number;
    integration_status: string | null;
    last_seen_at: string | null;
    match_mode: SourceSelection["match_mode"];
    provider_supported: boolean;
    provider_host_allowed: boolean;
    public_https_source: boolean;
  } | null;
  readiness: {
    ready_for_source_recapture: boolean;
    reasons: string[];
  };
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;

  const text = normalizeText(value).toLowerCase();
  if (["true", "1", "yes", "sim"].includes(text)) return true;
  if (["false", "0", "no", "nao", "não"].includes(text)) return false;

  return fallback;
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number.parseInt(normalizeText(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asPlainObject(value: unknown): JsonObject | null {
  return isPlainObject(value) ? value : null;
}

function clampScore(value: unknown, fallback = 0): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
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
    /^169\.254\./.test(host) ||
    /^0\./.test(host)
  ) {
    return true;
  }

  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (!private172) return false;

  const secondOctet = Number(private172[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function normalizePublicHttpsUrl(value: unknown): string | null {
  const normalized = normalizeText(value);
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

function providerSupportsSourceUrl(
  providerKey: string,
  sourceUrl: string
): boolean {
  const allowedHosts = SUPPORTED_PROVIDER_HOSTS[providerKey.toLowerCase()];
  if (!allowedHosts || allowedHosts.length === 0) return false;

  const normalizedUrl = normalizePublicHttpsUrl(sourceUrl);
  if (!normalizedUrl) return false;

  const hostname = new URL(normalizedUrl).hostname.toLowerCase();

  return allowedHosts.some(
    (allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
  );
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isAuthorized(
  request: NextRequest,
  searchParams: URLSearchParams
): boolean {
  const configuredSecret = normalizeText(
    process.env.OFFICIAL_EVENTS_RESOLVER_SECRET
  );

  if (!configuredSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!configuredSecret) return false;

  const headerSecret = normalizeText(
    request.headers.get("x-official-events-secret")
  );
  const querySecret = normalizeText(searchParams.get("secret"));

  return headerSecret === configuredSecret || querySecret === configuredSecret;
}

function getExistingOfficialImage(
  metadata: JsonObject | null
): JsonObject | null {
  if (!metadata) return null;

  const image = asPlainObject(metadata.official_image);
  if (!image) return null;

  return normalizePublicHttpsUrl(image.image_url) ? image : null;
}

function chooseSource(params: {
  event: CanonicalEventRow;
  sources: CanonicalSourceRow[];
}): SourceSelection {
  const sortedSources = [...params.sources].sort(
    (left, right) =>
      clampScore(right.authority_score, 0) -
      clampScore(left.authority_score, 0)
  );

  const primaryProvider = normalizeText(
    params.event.primary_provider_key
  ).toLowerCase();
  const primaryExternalId = normalizeText(
    params.event.primary_external_event_id
  );

  const exactPrimary = sortedSources.find(
    (source) =>
      normalizeText(source.provider_key).toLowerCase() === primaryProvider &&
      normalizeText(source.external_event_id) === primaryExternalId
  );

  if (exactPrimary) {
    return {
      source: exactPrimary,
      match_mode: "exact_primary",
    };
  }

  const fallback = sortedSources[0] ?? null;

  return {
    source: fallback,
    match_mode: fallback ? "highest_authority_fallback" : "none",
  };
}

function buildPreviewItem(params: {
  event: CanonicalEventRow;
  sources: CanonicalSourceRow[];
}): BatchPreviewItem {
  const selection = chooseSource(params);
  const source = selection.source;
  const reasons: string[] = [];

  if (params.event.is_100_percent_validated !== true) {
    reasons.push("canonical_event_must_be_100_percent_validated");
  }

  if (getExistingOfficialImage(params.event.metadata)) {
    reasons.push("canonical_event_already_has_official_image");
  }

  if (!source) {
    reasons.push("canonical_source_not_found");
  }

  const providerKey = normalizeText(source?.provider_key).toLowerCase();
  const externalEventId = normalizeText(source?.external_event_id);
  const sourceUrl = normalizeText(source?.source_url);
  const normalizedSourceUrl = normalizePublicHttpsUrl(sourceUrl);
  const authorityScore = clampScore(source?.authority_score, 0);
  const providerSupported = Boolean(
    providerKey && SUPPORTED_PROVIDER_HOSTS[providerKey]
  );
  const providerHostAllowed = Boolean(
    providerKey &&
      normalizedSourceUrl &&
      providerSupportsSourceUrl(providerKey, normalizedSourceUrl)
  );

  if (source) {
    if (!providerKey) {
      reasons.push("source_provider_key_required");
    }

    if (!externalEventId) {
      reasons.push("source_external_event_id_required");
    }

    if (authorityScore < SOURCE_AUTHORITY_MINIMUM) {
      reasons.push("source_authority_below_minimum_80");
    }

    if (!normalizedSourceUrl) {
      reasons.push("source_public_https_url_required");
    }

    if (providerKey && !providerSupported) {
      reasons.push("source_provider_not_supported");
    }

    if (providerSupported && normalizedSourceUrl && !providerHostAllowed) {
      reasons.push("source_provider_host_not_allowed");
    }
  }

  const readyForSourceRecapture = reasons.length === 0;

  return {
    canonical_event: {
      id: params.event.id,
      slug: params.event.slug,
      event_name: params.event.event_name,
      starts_at: normalizeNullableText(params.event.starts_at),
      event_date_key: normalizeNullableText(params.event.event_date_key),
      venue_name: normalizeNullableText(params.event.venue_name),
      city: normalizeNullableText(params.event.city),
      state: normalizeNullableText(params.event.state),
      validation_status: normalizeNullableText(
        params.event.validation_status
      ),
      validation_method: normalizeNullableText(
        params.event.validation_method
      ),
      source_confidence_score: clampScore(
        params.event.source_confidence_score,
        0
      ),
      is_100_percent_validated: true,
      existing_official_image_present: false,
    },
    source: source
      ? {
          source_key: normalizeNullableText(source.source_key),
          source_kind: normalizeNullableText(source.source_kind),
          provider_key: providerKey || null,
          external_event_id: externalEventId || null,
          source_url: normalizedSourceUrl,
          authority_score: authorityScore,
          integration_status: normalizeNullableText(
            source.integration_status
          ),
          last_seen_at: normalizeNullableText(source.last_seen_at),
          match_mode: selection.match_mode,
          provider_supported: providerSupported,
          provider_host_allowed: providerHostAllowed,
          public_https_source: Boolean(normalizedSourceUrl),
        }
      : null,
    readiness: {
      ready_for_source_recapture: readyForSourceRecapture,
      reasons,
    },
  };
}

async function readValidatedCanonicalEvents(params: {
  supabase: ReturnType<typeof getAdminClient>;
  scanLimit: number;
}): Promise<{ events: CanonicalEventRow[]; error: string | null }> {
  if (!params.supabase) {
    return { events: [], error: "supabase_admin_client_unavailable" };
  }

  const { data, error } = await params.supabase
    .from(TABLES.canonicalEvents)
    .select(
      [
        "id",
        "slug",
        "event_name",
        "normalized_event_name",
        "starts_at",
        "event_date_key",
        "venue_name",
        "city",
        "state",
        "primary_provider_key",
        "primary_external_event_id",
        "validation_status",
        "validation_method",
        "is_100_percent_validated",
        "source_confidence_score",
        "metadata",
        "updated_at",
      ].join(",")
    )
    .eq("is_100_percent_validated", true)
    .order("starts_at", { ascending: true })
    .limit(params.scanLimit);

  if (error) {
    return {
      events: [],
      error: error.message || "validated_canonical_events_read_failed",
    };
  }

  return {
    events: Array.isArray(data)
      ? (data as unknown as CanonicalEventRow[])
      : [],
    error: null,
  };
}

async function readCanonicalSources(params: {
  supabase: ReturnType<typeof getAdminClient>;
  canonicalEventIds: string[];
  scanLimit: number;
}): Promise<{ sources: CanonicalSourceRow[]; error: string | null }> {
  if (!params.supabase) {
    return { sources: [], error: "supabase_admin_client_unavailable" };
  }

  if (params.canonicalEventIds.length === 0) {
    return { sources: [], error: null };
  }

  const sourceLimit = Math.min(params.scanLimit * 10, 5_000);

  const { data, error } = await params.supabase
    .from(TABLES.canonicalEventSources)
    .select(
      [
        "id",
        "canonical_event_id",
        "source_key",
        "source_kind",
        "provider_key",
        "external_event_id",
        "source_url",
        "authority_score",
        "integration_status",
        "last_seen_at",
      ].join(",")
    )
    .in("canonical_event_id", params.canonicalEventIds)
    .order("authority_score", { ascending: false })
    .limit(sourceLimit);

  if (error) {
    return {
      sources: [],
      error: error.message || "canonical_event_sources_read_failed",
    };
  }

  return {
    sources: Array.isArray(data)
      ? (data as unknown as CanonicalSourceRow[])
      : [],
    error: null,
  };
}

function buildCapabilities() {
  return {
    routeVersion: ROUTE_VERSION,
    acceptedMethod: "POST",
    readOnly: true,
    dryRunOnly: true,
    databaseWriteEnabled: false,
    externalFetchEnabled: false,
    canonicalEventMustBe100PercentValidated: true,
    existingOfficialImageExcluded: true,
    sourceAuthorityMinimum: SOURCE_AUTHORITY_MINIMUM,
    supportedProviders: Object.keys(SUPPORTED_PROVIDER_HOSTS),
    providerHostAllowlistEnabled: true,
    publicHttpsSourceRequired: true,
    privateSourceHostsBlocked: true,
    defaultResultLimit: DEFAULT_RESULT_LIMIT,
    maximumResultLimit: MAX_RESULT_LIMIT,
    defaultScanLimit: DEFAULT_SCAN_LIMIT,
    maximumScanLimit: MAX_SCAN_LIMIT,
    migrationRequired: false,
    ticketPolicyChanged: false,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-batch-preview",
        mode: "blocked",
        message: "Canonical image batch preview route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-image-batch-preview",
    version: ROUTE_VERSION,
    mode: "capabilities",
    capabilities: buildCapabilities(),
    database_write_performed: false,
    supabase_operation_performed: false,
    external_fetch_performed: false,
    migration_performed: false,
    ticket_policy_changed: false,
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-batch-preview",
        mode: "blocked",
        message: "Canonical image batch preview route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 403 }
    );
  }

  let body: RouteBody = {};

  try {
    const rawBody = await request.json();
    body = isPlainObject(rawBody) ? (rawBody as RouteBody) : {};
  } catch {
    body = {};
  }

  const resultLimit = normalizeInteger(
    body.limit,
    DEFAULT_RESULT_LIMIT,
    1,
    MAX_RESULT_LIMIT
  );
  const scanLimit = normalizeInteger(
    body.scanLimit,
    DEFAULT_SCAN_LIMIT,
    resultLimit,
    MAX_SCAN_LIMIT
  );
  const includeBlocked = normalizeBoolean(body.includeBlocked, true);
  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-batch-preview",
        version: ROUTE_VERSION,
        mode: "configuration_error",
        message: "Supabase service role is not configured.",
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 500 }
    );
  }

  const eventsResult = await readValidatedCanonicalEvents({
    supabase,
    scanLimit,
  });

  if (eventsResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-batch-preview",
        version: ROUTE_VERSION,
        mode: "read_error",
        message: eventsResult.error,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
      { status: 500 }
    );
  }

  const eventsWithoutOfficialImage = eventsResult.events.filter(
    (event) => !getExistingOfficialImage(event.metadata)
  );
  const canonicalEventIds = eventsWithoutOfficialImage.map(
    (event) => event.id
  );
  const sourcesResult = await readCanonicalSources({
    supabase,
    canonicalEventIds,
    scanLimit,
  });

  if (sourcesResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-batch-preview",
        version: ROUTE_VERSION,
        mode: "read_error",
        message: sourcesResult.error,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
      { status: 500 }
    );
  }

  const sourcesByEventId = new Map<string, CanonicalSourceRow[]>();

  for (const source of sourcesResult.sources) {
    const eventId = normalizeText(source.canonical_event_id);
    if (!eventId) continue;

    const existing = sourcesByEventId.get(eventId) ?? [];
    existing.push(source);
    sourcesByEventId.set(eventId, existing);
  }

  const allItems = eventsWithoutOfficialImage.map((event) =>
    buildPreviewItem({
      event,
      sources: sourcesByEventId.get(event.id) ?? [],
    })
  );

  const readyItems = allItems.filter(
    (item) => item.readiness.ready_for_source_recapture
  );
  const blockedItems = allItems.filter(
    (item) => !item.readiness.ready_for_source_recapture
  );
  const filteredItems = includeBlocked ? allItems : readyItems;
  const returnedItems = filteredItems.slice(0, resultLimit);

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-image-batch-preview",
    version: ROUTE_VERSION,
    mode: "dry_run",
    filters: {
      result_limit: resultLimit,
      scan_limit: scanLimit,
      include_blocked: includeBlocked,
      source_authority_minimum: SOURCE_AUTHORITY_MINIMUM,
      supported_providers: Object.keys(SUPPORTED_PROVIDER_HOSTS),
    },
    summary: {
      scanned_validated_events: eventsResult.events.length,
      already_have_official_image:
        eventsResult.events.length - eventsWithoutOfficialImage.length,
      missing_official_image: eventsWithoutOfficialImage.length,
      ready_for_source_recapture: readyItems.length,
      blocked: blockedItems.length,
      returned: returnedItems.length,
      result_truncated: filteredItems.length > returnedItems.length,
    },
    events: returnedItems,
    safety: {
      read_only: true,
      dry_run_only: true,
      database_write_enabled: false,
      external_fetch_enabled: false,
      provider_host_allowlist_enabled: true,
      public_https_source_required: true,
      private_source_hosts_blocked: true,
      ticket_policy_changed: false,
      migration_required: false,
    },
    database_write_performed: false,
    supabase_operation_performed: true,
    external_fetch_performed: false,
    migration_performed: false,
    ticket_policy_changed: false,
  });
}
