// src/app/api/official-events/_shared/eventExternalRawEventNormalizer.ts

import type {
  EventTicketingApiProviderKey,
  EventTicketingApiRawEventSignal,
} from "./eventTicketingApiSourceAdapter";

export type EventExternalRawEventNormalizationErrorCode =
  | "missing_event_name"
  | "missing_event_date"
  | "missing_venue_name"
  | "missing_city"
  | "missing_official_url"
  | "event_expired";

export type EventExternalRawEventFieldKey =
  | "external_event_id"
  | "event_name"
  | "starts_at"
  | "venue_name"
  | "city"
  | "state"
  | "country"
  | "official_url"
  | "ticket_url"
  | "source_event_url"
  | "is_event_expired";

export type EventExternalRawEventFieldMap = Partial<
  Record<EventExternalRawEventFieldKey, string[]>
>;

export type EventExternalRawEventNormalizerInput = {
  provider_key: EventTicketingApiProviderKey;
  provider_name: string;
  raw_payload: Record<string, unknown>;
  field_map?: EventExternalRawEventFieldMap | null;
  current_date?: string | null;
};

export type EventExternalRawEventNormalizedIdentity = {
  has_event_name: boolean;
  has_event_date: boolean;
  has_venue_name: boolean;
  has_city: boolean;
  has_official_url: boolean;
  has_ticket_url: boolean;
  complete_required_identity: boolean;
  strong_signal_count: number;
};

export type EventExternalRawEventNormalizerResult = {
  provider_key: EventTicketingApiProviderKey;
  provider_name: string;
  normalized_signal: EventTicketingApiRawEventSignal;
  normalized_identity: EventExternalRawEventNormalizedIdentity;
  validation_error_codes: EventExternalRawEventNormalizationErrorCode[];
  can_feed_ticketing_api_adapter: boolean;
  external_request_performed: false;
  human_event_analysis_required: false;
};

const DEFAULT_FIELD_MAP: Required<EventExternalRawEventFieldMap> = {
  external_event_id: [
    "external_event_id",
    "externalEventId",
    "id",
    "event.id",
    "eventId",
  ],
  event_name: [
    "event_name",
    "eventName",
    "name",
    "title",
    "event.name",
    "event.title",
  ],
  starts_at: [
    "starts_at",
    "startsAt",
    "start_date",
    "startDate",
    "date",
    "event.starts_at",
    "event.startDate",
  ],
  venue_name: [
    "venue_name",
    "venueName",
    "venue.name",
    "location.venue",
    "location.name",
  ],
  city: ["city", "location.city", "venue.city", "municipality"],
  state: ["state", "location.state", "venue.state", "region"],
  country: ["country", "location.country", "venue.country"],
  official_url: [
    "official_url",
    "officialUrl",
    "url",
    "event.url",
    "event.link",
    "link",
  ],
  ticket_url: [
    "ticket_url",
    "ticketUrl",
    "tickets_url",
    "ticketsUrl",
    "ticketing.url",
    "buyUrl",
  ],
  source_event_url: [
    "source_event_url",
    "sourceEventUrl",
    "api_url",
    "apiUrl",
    "self",
    "href",
  ],
  is_event_expired: [
    "is_event_expired",
    "isEventExpired",
    "expired",
    "event.expired",
  ],
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = normalizeText(value);
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function getValueByPath(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = payload;

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function pickFirstString(
  payload: Record<string, unknown>,
  fieldNames: string[]
): string | null {
  for (const fieldName of fieldNames) {
    const value = toStringValue(getValueByPath(payload, fieldName));

    if (value) {
      return value;
    }
  }

  return null;
}

function pickFirstBoolean(
  payload: Record<string, unknown>,
  fieldNames: string[]
): boolean | null {
  for (const fieldName of fieldNames) {
    const value = toBooleanValue(getValueByPath(payload, fieldName));

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function mergeFieldMap(
  fieldMap: EventExternalRawEventFieldMap | null | undefined
): Required<EventExternalRawEventFieldMap> {
  return {
    external_event_id:
      fieldMap?.external_event_id ?? DEFAULT_FIELD_MAP.external_event_id,
    event_name: fieldMap?.event_name ?? DEFAULT_FIELD_MAP.event_name,
    starts_at: fieldMap?.starts_at ?? DEFAULT_FIELD_MAP.starts_at,
    venue_name: fieldMap?.venue_name ?? DEFAULT_FIELD_MAP.venue_name,
    city: fieldMap?.city ?? DEFAULT_FIELD_MAP.city,
    state: fieldMap?.state ?? DEFAULT_FIELD_MAP.state,
    country: fieldMap?.country ?? DEFAULT_FIELD_MAP.country,
    official_url: fieldMap?.official_url ?? DEFAULT_FIELD_MAP.official_url,
    ticket_url: fieldMap?.ticket_url ?? DEFAULT_FIELD_MAP.ticket_url,
    source_event_url:
      fieldMap?.source_event_url ?? DEFAULT_FIELD_MAP.source_event_url,
    is_event_expired:
      fieldMap?.is_event_expired ?? DEFAULT_FIELD_MAP.is_event_expired,
  };
}

function isEventExpiredByDate(
  startsAt: string | null,
  currentDate: string | null | undefined
): boolean {
  if (!startsAt || !currentDate) {
    return false;
  }

  const startsAtTime = Date.parse(startsAt);
  const currentDateTime = Date.parse(currentDate);

  if (!Number.isFinite(startsAtTime) || !Number.isFinite(currentDateTime)) {
    return false;
  }

  return startsAtTime < currentDateTime;
}

function countStrongSignals(
  normalizedSignal: EventTicketingApiRawEventSignal
): number {
  const values = [
    normalizedSignal.external_event_id,
    normalizedSignal.event_name,
    normalizedSignal.starts_at,
    normalizedSignal.venue_name,
    normalizedSignal.city,
    normalizedSignal.state,
    normalizedSignal.country,
    normalizedSignal.official_url,
    normalizedSignal.ticket_url,
    normalizedSignal.source_event_url,
  ];

  return values.filter((value) => typeof value === "string" && value.length > 0)
    .length;
}

function buildValidationErrors(
  normalizedSignal: EventTicketingApiRawEventSignal
): EventExternalRawEventNormalizationErrorCode[] {
  const errors: EventExternalRawEventNormalizationErrorCode[] = [];

  if (!normalizedSignal.event_name) {
    errors.push("missing_event_name");
  }

  if (!normalizedSignal.starts_at) {
    errors.push("missing_event_date");
  }

  if (!normalizedSignal.venue_name) {
    errors.push("missing_venue_name");
  }

  if (!normalizedSignal.city) {
    errors.push("missing_city");
  }

  if (!normalizedSignal.official_url) {
    errors.push("missing_official_url");
  }

  if (normalizedSignal.is_event_expired === true) {
    errors.push("event_expired");
  }

  return errors;
}

export function normalizeExternalRawEvent(
  input: EventExternalRawEventNormalizerInput
): EventExternalRawEventNormalizerResult {
  const fieldMap = mergeFieldMap(input.field_map);
  const rawPayload = input.raw_payload;

  const startsAt = pickFirstString(rawPayload, fieldMap.starts_at);
  const explicitExpired = pickFirstBoolean(
    rawPayload,
    fieldMap.is_event_expired
  );
  const inferredExpired = isEventExpiredByDate(startsAt, input.current_date);

  const normalizedSignal: EventTicketingApiRawEventSignal = {
    external_event_id: pickFirstString(rawPayload, fieldMap.external_event_id),
    event_name: pickFirstString(rawPayload, fieldMap.event_name),
    starts_at: startsAt,
    venue_name: pickFirstString(rawPayload, fieldMap.venue_name),
    city: pickFirstString(rawPayload, fieldMap.city),
    state: pickFirstString(rawPayload, fieldMap.state),
    country: pickFirstString(rawPayload, fieldMap.country),
    official_url: pickFirstString(rawPayload, fieldMap.official_url),
    ticket_url: pickFirstString(rawPayload, fieldMap.ticket_url),
    source_event_url: pickFirstString(rawPayload, fieldMap.source_event_url),
    is_event_expired: explicitExpired === true || inferredExpired,
  };

  const validationErrorCodes = buildValidationErrors(normalizedSignal);

  const normalizedIdentity: EventExternalRawEventNormalizedIdentity = {
    has_event_name: Boolean(normalizedSignal.event_name),
    has_event_date: Boolean(normalizedSignal.starts_at),
    has_venue_name: Boolean(normalizedSignal.venue_name),
    has_city: Boolean(normalizedSignal.city),
    has_official_url: Boolean(normalizedSignal.official_url),
    has_ticket_url: Boolean(normalizedSignal.ticket_url),
    complete_required_identity:
      Boolean(normalizedSignal.event_name) &&
      Boolean(normalizedSignal.starts_at) &&
      Boolean(normalizedSignal.venue_name) &&
      Boolean(normalizedSignal.city) &&
      Boolean(normalizedSignal.official_url),
    strong_signal_count: countStrongSignals(normalizedSignal),
  };

  return {
    provider_key: input.provider_key,
    provider_name: input.provider_name,
    normalized_signal: normalizedSignal,
    normalized_identity: normalizedIdentity,
    validation_error_codes: validationErrorCodes,
    can_feed_ticketing_api_adapter: validationErrorCodes.length === 0,
    external_request_performed: false,
    human_event_analysis_required: false,
  };
}