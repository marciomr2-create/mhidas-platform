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
  "v4.8.82-event-canonical-image-checksum-admin-write-route-safe" as const;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const IMAGE_FETCH_MAX_BYTES = 15_000_000;
const IMAGE_FETCH_MAX_REDIRECTS = 3;
const IMAGE_USAGE_SCOPE = "event_page_hero" as const;
const WRITE_CONFIRMATION_PHRASE =
  "CONFIRM_CANONICAL_EVENT_IMAGE_CHECKSUM_WRITE" as const;
const PREFLIGHT_VALIDITY_MS = 15 * 60 * 1000;
const PREFLIGHT_ROUTE_VERSION =
  "v4.8.81-event-canonical-image-checksum-write-preflight-safe" as const;

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
  confirmWrite?: unknown;
  confirmationPhrase?: unknown;
  confirmationDigestSha256?: unknown;
  preflightContract?: unknown;
};

type PreviewSnapshot = {
  checksum_sha256: string;
  image_url: string;
  usage_scope: string | null;
  capture_mode: string | null;
  provenance_status: string | null;
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
};

type ImageIdentitySnapshot = {
  image_url: string;
  usage_scope: string | null;
  capture_mode: string | null;
  provenance_status: string | null;
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
};


type ConfirmationPayloadRecord = {
  confirmation_phrase: string;
  canonical_event_id: string;
  event_slug: string;
  expected_image_url: string;
  expected_source_url: string | null;
  expected_provider_key: string | null;
  expected_external_event_id: string | null;
  expected_capture_mode: string | null;
  expected_provenance_status: string | null;
  expected_checksum_sha256: string;
  expected_existing_checksum_sha256: string | null;
  metadata_patch: JsonObject;
  generated_at: string;
  expires_at: string;
};

type ValidatedPreflightContract = {
  phrase: string;
  digest_algorithm: "sha256";
  digest_sha256: string;
  generated_at: string;
  expires_at: string;
  payload: ConfirmationPayloadRecord;
  raw_payload: JsonObject;
};

type PreflightContractValidationResult = {
  ok: boolean;
  reasons: string[];
  contract: ValidatedPreflightContract | null;
};

type CanonicalEventRow = {
  id: string;
  slug: string;
  event_name: string;
  validation_status: string | null;
  validation_method: string | null;
  is_100_percent_validated: boolean | null;
  metadata: JsonObject | null;
  updated_at: string | null;
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


function buildImageIdentitySnapshot(
  officialImage: OfficialImageRecord
): ImageIdentitySnapshot {
  return {
    image_url: officialImage.image_url,
    usage_scope: officialImage.usage_scope,
    capture_mode: officialImage.capture_mode,
    provenance_status: officialImage.provenance_status,
    provider_key: officialImage.provider_key,
    external_event_id: officialImage.external_event_id,
    source_url: officialImage.source_url,
  };
}

function compareSnapshotToOfficialImage(params: {
  expected: PreviewSnapshot;
  actual: OfficialImageRecord;
  suffix:
    | "since_preview"
    | "during_preflight"
    | "since_preflight"
    | "during_write";
}): string[] {
  const reasons: string[] = [];
  const actualSnapshot = buildImageIdentitySnapshot(params.actual);

  const comparisons: Array<{
    field: keyof ImageIdentitySnapshot;
    reason: string;
  }> = [
    {
      field: "image_url",
      reason: `official_image_url_changed_${params.suffix}`,
    },
    {
      field: "usage_scope",
      reason: `official_image_usage_scope_changed_${params.suffix}`,
    },
    {
      field: "capture_mode",
      reason: `official_image_capture_mode_changed_${params.suffix}`,
    },
    {
      field: "provenance_status",
      reason: `official_image_provenance_status_changed_${params.suffix}`,
    },
    {
      field: "provider_key",
      reason: `official_image_provider_key_changed_${params.suffix}`,
    },
    {
      field: "external_event_id",
      reason: `official_image_external_event_id_changed_${params.suffix}`,
    },
    {
      field: "source_url",
      reason: `official_image_source_url_changed_${params.suffix}`,
    },
  ];

  for (const comparison of comparisons) {
    const expectedValue = params.expected[comparison.field];
    const actualValue = actualSnapshot[comparison.field];

    if (expectedValue !== actualValue) {
      reasons.push(comparison.reason);
    }
  }

  return reasons;
}

function compareOfficialImagesDuringWrite(params: {
  before: OfficialImageRecord;
  after: OfficialImageRecord;
}): string[] {
  const expected: PreviewSnapshot = {
    checksum_sha256:
      params.before.existing_checksum_sha256 ?? "0".repeat(64),
    ...buildImageIdentitySnapshot(params.before),
  };

  return compareSnapshotToOfficialImage({
    expected,
    actual: params.after,
    suffix: "during_write",
  });
}

function createConfirmationDigest(payload: JsonObject): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function parseIsoTimestamp(value: unknown): {
  text: string | null;
  milliseconds: number | null;
} {
  const text = normalizeText(value);
  if (!text) return { text: null, milliseconds: null };

  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds)) {
    return { text: null, milliseconds: null };
  }

  return {
    text: new Date(milliseconds).toISOString(),
    milliseconds,
  };
}

function validatePreflightContract(
  value: unknown,
  nowMilliseconds: number
): PreflightContractValidationResult {
  if (!isPlainObject(value)) {
    return {
      ok: false,
      reasons: ["preflight_contract_required"],
      contract: null,
    };
  }

  const reasons: string[] = [];
  const phrase = normalizeText(value.phrase);
  const digestAlgorithm = normalizeText(value.digest_algorithm).toLowerCase();
  const digestSha256 = normalizeSha256(value.digest_sha256);
  const generatedAt = parseIsoTimestamp(value.generated_at);
  const expiresAt = parseIsoTimestamp(value.expires_at);
  const rawPayload = asPlainObject(value.payload);

  if (phrase !== WRITE_CONFIRMATION_PHRASE) {
    reasons.push("preflight_contract_phrase_invalid");
  }

  if (digestAlgorithm !== "sha256") {
    reasons.push("preflight_contract_digest_algorithm_invalid");
  }

  if (!digestSha256) {
    reasons.push("preflight_contract_digest_sha256_invalid");
  }

  if (!generatedAt.text || generatedAt.milliseconds === null) {
    reasons.push("preflight_contract_generated_at_invalid");
  }

  if (!expiresAt.text || expiresAt.milliseconds === null) {
    reasons.push("preflight_contract_expires_at_invalid");
  }

  if (!rawPayload) {
    reasons.push("preflight_contract_payload_required");
  }

  if (
    generatedAt.milliseconds !== null &&
    generatedAt.milliseconds > nowMilliseconds + 60_000
  ) {
    reasons.push("preflight_contract_generated_in_future");
  }

  if (
    generatedAt.milliseconds !== null &&
    expiresAt.milliseconds !== null &&
    expiresAt.milliseconds <= generatedAt.milliseconds
  ) {
    reasons.push("preflight_contract_expiry_order_invalid");
  }

  if (
    generatedAt.milliseconds !== null &&
    expiresAt.milliseconds !== null &&
    expiresAt.milliseconds - generatedAt.milliseconds >
      PREFLIGHT_VALIDITY_MS + 60_000
  ) {
    reasons.push("preflight_contract_validity_window_invalid");
  }

  if (
    expiresAt.milliseconds !== null &&
    expiresAt.milliseconds < nowMilliseconds
  ) {
    reasons.push("preflight_contract_expired");
  }

  if (!rawPayload) {
    return {
      ok: false,
      reasons,
      contract: null,
    };
  }

  const payloadPhrase = normalizeText(rawPayload.confirmation_phrase);
  const canonicalEventId = normalizeText(rawPayload.canonical_event_id);
  const eventSlug = normalizeText(rawPayload.event_slug);
  const expectedImageUrl = normalizePublicHttpsUrl(
    rawPayload.expected_image_url
  );
  const expectedSourceUrlRaw = normalizeNullableText(
    rawPayload.expected_source_url
  );
  const expectedSourceUrl = expectedSourceUrlRaw
    ? normalizePublicHttpsUrl(expectedSourceUrlRaw)
    : null;
  const expectedProviderKey = normalizeNullableText(
    rawPayload.expected_provider_key
  );
  const expectedExternalEventId = normalizeNullableText(
    rawPayload.expected_external_event_id
  );
  const expectedCaptureMode = normalizeNullableText(
    rawPayload.expected_capture_mode
  );
  const expectedProvenanceStatus = normalizeNullableText(
    rawPayload.expected_provenance_status
  );
  const expectedChecksumSha256 = normalizeSha256(
    rawPayload.expected_checksum_sha256
  );
  const expectedExistingChecksumRaw = normalizeNullableText(
    rawPayload.expected_existing_checksum_sha256
  );
  const expectedExistingChecksumSha256 = expectedExistingChecksumRaw
    ? normalizeSha256(expectedExistingChecksumRaw)
    : null;
  const metadataPatch = asPlainObject(rawPayload.metadata_patch);
  const payloadGeneratedAt = parseIsoTimestamp(rawPayload.generated_at);
  const payloadExpiresAt = parseIsoTimestamp(rawPayload.expires_at);

  if (payloadPhrase !== WRITE_CONFIRMATION_PHRASE) {
    reasons.push("preflight_payload_confirmation_phrase_invalid");
  }

  if (!isUuid(canonicalEventId)) {
    reasons.push("preflight_payload_canonical_event_id_invalid");
  }

  if (!eventSlug) {
    reasons.push("preflight_payload_event_slug_required");
  }

  if (!expectedImageUrl) {
    reasons.push("preflight_payload_expected_image_url_invalid");
  }

  if (expectedSourceUrlRaw && !expectedSourceUrl) {
    reasons.push("preflight_payload_expected_source_url_invalid");
  }

  if (!expectedProviderKey) {
    reasons.push("preflight_payload_expected_provider_key_required");
  }

  if (!expectedExternalEventId) {
    reasons.push("preflight_payload_expected_external_event_id_required");
  }

  if (!expectedCaptureMode) {
    reasons.push("preflight_payload_expected_capture_mode_required");
  }

  if (!expectedProvenanceStatus) {
    reasons.push("preflight_payload_expected_provenance_status_required");
  }

  if (!expectedChecksumSha256) {
    reasons.push("preflight_payload_expected_checksum_invalid");
  }

  if (
    expectedExistingChecksumRaw &&
    !expectedExistingChecksumSha256
  ) {
    reasons.push("preflight_payload_existing_checksum_invalid");
  }

  if (!metadataPatch) {
    reasons.push("preflight_payload_metadata_patch_required");
  }

  if (
    !payloadGeneratedAt.text ||
    payloadGeneratedAt.text !== generatedAt.text
  ) {
    reasons.push("preflight_payload_generated_at_mismatch");
  }

  if (
    !payloadExpiresAt.text ||
    payloadExpiresAt.text !== expiresAt.text
  ) {
    reasons.push("preflight_payload_expires_at_mismatch");
  }

  const recomputedDigest = createConfirmationDigest(rawPayload);

  if (digestSha256 && recomputedDigest !== digestSha256) {
    reasons.push("preflight_contract_digest_mismatch");
  }

  const metadataOfficialImage = metadataPatch
    ? asPlainObject(metadataPatch.official_image)
    : null;

  if (!metadataOfficialImage) {
    reasons.push("preflight_metadata_official_image_patch_required");
  } else {
    const patchChecksum = normalizeSha256(
      metadataOfficialImage.checksum_sha256
    );
    const patchAlgorithm = normalizeText(
      metadataOfficialImage.checksum_algorithm
    ).toLowerCase();
    const patchImageUrl = normalizePublicHttpsUrl(
      metadataOfficialImage.checksum_source_image_url
    );
    const patchPreflightVersion = normalizeText(
      metadataOfficialImage.checksum_preflight_version
    );

    if (
      !patchChecksum ||
      patchChecksum !== expectedChecksumSha256
    ) {
      reasons.push("preflight_metadata_checksum_mismatch");
    }

    if (patchAlgorithm !== "sha256") {
      reasons.push("preflight_metadata_checksum_algorithm_invalid");
    }

    if (
      !patchImageUrl ||
      patchImageUrl !== expectedImageUrl
    ) {
      reasons.push("preflight_metadata_image_url_mismatch");
    }

    if (patchPreflightVersion !== PREFLIGHT_ROUTE_VERSION) {
      reasons.push("preflight_metadata_version_invalid");
    }
  }

  if (
    reasons.length > 0 ||
    !digestSha256 ||
    !generatedAt.text ||
    !expiresAt.text ||
    !expectedImageUrl ||
    !expectedChecksumSha256 ||
    !metadataPatch
  ) {
    return {
      ok: false,
      reasons,
      contract: null,
    };
  }

  return {
    ok: true,
    reasons: [],
    contract: {
      phrase,
      digest_algorithm: "sha256",
      digest_sha256: digestSha256,
      generated_at: generatedAt.text,
      expires_at: expiresAt.text,
      payload: {
        confirmation_phrase: payloadPhrase,
        canonical_event_id: canonicalEventId,
        event_slug: eventSlug,
        expected_image_url: expectedImageUrl,
        expected_source_url: expectedSourceUrl,
        expected_provider_key: expectedProviderKey,
        expected_external_event_id: expectedExternalEventId,
        expected_capture_mode: expectedCaptureMode,
        expected_provenance_status: expectedProvenanceStatus,
        expected_checksum_sha256: expectedChecksumSha256,
        expected_existing_checksum_sha256:
          expectedExistingChecksumSha256,
        metadata_patch: metadataPatch,
        generated_at: generatedAt.text,
        expires_at: expiresAt.text,
      },
      raw_payload: rawPayload,
    },
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
        "updated_at",
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
    dryRunDefault: true,
    writeEnabled: true,
    singleEventOnly: true,
    protectedAdminRoute: true,
    canonicalEventMustBe100PercentValidated: true,
    existingOfficialImageRequired: true,
    preflightContractRequired: true,
    preflightRouteVersion: PREFLIGHT_ROUTE_VERSION,
    preflightContractExpiryRequired: true,
    explicitWriteConfirmationRequired: true,
    confirmationPhrase: WRITE_CONFIRMATION_PHRASE,
    confirmationDigestRequired: true,
    checksumRecalculatedImmediatelyBeforeWrite: true,
    doubleReadDriftDetectionEnabled: true,
    optimisticUpdatedAtGuardEnabled: true,
    existingChecksumConflictDetectionEnabled: true,
    alreadyAppliedIdempotencyEnabled: true,
    metadataMergePreservesExistingFields: true,
    onlyMetadataOfficialImageChanged: true,
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
    migrationRequired: false,
    ticketPolicyChanged: false,
  };
}

function baseResponse(params: {
  ok: boolean;
  mode: string;
  status?: number;
  payload?: JsonObject;
  databaseWritePerformed?: boolean;
  checksumWritePerformed?: boolean;
}) {
  return NextResponse.json(
    {
      ok: params.ok,
      scope: "event-canonical-image-checksum-admin-write",
      version: ROUTE_VERSION,
      mode: params.mode,
      ...(params.payload ?? {}),
      database_write_performed:
        params.databaseWritePerformed === true,
      checksum_write_performed:
        params.checksumWritePerformed === true,
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
        message:
          "Canonical image checksum admin write route is not authorized.",
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
        message:
          "Canonical image checksum admin write route is not authorized.",
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

  const nowMilliseconds = Date.now();
  const requestedDryRun = normalizeBoolean(body.dryRun, true);
  const requestedWrite = requestedDryRun === false;
  const confirmWrite = normalizeBoolean(body.confirmWrite, false);
  const confirmationPhrase = normalizeText(body.confirmationPhrase);
  const confirmationDigestSha256 = normalizeSha256(
    body.confirmationDigestSha256
  );
  const contractValidation = validatePreflightContract(
    body.preflightContract,
    nowMilliseconds
  );
  const requestReasons = [...contractValidation.reasons];
  const canonicalEventId = normalizeText(body.canonicalEventId);
  const eventSlug = normalizeText(body.eventSlug);

  if (!canonicalEventId || !isUuid(canonicalEventId)) {
    requestReasons.push("canonical_event_id_uuid_required");
  }

  if (!eventSlug) {
    requestReasons.push("event_slug_required");
  }

  const contract = contractValidation.contract;

  if (contract) {
    if (canonicalEventId !== contract.payload.canonical_event_id) {
      requestReasons.push(
        "canonical_event_id_does_not_match_preflight_contract"
      );
    }

    if (eventSlug !== contract.payload.event_slug) {
      requestReasons.push(
        "event_slug_does_not_match_preflight_contract"
      );
    }
  }

  const explicitWriteConfirmed =
    requestedWrite &&
    confirmWrite &&
    confirmationPhrase === WRITE_CONFIRMATION_PHRASE &&
    Boolean(
      confirmationDigestSha256 &&
        contract &&
        confirmationDigestSha256 === contract.digest_sha256
    );

  if (requestedWrite && !confirmWrite) {
    requestReasons.push("confirm_write_true_required");
  }

  if (
    requestedWrite &&
    confirmationPhrase !== WRITE_CONFIRMATION_PHRASE
  ) {
    requestReasons.push("write_confirmation_phrase_invalid");
  }

  if (
    requestedWrite &&
    (!confirmationDigestSha256 ||
      !contract ||
      confirmationDigestSha256 !== contract.digest_sha256)
  ) {
    requestReasons.push("write_confirmation_digest_invalid");
  }

  if (requestReasons.length > 0 || !contract) {
    return baseResponse({
      ok: false,
      mode: "invalid_request",
      status: 400,
      payload: {
        reasons: Array.from(new Set(requestReasons)),
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: false,
        write_ready: false,
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
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
    });
  }

  const beforeResult = await readCanonicalEvent({
    supabase,
    canonicalEventId,
    eventSlug,
  });

  if (beforeResult.error) {
    return baseResponse({
      ok: false,
      mode: "read_error",
      status: 500,
      payload: {
        message: beforeResult.error,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (!beforeResult.event) {
    return baseResponse({
      ok: false,
      mode: "not_found",
      status: 404,
      payload: {
        reasons: ["canonical_event_not_found"],
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const beforeEvent = beforeResult.event;

  if (
    beforeEvent.id !== contract.payload.canonical_event_id ||
    beforeEvent.slug !== contract.payload.event_slug
  ) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["canonical_event_identity_mismatch"],
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (beforeEvent.is_100_percent_validated !== true) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["canonical_event_must_be_100_percent_validated"],
        canonical_event: {
          id: beforeEvent.id,
          slug: beforeEvent.slug,
          event_name: beforeEvent.event_name,
          validation_status: beforeEvent.validation_status,
          validation_method: beforeEvent.validation_method,
          is_100_percent_validated: false,
        },
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const beforeImage = readOfficialImage(beforeEvent.metadata);

  if (!beforeImage) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["canonical_event_official_image_required"],
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (
    beforeImage.usage_scope &&
    beforeImage.usage_scope !== IMAGE_USAGE_SCOPE
  ) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["official_image_usage_scope_not_supported"],
        official_image: buildImageIdentitySnapshot(beforeImage),
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const contractSnapshot: PreviewSnapshot = {
    checksum_sha256: contract.payload.expected_checksum_sha256,
    image_url: contract.payload.expected_image_url,
    usage_scope: IMAGE_USAGE_SCOPE,
    capture_mode: contract.payload.expected_capture_mode,
    provenance_status:
      contract.payload.expected_provenance_status,
    provider_key: contract.payload.expected_provider_key,
    external_event_id:
      contract.payload.expected_external_event_id,
    source_url: contract.payload.expected_source_url,
  };

  const contractDriftReasons = compareSnapshotToOfficialImage({
    expected: contractSnapshot,
    actual: beforeImage,
    suffix: "since_preflight",
  });

  if (contractDriftReasons.length > 0) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: contractDriftReasons,
        canonical_event: {
          id: beforeEvent.id,
          slug: beforeEvent.slug,
          event_name: beforeEvent.event_name,
        },
        preflight_contract_digest_sha256:
          contract.digest_sha256,
        current_official_image:
          buildImageIdentitySnapshot(beforeImage),
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const beforeExistingChecksum =
    beforeImage.existing_checksum_sha256;
  const expectedExistingChecksum =
    contract.payload.expected_existing_checksum_sha256;

  if (
    expectedExistingChecksum &&
    beforeExistingChecksum !== expectedExistingChecksum
  ) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["existing_checksum_changed_since_preflight"],
        expected_existing_checksum_sha256:
          expectedExistingChecksum,
        current_existing_checksum_sha256:
          beforeExistingChecksum,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (
    beforeExistingChecksum &&
    beforeExistingChecksum !==
      contract.payload.expected_checksum_sha256
  ) {
    return baseResponse({
      ok: false,
      mode: "checksum_conflict",
      status: 409,
      payload: {
        reasons: [
          "existing_checksum_conflicts_with_preflight_checksum",
        ],
        existing_checksum_sha256: beforeExistingChecksum,
        expected_checksum_sha256:
          contract.payload.expected_checksum_sha256,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  if (
    beforeExistingChecksum ===
    contract.payload.expected_checksum_sha256
  ) {
    return baseResponse({
      ok: true,
      mode: "already_applied",
      payload: {
        message:
          "The same canonical image checksum is already persisted.",
        canonical_event: {
          id: beforeEvent.id,
          slug: beforeEvent.slug,
          event_name: beforeEvent.event_name,
        },
        checksum_sha256: beforeExistingChecksum,
        existing_checksum_field:
          beforeImage.existing_checksum_field,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: !explicitWriteConfirmed,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: true,
        write_required: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
    });
  }

  const fetchResult = await fetchImageAndCalculateChecksum(
    beforeImage.image_url
  );

  if (!fetchResult.ok || !fetchResult.checksum_sha256) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 422,
      payload: {
        reasons: ["checksum_recalculation_failed"],
        canonical_event: {
          id: beforeEvent.id,
          slug: beforeEvent.slug,
          event_name: beforeEvent.event_name,
        },
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  if (
    fetchResult.checksum_sha256 !==
    contract.payload.expected_checksum_sha256
  ) {
    return baseResponse({
      ok: false,
      mode: "checksum_changed",
      status: 409,
      payload: {
        reasons: ["image_checksum_changed_since_preflight"],
        expected_checksum_sha256:
          contract.payload.expected_checksum_sha256,
        calculated_checksum_sha256:
          fetchResult.checksum_sha256,
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  const afterResult = await readCanonicalEvent({
    supabase,
    canonicalEventId: beforeEvent.id,
    eventSlug: beforeEvent.slug,
  });

  if (afterResult.error || !afterResult.event) {
    return baseResponse({
      ok: false,
      mode: "read_error",
      status: 500,
      payload: {
        message:
          afterResult.error ??
          "Canonical event could not be re-read before checksum write.",
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  const afterEvent = afterResult.event;
  const afterImage = readOfficialImage(afterEvent.metadata);

  if (
    afterEvent.id !== contract.payload.canonical_event_id ||
    afterEvent.slug !== contract.payload.event_slug
  ) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["canonical_event_identity_changed_during_write"],
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  if (
    afterEvent.is_100_percent_validated !== true ||
    !afterImage
  ) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: [
          afterEvent.is_100_percent_validated !== true
            ? "canonical_event_validation_changed_during_write"
            : "official_image_removed_during_write",
        ],
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  const duringWriteReasons =
    compareOfficialImagesDuringWrite({
      before: beforeImage,
      after: afterImage,
    });

  const contractAfterFetchReasons =
    compareSnapshotToOfficialImage({
      expected: contractSnapshot,
      actual: afterImage,
      suffix: "during_write",
    });

  duringWriteReasons.push(...contractAfterFetchReasons);

  const afterExistingChecksum =
    afterImage.existing_checksum_sha256;

  if (
    afterExistingChecksum &&
    afterExistingChecksum !== fetchResult.checksum_sha256
  ) {
    duringWriteReasons.push(
      "existing_checksum_conflicts_with_calculated_checksum"
    );
  }

  if (duringWriteReasons.length > 0) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: Array.from(new Set(duringWriteReasons)),
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  if (afterExistingChecksum === fetchResult.checksum_sha256) {
    return baseResponse({
      ok: true,
      mode: "already_applied",
      payload: {
        message:
          "The same canonical image checksum was persisted during validation.",
        canonical_event: {
          id: afterEvent.id,
          slug: afterEvent.slug,
          event_name: afterEvent.event_name,
        },
        checksum_sha256: afterExistingChecksum,
        existing_checksum_field:
          afterImage.existing_checksum_field,
        fetch: fetchResult,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: !explicitWriteConfirmed,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: true,
        write_required: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  const currentMetadata =
    asPlainObject(afterEvent.metadata) ?? {};
  const currentOfficialImage = asPlainObject(
    currentMetadata.official_image
  );

  if (!currentOfficialImage) {
    return baseResponse({
      ok: false,
      mode: "blocked",
      status: 409,
      payload: {
        reasons: ["official_image_metadata_object_required"],
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: explicitWriteConfirmed,
        write_ready: false,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  const checksumWriteTimestamp = new Date().toISOString();
  const proposedOfficialImage: JsonObject = {
    ...currentOfficialImage,
    checksum_sha256: fetchResult.checksum_sha256,
    checksum_algorithm: "sha256",
    checksum_bytes: fetchResult.bytes_read,
    checksum_content_type: fetchResult.content_type,
    checksum_calculated_at: checksumWriteTimestamp,
    checksum_source_image_url: afterImage.image_url,
    checksum_source_final_url: fetchResult.final_url,
    checksum_preflight_version: PREFLIGHT_ROUTE_VERSION,
    checksum_registered_at: checksumWriteTimestamp,
    checksum_write_version: ROUTE_VERSION,
    checksum_confirmation_digest_sha256:
      contract.digest_sha256,
  };
  const proposedMetadata: JsonObject = {
    ...currentMetadata,
    official_image: proposedOfficialImage,
  };
  const metadataPatch = {
    merge_strategy:
      "merge_into_metadata_official_image_preserving_existing_fields",
    official_image: {
      checksum_sha256: fetchResult.checksum_sha256,
      checksum_algorithm: "sha256",
      checksum_bytes: fetchResult.bytes_read,
      checksum_content_type: fetchResult.content_type,
      checksum_calculated_at: checksumWriteTimestamp,
      checksum_source_image_url: afterImage.image_url,
      checksum_source_final_url: fetchResult.final_url,
      checksum_preflight_version: PREFLIGHT_ROUTE_VERSION,
      checksum_registered_at: checksumWriteTimestamp,
      checksum_write_version: ROUTE_VERSION,
      checksum_confirmation_digest_sha256:
        contract.digest_sha256,
    },
  };

  if (!explicitWriteConfirmed) {
    return baseResponse({
      ok: true,
      mode: "dry_run",
      payload: {
        message:
          "Checksum write route validated the request in dry-run mode.",
        canonical_event: {
          id: afterEvent.id,
          slug: afterEvent.slug,
          event_name: afterEvent.event_name,
          validation_status: afterEvent.validation_status,
          validation_method: afterEvent.validation_method,
          is_100_percent_validated: true,
        },
        checksum: {
          calculated_checksum_sha256:
            fetchResult.checksum_sha256,
          existing_checksum_present: false,
          existing_checksum_sha256: null,
          write_required: true,
        },
        fetch: fetchResult,
        metadata_patch_preview: metadataPatch,
        preflight_contract_digest_sha256:
          contract.digest_sha256,
        requested_write: requestedWrite,
        requested_dry_run: requestedDryRun,
        effective_dry_run: true,
        explicit_write_confirmed: false,
        write_ready: true,
        write_required: true,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  let updateQuery = supabase
    .from(TABLES.canonicalEvents)
    .update({
      metadata: proposedMetadata,
    })
    .eq("id", afterEvent.id)
    .eq("slug", afterEvent.slug)
    .eq("is_100_percent_validated", true);

  updateQuery = afterEvent.updated_at
    ? updateQuery.eq("updated_at", afterEvent.updated_at)
    : updateQuery.is("updated_at", null);

  const { data: updatedData, error: updateError } =
    await updateQuery
      .select(
        [
          "id",
          "slug",
          "event_name",
          "validation_status",
          "validation_method",
          "is_100_percent_validated",
          "metadata",
          "updated_at",
        ].join(",")
      )
      .maybeSingle();

  if (updateError) {
    return baseResponse({
      ok: false,
      mode: "write_failed",
      status: 500,
      payload: {
        message:
          updateError.message ||
          "Canonical image checksum write failed.",
        canonical_event: {
          id: afterEvent.id,
          slug: afterEvent.slug,
          event_name: afterEvent.event_name,
        },
        requested_write: true,
        requested_dry_run: false,
        effective_dry_run: false,
        explicit_write_confirmed: true,
        write_ready: true,
        write_required: true,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  if (!updatedData) {
    return baseResponse({
      ok: false,
      mode: "write_conflict",
      status: 409,
      payload: {
        reasons: [
          "canonical_event_changed_immediately_before_write",
        ],
        canonical_event: {
          id: afterEvent.id,
          slug: afterEvent.slug,
          event_name: afterEvent.event_name,
        },
        requested_write: true,
        requested_dry_run: false,
        effective_dry_run: false,
        explicit_write_confirmed: true,
        write_ready: false,
        write_required: true,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
    });
  }

  const updatedEvent =
    updatedData as unknown as CanonicalEventRow;
  const updatedImage = readOfficialImage(updatedEvent.metadata);
  const persistedChecksum =
    updatedImage?.existing_checksum_sha256 ?? null;
  const writeVerified =
    persistedChecksum === fetchResult.checksum_sha256;

  if (!writeVerified) {
    return baseResponse({
      ok: false,
      mode: "write_verification_failed",
      status: 500,
      payload: {
        reasons: ["persisted_checksum_verification_failed"],
        canonical_event: {
          id: updatedEvent.id,
          slug: updatedEvent.slug,
          event_name: updatedEvent.event_name,
        },
        expected_checksum_sha256:
          fetchResult.checksum_sha256,
        persisted_checksum_sha256: persistedChecksum,
        requested_write: true,
        requested_dry_run: false,
        effective_dry_run: false,
        explicit_write_confirmed: true,
        write_ready: false,
        write_required: true,
        supabase_operation_performed: true,
        external_fetch_performed: true,
      },
      databaseWritePerformed: true,
      checksumWritePerformed: false,
    });
  }

  return baseResponse({
    ok: true,
    mode: "written",
    payload: {
      message:
        "Canonical image checksum persisted with explicit confirmation.",
      canonical_event: {
        id: updatedEvent.id,
        slug: updatedEvent.slug,
        event_name: updatedEvent.event_name,
        validation_status: updatedEvent.validation_status,
        validation_method: updatedEvent.validation_method,
        is_100_percent_validated:
          updatedEvent.is_100_percent_validated === true,
        updated_at: updatedEvent.updated_at,
      },
      checksum: {
        checksum_sha256: persistedChecksum,
        checksum_algorithm: "sha256",
        checksum_bytes: fetchResult.bytes_read,
        checksum_content_type: fetchResult.content_type,
        checksum_registered_at: checksumWriteTimestamp,
        checksum_write_version: ROUTE_VERSION,
      },
      preflight_contract_digest_sha256:
        contract.digest_sha256,
      requested_write: true,
      requested_dry_run: false,
      effective_dry_run: false,
      explicit_write_confirmed: true,
      write_ready: true,
      write_required: false,
      supabase_operation_performed: true,
      external_fetch_performed: true,
    },
    databaseWritePerformed: true,
    checksumWritePerformed: true,
  });
}
