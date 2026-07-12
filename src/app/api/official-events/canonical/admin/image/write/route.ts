// src/app/api/official-events/canonical/admin/image/write/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION =
  "v4.8.73-event-canonical-image-admin-registration-safe" as const;
const WRITE_CONFIRMATION_PHRASE = "CONFIRM_CANONICAL_EVENT_IMAGE_WRITE";
const CANONICAL_EVENTS_TABLE = "canonical_events";
const IMAGE_USAGE_SCOPE = "event_page_hero" as const;

const AUTHORIZATION_TYPES = new Set([
  "event_owner",
  "event_producer",
  "official_venue",
  "official_artist",
  "licensed_media_partner",
  "written_permission",
]);

type JsonObject = Record<string, unknown>;

type RouteBody = JsonObject & {
  dryRun?: unknown;
  confirmWrite?: unknown;
  confirmationPhrase?: unknown;
  adminUserId?: unknown;
  canonicalEventId?: unknown;
  eventSlug?: unknown;
  image?: unknown;
};

type CanonicalEventRow = {
  id: string;
  slug: string;
  event_name: string;
  validation_status: string | null;
  is_100_percent_validated: boolean | null;
  metadata: Record<string, unknown> | null;
};

type ValidatedImageInput = {
  image_url: string;
  source_url: string;
  source_label: string | null;
  alt_text: string | null;
  authorization_type: string;
  authorized_by: string;
  authorization_reference: string;
  authorized_at: string;
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

function normalizeIsoDate(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  const nowWithTolerance = Date.now() + 5 * 60 * 1000;
  if (date.getTime() > nowWithTolerance) return null;

  return date.toISOString();
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

function isAuthorized(request: NextRequest, searchParams: URLSearchParams): boolean {
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

function validateImageInput(value: unknown): {
  ok: boolean;
  reasons: string[];
  image: ValidatedImageInput | null;
} {
  const reasons: string[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      reasons: ["image_object_required"],
      image: null,
    };
  }

  const imageUrl = normalizePublicHttpsUrl(value.imageUrl);
  const sourceUrl = normalizePublicHttpsUrl(value.sourceUrl);
  const sourceLabel = normalizeNullableText(value.sourceLabel);
  const altText = normalizeNullableText(value.altText);
  const authorizationType = normalizeText(value.authorizationType);
  const authorizedBy = normalizeText(value.authorizedBy);
  const authorizationReference = normalizeText(value.authorizationReference);
  const authorizedAt = normalizeIsoDate(value.authorizedAt);

  if (!imageUrl) reasons.push("public_https_image_url_required");
  if (!sourceUrl) reasons.push("public_https_source_url_required");
  if (!AUTHORIZATION_TYPES.has(authorizationType)) {
    reasons.push("valid_authorization_type_required");
  }
  if (authorizedBy.length < 3 || authorizedBy.length > 160) {
    reasons.push("authorized_by_required");
  }
  if (
    authorizationReference.length < 3 ||
    authorizationReference.length > 500
  ) {
    reasons.push("authorization_reference_required");
  }
  if (!authorizedAt) reasons.push("valid_authorized_at_required");
  if (sourceLabel && sourceLabel.length > 120) {
    reasons.push("source_label_too_long");
  }
  if (altText && altText.length > 180) {
    reasons.push("alt_text_too_long");
  }

  if (reasons.length > 0 || !imageUrl || !sourceUrl || !authorizedAt) {
    return { ok: false, reasons, image: null };
  }

  return {
    ok: true,
    reasons: [],
    image: {
      image_url: imageUrl,
      source_url: sourceUrl,
      source_label: sourceLabel,
      alt_text: altText,
      authorization_type: authorizationType,
      authorized_by: authorizedBy,
      authorization_reference: authorizationReference,
      authorized_at: authorizedAt,
    },
  };
}

function buildCapabilities() {
  return {
    routeVersion: ROUTE_VERSION,
    dryRunDefault: true,
    acceptedMethod: "POST",
    writeConfirmationPhraseRequired: WRITE_CONFIRMATION_PHRASE,
    canonicalEventMustBeValidated: true,
    publicHttpsImageRequired: true,
    publicHttpsSourceRequired: true,
    authorizationEvidenceRequired: true,
    authorizationTypes: Array.from(AUTHORIZATION_TYPES),
    usageScope: IMAGE_USAGE_SCOPE,
    rawAuthorizationEvidencePubliclyExposed: false,
    migrationRequired: false,
    publicUploadEnabled: false,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "blocked",
        message: "Canonical image admin registration route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-image-admin-registration",
    mode: "capabilities",
    capabilities: buildCapabilities(),
    database_write_performed: false,
    supabase_operation_performed: false,
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "blocked",
        message: "Canonical image admin registration route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
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
        scope: "event-canonical-image-admin-registration",
        mode: "invalid_request",
        reasons: ["json_body_required"],
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 400 }
    );
  }

  const adminUserId = normalizeText(body.adminUserId);
  const canonicalEventId = normalizeText(body.canonicalEventId);
  const eventSlug = normalizeText(body.eventSlug);
  const imageValidation = validateImageInput(body.image);
  const reasons = [...imageValidation.reasons];

  if (!isUuid(adminUserId)) reasons.push("valid_admin_user_id_required");
  if (!canonicalEventId && !eventSlug) {
    reasons.push("canonical_event_id_or_event_slug_required");
  }
  if (canonicalEventId && !isUuid(canonicalEventId)) {
    reasons.push("canonical_event_id_must_be_uuid");
  }

  if (reasons.length > 0 || !imageValidation.image) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "invalid_request",
        reasons,
        capabilities: buildCapabilities(),
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "blocked",
        reasons: ["supabase_admin_client_not_configured"],
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 500 }
    );
  }

  let lookup = supabase
    .from(CANONICAL_EVENTS_TABLE)
    .select(
      "id,slug,event_name,validation_status,is_100_percent_validated,metadata"
    );

  lookup = canonicalEventId
    ? lookup.eq("id", canonicalEventId)
    : lookup.eq("slug", eventSlug);

  const lookupResult = await lookup.maybeSingle();

  if (lookupResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "read_failed",
        error: lookupResult.error.message,
        database_write_performed: false,
        supabase_operation_performed: true,
      },
      { status: 500 }
    );
  }

  const event = lookupResult.data as CanonicalEventRow | null;

  if (!event) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "not_found",
        reasons: ["canonical_event_not_found"],
        database_write_performed: false,
        supabase_operation_performed: true,
      },
      { status: 404 }
    );
  }

  if (eventSlug && event.slug !== eventSlug) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "identity_mismatch",
        reasons: ["canonical_event_id_and_slug_do_not_match"],
        database_write_performed: false,
        supabase_operation_performed: true,
      },
      { status: 409 }
    );
  }

  if (
    event.is_100_percent_validated !== true ||
    event.validation_status !== "validated"
  ) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "validation_blocked",
        reasons: ["canonical_event_must_be_100_percent_validated"],
        canonicalEvent: {
          id: event.id,
          slug: event.slug,
          event_name: event.event_name,
        },
        database_write_performed: false,
        supabase_operation_performed: true,
      },
      { status: 409 }
    );
  }

  const requestedWrite = body.dryRun === false;
  const explicitWriteConfirmed =
    requestedWrite &&
    normalizeBoolean(body.confirmWrite, false) === true &&
    normalizeText(body.confirmationPhrase) === WRITE_CONFIRMATION_PHRASE;
  const effectiveDryRun = !explicitWriteConfirmed;
  const now = new Date().toISOString();
  const currentMetadata = asPlainObject(event.metadata) ?? {};
  const image = imageValidation.image;

  const proposedMetadata: JsonObject = {
    ...currentMetadata,
    official_image: {
      image_url: image.image_url,
      source_url: image.source_url,
      source_label: image.source_label,
      alt_text: image.alt_text,
      usage_scope: IMAGE_USAGE_SCOPE,
      authorization_status: "authorized",
      authorization_type: image.authorization_type,
      authorized_at: image.authorized_at,
      registered_at: now,
      route_version: ROUTE_VERSION,
    },
    official_image_admin: {
      authorized_by: image.authorized_by,
      authorization_reference: image.authorization_reference,
      registered_by: adminUserId,
      registered_at: now,
    },
  };

  const publicPreview = {
    image_url: image.image_url,
    alt_text: image.alt_text,
    source_label: image.source_label,
    usage_scope: IMAGE_USAGE_SCOPE,
    authorization_status: "authorized",
    authorization_type: image.authorization_type,
    authorized_at: image.authorized_at,
    registered_at: now,
  };

  if (effectiveDryRun) {
    return NextResponse.json({
      ok: true,
      scope: "event-canonical-image-admin-registration",
      mode: "dry_run",
      message: requestedWrite
        ? "Write requested without valid explicit confirmation. Dry-run executed."
        : "Dry-run executed. No database write was performed.",
      canonicalEvent: {
        id: event.id,
        slug: event.slug,
        event_name: event.event_name,
      },
      publicImagePreview: publicPreview,
      currentOfficialImagePresent: Boolean(
        asPlainObject(currentMetadata.official_image)
      ),
      requestedWrite,
      explicitWriteConfirmed,
      effectiveDryRun,
      writeConfirmationPhraseRequired: WRITE_CONFIRMATION_PHRASE,
      rawAuthorizationEvidencePubliclyExposed: false,
      database_write_performed: false,
      supabase_operation_performed: true,
    });
  }

  const updateResult = await supabase
    .from(CANONICAL_EVENTS_TABLE)
    .update({
      metadata: proposedMetadata,
      updated_by: adminUserId,
      updated_at: now,
    })
    .eq("id", event.id)
    .select("id,slug,event_name,updated_at")
    .single();

  if (updateResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-image-admin-registration",
        mode: "write_failed",
        error: updateResult.error.message,
        database_write_performed: false,
        supabase_operation_performed: true,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-image-admin-registration",
    mode: "write",
    message: "Authorized canonical event image registered.",
    canonicalEvent: updateResult.data,
    publicImage: publicPreview,
    rawAuthorizationEvidencePubliclyExposed: false,
    database_write_performed: true,
    supabase_operation_performed: true,
  });
}
