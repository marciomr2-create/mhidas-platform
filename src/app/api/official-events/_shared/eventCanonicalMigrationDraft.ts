// src/app/api/official-events/_shared/eventCanonicalMigrationDraft.ts

export type EventCanonicalMigrationDraftDecisionState =
  | "local_sql_draft_ready"
  | "blocked_supabase_migration_file_requested"
  | "blocked_supabase_apply_requested"
  | "blocked_database_write_requested"
  | "blocked_unsafe_output_path";

export type EventCanonicalMigrationDraftLane =
  | "local_sql_review_draft_lane"
  | "supabase_migration_safety_block_lane"
  | "database_write_safety_block_lane"
  | "output_path_safety_block_lane";

export type EventCanonicalMigrationDraftReason =
  | "canonical_schema_sql_draft_ready_for_review_only"
  | "supabase_migration_file_not_allowed_in_foundation"
  | "supabase_apply_not_allowed_in_foundation"
  | "database_write_not_allowed_in_foundation"
  | "output_path_must_not_be_supabase_migrations";

export type EventCanonicalMigrationDraftStatementKind =
  | "extension_plan"
  | "table_plan"
  | "index_plan"
  | "trigger_plan"
  | "rls_plan"
  | "rollback_plan"
  | "comment_plan";

export type EventCanonicalMigrationDraftTableKey =
  | "canonical_events"
  | "canonical_event_sources"
  | "canonical_event_search_documents"
  | "canonical_event_feature_feeds";

export type EventCanonicalMigrationDraftSafetyFlag =
  | "local_sql_draft_only"
  | "supabase_migration_file_not_created"
  | "supabase_operation_not_performed"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required"
  | "sql_is_review_draft_not_execution_instruction"
  | "draft_file_must_stay_outside_supabase_migrations"
  | "future_backup_required_before_real_migration"
  | "future_rls_review_required_before_real_migration"
  | "future_service_role_policy_required_before_real_migration"
  | "future_supabase_diff_required_before_real_migration"
  | "future_build_required_before_real_migration"
  | "rollback_plan_included"
  | "supabase_migration_request_blocked"
  | "supabase_apply_request_blocked"
  | "database_write_request_blocked"
  | "unsafe_output_path_blocked";

export type EventCanonicalMigrationDraftStatement = {
  statement_key: string;
  statement_kind: EventCanonicalMigrationDraftStatementKind;
  depends_on: string[];
  target_table: EventCanonicalMigrationDraftTableKey | null;
  sql: string;
  review_note: string;
};

export type EventCanonicalMigrationDraft = {
  draft_key: string;
  draft_version: "v4.8.47";
  local_review_sql_path: "docs/sql-drafts/EVENT_CANONICAL_SCHEMA_DRAFT_V4_8_47.sql";
  planned_tables: EventCanonicalMigrationDraftTableKey[];
  statements: EventCanonicalMigrationDraftStatement[];
  rollback_statements: EventCanonicalMigrationDraftStatement[];
  is_real_migration: false;
  is_supabase_migration_file: false;
  can_be_applied_without_future_review: false;
  requires_future_backup_before_real_migration: true;
  requires_future_rls_review_before_real_migration: true;
  requires_future_service_role_policy_before_real_migration: true;
  requires_future_supabase_diff_before_real_migration: true;
  requires_future_build_before_real_migration: true;
};

export type EventCanonicalMigrationDraftInput = {
  requested_output_path?: string | null;
  allow_supabase_migration_file?: boolean | null;
  allow_apply_supabase_migration?: boolean | null;
  allow_database_write?: boolean | null;
};

export type EventCanonicalMigrationDraftDecision = {
  decision_state: EventCanonicalMigrationDraftDecisionState;
  migration_draft_lane: EventCanonicalMigrationDraftLane;
  reason: EventCanonicalMigrationDraftReason;
  draft: EventCanonicalMigrationDraft | null;
  requested_output_path: string;
  should_create_supabase_migration_file_now: false;
  should_apply_supabase_migration_now: false;
  should_write_database_now: false;
  can_review_sql_draft_locally: boolean;
  can_prepare_real_migration_later: boolean;
  safety_flags: EventCanonicalMigrationDraftSafetyFlag[];
  external_request_performed: false;
  supabase_migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

const LOCAL_REVIEW_SQL_PATH =
  "docs/sql-drafts/EVENT_CANONICAL_SCHEMA_DRAFT_V4_8_47.sql" as const;

const PLANNED_TABLES: EventCanonicalMigrationDraftTableKey[] = [
  "canonical_events",
  "canonical_event_sources",
  "canonical_event_search_documents",
  "canonical_event_feature_feeds",
];

function normalizePath(value: string | null | undefined): string {
  return (value ?? LOCAL_REVIEW_SQL_PATH).replace(/\\/g, "/").trim();
}

function isUnsafeSupabaseMigrationPath(path: string): boolean {
  return (
    path === "supabase/migrations" ||
    path.startsWith("supabase/migrations/") ||
    path.includes("/supabase/migrations/")
  );
}

function statement(
  statementKey: string,
  statementKind: EventCanonicalMigrationDraftStatementKind,
  dependsOn: string[],
  targetTable: EventCanonicalMigrationDraftTableKey | null,
  sql: string,
  reviewNote: string
): EventCanonicalMigrationDraftStatement {
  return {
    statement_key: statementKey,
    statement_kind: statementKind,
    depends_on: dependsOn,
    target_table: targetTable,
    sql,
    review_note: reviewNote,
  };
}

export function buildEventCanonicalMigrationDraftStatements(): EventCanonicalMigrationDraftStatement[] {
  return [
    statement(
      "extension_pgcrypto_plan",
      "extension_plan",
      [],
      null,
      "create extension if not exists pgcrypto;",
      "Review whether pgcrypto is already enabled in the Supabase project before a real migration."
    ),
    statement(
      "canonical_events_table_plan",
      "table_plan",
      ["extension_pgcrypto_plan"],
      "canonical_events",
      `create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  normalized_event_name text not null,
  starts_at timestamptz not null,
  event_date_key date not null,
  venue_name text,
  city text,
  state text,
  country text,
  official_url text,
  ticket_url text,
  primary_provider_key text,
  primary_external_event_id text,
  is_100_percent_validated boolean not null default false,
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_events_validated_check check (is_100_percent_validated = true),
  constraint canonical_events_authority_reference_check check (
    official_url is not null
    or ticket_url is not null
    or primary_external_event_id is not null
  )
);`,
      "The validation check is intentionally strict because only 100% validated canonical events should persist here."
    ),
    statement(
      "canonical_event_sources_table_plan",
      "table_plan",
      ["canonical_events_table_plan"],
      "canonical_event_sources",
      `create table if not exists public.canonical_event_sources (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  source_key text not null,
  source_kind text not null,
  provider_key text,
  external_event_id text,
  source_url text,
  authority_score integer not null default 0,
  source_payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint canonical_event_sources_authority_score_check check (
    authority_score >= 0 and authority_score <= 100
  ),
  constraint canonical_event_sources_unique_source unique (canonical_event_id, source_key)
);`,
      "The source trace table preserves origin evidence and prevents duplicate source attachments."
    ),
    statement(
      "canonical_event_search_documents_table_plan",
      "table_plan",
      ["canonical_events_table_plan"],
      "canonical_event_search_documents",
      `create table if not exists public.canonical_event_search_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null unique references public.canonical_events(id) on delete cascade,
  search_title text not null,
  normalized_title text not null,
  event_date_key date not null,
  canonical_slug_seed text not null,
  search_tokens text[] not null default array[]::text[],
  availability_scope text[] not null default array[]::text[],
  search_rank_score integer not null default 0,
  source_trace_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`,
      "The search document remains separated so search/autocomplete can evolve without mutating the canonical event record."
    ),
    statement(
      "canonical_event_feature_feeds_table_plan",
      "table_plan",
      ["canonical_events_table_plan"],
      "canonical_event_feature_feeds",
      `create table if not exists public.canonical_event_feature_feeds (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  feed_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_event_feature_feeds_unique_feature unique (canonical_event_id, feature_key)
);`,
      "Feature feed rows should remain disabled by default until each consumer is explicitly wired."
    ),
    statement(
      "canonical_events_identity_indexes_plan",
      "index_plan",
      ["canonical_events_table_plan"],
      "canonical_events",
      `create index if not exists canonical_events_identity_lookup_idx
  on public.canonical_events (normalized_event_name, event_date_key, city, state);

create unique index if not exists canonical_events_primary_external_source_idx
  on public.canonical_events (primary_provider_key, primary_external_event_id)
  where primary_provider_key is not null and primary_external_event_id is not null;`,
      "Indexes support deduplication and provider-idempotent canonical lookup."
    ),
    statement(
      "canonical_event_sources_indexes_plan",
      "index_plan",
      ["canonical_event_sources_table_plan"],
      "canonical_event_sources",
      `create index if not exists canonical_event_sources_event_id_idx
  on public.canonical_event_sources (canonical_event_id);

create index if not exists canonical_event_sources_kind_idx
  on public.canonical_event_sources (source_kind);

create index if not exists canonical_event_sources_provider_external_idx
  on public.canonical_event_sources (provider_key, external_event_id);`,
      "Indexes support source trace explanation and future matching."
    ),
    statement(
      "canonical_event_search_documents_indexes_plan",
      "index_plan",
      ["canonical_event_search_documents_table_plan"],
      "canonical_event_search_documents",
      `create index if not exists canonical_event_search_documents_lookup_idx
  on public.canonical_event_search_documents (normalized_title, event_date_key, search_rank_score desc);

create index if not exists canonical_event_search_documents_tokens_gin_idx
  on public.canonical_event_search_documents using gin (search_tokens);`,
      "Search indexes are draft-only and must be reviewed against actual query patterns before migration."
    ),
    statement(
      "canonical_event_feature_feeds_indexes_plan",
      "index_plan",
      ["canonical_event_feature_feeds_table_plan"],
      "canonical_event_feature_feeds",
      `create index if not exists canonical_event_feature_feeds_event_id_idx
  on public.canonical_event_feature_feeds (canonical_event_id);

create index if not exists canonical_event_feature_feeds_feature_key_idx
  on public.canonical_event_feature_feeds (feature_key);`,
      "Feature feed indexes support future check-in, ticket intent, rides, meetups and radar consumers."
    ),
    statement(
      "rls_enablement_plan",
      "rls_plan",
      [
        "canonical_events_table_plan",
        "canonical_event_sources_table_plan",
        "canonical_event_search_documents_table_plan",
        "canonical_event_feature_feeds_table_plan",
      ],
      null,
      `alter table public.canonical_events enable row level security;
alter table public.canonical_event_sources enable row level security;
alter table public.canonical_event_search_documents enable row level security;
alter table public.canonical_event_feature_feeds enable row level security;`,
      "RLS enablement is only a draft. Real policies must be written and reviewed before any real migration."
    ),
    statement(
      "rls_policy_placeholder_plan",
      "rls_plan",
      ["rls_enablement_plan"],
      null,
      `-- Draft placeholder only.
-- Before a real migration, define explicit policies for:
-- 1. service_role writes from controlled official-events pipeline;
-- 2. admin reads/writes from protected admin routes;
-- 3. public reads only after canonical publication policy is approved.
-- No permissive policy is included in this draft.`,
      "No permissive RLS policy is intentionally generated by this foundation."
    ),
  ];
}

export function buildEventCanonicalMigrationDraftRollbackStatements(): EventCanonicalMigrationDraftStatement[] {
  return [
    statement(
      "rollback_drop_canonical_event_feature_feeds",
      "rollback_plan",
      [],
      "canonical_event_feature_feeds",
      "drop table if exists public.canonical_event_feature_feeds;",
      "Rollback order starts with feature feeds because they depend on canonical events."
    ),
    statement(
      "rollback_drop_canonical_event_search_documents",
      "rollback_plan",
      ["rollback_drop_canonical_event_feature_feeds"],
      "canonical_event_search_documents",
      "drop table if exists public.canonical_event_search_documents;",
      "Search documents depend on canonical events."
    ),
    statement(
      "rollback_drop_canonical_event_sources",
      "rollback_plan",
      ["rollback_drop_canonical_event_search_documents"],
      "canonical_event_sources",
      "drop table if exists public.canonical_event_sources;",
      "Source traces depend on canonical events."
    ),
    statement(
      "rollback_drop_canonical_events",
      "rollback_plan",
      ["rollback_drop_canonical_event_sources"],
      "canonical_events",
      "drop table if exists public.canonical_events;",
      "Canonical events are dropped last."
    ),
  ];
}

export function buildEventCanonicalMigrationDraft(): EventCanonicalMigrationDraft {
  return {
    draft_key: "event-canonical-migration-draft-v4-8-47",
    draft_version: "v4.8.47",
    local_review_sql_path: LOCAL_REVIEW_SQL_PATH,
    planned_tables: PLANNED_TABLES,
    statements: buildEventCanonicalMigrationDraftStatements(),
    rollback_statements: buildEventCanonicalMigrationDraftRollbackStatements(),
    is_real_migration: false,
    is_supabase_migration_file: false,
    can_be_applied_without_future_review: false,
    requires_future_backup_before_real_migration: true,
    requires_future_rls_review_before_real_migration: true,
    requires_future_service_role_policy_before_real_migration: true,
    requires_future_supabase_diff_before_real_migration: true,
    requires_future_build_before_real_migration: true,
  };
}

function buildSafetyFlags(args: {
  supabaseMigrationRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
  unsafeOutputPathBlocked: boolean;
}): EventCanonicalMigrationDraftSafetyFlag[] {
  const flags: EventCanonicalMigrationDraftSafetyFlag[] = [
    "local_sql_draft_only",
    "supabase_migration_file_not_created",
    "supabase_operation_not_performed",
    "database_write_not_performed",
    "external_request_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
    "sql_is_review_draft_not_execution_instruction",
    "draft_file_must_stay_outside_supabase_migrations",
    "future_backup_required_before_real_migration",
    "future_rls_review_required_before_real_migration",
    "future_service_role_policy_required_before_real_migration",
    "future_supabase_diff_required_before_real_migration",
    "future_build_required_before_real_migration",
    "rollback_plan_included",
  ];

  if (args.supabaseMigrationRequestedButBlocked) {
    flags.push("supabase_migration_request_blocked");
  }

  if (args.supabaseApplyRequestedButBlocked) {
    flags.push("supabase_apply_request_blocked");
  }

  if (args.databaseWriteRequestedButBlocked) {
    flags.push("database_write_request_blocked");
  }

  if (args.unsafeOutputPathBlocked) {
    flags.push("unsafe_output_path_blocked");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventCanonicalMigrationDraftDecisionState;
  lane: EventCanonicalMigrationDraftLane;
  reason: EventCanonicalMigrationDraftReason;
  requestedOutputPath: string;
  draft: EventCanonicalMigrationDraft | null;
  canReviewSqlDraftLocally: boolean;
  canPrepareRealMigrationLater: boolean;
  supabaseMigrationRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
  unsafeOutputPathBlocked: boolean;
}): EventCanonicalMigrationDraftDecision {
  return {
    decision_state: args.decisionState,
    migration_draft_lane: args.lane,
    reason: args.reason,
    draft: args.draft,
    requested_output_path: args.requestedOutputPath,
    should_create_supabase_migration_file_now: false,
    should_apply_supabase_migration_now: false,
    should_write_database_now: false,
    can_review_sql_draft_locally: args.canReviewSqlDraftLocally,
    can_prepare_real_migration_later: args.canPrepareRealMigrationLater,
    safety_flags: buildSafetyFlags({
      supabaseMigrationRequestedButBlocked:
        args.supabaseMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked: args.supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked: args.databaseWriteRequestedButBlocked,
      unsafeOutputPathBlocked: args.unsafeOutputPathBlocked,
    }),
    external_request_performed: false,
    supabase_migration_file_created: false,
    supabase_operation_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalMigrationDraftDecision(
  input: EventCanonicalMigrationDraftInput = {}
): EventCanonicalMigrationDraftDecision {
  const requestedOutputPath = normalizePath(input.requested_output_path);
  const supabaseMigrationRequestedButBlocked =
    input.allow_supabase_migration_file === true;
  const supabaseApplyRequestedButBlocked =
    input.allow_apply_supabase_migration === true;
  const databaseWriteRequestedButBlocked = input.allow_database_write === true;
  const unsafeOutputPathBlocked = isUnsafeSupabaseMigrationPath(
    requestedOutputPath
  );

  if (unsafeOutputPathBlocked) {
    return buildDecision({
      decisionState: "blocked_unsafe_output_path",
      lane: "output_path_safety_block_lane",
      reason: "output_path_must_not_be_supabase_migrations",
      requestedOutputPath,
      draft: null,
      canReviewSqlDraftLocally: false,
      canPrepareRealMigrationLater: false,
      supabaseMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
      unsafeOutputPathBlocked,
    });
  }

  if (supabaseMigrationRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_supabase_migration_file_requested",
      lane: "supabase_migration_safety_block_lane",
      reason: "supabase_migration_file_not_allowed_in_foundation",
      requestedOutputPath,
      draft: null,
      canReviewSqlDraftLocally: false,
      canPrepareRealMigrationLater: false,
      supabaseMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
      unsafeOutputPathBlocked,
    });
  }

  if (supabaseApplyRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_supabase_apply_requested",
      lane: "supabase_migration_safety_block_lane",
      reason: "supabase_apply_not_allowed_in_foundation",
      requestedOutputPath,
      draft: null,
      canReviewSqlDraftLocally: false,
      canPrepareRealMigrationLater: false,
      supabaseMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
      unsafeOutputPathBlocked,
    });
  }

  if (databaseWriteRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_database_write_requested",
      lane: "database_write_safety_block_lane",
      reason: "database_write_not_allowed_in_foundation",
      requestedOutputPath,
      draft: null,
      canReviewSqlDraftLocally: false,
      canPrepareRealMigrationLater: false,
      supabaseMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
      unsafeOutputPathBlocked,
    });
  }

  return buildDecision({
    decisionState: "local_sql_draft_ready",
    lane: "local_sql_review_draft_lane",
    reason: "canonical_schema_sql_draft_ready_for_review_only",
    requestedOutputPath,
    draft: buildEventCanonicalMigrationDraft(),
    canReviewSqlDraftLocally: true,
    canPrepareRealMigrationLater: true,
    supabaseMigrationRequestedButBlocked,
    supabaseApplyRequestedButBlocked,
    databaseWriteRequestedButBlocked,
    unsafeOutputPathBlocked,
  });
}

export const EVENT_CANONICAL_MIGRATION_DRAFT_DEFAULTS = {
  local_sql_draft_only: true,
  supabase_migration_file_created: false,
  supabase_operation_performed: false,
  database_write_performed: false,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;