// src/app/api/official-events/_shared/eventTicketingApiSourceAdapterSample.ts

import type {
  EventAutomationDecisionState,
  EventAutomationLane,
} from "./eventAutomationPolicy";

import type {
  EventTicketingApiProviderKey,
  EventTicketingApiSourceAdapterInput,
  EventTicketingApiSourceAdapterResult,
} from "./eventTicketingApiSourceAdapter";

import { adaptTicketingApiSourceToAutomationPolicy } from "./eventTicketingApiSourceAdapter";

export type EventTicketingApiSourceAdapterSampleCase = {
  case_key: string;
  provider_key: EventTicketingApiProviderKey;
  description: string;
  input: EventTicketingApiSourceAdapterInput;
  expected_decision_state: EventAutomationDecisionState;
  expected_automation_lane: EventAutomationLane;
  expected_publish_candidate_allowed: boolean;
  expected_blocked: boolean;
};

export type EventTicketingApiSourceAdapterSampleResult = {
  case_key: string;
  provider_key: EventTicketingApiProviderKey;
  description: string;
  adapter_result: EventTicketingApiSourceAdapterResult;
  matched_expected_decision: boolean;
};

export type EventTicketingApiSourceAdapterSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  external_request_performed: false;
  oauth_token_required_for_sample: false;
  human_event_analysis_required: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventTicketingApiSourceAdapterSampleResult[];
};

export const EVENT_TICKETING_API_SOURCE_ADAPTER_SAMPLE_CASES: EventTicketingApiSourceAdapterSampleCase[] =
  [
    {
      case_key: "authorized_ticketmaster_safe_candidate",
      provider_key: "ticketmaster",
      description:
        "Authorized Ticketmaster-like API signal with complete event identity becomes a safe candidate hold.",
      input: {
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
          external_event_id: "tm-sample-001",
          event_name: "Sample Electronic Event",
          starts_at: "2026-12-12T22:00:00-03:00",
          venue_name: "Sample Arena",
          city: "Sao Paulo",
          state: "SP",
          country: "BR",
          official_url: "https://example.com/events/sample-electronic-event",
          ticket_url: "https://example.com/tickets/sample-electronic-event",
          source_event_url:
            "https://example.com/api/events/sample-electronic-event",
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
      expected_decision_state: "safe_auto_publish_candidate",
      expected_automation_lane: "safe_candidate_hold",
      expected_publish_candidate_allowed: true,
      expected_blocked: false,
    },
    {
      case_key: "pending_ingresse_authorization_needs_more_signals",
      provider_key: "ingresse",
      description:
        "Pending authorization keeps the candidate in signal accumulation without human analysis.",
      input: {
        source_profile: {
          provider_key: "ingresse",
          provider_name: "Ingresse",
          authorization_status: "pending_authorization",
          api_access_mode: "manual_contract_pending",
          is_official_ticketing_provider: true,
          is_partner_verified: false,
          is_blocked: false,
        },
        raw_event_signal: {
          external_event_id: "ingresse-sample-001",
          event_name: "Sample Pending Event",
          starts_at: "2026-11-20T21:00:00-03:00",
          venue_name: "Sample Club",
          city: "Florianopolis",
          state: "SC",
          country: "BR",
          official_url: "https://example.com/events/sample-pending-event",
          ticket_url: "https://example.com/tickets/sample-pending-event",
          source_event_url: "https://example.com/feed/sample-pending-event",
          is_event_expired: false,
        },
        linked_source_count: 0,
        linked_strong_source_signal_count: 0,
        linked_official_source_count: 0,
        linked_verified_venue_source_count: 0,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
      },
      expected_decision_state: "needs_more_source_signals",
      expected_automation_lane: "signal_accumulation",
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
    {
      case_key: "blocked_shotgun_source_validation_block",
      provider_key: "shotgun",
      description:
        "Blocked provider authorization maps to validation block automatically.",
      input: {
        source_profile: {
          provider_key: "shotgun",
          provider_name: "Shotgun",
          authorization_status: "blocked",
          api_access_mode: "unknown",
          is_official_ticketing_provider: true,
          is_partner_verified: false,
          is_blocked: true,
        },
        raw_event_signal: {
          external_event_id: "shotgun-sample-001",
          event_name: "Sample Blocked Source Event",
          starts_at: "2026-09-18T22:00:00-03:00",
          venue_name: "Sample Warehouse",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "BR",
          official_url: "https://example.com/events/sample-blocked-source",
          ticket_url: "https://example.com/tickets/sample-blocked-source",
          source_event_url: "https://example.com/feed/sample-blocked-source",
          is_event_expired: false,
        },
        linked_source_count: 1,
        linked_strong_source_signal_count: 1,
        linked_official_source_count: 0,
        linked_verified_venue_source_count: 1,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
      },
      expected_decision_state: "blocked_by_validation",
      expected_automation_lane: "validation_block",
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "authorized_sympla_validation_error_block",
      provider_key: "sympla",
      description:
        "Authorized source with validation error is blocked by validation policy.",
      input: {
        source_profile: {
          provider_key: "sympla",
          provider_name: "Sympla",
          authorization_status: "authorized",
          api_access_mode: "official_api",
          is_official_ticketing_provider: true,
          is_partner_verified: true,
          is_blocked: false,
        },
        raw_event_signal: {
          external_event_id: "sympla-sample-001",
          event_name: "Sample Invalid Date Event",
          starts_at: null,
          venue_name: "Sample Hall",
          city: "Belo Horizonte",
          state: "MG",
          country: "BR",
          official_url: "https://example.com/events/sample-invalid-date",
          ticket_url: "https://example.com/tickets/sample-invalid-date",
          source_event_url: "https://example.com/api/sample-invalid-date",
          is_event_expired: false,
        },
        linked_source_count: 2,
        linked_strong_source_signal_count: 2,
        linked_official_source_count: 1,
        linked_verified_venue_source_count: 1,
        critical_conflict_count: 0,
        validation_error_count: 1,
        duplicate_candidate_count: 0,
      },
      expected_decision_state: "blocked_by_validation",
      expected_automation_lane: "validation_block",
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "authorized_eventbrite_conflict_block",
      provider_key: "eventbrite",
      description:
        "Authorized source with critical conflict is blocked by conflict policy.",
      input: {
        source_profile: {
          provider_key: "eventbrite",
          provider_name: "Eventbrite",
          authorization_status: "authorized",
          api_access_mode: "official_api",
          is_official_ticketing_provider: true,
          is_partner_verified: true,
          is_blocked: false,
        },
        raw_event_signal: {
          external_event_id: "eventbrite-sample-001",
          event_name: "Sample Conflict Event",
          starts_at: "2026-10-10T23:00:00-03:00",
          venue_name: "Sample Park",
          city: "Curitiba",
          state: "PR",
          country: "BR",
          official_url: "https://example.com/events/sample-conflict",
          ticket_url: "https://example.com/tickets/sample-conflict",
          source_event_url: "https://example.com/api/sample-conflict",
          is_event_expired: false,
        },
        linked_source_count: 2,
        linked_strong_source_signal_count: 2,
        linked_official_source_count: 1,
        linked_verified_venue_source_count: 1,
        critical_conflict_count: 1,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
      },
      expected_decision_state: "blocked_by_conflict",
      expected_automation_lane: "conflict_block",
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "authorized_blueticket_duplicate_candidate",
      provider_key: "blueticket",
      description:
        "Authorized source with duplicate signal enters automatic duplicate resolution.",
      input: {
        source_profile: {
          provider_key: "blueticket",
          provider_name: "Blueticket",
          authorization_status: "authorized",
          api_access_mode: "official_api",
          is_official_ticketing_provider: true,
          is_partner_verified: true,
          is_blocked: false,
        },
        raw_event_signal: {
          external_event_id: "blueticket-sample-001",
          event_name: "Sample Duplicate Event",
          starts_at: "2026-08-15T22:00:00-03:00",
          venue_name: "Sample Festival Grounds",
          city: "Balneario Camboriu",
          state: "SC",
          country: "BR",
          official_url: "https://example.com/events/sample-duplicate",
          ticket_url: "https://example.com/tickets/sample-duplicate",
          source_event_url: "https://example.com/api/sample-duplicate",
          is_event_expired: false,
        },
        linked_source_count: 2,
        linked_strong_source_signal_count: 2,
        linked_official_source_count: 1,
        linked_verified_venue_source_count: 1,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 1,
      },
      expected_decision_state: "duplicate_candidate",
      expected_automation_lane: "duplicate_resolution",
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
  ];

function doesAdapterResultMatchSampleCase(
  sampleCase: EventTicketingApiSourceAdapterSampleCase,
  adapterResult: EventTicketingApiSourceAdapterResult
): boolean {
  return (
    adapterResult.provider_key === sampleCase.provider_key &&
    adapterResult.policy_decision.decision_state ===
      sampleCase.expected_decision_state &&
    adapterResult.policy_decision.automation_lane ===
      sampleCase.expected_automation_lane &&
    adapterResult.policy_decision.publish_candidate_allowed ===
      sampleCase.expected_publish_candidate_allowed &&
    adapterResult.policy_decision.blocked === sampleCase.expected_blocked &&
    adapterResult.policy_decision.real_auto_publish_allowed === false &&
    adapterResult.external_request_performed === false &&
    adapterResult.oauth_token_required_for_sample === false &&
    adapterResult.human_event_analysis_required === false
  );
}

export function runEventTicketingApiSourceAdapterSample(): EventTicketingApiSourceAdapterSampleSummary {
  const results = EVENT_TICKETING_API_SOURCE_ADAPTER_SAMPLE_CASES.map(
    (sampleCase) => {
      const adapterResult = adaptTicketingApiSourceToAutomationPolicy(
        sampleCase.input
      );

      return {
        case_key: sampleCase.case_key,
        provider_key: sampleCase.provider_key,
        description: sampleCase.description,
        adapter_result: adapterResult,
        matched_expected_decision: doesAdapterResultMatchSampleCase(
          sampleCase,
          adapterResult
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
    external_request_performed: false,
    oauth_token_required_for_sample: false,
    human_event_analysis_required: false,
    real_auto_publish_allowed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventTicketingApiSourceAdapterSample(): boolean {
  const summary = runEventTicketingApiSourceAdapterSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.external_request_performed === false &&
    summary.oauth_token_required_for_sample === false &&
    summary.human_event_analysis_required === false &&
    summary.real_auto_publish_allowed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_TICKETING_API_SOURCE_ADAPTER_SAMPLE_RESULT =
  runEventTicketingApiSourceAdapterSample();

export const EVENT_TICKETING_API_SOURCE_ADAPTER_SAMPLE_IS_VALID =
  validateEventTicketingApiSourceAdapterSample();