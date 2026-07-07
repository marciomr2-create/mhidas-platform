// src/app/api/official-events/_shared/eventSourceFallbackPolicySample.ts

import type {
  EventPrimaryTicketingApiStatus,
  EventSourceFallbackAdjacentSourceKind,
  EventSourceFallbackDecisionState,
  EventSourceFallbackLane,
  EventSourceFallbackPolicyDecision,
  EventSourceFallbackPolicyInput,
  EventSourceFallbackReason,
} from "./eventSourceFallbackPolicy";

import { resolveEventSourceFallbackPolicyDecision } from "./eventSourceFallbackPolicy";

export type EventSourceFallbackPolicySampleCase = {
  case_key: string;
  primary_status: EventPrimaryTicketingApiStatus;
  adjacent_source_kind?: EventSourceFallbackAdjacentSourceKind;
  description: string;
  input: EventSourceFallbackPolicyInput;
  expected_decision_state: EventSourceFallbackDecisionState;
  expected_fallback_lane: EventSourceFallbackLane;
  expected_fallback_reason: EventSourceFallbackReason;
  expected_used_primary_ticketing_api: boolean;
  expected_used_adjacent_fallback: boolean;
  expected_publish_candidate_allowed: boolean;
  expected_blocked: boolean;
};

export type EventSourceFallbackPolicySampleResult = {
  case_key: string;
  primary_status: EventPrimaryTicketingApiStatus;
  adjacent_source_kind?: EventSourceFallbackAdjacentSourceKind;
  description: string;
  decision: EventSourceFallbackPolicyDecision;
  matched_expected_decision: boolean;
};

export type EventSourceFallbackPolicySampleSummary = {
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
  results: EventSourceFallbackPolicySampleResult[];
};

export const EVENT_SOURCE_FALLBACK_POLICY_SAMPLE_CASES: EventSourceFallbackPolicySampleCase[] =
  [
    {
      case_key: "authorized_ticketing_api_primary_candidate",
      primary_status: "authorized_available",
      adjacent_source_kind: "official_event_site",
      description:
        "Authorized ticketing API has priority and becomes the primary candidate without using adjacent fallback.",
      input: {
        primary_ticketing_api: {
          status: "authorized_available",
          adapter_input: {
            source_profile: {
              provider_key: "ticketmaster",
              provider_name: "Ticketmaster",
              authorization_status: "authorized",
              api_access_mode: "official_api",
              is_official_ticketing_provider: true,
              is_partner_verified: true,
              is_blocked: false,
            },
            raw_event_signal: {
              external_event_id: "tm-fallback-001",
              event_name: "Sample Primary API Event",
              starts_at: "2026-12-12T22:00:00-03:00",
              venue_name: "Sample Arena",
              city: "Sao Paulo",
              state: "SP",
              country: "BR",
              official_url: "https://example.com/events/primary-api",
              ticket_url: "https://example.com/tickets/primary-api",
              source_event_url: "https://example.com/api/primary-api",
              is_event_expired: false,
            },
            linked_source_count: 2,
            linked_strong_source_signal_count: 2,
            linked_official_source_count: 1,
            linked_verified_venue_source_count: 1,
            critical_conflict_count: 0,
            validation_error_count: 0,
            duplicate_candidate_count: 0,
          },
        },
        adjacent_signal: {
          source_kind: "official_event_site",
          source_count: 2,
          official_source_count: 1,
          public_ticketing_page_count: 1,
          official_social_post_count: 0,
          artist_calendar_source_count: 0,
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
      },
      expected_decision_state: "primary_ticketing_api_candidate",
      expected_fallback_lane: "primary_ticketing_api_lane",
      expected_fallback_reason: "none_primary_ticketing_api_used",
      expected_used_primary_ticketing_api: true,
      expected_used_adjacent_fallback: false,
      expected_publish_candidate_allowed: true,
      expected_blocked: false,
    },
    {
      case_key: "pending_api_uses_strong_adjacent_fallback",
      primary_status: "pending_authorization",
      adjacent_source_kind: "official_event_site",
      description:
        "Pending API authorization falls back automatically to strong adjacent official convergence.",
      input: {
        primary_ticketing_api: {
          status: "pending_authorization",
        },
        adjacent_signal: {
          source_kind: "official_event_site",
          source_count: 4,
          official_source_count: 2,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          editorial_discovery_count: 0,
          community_signal_count: 0,
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
      expected_decision_state: "fallback_adjacent_candidate",
      expected_fallback_lane: "adjacent_fallback_candidate_lane",
      expected_fallback_reason: "primary_ticketing_api_pending_authorization",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: true,
      expected_blocked: false,
    },
    {
      case_key: "unavailable_api_uses_adjacent_accumulation",
      primary_status: "unavailable",
      adjacent_source_kind: "public_ticketing_page",
      description:
        "Unavailable API falls back to adjacent signal accumulation when authority is not strong enough yet.",
      input: {
        primary_ticketing_api: {
          status: "unavailable",
        },
        adjacent_signal: {
          source_kind: "public_ticketing_page",
          source_count: 3,
          official_source_count: 0,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          editorial_discovery_count: 0,
          community_signal_count: 0,
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
      expected_decision_state: "fallback_adjacent_signal_accumulation",
      expected_fallback_lane: "adjacent_fallback_accumulation_lane",
      expected_fallback_reason: "primary_ticketing_api_unavailable",
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
        "No configured API falls back to editorial discovery, but discovery-only sources cannot feed publication policy by themselves.",
      input: {
        primary_ticketing_api: {
          status: "not_configured",
        },
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
      expected_decision_state: "fallback_adjacent_discovery_only",
      expected_fallback_lane: "adjacent_fallback_discovery_lane",
      expected_fallback_reason: "primary_ticketing_api_not_configured",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
    {
      case_key: "incomplete_api_fallback_conflict_block",
      primary_status: "incomplete_response",
      adjacent_source_kind: "official_promoter_site",
      description:
        "Incomplete API response falls back to adjacent sources, but conflicting adjacent sources block automatically.",
      input: {
        primary_ticketing_api: {
          status: "incomplete_response",
        },
        adjacent_signal: {
          source_kind: "official_promoter_site",
          source_count: 3,
          official_source_count: 1,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          editorial_discovery_count: 0,
          community_signal_count: 0,
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
      expected_decision_state: "blocked_by_adjacent_conflict",
      expected_fallback_lane: "adjacent_fallback_conflict_block_lane",
      expected_fallback_reason: "primary_ticketing_api_incomplete_response",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "unavailable_api_fallback_missing_identity_block",
      primary_status: "unavailable",
      adjacent_source_kind: "public_ticketing_page",
      description:
        "Unavailable API falls back to adjacent source, but missing required identity blocks validation automatically.",
      input: {
        primary_ticketing_api: {
          status: "unavailable",
        },
        adjacent_signal: {
          source_kind: "public_ticketing_page",
          source_count: 2,
          official_source_count: 0,
          public_ticketing_page_count: 1,
          official_social_post_count: 1,
          artist_calendar_source_count: 0,
          editorial_discovery_count: 0,
          community_signal_count: 0,
          matching_identity_signal_count: 2,
          conflicting_signal_count: 0,
          validation_error_count: 0,
          duplicate_candidate_count: 0,
          has_valid_event_name: true,
          has_valid_event_date: false,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: false,
          has_ticket_url: true,
          is_event_expired: false,
          is_blocked_source: false,
        },
      },
      expected_decision_state: "blocked_by_adjacent_validation",
      expected_fallback_lane: "adjacent_fallback_validation_block_lane",
      expected_fallback_reason: "primary_ticketing_api_unavailable",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: true,
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "blocked_primary_api_stops_pipeline",
      primary_status: "blocked",
      description:
        "Blocked primary ticketing API stops the pipeline instead of using adjacent fallback.",
      input: {
        primary_ticketing_api: {
          status: "blocked",
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
          has_valid_event_name: true,
          has_valid_event_date: true,
          has_valid_location: true,
          has_valid_city_or_region: true,
          has_valid_official_url: true,
          has_ticket_url: true,
          is_event_expired: false,
        },
      },
      expected_decision_state: "blocked_by_primary_ticketing_api",
      expected_fallback_lane: "primary_ticketing_api_block_lane",
      expected_fallback_reason: "primary_ticketing_api_blocked",
      expected_used_primary_ticketing_api: false,
      expected_used_adjacent_fallback: false,
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventSourceFallbackPolicySampleCase,
  decision: EventSourceFallbackPolicyDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.fallback_lane === sampleCase.expected_fallback_lane &&
    decision.fallback_reason === sampleCase.expected_fallback_reason &&
    decision.used_primary_ticketing_api ===
      sampleCase.expected_used_primary_ticketing_api &&
    decision.used_adjacent_fallback ===
      sampleCase.expected_used_adjacent_fallback &&
    decision.publish_candidate_allowed ===
      sampleCase.expected_publish_candidate_allowed &&
    decision.blocked === sampleCase.expected_blocked &&
    decision.external_request_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false &&
    decision.safety_flags.includes("primary_ticketing_api_has_priority") &&
    decision.safety_flags.includes("adjacent_sources_are_fallback") &&
    decision.safety_flags.includes("real_auto_publish_disabled") &&
    decision.safety_flags.includes("human_event_analysis_not_required")
  );
}

export function runEventSourceFallbackPolicySample(): EventSourceFallbackPolicySampleSummary {
  const results = EVENT_SOURCE_FALLBACK_POLICY_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventSourceFallbackPolicyDecision(
        sampleCase.input
      );

      return {
        case_key: sampleCase.case_key,
        primary_status: sampleCase.primary_status,
        adjacent_source_kind: sampleCase.adjacent_source_kind,
        description: sampleCase.description,
        decision,
        matched_expected_decision: doesDecisionMatchSampleCase(
          sampleCase,
          decision
        ),
      };
    }
  );

  const validSampleCaseCount = results.filter(
    (result) => result.matched_expected_decision
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

export function validateEventSourceFallbackPolicySample(): boolean {
  const summary = runEventSourceFallbackPolicySample();

  return (
    summary.sample_case_count === 7 &&
    summary.valid_sample_case_count === 7 &&
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

export const EVENT_SOURCE_FALLBACK_POLICY_SAMPLE_RESULT =
  runEventSourceFallbackPolicySample();

export const EVENT_SOURCE_FALLBACK_POLICY_SAMPLE_IS_VALID =
  validateEventSourceFallbackPolicySample();