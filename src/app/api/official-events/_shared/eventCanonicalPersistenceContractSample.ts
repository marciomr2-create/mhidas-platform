// src/app/api/official-events/_shared/eventCanonicalPersistenceContractSample.ts

import type { EventCanonicalIdentitySnapshot } from "./eventCanonicalDeduplication";
import type { EventCanonicalSearchIndexDocument } from "./eventCanonicalSearchIndex";

import type {
  EventCanonicalPersistenceDecision,
  EventCanonicalPersistenceDecisionState,
  EventCanonicalPersistenceInput,
  EventCanonicalPersistenceLane,
  EventCanonicalPersistenceReason,
} from "./eventCanonicalPersistenceContract";

import { resolveEventCanonicalPersistenceDecision } from "./eventCanonicalPersistenceContract";

export type EventCanonicalPersistenceContractSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalPersistenceInput;
  expected_decision_state: EventCanonicalPersistenceDecisionState;
  expected_lane: EventCanonicalPersistenceLane;
  expected_reason: EventCanonicalPersistenceReason;
  expected_should_prepare_persistence_plan: boolean;
  expected_should_hold_for_more_identity: boolean;
  expected_should_block_persistence: boolean;
  expected_can_create_canonical_event: boolean;
  expected_can_update_existing_canonical_event: boolean;
  expected_can_attach_source_trace: boolean;
  expected_can_sync_search_document: boolean;
};

export type EventCanonicalPersistenceContractSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalPersistenceDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalPersistenceContractSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  persistence_contract_only: true;
  source_trace_should_be_preserved: true;
  search_document_should_be_preserved: true;
  external_request_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalPersistenceContractSampleResult[];
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

const VALIDATED_SEARCH_DOCUMENT: EventCanonicalSearchIndexDocument = {
  canonical_event_id: "canonical-stb-sp-2026",
  search_title: "Só Track Boa São Paulo",
  normalized_title: "so track boa sao paulo",
  starts_at: "2026-12-12T22:00:00-03:00",
  event_date_key: "2026-12-12",
  venue_name: "Distrito Anhembi",
  city: "São Paulo",
  state: "SP",
  country: "BR",
  official_url: "https://example.com/events/so-track-boa-sao-paulo-2026",
  ticket_url: "https://example.com/tickets/so-track-boa-sao-paulo-2026",
  canonical_slug_seed: "so-track-boa-sao-paulo-2026-12-12-sao-paulo-sp",
  search_tokens: [
    "so",
    "track",
    "boa",
    "sao",
    "paulo",
    "distrito",
    "anhembi",
    "sp",
    "br",
  ],
  source_trace_summary: {
    source_count: 2,
    strongest_source_kind: "authorized_ticketing_api",
    provider_keys: ["ingresse", "official_event_site"],
    external_event_ids: ["ingresse-stb-sp-2026", "official-site-stb-sp-2026"],
    source_urls: [
      "https://example.com/tickets/so-track-boa-sao-paulo-2026",
      "https://example.com/events/so-track-boa-sao-paulo-2026",
    ],
    authority_score_max: 100,
  },
  availability_scope: ["internal_search", "autocomplete", "event_features"],
  search_rank_score: 100,
};

const COMPLEMENTARY_SIGNAL_EVENT: EventCanonicalIdentitySnapshot = {
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
  source_trace: [
    {
      source_key: "official-site-stb-sp-2026",
      source_kind: "official_event_site",
      provider_key: "official_event_site",
      external_event_id: "official-site-stb-sp-2026",
      source_url: "https://official.example.com/stb-sp",
      authority_score: 90,
    },
  ],
};

export const EVENT_CANONICAL_PERSISTENCE_CONTRACT_SAMPLE_CASES: EventCanonicalPersistenceContractSampleCase[] =
  [
    {
      case_key: "validated_new_canonical_event_prepares_create_plan",
      description:
        "A validated canonical event with search document prepares a future create persistence plan without writing to the database.",
      input: {
        canonical_event: {
          ...VALIDATED_CANONICAL_EVENT,
          internal_canonical_event_id: null,
        },
        search_document: VALIDATED_SEARCH_DOCUMENT,
        persistence_intent: "create_new_canonical_event",
        allow_database_write: false,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "prepare_create_canonical_event_plan",
      expected_lane: "canonical_create_plan_lane",
      expected_reason:
        "validated_new_canonical_event_ready_for_planned_persistence",
      expected_should_prepare_persistence_plan: true,
      expected_should_hold_for_more_identity: false,
      expected_should_block_persistence: false,
      expected_can_create_canonical_event: true,
      expected_can_update_existing_canonical_event: false,
      expected_can_attach_source_trace: true,
      expected_can_sync_search_document: true,
    },
    {
      case_key: "validated_existing_canonical_event_prepares_update_plan",
      description:
        "A validated existing canonical event prepares a future update plan and preserves source trace and search document.",
      input: {
        canonical_event: VALIDATED_CANONICAL_EVENT,
        search_document: VALIDATED_SEARCH_DOCUMENT,
        persistence_intent: "update_existing_canonical_event",
        existing_canonical_event_id: "canonical-stb-sp-2026",
        allow_database_write: false,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "prepare_update_existing_canonical_event_plan",
      expected_lane: "canonical_update_plan_lane",
      expected_reason:
        "validated_existing_canonical_event_ready_for_planned_update",
      expected_should_prepare_persistence_plan: true,
      expected_should_hold_for_more_identity: false,
      expected_should_block_persistence: false,
      expected_can_create_canonical_event: false,
      expected_can_update_existing_canonical_event: true,
      expected_can_attach_source_trace: true,
      expected_can_sync_search_document: true,
    },
    {
      case_key: "complementary_signal_prepares_source_trace_attach_plan",
      description:
        "A complementary signal can prepare a source trace attach plan for an existing canonical event without becoming a canonical event itself.",
      input: {
        canonical_event: COMPLEMENTARY_SIGNAL_EVENT,
        persistence_intent: "attach_source_trace_to_existing_canonical",
        existing_canonical_event_id: "canonical-stb-sp-2026",
        allow_database_write: false,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "prepare_attach_source_trace_plan",
      expected_lane: "source_trace_attach_plan_lane",
      expected_reason: "source_trace_ready_to_attach_to_existing_canonical",
      expected_should_prepare_persistence_plan: true,
      expected_should_hold_for_more_identity: false,
      expected_should_block_persistence: false,
      expected_can_create_canonical_event: false,
      expected_can_update_existing_canonical_event: false,
      expected_can_attach_source_trace: true,
      expected_can_sync_search_document: false,
    },
    {
      case_key: "validated_search_document_prepares_sync_plan",
      description:
        "A validated canonical event can prepare a search document sync plan without writing to a search table.",
      input: {
        canonical_event: VALIDATED_CANONICAL_EVENT,
        search_document: VALIDATED_SEARCH_DOCUMENT,
        persistence_intent: "sync_search_document",
        existing_canonical_event_id: "canonical-stb-sp-2026",
        allow_database_write: false,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "prepare_search_document_sync_plan",
      expected_lane: "search_document_sync_plan_lane",
      expected_reason: "search_document_ready_for_planned_sync",
      expected_should_prepare_persistence_plan: true,
      expected_should_hold_for_more_identity: false,
      expected_should_block_persistence: false,
      expected_can_create_canonical_event: false,
      expected_can_update_existing_canonical_event: false,
      expected_can_attach_source_trace: false,
      expected_can_sync_search_document: true,
    },
    {
      case_key: "missing_date_holds_for_more_identity",
      description:
        "A canonical candidate missing date cannot prepare a persistence plan.",
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
        persistence_intent: "create_new_canonical_event",
        allow_database_write: false,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "hold_missing_required_identity",
      expected_lane: "identity_hold_lane",
      expected_reason: "missing_required_persistence_identity",
      expected_should_prepare_persistence_plan: false,
      expected_should_hold_for_more_identity: true,
      expected_should_block_persistence: false,
      expected_can_create_canonical_event: false,
      expected_can_update_existing_canonical_event: false,
      expected_can_attach_source_trace: false,
      expected_can_sync_search_document: false,
    },
    {
      case_key: "unvalidated_candidate_blocks_canonical_persistence",
      description:
        "An unvalidated candidate cannot prepare a canonical persistence plan.",
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
        persistence_intent: "create_new_canonical_event",
        allow_database_write: false,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "blocked_unvalidated_canonical_event",
      expected_lane: "validation_block_lane",
      expected_reason: "candidate_not_validated_enough_for_canonical_persistence",
      expected_should_prepare_persistence_plan: false,
      expected_should_hold_for_more_identity: false,
      expected_should_block_persistence: true,
      expected_can_create_canonical_event: false,
      expected_can_update_existing_canonical_event: false,
      expected_can_attach_source_trace: false,
      expected_can_sync_search_document: false,
    },
    {
      case_key: "real_database_write_request_is_blocked",
      description:
        "Even a valid canonical event cannot perform real database writes in this foundation version.",
      input: {
        canonical_event: VALIDATED_CANONICAL_EVENT,
        search_document: VALIDATED_SEARCH_DOCUMENT,
        persistence_intent: "update_existing_canonical_event",
        existing_canonical_event_id: "canonical-stb-sp-2026",
        allow_database_write: true,
        allow_real_auto_publish: false,
      },
      expected_decision_state: "blocked_real_write_not_enabled",
      expected_lane: "real_write_safety_block_lane",
      expected_reason: "real_database_write_not_allowed_in_foundation",
      expected_should_prepare_persistence_plan: false,
      expected_should_hold_for_more_identity: false,
      expected_should_block_persistence: true,
      expected_can_create_canonical_event: false,
      expected_can_update_existing_canonical_event: false,
      expected_can_attach_source_trace: false,
      expected_can_sync_search_document: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalPersistenceContractSampleCase,
  decision: EventCanonicalPersistenceDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.persistence_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.should_prepare_persistence_plan ===
      sampleCase.expected_should_prepare_persistence_plan &&
    decision.should_hold_for_more_identity ===
      sampleCase.expected_should_hold_for_more_identity &&
    decision.should_block_persistence ===
      sampleCase.expected_should_block_persistence &&
    decision.can_create_canonical_event_after_real_write_enablement ===
      sampleCase.expected_can_create_canonical_event &&
    decision.can_update_existing_canonical_event_after_real_write_enablement ===
      sampleCase.expected_can_update_existing_canonical_event &&
    decision.can_attach_source_trace_after_real_write_enablement ===
      sampleCase.expected_can_attach_source_trace &&
    decision.can_sync_search_document_after_real_write_enablement ===
      sampleCase.expected_can_sync_search_document &&
    decision.source_trace_should_be_preserved === true &&
    decision.search_document_should_be_preserved === true &&
    decision.external_request_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalPersistenceContractSample(): EventCanonicalPersistenceContractSampleSummary {
  const results = EVENT_CANONICAL_PERSISTENCE_CONTRACT_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalPersistenceDecision(
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
    persistence_contract_only: true,
    source_trace_should_be_preserved: true,
    search_document_should_be_preserved: true,
    external_request_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventCanonicalPersistenceContractSample(): boolean {
  const summary = runEventCanonicalPersistenceContractSample();

  return (
    summary.sample_case_count === 7 &&
    summary.valid_sample_case_count === 7 &&
    summary.invalid_sample_case_count === 0 &&
    summary.persistence_contract_only === true &&
    summary.source_trace_should_be_preserved === true &&
    summary.search_document_should_be_preserved === true &&
    summary.external_request_performed === false &&
    summary.database_write_performed === false &&
    summary.human_event_analysis_required === false &&
    summary.real_auto_publish_enabled === false &&
    summary.real_auto_publish_allowed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_CANONICAL_PERSISTENCE_CONTRACT_SAMPLE_RESULT =
  runEventCanonicalPersistenceContractSample();

export const EVENT_CANONICAL_PERSISTENCE_CONTRACT_SAMPLE_IS_VALID =
  validateEventCanonicalPersistenceContractSample();