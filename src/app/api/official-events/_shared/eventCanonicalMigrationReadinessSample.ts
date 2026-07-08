// src/app/api/official-events/_shared/eventCanonicalMigrationReadinessSample.ts

import type {
  EventCanonicalMigrationReadinessDecision,
  EventCanonicalMigrationReadinessDecisionState,
  EventCanonicalMigrationReadinessInput,
  EventCanonicalMigrationReadinessLane,
  EventCanonicalMigrationReadinessReason,
} from "./eventCanonicalMigrationReadiness";

import { resolveEventCanonicalMigrationReadinessDecision } from "./eventCanonicalMigrationReadiness";

export type EventCanonicalMigrationReadinessSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalMigrationReadinessInput;
  expected_decision_state: EventCanonicalMigrationReadinessDecisionState;
  expected_lane: EventCanonicalMigrationReadinessLane;
  expected_reason: EventCanonicalMigrationReadinessReason;
  expected_missing_requirement_count: number;
  expected_satisfied_requirement_count: number;
  expected_can_prepare_real_migration_later: boolean;
  expected_can_move_to_real_migration_authorization_step: boolean;
};

export type EventCanonicalMigrationReadinessSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalMigrationReadinessDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalMigrationReadinessSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  readiness_gate_only: true;
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalMigrationReadinessSampleResult[];
};

const ALL_REQUIREMENTS_CONFIRMED: EventCanonicalMigrationReadinessInput = {
  database_backup_confirmed: true,
  migration_sql_reviewed: true,
  rls_policy_reviewed: true,
  service_role_write_path_reviewed: true,
  admin_write_path_reviewed: true,
  supabase_diff_reviewed: true,
  build_validation_passed: true,
  rollback_plan_reviewed: true,
};

export const EVENT_CANONICAL_MIGRATION_READINESS_SAMPLE_CASES: EventCanonicalMigrationReadinessSampleCase[] =
  [
    {
      case_key: "all_preconditions_confirmed",
      description:
        "All required preconditions are confirmed, so the system can move to a future real migration authorization step without creating a migration now.",
      input: ALL_REQUIREMENTS_CONFIRMED,
      expected_decision_state:
        "ready_for_future_real_migration_preparation",
      expected_lane: "migration_readiness_gate_lane",
      expected_reason:
        "all_required_preconditions_confirmed_for_future_migration_preparation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_later: true,
      expected_can_move_to_real_migration_authorization_step: true,
    },
    {
      case_key: "missing_backup_holds_readiness",
      description:
        "Missing database backup blocks migration readiness.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        database_backup_confirmed: false,
      },
      expected_decision_state: "hold_missing_required_readiness",
      expected_lane: "readiness_hold_lane",
      expected_reason:
        "required_preconditions_missing_for_future_migration_preparation",
      expected_missing_requirement_count: 1,
      expected_satisfied_requirement_count: 7,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
    {
      case_key: "missing_rls_and_service_role_holds_readiness",
      description:
        "Missing RLS and service role review blocks migration readiness.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        rls_policy_reviewed: false,
        service_role_write_path_reviewed: false,
      },
      expected_decision_state: "hold_missing_required_readiness",
      expected_lane: "readiness_hold_lane",
      expected_reason:
        "required_preconditions_missing_for_future_migration_preparation",
      expected_missing_requirement_count: 2,
      expected_satisfied_requirement_count: 6,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
    {
      case_key: "missing_build_validation_holds_readiness",
      description:
        "Missing build validation blocks migration readiness.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        build_validation_passed: false,
      },
      expected_decision_state: "hold_missing_required_readiness",
      expected_lane: "readiness_hold_lane",
      expected_reason:
        "required_preconditions_missing_for_future_migration_preparation",
      expected_missing_requirement_count: 1,
      expected_satisfied_requirement_count: 7,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
    {
      case_key: "missing_rollback_plan_holds_readiness",
      description:
        "Missing rollback review blocks migration readiness.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        rollback_plan_reviewed: false,
      },
      expected_decision_state: "hold_missing_required_readiness",
      expected_lane: "readiness_hold_lane",
      expected_reason:
        "required_preconditions_missing_for_future_migration_preparation",
      expected_missing_requirement_count: 1,
      expected_satisfied_requirement_count: 7,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
    {
      case_key: "real_migration_request_is_blocked",
      description:
        "Even with all readiness requirements confirmed, creating a real migration is blocked in this foundation version.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        allow_create_real_migration: true,
      },
      expected_decision_state: "blocked_real_migration_requested",
      expected_lane: "real_migration_safety_block_lane",
      expected_reason: "real_migration_creation_not_allowed_in_foundation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
    {
      case_key: "supabase_apply_request_is_blocked",
      description:
        "Applying a Supabase migration is blocked in this foundation version.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        allow_apply_supabase_migration: true,
      },
      expected_decision_state: "blocked_supabase_apply_requested",
      expected_lane: "supabase_apply_safety_block_lane",
      expected_reason: "supabase_apply_not_allowed_in_foundation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
    {
      case_key: "database_write_request_is_blocked",
      description:
        "Writing to the database is blocked in this foundation version.",
      input: {
        ...ALL_REQUIREMENTS_CONFIRMED,
        allow_database_write: true,
      },
      expected_decision_state: "blocked_database_write_requested",
      expected_lane: "database_write_safety_block_lane",
      expected_reason: "database_write_not_allowed_in_foundation",
      expected_missing_requirement_count: 0,
      expected_satisfied_requirement_count: 8,
      expected_can_prepare_real_migration_later: false,
      expected_can_move_to_real_migration_authorization_step: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalMigrationReadinessSampleCase,
  decision: EventCanonicalMigrationReadinessDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.readiness_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.missing_requirements.length ===
      sampleCase.expected_missing_requirement_count &&
    decision.satisfied_requirements.length ===
      sampleCase.expected_satisfied_requirement_count &&
    decision.can_prepare_real_migration_later ===
      sampleCase.expected_can_prepare_real_migration_later &&
    decision.can_move_to_real_migration_authorization_step ===
      sampleCase.expected_can_move_to_real_migration_authorization_step &&
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

export function runEventCanonicalMigrationReadinessSample(): EventCanonicalMigrationReadinessSampleSummary {
  const results = EVENT_CANONICAL_MIGRATION_READINESS_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalMigrationReadinessDecision(
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
    readiness_gate_only: true,
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

export function validateEventCanonicalMigrationReadinessSample(): boolean {
  const summary = runEventCanonicalMigrationReadinessSample();

  return (
    summary.sample_case_count === 8 &&
    summary.valid_sample_case_count === 8 &&
    summary.invalid_sample_case_count === 0 &&
    summary.readiness_gate_only === true &&
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

export const EVENT_CANONICAL_MIGRATION_READINESS_SAMPLE_RESULT =
  runEventCanonicalMigrationReadinessSample();

export const EVENT_CANONICAL_MIGRATION_READINESS_SAMPLE_IS_VALID =
  validateEventCanonicalMigrationReadinessSample();