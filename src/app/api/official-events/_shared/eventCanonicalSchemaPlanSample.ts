// src/app/api/official-events/_shared/eventCanonicalSchemaPlanSample.ts

import type {
  EventCanonicalSchemaPlanDecision,
  EventCanonicalSchemaPlanDecisionState,
  EventCanonicalSchemaPlanInput,
  EventCanonicalSchemaPlanLane,
  EventCanonicalSchemaPlanReason,
} from "./eventCanonicalSchemaPlan";

import { resolveEventCanonicalSchemaPlanDecision } from "./eventCanonicalSchemaPlan";

export type EventCanonicalSchemaPlanSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalSchemaPlanInput;
  expected_decision_state: EventCanonicalSchemaPlanDecisionState;
  expected_lane: EventCanonicalSchemaPlanLane;
  expected_reason: EventCanonicalSchemaPlanReason;
  expected_planned_table_count: number;
  expected_planned_relationship_count: number;
  expected_should_create_migration_file_now: false;
  expected_should_apply_supabase_migration_now: false;
  expected_should_write_database_now: false;
  expected_can_prepare_real_migration_later: boolean;
  expected_can_prepare_persistence_tables_later: boolean;
};

export type EventCanonicalSchemaPlanSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalSchemaPlanDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalSchemaPlanSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  schema_plan_only: true;
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalSchemaPlanSampleResult[];
};

export const EVENT_CANONICAL_SCHEMA_PLAN_SAMPLE_CASES: EventCanonicalSchemaPlanSampleCase[] =
  [
    {
      case_key: "default_schema_plan_without_feature_feed",
      description:
        "Default scope prepares canonical events, source traces and search documents without creating a migration.",
      input: {
        include_feature_feed_plan: false,
        allow_real_migration: false,
        allow_database_write: false,
      },
      expected_decision_state: "schema_plan_ready",
      expected_lane: "schema_contract_plan_lane",
      expected_reason: "canonical_schema_contract_ready_without_migration",
      expected_planned_table_count: 3,
      expected_planned_relationship_count: 2,
      expected_should_create_migration_file_now: false,
      expected_should_apply_supabase_migration_now: false,
      expected_should_write_database_now: false,
      expected_can_prepare_real_migration_later: true,
      expected_can_prepare_persistence_tables_later: true,
    },
    {
      case_key: "schema_plan_with_feature_feed_table",
      description:
        "Feature feed plan adds the future table for check-in, ticket intent, rides, meetups and radar feed references.",
      input: {
        include_feature_feed_plan: true,
        allow_real_migration: false,
        allow_database_write: false,
      },
      expected_decision_state: "schema_plan_ready",
      expected_lane: "schema_contract_plan_lane",
      expected_reason: "canonical_schema_contract_ready_without_migration",
      expected_planned_table_count: 4,
      expected_planned_relationship_count: 3,
      expected_should_create_migration_file_now: false,
      expected_should_apply_supabase_migration_now: false,
      expected_should_write_database_now: false,
      expected_can_prepare_real_migration_later: true,
      expected_can_prepare_persistence_tables_later: true,
    },
    {
      case_key: "search_document_scope_only",
      description:
        "A narrow requested scope can plan only canonical events and search documents.",
      input: {
        requested_table_scope: [
          "canonical_events",
          "canonical_event_search_documents",
        ],
        allow_real_migration: false,
        allow_database_write: false,
      },
      expected_decision_state: "schema_plan_ready",
      expected_lane: "schema_contract_plan_lane",
      expected_reason: "canonical_schema_contract_ready_without_migration",
      expected_planned_table_count: 2,
      expected_planned_relationship_count: 1,
      expected_should_create_migration_file_now: false,
      expected_should_apply_supabase_migration_now: false,
      expected_should_write_database_now: false,
      expected_can_prepare_real_migration_later: true,
      expected_can_prepare_persistence_tables_later: true,
    },
    {
      case_key: "real_migration_request_is_blocked",
      description:
        "A request to create or apply a real migration is blocked in this foundation version.",
      input: {
        include_feature_feed_plan: true,
        allow_real_migration: true,
        allow_database_write: false,
      },
      expected_decision_state: "blocked_real_migration_requested",
      expected_lane: "migration_safety_block_lane",
      expected_reason: "real_migration_not_allowed_in_foundation",
      expected_planned_table_count: 0,
      expected_planned_relationship_count: 0,
      expected_should_create_migration_file_now: false,
      expected_should_apply_supabase_migration_now: false,
      expected_should_write_database_now: false,
      expected_can_prepare_real_migration_later: false,
      expected_can_prepare_persistence_tables_later: false,
    },
    {
      case_key: "database_write_request_is_blocked",
      description:
        "A database write request is blocked even when the schema scope is valid.",
      input: {
        include_feature_feed_plan: false,
        allow_real_migration: false,
        allow_database_write: true,
      },
      expected_decision_state: "blocked_database_write_requested",
      expected_lane: "database_write_safety_block_lane",
      expected_reason: "database_write_not_allowed_in_foundation",
      expected_planned_table_count: 0,
      expected_planned_relationship_count: 0,
      expected_should_create_migration_file_now: false,
      expected_should_apply_supabase_migration_now: false,
      expected_should_write_database_now: false,
      expected_can_prepare_real_migration_later: false,
      expected_can_prepare_persistence_tables_later: false,
    },
    {
      case_key: "empty_table_scope_is_blocked",
      description:
        "An empty table scope is rejected because it cannot produce a meaningful schema plan.",
      input: {
        requested_table_scope: [],
        allow_real_migration: false,
        allow_database_write: false,
      },
      expected_decision_state: "blocked_empty_table_scope",
      expected_lane: "table_scope_block_lane",
      expected_reason: "requested_table_scope_is_empty",
      expected_planned_table_count: 0,
      expected_planned_relationship_count: 0,
      expected_should_create_migration_file_now: false,
      expected_should_apply_supabase_migration_now: false,
      expected_should_write_database_now: false,
      expected_can_prepare_real_migration_later: false,
      expected_can_prepare_persistence_tables_later: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalSchemaPlanSampleCase,
  decision: EventCanonicalSchemaPlanDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.schema_plan_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.planned_table_count === sampleCase.expected_planned_table_count &&
    decision.planned_relationship_count ===
      sampleCase.expected_planned_relationship_count &&
    decision.should_create_migration_file_now ===
      sampleCase.expected_should_create_migration_file_now &&
    decision.should_apply_supabase_migration_now ===
      sampleCase.expected_should_apply_supabase_migration_now &&
    decision.should_write_database_now ===
      sampleCase.expected_should_write_database_now &&
    decision.can_prepare_real_migration_later ===
      sampleCase.expected_can_prepare_real_migration_later &&
    decision.can_prepare_persistence_tables_later ===
      sampleCase.expected_can_prepare_persistence_tables_later &&
    decision.external_request_performed === false &&
    decision.migration_file_created === false &&
    decision.supabase_operation_performed === false &&
    decision.database_write_performed === false &&
    decision.human_event_analysis_required === false &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false
  );
}

export function runEventCanonicalSchemaPlanSample(): EventCanonicalSchemaPlanSampleSummary {
  const results = EVENT_CANONICAL_SCHEMA_PLAN_SAMPLE_CASES.map((sampleCase) => {
    const decision = resolveEventCanonicalSchemaPlanDecision(sampleCase.input);

    return {
      case_key: sampleCase.case_key,
      description: sampleCase.description,
      decision,
      matched_expected_decision: doesDecisionMatchSampleCase(
        sampleCase,
        decision
      ),
    };
  });

  const validSampleCaseCount = results.filter(
    (result) => result.matched_expected_decision
  ).length;

  return {
    sample_case_count: results.length,
    valid_sample_case_count: validSampleCaseCount,
    invalid_sample_case_count: results.length - validSampleCaseCount,
    schema_plan_only: true,
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

export function validateEventCanonicalSchemaPlanSample(): boolean {
  const summary = runEventCanonicalSchemaPlanSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.schema_plan_only === true &&
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

export const EVENT_CANONICAL_SCHEMA_PLAN_SAMPLE_RESULT =
  runEventCanonicalSchemaPlanSample();

export const EVENT_CANONICAL_SCHEMA_PLAN_SAMPLE_IS_VALID =
  validateEventCanonicalSchemaPlanSample();