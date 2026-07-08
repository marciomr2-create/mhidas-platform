// src/app/api/official-events/_shared/eventCanonicalSearchIndexSample.ts

import type {
  EventCanonicalSearchIndexDecision,
  EventCanonicalSearchIndexDecisionState,
  EventCanonicalSearchIndexInput,
  EventCanonicalSearchIndexLane,
  EventCanonicalSearchIndexReason,
} from "./eventCanonicalSearchIndex";

import type { EventCanonicalIdentitySnapshot } from "./eventCanonicalDeduplication";

import { resolveEventCanonicalSearchIndexDecision } from "./eventCanonicalSearchIndex";

export type EventCanonicalSearchIndexSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalSearchIndexInput;
  expected_decision_state: EventCanonicalSearchIndexDecisionState;
  expected_lane: EventCanonicalSearchIndexLane;
  expected_reason: EventCanonicalSearchIndexReason;
  expected_should_create_search_document: boolean;
  expected_can_feed_internal_search_index: boolean;
  expected_can_feed_autocomplete: boolean;
  expected_can_feed_event_features: boolean;
  expected_can_feed_public_search: boolean;
  expected_should_attach_as_non_search_trace_only: boolean;
};

export type EventCanonicalSearchIndexSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalSearchIndexDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalSearchIndexSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  canonical_event_required_before_indexing: true;
  source_trace_should_be_preserved: true;
  canonical_record_required_before_public_search: true;
  external_request_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalSearchIndexSampleResult[];
};

const VALIDATED_CANONICAL_EVENT: EventCanonicalIdentitySnapshot = {
  internal_canonical_event_id: "canonical-stb-sp-2026",
  event_name: "Só Track Boa São Paulo",
  starts_at: "2026-12-12T22:00:00-03:00",
  venue_name: "Distrito Anhembi",
  city: "São Paulo",
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
    {
      source_key: "official-site-stb-sp-2026",
      source_kind: "official_event_site",
      provider_key: "official_event_site",
      external_event_id: "official-site-stb-sp-2026",
      source_url: "https://example.com/events/so-track-boa-sao-paulo-2026",
      authority_score: 90,
    },
  ],
};

export const EVENT_CANONICAL_SEARCH_INDEX_SAMPLE_CASES: EventCanonicalSearchIndexSampleCase[] =
  [
    {
      case_key: "validated_canonical_feeds_internal_search_and_features",
      description:
        "A fully validated canonical event becomes a local internal search document and can feed event features.",
      input: {
        canonical_event: VALIDATED_CANONICAL_EVENT,
        canonical_record_status: "validated_canonical",
        allow_event_feature_feeds: true,
        allow_public_search: false,
      },
      expected_decision_state: "index_validated_canonical_direct_search",
      expected_lane: "direct_internal_search_lane",
      expected_reason: "validated_canonical_ready",
      expected_should_create_search_document: true,
      expected_can_feed_internal_search_index: true,
      expected_can_feed_autocomplete: true,
      expected_can_feed_event_features: true,
      expected_can_feed_public_search: false,
      expected_should_attach_as_non_search_trace_only: false,
    },
    {
      case_key: "validated_canonical_candidate_internal_only",
      description:
        "A validated canonical candidate can feed internal search and autocomplete before public search is enabled.",
      input: {
        canonical_event: {
          event_name: "Festival Aurora Rio",
          starts_at: "2026-11-20T22:00:00-03:00",
          venue_name: "Marina da Glória",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "BR",
          official_url: "https://example.com/events/festival-aurora-rio",
          ticket_url: "https://example.com/tickets/festival-aurora-rio",
          external_event_id: "ticketing-aurora-rio-2026",
          provider_key: "ticketmaster",
          is_100_percent_validated: true,
          source_trace: [
            {
              source_key: "ticketmaster-api-aurora-rio-2026",
              source_kind: "authorized_ticketing_api",
              provider_key: "ticketmaster",
              external_event_id: "ticketing-aurora-rio-2026",
              source_url: "https://example.com/tickets/festival-aurora-rio",
              authority_score: 100,
            },
          ],
        },
        canonical_record_status: "canonical_candidate",
        allow_event_feature_feeds: false,
        allow_public_search: false,
      },
      expected_decision_state: "index_canonical_candidate_internal_only",
      expected_lane: "canonical_candidate_lane",
      expected_reason: "canonical_candidate_ready_internal_only",
      expected_should_create_search_document: true,
      expected_can_feed_internal_search_index: true,
      expected_can_feed_autocomplete: true,
      expected_can_feed_event_features: false,
      expected_can_feed_public_search: false,
      expected_should_attach_as_non_search_trace_only: false,
    },
    {
      case_key: "existing_canonical_reference_rebuilds_search_document",
      description:
        "An existing canonical reference can rebuild a local search document without calling external sources.",
      input: {
        canonical_event: VALIDATED_CANONICAL_EVENT,
        canonical_record_status: "existing_canonical_reference",
        allow_event_feature_feeds: true,
        allow_public_search: false,
      },
      expected_decision_state: "index_existing_canonical_reference",
      expected_lane: "existing_canonical_reference_lane",
      expected_reason: "existing_canonical_reference_ready",
      expected_should_create_search_document: true,
      expected_can_feed_internal_search_index: true,
      expected_can_feed_autocomplete: true,
      expected_can_feed_event_features: true,
      expected_can_feed_public_search: false,
      expected_should_attach_as_non_search_trace_only: false,
    },
    {
      case_key: "complementary_signal_is_trace_only",
      description:
        "A complementary signal should be preserved as trace and not become a separate search document.",
      input: {
        canonical_event: {
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
        canonical_record_status: "complementary_signal",
        allow_event_feature_feeds: false,
        allow_public_search: false,
      },
      expected_decision_state: "index_autocomplete_hold",
      expected_lane: "autocomplete_hold_lane",
      expected_reason: "complementary_signal_not_direct_search_source",
      expected_should_create_search_document: false,
      expected_can_feed_internal_search_index: false,
      expected_can_feed_autocomplete: false,
      expected_can_feed_event_features: false,
      expected_can_feed_public_search: false,
      expected_should_attach_as_non_search_trace_only: true,
    },
    {
      case_key: "missing_date_blocks_search_indexing",
      description:
        "A candidate without date cannot generate a search document.",
      input: {
        canonical_event: {
          event_name: "Festival Aurora Rio",
          venue_name: "Marina da Glória",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "BR",
          official_url: "https://example.com/events/festival-aurora-rio",
          ticket_url: "https://example.com/tickets/festival-aurora-rio",
          external_event_id: "ticketing-aurora-rio-2026",
          provider_key: "ticketmaster",
          is_100_percent_validated: true,
        },
        canonical_record_status: "validated_canonical",
        allow_event_feature_feeds: true,
        allow_public_search: false,
      },
      expected_decision_state: "blocked_missing_canonical_identity",
      expected_lane: "identity_block_lane",
      expected_reason: "missing_required_search_identity",
      expected_should_create_search_document: false,
      expected_can_feed_internal_search_index: false,
      expected_can_feed_autocomplete: false,
      expected_can_feed_event_features: false,
      expected_can_feed_public_search: false,
      expected_should_attach_as_non_search_trace_only: false,
    },
    {
      case_key: "unvalidated_signal_is_not_search_source",
      description:
        "An unvalidated signal cannot become a direct search source.",
      input: {
        canonical_event: {
          event_name: "Unknown Warehouse Night",
          starts_at: "2026-09-10T23:00:00-03:00",
          venue_name: "Warehouse",
          city: "São Paulo",
          state: "SP",
          country: "BR",
          official_url: "https://blog.example.com/unknown-warehouse-night",
          external_event_id: "editorial-unknown-warehouse-night",
          provider_key: "editorial_source",
          is_100_percent_validated: false,
        },
        canonical_record_status: "unvalidated_signal",
        allow_event_feature_feeds: false,
        allow_public_search: false,
      },
      expected_decision_state: "blocked_unvalidated_signal",
      expected_lane: "unvalidated_block_lane",
      expected_reason: "unvalidated_signal_not_search_source",
      expected_should_create_search_document: false,
      expected_can_feed_internal_search_index: false,
      expected_can_feed_autocomplete: false,
      expected_can_feed_event_features: false,
      expected_can_feed_public_search: false,
      expected_should_attach_as_non_search_trace_only: true,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalSearchIndexSampleCase,
  decision: EventCanonicalSearchIndexDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.search_index_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.should_create_search_document ===
      sampleCase.expected_should_create_search_document &&
    decision.can_feed_internal_search_index ===
      sampleCase.expected_can_feed_internal_search_index &&
    decision.can_feed_autocomplete ===
      sampleCase.expected_can_feed_autocomplete &&
    decision.can_feed_event_features ===
      sampleCase.expected_can_feed_event_features &&
    decision.can_feed_public_search ===
      sampleCase.expected_can_feed_public_search &&
    decision.should_attach_as_non_search_trace_only ===
      sampleCase.expected_should_attach_as_non_search_trace_only &&
    decision.source_trace_should_be_preserved === true &&
    decision.canonical_record_required_before_public_search === true &&
    decision.external_request_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalSearchIndexSample(): EventCanonicalSearchIndexSampleSummary {
  const results = EVENT_CANONICAL_SEARCH_INDEX_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalSearchIndexDecision(
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
    canonical_event_required_before_indexing: true,
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

export function validateEventCanonicalSearchIndexSample(): boolean {
  const summary = runEventCanonicalSearchIndexSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.canonical_event_required_before_indexing === true &&
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

export const EVENT_CANONICAL_SEARCH_INDEX_SAMPLE_RESULT =
  runEventCanonicalSearchIndexSample();

export const EVENT_CANONICAL_SEARCH_INDEX_SAMPLE_IS_VALID =
  validateEventCanonicalSearchIndexSample();