// src/app/api/official-events/_providers/ticketmasterAdapter.ts

import {
  type JsonRecord,
  type OfficialEventCandidate,
  type OfficialEventDiscoveryType,
} from "@/app/api/official-events/_shared/resolverTypes";
import {
  createProviderAdapterErrorResult,
  createProviderAdapterNotConfiguredResult,
  type OfficialEventProviderAdapter,
} from "@/app/api/official-events/_shared/providerAdapter";

type TicketmasterEventCandidate = OfficialEventCandidate;

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: unknown): string {
  const url = normalizeText(value);
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) return "";
  return url;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getBestImageUrl(event: JsonRecord): string {
  const images = asArray(event.images)
    .map(asRecord)
    .map((image) => {
      const url = normalizeUrl(image.url);
      const width = toNumber(image.width) || 0;
      const height = toNumber(image.height) || 0;

      return {
        url,
        score: width * height,
      };
    })
    .filter((image) => image.url);

  images.sort((a, b) => b.score - a.score);

  return images[0]?.url || "";
}

function calculateConfidence(params: {
  query: string;
  eventName: string;
  officialUrl: string;
  eventDate: string;
  venueName: string;
  city: string;
}): number {
  const query = params.query.toLowerCase();
  const eventName = params.eventName.toLowerCase();

  let score = 35;

  if (params.officialUrl) score += 25;
  if (params.eventDate) score += 10;
  if (params.venueName) score += 10;
  if (params.city) score += 5;

  if (query && eventName.includes(query)) {
    score += 15;
  } else if (query && query.includes(eventName)) {
    score += 8;
  }

  return clamp(score, 0, 95);
}

function getTicketmasterDiscoveryUrl(params: {
  apiKey: string;
  query: string;
  city: string;
  state: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  size: number;
}) {
  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");

  url.searchParams.set("apikey", params.apiKey);
  url.searchParams.set("keyword", params.query);
  url.searchParams.set("size", String(params.size || 10));
  url.searchParams.set("sort", "date,asc");

  if (params.city) url.searchParams.set("city", params.city);
  if (params.state) url.searchParams.set("stateCode", params.state);
  if (params.countryCode) url.searchParams.set("countryCode", params.countryCode);

  if (params.startDate) {
    url.searchParams.set("startDateTime", `${params.startDate}T00:00:00Z`);
  }

  if (params.endDate) {
    url.searchParams.set("endDateTime", `${params.endDate}T23:59:59Z`);
  }

  return url;
}

function mapTicketmasterEvent(params: {
  event: JsonRecord;
  query: string;
  normalizedQuery: string;
  discoveryType: OfficialEventDiscoveryType;
  queryCity: string;
  queryState: string;
  queryCountry: string;
  queryStartDate: string;
  queryEndDate: string;
  eventGroupId: string;
}): TicketmasterEventCandidate {
  const event = params.event;
  const dates = asRecord(event.dates);
  const start = asRecord(dates.start);
  const embedded = asRecord(event._embedded);
  const venues = asArray(embedded.venues).map(asRecord);
  const venue = venues[0] || {};
  const cityRecord = asRecord(venue.city);
  const stateRecord = asRecord(venue.state);
  const countryRecord = asRecord(venue.country);
  const locationRecord = asRecord(venue.location);

  const eventName = normalizeText(event.name);
  const providerEventId = normalizeText(event.id) || null;
  const providerUrl = normalizeUrl(event.url) || null;
  const eventDate = normalizeText(start.localDate) || null;
  const eventDateTime = normalizeText(start.dateTime) || null;
  const eventTimezone = normalizeText(dates.timezone) || null;
  const venueName = normalizeText(venue.name) || null;
  const city = normalizeText(cityRecord.name) || null;
  const state = normalizeText(stateRecord.stateCode || stateRecord.name) || null;
  const country = normalizeText(countryRecord.countryCode || countryRecord.name) || null;
  const latitude = toNumber(locationRecord.latitude);
  const longitude = toNumber(locationRecord.longitude);
  const imageUrl = getBestImageUrl(event) || null;
  const officialUrl = providerUrl;
  const ticketUrl = providerUrl;

  return {
    provider: "ticketmaster",
    provider_event_id: providerEventId,
    provider_url: providerUrl,
    query_text: params.query || null,
    event_name: eventName || "Untitled Ticketmaster event",
    artist_name: params.query || null,
    event_date: eventDate,
    event_datetime: eventDateTime,
    event_timezone: eventTimezone,
    venue_name: venueName,
    city,
    state,
    country,
    latitude,
    longitude,
    official_url: officialUrl,
    ticket_url: ticketUrl,
    image_url: imageUrl,
    source_name: "Ticketmaster",
    source_type: "ticket",
    candidate_status: "probable",
    confidence: calculateConfidence({
      query: params.query,
      eventName,
      officialUrl: officialUrl || "",
      eventDate: eventDate || "",
      venueName: venueName || "",
      city: city || "",
    }),
    discovery_type: params.discoveryType,
    normalized_query: params.normalizedQuery || null,
    query_city: params.queryCity || null,
    query_state: params.queryState || null,
    query_country: params.queryCountry || null,
    query_start_date: params.queryStartDate || null,
    query_end_date: params.queryEndDate || null,
    match_reason: `Matched by Ticketmaster using query "${params.query}".`,
    match_details: {
      provider: "ticketmaster",
      mode: "orchestrator_production_preview",
      saved: false,
    },
    event_group_id: params.eventGroupId || null,
    raw_payload: event,
    notes:
      "Candidate returned by Ticketmaster adapter through orchestrator production preview. Not saved automatically.",
  };
}

export function createTicketmasterProviderAdapter(): OfficialEventProviderAdapter {
  return {
    provider: "ticketmaster",
    displayName: "Ticketmaster Discovery Adapter",
    isEnabled: true,
    requiresApiKey: true,
    search: async (context) => {
      const apiKey = process.env.TICKETMASTER_API_KEY;

      if (!apiKey) {
        return createProviderAdapterNotConfiguredResult({
          provider: "ticketmaster",
          message:
            "Ticketmaster API key is not configured. Set TICKETMASTER_API_KEY to enable the production adapter.",
        });
      }

      try {
        const url = getTicketmasterDiscoveryUrl({
          apiKey,
          query: context.input.query,
          city: context.input.city,
          state: context.input.state,
          countryCode: context.input.countryCode,
          startDate: context.input.startDate,
          endDate: context.input.endDate,
          size: context.input.size,
        });

        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
          signal: context.signal,
        });

        if (!response.ok) {
          return createProviderAdapterErrorResult({
            provider: "ticketmaster",
            message: "Ticketmaster Discovery API returned an error.",
            error: `HTTP ${response.status}`,
          });
        }

        const payload = asRecord(await response.json());
        const embedded = asRecord(payload._embedded);
        const events = asArray(embedded.events).map(asRecord);

        const candidates = events.map((event) =>
          mapTicketmasterEvent({
            event,
            query: context.input.query,
            normalizedQuery: context.input.normalizedQuery,
            discoveryType: context.input.discoveryType,
            queryCity: context.input.city,
            queryState: context.input.state,
            queryCountry: context.input.countryCode,
            queryStartDate: context.input.startDate,
            queryEndDate: context.input.endDate,
            eventGroupId: context.input.eventGroupId,
          })
        );

        return {
          ok: true,
          provider: "ticketmaster",
          status: "available",
          message: `Ticketmaster Discovery API returned ${candidates.length} candidate(s). No candidate was saved automatically.`,
          candidates,
          raw: payload,
          error: null,
        };
      } catch (error) {
        return createProviderAdapterErrorResult({
          provider: "ticketmaster",
          message: "Ticketmaster adapter failed while calling the Discovery API.",
          error,
        });
      }
    },
  };
}
