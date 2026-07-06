// src/app/api/official-events/_shared/eventIngestionContract.ts

import type {
  EventSourceAuthorityScope,
  EventSourceTrustTier,
} from "./eventSourceTypes";

export const EVENT_INGESTION_INPUT_FORMATS = [
  "api",
  "json_ld",
  "sitemap",
  "public_page",
  "partner_feed",
  "organizer_submission",
  "clubber_suggestion",
] as const;

export type EventIngestionInputFormat =
  (typeof EVENT_INGESTION_INPUT_FORMATS)[number];

export const EVENT_INGESTION_ACTOR_TYPES = [
  "official_source",
  "verified_organizer",
  "unverified_organizer",
  "clubber",
  "editorial_source",
] as const;

export type EventIngestionActorType =
  (typeof EVENT_INGESTION_ACTOR_TYPES)[number];

export const EVENT_INGESTION_CONFIDENCE_LEVELS = [
  "official",
  "verified_organizer",
  "unverified_organizer",
  "community",
  "editorial_discovery",
] as const;

export type EventIngestionConfidenceLevel =
  (typeof EVENT_INGESTION_CONFIDENCE_LEVELS)[number];

export type EventIngestionRawSource = {
  source_id: string | null;
  source_key: string | null;
  display_name: string | null;
  trust_tier: EventSourceTrustTier | null;
  authority_scope: EventSourceAuthorityScope | null;
  input_format: EventIngestionInputFormat;
  actor_type: EventIngestionActorType;
  source_url: string | null;
  collected_at: string | null;
  raw_reference: string | null;
  submitted_by_user_id: string | null;
};

export type EventIngestionRawCandidate = {
  source: EventIngestionRawSource;
  raw_title: string | null;
  raw_description: string | null;
  raw_start_at: string | null;
  raw_end_at: string | null;
  raw_timezone: string | null;
  raw_date_text: string | null;
  raw_venue_name: string | null;
  raw_address: string | null;
  raw_city: string | null;
  raw_state: string | null;
  raw_country: string | null;
  raw_organizer_name: string | null;
  raw_organizer_url: string | null;
  raw_official_event_url: string | null;
  raw_ticket_url: string | null;
  raw_image_url: string | null;
  raw_price_text: string | null;
  raw_payload: Record<string, unknown>;
};

export type EventIngestionValidationSeverity = "warning" | "error";

export type EventIngestionValidationIssue = {
  severity: EventIngestionValidationSeverity;
  code: string;
  message: string;
};

export type EventIngestionNormalizedCandidate = {
  source: EventIngestionRawSource;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  date_text: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  organizer_name: string | null;
  organizer_url: string | null;
  official_event_url: string | null;
  ticket_url: string | null;
  image_url: string | null;
  price_text: string | null;
  confidence_level: EventIngestionConfidenceLevel;
  can_be_confirmed_without_secondary_source: boolean;
  can_be_published_automatically: false;
  validation_issues: EventIngestionValidationIssue[];
  raw_payload: Record<string, unknown>;
};

export type EventIngestionValidationSummary = {
  is_valid_for_candidate_review: boolean;
  error_count: number;
  warning_count: number;
  issues: EventIngestionValidationIssue[];
};

export function isEventIngestionInputFormat(
  value: unknown
): value is EventIngestionInputFormat {
  return EVENT_INGESTION_INPUT_FORMATS.includes(
    value as EventIngestionInputFormat
  );
}

export function normalizeEventIngestionText(value: unknown): string | null {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

export function isSafeEventIngestionUrl(value: unknown): boolean {
  const rawUrl = normalizeEventIngestionText(value);
  if (!rawUrl) return false;

  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeEventIngestionUrl(value: unknown): string | null {
  const rawUrl = normalizeEventIngestionText(value);
  if (!rawUrl) return null;

  try {
    const parsedUrl = new URL(rawUrl);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return null;
    }

    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function inferEventIngestionConfidenceLevel(
  source: Pick<
    EventIngestionRawSource,
    "actor_type" | "trust_tier" | "authority_scope"
  >
): EventIngestionConfidenceLevel {
  if (
    source.actor_type === "official_source" &&
    source.trust_tier === "official" &&
    source.authority_scope !== "discovery_only" &&
    source.authority_scope !== "community_only"
  ) {
    return "official";
  }

  if (source.actor_type === "verified_organizer") {
    return "verified_organizer";
  }

  if (source.actor_type === "unverified_organizer") {
    return "unverified_organizer";
  }

  if (source.actor_type === "clubber") {
    return "community";
  }

  return "editorial_discovery";
}

export function canConfirmEventIngestionWithoutSecondarySource(
  source: Pick<
    EventIngestionRawSource,
    "actor_type" | "trust_tier" | "authority_scope"
  >
): boolean {
  if (source.actor_type === "verified_organizer") return true;

  return (
    source.actor_type === "official_source" &&
    source.trust_tier === "official" &&
    source.authority_scope !== "discovery_only" &&
    source.authority_scope !== "community_only"
  );
}

export function normalizeEventIngestionRawCandidate(
  candidate: EventIngestionRawCandidate
): EventIngestionNormalizedCandidate {
  const source = candidate.source;

  const normalized: EventIngestionNormalizedCandidate = {
    source,
    title: normalizeEventIngestionText(candidate.raw_title),
    description: normalizeEventIngestionText(candidate.raw_description),
    start_at: normalizeEventIngestionText(candidate.raw_start_at),
    end_at: normalizeEventIngestionText(candidate.raw_end_at),
    timezone: normalizeEventIngestionText(candidate.raw_timezone),
    date_text: normalizeEventIngestionText(candidate.raw_date_text),
    venue_name: normalizeEventIngestionText(candidate.raw_venue_name),
    address: normalizeEventIngestionText(candidate.raw_address),
    city: normalizeEventIngestionText(candidate.raw_city),
    state: normalizeEventIngestionText(candidate.raw_state),
    country: normalizeEventIngestionText(candidate.raw_country),
    organizer_name: normalizeEventIngestionText(candidate.raw_organizer_name),
    organizer_url: normalizeEventIngestionUrl(candidate.raw_organizer_url),
    official_event_url: normalizeEventIngestionUrlSafe(
      candidate.raw_official_event_url
    ),
    ticket_url: normalizeEventIngestionUrlSafe(candidate.raw_ticket_url),
    image_url: normalizeEventIngestionUrlSafe(candidate.raw_image_url),
    price_text: normalizeEventIngestionText(candidate.raw_price_text),
    confidence_level: inferEventIngestionConfidenceLevel(source),
    can_be_confirmed_without_secondary_source:
      canConfirmEventIngestionWithoutSecondarySource(source),
    can_be_published_automatically: false,
    validation_issues: [],
    raw_payload: candidate.raw_payload ?? {},
  };

  normalized.validation_issues =
    collectEventIngestionValidationIssues(normalized);

  return normalized;
}

function normalizeEventIngestionUrlSafe(value: unknown): string | null {
  return normalizeEventIngestionUrl(value);
}

export function collectEventIngestionValidationIssues(
  candidate: EventIngestionNormalizedCandidate
): EventIngestionValidationIssue[] {
  const issues: EventIngestionValidationIssue[] = [];

  if (!isEventIngestionInputFormat(candidate.source.input_format)) {
    issues.push({
      severity: "error",
      code: "invalid_input_format",
      message: "Formato de entrada de ingestão inválido.",
    });
  }

  if (!candidate.title) {
    issues.push({
      severity: "error",
      code: "missing_title",
      message: "Candidato bruto sem título de evento.",
    });
  }

  if (!candidate.start_at && !candidate.date_text) {
    issues.push({
      severity: "warning",
      code: "missing_date_signal",
      message: "Candidato bruto sem data estruturada ou texto de data.",
    });
  }

  if (!candidate.venue_name && !candidate.city) {
    issues.push({
      severity: "warning",
      code: "missing_location_signal",
      message: "Candidato bruto sem venue ou cidade.",
    });
  }

  if (!candidate.official_event_url && !candidate.ticket_url) {
    issues.push({
      severity: "warning",
      code: "missing_reference_url",
      message: "Candidato bruto sem URL oficial ou URL de ingresso.",
    });
  }

  if (
    candidate.source.actor_type === "editorial_source" &&
    candidate.confidence_level !== "editorial_discovery"
  ) {
    issues.push({
      severity: "warning",
      code: "editorial_source_limited_authority",
      message:
        "Fonte editorial deve ser usada para descoberta, não para confirmação oficial isolada.",
    });
  }

  if (
    candidate.source.actor_type === "clubber" &&
    candidate.confidence_level !== "community"
  ) {
    issues.push({
      severity: "warning",
      code: "community_source_limited_authority",
      message:
        "Sugestão comunitária deve entrar como sinal de comunidade, não como evento confirmado.",
    });
  }

  return issues;
}

export function summarizeEventIngestionValidation(
  candidate: EventIngestionNormalizedCandidate
): EventIngestionValidationSummary {
  const errorCount = candidate.validation_issues.filter(
    (issue) => issue.severity === "error"
  ).length;

  const warningCount = candidate.validation_issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  return {
    is_valid_for_candidate_review: errorCount === 0,
    error_count: errorCount,
    warning_count: warningCount,
    issues: candidate.validation_issues,
  };
}