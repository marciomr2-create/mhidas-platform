// src/app/api/official-events/_shared/eventCanonicalSchemaRealMigrationValidationSample.ts

import type {
  EventCanonicalSchemaRealMigrationValidationDecision,
  EventCanonicalSchemaRealMigrationValidationInput,
  EventCanonicalSchemaRealMigrationValidationLane,
  EventCanonicalSchemaRealMigrationValidationReason,
  EventCanonicalSchemaRealMigrationValidationState,
} from "./eventCanonicalSchemaRealMigrationValidation";

import { resolveEventCanonicalSchemaRealMigrationValidationDecision } from "./eventCanonicalSchemaRealMigrationValidation";

export type EventCanonicalSchemaRealMigrationValidationSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalSchemaRealMigrationValidationInput;
  expected_validation_state: EventCanonicalSchemaRealMigrationValidationState;
  expected_lane: EventCanonicalSchemaRealMigrationValidationLane;
  expected_reason: EventCanonicalSchemaRealMigrationValidationReason;
  expected_should_apply_supabase_now: boolean;
  expected_can_continue_to_apply_step: boolean;
};

export type EventCanonicalSchemaRealMigrationValidationSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalSchemaRealMigrationValidationDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalSchemaRealMigrationValidationSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  external_request_performed: false;
  database_write_performed: false;
  runtime_change_performed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalSchemaRealMigrationValidationSampleResult[];
};

export const EVENT_CANONICAL_SCHEMA_REAL_MIGRATION_VALIDATION_SAMPLE_CASES: EventCanonicalSchemaRealMigrationValidationSampleCase[] =
  [
    {
      case_key: "ready_for_explicit_apply",
      description:
        "Migration file exists, backup is confirmed and explicit apply step is active.",
      input: {
        migration_file_exists: true,
        backup_reference_confirmed: true,
        explicit_supabase_apply_step: true,
      },
      expected_validation_state: "ready_for_supabase_apply",
      expected_lane: "schema_real_migration_apply_readiness_lane",
      expected_reason:
        "migration_file_and_backup_reference_are_ready_for_explicit_apply",
      expected_should_apply_supabase_now: true,
      expected_can_continue_to_apply_step: true,
    },
    {
      case_key: "missing_migration_file_holds",
      description:
        "Apply cannot proceed without the real migration file.",
      input: {
        migration_file_exists: false,
        backup_reference_confirmed: true,
        explicit_supabase_apply_step: true,
      },
      expected_validation_state: "hold_missing_migration_file",
      expected_lane: "migration_file_hold_lane",
      expected_reason: "migration_file_must_exist_before_apply",
      expected_should_apply_supabase_now: false,
      expected_can_continue_to_apply_step: false,
    },
    {
      case_key: "missing_backup_holds",
      description:
        "Apply cannot proceed without confirmed backup reference.",
      input: {
        migration_file_exists: true,
        backup_reference_confirmed: false,
        explicit_supabase_apply_step: true,
      },
      expected_validation_state: "hold_missing_backup_reference",
      expected_lane: "backup_reference_hold_lane",
      expected_reason: "backup_reference_must_be_confirmed_before_apply",
      expected_should_apply_supabase_now: false,
      expected_can_continue_to_apply_step: false,
    },
    {
      case_key: "apply_not_explicit_blocks_apply_but_allows_next_step",
      description:
        "The file can continue to the separate apply step, but this step cannot apply Supabase implicitly.",
      input: {
        migration_file_exists: true,
        backup_reference_confirmed: true,
        explicit_supabase_apply_step: false,
      },
      expected_validation_state: "blocked_supabase_apply_not_explicit",
      expected_lane: "supabase_apply_authorization_block_lane",
      expected_reason: "supabase_apply_requires_explicit_separate_step",
      expected_should_apply_supabase_now: false,
      expected_can_continue_to_apply_step: true,
    },
    {
      case_key: "runtime_change_is_blocked",
      description:
        "Runtime, route, visual or ticketing API changes are blocked in this schema migration step.",
      input: {
        migration_file_exists: true,
        backup_reference_confirmed: true,
        explicit_supabase_apply_step: true,
        allow_runtime_change: true,
      },
      expected_validation_state: "blocked_runtime_change_requested",
      expected_lane: "runtime_change_safety_block_lane",
      expected_reason: "runtime_changes_not_allowed_in_schema_migration_step",
      expected_should_apply_supabase_now: false,
      expected_can_continue_to_apply_step: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalSchemaRealMigrationValidationSampleCase,
  decision: EventCanonicalSchemaRealMigrationValidationDecision
): boolean {
  return (
    decision.validation_state === sampleCase.expected_validation_state &&
    decision.validation_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.should_apply_supabase_now ===
      sampleCase.expected_should_apply_supabase_now &&
    decision.can_continue_to_apply_step ===
      sampleCase.expected_can_continue_to_apply_step &&
    decision.should_change_runtime_now === false &&
    decision.should_create_route_now === false &&
    decision.should_change_visual_ui_now === false &&
    decision.should_integrate_ticketing_api_now === false &&
    decision.external_request_performed === false &&
    decision.database_write_performed === false &&
    decision.runtime_change_performed === false
  );
}

export function runEventCanonicalSchemaRealMigrationValidationSample(): EventCanonicalSchemaRealMigrationValidationSampleSummary {
  const results =
    EVENT_CANONICAL_SCHEMA_REAL_MIGRATION_VALIDATION_SAMPLE_CASES.map(
      (sampleCase) => {
        const decision =
          resolveEventCanonicalSchemaRealMigrationValidationDecision(
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
    external_request_performed: false,
    database_write_performed: false,
    runtime_change_performed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventCanonicalSchemaRealMigrationValidationSample(): boolean {
  const summary = runEventCanonicalSchemaRealMigrationValidationSample();

  return (
    summary.sample_case_count === 5 &&
    summary.valid_sample_case_count === 5 &&
    summary.invalid_sample_case_count === 0 &&
    summary.external_request_performed === false &&
    summary.database_write_performed === false &&
    summary.runtime_change_performed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_CANONICAL_SCHEMA_REAL_MIGRATION_VALIDATION_SAMPLE_RESULT =
  runEventCanonicalSchemaRealMigrationValidationSample();

export const EVENT_CANONICAL_SCHEMA_REAL_MIGRATION_VALIDATION_SAMPLE_IS_VALID =
  validateEventCanonicalSchemaRealMigrationValidationSample();