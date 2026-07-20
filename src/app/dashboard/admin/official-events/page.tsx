// src/app/dashboard/admin/official-events/page.tsx

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AdminClient = {
  from: (table: string) => any;
};

type CandidateStatus = "probable" | "review" | "confirmed" | "rejected" | "expired";

const CANONICAL_IMAGE_PREVIEW_VERSION =
  "v4.8.78-event-canonical-image-admin-preview-panel-safe" as const;
const CANONICAL_IMAGE_PROVENANCE_AUDIT_VERSION =
  "v4.8.79-event-canonical-image-provenance-audit-panel-safe" as const;
const CANONICAL_IMAGE_CHECKSUM_AUDIT_VERSION =
  "v4.8.83-event-canonical-image-checksum-audit-details-safe" as const;
const OFFICIAL_EVENTS_ADMIN_LOCALE = "pt-BR" as const;
const CANONICAL_IMAGE_SOURCE_AUTHORITY_MINIMUM = 80;
const CANONICAL_IMAGE_SCAN_LIMIT = 200;
const CANONICAL_IMAGE_RESULT_LIMIT = 25;
const CANONICAL_IMAGE_PROVENANCE_RESULT_LIMIT = 50;

const SUPPORTED_CANONICAL_IMAGE_PROVIDER_HOSTS: Record<
  string,
  readonly string[]
> = {
  ingresse: ["ingresse.com"],
};

type JsonObject = Record<string, unknown>;

type CandidateRow = {
  candidate_id: string;
  provider: string;
  provider_event_id: string | null;
  provider_url: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  source_name: string | null;
  source_type: string | null;
  candidate_status: CandidateStatus;
  confidence: number | null;
  event_group_id: string | null;
  updated_at: string | null;
};

type EventGroupRow = {
  group_id: string;
  event_name: string | null;
  event_date: string | null;
  event_slug: string | null;
  city_base: string | null;
  status: string | null;
  is_public: boolean | null;
  official_status: string | null;
  official_url: string | null;
  official_source_name: string | null;
  official_source_type: string | null;
  official_confidence: number | null;
};

type CandidateView = CandidateRow & {
  primaryOfficialUrl: string | null;
  hasValidOfficialUrl: boolean;
  hasEventGroup: boolean;
  recommendedAction: string;
  eventGroup: EventGroupRow | null;
};

type CanonicalEventRow = {
  id: string;
  slug: string;
  event_name: string;
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

type CanonicalImagePreviewItem = {
  canonicalEvent: {
    id: string;
    slug: string;
    eventName: string;
    startsAt: string | null;
    eventDateKey: string | null;
    venueName: string | null;
    city: string | null;
    state: string | null;
    validationStatus: string | null;
    sourceConfidenceScore: number;
  };
  source: {
    providerKey: string | null;
    externalEventId: string | null;
    sourceUrl: string | null;
    authorityScore: number;
    matchMode: "exact_primary" | "highest_authority_fallback" | "none";
  } | null;
  readyForSourceRecapture: boolean;
  reasons: string[];
};

type CanonicalImagePreviewData = {
  ok: boolean;
  message: string;
  items: CanonicalImagePreviewItem[];
  summary: {
    scannedValidatedEvents: number;
    alreadyHaveOfficialImage: number;
    missingOfficialImage: number;
    readyForSourceRecapture: number;
    blocked: number;
    returned: number;
    resultTruncated: boolean;
  };
  safety: {
    readOnly: true;
    externalFetchEnabled: false;
    databaseWriteEnabled: false;
    ticketPolicyChanged: false;
    migrationRequired: false;
  };
};

type CanonicalImageProvenanceItem = {
  canonicalEvent: {
    id: string;
    slug: string;
    eventName: string;
    startsAt: string | null;
    eventDateKey: string | null;
    venueName: string | null;
    city: string | null;
    state: string | null;
  };
  image: {
    imageUrl: string | null;
    altText: string | null;
    sourceLabel: string | null;
    usageScope: string | null;
    captureMode: string | null;
    provenanceStatus: string | null;
    providerKey: string | null;
    externalEventId: string | null;
    sourceKey: string | null;
    sourceKind: string | null;
    sourceUrl: string | null;
    sourcePageFinalUrl: string | null;
    sourcePageTitle: string | null;
    extractionMethod: string | null;
    capturedAt: string | null;
    validationMethod: string | null;
    sourceConfidenceScore: number | null;
    sourceAuthorityScore: number | null;
    captureVersion: string | null;
    authorizationStatus: string | null;
    authorizationType: string | null;
    authorizedAt: string | null;
    registeredAt: string | null;
    checksumSha256: string | null;
    checksumAlgorithm: string | null;
    checksumBytes: number | null;
    checksumContentType: string | null;
    checksumCalculatedAt: string | null;
    checksumSourceImageUrl: string | null;
    checksumSourceFinalUrl: string | null;
    checksumPreflightVersion: string | null;
    checksumRegisteredAt: string | null;
    checksumWriteVersion: string | null;
    checksumConfirmationDigestSha256: string | null;
  };
  completeness: {
    complete: boolean;
    warnings: string[];
    checksumAvailable: boolean;
    checksumAuditComplete: boolean;
    checksumAuditWarnings: string[];
  };
};

type CanonicalImageProvenanceAuditData = {
  ok: boolean;
  message: string;
  items: CanonicalImageProvenanceItem[];
  summary: {
    scannedValidatedEvents: number;
    withOfficialImageMetadata: number;
    completeProvenance: number;
    incompleteProvenance: number;
    validatedSource: number;
    legacyAuthorized: number;
    checksumAvailable: number;
    checksumAuditComplete: number;
    checksumAuditIncomplete: number;
    returned: number;
    resultTruncated: boolean;
  };
  safety: {
    readOnly: true;
    externalFetchEnabled: false;
    databaseWriteEnabled: false;
    ticketPolicyChanged: false;
    migrationRequired: false;
  };
};

type AdminData = {
  ok: boolean;
  message: string;
  candidates: CandidateView[];
  summary: {
    total: number;
    probableCount: number;
    reviewCount: number;
    confirmedCount: number;
    rejectedCount: number;
    expiredCount: number;
    withEventGroupCount: number;
    withoutEventGroupCount: number;
    withValidOfficialUrlCount: number;
  };
  imagePreview: CanonicalImagePreviewData;
  imageProvenance: CanonicalImageProvenanceAuditData;
};

function pageStyle(): CSSProperties {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 24,
    display: "grid",
    gap: 22,
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    padding: 18,
  };
}

function heroStyle(): CSSProperties {
  return {
    ...panelStyle(),
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
    display: "grid",
    gap: 10,
  };
}

function gridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  };
}

function statStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 6,
  };
}

function cardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.035)",
    borderRadius: 20,
    padding: 16,
    display: "grid",
    gap: 12,
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 700,
  };
}

function linkButtonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
  };
}

function mutedTextStyle(): CSSProperties {
  return {
    margin: 0,
    opacity: 0.78,
    lineHeight: 1.55,
  };
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidHttpUrl(value: unknown): boolean {
  const text = normalizeText(value);

  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function getExistingOfficialImage(metadata: JsonObject | null): JsonObject | null {
  if (!metadata) return null;

  const image = asPlainObject(metadata.official_image);
  if (!image) return null;

  return normalizePublicHttpsUrl(image.image_url) ? image : null;
}

function getOfficialImageMetadata(
  metadata: JsonObject | null
): JsonObject | null {
  if (!metadata) return null;
  return asPlainObject(metadata.official_image);
}

function getMetadataString(
  record: JsonObject,
  key: string
): string | null {
  const value = normalizeText(record[key]);
  return value || null;
}

function getFirstMetadataString(
  record: JsonObject,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value = getMetadataString(record, key);
    if (value) return value;
  }

  return null;
}

function getMetadataNumber(
  record: JsonObject,
  key: string
): number | null {
  const rawValue = record[key];

  if (
    rawValue === null ||
    rawValue === undefined ||
    normalizeText(rawValue) === ""
  ) {
    return null;
  }

  const number = Number(rawValue);
  return Number.isFinite(number) ? number : null;
}

function emptyCanonicalImageProvenanceAudit(
  message: string
): CanonicalImageProvenanceAuditData {
  return {
    ok: false,
    message,
    items: [],
    summary: {
      scannedValidatedEvents: 0,
      withOfficialImageMetadata: 0,
      completeProvenance: 0,
      incompleteProvenance: 0,
      validatedSource: 0,
      legacyAuthorized: 0,
      checksumAvailable: 0,
      checksumAuditComplete: 0,
      checksumAuditIncomplete: 0,
      returned: 0,
      resultTruncated: false,
    },
    safety: {
      readOnly: true,
      externalFetchEnabled: false,
      databaseWriteEnabled: false,
      ticketPolicyChanged: false,
      migrationRequired: false,
    },
  };
}

function buildCanonicalImageProvenanceItem(params: {
  event: CanonicalEventRow;
  officialImage: JsonObject;
}): CanonicalImageProvenanceItem {
  const rawCaptureMode = getMetadataString(
    params.officialImage,
    "capture_mode"
  );
  const authorizationStatus = getMetadataString(
    params.officialImage,
    "authorization_status"
  );
  const captureMode =
    rawCaptureMode ||
    (authorizationStatus === "authorized"
      ? "legacy_authorized_registration"
      : null);
  const provenanceStatus =
    getMetadataString(params.officialImage, "provenance_status") ||
    (authorizationStatus === "authorized" ? "legacy_authorized" : null);
  const rawImageUrl = getMetadataString(
    params.officialImage,
    "image_url"
  );
  const imageUrl = normalizePublicHttpsUrl(rawImageUrl);
  const sourceUrl = getMetadataString(
    params.officialImage,
    "source_url"
  );
  const sourcePageFinalUrl = getMetadataString(
    params.officialImage,
    "source_page_final_url"
  );
  const capturedAt = getMetadataString(
    params.officialImage,
    "captured_at"
  );
  const validationMethod = getMetadataString(
    params.officialImage,
    "validation_method"
  );
  const sourceConfidenceScore = getMetadataNumber(
    params.officialImage,
    "source_confidence_score"
  );
  const sourceAuthorityScore = getMetadataNumber(
    params.officialImage,
    "source_authority_score"
  );
  const checksumSha256 = getFirstMetadataString(params.officialImage, [
    "checksum_sha256",
    "image_checksum_sha256",
    "sha256",
    "checksum",
  ]);
  const checksumAlgorithm = getMetadataString(
    params.officialImage,
    "checksum_algorithm"
  );
  const checksumBytes = getMetadataNumber(
    params.officialImage,
    "checksum_bytes"
  );
  const checksumContentType = getMetadataString(
    params.officialImage,
    "checksum_content_type"
  );
  const checksumCalculatedAt = getMetadataString(
    params.officialImage,
    "checksum_calculated_at"
  );
  const checksumSourceImageUrl = getMetadataString(
    params.officialImage,
    "checksum_source_image_url"
  );
  const checksumSourceFinalUrl = getMetadataString(
    params.officialImage,
    "checksum_source_final_url"
  );
  const checksumPreflightVersion = getMetadataString(
    params.officialImage,
    "checksum_preflight_version"
  );
  const checksumRegisteredAt = getMetadataString(
    params.officialImage,
    "checksum_registered_at"
  );
  const checksumWriteVersion = getMetadataString(
    params.officialImage,
    "checksum_write_version"
  );
  const checksumConfirmationDigestSha256 = getMetadataString(
    params.officialImage,
    "checksum_confirmation_digest_sha256"
  );
  const warnings: string[] = [];
  const checksumAuditWarnings: string[] = [];
  const validatedSourceCapture =
    captureMode === "validated_source_auto_capture" ||
    captureMode === "validated_source_page_recapture";
  const legacyAuthorizedCapture =
    captureMode === "legacy_authorized_registration";

  if (!imageUrl) {
    warnings.push("image_public_https_url_required");
  }

  if (
    getMetadataString(params.officialImage, "usage_scope") !==
    "event_page_hero"
  ) {
    warnings.push("usage_scope_event_page_hero_required");
  }

  if (!captureMode) {
    warnings.push("capture_mode_required");
  }

  if (validatedSourceCapture) {
    if (provenanceStatus !== "validated_source") {
      warnings.push("validated_source_provenance_required");
    }

    if (!getMetadataString(params.officialImage, "provider_key")) {
      warnings.push("provider_key_required");
    }

    if (!getMetadataString(params.officialImage, "external_event_id")) {
      warnings.push("external_event_id_required");
    }

    if (!normalizePublicHttpsUrl(sourceUrl)) {
      warnings.push("source_public_https_url_required");
    }

    if (!capturedAt) {
      warnings.push("captured_at_required");
    }

    if (!validationMethod) {
      warnings.push("validation_method_required");
    }

    if (sourceConfidenceScore === null) {
      warnings.push("source_confidence_score_required");
    }

    if (sourceAuthorityScore === null) {
      warnings.push("source_authority_score_required");
    }

    if (!getMetadataString(params.officialImage, "capture_version")) {
      warnings.push("capture_version_required");
    }

    if (
      captureMode === "validated_source_page_recapture" &&
      !getMetadataString(params.officialImage, "extraction_method")
    ) {
      warnings.push("extraction_method_required_for_recapture");
    }
  } else if (legacyAuthorizedCapture) {
    if (authorizationStatus !== "authorized") {
      warnings.push("legacy_authorization_status_required");
    }

    if (!getMetadataString(params.officialImage, "authorization_type")) {
      warnings.push("legacy_authorization_type_required");
    }

    if (!getMetadataString(params.officialImage, "authorized_at")) {
      warnings.push("legacy_authorized_at_required");
    }

    if (!getMetadataString(params.officialImage, "registered_at")) {
      warnings.push("legacy_registered_at_required");
    }
  } else if (captureMode) {
    warnings.push("capture_mode_not_supported");
  }

  if (checksumSha256) {
    if (!/^[a-f0-9]{64}$/i.test(checksumSha256)) {
      checksumAuditWarnings.push("checksum_sha256_invalid");
    }

    if (checksumAlgorithm !== "sha256") {
      checksumAuditWarnings.push("checksum_algorithm_sha256_required");
    }

    if (
      checksumBytes === null ||
      !Number.isFinite(checksumBytes) ||
      checksumBytes <= 0
    ) {
      checksumAuditWarnings.push("checksum_bytes_required");
    }

    if (
      !checksumContentType ||
      !checksumContentType.toLowerCase().startsWith("image/")
    ) {
      checksumAuditWarnings.push("checksum_content_type_image_required");
    }

    if (!checksumCalculatedAt) {
      checksumAuditWarnings.push("checksum_calculated_at_required");
    }

    if (!checksumRegisteredAt) {
      checksumAuditWarnings.push("checksum_registered_at_required");
    }

    if (!normalizePublicHttpsUrl(checksumSourceImageUrl)) {
      checksumAuditWarnings.push("checksum_source_image_url_required");
    }

    if (!normalizePublicHttpsUrl(checksumSourceFinalUrl)) {
      checksumAuditWarnings.push("checksum_source_final_url_required");
    }

    if (
      checksumSourceImageUrl &&
      rawImageUrl &&
      checksumSourceImageUrl !== rawImageUrl
    ) {
      checksumAuditWarnings.push("checksum_source_image_url_mismatch");
    }

    if (!checksumPreflightVersion) {
      checksumAuditWarnings.push("checksum_preflight_version_required");
    }

    if (!checksumWriteVersion) {
      checksumAuditWarnings.push("checksum_write_version_required");
    }

    if (
      !checksumConfirmationDigestSha256 ||
      !/^[a-f0-9]{64}$/i.test(checksumConfirmationDigestSha256)
    ) {
      checksumAuditWarnings.push(
        "checksum_confirmation_digest_sha256_required"
      );
    }
  } else {
    checksumAuditWarnings.push("checksum_not_registered");
  }

  return {
    canonicalEvent: {
      id: params.event.id,
      slug: params.event.slug,
      eventName: params.event.event_name,
      startsAt: params.event.starts_at,
      eventDateKey: params.event.event_date_key,
      venueName: params.event.venue_name,
      city: params.event.city,
      state: params.event.state,
    },
    image: {
      imageUrl: rawImageUrl,
      altText: getMetadataString(params.officialImage, "alt_text"),
      sourceLabel: getMetadataString(
        params.officialImage,
        "source_label"
      ),
      usageScope: getMetadataString(
        params.officialImage,
        "usage_scope"
      ),
      captureMode,
      provenanceStatus,
      providerKey: getMetadataString(
        params.officialImage,
        "provider_key"
      ),
      externalEventId: getMetadataString(
        params.officialImage,
        "external_event_id"
      ),
      sourceKey: getMetadataString(
        params.officialImage,
        "source_key"
      ),
      sourceKind: getMetadataString(
        params.officialImage,
        "source_kind"
      ),
      sourceUrl,
      sourcePageFinalUrl,
      sourcePageTitle: getMetadataString(
        params.officialImage,
        "source_page_title"
      ),
      extractionMethod: getMetadataString(
        params.officialImage,
        "extraction_method"
      ),
      capturedAt,
      validationMethod,
      sourceConfidenceScore,
      sourceAuthorityScore,
      captureVersion:
        getMetadataString(params.officialImage, "capture_version") ||
        getMetadataString(params.officialImage, "route_version"),
      authorizationStatus,
      authorizationType: getMetadataString(
        params.officialImage,
        "authorization_type"
      ),
      authorizedAt: getMetadataString(
        params.officialImage,
        "authorized_at"
      ),
      registeredAt: getMetadataString(
        params.officialImage,
        "registered_at"
      ),
      checksumSha256,
      checksumAlgorithm,
      checksumBytes,
      checksumContentType,
      checksumCalculatedAt,
      checksumSourceImageUrl,
      checksumSourceFinalUrl,
      checksumPreflightVersion,
      checksumRegisteredAt,
      checksumWriteVersion,
      checksumConfirmationDigestSha256,
    },
    completeness: {
      complete: warnings.length === 0,
      warnings,
      checksumAvailable: Boolean(checksumSha256),
      checksumAuditComplete:
        Boolean(checksumSha256) && checksumAuditWarnings.length === 0,
      checksumAuditWarnings,
    },
  };
}

async function loadCanonicalImageProvenanceAudit(
  adminClient: AdminClient
): Promise<CanonicalImageProvenanceAuditData> {
  const { data, error } = await adminClient
    .from("canonical_events")
    .select(
      [
        "id",
        "slug",
        "event_name",
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
    .limit(CANONICAL_IMAGE_SCAN_LIMIT);

  if (error) {
    return emptyCanonicalImageProvenanceAudit(
      error.message ||
        "Não foi possível carregar a auditoria de procedência das imagens."
    );
  }

  const canonicalEvents = Array.isArray(data)
    ? (data as unknown as CanonicalEventRow[])
    : [];
  const allItems = canonicalEvents.flatMap((event) => {
    const officialImage = getOfficialImageMetadata(event.metadata);

    return officialImage
      ? [buildCanonicalImageProvenanceItem({ event, officialImage })]
      : [];
  });
  const orderedItems = [...allItems].sort((left, right) => {
    if (left.completeness.complete !== right.completeness.complete) {
      return left.completeness.complete ? 1 : -1;
    }

    return left.canonicalEvent.eventName.localeCompare(
      right.canonicalEvent.eventName,
      OFFICIAL_EVENTS_ADMIN_LOCALE
    );
  });
  const returnedItems = orderedItems.slice(
    0,
    CANONICAL_IMAGE_PROVENANCE_RESULT_LIMIT
  );
  const completeProvenance = allItems.filter(
    (item) => item.completeness.complete
  ).length;
  const validatedSource = allItems.filter(
    (item) =>
      item.image.captureMode === "validated_source_auto_capture" ||
      item.image.captureMode === "validated_source_page_recapture"
  ).length;
  const legacyAuthorized = allItems.filter(
    (item) =>
      item.image.captureMode === "legacy_authorized_registration"
  ).length;
  const checksumAvailable = allItems.filter(
    (item) => item.completeness.checksumAvailable
  ).length;
  const checksumAuditComplete = allItems.filter(
    (item) => item.completeness.checksumAuditComplete
  ).length;
  const checksumAuditIncomplete = allItems.filter(
    (item) =>
      item.completeness.checksumAvailable &&
      !item.completeness.checksumAuditComplete
  ).length;

  return {
    ok: true,
    message: "Auditoria de procedência das imagens carregada.",
    items: returnedItems,
    summary: {
      scannedValidatedEvents: canonicalEvents.length,
      withOfficialImageMetadata: allItems.length,
      completeProvenance,
      incompleteProvenance: allItems.length - completeProvenance,
      validatedSource,
      legacyAuthorized,
      checksumAvailable,
      checksumAuditComplete,
      checksumAuditIncomplete,
      returned: returnedItems.length,
      resultTruncated: orderedItems.length > returnedItems.length,
    },
    safety: {
      readOnly: true,
      externalFetchEnabled: false,
      databaseWriteEnabled: false,
      ticketPolicyChanged: false,
      migrationRequired: false,
    },
  };
}

function providerSupportsCanonicalImageSource(
  providerKey: string,
  sourceUrl: string
): boolean {
  const allowedHosts =
    SUPPORTED_CANONICAL_IMAGE_PROVIDER_HOSTS[providerKey.toLowerCase()];

  if (!allowedHosts || allowedHosts.length === 0) return false;

  const normalizedUrl = normalizePublicHttpsUrl(sourceUrl);
  if (!normalizedUrl) return false;

  const hostname = new URL(normalizedUrl).hostname.toLowerCase();

  return allowedHosts.some(
    (allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
  );
}

function emptyCanonicalImagePreview(
  message: string
): CanonicalImagePreviewData {
  return {
    ok: false,
    message,
    items: [],
    summary: {
      scannedValidatedEvents: 0,
      alreadyHaveOfficialImage: 0,
      missingOfficialImage: 0,
      readyForSourceRecapture: 0,
      blocked: 0,
      returned: 0,
      resultTruncated: false,
    },
    safety: {
      readOnly: true,
      externalFetchEnabled: false,
      databaseWriteEnabled: false,
      ticketPolicyChanged: false,
      migrationRequired: false,
    },
  };
}

function buildCanonicalImagePreviewItem(params: {
  event: CanonicalEventRow;
  sources: CanonicalSourceRow[];
}): CanonicalImagePreviewItem {
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
  const selectedSource = exactPrimary ?? sortedSources[0] ?? null;
  const matchMode:
    | "exact_primary"
    | "highest_authority_fallback"
    | "none" = exactPrimary
    ? "exact_primary"
    : selectedSource
      ? "highest_authority_fallback"
      : "none";
  const reasons: string[] = [];

  if (!selectedSource) {
    reasons.push("canonical_source_not_found");
  }

  const providerKey = normalizeText(
    selectedSource?.provider_key
  ).toLowerCase();
  const externalEventId = normalizeText(selectedSource?.external_event_id);
  const sourceUrl = normalizePublicHttpsUrl(selectedSource?.source_url);
  const authorityScore = clampScore(selectedSource?.authority_score, 0);
  const providerSupported = Boolean(
    providerKey && SUPPORTED_CANONICAL_IMAGE_PROVIDER_HOSTS[providerKey]
  );
  const providerHostAllowed = Boolean(
    providerKey &&
      sourceUrl &&
      providerSupportsCanonicalImageSource(providerKey, sourceUrl)
  );

  if (selectedSource) {
    if (!providerKey) reasons.push("source_provider_key_required");
    if (!externalEventId) reasons.push("source_external_event_id_required");

    if (authorityScore < CANONICAL_IMAGE_SOURCE_AUTHORITY_MINIMUM) {
      reasons.push("source_authority_below_minimum_80");
    }

    if (!sourceUrl) reasons.push("source_public_https_url_required");
    if (providerKey && !providerSupported) {
      reasons.push("source_provider_not_supported");
    }

    if (providerSupported && sourceUrl && !providerHostAllowed) {
      reasons.push("source_provider_host_not_allowed");
    }
  }

  return {
    canonicalEvent: {
      id: params.event.id,
      slug: params.event.slug,
      eventName: params.event.event_name,
      startsAt: params.event.starts_at,
      eventDateKey: params.event.event_date_key,
      venueName: params.event.venue_name,
      city: params.event.city,
      state: params.event.state,
      validationStatus: params.event.validation_status,
      sourceConfidenceScore: clampScore(
        params.event.source_confidence_score,
        0
      ),
    },
    source: selectedSource
      ? {
          providerKey: providerKey || null,
          externalEventId: externalEventId || null,
          sourceUrl,
          authorityScore,
          matchMode,
        }
      : null,
    readyForSourceRecapture: reasons.length === 0,
    reasons,
  };
}

async function loadCanonicalImagePreview(
  adminClient: AdminClient
): Promise<CanonicalImagePreviewData> {
  const { data: canonicalEventsData, error: canonicalEventsError } =
    await adminClient
      .from("canonical_events")
      .select(
        [
          "id",
          "slug",
          "event_name",
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
      .limit(CANONICAL_IMAGE_SCAN_LIMIT);

  if (canonicalEventsError) {
    return emptyCanonicalImagePreview(
      canonicalEventsError.message ||
        "Não foi possível carregar os eventos canônicos validados."
    );
  }

  const canonicalEvents = Array.isArray(canonicalEventsData)
    ? (canonicalEventsData as unknown as CanonicalEventRow[])
    : [];
  const eventsWithoutOfficialImage = canonicalEvents.filter(
    (event) => !getExistingOfficialImage(event.metadata)
  );
  const eventIds = eventsWithoutOfficialImage.map((event) => event.id);
  let canonicalSources: CanonicalSourceRow[] = [];

  if (eventIds.length > 0) {
    const { data: sourcesData, error: sourcesError } = await adminClient
      .from("canonical_event_sources")
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
      .in("canonical_event_id", eventIds)
      .order("authority_score", { ascending: false })
      .limit(Math.min(CANONICAL_IMAGE_SCAN_LIMIT * 10, 5_000));

    if (sourcesError) {
      return emptyCanonicalImagePreview(
        sourcesError.message || "Não foi possível carregar as fontes canônicas dos eventos."
      );
    }

    canonicalSources = Array.isArray(sourcesData)
      ? (sourcesData as unknown as CanonicalSourceRow[])
      : [];
  }

  const sourcesByEventId = new Map<string, CanonicalSourceRow[]>();

  for (const source of canonicalSources) {
    const current = sourcesByEventId.get(source.canonical_event_id) ?? [];
    current.push(source);
    sourcesByEventId.set(source.canonical_event_id, current);
  }

  const allItems = eventsWithoutOfficialImage.map((event) =>
    buildCanonicalImagePreviewItem({
      event,
      sources: sourcesByEventId.get(event.id) ?? [],
    })
  );
  const orderedItems = [...allItems].sort((left, right) => {
    if (left.readyForSourceRecapture !== right.readyForSourceRecapture) {
      return left.readyForSourceRecapture ? -1 : 1;
    }

    return left.canonicalEvent.eventName.localeCompare(
      right.canonicalEvent.eventName
    );
  });
  const returnedItems = orderedItems.slice(0, CANONICAL_IMAGE_RESULT_LIMIT);
  const readyCount = allItems.filter(
    (item) => item.readyForSourceRecapture
  ).length;

  return {
    ok: true,
    message: "Prévia das imagens canônicas carregada.",
    items: returnedItems,
    summary: {
      scannedValidatedEvents: canonicalEvents.length,
      alreadyHaveOfficialImage:
        canonicalEvents.length - eventsWithoutOfficialImage.length,
      missingOfficialImage: eventsWithoutOfficialImage.length,
      readyForSourceRecapture: readyCount,
      blocked: allItems.length - readyCount,
      returned: returnedItems.length,
      resultTruncated: orderedItems.length > returnedItems.length,
    },
    safety: {
      readOnly: true,
      externalFetchEnabled: false,
      databaseWriteEnabled: false,
      ticketPolicyChanged: false,
      migrationRequired: false,
    },
  };
}

function getPrimaryOfficialUrl(candidate: CandidateRow): string | null {
  return (
    normalizeText(candidate.official_url) ||
    normalizeText(candidate.ticket_url) ||
    normalizeText(candidate.provider_url) ||
    null
  );
}

function resolveAction(candidate: CandidateRow, hasValidOfficialUrl: boolean, hasEventGroup: boolean): string {
  if (candidate.candidate_status === "confirmed") return "already_confirmed";
  if (candidate.candidate_status === "rejected") return "review_rejected";
  if (candidate.candidate_status === "expired") return "review_expired";
  if (!hasValidOfficialUrl) return "missing_official_url";
  if (!hasEventGroup) return "select_event_group";
  return "run_confirmation_dry_run";
}

function formatDate(value: string | null): string {
  if (!value) return "Não disponível";

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
    }).format(date);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Não disponível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAdminClient(): AdminClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as AdminClient;
}

function isAdminAllowed(userId: string, email: string | undefined): boolean {
  const allowedUserIds = String(process.env.OFFICIAL_EVENTS_ADMIN_USER_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowedEmails = String(process.env.OFFICIAL_EVENTS_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowedUserIds.length > 0 && allowedUserIds.includes(userId)) return true;
  if (email && allowedEmails.length > 0 && allowedEmails.includes(email.toLowerCase())) return true;

  return process.env.NODE_ENV !== "production" && allowedUserIds.length === 0 && allowedEmails.length === 0;
}

async function loadAdminData(): Promise<AdminData> {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      ok: false,
      message: "A chave service role do Supabase não está configurada.",
      candidates: [],
      summary: emptySummary(),
      imagePreview: emptyCanonicalImagePreview(
        "A chave service role do Supabase não está configurada."
      ),
      imageProvenance: emptyCanonicalImageProvenanceAudit(
        "A chave service role do Supabase não está configurada."
      ),
    };
  }

  const [imagePreview, imageProvenance] = await Promise.all([
    loadCanonicalImagePreview(adminClient),
    loadCanonicalImageProvenanceAudit(adminClient),
  ]);

  const { data, error } = await adminClient
    .from("official_event_candidates")
    .select(
      [
        "candidate_id",
        "provider",
        "provider_event_id",
        "provider_url",
        "event_name",
        "artist_name",
        "event_date",
        "venue_name",
        "city",
        "state",
        "country",
        "official_url",
        "ticket_url",
        "source_name",
        "source_type",
        "candidate_status",
        "confidence",
        "event_group_id",
        "updated_at",
      ].join(",")
    )
    .in("candidate_status", ["probable", "review", "confirmed", "rejected", "expired"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      ok: false,
      message: error.message || "Não foi possível carregar os candidatos.",
      candidates: [],
      summary: emptySummary(),
      imagePreview,
      imageProvenance,
    };
  }

  const candidates = (Array.isArray(data) ? data : []) as CandidateRow[];
  const eventGroupIds = Array.from(
    new Set(candidates.map((candidate) => normalizeText(candidate.event_group_id)).filter(Boolean))
  );

  const eventGroupById = new Map<string, EventGroupRow>();

  if (eventGroupIds.length > 0) {
    const { data: eventGroups } = await adminClient
      .from("event_groups")
      .select(
        [
          "group_id",
          "event_name",
          "event_date",
          "event_slug",
          "city_base",
          "status",
          "is_public",
          "official_status",
          "official_url",
          "official_source_name",
          "official_source_type",
          "official_confidence",
        ].join(",")
      )
      .in("group_id", eventGroupIds);

    const rows = (Array.isArray(eventGroups) ? eventGroups : []) as EventGroupRow[];

    for (const row of rows) {
      eventGroupById.set(row.group_id, row);
    }
  }

  const enriched = candidates.map((candidate) => {
    const primaryOfficialUrl = getPrimaryOfficialUrl(candidate);
    const hasValidOfficialUrl = isValidHttpUrl(primaryOfficialUrl);
    const hasEventGroup = Boolean(normalizeText(candidate.event_group_id));

    return {
      ...candidate,
      primaryOfficialUrl,
      hasValidOfficialUrl,
      hasEventGroup,
      recommendedAction: resolveAction(candidate, hasValidOfficialUrl, hasEventGroup),
      eventGroup: candidate.event_group_id
        ? eventGroupById.get(candidate.event_group_id) || null
        : null,
    };
  });

  return {
    ok: true,
    message: "Prévia administrativa carregada.",
    candidates: enriched,
    summary: summarize(enriched),
    imagePreview,
    imageProvenance,
  };
}

function emptySummary() {
  return {
    total: 0,
    probableCount: 0,
    reviewCount: 0,
    confirmedCount: 0,
    rejectedCount: 0,
    expiredCount: 0,
    withEventGroupCount: 0,
    withoutEventGroupCount: 0,
    withValidOfficialUrlCount: 0,
  };
}

function summarize(candidates: CandidateView[]) {
  return {
    total: candidates.length,
    probableCount: candidates.filter((item) => item.candidate_status === "probable").length,
    reviewCount: candidates.filter((item) => item.candidate_status === "review").length,
    confirmedCount: candidates.filter((item) => item.candidate_status === "confirmed").length,
    rejectedCount: candidates.filter((item) => item.candidate_status === "rejected").length,
    expiredCount: candidates.filter((item) => item.candidate_status === "expired").length,
    withEventGroupCount: candidates.filter((item) => item.hasEventGroup).length,
    withoutEventGroupCount: candidates.filter((item) => !item.hasEventGroup).length,
    withValidOfficialUrlCount: candidates.filter((item) => item.hasValidOfficialUrl).length,
  };
}

function candidateStatusLabel(status: CandidateStatus): string {
  const labels: Record<CandidateStatus, string> = {
    probable: "provável",
    review: "em revisão",
    confirmed: "confirmado",
    rejected: "rejeitado",
    expired: "expirado",
  };

  return labels[status];
}

function recommendedActionLabel(action: string): string {
  const labels: Record<string, string> = {
    already_confirmed: "já confirmado",
    review_rejected: "revisar rejeição",
    review_expired: "revisar expiração",
    missing_official_url: "URL oficial ausente",
    select_event_group: "selecionar grupo do evento",
    run_confirmation_dry_run: "simular confirmação",
  };

  return labels[action] || action;
}

function genericStatusLabel(value: string | null): string {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) return "desconhecido";

  const labels: Record<string, string> = {
    active: "ativo",
    inactive: "inativo",
    pending: "pendente",
    draft: "rascunho",
    published: "publicado",
    probable: "provável",
    review: "em revisão",
    confirmed: "confirmado",
    rejected: "rejeitado",
    expired: "expirado",
    validated: "validado",
  };

  return labels[normalized] || normalized;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle()}>
      <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    canonical_source_not_found: "Fonte canônica não encontrada",
    source_provider_key_required: "Identificador do provider obrigatório",
    source_external_event_id_required: "ID externo do evento obrigatório",
    source_authority_below_minimum_80: "Autoridade abaixo do mínimo 80",
    source_public_https_url_required: "Fonte HTTPS pública obrigatória",
    source_provider_not_supported: "Provider ainda não suportado",
    source_provider_host_not_allowed: "Host do provider não autorizado",
  };

  return labels[reason] || reason;
}

function CanonicalImagePreviewPanel({
  preview,
}: {
  preview: CanonicalImagePreviewData;
}) {
  return (
    <section
      style={{ display: "grid", gap: 14 }}
      data-canonical-image-preview-panel="true"
      data-canonical-image-preview-version={CANONICAL_IMAGE_PREVIEW_VERSION}
      data-canonical-image-preview-read-only="true"
      data-canonical-image-preview-locale={OFFICIAL_EVENTS_ADMIN_LOCALE}
    >
      <div style={heroStyle()}>
        <span style={badgeStyle()}>Cobertura de imagens canônicas · somente leitura</span>
        <h2 style={{ margin: 0, fontSize: 28 }}>
          Prévia em lote das imagens canônicas
        </h2>
        <p style={mutedTextStyle()}>
          Cobertura e prontidão das fontes dos eventos canônicos validados. Este
          painel lê apenas os dados canônicos já persistidos: não consulta
          providers, não grava no banco e não executa ações de ingresso.
        </p>
      </div>

      <div
        style={gridStyle()}
        data-canonical-image-preview-summary="true"
      >
        <StatCard
          label="VALIDADOS"
          value={preview.summary.scannedValidatedEvents}
        />
        <StatCard
          label="COM IMAGEM"
          value={preview.summary.alreadyHaveOfficialImage}
        />
        <StatCard
          label="SEM IMAGEM"
          value={preview.summary.missingOfficialImage}
        />
        <StatCard
          label="PRONTOS"
          value={preview.summary.readyForSourceRecapture}
        />
        <StatCard label="BLOQUEADOS" value={preview.summary.blocked} />
      </div>

      {!preview.ok ? (
        <div style={panelStyle()}>
          <h3 style={{ marginTop: 0 }}>Não foi possível carregar a prévia das imagens</h3>
          <p style={mutedTextStyle()}>{preview.message}</p>
        </div>
      ) : null}

      {preview.ok && preview.summary.missingOfficialImage === 0 ? (
        <div
          style={panelStyle()}
          data-canonical-image-preview-coverage-complete="true"
        >
          <strong>Cobertura completa para os eventos validados atuais</strong>
          <p style={mutedTextStyle()}>
            Todos os eventos canônicos desta prévia já possuem uma imagem
            oficial válida.
          </p>
        </div>
      ) : null}

      {preview.ok && preview.items.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {preview.items.map((item) => (
            <article
              key={item.canonicalEvent.id}
              style={cardStyle()}
              data-canonical-image-preview-item={item.canonicalEvent.id}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span style={badgeStyle()}>
                  {item.readyForSourceRecapture ? "pronto" : "bloqueado"}
                </span>
                <span style={badgeStyle()}>
                  {item.source?.providerKey || "provider indisponível"}
                </span>
                <span style={badgeStyle()}>
                  autoridade {item.source?.authorityScore ?? 0}
                </span>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>
                  {item.canonicalEvent.eventName}
                </h3>
                <p style={mutedTextStyle()}>
                  {[
                    item.canonicalEvent.venueName,
                    item.canonicalEvent.city,
                    item.canonicalEvent.state,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Local não disponível"}
                </p>
                <p style={mutedTextStyle()}>
                  {formatDate(
                    item.canonicalEvent.startsAt ||
                      item.canonicalEvent.eventDateKey
                  )}
                </p>
              </div>

              <div style={panelStyle()}>
                <strong>URL canônica persistida da fonte</strong>
                <p
                  style={{
                    ...mutedTextStyle(),
                    overflowWrap: "anywhere",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                  }}
                >
                  {item.source?.sourceUrl || "Não disponível"}
                </p>
              </div>

              {!item.readyForSourceRecapture ? (
                <div style={panelStyle()}>
                  <strong>Motivos do bloqueio</strong>
                  <p style={mutedTextStyle()}>
                    {item.reasons.map(reasonLabel).join(" · ")}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {preview.summary.resultTruncated ? (
        <div style={panelStyle()}>
          <p style={mutedTextStyle()}>
            Resultado limitado a {CANONICAL_IMAGE_RESULT_LIMIT} eventos. Os
            totais do resumo consideram todo o conjunto analisado.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function captureModeLabel(value: string | null): string {
  const labels: Record<string, string> = {
    validated_source_auto_capture: "captura automática da fonte validada",
    validated_source_page_recapture:
      "recaptura da página-fonte validada",
    legacy_authorized_registration: "registro autorizado legado",
  };

  return value ? labels[value] || value : "não informado";
}

function provenanceStatusLabel(value: string | null): string {
  const labels: Record<string, string> = {
    validated_source: "fonte validada",
    legacy_authorized: "autorização legada",
  };

  return value ? labels[value] || value : "não informado";
}

function provenanceWarningLabel(reason: string): string {
  const labels: Record<string, string> = {
    image_public_https_url_required:
      "URL pública HTTPS da imagem obrigatória",
    usage_scope_event_page_hero_required:
      "Escopo de uso event_page_hero obrigatório",
    capture_mode_required: "Modo de captura obrigatório",
    validated_source_provenance_required:
      "Status de procedência fonte validada obrigatório",
    provider_key_required: "Provider obrigatório",
    external_event_id_required: "ID externo do evento obrigatório",
    source_public_https_url_required:
      "URL pública HTTPS da página-fonte obrigatória",
    captured_at_required: "Data da captura obrigatória",
    validation_method_required: "Método de validação obrigatório",
    source_confidence_score_required:
      "Confiança da fonte obrigatória",
    source_authority_score_required:
      "Autoridade da fonte obrigatória",
    capture_version_required: "Versão da captura obrigatória",
    extraction_method_required_for_recapture:
      "Método de extração obrigatório para recaptura",
    legacy_authorization_status_required:
      "Status autorizado obrigatório no registro legado",
    legacy_authorization_type_required:
      "Tipo de autorização obrigatório no registro legado",
    legacy_authorized_at_required:
      "Data da autorização obrigatória no registro legado",
    legacy_registered_at_required:
      "Data do registro obrigatória no registro legado",
    capture_mode_not_supported: "Modo de captura não reconhecido",
    checksum_not_registered: "Checksum ainda não registrado",
    checksum_sha256_invalid: "Checksum SHA-256 inválido",
    checksum_algorithm_sha256_required:
      "Algoritmo SHA-256 obrigatório",
    checksum_bytes_required:
      "Tamanho da imagem usado no checksum obrigatório",
    checksum_content_type_image_required:
      "Tipo de conteúdo de imagem obrigatório no checksum",
    checksum_calculated_at_required:
      "Data do cálculo do checksum obrigatória",
    checksum_registered_at_required:
      "Data do registro do checksum obrigatória",
    checksum_source_image_url_required:
      "URL HTTPS da imagem usada no checksum obrigatória",
    checksum_source_final_url_required:
      "URL final HTTPS usada no checksum obrigatória",
    checksum_source_image_url_mismatch:
      "URL usada no checksum difere da imagem oficial atual",
    checksum_preflight_version_required:
      "Versão do preflight do checksum obrigatória",
    checksum_write_version_required:
      "Versão da escrita do checksum obrigatória",
    checksum_confirmation_digest_sha256_required:
      "Digest SHA-256 da confirmação obrigatório",
  };

  return labels[reason] || reason;
}

function ProvenanceDetail({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string | number | null;
  monospace?: boolean;
}) {
  const text =
    value === null || value === "" ? "Não disponível" : String(value);

  return (
    <div>
      <strong>{label}</strong>
      <p
        style={{
          ...mutedTextStyle(),
          overflowWrap: "anywhere",
          fontFamily: monospace
            ? "ui-monospace, SFMono-Regular, Menlo, monospace"
            : undefined,
          fontSize: monospace ? 12 : undefined,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function CanonicalImageProvenanceAuditPanel({
  audit,
}: {
  audit: CanonicalImageProvenanceAuditData;
}) {
  return (
    <section
      style={{ display: "grid", gap: 14 }}
      data-canonical-image-provenance-audit-panel="true"
      data-canonical-image-provenance-audit-version={
        CANONICAL_IMAGE_PROVENANCE_AUDIT_VERSION
      }
      data-canonical-image-provenance-audit-locale={
        OFFICIAL_EVENTS_ADMIN_LOCALE
      }
      data-canonical-image-provenance-audit-read-only="true"
      data-canonical-image-checksum-audit-version={
        CANONICAL_IMAGE_CHECKSUM_AUDIT_VERSION
      }
      data-canonical-image-checksum-audit-read-only="true"
    >
      <div style={heroStyle()}>
        <span style={badgeStyle()}>
          Auditoria interna · somente leitura
        </span>
        <h2 style={{ margin: 0 }}>
          Auditoria de procedência das imagens canônicas
        </h2>
        <p style={mutedTextStyle()}>
          Confere os dados técnicos já persistidos para cada imagem oficial:
          provider, ID externo, origem, captura, validação, autoridade,
          checksum e detalhes da escrita controlada quando disponíveis.
        </p>
        <div
          style={panelStyle()}
          data-canonical-image-provenance-safety="read-only"
        >
          <strong>Garantias desta auditoria</strong>
          <p style={mutedTextStyle()}>
            Nenhum site externo é acessado, nenhuma imagem é recapturada,
            nenhum dado é gravado e a política de ingressos permanece
            inalterada.
          </p>
        </div>
      </div>

      <div style={gridStyle()}>
        <StatCard
          label="COM IMAGEM"
          value={audit.summary.withOfficialImageMetadata}
        />
        <StatCard
          label="PROCEDÊNCIA COMPLETA"
          value={audit.summary.completeProvenance}
        />
        <StatCard
          label="PROCEDÊNCIA INCOMPLETA"
          value={audit.summary.incompleteProvenance}
        />
        <StatCard
          label="FONTE VALIDADA"
          value={audit.summary.validatedSource}
        />
        <StatCard
          label="REGISTRO LEGADO"
          value={audit.summary.legacyAuthorized}
        />
        <StatCard
          label="COM CHECKSUM"
          value={audit.summary.checksumAvailable}
        />
        <StatCard
          label="CHECKSUM COMPLETO"
          value={audit.summary.checksumAuditComplete}
        />
        <StatCard
          label="CHECKSUM INCOMPLETO"
          value={audit.summary.checksumAuditIncomplete}
        />
      </div>

      {!audit.ok ? (
        <div style={panelStyle()}>
          <h3 style={{ marginTop: 0 }}>
            Não foi possível carregar a auditoria de procedência
          </h3>
          <p style={mutedTextStyle()}>{audit.message}</p>
        </div>
      ) : null}

      {audit.ok && audit.items.length === 0 ? (
        <div style={panelStyle()}>
          <strong>Nenhuma imagem canônica registrada</strong>
          <p style={mutedTextStyle()}>
            Não existem imagens oficiais persistidas nos eventos canônicos
            validados desta amostra.
          </p>
        </div>
      ) : null}

      {audit.ok && audit.items.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {audit.items.map((item) => (
            <article
              key={item.canonicalEvent.id}
              style={cardStyle()}
              data-canonical-image-provenance-item={
                item.canonicalEvent.id
              }
              data-canonical-image-provenance-complete={
                item.completeness.complete ? "true" : "false"
              }
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span style={badgeStyle()}>
                  {item.completeness.complete
                    ? "procedência completa"
                    : "procedência incompleta"}
                </span>
                <span style={badgeStyle()}>
                  {captureModeLabel(item.image.captureMode)}
                </span>
                <span style={badgeStyle()}>
                  {provenanceStatusLabel(item.image.provenanceStatus)}
                </span>
                <span style={badgeStyle()}>
                  checksum{" "}
                  {item.completeness.checksumAvailable
                    ? "disponível"
                    : "não registrado"}
                </span>
                <span style={badgeStyle()}>
                  {item.completeness.checksumAuditComplete
                    ? "auditoria do checksum completa"
                    : item.completeness.checksumAvailable
                      ? "auditoria do checksum incompleta"
                      : "auditoria do checksum pendente"}
                </span>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>
                  {item.canonicalEvent.eventName}
                </h3>
                <p style={mutedTextStyle()}>
                  {[
                    item.canonicalEvent.venueName,
                    item.canonicalEvent.city,
                    item.canonicalEvent.state,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Local não disponível"}
                </p>
                <p style={mutedTextStyle()}>
                  {formatDate(
                    item.canonicalEvent.startsAt ||
                      item.canonicalEvent.eventDateKey
                  )}
                </p>
              </div>

              <div style={gridStyle()}>
                <ProvenanceDetail
                  label="Provider"
                  value={item.image.providerKey}
                />
                <ProvenanceDetail
                  label="ID externo do evento"
                  value={item.image.externalEventId}
                  monospace
                />
                <ProvenanceDetail
                  label="Método de validação"
                  value={item.image.validationMethod}
                />
                <ProvenanceDetail
                  label="Confiança da fonte"
                  value={item.image.sourceConfidenceScore}
                />
                <ProvenanceDetail
                  label="Autoridade da fonte"
                  value={item.image.sourceAuthorityScore}
                />
                <ProvenanceDetail
                  label="Capturada em"
                  value={formatDateTime(item.image.capturedAt)}
                />
                <ProvenanceDetail
                  label="Método de extração"
                  value={item.image.extractionMethod}
                />
                <ProvenanceDetail
                  label="Versão da captura"
                  value={item.image.captureVersion}
                  monospace
                />
                <ProvenanceDetail
                  label="Checksum SHA-256"
                  value={item.image.checksumSha256}
                  monospace
                />
                <ProvenanceDetail
                  label="Algoritmo do checksum"
                  value={item.image.checksumAlgorithm}
                  monospace
                />
                <ProvenanceDetail
                  label="Tamanho usado no checksum"
                  value={
                    item.image.checksumBytes === null
                      ? null
                      : `${item.image.checksumBytes} bytes`
                  }
                />
                <ProvenanceDetail
                  label="Tipo de conteúdo do checksum"
                  value={item.image.checksumContentType}
                  monospace
                />
                <ProvenanceDetail
                  label="Checksum calculado em"
                  value={formatDateTime(item.image.checksumCalculatedAt)}
                />
                <ProvenanceDetail
                  label="Checksum registrado em"
                  value={formatDateTime(item.image.checksumRegisteredAt)}
                />
                <ProvenanceDetail
                  label="Versão do preflight"
                  value={item.image.checksumPreflightVersion}
                  monospace
                />
                <ProvenanceDetail
                  label="Versão da escrita"
                  value={item.image.checksumWriteVersion}
                  monospace
                />
              </div>

              {item.completeness.checksumAvailable ? (
                <>
                  <div style={panelStyle()}>
                    <ProvenanceDetail
                      label="URL da imagem usada no checksum"
                      value={item.image.checksumSourceImageUrl}
                      monospace
                    />
                  </div>

                  <div style={panelStyle()}>
                    <ProvenanceDetail
                      label="URL final usada no checksum"
                      value={item.image.checksumSourceFinalUrl}
                      monospace
                    />
                  </div>

                  <div style={panelStyle()}>
                    <ProvenanceDetail
                      label="Digest de confirmação da escrita"
                      value={item.image.checksumConfirmationDigestSha256}
                      monospace
                    />
                  </div>
                </>
              ) : null}

              <div style={panelStyle()}>
                <ProvenanceDetail
                  label="URL original da imagem"
                  value={item.image.imageUrl}
                  monospace
                />
              </div>

              <div style={panelStyle()}>
                <ProvenanceDetail
                  label="URL da página-fonte"
                  value={item.image.sourceUrl}
                  monospace
                />
              </div>

              {item.image.sourcePageFinalUrl &&
              item.image.sourcePageFinalUrl !== item.image.sourceUrl ? (
                <div style={panelStyle()}>
                  <ProvenanceDetail
                    label="URL final da página-fonte"
                    value={item.image.sourcePageFinalUrl}
                    monospace
                  />
                </div>
              ) : null}

              {!item.completeness.complete ? (
                <div
                  style={panelStyle()}
                  data-canonical-image-provenance-warning="true"
                >
                  <strong>Alertas de procedência</strong>
                  <p style={mutedTextStyle()}>
                    {item.completeness.warnings
                      .map(provenanceWarningLabel)
                      .join(" · ")}
                  </p>
                </div>
              ) : null}

              {item.completeness.checksumAuditWarnings.length > 0 ? (
                <div
                  style={panelStyle()}
                  data-canonical-image-checksum-audit-warning="true"
                >
                  <strong>Alertas da auditoria do checksum</strong>
                  <p style={mutedTextStyle()}>
                    {item.completeness.checksumAuditWarnings
                      .map(provenanceWarningLabel)
                      .join(" · ")}
                  </p>
                </div>
              ) : (
                <div
                  style={panelStyle()}
                  data-canonical-image-checksum-audit-complete="true"
                >
                  <strong>Auditoria do checksum completa</strong>
                  <p style={mutedTextStyle()}>
                    O checksum e todos os dados técnicos da primeira escrita
                    controlada estão registrados.
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : null}

      {audit.summary.resultTruncated ? (
        <div style={panelStyle()}>
          <p style={mutedTextStyle()}>
            Resultado limitado a{" "}
            {CANONICAL_IMAGE_PROVENANCE_RESULT_LIMIT} imagens. Os totais
            consideram todo o conjunto analisado.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function CandidateCard({ candidate }: { candidate: CandidateView }) {
  return (
    <article style={cardStyle()}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={badgeStyle()}>{candidate.provider}</span>
        <span style={badgeStyle()}>
          {candidateStatusLabel(candidate.candidate_status)}
        </span>
        <span style={badgeStyle()}>
          {recommendedActionLabel(candidate.recommendedAction)}
        </span>
      </div>

      <div>
        <h2 style={{ margin: 0, fontSize: 22 }}>{candidate.event_name}</h2>
        <p style={mutedTextStyle()}>
          {candidate.artist_name || "Artista não disponível"} |{" "}
          {candidate.venue_name || "Local não disponível"}
        </p>
      </div>

      <div style={gridStyle()}>
        <div>
          <strong>Data</strong>
          <p style={mutedTextStyle()}>{formatDate(candidate.event_date)}</p>
        </div>

        <div>
          <strong>Localização</strong>
          <p style={mutedTextStyle()}>
            {[candidate.city, candidate.state, candidate.country]
              .filter(Boolean)
              .join(", ") || "Não disponível"}
          </p>
        </div>

        <div>
          <strong>Confiança</strong>
          <p style={mutedTextStyle()}>{candidate.confidence ?? 0}</p>
        </div>

        <div>
          <strong>Atualizado em</strong>
          <p style={mutedTextStyle()}>{formatDateTime(candidate.updated_at)}</p>
        </div>
      </div>

      {candidate.eventGroup ? (
        <div style={panelStyle()}>
          <strong>Grupo de evento vinculado</strong>
          <p style={mutedTextStyle()}>
            {candidate.eventGroup.event_name || "Grupo sem nome"} |{" "}
            {candidate.eventGroup.city_base || "Cidade não informada"}
          </p>
          <p style={mutedTextStyle()}>
            Status do grupo: {genericStatusLabel(candidate.eventGroup.status)} |{" "}
            Status oficial:{" "}
            {genericStatusLabel(candidate.eventGroup.official_status)} |{" "}
            Público: {candidate.eventGroup.is_public ? "sim" : "não"}
          </p>
        </div>
      ) : (
        <div style={panelStyle()}>
          <strong>Nenhum grupo de evento vinculado</strong>
          <p style={mutedTextStyle()}>
            Este candidato ainda precisa de um grupo de evento de destino.
          </p>
        </div>
      )}

      {candidate.primaryOfficialUrl ? (
        <a
          href={candidate.primaryOfficialUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={linkButtonStyle()}
        >
          Abrir link oficial
        </a>
      ) : null}
    </article>
  );
}

export default async function OfficialEventsAdminPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminAllowed(user.id, user.email)) {
    return (
      <main style={pageStyle()}>
        <section style={heroStyle()}>
          <span style={badgeStyle()}>Acesso administrativo obrigatório</span>
          <h1 style={{ margin: 0, fontSize: 32 }}>Administração de eventos oficiais</h1>
          <p style={mutedTextStyle()}>
            Seu usuário está conectado, mas não possui autorização para acessar
            esta página administrativa.
          </p>
          <Link href="/dashboard" style={linkButtonStyle()}>
            Voltar ao painel
          </Link>
        </section>
      </main>
    );
  }

  const data = await loadAdminData();

  return (
    <main style={pageStyle()} data-admin-locale={OFFICIAL_EVENTS_ADMIN_LOCALE}>
      <section style={heroStyle()}>
        <span style={badgeStyle()}>Prévia interna · somente leitura</span>
        <h1 style={{ margin: 0, fontSize: 34 }}>Administração de eventos oficiais</h1>
        <p style={mutedTextStyle()}>
          Visão interna dos candidatos a eventos oficiais. Esta página não
          grava dados e não confirma eventos.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={linkButtonStyle()}>
            Voltar ao painel
          </Link>
          <Link href="/dashboard/cards" style={linkButtonStyle()}>
            Meus cards
          </Link>
          <Link
            href="/dashboard/admin/official-events/ticket-links"
            style={linkButtonStyle()}
          >
            Monetizacao de ingressos
          </Link>
        </div>
      </section>

      {!data.ok ? (
        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0 }}>
            Não foi possível carregar a prévia administrativa
          </h2>
          <p style={mutedTextStyle()}>{data.message}</p>
        </section>
      ) : null}

      <section style={gridStyle()}>
        <StatCard label="TOTAL" value={data.summary.total} />
        <StatCard label="PROVÁVEIS" value={data.summary.probableCount} />
        <StatCard label="EM REVISÃO" value={data.summary.reviewCount} />
        <StatCard label="CONFIRMADOS" value={data.summary.confirmedCount} />
        <StatCard label="COM GRUPO" value={data.summary.withEventGroupCount} />
        <StatCard label="URL VÁLIDA" value={data.summary.withValidOfficialUrlCount} />
      </section>

      <CanonicalImagePreviewPanel preview={data.imagePreview} />

      <CanonicalImageProvenanceAuditPanel
        audit={data.imageProvenance}
      />

      <section style={{ display: "grid", gap: 14 }}>
        <div style={panelStyle()}>
          <h2 style={{ marginTop: 0 }}>Candidatos</h2>
          <p style={mutedTextStyle()}>
            Exibindo os candidatos mais recentes de official_event_candidates.
            As ações serão adicionadas em uma versão futura.
          </p>
        </div>

        {data.candidates.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>Nenhum candidato encontrado</h3>
            <p style={mutedTextStyle()}>
              Execute primeiro o resolvedor para preencher os candidatos.
            </p>
          </div>
        ) : (
          data.candidates.map((candidate) => (
            <CandidateCard key={candidate.candidate_id} candidate={candidate} />
          ))
        )}
      </section>
    </main>
  );
}
