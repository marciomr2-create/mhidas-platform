// src/app/api/official-events/_shared/eventJsonLdNormalizer.ts

import type {
  EventIngestionNormalizedCandidate,
  EventIngestionRawCandidate,
  EventIngestionRawSource,
} from "./eventIngestionContract";

import {
  normalizeEventIngestionRawCandidate,
  normalizeEventIngestionText,
  normalizeEventIngestionUrl,
} from "./eventIngestionContract";

export type JsonLdObject = Record<string, unknown>;

export type EventJsonLdNormalizerOptions = {
  source?: Partial<EventIngestionRawSource>;
  source_url?: string | null;
  collected_at?: string | null;
  raw_reference?: string | null;
  submitted_by_user_id?: string | null;
};

export type EventJsonLdNormalizationResult = {
  raw_candidates: EventIngestionRawCandidate[];
  normalized_candidates: EventIngestionNormalizedCandidate[];
  event_object_count: number;
};

export function isJsonLdObject(value: unknown): value is JsonLdObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function collectJsonLdObjects(payload: unknown): JsonLdObject[] {
  const collected: JsonLdObject[] = [];
  collectJsonLdObjectsInternal(payload, collected, new WeakSet<object>());
  return collected;
}

export function findJsonLdEventObjects(payload: unknown): JsonLdObject[] {
  return collectJsonLdObjects(payload).filter(isJsonLdEventObject);
}

export function isJsonLdEventObject(value: unknown): value is JsonLdObject {
  if (!isJsonLdObject(value)) return false;

  const typeValue = value["@type"];
  const typeItems = toUnknownArray(typeValue);

  return typeItems.some((item) => {
    const normalizedType = normalizeEventIngestionText(item)?.toLowerCase();
    if (!normalizedType) return false;

    return (
      normalizedType === "event" ||
      normalizedType === "schema:event" ||
      normalizedType.endsWith("/event") ||
      normalizedType.endsWith("#event") ||
      normalizedType.endsWith(":event") ||
      normalizedType.includes("musicevent")
    );
  });
}

export function createJsonLdRawSource(
  options: EventJsonLdNormalizerOptions = {}
): EventIngestionRawSource {
  const source = options.source ?? {};

  return {
    source_id: source.source_id ?? null,
    source_key: source.source_key ?? null,
    display_name:
      normalizeEventIngestionText(source.display_name) ??
      "JSON-LD public page",
    trust_tier: source.trust_tier ?? "discovery",
    authority_scope: source.authority_scope ?? "discovery_only",
    input_format: "json_ld",
    actor_type: source.actor_type ?? "editorial_source",
    source_url:
      normalizeEventIngestionUrl(source.source_url ?? options.source_url) ??
      null,
    collected_at:
      normalizeEventIngestionText(source.collected_at ?? options.collected_at) ??
      null,
    raw_reference:
      normalizeEventIngestionText(
        source.raw_reference ?? options.raw_reference
      ) ?? null,
    submitted_by_user_id:
      normalizeEventIngestionText(
        source.submitted_by_user_id ?? options.submitted_by_user_id
      ) ?? null,
  };
}

export function jsonLdEventObjectToRawCandidate(
  eventObject: JsonLdObject,
  options: EventJsonLdNormalizerOptions = {}
): EventIngestionRawCandidate {
  const source = createJsonLdRawSource(options);
  const location = readFirstDefinedValue(eventObject, ["location"]);
  const address = readAddressEntity(location);
  const organizer = readFirstDefinedValue(eventObject, [
    "organizer",
    "performer",
  ]);

  const officialEventUrl =
    readUrlFromEntity(
      readFirstDefinedValue(eventObject, ["url", "mainEntityOfPage", "@id"])
    ) ?? source.source_url;

  return {
    source,
    raw_title: readTextFromEntity(
      readFirstDefinedValue(eventObject, ["name", "headline", "title"])
    ),
    raw_description: readTextFromEntity(
      readFirstDefinedValue(eventObject, [
        "description",
        "disambiguatingDescription",
      ])
    ),
    raw_start_at: readTextFromEntity(
      readFirstDefinedValue(eventObject, ["startDate", "startTime"])
    ),
    raw_end_at: readTextFromEntity(
      readFirstDefinedValue(eventObject, ["endDate", "endTime"])
    ),
    raw_timezone: readTextFromEntity(
      readFirstDefinedValue(eventObject, ["eventTimezone", "timezone"])
    ),
    raw_date_text: readTextFromEntity(
      readFirstDefinedValue(eventObject, ["datePublished", "doorTime"])
    ),
    raw_venue_name: readNameFromEntity(location),
    raw_address: address.address,
    raw_city: address.city,
    raw_state: address.state,
    raw_country: address.country,
    raw_organizer_name: readNameFromEntity(organizer),
    raw_organizer_url: readUrlFromEntity(organizer),
    raw_official_event_url: officialEventUrl,
    raw_ticket_url: readTicketUrl(eventObject),
    raw_image_url: readUrlFromEntity(
      readFirstDefinedValue(eventObject, ["image", "thumbnailUrl", "photo"])
    ),
    raw_price_text: readPriceText(eventObject),
    raw_payload: {
      json_ld_event: eventObject,
    },
  };
}

export function jsonLdPayloadToRawCandidates(
  payload: unknown,
  options: EventJsonLdNormalizerOptions = {}
): EventIngestionRawCandidate[] {
  return findJsonLdEventObjects(payload).map((eventObject) =>
    jsonLdEventObjectToRawCandidate(eventObject, options)
  );
}

export function normalizeJsonLdPayloadToCandidates(
  payload: unknown,
  options: EventJsonLdNormalizerOptions = {}
): EventIngestionNormalizedCandidate[] {
  return jsonLdPayloadToRawCandidates(payload, options).map((candidate) =>
    normalizeEventIngestionRawCandidate(candidate)
  );
}

export function normalizeJsonLdPayload(
  payload: unknown,
  options: EventJsonLdNormalizerOptions = {}
): EventJsonLdNormalizationResult {
  const rawCandidates = jsonLdPayloadToRawCandidates(payload, options);

  return {
    raw_candidates: rawCandidates,
    normalized_candidates: rawCandidates.map((candidate) =>
      normalizeEventIngestionRawCandidate(candidate)
    ),
    event_object_count: rawCandidates.length,
  };
}

function collectJsonLdObjectsInternal(
  value: unknown,
  collected: JsonLdObject[],
  seen: WeakSet<object>
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLdObjectsInternal(item, collected, seen);
    }

    return;
  }

  if (!isJsonLdObject(value)) return;
  if (seen.has(value)) return;

  seen.add(value);
  collected.push(value);

  const nestedKeys = [
    "@graph",
    "graph",
    "itemListElement",
    "mainEntity",
    "about",
    "subjectOf",
  ];

  for (const key of nestedKeys) {
    collectJsonLdObjectsInternal(value[key], collected, seen);
  }
}

function toUnknownArray(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function readFirstDefinedValue(
  object: JsonLdObject,
  keys: string[]
): unknown | null {
  for (const key of keys) {
    const value = object[key];

    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
}

function readFirstItem(value: unknown): unknown | null {
  const items = toUnknownArray(value);
  return items.find((item) => item !== null && item !== undefined) ?? null;
}

function readTextFromEntity(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return normalizeEventIngestionText(value);
  }

  const firstItem = readFirstItem(value);

  if (firstItem !== value) {
    return readTextFromEntity(firstItem);
  }

  if (!isJsonLdObject(value)) return null;

  return readTextFromEntity(
    readFirstDefinedValue(value, [
      "name",
      "headline",
      "title",
      "text",
      "description",
      "value",
    ])
  );
}

function readNameFromEntity(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const firstItem = readFirstItem(value);

  if (firstItem !== value) {
    return readNameFromEntity(firstItem);
  }

  if (isJsonLdObject(value)) {
    return readTextFromEntity(
      readFirstDefinedValue(value, ["name", "legalName", "alternateName"])
    );
  }

  return readTextFromEntity(value);
}

function readUrlFromEntity(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return normalizeEventIngestionUrl(value);
  }

  const firstItem = readFirstItem(value);

  if (firstItem !== value) {
    return readUrlFromEntity(firstItem);
  }

  if (!isJsonLdObject(value)) return null;

  return readUrlFromEntity(
    readFirstDefinedValue(value, [
      "url",
      "@id",
      "sameAs",
      "contentUrl",
      "embedUrl",
      "mainEntityOfPage",
    ])
  );
}

function readAddressEntity(value: unknown): {
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
} {
  const location = readFirstItem(value);

  if (!isJsonLdObject(location)) {
    return {
      address: readTextFromEntity(location),
      city: null,
      state: null,
      country: null,
    };
  }

  const addressEntity =
    readFirstDefinedValue(location, ["address"]) ?? location;
  const address = readFirstItem(addressEntity);

  if (!isJsonLdObject(address)) {
    return {
      address: readTextFromEntity(address),
      city: null,
      state: null,
      country: null,
    };
  }

  return {
    address: readTextFromEntity(
      readFirstDefinedValue(address, ["streetAddress", "name"])
    ),
    city: readTextFromEntity(
      readFirstDefinedValue(address, ["addressLocality", "city"])
    ),
    state: readTextFromEntity(
      readFirstDefinedValue(address, ["addressRegion", "state"])
    ),
    country: readTextFromEntity(
      readFirstDefinedValue(address, ["addressCountry", "country"])
    ),
  };
}

function readTicketUrl(eventObject: JsonLdObject): string | null {
  const offers = readFirstDefinedValue(eventObject, ["offers"]);
  const offer = readFirstItem(offers);

  if (!isJsonLdObject(offer)) {
    return readUrlFromEntity(offers);
  }

  return readUrlFromEntity(
    readFirstDefinedValue(offer, ["url", "@id", "availabilityStarts"])
  );
}

function readPriceText(eventObject: JsonLdObject): string | null {
  const offers = readFirstDefinedValue(eventObject, ["offers"]);
  const offer = readFirstItem(offers);

  if (!isJsonLdObject(offer)) {
    return readTextFromEntity(offers);
  }

  const price = readTextFromEntity(
    readFirstDefinedValue(offer, ["price", "lowPrice", "highPrice"])
  );

  const currency = readTextFromEntity(
    readFirstDefinedValue(offer, ["priceCurrency"])
  );

  if (price && currency) {
    return `${currency} ${price}`;
  }

  return price ?? readTextFromEntity(readFirstDefinedValue(offer, ["name"]));
}