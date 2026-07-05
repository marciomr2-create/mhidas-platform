// src/app/api/official-events/_shared/candidatePersistence.ts

import {
  type JsonRecord,
  type OfficialEventCandidate,
} from "./resolverTypes";

export type OfficialEventCandidatePersistenceRow = {
  source_id: string | null;
  provider: OfficialEventCandidate["provider"];
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
  source_name: string | null;
  source_type: OfficialEventCandidate["source_type"];
  candidate_status: OfficialEventCandidate["candidate_status"];
  confidence: number;
  discovery_type: OfficialEventCandidate["discovery_type"];
  normalized_query: string | null;
  query_city: string | null;
  query_state: string | null;
  query_country: string | null;
  query_start_date: string | null;
  query_end_date: string | null;
  match_reason: string | null;
  match_details: JsonRecord | null;
  event_group_id: string | null;
  raw_payload: JsonRecord | null;
  notes: string | null;
};

export type OfficialEventCandidatePersistencePreparationSummary = {
  receivedCount: number;
  preparedCount: number;
  skippedCount: number;
  probableCount: number;
  reviewCount: number;
  confirmedCount: number;
};

export type OfficialEventCandidatePersistencePreparationResult = {
  rows: OfficialEventCandidatePersistenceRow[];
  skippedCandidates: OfficialEventCandidate[];
  summary: OfficialEventCandidatePersistencePreparationSummary;
};

function normalizeNullableString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeJsonRecord(value: unknown): JsonRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return null;
}

function normalizeConfidence(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

export function shouldPrepareOfficialEventCandidateForPersistence(
  candidate: OfficialEventCandidate
): boolean {
  if (!candidate.provider) return false;
  if (!candidate.event_name) return false;
  if (candidate.candidate_status === "rejected") return false;
  if (candidate.candidate_status === "expired") return false;

  return true;
}

export function prepareOfficialEventCandidateForPersistence(
  candidate: OfficialEventCandidate
): OfficialEventCandidatePersistenceRow {
  return {
    source_id: normalizeNullableString(candidate.source_id),
    provider: candidate.provider,
    provider_event_id: normalizeNullableString(candidate.provider_event_id),
    provider_url: normalizeNullableString(candidate.provider_url),
    query_text: normalizeNullableString(candidate.query_text),
    event_name: String(candidate.event_name || "Untitled official event").trim(),
    artist_name: normalizeNullableString(candidate.artist_name),
    event_date: normalizeNullableString(candidate.event_date),
    event_datetime: normalizeNullableString(candidate.event_datetime),
    event_timezone: normalizeNullableString(candidate.event_timezone),
    venue_name: normalizeNullableString(candidate.venue_name),
    city: normalizeNullableString(candidate.city),
    state: normalizeNullableString(candidate.state),
    country: normalizeNullableString(candidate.country),
    latitude: normalizeNullableNumber(candidate.latitude),
    longitude: normalizeNullableNumber(candidate.longitude),
    official_url: normalizeNullableString(candidate.official_url),
    ticket_url: normalizeNullableString(candidate.ticket_url),
    image_url: normalizeNullableString(candidate.image_url),
    source_name: normalizeNullableString(candidate.source_name),
    source_type: candidate.source_type,
    candidate_status: candidate.candidate_status,
    confidence: normalizeConfidence(candidate.confidence),
    discovery_type: candidate.discovery_type,
    normalized_query: normalizeNullableString(candidate.normalized_query),
    query_city: normalizeNullableString(candidate.query_city),
    query_state: normalizeNullableString(candidate.query_state),
    query_country: normalizeNullableString(candidate.query_country),
    query_start_date: normalizeNullableString(candidate.query_start_date),
    query_end_date: normalizeNullableString(candidate.query_end_date),
    match_reason: normalizeNullableString(candidate.match_reason),
    match_details: normalizeJsonRecord(candidate.match_details),
    event_group_id: normalizeNullableString(candidate.event_group_id),
    raw_payload: normalizeJsonRecord(candidate.raw_payload),
    notes: normalizeNullableString(candidate.notes),
  };
}

export function prepareOfficialEventCandidatesForPersistence(
  candidates: OfficialEventCandidate[]
): OfficialEventCandidatePersistencePreparationResult {
  const rows: OfficialEventCandidatePersistenceRow[] = [];
  const skippedCandidates: OfficialEventCandidate[] = [];

  for (const candidate of candidates) {
    if (!shouldPrepareOfficialEventCandidateForPersistence(candidate)) {
      skippedCandidates.push(candidate);
      continue;
    }

    rows.push(prepareOfficialEventCandidateForPersistence(candidate));
  }

  return {
    rows,
    skippedCandidates,
    summary: {
      receivedCount: candidates.length,
      preparedCount: rows.length,
      skippedCount: skippedCandidates.length,
      probableCount: rows.filter((row) => row.candidate_status === "probable").length,
      reviewCount: rows.filter((row) => row.candidate_status === "review").length,
      confirmedCount: rows.filter((row) => row.candidate_status === "confirmed").length,
    },
  };
}

export function buildOfficialEventCandidatePersistenceKey(
  row: OfficialEventCandidatePersistenceRow
): string {
  if (row.provider_event_id) {
    return `${row.provider}|provider_event_id|${row.provider_event_id}`;
  }

  if (row.official_url) {
    return `${row.provider}|official_url|${row.official_url}`;
  }

  if (row.ticket_url) {
    return `${row.provider}|ticket_url|${row.ticket_url}`;
  }

  return [
    row.provider,
    row.event_name,
    row.event_date || "no_date",
    row.city || "no_city",
    row.state || "no_state",
    row.country || "no_country",
  ].join("|");
}
