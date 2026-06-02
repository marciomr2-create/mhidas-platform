// src/app/api/official-events/_shared/candidateRanking.ts

import { type OfficialEventCandidate } from "./resolverTypes";
import { getOfficialEventProviderConfig } from "./providerRegistry";

export type RankedOfficialEventCandidate = {
  candidate: OfficialEventCandidate;
  rankingScore: number;
  rankingReasons: string[];
};

export type OfficialEventCandidateRankingSummary = {
  totalCandidates: number;
  rankedCandidates: number;
  topProvider: string | null;
  topScore: number | null;
};

function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function getCandidateStatusScore(candidate: OfficialEventCandidate): number {
  if (candidate.candidate_status === "confirmed") return 30;
  if (candidate.candidate_status === "probable") return 18;
  if (candidate.candidate_status === "review") return 12;
  if (candidate.candidate_status === "expired") return -20;
  if (candidate.candidate_status === "rejected") return -50;

  return 0;
}

function getProviderPriorityScore(candidate: OfficialEventCandidate): number {
  const config = getOfficialEventProviderConfig(candidate.provider);
  const priority = config?.priority ?? 100;

  return clampScore(30 - priority / 4, 0, 30);
}

function getLinkQualityScore(candidate: OfficialEventCandidate): number {
  let score = 0;

  if (candidate.official_url) score += 14;
  if (candidate.ticket_url) score += 8;
  if (candidate.provider_url) score += 5;
  if (candidate.image_url) score += 3;

  return clampScore(score, 0, 30);
}

function getEventDataScore(candidate: OfficialEventCandidate): number {
  let score = 0;

  if (candidate.event_date) score += 8;
  if (candidate.event_datetime) score += 5;
  if (candidate.venue_name) score += 5;
  if (candidate.city) score += 4;
  if (candidate.state) score += 3;
  if (candidate.country) score += 3;
  if (candidate.latitude !== null && candidate.longitude !== null) score += 2;

  return clampScore(score, 0, 30);
}

function getConfidenceScore(candidate: OfficialEventCandidate): number {
  return clampScore(candidate.confidence, 0, 100);
}

function buildRankingReasons(candidate: OfficialEventCandidate): string[] {
  const reasons: string[] = [];

  reasons.push(`confidence:${candidate.confidence}`);
  reasons.push(`status:${candidate.candidate_status}`);
  reasons.push(`provider:${candidate.provider}`);

  if (candidate.official_url) reasons.push("has_official_url");
  if (candidate.ticket_url) reasons.push("has_ticket_url");
  if (candidate.event_date) reasons.push("has_event_date");
  if (candidate.venue_name) reasons.push("has_venue");
  if (candidate.city) reasons.push("has_city");
  if (candidate.image_url) reasons.push("has_image");

  return reasons;
}

export function rankOfficialEventCandidate(
  candidate: OfficialEventCandidate
): RankedOfficialEventCandidate {
  const confidenceScore = getConfidenceScore(candidate) * 0.45;
  const statusScore = getCandidateStatusScore(candidate);
  const providerScore = getProviderPriorityScore(candidate);
  const linkScore = getLinkQualityScore(candidate);
  const dataScore = getEventDataScore(candidate);

  const rankingScore = clampScore(
    confidenceScore + statusScore + providerScore + linkScore + dataScore,
    0,
    100
  );

  return {
    candidate,
    rankingScore: Math.round(rankingScore),
    rankingReasons: buildRankingReasons(candidate),
  };
}

export function rankOfficialEventCandidates(
  candidates: OfficialEventCandidate[]
): RankedOfficialEventCandidate[] {
  return candidates
    .map(rankOfficialEventCandidate)
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }

      return b.candidate.confidence - a.candidate.confidence;
    });
}

export function sortOfficialEventCandidates(
  candidates: OfficialEventCandidate[]
): OfficialEventCandidate[] {
  return rankOfficialEventCandidates(candidates).map((item) => item.candidate);
}

export function summarizeOfficialEventCandidateRanking(
  rankedCandidates: RankedOfficialEventCandidate[]
): OfficialEventCandidateRankingSummary {
  const top = rankedCandidates[0];

  return {
    totalCandidates: rankedCandidates.length,
    rankedCandidates: rankedCandidates.length,
    topProvider: top?.candidate.provider ?? null,
    topScore: top?.rankingScore ?? null,
  };
}
