// src/app/api/official-events/_shared/eventIngestionQualitySummarySample.ts

import { normalizeJsonLdHtmlPayloads } from "./eventJsonLdHtmlExtractor";
import { EVENT_JSON_LD_HTML_GRAPH_SAMPLE_HTML } from "./eventJsonLdHtmlGraphSample";
import {
  summarizeEventIngestionQuality,
  type EventIngestionQualitySummary,
} from "./eventIngestionQualitySummary";

export type EventIngestionQualitySummarySampleExpectation = {
  expected_script_count: number;
  expected_parsed_payload_count: number;
  expected_parse_error_count: number;
  expected_total_event_object_count: number;
  expected_total_raw_candidate_count: number;
  expected_total_normalized_candidate_count: number;
  expected_review_ready_candidate_count: number;
  expected_automatic_publication_candidate_count: number;
  expected_automatic_publication_blocked: boolean;
  expected_quality_status: EventIngestionQualitySummary["quality_status"];
};

export type EventIngestionQualitySummarySampleResult = {
  sample_name: "event-ingestion-quality-summary-sample";
  source_sample: "event-jsonld-html-graph-sample";
  expectations: EventIngestionQualitySummarySampleExpectation;
  quality_summary: EventIngestionQualitySummary;
  passed_expectations: boolean;
  failed_expectation_codes: string[];
};

export function runEventIngestionQualitySummarySample(): EventIngestionQualitySummarySampleResult {
  const normalizationResult = normalizeJsonLdHtmlPayloads(
    EVENT_JSON_LD_HTML_GRAPH_SAMPLE_HTML,
    {
      source: {
        display_name: "Sample Quality Summary JSON-LD Source",
        trust_tier: "discovery",
        authority_scope: "discovery_only",
        actor_type: "editorial_source",
      },
      source_url: "https://example.com/events/sample-html-graph-electronic-night",
      raw_reference: "sample-quality-summary-jsonld-event-v4.8.29",
      collected_at: "2026-07-06T00:00:00.000Z",
    }
  );

  const qualitySummary = summarizeEventIngestionQuality(normalizationResult);

  const expectations: EventIngestionQualitySummarySampleExpectation = {
    expected_script_count: 1,
    expected_parsed_payload_count: 1,
    expected_parse_error_count: 0,
    expected_total_event_object_count: 1,
    expected_total_raw_candidate_count: 1,
    expected_total_normalized_candidate_count: 1,
    expected_review_ready_candidate_count: 1,
    expected_automatic_publication_candidate_count: 0,
    expected_automatic_publication_blocked: true,
    expected_quality_status: "ready_for_review",
  };

  const failedExpectationCodes = collectFailedExpectationCodes(
    qualitySummary,
    expectations
  );

  return {
    sample_name: "event-ingestion-quality-summary-sample",
    source_sample: "event-jsonld-html-graph-sample",
    expectations,
    quality_summary: qualitySummary,
    passed_expectations: failedExpectationCodes.length === 0,
    failed_expectation_codes: failedExpectationCodes,
  };
}

function collectFailedExpectationCodes(
  summary: EventIngestionQualitySummary,
  expectations: EventIngestionQualitySummarySampleExpectation
): string[] {
  const failedExpectationCodes: string[] = [];

  if (summary.script_count !== expectations.expected_script_count) {
    failedExpectationCodes.push("script_count_mismatch");
  }

  if (
    summary.parsed_payload_count !==
    expectations.expected_parsed_payload_count
  ) {
    failedExpectationCodes.push("parsed_payload_count_mismatch");
  }

  if (summary.parse_error_count !== expectations.expected_parse_error_count) {
    failedExpectationCodes.push("parse_error_count_mismatch");
  }

  if (
    summary.total_event_object_count !==
    expectations.expected_total_event_object_count
  ) {
    failedExpectationCodes.push("total_event_object_count_mismatch");
  }

  if (
    summary.total_raw_candidate_count !==
    expectations.expected_total_raw_candidate_count
  ) {
    failedExpectationCodes.push("total_raw_candidate_count_mismatch");
  }

  if (
    summary.total_normalized_candidate_count !==
    expectations.expected_total_normalized_candidate_count
  ) {
    failedExpectationCodes.push("total_normalized_candidate_count_mismatch");
  }

  if (
    summary.review_ready_candidate_count !==
    expectations.expected_review_ready_candidate_count
  ) {
    failedExpectationCodes.push("review_ready_candidate_count_mismatch");
  }

  if (
    summary.automatic_publication_candidate_count !==
    expectations.expected_automatic_publication_candidate_count
  ) {
    failedExpectationCodes.push(
      "automatic_publication_candidate_count_mismatch"
    );
  }

  if (
    summary.automatic_publication_blocked !==
    expectations.expected_automatic_publication_blocked
  ) {
    failedExpectationCodes.push("automatic_publication_blocked_mismatch");
  }

  if (summary.quality_status !== expectations.expected_quality_status) {
    failedExpectationCodes.push("quality_status_mismatch");
  }

  return failedExpectationCodes;
}

export const EVENT_INGESTION_QUALITY_SUMMARY_SAMPLE_RESULT =
  runEventIngestionQualitySummarySample();