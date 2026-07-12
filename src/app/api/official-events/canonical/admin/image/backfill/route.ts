import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const ROUTE_VERSION =
  "v4.8.75-event-canonical-image-source-recapture-safe" as const;
const WRITE_CONFIRMATION_PHRASE =
  "CONFIRM_CANONICAL_EVENT_IMAGE_SOURCE_RECAPTURE" as const;
const IMAGE_USAGE_SCOPE = "event_page_hero" as const;
const SOURCE_AUTHORITY_MINIMUM = 80;
const SOURCE_FETCH_TIMEOUT_MS = 12_000;
const SOURCE_FETCH_MAX_BYTES = 2_500_000;
const SOURCE_FETCH_MAX_REDIRECTS = 3;

const TABLES = {
  canonicalEvents: "canonical_events",
  canonicalEventSources: "canonical_event_sources",
} as const;

const SUPPORTED_PROVIDER_HOSTS: Record<string, readonly string[]> = {
  ingresse: ["ingresse.com"],
};

const GENERIC_IMAGE_KEY_PATTERN =
  /"(?:image_url|imageUrl|event_image_url|eventImageUrl|posterUrl|coverUrl|bannerUrl)"\s*:\s*"([^"]+)"/gi;

type JsonObject = Record<string, unknown>;

type RouteBody = JsonObject & {
  dryRun?: unknown;
  confirmWrite?: unknown;
  confirmationPhrase?: unknown;
  adminUserId?: unknown;
  canonicalEventId?: unknown;
  eventSlug?: unknown;
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

type HtmlFetchResult = {
  ok: boolean;
  status: number | null;
  error: string | null;
  html: string;
  final_url: string | null;
  content_type: string | null;
  bytes: number;
  redirects: number;
};

type ImageCandidate = {
  image_url: string;
  extraction_method: string;
  rank: number;
};

type SourceCapture = {
  image_url: string;
  extraction_method: string;
  source_page_url: string;
  source_page_final_url: string;
  source_page_title: string | null;
  source_page_content_type: string | null;
  source_page_bytes: number;
  source_page_redirects: number;
  identity_match: boolean;
  candidate_count: number;
};

type RecapturePlan = {
  can_backfill: boolean;
  reasons: string[];
  canonical_event: {
    id: string;
    slug: string;
    event_name: string;
    validation_status: string | null;
    is_100_percent_validated: boolean;
    existing_official_image_present: boolean;
  };
  source: {
    source_key: string;
    source_kind: string | null;
    provider_key: string;
    external_event_id: string;
    source_url: string;
    authority_score: number;
    provider_supported: boolean;
  } | null;
  fetch: {
    ok: boolean;
    status: number | null;
    error: string | null;
    final_url: string | null;
    content_type: string | null;
    bytes: number;
    redirects: number;
  } | null;
  capture: SourceCapture | null;
  official_image_payload: JsonObject | null;
  canonical_metadata_payload: JsonObject | null;
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

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeForComparison(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clampScore(value: unknown, fallback = 0): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replace(/\\\//g, "/")
    .trim();
}

function parseHtmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(pattern)) {
    const name = normalizeText(match[1]).toLowerCase();
    const value = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");

    if (name && !(name in attributes)) {
      attributes[name] = value;
    }
  }

  return attributes;
}

function getPageTitle(html: string): string | null {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return null;

  const title = decodeHtmlEntities(
    titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
  );

  return title || null;
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

function isRejectedImageUrl(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl);
    const haystack = `${url.hostname}${url.pathname}`.toLowerCase();

    return [
      "facebook.com/tr",
      "doubleclick",
      "google-analytics",
      "analytics",
      "tracking",
      "pixel",
      "favicon",
      "sprite",
      "appstore",
      "googleplay",
      "/flags/",
      "/flag/",
      "/avatar/",
      "/icon/",
      "/icons/",
      "/logo/",
      "/logos/",
    ].some((token) => haystack.includes(token));
  } catch {
    return true;
  }
}

function collectJsonLdImages(
  value: unknown,
  output: string[],
  depth = 0
): void {
  if (depth > 10 || value === null || value === undefined) return;

  if (typeof value === "string") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLdImages(item, output, depth + 1);
    }
    return;
  }

  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === "image") {
      if (typeof child === "string") {
        output.push(child);
      } else if (Array.isArray(child)) {
        for (const item of child) {
          if (typeof item === "string") {
            output.push(item);
          } else if (isPlainObject(item)) {
            const url = normalizeText(item.url || item.contentUrl);
            if (url) output.push(url);
          }
        }
      } else if (isPlainObject(child)) {
        const url = normalizeText(child.url || child.contentUrl);
        if (url) output.push(url);
      }
    }

    collectJsonLdImages(child, output, depth + 1);
  }
}

function extractImageCandidates(
  html: string,
  baseUrl: string
): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];

  const addCandidate = (
    rawUrl: unknown,
    extractionMethod: string,
    rank: number
  ) => {
    const decoded = decodeHtmlEntities(normalizeText(rawUrl));
    const normalizedUrl = normalizePublicHttpsUrl(decoded, baseUrl);

    if (!normalizedUrl || isRejectedImageUrl(normalizedUrl)) return;

    candidates.push({
      image_url: normalizedUrl,
      extraction_method: extractionMethod,
      rank,
    });
  };

  for (const tagMatch of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseHtmlAttributes(tagMatch[0]);
    const key = normalizeText(
      attributes.property || attributes.name || attributes.itemprop
    ).toLowerCase();
    const content = attributes.content;

    if (!content) continue;

    const metaRanks: Record<string, number> = {
      "og:image:secure_url": 120,
      "og:image:url": 115,
      "og:image": 110,
      "twitter:image": 105,
      "twitter:image:src": 100,
      image: 95,
    };

    if (key in metaRanks) {
      addCandidate(content, `meta:${key}`, metaRanks[key]);
    }
  }

  for (const tagMatch of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = parseHtmlAttributes(tagMatch[0]);
    const rel = normalizeText(attributes.rel).toLowerCase();

    if (
      rel
        .split(/\s+/)
        .some((item) => item === "image_src" || item === "preload")
    ) {
      const asValue = normalizeText(attributes.as).toLowerCase();

      if (rel.includes("image_src") || asValue === "image") {
        addCandidate(attributes.href, `link:${rel}`, 90);
      }
    }
  }

  for (const scriptMatch of html.matchAll(
    /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    const rawJson = decodeHtmlEntities(scriptMatch[1]).trim();
    if (!rawJson) continue;

    try {
      const parsed: unknown = JSON.parse(rawJson);
      const images: string[] = [];
      collectJsonLdImages(parsed, images);

      for (const image of images) {
        addCandidate(image, "json_ld:image", 85);
      }
    } catch {
      // Invalid third-party JSON-LD is ignored safely.
    }
  }

  for (const match of html.matchAll(GENERIC_IMAGE_KEY_PATTERN)) {
    addCandidate(match[1], "embedded_json:image_key", 70);
  }

  const deduplicated = new Map<string, ImageCandidate>();

  for (const candidate of candidates) {
    const current = deduplicated.get(candidate.image_url);

    if (!current || candidate.rank > current.rank) {
      deduplicated.set(candidate.image_url, candidate);
    }
  }

  return [...deduplicated.values()].sort((left, right) => {
    if (right.rank !== left.rank) return right.rank - left.rank;
    return left.image_url.localeCompare(right.image_url);
  });
}

function sourceIdentityMatches(params: {
  event: CanonicalEventRow;
  source: CanonicalSourceRow;
  finalUrl: string;
  pageTitle: string | null;
  html: string;
}): boolean {
  const externalId = normalizeForComparison(params.source.external_event_id);
  const finalUrlComparable = normalizeForComparison(params.finalUrl);

  if (externalId && finalUrlComparable.includes(externalId)) {
    return true;
  }

  const eventName = normalizeForComparison(
    params.event.normalized_event_name || params.event.event_name
  );
  const pageTitle = normalizeForComparison(params.pageTitle);
  const htmlComparable = normalizeForComparison(params.html.slice(0, 300_000));

  if (eventName && pageTitle) {
    if (pageTitle.includes(eventName) || eventName.includes(pageTitle)) {
      return true;
    }
  }

  const meaningfulTokens = eventName
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 8);

  const matchingTokens = meaningfulTokens.filter(
    (token) =>
      pageTitle.includes(token) || htmlComparable.includes(token)
  );

  return meaningfulTokens.length > 0 && matchingTokens.length >= 2;
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
  return asPlainObject(metadata.official_image);
}

function isCanonicalEventValidated(event: CanonicalEventRow): boolean {
  return event.is_100_percent_validated === true;
}

function choosePrimarySource(params: {
  event: CanonicalEventRow;
  sources: CanonicalSourceRow[];
}): CanonicalSourceRow | null {
  const eligible = params.sources
    .filter((source) => {
      const authority = clampScore(source.authority_score, 0);

      return (
        authority >= SOURCE_AUTHORITY_MINIMUM &&
        Boolean(normalizeText(source.provider_key)) &&
        Boolean(normalizeText(source.external_event_id)) &&
        Boolean(normalizePublicHttpsUrl(source.source_url))
      );
    })
    .sort(
      (left, right) =>
        clampScore(right.authority_score, 0) -
        clampScore(left.authority_score, 0)
    );

  const primaryProvider = normalizeText(params.event.primary_provider_key);
  const primaryExternalId = normalizeText(
    params.event.primary_external_event_id
  );

  const exactPrimary = eligible.find(
    (source) =>
      normalizeText(source.provider_key) === primaryProvider &&
      normalizeText(source.external_event_id) === primaryExternalId
  );

  return exactPrimary ?? eligible[0] ?? null;
}

async function fetchValidatedSourcePage(params: {
  providerKey: string;
  sourceUrl: string;
}): Promise<HtmlFetchResult> {
  let currentUrl = normalizePublicHttpsUrl(params.sourceUrl);

  if (!currentUrl) {
    return {
      ok: false,
      status: null,
      error: "source_public_https_url_required",
      html: "",
      final_url: null,
      content_type: null,
      bytes: 0,
      redirects: 0,
    };
  }

  for (
    let redirectCount = 0;
    redirectCount <= SOURCE_FETCH_MAX_REDIRECTS;
    redirectCount += 1
  ) {
    if (!providerSupportsSourceUrl(params.providerKey, currentUrl)) {
      return {
        ok: false,
        status: null,
        error: "source_provider_host_not_supported",
        html: "",
        final_url: currentUrl,
        content_type: null,
        bytes: 0,
        redirects: redirectCount,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      SOURCE_FETCH_TIMEOUT_MS
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
            "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.7",
          "user-agent":
            "Mozilla/5.0 (compatible; USECLUBBERS-CanonicalEventImageBot/1.0)",
        },
      });
    } catch (error) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: null,
        error:
          error instanceof Error && error.name === "AbortError"
            ? "source_fetch_timeout"
            : "source_fetch_failed",
        html: "",
        final_url: currentUrl,
        content_type: null,
        bytes: 0,
        redirects: redirectCount,
      };
    }

    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const redirectedUrl = normalizePublicHttpsUrl(location, currentUrl);

      if (!redirectedUrl) {
        return {
          ok: false,
          status: response.status,
          error: "source_redirect_url_invalid",
          html: "",
          final_url: currentUrl,
          content_type: response.headers.get("content-type"),
          bytes: 0,
          redirects: redirectCount,
        };
      }

      currentUrl = redirectedUrl;
      continue;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "source_fetch_http_error",
        html: "",
        final_url: currentUrl,
        content_type: response.headers.get("content-type"),
        bytes: 0,
        redirects: redirectCount,
      };
    }

    const contentType = normalizeText(response.headers.get("content-type"));
    const acceptedContentType =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml") ||
      contentType.includes("application/json");

    if (!acceptedContentType) {
      return {
        ok: false,
        status: response.status,
        error: "source_content_type_not_supported",
        html: "",
        final_url: currentUrl,
        content_type: contentType || null,
        bytes: 0,
        redirects: redirectCount,
      };
    }

    const declaredLength = Number(
      response.headers.get("content-length") || "0"
    );

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > SOURCE_FETCH_MAX_BYTES
    ) {
      return {
        ok: false,
        status: response.status,
        error: "source_response_too_large",
        html: "",
        final_url: currentUrl,
        content_type: contentType || null,
        bytes: declaredLength,
        redirects: redirectCount,
      };
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > SOURCE_FETCH_MAX_BYTES) {
      return {
        ok: false,
        status: response.status,
        error: "source_response_too_large",
        html: "",
        final_url: currentUrl,
        content_type: contentType || null,
        bytes: buffer.byteLength,
        redirects: redirectCount,
      };
    }

    return {
      ok: true,
      status: response.status,
      error: null,
      html: new TextDecoder("utf-8").decode(buffer),
      final_url: currentUrl,
      content_type: contentType || null,
      bytes: buffer.byteLength,
      redirects: redirectCount,
    };
  }

  return {
    ok: false,
    status: null,
    error: "source_redirect_limit_exceeded",
    html: "",
    final_url: currentUrl,
    content_type: null,
    bytes: 0,
    redirects: SOURCE_FETCH_MAX_REDIRECTS,
  };
}

function buildRecapturePlan(params: {
  event: CanonicalEventRow;
  source: CanonicalSourceRow | null;
  fetchResult: HtmlFetchResult | null;
  capturedAt: string;
}): RecapturePlan {
  const reasons: string[] = [];
  const existingOfficialImage = getExistingOfficialImage(params.event.metadata);

  if (!isCanonicalEventValidated(params.event)) {
    reasons.push("canonical_event_must_be_100_percent_validated");
  }

  if (existingOfficialImage) {
    reasons.push("canonical_event_already_has_official_image");
  }

  if (!params.source) {
    reasons.push("validated_primary_source_with_authority_80_required");
  }

  const providerKey = normalizeText(params.source?.provider_key).toLowerCase();
  const sourceUrl = normalizePublicHttpsUrl(params.source?.source_url);
  const providerSupported = Boolean(
    params.source &&
      sourceUrl &&
      providerSupportsSourceUrl(providerKey, sourceUrl)
  );

  if (params.source && !providerSupported) {
    reasons.push("validated_source_provider_not_supported");
  }

  if (params.source && !sourceUrl) {
    reasons.push("validated_source_public_https_url_required");
  }

  if (params.source && providerSupported && !params.fetchResult?.ok) {
    reasons.push(
      params.fetchResult?.error || "validated_source_page_fetch_failed"
    );
  }

  const pageTitle =
    params.fetchResult?.ok && params.fetchResult.html
      ? getPageTitle(params.fetchResult.html)
      : null;

  const finalUrl =
    normalizePublicHttpsUrl(params.fetchResult?.final_url) || sourceUrl;

  const identityMatch = Boolean(
    params.source &&
      params.fetchResult?.ok &&
      finalUrl &&
      sourceIdentityMatches({
        event: params.event,
        source: params.source,
        finalUrl,
        pageTitle,
        html: params.fetchResult.html,
      })
  );

  if (
    params.source &&
    params.fetchResult?.ok &&
    finalUrl &&
    !identityMatch
  ) {
    reasons.push("validated_source_page_identity_mismatch");
  }

  const imageCandidates =
    params.fetchResult?.ok && finalUrl
      ? extractImageCandidates(params.fetchResult.html, finalUrl)
      : [];

  const selectedImage = imageCandidates[0] ?? null;

  if (
    params.source &&
    params.fetchResult?.ok &&
    identityMatch &&
    !selectedImage
  ) {
    reasons.push("validated_source_page_image_not_found");
  }

  const canBackfill =
    reasons.length === 0 &&
    Boolean(params.source) &&
    Boolean(sourceUrl) &&
    providerSupported &&
    Boolean(params.fetchResult?.ok) &&
    Boolean(finalUrl) &&
    identityMatch &&
    Boolean(selectedImage);

  const capture: SourceCapture | null =
    canBackfill &&
    params.source &&
    sourceUrl &&
    finalUrl &&
    selectedImage &&
    params.fetchResult
      ? {
          image_url: selectedImage.image_url,
          extraction_method: selectedImage.extraction_method,
          source_page_url: sourceUrl,
          source_page_final_url: finalUrl,
          source_page_title: pageTitle,
          source_page_content_type: params.fetchResult.content_type,
          source_page_bytes: params.fetchResult.bytes,
          source_page_redirects: params.fetchResult.redirects,
          identity_match: identityMatch,
          candidate_count: imageCandidates.length,
        }
      : null;

  const officialImagePayload =
    capture && params.source
      ? {
          image_url: capture.image_url,
          alt_text: normalizeNullableText(params.event.event_name),
          source_label: normalizeNullableText(params.source.provider_key),
          usage_scope: IMAGE_USAGE_SCOPE,
          capture_mode: "validated_source_page_recapture",
          provenance_status: "validated_source",
          provider_key: normalizeNullableText(params.source.provider_key),
          external_event_id: normalizeNullableText(
            params.source.external_event_id
          ),
          source_key: normalizeNullableText(params.source.source_key),
          source_kind: normalizeNullableText(params.source.source_kind),
          source_url: capture.source_page_url,
          source_page_final_url: capture.source_page_final_url,
          source_page_title: capture.source_page_title,
          extraction_method: capture.extraction_method,
          captured_at: params.capturedAt,
          validation_method:
            normalizeNullableText(params.event.validation_method) ??
            "existing_event_validated_source_page_recapture",
          source_confidence_score: clampScore(
            params.event.source_confidence_score,
            0
          ),
          source_authority_score: clampScore(
            params.source.authority_score,
            0
          ),
          capture_version: ROUTE_VERSION,
        }
      : null;

  const baseMetadata = params.event.metadata
    ? { ...params.event.metadata }
    : {};

  delete baseMetadata.official_image_admin;

  const canonicalMetadataPayload = officialImagePayload
    ? {
        ...baseMetadata,
        official_image: officialImagePayload,
      }
    : null;

  return {
    can_backfill: canBackfill,
    reasons,
    canonical_event: {
      id: params.event.id,
      slug: params.event.slug,
      event_name: params.event.event_name,
      validation_status: params.event.validation_status,
      is_100_percent_validated: isCanonicalEventValidated(params.event),
      existing_official_image_present: Boolean(existingOfficialImage),
    },
    source: params.source
      ? {
          source_key: normalizeText(params.source.source_key),
          source_kind: normalizeNullableText(params.source.source_kind),
          provider_key: providerKey,
          external_event_id: normalizeText(
            params.source.external_event_id
          ),
          source_url: sourceUrl || "",
          authority_score: clampScore(params.source.authority_score, 0),
          provider_supported: providerSupported,
        }
      : null,
    fetch: params.fetchResult
      ? {
          ok: params.fetchResult.ok,
          status: params.fetchResult.status,
          error: params.fetchResult.error,
          final_url: params.fetchResult.final_url,
          content_type: params.fetchResult.content_type,
          bytes: params.fetchResult.bytes,
          redirects: params.fetchResult.redirects,
        }
      : null,
    capture,
    official_image_payload: officialImagePayload,
    canonical_metadata_payload: canonicalMetadataPayload,
  };
}

function buildCapabilities() {
  return {
    routeVersion: ROUTE_VERSION,
    acceptedMethod: "POST",
    dryRunDefault: true,
    writeConfirmationPhraseRequired: WRITE_CONFIRMATION_PHRASE,
    canonicalEventMustBe100PercentValidated: true,
    existingOfficialImageWillNotBeOverwritten: true,
    confirmedCandidateRequired: false,
    validatedSourcePageRecaptureEnabled: true,
    supportedProviders: Object.keys(SUPPORTED_PROVIDER_HOSTS),
    publicHttpsSourceRequired: true,
    publicHttpsImageRequired: true,
    privateImageHostsBlocked: true,
    sourceAuthorityMinimum: SOURCE_AUTHORITY_MINIMUM,
    technicalProvenanceRecorded: true,
    manualAuthorizationRequired: false,
    migrationRequired: false,
    ticketPolicyChanged: false,
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

async function readCanonicalSources(params: {
  supabase: ReturnType<typeof getAdminClient>;
  canonicalEventId: string;
}): Promise<{ sources: CanonicalSourceRow[]; error: string | null }> {
  if (!params.supabase) {
    return { sources: [], error: "supabase_admin_client_unavailable" };
  }

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
    .eq("canonical_event_id", params.canonicalEventId)
    .order("authority_score", { ascending: false })
    .limit(50);

  if (error) {
    return {
      sources: [],
      error: error.message || "canonical_sources_read_failed",
    };
  }

  return {
    sources: Array.isArray(data)
      ? (data as unknown as CanonicalSourceRow[])
      : [],
    error: null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "blocked",
        message: "Canonical image source recapture route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-image-source-recapture",
    mode: "capabilities",
    capabilities: buildCapabilities(),
    database_write_performed: false,
    supabase_operation_performed: false,
    external_fetch_performed: false,
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "blocked",
        message: "Canonical image source recapture route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 403 }
    );
  }

  let body: RouteBody | null = null;

  try {
    const rawBody = await request.json();
    body = isPlainObject(rawBody) ? (rawBody as RouteBody) : null;
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "invalid_request",
        reasons: ["json_body_required"],
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 400 }
    );
  }

  const dryRun = normalizeBoolean(body.dryRun, true);
  const confirmWrite = normalizeBoolean(body.confirmWrite, false);
  const confirmationPhrase = normalizeText(body.confirmationPhrase);
  const adminUserId = normalizeText(body.adminUserId);
  const canonicalEventId = normalizeText(body.canonicalEventId);
  const eventSlug = normalizeText(body.eventSlug);
  const requestReasons: string[] = [];

  if (!canonicalEventId && !eventSlug) {
    requestReasons.push("canonical_event_id_or_event_slug_required");
  }

  if (canonicalEventId && !isUuid(canonicalEventId)) {
    requestReasons.push("canonical_event_id_must_be_uuid");
  }

  if (!isUuid(adminUserId)) {
    requestReasons.push("valid_admin_user_id_required");
  }

  if (requestReasons.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "invalid_request",
        reasons: requestReasons,
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "configuration_error",
        message: "Supabase service role is not configured.",
        database_write_performed: false,
        supabase_operation_performed: false,
        external_fetch_performed: false,
      },
      { status: 500 }
    );
  }

  const canonicalEventResult = await readCanonicalEvent({
    supabase,
    canonicalEventId,
    eventSlug,
  });

  if (canonicalEventResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "read_error",
        message: canonicalEventResult.error,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
      { status: 500 }
    );
  }

  if (!canonicalEventResult.event) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "not_found",
        reasons: ["canonical_event_not_found"],
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
      { status: 404 }
    );
  }

  const event = canonicalEventResult.event;
  const sourcesResult = await readCanonicalSources({
    supabase,
    canonicalEventId: event.id,
  });

  if (sourcesResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        mode: "read_error",
        message: sourcesResult.error,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: false,
      },
      { status: 500 }
    );
  }

  const source = choosePrimarySource({
    event,
    sources: sourcesResult.sources,
  });

  let fetchResult: HtmlFetchResult | null = null;

  if (
    source &&
    normalizePublicHttpsUrl(source.source_url) &&
    providerSupportsSourceUrl(
      normalizeText(source.provider_key).toLowerCase(),
      normalizeText(source.source_url)
    )
  ) {
    fetchResult = await fetchValidatedSourcePage({
      providerKey: normalizeText(source.provider_key).toLowerCase(),
      sourceUrl: normalizeText(source.source_url),
    });
  }

  const capturedAt = new Date().toISOString();
  const plan = buildRecapturePlan({
    event,
    source,
    fetchResult,
    capturedAt,
  });

  const writeConfirmed =
    dryRun === false &&
    confirmWrite === true &&
    confirmationPhrase === WRITE_CONFIRMATION_PHRASE;

  if (!plan.can_backfill || !writeConfirmed) {
    return NextResponse.json({
      ok: plan.can_backfill,
      scope: "event-canonical-image-source-recapture",
      version: ROUTE_VERSION,
      mode: "dry_run",
      requested_dry_run: dryRun,
      effective_dry_run: true,
      write_confirmation_valid: writeConfirmed,
      plan,
      database_write_performed: false,
      supabase_operation_performed: true,
      external_fetch_performed: Boolean(fetchResult),
      migration_performed: false,
      ticket_policy_changed: false,
    });
  }

  if (!plan.canonical_metadata_payload) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        version: ROUTE_VERSION,
        mode: "blocked",
        reasons: ["canonical_metadata_payload_missing"],
        plan,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: Boolean(fetchResult),
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { data: updatedEvent, error: updateError } = await supabase
    .from(TABLES.canonicalEvents)
    .update({
      metadata: plan.canonical_metadata_payload,
      updated_by: adminUserId,
      updated_at: now,
    })
    .eq("id", event.id)
    .eq("is_100_percent_validated", true)
    .select("id,slug,event_name,metadata,updated_at")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        version: ROUTE_VERSION,
        mode: "write_error",
        message: updateError.message || "canonical_image_source_recapture_failed",
        plan,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: Boolean(fetchResult),
      },
      { status: 500 }
    );
  }

  if (!updatedEvent) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-source-recapture",
        version: ROUTE_VERSION,
        mode: "write_blocked",
        reasons: ["validated_canonical_event_update_not_applied"],
        plan,
        database_write_performed: false,
        supabase_operation_performed: true,
        external_fetch_performed: Boolean(fetchResult),
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-image-source-recapture",
    version: ROUTE_VERSION,
    mode: "written",
    plan,
    canonical_event: updatedEvent,
    database_write_performed: true,
    supabase_operation_performed: true,
    external_fetch_performed: Boolean(fetchResult),
    migration_performed: false,
    ticket_policy_changed: false,
  });
}
