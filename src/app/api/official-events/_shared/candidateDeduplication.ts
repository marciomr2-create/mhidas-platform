// src/app/api/official-events/_shared/candidateDeduplication.ts

import { type OfficialEventCandidate } from "./resolverTypes";

export type OfficialEventCandidateDeduplicationGroup = {
  deduplicationKey: string;
  primaryCandidate: OfficialEventCandidate;
  candidates: OfficialEventCandidate[];
  providers: string[];
  reasons: string[];
};

export type OfficialEventCandidateDeduplicationResult = {
  originalCount: number;
  uniqueCount: number;
  duplicateCount: number;
  candidates: OfficialEventCandidate[];
  groups: OfficialEventCandidateDeduplicationGroup[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function normalizeUrlKey(value: unknown): string {
  const rawUrl = normalizeText(value);
  if (!rawUrl) return "";

  const withoutProtocol = rawUrl
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "");

  return withoutProtocol.split("?")[0]?.split("#")[0]?.replace("/", "") || "";
}

function getDateKey(candidate: OfficialEventCandidate): string {
  const eventDate = normalizeText(candidate.event_date);
  if (eventDate) return eventDate;

  const eventDateTime = normalizeText(candidate.event_datetime);
  if (eventDateTime.length >= 10) {
    return eventDateTime.slice(0, 10);
  }

  return "";
}

function getNameKey(candidate: OfficialEventCandidate): string {
  return normalizeText(candidate.event_name);
}

function getVenueKey(candidate: OfficialEventCandidate): string {
  return normalizeText(candidate.venue_name);
}

function getLocationKey(candidate: OfficialEventCandidate): string {
  return [
    normalizeText(candidate.city),
    normalizeText(candidate.state),
    normalizeText(candidate.country),
  ]
    .filter(Boolean)
    .join("|");
}

function getUrlKey(candidate: OfficialEventCandidate): string {
  return (
    normalizeUrlKey(candidate.official_url) ||
    normalizeUrlKey(candidate.ticket_url) ||
    normalizeUrlKey(candidate.provider_url)
  );
}

function getProviderEventKey(candidate: OfficialEventCandidate): string {
  const providerEventId = normalizeText(candidate.provider_event_id);
  if (!providerEventId) return "";

  return `${candidate.provider}|${providerEventId}`;
}

export function buildOfficialEventCandidateDeduplicationKey(
  candidate: OfficialEventCandidate
): string {
  const nameKey = getNameKey(candidate);
  const dateKey = getDateKey(candidate);
  const venueKey = getVenueKey(candidate);
  const locationKey = getLocationKey(candidate);
  const urlKey = getUrlKey(candidate);
  const providerEventKey = getProviderEventKey(candidate);

  if (nameKey && dateKey && (venueKey || locationKey)) {
    return `event|${nameKey}|${dateKey}|${venueKey}|${locationKey}`;
  }

  if (urlKey) {
    return `url|${urlKey}`;
  }

  if (providerEventKey) {
    return `provider_event|${providerEventKey}`;
  }

  return `fallback|${candidate.provider}|${nameKey || "untitled"}|${dateKey || "no_date"}`;
}

function buildDeduplicationReasons(candidate: OfficialEventCandidate): string[] {
  const reasons: string[] = [];

  if (getNameKey(candidate)) reasons.push("has_event_name");
  if (getDateKey(candidate)) reasons.push("has_event_date");
  if (getVenueKey(candidate)) reasons.push("has_venue");
  if (getLocationKey(candidate)) reasons.push("has_location");
  if (getUrlKey(candidate)) reasons.push("has_url");
  if (getProviderEventKey(candidate)) reasons.push("has_provider_event_id");

  return reasons;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function groupOfficialEventCandidatesByDeduplicationKey(
  candidates: OfficialEventCandidate[]
): OfficialEventCandidateDeduplicationGroup[] {
  const groupsByKey = new Map<string, OfficialEventCandidateDeduplicationGroup>();

  for (const candidate of candidates) {
    const deduplicationKey = buildOfficialEventCandidateDeduplicationKey(candidate);
    const existingGroup = groupsByKey.get(deduplicationKey);

    if (!existingGroup) {
      groupsByKey.set(deduplicationKey, {
        deduplicationKey,
        primaryCandidate: candidate,
        candidates: [candidate],
        providers: [candidate.provider],
        reasons: buildDeduplicationReasons(candidate),
      });

      continue;
    }

    existingGroup.candidates.push(candidate);
    existingGroup.providers = uniqueStrings([
      ...existingGroup.providers,
      candidate.provider,
    ]);
    existingGroup.reasons = uniqueStrings([
      ...existingGroup.reasons,
      ...buildDeduplicationReasons(candidate),
    ]);
  }

  return Array.from(groupsByKey.values());
}

export function deduplicateOfficialEventCandidates(
  candidates: OfficialEventCandidate[]
): OfficialEventCandidateDeduplicationResult {
  const groups = groupOfficialEventCandidatesByDeduplicationKey(candidates);
  const uniqueCandidates = groups.map((group) => group.primaryCandidate);

  return {
    originalCount: candidates.length,
    uniqueCount: uniqueCandidates.length,
    duplicateCount: Math.max(0, candidates.length - uniqueCandidates.length),
    candidates: uniqueCandidates,
    groups,
  };
}

export function findDuplicateOfficialEventCandidateGroups(
  candidates: OfficialEventCandidate[]
): OfficialEventCandidateDeduplicationGroup[] {
  return groupOfficialEventCandidatesByDeduplicationKey(candidates).filter(
    (group) => group.candidates.length > 1
  );
}
