// src/app/api/official-events/_shared/eventIngestionQualitySummary.ts

import type { EventIngestionNormalizedCandidate } from "./eventIngestionContract";
import type { EventJsonLdHtmlNormalizationResult } from "./eventJsonLdHtmlExtractor";

export type EventIngestionQualityStatus =
  | "empty"
  | "blocked_by_parse_errors"
  | "blocked_by_validation_errors"
  | "ready_for_review";

export type EventIngestionQualitySummary = {
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
  automatic_publication_blocked: boolean;
  has_parse_errors: boolean;
  has_validation_errors: boolean;
  has_review_ready_candidates: boolean;
  quality_status: EventIngestionQualityStatus;
};

export function summarizeEventIngestionQuality(
  result: EventJsonLdHtmlNormalizationResult
): EventIngestionQualitySummary {
  const normalizedCandidates = collectNormalizedCandidates(result);

  const validationErrorCount = countValidationIssuesBySeverity(
    normalizedCandidates,
    "error"
  );

  const validationWarningCount = countValidationIssuesBySeverity(
    normalizedCandidates,
    "warning"
  );

  const candidateWithErrorCount = normalizedCandidates.filter((candidate) =>
    candidate.validation_issues.some((issue) => issue.severity === "error")
  ).length;

  const candidateWithWarningCount = normalizedCandidates.filter((candidate) =>
    candidate.validation_issues.some((issue) => issue.severity === "warning")
  ).length;

  const reviewReadyCandidateCount = normalizedCandidates.filter(
    (candidate) =>
      !candidate.validation_issues.some((issue) => issue.severity === "error")
  ).length;

  const automaticPublicationCandidateCount = 0;

  const parseErrorCount = result.extraction.parse_errors.length;
  const hasParseErrors = parseErrorCount > 0;
  const hasValidationErrors = validationErrorCount > 0;
  const hasReviewReadyCandidates = reviewReadyCandidateCount > 0;

  return {
    script_count: result.extraction.script_count,
    parsed_payload_count: result.extraction.parsed_payload_count,
    parse_error_count: parseErrorCount,
    normalization_count: result.normalizations.length,
    total_event_object_count: result.total_event_object_count,
    total_raw_candidate_count: result.total_raw_candidate_count,
    total_normalized_candidate_count: result.total_normalized_candidate_count,
    review_ready_candidate_count: reviewReadyCandidateCount,
    candidate_with_error_count: candidateWithErrorCount,
    candidate_with_warning_count: candidateWithWarningCount,
    validation_error_count: validationErrorCount,
    validation_warning_count: validationWarningCount,
    automatic_publication_candidate_count: automaticPublicationCandidateCount,
    automatic_publication_blocked: automaticPublicationCandidateCount === 0,
    has_parse_errors: hasParseErrors,
    has_validation_errors: hasValidationErrors,
    has_review_ready_candidates: hasReviewReadyCandidates,
    quality_status: resolveEventIngestionQualityStatus({
      parse_error_count: parseErrorCount,
      total_normalized_candidate_count: result.total_normalized_candidate_count,
      has_validation_errors: hasValidationErrors,
      has_review_ready_candidates: hasReviewReadyCandidates,
    }),
  };
}

export function collectNormalizedCandidates(
  result: EventJsonLdHtmlNormalizationResult
): EventIngestionNormalizedCandidate[] {
  return result.normalizations.reduce<EventIngestionNormalizedCandidate[]>(
    (candidates, normalization) => {
      return candidates.concat(normalization.normalized_candidates);
    },
    []
  );
}

export function resolveEventIngestionQualityStatus(input: {
  parse_error_count: number;
  total_normalized_candidate_count: number;
  has_validation_errors: boolean;
  has_review_ready_candidates: boolean;
}): EventIngestionQualityStatus {
  if (input.total_normalized_candidate_count === 0) {
    return input.parse_error_count > 0 ? "blocked_by_parse_errors" : "empty";
  }

  if (!input.has_review_ready_candidates && input.has_validation_errors) {
    return "blocked_by_validation_errors";
  }

  if (input.has_review_ready_candidates) {
    return "ready_for_review";
  }

  return "empty";
}

function countValidationIssuesBySeverity(
  candidates: EventIngestionNormalizedCandidate[],
  severity: "error" | "warning"
): number {
  return candidates.reduce((count, candidate) => {
    return (
      count +
      candidate.validation_issues.filter((issue) => issue.severity === severity)
        .length
    );
  }, 0);
}