// src/app/api/official-events/_shared/eventSourceQualitySummary.ts

import type {
  EventIngestionQualityStatus,
  EventIngestionQualitySummary,
} from "./eventIngestionQualitySummary";

export type EventSourceQualityRole =
  | "ticketing_platform"
  | "venue"
  | "producer"
  | "festival"
  | "artist"
  | "editorial_source"
  | "community"
  | "other";

export type EventSourceQualityTrustTier =
  | "official"
  | "verified"
  | "discovery"
  | "community"
  | "unknown";

export type EventSourceQualityReviewPriority =
  | "ignore"
  | "low"
  | "normal"
  | "high";

export type EventSourceQualityPublicationGate =
  | "blocked_automatic_publication"
  | "blocked_parse_errors"
  | "blocked_validation_errors"
  | "ready_for_manual_review";

export type EventSourceQualitySummaryInput = {
  source_id?: string | null;
  source_key: string;
  source_display_name: string;
  source_role: EventSourceQualityRole;
  trust_tier: EventSourceQualityTrustTier;
  source_url?: string | null;
  collected_at?: string | null;
  ingestion_quality: EventIngestionQualitySummary;
};

export type EventSourceQualitySummary = {
  source_id: string | null;
  source_key: string;
  source_display_name: string;
  source_role: EventSourceQualityRole;
  trust_tier: EventSourceQualityTrustTier;
  source_url: string | null;
  collected_at: string | null;
  ingestion_quality_status: EventIngestionQualityStatus;
  review_priority: EventSourceQualityReviewPriority;
  publication_gate: EventSourceQualityPublicationGate;
  automatic_publication_allowed: false;
  automatic_publication_blocked: boolean;
  counts: {
    script_count: number;
    parsed_payload_count: number;
    parse_error_count: number;
    normalization_count: number;
    total_event_object_count: number;
    total_raw_candidate_count: number;
    total_normalized_candidate_count: number;
    review_ready_candidate_count: number;
    candidate_with_error_count: number;
    candidate_with_warning_count: number;
    validation_error_count: number;
    validation_warning_count: number;
    automatic_publication_candidate_count: number;
  };
  flags: {
    has_parse_errors: boolean;
    has_validation_errors: boolean;
    has_review_ready_candidates: boolean;
    is_ready_for_manual_review: boolean;
  };
};

export function summarizeEventSourceQuality(
  input: EventSourceQualitySummaryInput
): EventSourceQualitySummary {
  const quality = input.ingestion_quality;

  return {
    source_id: input.source_id ?? null,
    source_key: input.source_key,
    source_display_name: input.source_display_name,
    source_role: input.source_role,
    trust_tier: input.trust_tier,
    source_url: input.source_url ?? null,
    collected_at: input.collected_at ?? null,
    ingestion_quality_status: quality.quality_status,
    review_priority: resolveEventSourceReviewPriority(input),
    publication_gate: resolveEventSourcePublicationGate(quality),
    automatic_publication_allowed: false,
    automatic_publication_blocked: true,
    counts: {
      script_count: quality.script_count,
      parsed_payload_count: quality.parsed_payload_count,
      parse_error_count: quality.parse_error_count,
      normalization_count: quality.normalization_count,
      total_event_object_count: quality.total_event_object_count,
      total_raw_candidate_count: quality.total_raw_candidate_count,
      total_normalized_candidate_count: quality.total_normalized_candidate_count,
      review_ready_candidate_count: quality.review_ready_candidate_count,
      candidate_with_error_count: quality.candidate_with_error_count,
      candidate_with_warning_count: quality.candidate_with_warning_count,
      validation_error_count: quality.validation_error_count,
      validation_warning_count: quality.validation_warning_count,
      automatic_publication_candidate_count:
        quality.automatic_publication_candidate_count,
    },
    flags: {
      has_parse_errors: quality.has_parse_errors,
      has_validation_errors: quality.has_validation_errors,
      has_review_ready_candidates: quality.has_review_ready_candidates,
      is_ready_for_manual_review: quality.quality_status === "ready_for_review",
    },
  };
}

export function resolveEventSourcePublicationGate(
  quality: EventIngestionQualitySummary
): EventSourceQualityPublicationGate {
  if (
    quality.quality_status === "blocked_by_parse_errors" ||
    (quality.has_parse_errors && quality.total_normalized_candidate_count === 0)
  ) {
    return "blocked_parse_errors";
  }

  if (quality.quality_status === "blocked_by_validation_errors") {
    return "blocked_validation_errors";
  }

  if (quality.quality_status === "ready_for_review") {
    return "ready_for_manual_review";
  }

  return "blocked_automatic_publication";
}

export function resolveEventSourceReviewPriority(
  input: EventSourceQualitySummaryInput
): EventSourceQualityReviewPriority {
  const quality = input.ingestion_quality;

  if (quality.quality_status === "empty") {
    return "ignore";
  }

  if (
    quality.quality_status === "blocked_by_parse_errors" ||
    quality.quality_status === "blocked_by_validation_errors"
  ) {
    return "low";
  }

  if (quality.quality_status !== "ready_for_review") {
    return "low";
  }

  if (input.trust_tier === "official" || input.trust_tier === "verified") {
    return "high";
  }

  if (input.trust_tier === "discovery") {
    return "normal";
  }

  return "low";
}