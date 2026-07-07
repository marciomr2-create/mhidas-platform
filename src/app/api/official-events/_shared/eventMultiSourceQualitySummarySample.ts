// src/app/api/official-events/_shared/eventMultiSourceQualitySummarySample.ts

import type { EventSourceQualitySummary } from "./eventSourceQualitySummary";

import { EVENT_SOURCE_QUALITY_SUMMARY_SAMPLE_RESULT } from "./eventSourceQualitySummarySample";
import {
  summarizeEventMultiSourceQuality,
  type EventMultiSourceQualitySummary,
} from "./eventMultiSourceQualitySummary";

export type EventMultiSourceQualitySummarySampleExpectation = {
  expected_source_count: 2;
  expected_unique_source_count: 2;
  expected_quality_status: "ready_for_review";
  expected_highest_review_priority: "high";
  expected_ready_for_manual_review_source_count: 2;
  expected_blocked_source_count: 0;
  expected_total_review_ready_candidate_count: 2;
  expected_total_automatic_publication_candidate_count: 0;
  expected_automatic_publication_allowed: false;
  expected_automatic_publication_blocked: true;
  expected_has_ready_for_manual_review_source: true;
  expected_has_blocked_source: false;
  expected_discovery_source_count: 1;
  expected_verified_source_count: 1;
  expected_normal_priority_count: 1;
  expected_high_priority_count: 1;
  expected_ready_gate_count: 2;
};

export type EventMultiSourceQualitySummarySampleResult = {
  sample_name: "event-multi-source-quality-summary-sample";
  source_sample: "event-source-quality-summary-sample";
  expectations: EventMultiSourceQualitySummarySampleExpectation;
  source_quality_summaries: EventSourceQualitySummary[];
  multi_source_quality_summary: EventMultiSourceQualitySummary;
  passed_expectations: boolean;
  failed_expectation_codes: string[];
};

export const EVENT_MULTI_SOURCE_QUALITY_SUMMARY_SAMPLE_EXPECTATION: EventMultiSourceQualitySummarySampleExpectation =
  {
    expected_source_count: 2,
    expected_unique_source_count: 2,
    expected_quality_status: "ready_for_review",
    expected_highest_review_priority: "high",
    expected_ready_for_manual_review_source_count: 2,
    expected_blocked_source_count: 0,
    expected_total_review_ready_candidate_count: 2,
    expected_total_automatic_publication_candidate_count: 0,
    expected_automatic_publication_allowed: false,
    expected_automatic_publication_blocked: true,
    expected_has_ready_for_manual_review_source: true,
    expected_has_blocked_source: false,
    expected_discovery_source_count: 1,
    expected_verified_source_count: 1,
    expected_normal_priority_count: 1,
    expected_high_priority_count: 1,
    expected_ready_gate_count: 2,
  };

export function runEventMultiSourceQualitySummarySample(): EventMultiSourceQualitySummarySampleResult {
  const sourceQualitySummaries =
    createEventMultiSourceQualitySummarySampleSources();

  const multiSourceQualitySummary = summarizeEventMultiSourceQuality({
    event_key: "sample-multi-source-electronic-night",
    collected_at: "2026-07-06T00:00:00.000Z",
    source_quality_summaries: sourceQualitySummaries,
  });

  const failedExpectationCodes =
    collectEventMultiSourceQualitySummarySampleFailures(
      multiSourceQualitySummary,
      EVENT_MULTI_SOURCE_QUALITY_SUMMARY_SAMPLE_EXPECTATION
    );

  return {
    sample_name: "event-multi-source-quality-summary-sample",
    source_sample: "event-source-quality-summary-sample",
    expectations: EVENT_MULTI_SOURCE_QUALITY_SUMMARY_SAMPLE_EXPECTATION,
    source_quality_summaries: sourceQualitySummaries,
    multi_source_quality_summary: multiSourceQualitySummary,
    passed_expectations: failedExpectationCodes.length === 0,
    failed_expectation_codes: failedExpectationCodes,
  };
}

export function createEventMultiSourceQualitySummarySampleSources(): EventSourceQualitySummary[] {
  const discoveryEditorialSource =
    EVENT_SOURCE_QUALITY_SUMMARY_SAMPLE_RESULT.source_quality_summary;

  const verifiedVenueSource: EventSourceQualitySummary = {
    ...discoveryEditorialSource,
    source_id: null,
    source_key: "sample-verified-venue-jsonld-source",
    source_display_name: "Sample Verified Venue JSON-LD Source",
    source_role: "venue",
    trust_tier: "verified",
    review_priority: "high",
  };

  return [discoveryEditorialSource, verifiedVenueSource];
}

export function collectEventMultiSourceQualitySummarySampleFailures(
  summary: EventMultiSourceQualitySummary,
  expectation: EventMultiSourceQualitySummarySampleExpectation
): string[] {
  const failedExpectationCodes: string[] = [];

  if (summary.source_count !== expectation.expected_source_count) {
    failedExpectationCodes.push("source_count_mismatch");
  }

  if (
    summary.unique_source_keys.length !== expectation.expected_unique_source_count
  ) {
    failedExpectationCodes.push("unique_source_count_mismatch");
  }

  if (summary.quality_status !== expectation.expected_quality_status) {
    failedExpectationCodes.push("quality_status_mismatch");
  }

  if (
    summary.highest_review_priority !==
    expectation.expected_highest_review_priority
  ) {
    failedExpectationCodes.push("highest_review_priority_mismatch");
  }

  if (
    summary.counts.ready_for_manual_review_source_count !==
    expectation.expected_ready_for_manual_review_source_count
  ) {
    failedExpectationCodes.push("ready_for_manual_review_source_count_mismatch");
  }

  if (
    summary.counts.blocked_source_count !==
    expectation.expected_blocked_source_count
  ) {
    failedExpectationCodes.push("blocked_source_count_mismatch");
  }

  if (
    summary.counts.total_review_ready_candidate_count !==
    expectation.expected_total_review_ready_candidate_count
  ) {
    failedExpectationCodes.push("total_review_ready_candidate_count_mismatch");
  }

  if (
    summary.counts.total_automatic_publication_candidate_count !==
    expectation.expected_total_automatic_publication_candidate_count
  ) {
    failedExpectationCodes.push(
      "total_automatic_publication_candidate_count_mismatch"
    );
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
    summary.flags.has_ready_for_manual_review_source !==
    expectation.expected_has_ready_for_manual_review_source
  ) {
    failedExpectationCodes.push("has_ready_for_manual_review_source_mismatch");
  }

  if (
    summary.flags.has_blocked_source !== expectation.expected_has_blocked_source
  ) {
    failedExpectationCodes.push("has_blocked_source_mismatch");
  }

  if (
    (summary.distributions.by_trust_tier.discovery ?? 0) !==
    expectation.expected_discovery_source_count
  ) {
    failedExpectationCodes.push("discovery_source_count_mismatch");
  }

  if (
    (summary.distributions.by_trust_tier.verified ?? 0) !==
    expectation.expected_verified_source_count
  ) {
    failedExpectationCodes.push("verified_source_count_mismatch");
  }

  if (
    summary.distributions.by_review_priority.normal !==
    expectation.expected_normal_priority_count
  ) {
    failedExpectationCodes.push("normal_priority_count_mismatch");
  }

  if (
    summary.distributions.by_review_priority.high !==
    expectation.expected_high_priority_count
  ) {
    failedExpectationCodes.push("high_priority_count_mismatch");
  }

  if (
    (summary.distributions.by_publication_gate.ready_for_manual_review ?? 0) !==
    expectation.expected_ready_gate_count
  ) {
    failedExpectationCodes.push("ready_gate_count_mismatch");
  }

  return failedExpectationCodes;
}

export const EVENT_MULTI_SOURCE_QUALITY_SUMMARY_SAMPLE_RESULT =
  runEventMultiSourceQualitySummarySample();