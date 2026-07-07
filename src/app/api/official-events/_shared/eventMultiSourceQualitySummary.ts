// src/app/api/official-events/_shared/eventMultiSourceQualitySummary.ts

import type {
  EventSourceQualityPublicationGate,
  EventSourceQualityReviewPriority,
  EventSourceQualitySummary,
  EventSourceQualityTrustTier,
} from "./eventSourceQualitySummary";

export type EventMultiSourceQualityStatus =
  | "empty"
  | "blocked"
  | "ready_for_review"
  | "mixed_review";

export type EventMultiSourceQualitySummaryInput = {
  event_key?: string | null;
  collected_at?: string | null;
  source_quality_summaries: EventSourceQualitySummary[];
};

export type EventMultiSourceQualitySummary = {
  event_key: string | null;
  collected_at: string | null;
  source_count: number;
  unique_source_keys: string[];
  quality_status: EventMultiSourceQualityStatus;
  highest_review_priority: EventSourceQualityReviewPriority;
  automatic_publication_allowed: false;
  automatic_publication_blocked: boolean;
  counts: {
    ready_for_manual_review_source_count: number;
    blocked_source_count: number;
    parse_blocked_source_count: number;
    validation_blocked_source_count: number;
    total_script_count: number;
    total_parsed_payload_count: number;
    total_parse_error_count: number;
    total_event_object_count: number;
    total_raw_candidate_count: number;
    total_normalized_candidate_count: number;
    total_review_ready_candidate_count: number;
    total_candidate_with_error_count: number;
    total_candidate_with_warning_count: number;
    total_validation_error_count: number;
    total_validation_warning_count: number;
    total_automatic_publication_candidate_count: number;
  };
  distributions: {
    by_trust_tier: Partial<Record<EventSourceQualityTrustTier, number>>;
    by_review_priority: Record<EventSourceQualityReviewPriority, number>;
    by_publication_gate: Partial<Record<EventSourceQualityPublicationGate, number>>;
  };
  flags: {
    has_sources: boolean;
    has_ready_for_manual_review_source: boolean;
    has_blocked_source: boolean;
    has_parse_errors: boolean;
    has_validation_errors: boolean;
    has_review_ready_candidates: boolean;
  };
};

export function summarizeEventMultiSourceQuality(
  input: EventMultiSourceQualitySummaryInput
): EventMultiSourceQualitySummary {
  const summaries = input.source_quality_summaries;
  const counts = summarizeEventMultiSourceCounts(summaries);
  const distributions = summarizeEventMultiSourceDistributions(summaries);

  return {
    event_key: input.event_key ?? null,
    collected_at: input.collected_at ?? null,
    source_count: summaries.length,
    unique_source_keys: collectUniqueSourceKeys(summaries),
    quality_status: resolveEventMultiSourceQualityStatus(summaries),
    highest_review_priority: resolveHighestEventSourceReviewPriority(summaries),
    automatic_publication_allowed: false,
    automatic_publication_blocked: true,
    counts,
    distributions,
    flags: {
      has_sources: summaries.length > 0,
      has_ready_for_manual_review_source:
        counts.ready_for_manual_review_source_count > 0,
      has_blocked_source: counts.blocked_source_count > 0,
      has_parse_errors: counts.total_parse_error_count > 0,
      has_validation_errors: counts.total_validation_error_count > 0,
      has_review_ready_candidates:
        counts.total_review_ready_candidate_count > 0,
    },
  };
}

export function resolveEventMultiSourceQualityStatus(
  summaries: EventSourceQualitySummary[]
): EventMultiSourceQualityStatus {
  if (summaries.length === 0) {
    return "empty";
  }

  const readyCount = summaries.filter(
    (summary) => summary.publication_gate === "ready_for_manual_review"
  ).length;

  const blockedCount = summaries.length - readyCount;

  if (readyCount > 0 && blockedCount === 0) {
    return "ready_for_review";
  }

  if (readyCount > 0 && blockedCount > 0) {
    return "mixed_review";
  }

  return "blocked";
}

export function resolveHighestEventSourceReviewPriority(
  summaries: EventSourceQualitySummary[]
): EventSourceQualityReviewPriority {
  const priorityRank: Record<EventSourceQualityReviewPriority, number> = {
    ignore: 0,
    low: 1,
    normal: 2,
    high: 3,
  };

  let highestPriority: EventSourceQualityReviewPriority = "ignore";

  for (const summary of summaries) {
    if (priorityRank[summary.review_priority] > priorityRank[highestPriority]) {
      highestPriority = summary.review_priority;
    }
  }

  return highestPriority;
}

export function summarizeEventMultiSourceCounts(
  summaries: EventSourceQualitySummary[]
): EventMultiSourceQualitySummary["counts"] {
  return summaries.reduce<EventMultiSourceQualitySummary["counts"]>(
    (accumulator, summary) => {
      if (summary.publication_gate === "ready_for_manual_review") {
        accumulator.ready_for_manual_review_source_count += 1;
      } else {
        accumulator.blocked_source_count += 1;
      }

      if (summary.publication_gate === "blocked_parse_errors") {
        accumulator.parse_blocked_source_count += 1;
      }

      if (summary.publication_gate === "blocked_validation_errors") {
        accumulator.validation_blocked_source_count += 1;
      }

      accumulator.total_script_count += summary.counts.script_count;
      accumulator.total_parsed_payload_count +=
        summary.counts.parsed_payload_count;
      accumulator.total_parse_error_count += summary.counts.parse_error_count;
      accumulator.total_event_object_count +=
        summary.counts.total_event_object_count;
      accumulator.total_raw_candidate_count +=
        summary.counts.total_raw_candidate_count;
      accumulator.total_normalized_candidate_count +=
        summary.counts.total_normalized_candidate_count;
      accumulator.total_review_ready_candidate_count +=
        summary.counts.review_ready_candidate_count;
      accumulator.total_candidate_with_error_count +=
        summary.counts.candidate_with_error_count;
      accumulator.total_candidate_with_warning_count +=
        summary.counts.candidate_with_warning_count;
      accumulator.total_validation_error_count +=
        summary.counts.validation_error_count;
      accumulator.total_validation_warning_count +=
        summary.counts.validation_warning_count;
      accumulator.total_automatic_publication_candidate_count +=
        summary.counts.automatic_publication_candidate_count;

      return accumulator;
    },
    {
      ready_for_manual_review_source_count: 0,
      blocked_source_count: 0,
      parse_blocked_source_count: 0,
      validation_blocked_source_count: 0,
      total_script_count: 0,
      total_parsed_payload_count: 0,
      total_parse_error_count: 0,
      total_event_object_count: 0,
      total_raw_candidate_count: 0,
      total_normalized_candidate_count: 0,
      total_review_ready_candidate_count: 0,
      total_candidate_with_error_count: 0,
      total_candidate_with_warning_count: 0,
      total_validation_error_count: 0,
      total_validation_warning_count: 0,
      total_automatic_publication_candidate_count: 0,
    }
  );
}

export function summarizeEventMultiSourceDistributions(
  summaries: EventSourceQualitySummary[]
): EventMultiSourceQualitySummary["distributions"] {
  const byTrustTier: Partial<Record<EventSourceQualityTrustTier, number>> = {};
  const byPublicationGate: Partial<
    Record<EventSourceQualityPublicationGate, number>
  > = {};
  const byReviewPriority: Record<EventSourceQualityReviewPriority, number> = {
    ignore: 0,
    low: 0,
    normal: 0,
    high: 0,
  };

  for (const summary of summaries) {
    byTrustTier[summary.trust_tier] = (byTrustTier[summary.trust_tier] ?? 0) + 1;
    byReviewPriority[summary.review_priority] += 1;
    byPublicationGate[summary.publication_gate] =
      (byPublicationGate[summary.publication_gate] ?? 0) + 1;
  }

  return {
    by_trust_tier: byTrustTier,
    by_review_priority: byReviewPriority,
    by_publication_gate: byPublicationGate,
  };
}

export function collectUniqueSourceKeys(
  summaries: EventSourceQualitySummary[]
): string[] {
  const uniqueKeys = new Set<string>();

  for (const summary of summaries) {
    uniqueKeys.add(summary.source_key);
  }

  return Array.from(uniqueKeys);
}