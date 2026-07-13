import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const ROUTE_VERSION =
  "v4.8.80-event-canonical-image-checksum-preview-safe" as const;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const IMAGE_FETCH_MAX_BYTES = 15_000_000;
const IMAGE_FETCH_MAX_REDIRECTS = 3;
const IMAGE_USAGE_SCOPE = "event_page_hero" as const;

const TABLES = {
  canonicalEvents: "canonical_events",
} as const;

const CHECKSUM_FIELDS = [
  "checksum_sha256",
  "image_checksum_sha256",
  "sha256",
  "checksum",
] as const;

type JsonObject = Record<string, unknown>;

type RouteBody = JsonObject & {
  canonicalEventId?: unknown;
  eventSlug?: unknown;
  dryRun?: unknown;
};

type CanonicalEventRow = {
  id: string;
  slug: string;
  event_name: string;
  validation_status: string | null;
  validation_method: string | null;
  is_100_percent_validated: boolean | null;
  metadata: JsonObject | null;
};

type OfficialImageRecord = {
  image_url: string;
  usage_scope: string | null;
  capture_mode: string | null;
  provenance_status: string | null;
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
  existing_checksum_field: string | null;
  existing_checksum_sha256: string | null;
};

type ImageFetchResult = {
  ok: boolean;
  status: number | null;
  error: string | null;
  initial_url: string;
  final_url: string | null;
  content_type: string | null;
  declared_bytes: number | null;
  bytes_read: number;
  redirects: number;
  checksum_sha256: string | null;
};

type ChecksumComparison = {
  existing_checksum_present: boolean;
  existing_checksum_field: string | null;
  existing_checksum_sha256: string | null;
  calculated_checksum_sha256: string | null;
  status: "not_calculated" | "not_present" | "match" | "mismatch";
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

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asPlainObject(value: unknown): JsonObject | null {
  return isPlainObject(value) ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

function normalizeSha256(value: unknown): string | null {
  const text = normalizeText(value).toLowerCase();
  return isSha256(text) ? text : null;
}

function isPrivateOrLocalIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some(
      (part) => !Number.isInteger(part) || part < 0 || part > 255
    )
  ) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateOrLocalIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mappedIpv4
    ? isPrivateOrLocalIpv4(mappedIpv4[1])
    : false;
}

function isPrivateOrLocalIp(address: string): boolean {
  const version = isIP(address);

  if (version === 4) return isPrivateOrLocalIpv4(address);
  if (version === 6) return isPrivateOrLocalIpv6(address);

  return true;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  return isIP(host) > 0 ? isPrivateOrLocalIp(host) : false;
}

function normalizePublicHttpsUrl(
  value: unknown,
  baseUrl?: string
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  try {
    const url = baseUrl ? new URL(normalized, baseUrl) : new URL(normalized);

    if (url.protocol !== "https:") return null;
    if (!url.hostname || isPrivateOrLocalHostname(url.hostname)) return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function hostnameResolvesOnlyToPublicAddresses(
  hostname: string
): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (isPrivateOrLocalHostname(host)) return false;
  if (isIP(host) > 0) return !isPrivateOrLocalIp(host);

  try {
    const addresses = await lookup(host, {
      all: true,
      verbatim: true,
    });

    return (
      addresses.length > 0 &&
      addresses.every((entry) => !isPrivateOrLocalIp(entry.address))
    );
  } catch {
    return false;
  }
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

function readOfficialImage(metadata: JsonObject | null): OfficialImageRecord | null {
  const rawOfficialImage = asPlainObject(metadata?.official_image);
  if (!rawOfficialImage) return null;

  const imageUrl = normalizePublicHttpsUrl(rawOfficialImage.image_url);
  if (!imageUrl) return null;

  let existingChecksumField: string | null = null;
  let existingChecksumSha256: string | null = null;

  for (const field of CHECKSUM_FIELDS) {
    const checksum = normalizeSha256(rawOfficialImage[field]);

    if (checksum) {
      existingChecksumField = field;
      existingChecksumSha256 = checksum;
      break;
    }
  }

  return {
    image_url: imageUrl,
    usage_scope: normalizeNullableText(rawOfficialImage.usage_scope),
    capture_mode: normalizeNullableText(rawOfficialImage.capture_mode),
    provenance_status: normalizeNullableText(
      rawOfficialImage.provenance_status
    ),
    provider_key: normalizeNullableText(rawOfficialImage.provider_key),
    external_event_id: normalizeNullableText(
      rawOfficialImage.external_event_id
    ),
    source_url: normalizePublicHttpsUrl(rawOfficialImage.source_url),
    existing_checksum_field: existingChecksumField,
    existing_checksum_sha256: existingChecksumSha256,
  };
}

async function readCanonicalEvent(params: {
  supabase: ReturnType<typeof getAdminClient>;
  canonicalEventId: string;
  eventSlug: string;
}): Promise<{ event: CanonicalEventRow | null; error: string | null }> {
  if (!params.supabase) {
    return { event: null, error: "supabase_admin_client_unavailable" };
  }

  let query = params.supabase
    .from(TABLES.canonicalEvents)
    .select(
      [
        "id",
        "slug",
        "event_name",
        "validation_status",
        "validation_method",
        "is_100_percent_validated",
        "metadata",
      ].join(",")
    );

  query = params.canonicalEventId
    ? query.eq("id", params.canonicalEventId)
    : query.eq("slug", params.eventSlug);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      event: null,
      error: error.message || "canonical_event_read_failed",
    };
  }

  return {
    event: data ? (data as unknown as CanonicalEventRow) : null,
    error: null,
  };
}

function buildChecksumComparison(params: {
  officialImage: OfficialImageRecord;
  calculatedChecksumSha256: string | null;
}): ChecksumComparison {
  const existing = params.officialImage.existing_checksum_sha256;
  const calculated = params.calculatedChecksumSha256;

  if (!calculated) {
    return {
      existing_checksum_present: Boolean(existing),
      existing_checksum_field:
        params.officialImage.existing_checksum_field,
      existing_checksum_sha256: existing,
      calculated_checksum_sha256: null,
      status: "not_calculated",
    };
  }

  if (!existing) {
    return {
      existing_checksum_present: false,
      existing_checksum_field: null,
      existing_checksum_sha256: null,
      calculated_checksum_sha256: calculated,
      status: "not_present",
    };
  }

  return {
    existing_checksum_present: true,
    existing_checksum_field:
      params.officialImage.existing_checksum_field,
    existing_checksum_sha256: existing,
    calculated_checksum_sha256: calculated,
    status: existing === calculated ? "match" : "mismatch",
  };
}

async function fetchImageAndCalculateChecksum(
  initialImageUrl: string
): Promise<ImageFetchResult> {
  let currentUrl = normalizePublicHttpsUrl(initialImageUrl);

  if (!currentUrl) {
    return {
      ok: false,
      status: null,
      error: "public_https_image_url_required",
      initial_url: initialImageUrl,
      final_url: null,
      content_type: null,
      declared_bytes: null,
      bytes_read: 0,
      redirects: 0,
      checksum_sha256: null,
    };
  }

  for (
    let redirectCount = 0;
    redirectCount <= IMAGE_FETCH_MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const parsedCurrentUrl = new URL(currentUrl);
    const dnsSafe = await hostnameResolvesOnlyToPublicAddresses(
      parsedCurrentUrl.hostname
    );

    if (!dnsSafe) {
      return {
        ok: false,
        status: null,
        error: "image_hostname_not_public",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: null,
        declared_bytes: null,
        bytes_read: 0,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      IMAGE_FETCH_TIMEOUT_MS
    );

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          accept:
            "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8,*/*;q=0.1",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.7",
          "user-agent":
            "Mozilla/5.0 (compatible; USECLUBBERS-CanonicalImageChecksumBot/1.0)",
        },
      });
    } catch (error) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: null,
        error:
          error instanceof Error && error.name === "AbortError"
            ? "image_fetch_timeout"
            : "image_fetch_failed",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: null,
        declared_bytes: null,
        bytes_read: 0,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const redirectedUrl = normalizePublicHttpsUrl(location, currentUrl);

      if (!redirectedUrl) {
        clearTimeout(timeout);

        return {
          ok: false,
          status: response.status,
          error: "image_redirect_url_invalid",
          initial_url: initialImageUrl,
          final_url: currentUrl,
          content_type: response.headers.get("content-type"),
          declared_bytes: null,
          bytes_read: 0,
          redirects: redirectCount,
          checksum_sha256: null,
        };
      }

      clearTimeout(timeout);
      currentUrl = redirectedUrl;
      continue;
    }

    if (!response.ok) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: response.status,
        error: "image_fetch_http_error",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: response.headers.get("content-type"),
        declared_bytes: null,
        bytes_read: 0,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    const contentType = normalizeText(
      response.headers.get("content-type")
    ).toLowerCase();

    if (!contentType.startsWith("image/")) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: response.status,
        error: "image_content_type_required",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: contentType || null,
        declared_bytes: null,
        bytes_read: 0,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    const declaredLengthHeader = normalizeText(
      response.headers.get("content-length")
    );
    const declaredLength = declaredLengthHeader
      ? Number(declaredLengthHeader)
      : null;

    if (
      declaredLength !== null &&
      Number.isFinite(declaredLength) &&
      declaredLength > IMAGE_FETCH_MAX_BYTES
    ) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: response.status,
        error: "image_response_too_large",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: contentType,
        declared_bytes: declaredLength,
        bytes_read: 0,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    if (!response.body) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: response.status,
        error: "image_response_body_missing",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: contentType,
        declared_bytes:
          declaredLength !== null && Number.isFinite(declaredLength)
            ? declaredLength
            : null,
        bytes_read: 0,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    const reader = response.body.getReader();
    const hasher = createHash("sha256");
    let bytesRead = 0;

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;

        bytesRead += chunk.value.byteLength;

        if (bytesRead > IMAGE_FETCH_MAX_BYTES) {
          await reader.cancel("image_response_too_large");
          clearTimeout(timeout);

          return {
            ok: false,
            status: response.status,
            error: "image_response_too_large",
            initial_url: initialImageUrl,
            final_url: currentUrl,
            content_type: contentType,
            declared_bytes:
              declaredLength !== null && Number.isFinite(declaredLength)
                ? declaredLength
                : null,
            bytes_read: bytesRead,
            redirects: redirectCount,
            checksum_sha256: null,
          };
        }

        hasher.update(chunk.value);
      }
    } catch (error) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: response.status,
        error:
          error instanceof Error && error.name === "AbortError"
            ? "image_stream_timeout"
            : "image_stream_read_failed",
        initial_url: initialImageUrl,
        final_url: currentUrl,
        content_type: contentType,
        declared_bytes:
          declaredLength !== null && Number.isFinite(declaredLength)
            ? declaredLength
            : null,
        bytes_read: bytesRead,
        redirects: redirectCount,
        checksum_sha256: null,
      };
    }

    clearTimeout(timeout);

    return {
      ok: true,
      status: response.status,
      error: null,
      initial_url: initialImageUrl,
      final_url: currentUrl,
      content_type: contentType,
      declared_bytes:
        declaredLength !== null && Number.isFinite(declaredLength)
          ? declaredLength
          : null,
      bytes_read: bytesRead,
      redirects: redirectCount,
      checksum_sha256: hasher.digest("hex"),
    };
  }

  return {
    ok: false,
    status: null,
    error: "image_redirect_limit_exceeded",
    initial_url: initialImageUrl,
    final_url: currentUrl,
    content_type: null,
    declared_bytes: null,
    bytes_read: 0,
    redirects: IMAGE_FETCH_MAX_REDIRECTS,
    checksum_sha256: null,
  };
}

function buildCapabilities() {
  return {
    routeVersion: ROUTE_VERSION,
    acceptedMethod: "POST",
    readOnly: true,
    dryRunOnly: true,
    databaseWriteEnabled: false,
    checksumWriteEnabled: false,
    externalImageFetchEnabled: true,
    canonicalEventMustBe100PercentValidated: true,
    existingOfficialImageRequired: true,
    officialImageWillNotBeChanged: true,
    publicHttpsImageRequired: true,
    privateAndLocalImageHostsBlocked: true,
    dnsPublicAddressValidationEnabled: true,
    nonStandardHttpsPortsBlocked: true,
    manualRedirectValidationEnabled: true,
    imageContentTypeRequired: true,
    streamingSizeLimitEnabled: true,
    imageFetchTimeoutMs: IMAGE_FETCH_TIMEOUT_MS,
    imageFetchMaximumBytes: IMAGE_FETCH_MAX_BYTES,
    imageFetchMaximumRedirects: IMAGE_FETCH_MAX_REDIRECTS,
    checksumAlgorithm: "sha256",
    existingChecksumComparisonEnabled: true,
    migrationRequired: false,
    ticketPolicyChanged: false,
  };
}

function baseResponse(params: {
  ok: boolean;
  mode: string;
  status?: number;
  payload?: JsonObject;
}) {
  return NextResponse.json(
    {
      ok: params.ok,
      scope: "event-canonical-image-checksum-preview",
      version: ROUTE_VERSION,
      mode: params.mode,
      ...(params.payload ?? {}),
      database_write_performed: false,
      checksum_write_performed: false,
      migration_performed: false,
      ticket_policy_changed: false,
    },
    params.status ? { status: params.status } : undefined
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 403,
      payload: {
        message: "Canonical image checksum preview route is not authorized.",
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
    });
  }

  return baseResponse({
    ok: true,
    mode: "capabilities",
    payload: {
      capabilities: buildCapabilities(),
      supabase_operation_performed: false,
      external_fetch_performed: false,
    },
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 403,
      payload: {
        message: "Canonical image checksum preview route is not authorized.",
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
    });
  }

  let body: RouteBody | null = null;

  try {
    const rawBody = await request.json();
    body = isPlainObject(rawBody) ? (rawBody as RouteBody) : null;
  } catch {
    body = null;
  }

  if (!body) {
    return baseResponse({
      ok: false,
      mode: "invalid_request",
      status: 400,
      payload: {
        reasons: ["json_body_required"],
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
    });
  }

  const requestedDryRun = normalizeBoolean(body.dryRun, true);
  const canonicalEventId = normalizeText(body.canonicalEventId);
  const eventSlug = normalizeText(body.eventSlug);
  const requestReasons: string[] = [];

  if (!canonicalEventId && !eventSlug) {
    requestReasons.push("canonical_event_id_or_event_slug_required");
  }

  if (canonicalEventId && !isUuid(canonicalEventId)) {
    requestReasons.push("canonical_event_id_must_be_uuid");
  }

  if (requestedDryRun === false) {
    requestReasons.push("checksum_preview_is_dry_run_only");
  }

  if (requestReasons.length > 0) {
    return baseResponse({
      ok: false,
      mode: "invalid_request",
      status: 400,
      payload: {
        reasons: requestReasons,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
    });
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return baseResponse({
      ok: false,
      mode: "configuration_error",
      status: 500,
      payload: {
        message: "Supabase service role is not configured.",
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
    });
  }

  const eventResult = await readCanonicalEvent({
    supabase,
    canonicalEventId,
    eventSlug,
  });

  if (eventResult.error) {
    return baseResponse({
      ok: false,
      mode: "read_error",
      status: 500,
      payload: {
        message: eventResult.error,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (!eventResult.event) {
    return baseResponse({
      ok: false,
      mode: "not_found",
      status: 404,
      payload: {
        reasons: ["canonical_event_not_found"],
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const event = eventResult.event;

  if (event.is_100_percent_validated !== true) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["canonical_event_must_be_100_percent_validated"],
        canonical_event: {
          id: event.id,
          slug: event.slug,
          event_name: event.event_name,
          validation_status: event.validation_status,
          validation_method: event.validation_method,
          is_100_percent_validated: false,
        },
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const officialImage = readOfficialImage(event.metadata);

  if (!officialImage) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["canonical_event_official_image_required"],
        canonical_event: {
          id: event.id,
          slug: event.slug,
          event_name: event.event_name,
          validation_status: event.validation_status,
          validation_method: event.validation_method,
          is_100_percent_validated: true,
        },
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (
    officialImage.usage_scope &&
    officialImage.usage_scope !== IMAGE_USAGE_SCOPE
  ) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["official_image_usage_scope_not_supported"],
        canonical_event: {
          id: event.id,
          slug: event.slug,
          event_name: event.event_name,
          is_100_percent_validated: true,
        },
        official_image: {
          image_url: officialImage.image_url,
          usage_scope: officialImage.usage_scope,
          capture_mode: officialImage.capture_mode,
          provenance_status: officialImage.provenance_status,
          provider_key: officialImage.provider_key,
          external_event_id: officialImage.external_event_id,
          source_url: officialImage.source_url,
        },
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const fetchResult = await fetchImageAndCalculateChecksum(
    officialImage.image_url
  );
  const comparison = buildChecksumComparison({
    officialImage,
    calculatedChecksumSha256: fetchResult.checksum_sha256,
  });

  return baseResponse({
    ok: fetchResult.ok,
    mode: "dry_run",
    status: fetchResult.ok ? undefined : 422,
    payload: {
      requested_dry_run: requestedDryRun,
      effective_dry_run: true,
      canonical_event: {
        id: event.id,
        slug: event.slug,
        event_name: event.event_name,
        validation_status: event.validation_status,
        validation_method: event.validation_method,
        is_100_percent_validated: true,
      },
      official_image: {
        image_url: officialImage.image_url,
        usage_scope: officialImage.usage_scope,
        capture_mode: officialImage.capture_mode,
        provenance_status: officialImage.provenance_status,
        provider_key: officialImage.provider_key,
        external_event_id: officialImage.external_event_id,
        source_url: officialImage.source_url,
      },
      fetch: fetchResult,
      checksum: comparison,
      checksum_preview_ready: fetchResult.ok,
      supabase_operation_performed: true,
      external_fetch_performed: true,
    },
  });
}
