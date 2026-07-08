// src/app/api/official-events/_shared/eventCanonicalAdminConfirmationGuardSample.ts

import type {
  EventCanonicalAdminConfirmationGuardDecision,
  EventCanonicalAdminConfirmationGuardInput,
  EventCanonicalAdminConfirmationLane,
  EventCanonicalAdminConfirmationRecommendedAction,
  EventCanonicalAdminConfirmationState,
  EventCanonicalAdminFeatureGateProposal,
  EventCanonicalAdminSearchDocumentProposal,
  EventCanonicalAdminConfirmationSourceEvidence,
} from "./eventCanonicalAdminConfirmationGuard";

import { resolveEventCanonicalAdminConfirmationGuardDecision } from "./eventCanonicalAdminConfirmationGuard";

export type EventCanonicalAdminConfirmationGuardSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalAdminConfirmationGuardInput;
  expected_state: EventCanonicalAdminConfirmationState;
  expected_lane: EventCanonicalAdminConfirmationLane;
  expected_action: EventCanonicalAdminConfirmationRecommendedAction;
  expected_admin_can_confirm: boolean;
  expected_target_canonical_event_id: string | null;
};

export type EventCanonicalAdminConfirmationGuardSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalAdminConfirmationGuardDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalAdminConfirmationGuardSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  database_write_performed: false;
  supabase_operation_performed: false;
  route_created: false;
  runtime_change_performed: false;
  visual_change_performed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalAdminConfirmationGuardSampleResult[];
};

const STRONG_OFFICIAL_EVIDENCE: EventCanonicalAdminConfirmationSourceEvidence[] =
  [
    {
      source_key: "official-event-site",
      source_kind: "official_event_site",
      source_url: "https://example.com/event",
      authority_score: 95,
      is_official_source: true,
      supports_event_identity: true,
    },
    {
      source_key: "manual-admin-review",
      source_kind: "manual_admin_review",
      authority_score: 100,
      is_official_source: false,
      supports_event_identity: true,
    },
  ];

const SEARCH_DOCUMENT: EventCanonicalAdminSearchDocumentProposal = {
  search_title: "AME Club — Sao Paulo — 2026-08-15",
  normalized_title: "ame club sao paulo 2026 08 15",
  event_date_key: "2026-08-15",
  canonical_slug: "ame-club-2026-08-15-sao-paulo",
  city: "Sao Paulo",
  state: "SP",
  venue_name: "AME Club",
  artist_names: ["Vintage Culture"],
  genre_slugs: ["house", "tech-house"],
  search_tokens: [
    "ame",
    "club",
    "sao",
    "paulo",
    "vintage",
    "culture",
    "house",
    "tech-house",
  ],
};

const FEATURE_GATES: EventCanonicalAdminFeatureGateProposal[] = [
  { feature_key: "ticket_intent", enabled: true },
  { feature_key: "check_in", enabled: true },
  { feature_key: "rides", enabled: true },
  { feature_key: "meetups", enabled: true },
  { feature_key: "connections", enabled: true },
  { feature_key: "social_radar", enabled: true },
  { feature_key: "search_autocomplete", enabled: true },
];

const BASE_SAFE_INPUT: EventCanonicalAdminConfirmationGuardInput = {
  canonical_schema_ready: true,
  candidate_has_required_identity: true,
  canonical_identity_is_unique: true,
  source_evidence: STRONG_OFFICIAL_EVIDENCE,
  existing_canonical_matches: [],
  search_document_proposal: SEARCH_DOCUMENT,
  feature_gate_proposals: FEATURE_GATES,
  free_text_event_interaction_requested: false,
  admin_manual_choice_between_ambiguous_options_requested: false,
  social_feature_requested_before_canonical_event_id: false,
  ticketing_api_required_for_confirmation_now: false,
};

export const EVENT_CANONICAL_ADMIN_CONFIRMATION_GUARD_SAMPLE_CASES: EventCanonicalAdminConfirmationGuardSampleCase[] =
  [
    {
      case_key: "safe_create_canonical_event",
      description:
        "A single safe proposal with strong evidence can be confirmed as a new canonical event.",
      input: BASE_SAFE_INPUT,
      expected_state: "ready_for_admin_confirmation",
      expected_lane: "safe_admin_confirmation_lane",
      expected_action: "confirm_create_canonical_event",
      expected_admin_can_confirm: true,
      expected_target_canonical_event_id: null,
    },
    {
      case_key: "safe_update_existing_canonical_event",
      description:
        "A single exact existing canonical match can be updated instead of creating a duplicate.",
      input: {
        ...BASE_SAFE_INPUT,
        existing_canonical_matches: [
          {
            canonical_event_id: "11111111-1111-4111-8111-111111111111",
            identity_match_score: 96,
            same_name: true,
            same_date: true,
            same_city: true,
            same_state: true,
            same_venue: true,
            conflict_reasons: [],
          },
        ],
      },
      expected_state: "ready_for_admin_confirmation",
      expected_lane: "safe_admin_confirmation_lane",
      expected_action: "confirm_update_existing_canonical_event",
      expected_admin_can_confirm: true,
      expected_target_canonical_event_id:
        "11111111-1111-4111-8111-111111111111",
    },
    {
      case_key: "ambiguous_identity_blocks_confirmation",
      description:
        "Multiple plausible event identities block confirmation instead of asking the admin to guess.",
      input: {
        ...BASE_SAFE_INPUT,
        canonical_identity_is_unique: false,
        existing_canonical_matches: [
          {
            canonical_event_id: "22222222-2222-4222-8222-222222222222",
            identity_match_score: 84,
            same_name: true,
            same_date: false,
            same_city: true,
            same_state: true,
            same_venue: true,
            conflict_reasons: ["date_conflict"],
          },
          {
            canonical_event_id: "33333333-3333-4333-8333-333333333333",
            identity_match_score: 82,
            same_name: true,
            same_date: true,
            same_city: true,
            same_state: true,
            same_venue: false,
            conflict_reasons: ["venue_conflict"],
          },
        ],
      },
      expected_state: "blocked_ambiguous_identity",
      expected_lane: "canonical_identity_conflict_block_lane",
      expected_action: "block_ambiguous_identity",
      expected_admin_can_confirm: false,
      expected_target_canonical_event_id: null,
    },
    {
      case_key: "admin_manual_ambiguous_choice_is_blocked",
      description:
        "The admin is not allowed to choose manually between ambiguous options.",
      input: {
        ...BASE_SAFE_INPUT,
        admin_manual_choice_between_ambiguous_options_requested: true,
      },
      expected_state: "blocked_admin_manual_ambiguous_choice",
      expected_lane: "canonical_identity_conflict_block_lane",
      expected_action: "block_admin_manual_ambiguous_choice",
      expected_admin_can_confirm: false,
      expected_target_canonical_event_id: null,
    },
    {
      case_key: "free_text_event_interaction_is_blocked",
      description:
        "Social interaction from free text event input is blocked to prevent clubber fragmentation.",
      input: {
        ...BASE_SAFE_INPUT,
        free_text_event_interaction_requested: true,
      },
      expected_state: "blocked_free_text_event_interaction",
      expected_lane: "fragmentation_risk_block_lane",
      expected_action: "block_free_text_event_interaction",
      expected_admin_can_confirm: false,
      expected_target_canonical_event_id: null,
    },
    {
      case_key: "missing_search_document_holds_confirmation",
      description:
        "A canonical event cannot be confirmed for the product catalog without a search document proposal.",
      input: {
        ...BASE_SAFE_INPUT,
        search_document_proposal: null,
      },
      expected_state: "hold_missing_search_document",
      expected_lane: "catalog_discovery_hold_lane",
      expected_action: "hold_for_search_document",
      expected_admin_can_confirm: false,
      expected_target_canonical_event_id: null,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalAdminConfirmationGuardSampleCase,
  decision: EventCanonicalAdminConfirmationGuardDecision
): boolean {
  return (
    decision.confirmation_state === sampleCase.expected_state &&
    decision.confirmation_lane === sampleCase.expected_lane &&
    decision.recommended_action === sampleCase.expected_action &&
    decision.admin_can_confirm === sampleCase.expected_admin_can_confirm &&
    decision.target_canonical_event_id ===
      sampleCase.expected_target_canonical_event_id &&
    decision.admin_allowed_to_choose_between_ambiguous_options === false &&
    decision.canonical_event_id_required_for_social_features === true &&
    decision.free_text_event_interaction_allowed === false &&
    decision.search_document_required === true &&
    decision.feature_gates_required === true &&
    decision.should_allow_ticketing_api_dependency_now === false &&
    decision.database_write_performed === false &&
    decision.supabase_operation_performed === false &&
    decision.route_created === false &&
    decision.runtime_change_performed === false &&
    decision.visual_change_performed === false
  );
}

export function runEventCanonicalAdminConfirmationGuardSample(): EventCanonicalAdminConfirmationGuardSampleSummary {
  const results = EVENT_CANONICAL_ADMIN_CONFIRMATION_GUARD_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalAdminConfirmationGuardDecision(
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
    database_write_performed: false,
    supabase_operation_performed: false,
    route_created: false,
    runtime_change_performed: false,
    visual_change_performed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventCanonicalAdminConfirmationGuardSample(): boolean {
  const summary = runEventCanonicalAdminConfirmationGuardSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.database_write_performed === false &&
    summary.supabase_operation_performed === false &&
    summary.route_created === false &&
    summary.runtime_change_performed === false &&
    summary.visual_change_performed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_CANONICAL_ADMIN_CONFIRMATION_GUARD_SAMPLE_RESULT =
  runEventCanonicalAdminConfirmationGuardSample();

export const EVENT_CANONICAL_ADMIN_CONFIRMATION_GUARD_SAMPLE_IS_VALID =
  validateEventCanonicalAdminConfirmationGuardSample();