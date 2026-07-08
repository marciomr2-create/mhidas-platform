// src/app/api/official-events/_shared/eventCanonicalMigrationDraftSample.ts

import type {
  EventCanonicalMigrationDraftDecision,
  EventCanonicalMigrationDraftDecisionState,
  EventCanonicalMigrationDraftInput,
  EventCanonicalMigrationDraftLane,
  EventCanonicalMigrationDraftReason,
} from "./eventCanonicalMigrationDraft";

import { resolveEventCanonicalMigrationDraftDecision } from "./eventCanonicalMigrationDraft";

export type EventCanonicalMigrationDraftSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalMigrationDraftInput;
  expected_decision_state: EventCanonicalMigrationDraftDecisionState;
  expected_lane: EventCanonicalMigrationDraftLane;
  expected_reason: EventCanonicalMigrationDraftReason;
  expected_has_draft: boolean;
  expected_statement_count: number;
  expected_rollback_statement_count: number;
  expected_can_review_sql_draft_locally: boolean;
  expected_can_prepare_real_migration_later: boolean;
};

export type EventCanonicalMigrationDraftSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalMigrationDraftDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalMigrationDraftSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  local_sql_draft_only: true;
  supabase_migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalMigrationDraftSampleResult[];
};

export const EVENT_CANONICAL_MIGRATION_DRAFT_SAMPLE_CASES: EventCanonicalMigrationDraftSampleCase[] =
  [
    {
      case_key: "local_sql_draft_ready_for_review",
      description:
        "Default input prepares a local SQL draft for review outside supabase/migrations.",
      input: {},
      expected_decision_state: "local_sql_draft_ready",
      expected_lane: "local_sql_review_draft_lane",
      expected_reason: "canonical_schema_sql_draft_ready_for_review_only",
      expected_has_draft: true,
      expected_statement_count: 11,
      expected_rollback_statement_count: 4,
      expected_can_review_sql_draft_locally: true,
      expected_can_prepare_real_migration_later: true,
    },
    {
      case_key: "explicit_docs_sql_draft_path_is_allowed",
      description:
        "A docs/sql-drafts output path remains a local review artifact and not a Supabase migration file.",
      input: {
        requested_output_path:
          "docs/sql-drafts/EVENT_CANONICAL_SCHEMA_DRAFT_V4_8_47.sql",
      },
      expected_decision_state: "local_sql_draft_ready",
      expected_lane: "local_sql_review_draft_lane",
      expected_reason: "canonical_schema_sql_draft_ready_for_review_only",
      expected_has_draft: true,
      expected_statement_count: 11,
      expected_rollback_statement_count: 4,
      expected_can_review_sql_draft_locally: true,
      expected_can_prepare_real_migration_later: true,
    },
    {
      case_key: "supabase_migrations_output_path_is_blocked",
      description:
        "A direct supabase/migrations path is blocked because this version must not create an applicable migration.",
      input: {
        requested_output_path:
          "supabase/migrations/20260707120000_event_canonical_schema.sql",
      },
      expected_decision_state: "blocked_unsafe_output_path",
      expected_lane: "output_path_safety_block_lane",
      expected_reason: "output_path_must_not_be_supabase_migrations",
      expected_has_draft: false,
      expected_statement_count: 0,
      expected_rollback_statement_count: 0,
      expected_can_review_sql_draft_locally: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "supabase_migration_file_request_is_blocked",
      description:
        "A request to create a Supabase migration file is blocked in this foundation version.",
      input: {
        allow_supabase_migration_file: true,
      },
      expected_decision_state: "blocked_supabase_migration_file_requested",
      expected_lane: "supabase_migration_safety_block_lane",
      expected_reason: "supabase_migration_file_not_allowed_in_foundation",
      expected_has_draft: false,
      expected_statement_count: 0,
      expected_rollback_statement_count: 0,
      expected_can_review_sql_draft_locally: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "supabase_apply_request_is_blocked",
      description:
        "A request to apply a Supabase migration is blocked.",
      input: {
        allow_apply_supabase_migration: true,
      },
      expected_decision_state: "blocked_supabase_apply_requested",
      expected_lane: "supabase_migration_safety_block_lane",
      expected_reason: "supabase_apply_not_allowed_in_foundation",
      expected_has_draft: false,
      expected_statement_count: 0,
      expected_rollback_statement_count: 0,
      expected_can_review_sql_draft_locally: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "database_write_request_is_blocked",
      description:
        "A database write request is blocked even though the draft SQL is available.",
      input: {
        allow_database_write: true,
      },
      expected_decision_state: "blocked_database_write_requested",
      expected_lane: "database_write_safety_block_lane",
      expected_reason: "database_write_not_allowed_in_foundation",
      expected_has_draft: false,
      expected_statement_count: 0,
      expected_rollback_statement_count: 0,
      expected_can_review_sql_draft_locally: false,
      expected_can_prepare_real_migration_later: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalMigrationDraftSampleCase,
  decision: EventCanonicalMigrationDraftDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.migration_draft_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    Boolean(decision.draft) === sampleCase.expected_has_draft &&
    (decision.draft?.statements.length ?? 0) ===
      sampleCase.expected_statement_count &&
    (decision.draft?.rollback_statements.length ?? 0) ===
      sampleCase.expected_rollback_statement_count &&
    decision.can_review_sql_draft_locally ===
      sampleCase.expected_can_review_sql_draft_locally &&
    decision.can_prepare_real_migration_later ===
      sampleCase.expected_can_prepare_real_migration_later &&
    decision.should_create_supabase_migration_file_now === false &&
    decision.should_apply_supabase_migration_now === false &&
    decision.should_write_database_now === false &&
    decision.external_request_performed === false &&
    decision.supabase_migration_file_created === false &&
    decision.supabase_operation_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalMigrationDraftSample(): EventCanonicalMigrationDraftSampleSummary {
  const results = EVENT_CANONICAL_MIGRATION_DRAFT_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalMigrationDraftDecision(
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
    local_sql_draft_only: true,
    supabase_migration_file_created: false,
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

export function validateEventCanonicalMigrationDraftSample(): boolean {
  const summary = runEventCanonicalMigrationDraftSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.local_sql_draft_only === true &&
    summary.supabase_migration_file_created === false &&
    summary.supabase_operation_performed === false &&
    summary.database_write_performed === false &&
    summary.external_request_performed === false &&
    summary.human_event_analysis_required === false &&
    summary.real_auto_publish_enabled === false &&
    summary.real_auto_publish_allowed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_CANONICAL_MIGRATION_DRAFT_SAMPLE_RESULT =
  runEventCanonicalMigrationDraftSample();

export const EVENT_CANONICAL_MIGRATION_DRAFT_SAMPLE_IS_VALID =
  validateEventCanonicalMigrationDraftSample();