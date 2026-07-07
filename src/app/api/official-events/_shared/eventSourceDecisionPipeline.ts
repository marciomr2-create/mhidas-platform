// src/app/api/official-events/_shared/eventSourceDecisionPipeline.ts

import type {
  EventExternalRawEventNormalizerInput,
  EventExternalRawEventNormalizerResult,
} from "./eventExternalRawEventNormalizer";

import { normalizeExternalRawEvent } from "./eventExternalRawEventNormalizer";

import type {
  EventTicketingApiSourceAdapterInput,
  EventTicketingApiSourceProfile,
} from "./eventTicketingApiSourceAdapter";

import type {
  EventPrimaryTicketingApiStatus,
  EventSourceFallbackAdjacentSignalInput,
  EventSourceFallbackPolicyDecision,
  EventSourceFallbackPolicyInput,
} from "./eventSourceFallbackPolicy";

import { resolveEventSourceFallbackPolicyDecision } from "./eventSourceFallbackPolicy";

export type EventSourceDecisionPipelineStage =
  | "primary_ticketing_api_normalized"
  | "primary_ticketing_api_skipped"
  | "primary_ticketing_api_incomplete"
  | "fallback_policy_resolved";

export type EventSourceDecisionPipelineInput = {
  primary_ticketing_api_status: EventPrimaryTicketingApiStatus;
  primary_ticketing_source_profile?: EventTicketingApiSourceProfile | null;
  primary_raw_event?: EventExternalRawEventNormalizerInput | null;
  adjacent_signal?: EventSourceFallbackAdjacentSignalInput | null;
  linked_source_count?: number | string | null;
  linked_strong_source_signal_count?: number | string | null;
  linked_official_source_count?: number | string | null;
  linked_verified_venue_source_count?: number | string | null;
  critical_conflict_count?: number | string | null;
  validation_error_count?: number | string | null;
  duplicate_candidate_count?: number | string | null;
};

export type EventSourceDecisionPipelineResult = {
  original_primary_ticketing_api_status: EventPrimaryTicketingApiStatus;
  resolved_primary_ticketing_api_status: EventPrimaryTicketingApiStatus;
  normalized_primary_raw_event: EventExternalRawEventNormalizerResult | null;
  ticketing_adapter_input: EventTicketingApiSourceAdapterInput | null;
  fallback_policy_input: EventSourceFallbackPolicyInput;
  fallback_decision: EventSourceFallbackPolicyDecision;
  pipeline_stages: EventSourceDecisionPipelineStage[];
  primary_ticketing_api_has_priority: true;
  adjacent_sources_are_fallback: true;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

function normalizePrimaryRawEventIfPresent(
  input: EventSourceDecisionPipelineInput
): EventExternalRawEventNormalizerResult | null {
  if (!input.primary_raw_event) {
    return null;
  }

  return normalizeExternalRawEvent(input.primary_raw_event);
}

function buildTicketingAdapterInput(
  input: EventSourceDecisionPipelineInput,
  normalizedPrimaryRawEvent: EventExternalRawEventNormalizerResult | null
): EventTicketingApiSourceAdapterInput | null {
  if (
    input.primary_ticketing_api_status !== "authorized_available" ||
    !input.primary_ticketing_source_profile ||
    !normalizedPrimaryRawEvent ||
    !normalizedPrimaryRawEvent.can_feed_ticketing_api_adapter
  ) {
    return null;
  }

  return {
    source_profile: input.primary_ticketing_source_profile,
    raw_event_signal: normalizedPrimaryRawEvent.normalized_signal,
    linked_source_count: input.linked_source_count ?? 0,
    linked_strong_source_signal_count:
      input.linked_strong_source_signal_count ?? 0,
    linked_official_source_count: input.linked_official_source_count ?? 0,
    linked_verified_venue_source_count:
      input.linked_verified_venue_source_count ?? 0,
    critical_conflict_count: input.critical_conflict_count ?? 0,
    validation_error_count: input.validation_error_count ?? 0,
    duplicate_candidate_count: input.duplicate_candidate_count ?? 0,
  };
}

function resolveEffectivePrimaryTicketingApiStatus(
  originalStatus: EventPrimaryTicketingApiStatus,
  ticketingAdapterInput: EventTicketingApiSourceAdapterInput | null
): EventPrimaryTicketingApiStatus {
  if (originalStatus !== "authorized_available") {
    return originalStatus;
  }

  if (ticketingAdapterInput) {
    return "authorized_available";
  }

  return "incomplete_response";
}

function buildFallbackPolicyInput(
  resolvedPrimaryTicketingApiStatus: EventPrimaryTicketingApiStatus,
  ticketingAdapterInput: EventTicketingApiSourceAdapterInput | null,
  adjacentSignal: EventSourceFallbackAdjacentSignalInput | null | undefined
): EventSourceFallbackPolicyInput {
  if (ticketingAdapterInput) {
    return {
      primary_ticketing_api: {
        status: resolvedPrimaryTicketingApiStatus,
        adapter_input: ticketingAdapterInput,
      },
      adjacent_signal: adjacentSignal ?? null,
    };
  }

  return {
    primary_ticketing_api: {
      status: resolvedPrimaryTicketingApiStatus,
    },
    adjacent_signal: adjacentSignal ?? null,
  };
}

function buildPipelineStages(
  input: EventSourceDecisionPipelineInput,
  normalizedPrimaryRawEvent: EventExternalRawEventNormalizerResult | null,
  ticketingAdapterInput: EventTicketingApiSourceAdapterInput | null,
  resolvedPrimaryTicketingApiStatus: EventPrimaryTicketingApiStatus
): EventSourceDecisionPipelineStage[] {
  const stages: EventSourceDecisionPipelineStage[] = [];

  if (input.primary_raw_event && normalizedPrimaryRawEvent) {
    stages.push("primary_ticketing_api_normalized");
  } else {
    stages.push("primary_ticketing_api_skipped");
  }

  if (
    input.primary_ticketing_api_status === "authorized_available" &&
    resolvedPrimaryTicketingApiStatus === "incomplete_response" &&
    !ticketingAdapterInput
  ) {
    stages.push("primary_ticketing_api_incomplete");
  }

  stages.push("fallback_policy_resolved");

  return stages;
}

export function resolveEventSourceDecisionPipeline(
  input: EventSourceDecisionPipelineInput
): EventSourceDecisionPipelineResult {
  const normalizedPrimaryRawEvent = normalizePrimaryRawEventIfPresent(input);
  const ticketingAdapterInput = buildTicketingAdapterInput(
    input,
    normalizedPrimaryRawEvent
  );
  const resolvedPrimaryTicketingApiStatus =
    resolveEffectivePrimaryTicketingApiStatus(
      input.primary_ticketing_api_status,
      ticketingAdapterInput
    );
  const fallbackPolicyInput = buildFallbackPolicyInput(
    resolvedPrimaryTicketingApiStatus,
    ticketingAdapterInput,
    input.adjacent_signal
  );
  const fallbackDecision =
    resolveEventSourceFallbackPolicyDecision(fallbackPolicyInput);

  return {
    original_primary_ticketing_api_status: input.primary_ticketing_api_status,
    resolved_primary_ticketing_api_status: resolvedPrimaryTicketingApiStatus,
    normalized_primary_raw_event: normalizedPrimaryRawEvent,
    ticketing_adapter_input: ticketingAdapterInput,
    fallback_policy_input: fallbackPolicyInput,
    fallback_decision: fallbackDecision,
    pipeline_stages: buildPipelineStages(
      input,
      normalizedPrimaryRawEvent,
      ticketingAdapterInput,
      resolvedPrimaryTicketingApiStatus
    ),
    primary_ticketing_api_has_priority: true,
    adjacent_sources_are_fallback: true,
    external_request_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export const EVENT_SOURCE_DECISION_PIPELINE_DEFAULTS = {
  primary_ticketing_api_has_priority: true,
  adjacent_sources_are_fallback: true,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;