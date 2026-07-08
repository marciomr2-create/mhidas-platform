// src/app/api/official-events/_shared/eventCanonicalMigrationFileStructuralReviewSample.ts

import type {
  EventCanonicalMigrationFileStructuralReviewDecision,
  EventCanonicalMigrationFileStructuralReviewDecisionState,
  EventCanonicalMigrationFileStructuralReviewInput,
  EventCanonicalMigrationFileStructuralReviewLane,
  EventCanonicalMigrationFileStructuralReviewReason,
} from "./eventCanonicalMigrationFileStructuralReview";

import { resolveEventCanonicalMigrationFileStructuralReviewDecision } from "./eventCanonicalMigrationFileStructuralReview";

export type EventCanonicalMigrationFileStructuralReviewSampleCase = {
  case_key: string;
  description: string;
  input: EventCanonicalMigrationFileStructuralReviewInput;
  expected_decision_state: EventCanonicalMigrationFileStructuralReviewDecisionState;
  expected_lane: EventCanonicalMigrationFileStructuralReviewLane;
  expected_reason: EventCanonicalMigrationFileStructuralReviewReason;
  expected_missing_required_check_count: number;
  expected_can_continue_future_review_later: boolean;
};

export type EventCanonicalMigrationFileStructuralReviewSampleResult = {
  case_key: string;
  description: string;
  decision: EventCanonicalMigrationFileStructuralReviewDecision;
  matched_expected_decision: boolean;
};

export type EventCanonicalMigrationFileStructuralReviewSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  structural_review_only: true;
  supabase_migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  all_sample_cases_valid: boolean;
  results: EventCanonicalMigrationFileStructuralReviewSampleResult[];
};

const VALID_MIGRATION_DRAFT_SQL = `
-- LOCAL MIGRATION FILE DRAFT ONLY.
-- Do not copy this file into supabase/migrations in this version.

create extension if not exists pgcrypto;

create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid(),
  is_100_percent_validated boolean not null default false,
  constraint canonical_events_validated_check check (is_100_percent_validated = true)
);

create table if not exists public.canonical_event_sources (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  constraint canonical_event_sources_unique_source unique (canonical_event_id, source_key)
);

create table if not exists public.canonical_event_search_documents (
  id uuid primary key default gen_random_uuid(),
  search_tokens text[] not null default array[]::text[]
);

create table if not exists public.canonical_event_feature_feeds (
  id uuid primary key default gen_random_uuid()
);

create index if not exists canonical_event_search_documents_tokens_gin_idx
  on public.canonical_event_search_documents using gin (search_tokens);

alter table public.canonical_events enable row level security;
alter table public.canonical_event_sources enable row level security;
alter table public.canonical_event_search_documents enable row level security;
alter table public.canonical_event_feature_feeds enable row level security;

-- Rollback review notes:
-- drop table if exists public.canonical_event_feature_feeds;
`;

const INCOMPLETE_MIGRATION_DRAFT_SQL = `
-- LOCAL MIGRATION FILE DRAFT ONLY.
create extension if not exists pgcrypto;
create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid()
);
`;

const UNSAFE_POLICY_SQL = `
${VALID_MIGRATION_DRAFT_SQL}
create policy unsafe_public_all on public.canonical_events for select using (true);
`;

export const EVENT_CANONICAL_MIGRATION_FILE_STRUCTURAL_REVIEW_SAMPLE_CASES: EventCanonicalMigrationFileStructuralReviewSampleCase[] =
  [
    {
      case_key: "valid_structure_with_authorization",
      description:
        "Authorized review with complete structure passes the local structural contract.",
      input: {
        authorization_gate_confirmed: true,
        sql_text: VALID_MIGRATION_DRAFT_SQL,
      },
      expected_decision_state: "structurally_valid_for_future_review",
      expected_lane: "migration_file_structural_review_lane",
      expected_reason: "migration_file_draft_structure_matches_required_contract",
      expected_missing_required_check_count: 0,
      expected_can_continue_future_review_later: true,
    },
    {
      case_key: "authorization_missing_blocks_review",
      description:
        "Even complete SQL cannot pass structural review if authorization is not confirmed.",
      input: {
        authorization_gate_confirmed: false,
        sql_text: VALID_MIGRATION_DRAFT_SQL,
      },
      expected_decision_state: "blocked_authorization_not_confirmed",
      expected_lane: "authorization_dependency_block_lane",
      expected_reason:
        "authorization_gate_must_be_confirmed_before_structural_review",
      expected_missing_required_check_count: 0,
      expected_can_continue_future_review_later: false,
    },
    {
      case_key: "incomplete_sql_holds_review",
      description:
        "Incomplete SQL is held because required structural items are missing.",
      input: {
        authorization_gate_confirmed: true,
        sql_text: INCOMPLETE_MIGRATION_DRAFT_SQL,
      },
      expected_decision_state: "hold_missing_required_structure",
      expected_lane: "structural_review_hold_lane",
      expected_reason: "migration_file_draft_structure_missing_required_items",
      expected_missing_required_check_count: 12,
      expected_can_continue_future_review_later: false,
    },
    {
      case_key: "unsafe_permissive_policy_holds_review",
      description:
        "A permissive RLS policy blocks the structural review.",
      input: {
        authorization_gate_confirmed: true,
        sql_text: UNSAFE_POLICY_SQL,
      },
      expected_decision_state: "hold_missing_required_structure",
      expected_lane: "structural_review_hold_lane",
      expected_reason: "migration_file_draft_structure_missing_required_items",
      expected_missing_required_check_count: 1,
      expected_can_continue_future_review_later: false,
    },
    {
      case_key: "copy_to_supabase_migrations_request_is_blocked",
      description:
        "Copying to supabase/migrations is blocked in this foundation version.",
      input: {
        authorization_gate_confirmed: true,
        sql_text: VALID_MIGRATION_DRAFT_SQL,
        allow_copy_to_supabase_migrations: true,
      },
      expected_decision_state: "blocked_copy_to_supabase_migrations_requested",
      expected_lane: "copy_to_supabase_migrations_safety_block_lane",
      expected_reason: "copy_to_supabase_migrations_not_allowed_in_foundation",
      expected_missing_required_check_count: 0,
      expected_can_continue_future_review_later: false,
    },
    {
      case_key: "supabase_apply_request_is_blocked",
      description:
        "Applying a Supabase migration is blocked in this foundation version.",
      input: {
        authorization_gate_confirmed: true,
        sql_text: VALID_MIGRATION_DRAFT_SQL,
        allow_apply_supabase_migration: true,
      },
      expected_decision_state: "blocked_supabase_apply_requested",
      expected_lane: "supabase_apply_safety_block_lane",
      expected_reason: "supabase_apply_not_allowed_in_foundation",
      expected_missing_required_check_count: 0,
      expected_can_continue_future_review_later: false,
    },
    {
      case_key: "database_write_request_is_blocked",
      description:
        "Writing to the database is blocked in this foundation version.",
      input: {
        authorization_gate_confirmed: true,
        sql_text: VALID_MIGRATION_DRAFT_SQL,
        allow_database_write: true,
      },
      expected_decision_state: "blocked_database_write_requested",
      expected_lane: "database_write_safety_block_lane",
      expected_reason: "database_write_not_allowed_in_foundation",
      expected_missing_required_check_count: 0,
      expected_can_continue_future_review_later: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventCanonicalMigrationFileStructuralReviewSampleCase,
  decision: EventCanonicalMigrationFileStructuralReviewDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.review_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.missing_required_checks.length ===
      sampleCase.expected_missing_required_check_count &&
    decision.can_continue_future_review_later ===
      sampleCase.expected_can_continue_future_review_later &&
    decision.should_create_supabase_migration_file_now === false &&
    decision.should_copy_to_supabase_migrations_now === false &&
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

export function runEventCanonicalMigrationFileStructuralReviewSample(): EventCanonicalMigrationFileStructuralReviewSampleSummary {
  const results =
    EVENT_CANONICAL_MIGRATION_FILE_STRUCTURAL_REVIEW_SAMPLE_CASES.map(
      (sampleCase) => {
        const decision =
          resolveEventCanonicalMigrationFileStructuralReviewDecision(
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
    structural_review_only: true,
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

export function validateEventCanonicalMigrationFileStructuralReviewSample(): boolean {
  const summary = runEventCanonicalMigrationFileStructuralReviewSample();

  return (
    summary.sample_case_count === 7 &&
    summary.valid_sample_case_count === 7 &&
    summary.invalid_sample_case_count === 0 &&
    summary.structural_review_only === true &&
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

export const EVENT_CANONICAL_MIGRATION_FILE_STRUCTURAL_REVIEW_SAMPLE_RESULT =
  runEventCanonicalMigrationFileStructuralReviewSample();

export const EVENT_CANONICAL_MIGRATION_FILE_STRUCTURAL_REVIEW_SAMPLE_IS_VALID =
  validateEventCanonicalMigrationFileStructuralReviewSample();