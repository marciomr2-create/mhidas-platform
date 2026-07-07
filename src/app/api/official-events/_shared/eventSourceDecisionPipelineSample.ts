// src/app/api/official-events/_shared/eventSourceDecisionPipelineSample.ts

import type {
  EventPrimaryTicketingApiStatus,
  EventSourceFallbackAdjacentSourceKind,
  EventSourceFallbackDecisionState,
  EventSourceFallbackLane,
  EventSourceFallbackReason,
} from "./eventSourceFallbackPolicy";

import type {
  EventSourceDecisionPipelineInput,
  EventSourceDecisionPipelineResult,
} from "./eventSourceDecisionPipeline";

import { resolveEventSourceDecisionPipeline } from "./eventSourceDecisionPipeline";

export type EventSourceDecisionPipelineSampleCase = {
  case_key: string;
  primary_status: EventPrimaryTicketingApiStatus;
  adjacent_source_kind?: EventSourceFallbackAdjacentSourceKind;
  description: string;
  input: EventSourceDecisionPipelineInput;
  expected_resolved_primary_status: EventPrimaryTicketingApiStatus;
  expected_decision_state: EventSourceFallbackDecisionState;
  expected_fallback_lane: EventSourceFallbackLane;
  expected_fallback_reason: EventSourceFallbackReason;
  expected_used_primary_ticketing_api: boolean;
  expected_used_adjacent_fallback: boolean;
  expected_publish_candidate_allowed: boolean;
  expected_blocked: boolean;
};

export type EventSourceDecisionPipelineSampleResult = {
  case_key: string;
  primary_status: EventPrimaryTicketingApiStatus;
  adjacent_source_kind?: EventSourceFallbackAdjacentSourceKind;
  description: string;
  pipeline_result: EventSourceDecisionPipelineResult;
  matched_expected_result: boolean;
};

export type EventSourceDecisionPipelineSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  primary_ticketing_api_has_priority: true;
  adjacent_sources_are_fallback: true;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventSourceDecisionPipelineSampleResult[];
};

export const EVENT_SOURCE_DECISION_PIPELINE_SAMPLE_CASES: EventSourceDecisionPipelineSampleCase[] =
  [
    {
      case_key: "authorized_api_complete_payload_uses_primary",
      primary_status: "authorized_available",
      adjacent_source_kind: "official_event_site",
      description:
        "Complete authorized API payload is normalized and used as the primary source before adjacent fallback.",
      input: {
        primary_ticketing_api_status: "authorized_available",
        primary_ticketing_source_profile: {
          provider_key: "ticketmaster",
          provider_name: "Ticketmaster",
          authorization_status: "authorized",
          api_access_mode: "official_api",
          is_official_ticketing_provider: true,
          is_partner_verified: true,
          is_blocked: false,
        },
        primary_raw_event: {
          provider_key: "ticketmaster",
          provider_name: "Ticketmaster",
          current_date: "2026-07-07T12:00:00-03:00",
          raw_payload: {
            event: {
              id: "pipeline-tm-001",
              name: "Sample Primary Pipeline Event",
              startDate: "2026-12-12T22:00:00-03:00",
              url: "https://example.com/events/primary-pipeline",
            },
            venue: {
              name: "Sample Arena",
              city: "Sao Paulo",
              state: "SP",
              country: "BR",
            },
            ticketing: {
              url: "https://example.com/tickets/primary-pipeline",
            },
            href: "https://example.com/api/primary-pipeline",
          },
        },
        adjacent_signal: {
          source_kind: "official_event_site",
          source_count: 2,
          official_source_count: 1,
          public_ticketing_page_count: 1,
          matching_identity_signal_count: 2,
          conflicting_signal_count: 0,
          validation_error_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: true,
          has_ticket_url: true,
          is_event_expired: false,
        },
        linked_source_count: 2,
        linked_strong_source_signal_count: 2,
        linked_official_source_count: 1,
        linked_verified_venue_source_count: 1,
      },
      expected_resolved_primary_status: "authorized_available",
      expected_decision_state: "primary_ticketing_api_candidate",
      expected_fallback_lane: "primary_ticketing_api_lane",
      expected_fallback_reason: "none_primary_ticketing_api_used",
      expected_used_primary_ticketing_api: true,
      expected_used_adjacent_fallback: false,
      expected_publish_candidate_allowed: true,
      expected_blocked: false,
    },
    {
      case_key: "authorized_api_incomplete_payload_uses_adjacent_candidate",
      primary_status: "authorized_available",
      adjacent_source_kind: "official_event_site",
      description:
        "Authorized API with incomplete payload is downgraded to incomplete response and uses strong adjacent fallback.",
      input: {
        primary_ticketing_api_status: "authorized_available",
        primary_ticketing_source_profile: {
          provider_key: "sympla",
          provider_name: "Sympla",
          authorization_status: "authorized",
          api_access_mode: "official_api",
          is_official_ticketing_provider: true,
          is_partner_verified: true,
          is_blocked: false,
        },
        primary_raw_event: {
          provider_key: "sympla",
          provider_name: "Sympla",
          current_date: "2026-07-07T12:00:00-03:00",
          raw_payload: {
            id: "pipeline-sympla-missing-date",
            name: "Sample Incomplete API Event",
            venueName: "Sample Hall",
            city: "Sao Paulo",
            state: "SP",
            country: "BR",
            url: "https://example.com/events/incomplete-api",
            ticketUrl: "https://example.com/tickets/incomplete-api",
          },
        },
        adjacent_signal: {
          source_kind: "official_event_site",
          source_count: 4,
          official_source_count: 2,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          matching_identity_signal_count: 4,
          conflicting_signal_count: 0,
          validation_error_count: 0,
          duplicate_candidate_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: true,
          has_ticket_url: true,
          is_event_expired: false,
          is_blocked_source: false,
        },
      },
      expected_resolved_primary_status: "incomplete_response",
      expected_decision_state: "fallback_adjacent_candidate",
      expected_fallback_lane: "adjacent_fallback_candidate_lane",
      expected_fallback_reason: "primary_ticketing_api_incomplete_response",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: true,
      expected_blocked: false,
    },
    {
      case_key: "pending_api_uses_adjacent_accumulation",
      primary_status: "pending_authorization",
      adjacent_source_kind: "public_ticketing_page",
      description:
        "Pending API authorization skips primary normalization and uses adjacent signal accumulation.",
      input: {
        primary_ticketing_api_status: "pending_authorization",
        adjacent_signal: {
          source_kind: "public_ticketing_page",
          source_count: 3,
          official_source_count: 0,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          matching_identity_signal_count: 3,
          conflicting_signal_count: 0,
          validation_error_count: 0,
          duplicate_candidate_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: false,
          has_ticket_url: true,
          is_event_expired: false,
          is_blocked_source: false,
        },
      },
      expected_resolved_primary_status: "pending_authorization",
      expected_decision_state: "fallback_adjacent_signal_accumulation",
      expected_fallback_lane: "adjacent_fallback_accumulation_lane",
      expected_fallback_reason: "primary_ticketing_api_pending_authorization",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
    {
      case_key: "not_configured_api_editorial_discovery_only",
      primary_status: "not_configured",
      adjacent_source_kind: "editorial_discovery",
      description:
        "No configured API falls back to editorial discovery only.",
      input: {
        primary_ticketing_api_status: "not_configured",
        adjacent_signal: {
          source_kind: "editorial_discovery",
          source_count: 1,
          official_source_count: 0,
          public_ticketing_page_count: 0,
          official_social_post_count: 0,
          artist_calendar_source_count: 0,
          editorial_discovery_count: 1,
          community_signal_count: 0,
          matching_identity_signal_count: 1,
          conflicting_signal_count: 0,
          validation_error_count: 0,
          duplicate_candidate_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: false,
          has_valid_city_or_region: true,
          has_valid_official_url: false,
          has_ticket_url: false,
          is_event_expired: false,
          is_blocked_source: false,
        },
      },
      expected_resolved_primary_status: "not_configured",
      expected_decision_state: "fallback_adjacent_discovery_only",
      expected_fallback_lane: "adjacent_fallback_discovery_lane",
      expected_fallback_reason: "primary_ticketing_api_not_configured",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
    {
      case_key: "unavailable_api_adjacent_conflict_block",
      primary_status: "unavailable",
      adjacent_source_kind: "official_promoter_site",
      description:
        "Unavailable API falls back to adjacent sources, but conflict blocks the candidate.",
      input: {
        primary_ticketing_api_status: "unavailable",
        adjacent_signal: {
          source_kind: "official_promoter_site",
          source_count: 3,
          official_source_count: 1,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          matching_identity_signal_count: 2,
          conflicting_signal_count: 1,
          validation_error_count: 0,
          duplicate_candidate_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: true,
          has_ticket_url: true,
          is_event_expired: false,
          is_blocked_source: false,
        },
      },
      expected_resolved_primary_status: "unavailable",
      expected_decision_state: "blocked_by_adjacent_conflict",
      expected_fallback_lane: "adjacent_fallback_conflict_block_lane",
      expected_fallback_reason: "primary_ticketing_api_unavailable",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "blocked_primary_api_stops_pipeline",
      primary_status: "blocked",
      adjacent_source_kind: "official_event_site",
      description:
        "Blocked primary API stops the pipeline instead of using adjacent fallback.",
      input: {
        primary_ticketing_api_status: "blocked",
        adjacent_signal: {
          source_kind: "official_event_site",
          source_count: 4,
          official_source_count: 2,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          matching_identity_signal_count: 4,
          conflicting_signal_count: 0,
          validation_error_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: true,
          has_ticket_url: true,
          is_event_expired: false,
        },
      },
      expected_resolved_primary_status: "blocked",
      expected_decision_state: "blocked_by_primary_ticketing_api",
      expected_fallback_lane: "primary_ticketing_api_block_lane",
      expected_fallback_reason: "primary_ticketing_api_blocked",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: false,
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
  ];

function doesPipelineResultMatchSampleCase(
  sampleCase: EventSourceDecisionPipelineSampleCase,
  pipelineResult: EventSourceDecisionPipelineResult
): boolean {
  const fallbackDecision = pipelineResult.fallback_decision;

  return (
    pipelineResult.resolved_primary_ticketing_api_status ===
      sampleCase.expected_resolved_primary_status &&
    fallbackDecision.decision_state === sampleCase.expected_decision_state &&
    fallbackDecision.fallback_lane === sampleCase.expected_fallback_lane &&
    fallbackDecision.fallback_reason === sampleCase.expected_fallback_reason &&
    fallbackDecision.used_primary_ticketing_api ===
      sampleCase.expected_used_primary_ticketing_api &&
    fallbackDecision.used_adjacent_fallback ===
      sampleCase.expected_used_adjacent_fallback &&
    fallbackDecision.publish_candidate_allowed ===
      sampleCase.expected_publish_candidate_allowed &&
    fallbackDecision.blocked === sampleCase.expected_blocked &&
    pipelineResult.primary_ticketing_api_has_priority === true &&
    pipelineResult.adjacent_sources_are_fallback === true &&
    pipelineResult.external_request_performed === false &&
    pipelineResult.human_event_analysis_required === false &&
    pipelineResult.real_auto_publish_enabled === false &&
    pipelineResult.real_auto_publish_allowed === false &&
    fallbackDecision.external_request_performed === false &&
    fallbackDecision.human_event_analysis_required === false &&
    fallbackDecision.real_auto_publish_enabled === false &&
    fallbackDecision.real_auto_publish_allowed === false
  );
}

export function runEventSourceDecisionPipelineSample(): EventSourceDecisionPipelineSampleSummary {
  const results = EVENT_SOURCE_DECISION_PIPELINE_SAMPLE_CASES.map(
    (sampleCase) => {
      const pipelineResult = resolveEventSourceDecisionPipeline(
        sampleCase.input
      );

      return {
        case_key: sampleCase.case_key,
        primary_status: sampleCase.primary_status,
        adjacent_source_kind: sampleCase.adjacent_source_kind,
        description: sampleCase.description,
        pipeline_result: pipelineResult,
        matched_expected_result: doesPipelineResultMatchSampleCase(
          sampleCase,
          pipelineResult
        ),
      };
    }
  );

  const validSampleCaseCount = results.filter(
    (result) => result.matched_expected_result
  ).length;

  return {
    sample_case_count: results.length,
    valid_sample_case_count: validSampleCaseCount,
    invalid_sample_case_count: results.length - validSampleCaseCount,
    primary_ticketing_api_has_priority: true,
    adjacent_sources_are_fallback: true,
    external_request_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventSourceDecisionPipelineSample(): boolean {
  const summary = runEventSourceDecisionPipelineSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.primary_ticketing_api_has_priority === true &&
    summary.adjacent_sources_are_fallback === true &&
    summary.external_request_performed === false &&
    summary.human_event_analysis_required === false &&
    summary.real_auto_publish_enabled === false &&
    summary.real_auto_publish_allowed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_SOURCE_DECISION_PIPELINE_SAMPLE_RESULT =
  runEventSourceDecisionPipelineSample();

export const EVENT_SOURCE_DECISION_PIPELINE_SAMPLE_IS_VALID =
  validateEventSourceDecisionPipelineSample();