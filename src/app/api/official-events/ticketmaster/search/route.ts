// src/app/api/official-events/ticketmaster/search/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type AdminClient = {
  from: (table: string) => any;
};

type CandidateRow = {
  provider: "ticketmaster";
  provider_event_id: string | null;
  provider_url: string | null;
  query_text: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  event_datetime: string | null;
  event_timezone: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  official_url: string | null;
  ticket_url: string | null;
  image_url: string | null;
  source_name: string;
  source_type: "ticket";
  candidate_status: "probable";
  confidence: number;
  discovery_type: "artist" | "event" | "festival" | "venue" | "party" | "mixed";
  normalized_query: string | null;
  query_city: string | null;
  query_state: string | null;
  query_country: string | null;
  query_start_date: string | null;
  query_end_date: string | null;
  match_reason: string | null;
  match_details: JsonRecord | null;
  event_group_id: string | null;
  raw_payload: JsonRecord;
  notes: string;
};
function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeForDiscovery(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDiscoveryType(value: unknown): CandidateRow["discovery_type"] {
  const normalized = normalizeForDiscovery(value);

  if (normalized === "artist" || normalized === "artista" || normalized === "dj") {
    return "artist";
  }

  if (normalized === "festival") return "festival";
  if (normalized === "venue" || normalized === "local") return "venue";
  if (normalized === "party" || normalized === "festa") return "party";
  if (normalized === "event" || normalized === "evento") return "event";

  return "mixed";
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeUrl(value: unknown): string {
  const raw = normalizeText(value);

  if (!raw) return "";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.startsWith("utm_") ||
        lowerKey === "fbclid" ||
        lowerKey === "igshid" ||
        lowerKey === "ref"
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return "";
  }
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

function mapTicketmasterEvent(params: {
  event: JsonRecord;
  query: string;
  normalizedQuery: string;
  discoveryType: CandidateRow["discovery_type"];
  queryCity: string;
  queryState: string;
  queryCountry: string;
  queryStartDate: string;
  queryEndDate: string;
  eventGroupId: string;
}): CandidateRow | null {
  const event = params.event;

  const providerEventId = normalizeText(event.id) || null;
  const providerUrl = normalizeUrl(event.url) || null;
  const eventName = normalizeText(event.name);

  if (!eventName) return null;

  const embedded = asRecord(event._embedded);
  const attractions = asArray(embedded.attractions).map(asRecord);
  const venues = asArray(embedded.venues).map(asRecord);

  const firstAttraction = attractions[0] || {};
  const firstVenue = venues[0] || {};

  const dates = asRecord(event.dates);
  const start = asRecord(dates.start);

  const eventDate = normalizeText(start.localDate) || null;
  const eventDateTime = normalizeText(start.dateTime) || null;
  const eventTimezone = normalizeText(dates.timezone) || null;

  const venueName = normalizeText(firstVenue.name) || null;

  const cityRecord = asRecord(firstVenue.city);
  const stateRecord = asRecord(firstVenue.state);
  const countryRecord = asRecord(firstVenue.country);
  const locationRecord = asRecord(firstVenue.location);

  const city = normalizeText(cityRecord.name) || null;
  const state =
    normalizeText(stateRecord.stateCode) ||
    normalizeText(stateRecord.name) ||
    null;
  const country =
    normalizeText(countryRecord.countryCode) ||
    normalizeText(countryRecord.name) ||
    null;

  const latitude = toNumber(locationRecord.latitude);
  const longitude = toNumber(locationRecord.longitude);

  const officialUrl = providerUrl;
  const imageUrl = getBestImageUrl(event) || null;

  const confidence = calculateConfidence({
    query: params.query,
    eventName,
    officialUrl: officialUrl || "",
    eventDate: eventDate || "",
    venueName: venueName || "",
    city: city || "",
  });

  return {
    provider: "ticketmaster",
    provider_event_id: providerEventId,
    provider_url: providerUrl,
    query_text: params.query,
    event_name: eventName,
    artist_name: normalizeText(firstAttraction.name) || null,
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
    ticket_url: officialUrl,
    image_url: imageUrl,
    source_name: "Ticketmaster",
    source_type: "ticket",
    candidate_status: "probable",
    confidence,
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
      query: params.query,
      normalized_query: params.normalizedQuery,
      discovery_type: params.discoveryType,
      query_city: params.queryCity || null,
      query_state: params.queryState || null,
      query_country: params.queryCountry || null,
      query_start_date: params.queryStartDate || null,
      query_end_date: params.queryEndDate || null,
      result_city: city,
      result_state: state,
      result_country: country,
      result_venue: venueName,
      result_artist: normalizeText(firstAttraction.name) || null,
      result_event_date: eventDate,
      confidence,
    },
    event_group_id: params.eventGroupId || null,
    raw_payload: event,
    notes: "Imported from Ticketmaster Discovery API. Requires confirmation before becoming official.",
  };
}

function getAdminClient(): AdminClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as AdminClient;
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = normalizeText(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET);

  if (!configuredSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!configuredSecret) return false;

  const { searchParams } = new URL(request.url);
  const headerSecret = normalizeText(request.headers.get("x-official-events-secret"));
  const querySecret = normalizeText(searchParams.get("secret"));

  return headerSecret === configuredSecret || querySecret === configuredSecret;
}

async function saveCandidate(client: AdminClient, row: CandidateRow) {
  if (row.provider_event_id) {
    const { data: existing, error: selectError } = await client
      .from("official_event_candidates")
      .select("candidate_id")
      .eq("provider", row.provider)
      .eq("provider_event_id", row.provider_event_id)
      .maybeSingle();

    if (selectError) {
      return { ok: false, error: selectError.message };
    }

    const existingId = normalizeText(existing?.candidate_id);

    if (existingId) {
      const { error: updateError } = await client
        .from("official_event_candidates")
        .update({
          ...row,
          updated_at: new Date().toISOString(),
        })
        .eq("candidate_id", existingId);

      return {
        ok: !updateError,
        error: updateError?.message || "",
      };
    }
  }

  const { error: insertError } = await client
    .from("official_event_candidates")
    .insert(row);

  return {
    ok: !insertError,
    error: insertError?.message || "",
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Official event resolver is not authorized.",
        },
        { status: 403 }
      );
    }

    const apiKey = process.env.TICKETMASTER_API_KEY;
    const supabase = getAdminClient();

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          message: "Ticketmaster API key is not configured.",
        },
        { status: 500 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supabase service role is not configured.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const query = normalizeText(
      searchParams.get("q") || searchParams.get("keyword")
    );
    const city = normalizeText(searchParams.get("city"));
    const state = normalizeText(searchParams.get("state"));
    const countryCode = normalizeText(searchParams.get("countryCode"));
    const queryStartDate = normalizeText(searchParams.get("startDate"));
    const queryEndDate = normalizeText(searchParams.get("endDate"));
    const discoveryType = getDiscoveryType(
      searchParams.get("discoveryType") || searchParams.get("type")
    );
    const normalizedQuery = normalizeForDiscovery(query);
    const eventGroupId = normalizeText(searchParams.get("eventGroupId"));
    const classificationName = normalizeText(
      searchParams.get("classificationName")
    );
    const size = clamp(Number(searchParams.get("size") || 10) || 10, 1, 20);
    const saveParam = normalizeText(searchParams.get("save")).toLowerCase();
    const shouldSave =
      saveParam !== "false" &&
      saveParam !== "0" &&
      saveParam !== "no";

    if (query.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          message: "Use at least 2 characters to search official events.",
        },
        { status: 400 }
      );
    }

    const ticketmasterUrl = new URL(
      "https://app.ticketmaster.com/discovery/v2/events.json"
    );

    ticketmasterUrl.searchParams.set("apikey", apiKey);
    ticketmasterUrl.searchParams.set("keyword", query);
    ticketmasterUrl.searchParams.set("size", String(size));
    ticketmasterUrl.searchParams.set("sort", "date,asc");

    if (city) ticketmasterUrl.searchParams.set("city", city);
    if (countryCode) {
      ticketmasterUrl.searchParams.set("countryCode", countryCode);
    }
    if (classificationName) {
      ticketmasterUrl.searchParams.set("classificationName", classificationName);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(ticketmasterUrl.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Ticketmaster search failed.",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const json = (await response.json()) as JsonRecord;
    const embedded = asRecord(json._embedded);
    const events = asArray(embedded.events).map(asRecord);

    const candidates = events
      .map((event) =>
        mapTicketmasterEvent({
          event,
          query,
          normalizedQuery,
          discoveryType,
          queryCity: city,
          queryState: state,
          queryCountry: countryCode,
          queryStartDate,
          queryEndDate,
          eventGroupId,
        })
      )
      .filter(Boolean) as CandidateRow[];
    const saveResults = [];
    if (shouldSave) {
      for (const candidate of candidates) {
        saveResults.push(await saveCandidate(supabase, candidate));
      }
    }

    const failedSaves = saveResults.filter((result) => !result.ok);

    return NextResponse.json({
      ok: true,
      provider: "ticketmaster",
      query,
      save: shouldSave,
      count: candidates.length,
      savedCount: shouldSave ? saveResults.length - failedSaves.length : 0,
      failedSaveCount: shouldSave ? failedSaves.length : 0,
      candidates: candidates.map((candidate) => ({
        provider: candidate.provider,
        provider_event_id: candidate.provider_event_id,
        provider_url: candidate.provider_url,
        event_name: candidate.event_name,
        artist_name: candidate.artist_name,
        event_date: candidate.event_date,
        event_datetime: candidate.event_datetime,
        venue_name: candidate.venue_name,
        city: candidate.city,
        state: candidate.state,
        country: candidate.country,
        official_url: candidate.official_url,
        ticket_url: candidate.ticket_url,
        image_url: candidate.image_url,
        candidate_status: candidate.candidate_status,
        confidence: candidate.confidence,
        discovery_type: candidate.discovery_type,
        normalized_query: candidate.normalized_query,
        query_city: candidate.query_city,
        query_state: candidate.query_state,
        query_country: candidate.query_country,
        query_start_date: candidate.query_start_date,
        query_end_date: candidate.query_end_date,
        match_reason: candidate.match_reason,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected official event resolver error.",
      },
      { status: 500 }
    );
  }
}
