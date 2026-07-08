// src/app/api/official-events/_shared/eventCanonicalMigrationFileDraftSample.ts

import type {
  EventCanonicalMigrationFileDraftDecision,
  EventCanonicalMigrationFileDraftDecisionState,
  EventCanonicalMigrationFileDraftInput,
  EventCanonicalMigrationFileDraftLane,
  EventCanonicalMigrationFileDraftReason,
} from "./eventCanonicalMigrationFileDraft";

import { resolveEventCanonicalMigrationFileDraftDecision } from "./eventCanonicalMigrationFileDraft";

export type EventCanonicalMigrationFileDraftSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalMigrationFileDraftInput;
  expected_decision_state: EventCanonicalMigrationFileDraftDecisionState;
  expected_lane: EventCanonicalMigrationFileDraftLane;
  expected_reason: EventCanonicalMigrationFileDraftReason;
  expected_has_manifest: boolean;
  expected_should_create_local_review_draft_artifact_now: boolean;
  expected_can_prepare_real_migration_later: boolean;
};

export type EventCanonicalMigrationFileDraftSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalMigrationFileDraftDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalMigrationFileDraftSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  local_migration_file_draft_only: true;
  stored_outside_supabase_migrations: true;
  supabase_migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalMigrationFileDraftSampleResult[];
};

export const EVENT_CANONICAL_MIGRATION_FILE_DRAFT_SAMPLE_CASES: EventCanonicalMigrationFileDraftSampleCase[] =
  [
    {
      case_key: "authorized_local_migration_file_draft_ready",
      description:
        "Authorization is confirmed and the local migration file draft is ready for review outside supabase/migrations.",
      input: {
        authorization_gate_confirmed: true,
      },
      expected_decision_state: "local_migration_file_draft_ready",
      expected_lane: "local_migration_file_draft_lane",
      expected_reason:
        "authorized_local_migration_file_draft_ready_for_review_only",
      expected_has_manifest: true,
      expected_should_create_local_review_draft_artifact_now: true,
      expected_can_prepare_real_migration_later: true,
    },
    {
      case_key: "explicit_docs_migration_drafts_path_is_allowed",
      description:
        "A docs/migration-drafts path is allowed as a local review artifact.",
      input: {
        authorization_gate_confirmed: true,
        requested_output_path:
          "docs/migration-drafts/20260707120000_event_canonical_schema_v4_8_50.sql",
      },
      expected_decision_state: "local_migration_file_draft_ready",
      expected_lane: "local_migration_file_draft_lane",
      expected_reason:
        "authorized_local_migration_file_draft_ready_for_review_only",
      expected_has_manifest: true,
      expected_should_create_local_review_draft_artifact_now: true,
      expected_can_prepare_real_migration_later: true,
    },
    {
      case_key: "authorization_missing_blocks_draft",
      description:
        "The local migration file draft is blocked when authorization is not confirmed.",
      input: {},
      expected_decision_state: "blocked_authorization_not_confirmed",
      expected_lane: "authorization_dependency_block_lane",
      expected_reason: "authorization_gate_must_be_confirmed_before_draft",
      expected_has_manifest: false,
      expected_should_create_local_review_draft_artifact_now: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "supabase_migrations_path_is_blocked",
      description:
        "A supabase/migrations output path is blocked because this version cannot create a real Supabase migration file.",
      input: {
        authorization_gate_confirmed: true,
        requested_output_path:
          "supabase/migrations/20260707120000_event_canonical_schema_v4_8_50.sql",
      },
      expected_decision_state: "blocked_unsafe_supabase_migration_path",
      expected_lane: "supabase_migration_path_safety_block_lane",
      expected_reason: "supabase_migrations_output_path_not_allowed_for_draft",
      expected_has_manifest: false,
      expected_should_create_local_review_draft_artifact_now: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "real_supabase_migration_file_request_is_blocked",
      description:
        "A request to create a real Supabase migration file is blocked in this foundation version.",
      input: {
        authorization_gate_confirmed: true,
        allow_supabase_migration_file_creation: true,
      },
      expected_decision_state:
        "blocked_real_supabase_migration_file_requested",
      expected_lane: "real_supabase_migration_safety_block_lane",
      expected_reason: "real_supabase_migration_file_not_allowed_in_foundation",
      expected_has_manifest: false,
      expected_should_create_local_review_draft_artifact_now: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "supabase_apply_request_is_blocked",
      description:
        "A request to apply a Supabase migration is blocked.",
      input: {
        authorization_gate_confirmed: true,
        allow_apply_supabase_migration: true,
      },
      expected_decision_state: "blocked_supabase_apply_requested",
      expected_lane: "supabase_apply_safety_block_lane",
      expected_reason: "supabase_apply_not_allowed_in_foundation",
      expected_has_manifest: false,
      expected_should_create_local_review_draft_artifact_now: false,
      expected_can_prepare_real_migration_later: false,
    },
    {
      case_key: "database_write_request_is_blocked",
      description:
        "A request to write to the database is blocked.",
      input: {
        authorization_gate_confirmed: true,
        allow_database_write: true,
      },
      expected_decision_state: "blocked_database_write_requested",
      expected_lane: "database_write_safety_block_lane",
      expected_reason: "database_write_not_allowed_in_foundation",
      expected_has_manifest: false,
      expected_should_create_local_review_draft_artifact_now: false,
      expected_can_prepare_real_migration_later: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalMigrationFileDraftSampleCase,
  decision: EventCanonicalMigrationFileDraftDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.draft_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    Boolean(decision.manifest) === sampleCase.expected_has_manifest &&
    decision.should_create_local_review_draft_artifact_now ===
      sampleCase.expected_should_create_local_review_draft_artifact_now &&
    decision.can_prepare_real_migration_later ===
      sampleCase.expected_can_prepare_real_migration_later &&
    decision.should_create_supabase_migration_file_now === false &&
    decision.should_apply_supabase_migration_now === false &&
    decision.should_write_database_now === false &&
    decision.can_copy_to_supabase_migrations_now === false &&
    decision.can_apply_any_database_change === false &&
    decision.external_request_performed === false &&
    decision.supabase_migration_file_created === false &&
    decision.supabase_operation_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalMigrationFileDraftSample(): EventCanonicalMigrationFileDraftSampleSummary {
  const results = EVENT_CANONICAL_MIGRATION_FILE_DRAFT_SAMPLE_CASES.map(
    (sampleCase) => {
      const decision = resolveEventCanonicalMigrationFileDraftDecision(
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
    local_migration_file_draft_only: true,
    stored_outside_supabase_migrations: true,
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

export function validateEventCanonicalMigrationFileDraftSample(): boolean {
  const summary = runEventCanonicalMigrationFileDraftSample();

  return (
    summary.sample_case_count === 7 &&
    summary.valid_sample_case_count === 7 &&
    summary.invalid_sample_case_count === 0 &&
    summary.local_migration_file_draft_only === true &&
    summary.stored_outside_supabase_migrations === true &&
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

export const EVENT_CANONICAL_MIGRATION_FILE_DRAFT_SAMPLE_RESULT =
  runEventCanonicalMigrationFileDraftSample();

export const EVENT_CANONICAL_MIGRATION_FILE_DRAFT_SAMPLE_IS_VALID =
  validateEventCanonicalMigrationFileDraftSample();