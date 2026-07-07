// src/app/api/official-events/_shared/eventMultiSourceQualityBlockedSample.ts

import type { EventMultiSourceQualitySummary } from "./eventMultiSourceQualitySummary";

import { summarizeEventMultiSourceQuality } from "./eventMultiSourceQualitySummary";

type EventMultiSourceQualityInput =
  Parameters<typeof summarizeEventMultiSourceQuality>[0];

type EventSourceQualitySummaryShape = Record<string, unknown>;

type SummaryRecord = Record<string, unknown>;

export type EventMultiSourceQualityBlockedSampleSummary =
  EventMultiSourceQualitySummary;

const READY_FOR_MANUAL_REVIEW_SOURCE_SUMMARY: EventSourceQualitySummaryShape = {
  source_id: "sample-editorial-ready-source-v4-8-34",
  source_key: "sample-editorial-ready-source-v4-8-34",
  source_name: "Sample Editorial Ready Source",
  source_display_name: "Sample Editorial Ready Source",
  display_name: "Sample Editorial Ready Source",
  source_role: "editorial_source",
  trust_tier: "discovery",
  authority_scope: "discovery_only",
  ingestion_quality_status: "ready_for_review",
  quality_status: "ready_for_review",
  review_priority: "normal",
  publication_gate: "ready_for_manual_review",
  ready_for_manual_review_candidate_count: 1,
  review_ready_candidate_count: 1,
  blocked_candidate_count: 0,
  validation_error_count: 0,
  validation_warning_count: 0,
  automatic_publication_candidate_count: 0,
  automatic_publication_allowed: false,
  automatic_publication_blocked: true,
};

const BLOCKED_SOURCE_SUMMARY: EventSourceQualitySummaryShape = {
  source_id: "sample-venue-blocked-source-v4-8-34",
  source_key: "sample-venue-blocked-source-v4-8-34",
  source_name: "Sample Venue Blocked Source",
  source_display_name: "Sample Venue Blocked Source",
  display_name: "Sample Venue Blocked Source",
  source_role: "venue",
  trust_tier: "verified",
  authority_scope: "official_event_source",
  ingestion_quality_status: "blocked_by_validation_errors",
  quality_status: "blocked",
  review_priority: "high",
  publication_gate: "blocked",
  publication_gate_reason: "blocked_by_validation_error",
  ready_for_manual_review_candidate_count: 0,
  review_ready_candidate_count: 0,
  blocked_candidate_count: 1,
  validation_error_count: 1,
  validation_warning_count: 0,
  automatic_publication_candidate_count: 0,
  automatic_publication_allowed: false,
  automatic_publication_blocked: true,
};

export const EVENT_MULTI_SOURCE_QUALITY_BLOCKED_SAMPLE_SOURCES = [
  READY_FOR_MANUAL_REVIEW_SOURCE_SUMMARY,
  BLOCKED_SOURCE_SUMMARY,
] as const;

function getNumberField(summary: SummaryRecord, fieldName: string): number {
  const value = summary[fieldName];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value);
  }

  return 0;
}

function getStringField(summary: SummaryRecord, fieldName: string): string {
  const value = summary[fieldName];

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function getBooleanField(summary: SummaryRecord, fieldName: string): boolean {
  const value = summary[fieldName];

  if (typeof value === "boolean") {
    return value;
  }

  return false;
}

function createEventMultiSourceQualityBlockedSampleInputVariants(): EventMultiSourceQualityInput[] {
  const sourceSummaries = [
    ...EVENT_MULTI_SOURCE_QUALITY_BLOCKED_SAMPLE_SOURCES,
  ];

  return [
    {
      source_summaries: sourceSummaries,
    },
    {
      source_quality_summaries: sourceSummaries,
    },
    {
      sources: sourceSummaries,
    },
    sourceSummaries,
  ] as unknown as EventMultiSourceQualityInput[];
}

function isExpectedBlockedSampleSummary(
  summary: EventMultiSourceQualitySummary
): boolean {
  const summaryRecord = summary as unknown as SummaryRecord;

  return (
    getNumberField(summaryRecord, "source_count") === 2 &&
    getNumberField(summaryRecord, "ready_for_manual_review_source_count") === 1 &&
    getNumberField(summaryRecord, "blocked_source_count") === 1 &&
    getStringField(summaryRecord, "quality_status") === "mixed_review" &&
    getNumberField(summaryRecord, "total_review_ready_candidate_count") === 1 &&
    getNumberField(summaryRecord, "total_automatic_publication_candidate_count") === 0 &&
    getBooleanField(summaryRecord, "automatic_publication_allowed") === false &&
    getBooleanField(summaryRecord, "automatic_publication_blocked") === true
  );
}

export function runEventMultiSourceQualityBlockedSample(): EventMultiSourceQualityBlockedSampleSummary {
  const inputVariants = createEventMultiSourceQualityBlockedSampleInputVariants();

  let lastError: unknown = null;
  let lastSummary: EventMultiSourceQualitySummary | null = null;

  for (const input of inputVariants) {
    try {
      const summary = summarizeEventMultiSourceQuality(input);
      lastSummary = summary;

      if (isExpectedBlockedSampleSummary(summary)) {
        return summary;
      }
    } catch (error) {
      lastError = error;
    }
  }

  const lastErrorMessage =
    lastError instanceof Error ? ` Último erro: ${lastError.message}` : "";

  const lastSummaryMessage = lastSummary
    ? ` Último resumo: ${JSON.stringify(lastSummary)}`
    : "";

  throw new Error(
    `A amostra bloqueada multi-fonte não gerou o resumo esperado.${lastErrorMessage}${lastSummaryMessage}`
  );
}

export const EVENT_MULTI_SOURCE_QUALITY_BLOCKED_SAMPLE_RESULT =
  runEventMultiSourceQualityBlockedSample();