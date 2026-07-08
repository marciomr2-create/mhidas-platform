// src/app/api/official-events/_shared/eventCanonicalMigrationAuthorizationSample.ts

import type {
  EventCanonicalMigrationAuthorizationDecision,
  EventCanonicalMigrationAuthorizationDecisionState,
  EventCanonicalMigrationAuthorizationInput,
  EventCanonicalMigrationAuthorizationLane,
  EventCanonicalMigrationAuthorizationReason,
} from "./eventCanonicalMigrationAuthorization";

import { resolveEventCanonicalMigrationAuthorizationDecision } from "./eventCanonicalMigrationAuthorization";

export type EventCanonicalMigrationAuthorizationSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalMigrationAuthorizationInput;
  expected_decision_state: EventCanonicalMigrationAuthorizationDecisionState;
  expected_lane: EventCanonicalMigrationAuthorizationLane;
  expected_reason: EventCanonicalMigrationAuthorizationReason;
  expected_missing_requirement_count: number;
  expected_satisfied_requirement_count: number;
  expected_can_prepare_real_migration_file_later: boolean;
  expected_can_move_to_real_migration_file_draft_step: boolean;
};

export type EventCanonicalMigrationAuthorizationSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalMigrationAuthorizationDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalMigrationAuthorizationSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  authorization_gate_only: true;
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalMigrationAuthorizationSampleResult[];
};

const ALL_AUTHORIZATION_CONFIRMED: EventCanonicalMigrationAuthorizationInput = {
  readiness_gate_confirmed: true,
  owner_authorization_confirmed: true,
  migration_scope_frozen: true,
  backup_reference_recorded: true,
  rollback_authorization_confirmed: true,
  production_window_planned: true,
  post_migration_validation_planned: true,
  emergency_stop_acknowledged: true,
};

export const EVENT_CANONICAL_MIGRATION_AUTHORIZATION_SAMPLE_CASES: EventCanonicalMigrationAuthorizationSampleCase[] =
  [
    {
      case_key: "all_authorization_confirmed",
      description:
        "All authorization requirements are confirmed, allowing a future migration file draft step without creating a migration now.",
      input: ALL_AUTHORIZATION_CONFIRMED,
      expected_decision_state:
        "authorized_for_future_migration_file_preparation",
      expected_lane: "future_migration_authorization_lane",
      expected_reason:
        "all_authorization_requirements_confirmed_for_future_migration_file_preparation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_file_later: true,
      expected_can_move_to_real_migration_file_draft_step: true,
    },
    {
      case_key: "readiness_gate_missing_blocks_authorization",
      description:
        "Authorization cannot proceed if the v4.8.48 readiness gate is not confirmed.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        readiness_gate_confirmed: false,
      },
      expected_decision_state: "blocked_readiness_not_confirmed",
      expected_lane: "readiness_dependency_block_lane",
      expected_reason: "readiness_gate_must_be_confirmed_before_authorization",
      expected_missing_requirement_count: 1,
      expected_satisfied_requirement_count: 7,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
    {
      case_key: "owner_authorization_missing_holds_authorization",
      description:
        "Missing owner authorization holds the future migration file preparation step.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        owner_authorization_confirmed: false,
      },
      expected_decision_state: "hold_missing_authorization",
      expected_lane: "authorization_hold_lane",
      expected_reason:
        "authorization_requirements_missing_for_future_migration_file_preparation",
      expected_missing_requirement_count: 1,
      expected_satisfied_requirement_count: 7,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
    {
      case_key: "backup_reference_missing_holds_authorization",
      description:
        "Missing backup reference holds migration authorization.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        backup_reference_recorded: false,
      },
      expected_decision_state: "hold_missing_authorization",
      expected_lane: "authorization_hold_lane",
      expected_reason:
        "authorization_requirements_missing_for_future_migration_file_preparation",
      expected_missing_requirement_count: 1,
      expected_satisfied_requirement_count: 7,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
    {
      case_key: "production_window_and_emergency_stop_missing_hold_authorization",
      description:
        "Missing production window and emergency stop acknowledgement hold authorization.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        production_window_planned: false,
        emergency_stop_acknowledged: false,
      },
      expected_decision_state: "hold_missing_authorization",
      expected_lane: "authorization_hold_lane",
      expected_reason:
        "authorization_requirements_missing_for_future_migration_file_preparation",
      expected_missing_requirement_count: 2,
      expected_satisfied_requirement_count: 6,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
    {
      case_key: "real_migration_request_is_blocked",
      description:
        "Even with all authorization requirements confirmed, creating a real migration is blocked in this foundation version.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        allow_create_real_migration: true,
      },
      expected_decision_state: "blocked_real_migration_requested",
      expected_lane: "real_migration_safety_block_lane",
      expected_reason: "real_migration_creation_not_allowed_in_foundation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
    {
      case_key: "supabase_apply_request_is_blocked",
      description:
        "Applying a Supabase migration is blocked in this foundation version.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        allow_apply_supabase_migration: true,
      },
      expected_decision_state: "blocked_supabase_apply_requested",
      expected_lane: "supabase_apply_safety_block_lane",
      expected_reason: "supabase_apply_not_allowed_in_foundation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
    {
      case_key: "database_write_request_is_blocked",
      description:
        "Writing to the database is blocked in this foundation version.",
      input: {
        ...ALL_AUTHORIZATION_CONFIRMED,
        allow_database_write: true,
      },
      expected_decision_state: "blocked_database_write_requested",
      expected_lane: "database_write_safety_block_lane",
      expected_reason: "database_write_not_allowed_in_foundation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_file_later: false,
      expected_can_move_to_real_migration_file_draft_step: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalMigrationAuthorizationSampleCase,
  decision: EventCanonicalMigrationAuthorizationDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.authorization_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.missing_requirements.length ===
      sampleCase.expected_missing_requirement_count &&
    decision.satisfied_requirements.length ===
      sampleCase.expected_satisfied_requirement_count &&
    decision.can_prepare_real_migration_file_later ===
      sampleCase.expected_can_prepare_real_migration_file_later &&
    decision.can_move_to_real_migration_file_draft_step ===
      sampleCase.expected_can_move_to_real_migration_file_draft_step &&
    decision.can_apply_any_database_change === false &&
    decision.should_create_migration_file_now === false &&
    decision.should_apply_supabase_migration_now === false &&
    decision.should_write_database_now === false &&
    decision.external_request_performed === false &&
    decision.migration_file_created === false &&
    decision.supabase_operation_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalMigrationAuthorizationSample(): EventCanonicalMigrationAuthorizationSampleSummary {
  const results = EVENT_CANONICAL_MIGRATION_AUTHORIZATION_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalMigrationAuthorizationDecision(
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
    authorization_gate_only: true,
    migration_file_created: false,
    supabase_operation_performed: false,
    database_write_performed: false,
    external_request_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventCanonicalMigrationAuthorizationSample(): boolean {
  const summary = runEventCanonicalMigrationAuthorizationSample();

  return (
    summary.sample_case_count === 8 &&
    summary.valid_sample_case_count === 8 &&
    summary.invalid_sample_case_count === 0 &&
    summary.authorization_gate_only === true &&
    summary.migration_file_created === false &&
    summary.supabase_operation_performed === false &&
    summary.database_write_performed === false &&
    summary.external_request_performed === false &&
    summary.human_event_analysis_required === false &&
    summary.real_auto_publish_enabled === false &&
    summary.real_auto_publish_allowed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_CANONICAL_MIGRATION_AUTHORIZATION_SAMPLE_RESULT =
  runEventCanonicalMigrationAuthorizationSample();

export const EVENT_CANONICAL_MIGRATION_AUTHORIZATION_SAMPLE_IS_VALID =
  validateEventCanonicalMigrationAuthorizationSample();