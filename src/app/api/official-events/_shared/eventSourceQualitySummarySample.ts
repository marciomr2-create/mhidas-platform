// src/app/api/official-events/_shared/eventSourceQualitySummarySample.ts

import { EVENT_INGESTION_QUALITY_SUMMARY_SAMPLE_RESULT } from "./eventIngestionQualitySummarySample";
import {
  summarizeEventSourceQuality,
  type EventSourceQualitySummary,
} from "./eventSourceQualitySummary";

export type EventSourceQualitySummarySampleExpectation = {
  expected_source_role: "editorial_source";
  expected_trust_tier: "discovery";
  expected_ingestion_quality_status: "ready_for_review";
  expected_review_priority: "normal";
  expected_publication_gate: "ready_for_manual_review";
  expected_automatic_publication_allowed: false;
  expected_automatic_publication_blocked: true;
  expected_review_ready_candidate_count: 1;
  expected_automatic_publication_candidate_count: 0;
  expected_is_ready_for_manual_review: true;
};

export type EventSourceQualitySummarySampleResult = {
  sample_name: "event-source-quality-summary-sample";
  source_sample: "event-ingestion-quality-summary-sample";
  expectations: EventSourceQualitySummarySampleExpectation;
  source_quality_summary: EventSourceQualitySummary;
  passed_expectations: boolean;
  failed_expectation_codes: string[];
};

export const EVENT_SOURCE_QUALITY_SUMMARY_SAMPLE_EXPECTATION: EventSourceQualitySummarySampleExpectation =
  {
    expected_source_role: "editorial_source",
    expected_trust_tier: "discovery",
    expected_ingestion_quality_status: "ready_for_review",
    expected_review_priority: "normal",
    expected_publication_gate: "ready_for_manual_review",
    expected_automatic_publication_allowed: false,
    expected_automatic_publication_blocked: true,
    expected_review_ready_candidate_count: 1,
    expected_automatic_publication_candidate_count: 0,
    expected_is_ready_for_manual_review: true,
  };

export function runEventSourceQualitySummarySample(): EventSourceQualitySummarySampleResult {
  const sourceQualitySummary = summarizeEventSourceQuality({
    source_id: null,
    source_key: "sample-quality-summary-jsonld-source",
    source_display_name: "Sample Quality Summary JSON-LD Source",
    source_role: "editorial_source",
    trust_tier: "discovery",
    source_url: "https://example.com/events/sample-html-graph-electronic-night",
    collected_at: "2026-07-06T00:00:00.000Z",
    ingestion_quality:
      EVENT_INGESTION_QUALITY_SUMMARY_SAMPLE_RESULT.quality_summary,
  });

  const failedExpectationCodes = collectEventSourceQualitySummarySampleFailures(
    sourceQualitySummary,
    EVENT_SOURCE_QUALITY_SUMMARY_SAMPLE_EXPECTATION
  );

  return {
    sample_name: "event-source-quality-summary-sample",
    source_sample: "event-ingestion-quality-summary-sample",
    expectations: EVENT_SOURCE_QUALITY_SUMMARY_SAMPLE_EXPECTATION,
    source_quality_summary: sourceQualitySummary,
    passed_expectations: failedExpectationCodes.length === 0,
    failed_expectation_codes: failedExpectationCodes,
  };
}

export function collectEventSourceQualitySummarySampleFailures(
  summary: EventSourceQualitySummary,
  expectation: EventSourceQualitySummarySampleExpectation
): string[] {
  const failedExpectationCodes: string[] = [];

  if (summary.source_role !== expectation.expected_source_role) {
    failedExpectationCodes.push("source_role_mismatch");
  }

  if (summary.trust_tier !== expectation.expected_trust_tier) {
    failedExpectationCodes.push("trust_tier_mismatch");
  }

  if (
    summary.ingestion_quality_status !==
    expectation.expected_ingestion_quality_status
  ) {
    failedExpectationCodes.push("ingestion_quality_status_mismatch");
  }

  if (summary.review_priority !== expectation.expected_review_priority) {
    failedExpectationCodes.push("review_priority_mismatch");
  }

  if (summary.publication_gate !== expectation.expected_publication_gate) {
    failedExpectationCodes.push("publication_gate_mismatch");
  }

  if (
    summary.automatic_publication_allowed !==
    expectation.expected_automatic_publication_allowed
  ) {
    failedExpectationCodes.push("automatic_publication_allowed_mismatch");
  }

  if (
    summary.automatic_publication_blocked !==
    expectation.expected_automatic_publication_blocked
  ) {
    failedExpectationCodes.push("automatic_publication_blocked_mismatch");
  }

  if (
    summary.counts.review_ready_candidate_count !==
    expectation.expected_review_ready_candidate_count
  ) {
    failedExpectationCodes.push("review_ready_candidate_count_mismatch");
  }

  if (
    summary.counts.automatic_publication_candidate_count !==
    expectation.expected_automatic_publication_candidate_count
  ) {
    failedExpectationCodes.push(
      "automatic_publication_candidate_count_mismatch"
    );
  }

  if (
    summary.flags.is_ready_for_manual_review !==
    expectation.expected_is_ready_for_manual_review
  ) {
    failedExpectationCodes.push("is_ready_for_manual_review_mismatch");
  }

  return failedExpectationCodes;
}

export const EVENT_SOURCE_QUALITY_SUMMARY_SAMPLE_RESULT =
  runEventSourceQualitySummarySample();