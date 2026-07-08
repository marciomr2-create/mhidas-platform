// src/app/api/official-events/_shared/eventCanonicalDeduplicationSample.ts

import type {
  EventCanonicalDeduplicationDecision,
  EventCanonicalDeduplicationDecisionState,
  EventCanonicalDeduplicationInput,
  EventCanonicalDeduplicationLane,
  EventCanonicalDeduplicationReason,
  EventCanonicalIdentitySnapshot,
} from "./eventCanonicalDeduplication";

import { resolveEventCanonicalDeduplicationDecision } from "./eventCanonicalDeduplication";

export type EventCanonicalDeduplicationSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalDeduplicationInput;
  expected_decision_state: EventCanonicalDeduplicationDecisionState;
  expected_lane: EventCanonicalDeduplicationLane;
  expected_reason: EventCanonicalDeduplicationReason;
  expected_should_create_new_canonical_event: boolean;
  expected_should_attach_to_existing_canonical_event: boolean;
  expected_is_duplicate_of_existing_canonical: boolean;
  expected_is_complementary_signal_for_existing_canonical: boolean;
  expected_candidate_can_become_direct_search_source: boolean;
};

export type EventCanonicalDeduplicationSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalDeduplicationDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalDeduplicationSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  canonical_events_are_internal_search_sources: true;
  source_trace_should_be_preserved: true;
  canonical_record_required_before_public_search: true;
  external_request_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalDeduplicationSampleResult[];
};

const CANONICAL_SAMPLE_EVENT: EventCanonicalIdentitySnapshot = {
  internal_canonical_event_id: "canonical-stb-sp-2026",
  event_name: "So Track Boa Sao Paulo",
  starts_at: "2026-12-12T22:00:00-03:00",
  venue_name: "Distrito Anhembi",
  city: "Sao Paulo",
  state: "SP",
  country: "BR",
  official_url: "https://example.com/events/so-track-boa-sao-paulo-2026",
  ticket_url: "https://example.com/tickets/so-track-boa-sao-paulo-2026",
  external_event_id: "ingresse-stb-sp-2026",
  provider_key: "ingresse",
  is_100_percent_validated: true,
  source_trace: [
    {
      source_key: "ingresse-api-stb-sp-2026",
      source_kind: "authorized_ticketing_api",
      provider_key: "ingresse",
      external_event_id: "ingresse-stb-sp-2026",
      source_url: "https://example.com/tickets/so-track-boa-sao-paulo-2026",
      authority_score: 100,
    },
  ],
};

export const EVENT_CANONICAL_DEDUPLICATION_SAMPLE_CASES: EventCanonicalDeduplicationSampleCase[] =
  [
    {
      case_key: "exact_external_id_attaches_to_existing_canonical",
      description:
        "A candidate with the same provider and external event id is attached to the existing canonical event.",
      input: {
        candidate_event: {
          event_name: "So Track Boa Sao Paulo",
          starts_at: "2026-12-12T22:00:00-03:00",
          venue_name: "Distrito Anhembi",
          city: "Sao Paulo",
          state: "SP",
          country: "BR",
          official_url: "https://example.com/events/so-track-boa-sao-paulo-2026",
          ticket_url: "https://example.com/tickets/so-track-boa-sao-paulo-2026",
          external_event_id: "ingresse-stb-sp-2026",
          provider_key: "ingresse",
          is_100_percent_validated: true,
        },
        existing_canonical_events: [CANONICAL_SAMPLE_EVENT],
      },
      expected_decision_state: "attach_to_existing_canonical",
      expected_lane: "canonical_direct_match_lane",
      expected_reason: "exact_external_id_match",
      expected_should_create_new_canonical_event: false,
      expected_should_attach_to_existing_canonical_event: true,
      expected_is_duplicate_of_existing_canonical: true,
      expected_is_complementary_signal_for_existing_canonical: false,
      expected_candidate_can_become_direct_search_source: false,
    },
    {
      case_key: "strong_identity_match_attaches_complementary_signal",
      description:
        "A strong official adjacent signal for the same event is attached as complementary source trace.",
      input: {
        candidate_event: {
          event_name: "Só Track Boa São Paulo",
          starts_at: "2026-12-12T21:00:00-03:00",
          venue_name: "Distrito Anhembi",
          city: "São Paulo",
          state: "SP",
          country: "BR",
          official_url: "https://official.example.com/stb-sp",
          ticket_url: "https://official.example.com/stb-sp/ingressos",
          external_event_id: "official-site-stb-sp-2026",
          provider_key: "official_event_site",
          is_100_percent_validated: false,
        },
        existing_canonical_events: [CANONICAL_SAMPLE_EVENT],
      },
      expected_decision_state: "attach_complementary_signal",
      expected_lane: "complementary_signal_lane",
      expected_reason: "strong_identity_similarity",
      expected_should_create_new_canonical_event: false,
      expected_should_attach_to_existing_canonical_event: true,
      expected_is_duplicate_of_existing_canonical: false,
      expected_is_complementary_signal_for_existing_canonical: true,
      expected_candidate_can_become_direct_search_source: false,
    },
    {
      case_key: "validated_new_event_becomes_new_canonical_candidate",
      description:
        "A 100 percent validated event with no existing canonical match can become a new internal canonical search source.",
      input: {
        candidate_event: {
          event_name: "Festival Aurora Rio",
          starts_at: "2026-11-20T22:00:00-03:00",
          venue_name: "Marina da Gloria",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "BR",
          official_url: "https://example.com/events/festival-aurora-rio",
          ticket_url: "https://example.com/tickets/festival-aurora-rio",
          external_event_id: "ticketing-aurora-rio-2026",
          provider_key: "ticketmaster",
          is_100_percent_validated: true,
        },
        existing_canonical_events: [CANONICAL_SAMPLE_EVENT],
      },
      expected_decision_state: "create_new_canonical_candidate",
      expected_lane: "new_canonical_candidate_lane",
      expected_reason: "no_existing_canonical_match",
      expected_should_create_new_canonical_event: true,
      expected_should_attach_to_existing_canonical_event: false,
      expected_is_duplicate_of_existing_canonical: false,
      expected_is_complementary_signal_for_existing_canonical: false,
      expected_candidate_can_become_direct_search_source: true,
    },
    {
      case_key: "missing_date_needs_more_identity_signals",
      description:
        "A candidate without event date cannot become canonical and must wait for more identity signals.",
      input: {
        candidate_event: {
          event_name: "Festival Aurora Rio",
          venue_name: "Marina da Gloria",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "BR",
          official_url: "https://example.com/events/festival-aurora-rio",
          ticket_url: "https://example.com/tickets/festival-aurora-rio",
          external_event_id: "ticketing-aurora-rio-2026",
          provider_key: "ticketmaster",
          is_100_percent_validated: true,
        },
        existing_canonical_events: [CANONICAL_SAMPLE_EVENT],
      },
      expected_decision_state: "needs_more_identity_signals",
      expected_lane: "identity_accumulation_lane",
      expected_reason: "missing_required_identity",
      expected_should_create_new_canonical_event: false,
      expected_should_attach_to_existing_canonical_event: false,
      expected_is_duplicate_of_existing_canonical: false,
      expected_is_complementary_signal_for_existing_canonical: false,
      expected_candidate_can_become_direct_search_source: false,
    },
    {
      case_key: "same_identity_different_date_blocks_conflict",
      description:
        "A high similarity event with conflicting date is blocked instead of attached or created.",
      input: {
        candidate_event: {
          event_name: "Só Track Boa São Paulo",
          starts_at: "2026-12-13T22:00:00-03:00",
          venue_name: "Distrito Anhembi",
          city: "São Paulo",
          state: "SP",
          country: "BR",
          official_url: "https://conflict.example.com/stb-sp",
          ticket_url: "https://conflict.example.com/stb-sp/ingressos",
          external_event_id: "conflict-stb-sp-2026",
          provider_key: "official_event_site",
          is_100_percent_validated: true,
        },
        existing_canonical_events: [CANONICAL_SAMPLE_EVENT],
      },
      expected_decision_state: "blocked_by_identity_conflict",
      expected_lane: "identity_conflict_block_lane",
      expected_reason: "critical_identity_conflict",
      expected_should_create_new_canonical_event: false,
      expected_should_attach_to_existing_canonical_event: false,
      expected_is_duplicate_of_existing_canonical: false,
      expected_is_complementary_signal_for_existing_canonical: false,
      expected_candidate_can_become_direct_search_source: false,
    },
    {
      case_key: "unvalidated_new_candidate_is_discarded",
      description:
        "A new candidate that is not 100 percent validated cannot become a direct internal search source.",
      input: {
        candidate_event: {
          event_name: "Unknown Warehouse Night",
          starts_at: "2026-09-10T23:00:00-03:00",
          venue_name: "Warehouse",
          city: "Sao Paulo",
          state: "SP",
          country: "BR",
          official_url: "https://blog.example.com/unknown-warehouse-night",
          ticket_url: null,
          external_event_id: "editorial-unknown-warehouse-night",
          provider_key: "editorial_source",
          is_100_percent_validated: false,
        },
        existing_canonical_events: [CANONICAL_SAMPLE_EVENT],
      },
      expected_decision_state: "discarded_unvalidated_candidate",
      expected_lane: "unvalidated_discard_lane",
      expected_reason: "candidate_not_validated_enough",
      expected_should_create_new_canonical_event: false,
      expected_should_attach_to_existing_canonical_event: false,
      expected_is_duplicate_of_existing_canonical: false,
      expected_is_complementary_signal_for_existing_canonical: false,
      expected_candidate_can_become_direct_search_source: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalDeduplicationSampleCase,
  decision: EventCanonicalDeduplicationDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.deduplication_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.should_create_new_canonical_event ===
      sampleCase.expected_should_create_new_canonical_event &&
    decision.should_attach_to_existing_canonical_event ===
      sampleCase.expected_should_attach_to_existing_canonical_event &&
    decision.is_duplicate_of_existing_canonical ===
      sampleCase.expected_is_duplicate_of_existing_canonical &&
    decision.is_complementary_signal_for_existing_canonical ===
      sampleCase.expected_is_complementary_signal_for_existing_canonical &&
    decision.candidate_can_become_direct_search_source ===
      sampleCase.expected_candidate_can_become_direct_search_source &&
    decision.source_trace_should_be_preserved === true &&
    decision.canonical_record_required_before_public_search === true &&
    decision.external_request_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalDeduplicationSample(): EventCanonicalDeduplicationSampleSummary {
  const results = EVENT_CANONICAL_DEDUPLICATION_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalDeduplicationDecision(
        sampleCase.input
      );

      return {
        case_key: sampleCase.case_key,
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
    canonical_events_are_internal_search_sources: true,
    source_trace_should_be_preserved: true,
    canonical_record_required_before_public_search: true,
    external_request_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventCanonicalDeduplicationSample(): boolean {
  const summary = runEventCanonicalDeduplicationSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.canonical_events_are_internal_search_sources === true &&
    summary.source_trace_should_be_preserved === true &&
    summary.canonical_record_required_before_public_search === true &&
    summary.external_request_performed === false &&
    summary.database_write_performed === false &&
    summary.human_event_analysis_required === false &&
    summary.real_auto_publish_enabled === false &&
    summary.real_auto_publish_allowed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_CANONICAL_DEDUPLICATION_SAMPLE_RESULT =
  runEventCanonicalDeduplicationSample();

export const EVENT_CANONICAL_DEDUPLICATION_SAMPLE_IS_VALID =
  validateEventCanonicalDeduplicationSample();