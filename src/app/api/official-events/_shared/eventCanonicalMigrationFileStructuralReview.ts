// src/app/api/official-events/_shared/eventCanonicalMigrationFileStructuralReview.ts

export type EventCanonicalMigrationFileStructuralReviewCheckKey =
  | "local_draft_header_present"
  | "pgcrypto_extension_declared"
  | "canonical_events_table_declared"
  | "canonical_event_sources_table_declared"
  | "canonical_event_search_documents_table_declared"
  | "canonical_event_feature_feeds_table_declared"
  | "canonical_events_validation_constraint_present"
  | "source_trace_unique_constraint_present"
  | "search_tokens_gin_index_present"
  | "rls_enabled_for_canonical_events"
  | "rls_enabled_for_canonical_event_sources"
  | "rls_enabled_for_canonical_event_search_documents"
  | "rls_enabled_for_canonical_event_feature_feeds"
  | "permissive_rls_policy_not_created"
  | "rollback_notes_present"
  | "supabase_migration_directory_warning_present";

export type EventCanonicalMigrationFileStructuralReviewDecisionState =
  | "structurally_valid_for_future_review"
  | "hold_missing_required_structure"
  | "blocked_authorization_not_confirmed"
  | "blocked_copy_to_supabase_migrations_requested"
  | "blocked_supabase_apply_requested"
  | "blocked_database_write_requested";

export type EventCanonicalMigrationFileStructuralReviewLane =
  | "migration_file_structural_review_lane"
  | "structural_review_hold_lane"
  | "authorization_dependency_block_lane"
  | "copy_to_supabase_migrations_safety_block_lane"
  | "supabase_apply_safety_block_lane"
  | "database_write_safety_block_lane";

export type EventCanonicalMigrationFileStructuralReviewReason =
  | "migration_file_draft_structure_matches_required_contract"
  | "migration_file_draft_structure_missing_required_items"
  | "authorization_gate_must_be_confirmed_before_structural_review"
  | "copy_to_supabase_migrations_not_allowed_in_foundation"
  | "supabase_apply_not_allowed_in_foundation"
  | "database_write_not_allowed_in_foundation";

export type EventCanonicalMigrationFileStructuralReviewSafetyFlag =
  | "structural_review_only"
  | "local_draft_review_only"
  | "supabase_migration_file_not_created"
  | "copy_to_supabase_migrations_blocked"
  | "supabase_operation_not_performed"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "human_event_analysis_not_required"
  | "real_auto_publish_disabled"
  | "authorization_gate_required"
  | "all_required_structure_present"
  | "missing_required_structure_detected"
  | "authorization_not_confirmed"
  | "copy_to_supabase_migrations_request_blocked"
  | "supabase_apply_request_blocked"
  | "database_write_request_blocked";

export type EventCanonicalMigrationFileStructuralReviewInput = {
  authorization_gate_confirmed?: boolean | null;
  sql_text?: string | null;
  allow_copy_to_supabase_migrations?: boolean | null;
  allow_apply_supabase_migration?: boolean | null;
  allow_database_write?: boolean | null;
};

export type EventCanonicalMigrationFileStructuralReviewCheck = {
  check_key: EventCanonicalMigrationFileStructuralReviewCheckKey;
  satisfied: boolean;
  blocking: boolean;
  description: string;
};

export type EventCanonicalMigrationFileStructuralReviewDecision = {
  decision_state: EventCanonicalMigrationFileStructuralReviewDecisionState;
  review_lane: EventCanonicalMigrationFileStructuralReviewLane;
  reason: EventCanonicalMigrationFileStructuralReviewReason;
  checks: EventCanonicalMigrationFileStructuralReviewCheck[];
  missing_required_checks: EventCanonicalMigrationFileStructuralReviewCheckKey[];
  satisfied_checks: EventCanonicalMigrationFileStructuralReviewCheckKey[];
  should_create_supabase_migration_file_now: false;
  should_copy_to_supabase_migrations_now: false;
  should_apply_supabase_migration_now: false;
  should_write_database_now: false;
  can_continue_future_review_later: boolean;
  can_copy_to_supabase_migrations_now: false;
  can_apply_any_database_change: false;
  safety_flags: EventCanonicalMigrationFileStructuralReviewSafetyFlag[];
  external_request_performed: false;
  supabase_migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

type RequiredTextCheck = {
  check_key: EventCanonicalMigrationFileStructuralReviewCheckKey;
  description: string;
  required_text: string;
};

const REQUIRED_TEXT_CHECKS: RequiredTextCheck[] = [
  {
    check_key: "local_draft_header_present",
    description:
      "The file must identify itself as a local migration file draft only.",
    required_text: "local migration file draft only",
  },
  {
    check_key: "pgcrypto_extension_declared",
    description: "The pgcrypto extension declaration must be present.",
    required_text: "create extension if not exists pgcrypto",
  },
  {
    check_key: "canonical_events_table_declared",
    description: "The canonical_events table declaration must be present.",
    required_text: "create table if not exists public.canonical_events",
  },
  {
    check_key: "canonical_event_sources_table_declared",
    description:
      "The canonical_event_sources table declaration must be present.",
    required_text: "create table if not exists public.canonical_event_sources",
  },
  {
    check_key: "canonical_event_search_documents_table_declared",
    description:
      "The canonical_event_search_documents table declaration must be present.",
    required_text:
      "create table if not exists public.canonical_event_search_documents",
  },
  {
    check_key: "canonical_event_feature_feeds_table_declared",
    description:
      "The canonical_event_feature_feeds table declaration must be present.",
    required_text:
      "create table if not exists public.canonical_event_feature_feeds",
  },
  {
    check_key: "canonical_events_validation_constraint_present",
    description:
      "The canonical events validation constraint must remain explicit.",
    required_text: "canonical_events_validated_check",
  },
  {
    check_key: "source_trace_unique_constraint_present",
    description:
      "The source trace unique constraint must remain explicit.",
    required_text: "canonical_event_sources_unique_source",
  },
  {
    check_key: "search_tokens_gin_index_present",
    description: "The search token GIN index must remain explicit.",
    required_text: "canonical_event_search_documents_tokens_gin_idx",
  },
  {
    check_key: "rls_enabled_for_canonical_events",
    description: "RLS must be enabled for canonical_events.",
    required_text: "alter table public.canonical_events enable row level security",
  },
  {
    check_key: "rls_enabled_for_canonical_event_sources",
    description: "RLS must be enabled for canonical_event_sources.",
    required_text:
      "alter table public.canonical_event_sources enable row level security",
  },
  {
    check_key: "rls_enabled_for_canonical_event_search_documents",
    description:
      "RLS must be enabled for canonical_event_search_documents.",
    required_text:
      "alter table public.canonical_event_search_documents enable row level security",
  },
  {
    check_key: "rls_enabled_for_canonical_event_feature_feeds",
    description:
      "RLS must be enabled for canonical_event_feature_feeds.",
    required_text:
      "alter table public.canonical_event_feature_feeds enable row level security",
  },
  {
    check_key: "rollback_notes_present",
    description: "Rollback review notes must be present.",
    required_text: "rollback review notes",
  },
  {
    check_key: "supabase_migration_directory_warning_present",
    description:
      "The draft must warn that it does not belong in supabase/migrations yet.",
    required_text: "do not copy this file into supabase/migrations",
  },
];

function normalizeSql(sqlText: string | null | undefined): string {
  return (sqlText ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAnyUnsafePermissivePolicy(sqlText: string): boolean {
  const normalized = normalizeSql(sqlText);

  return (
    normalized.includes("create policy") ||
    normalized.includes("using (true)") ||
    normalized.includes("with check (true)")
  );
}

function buildChecks(
  sqlText: string | null | undefined
): EventCanonicalMigrationFileStructuralReviewCheck[] {
  const normalized = normalizeSql(sqlText);

  const requiredTextChecks: EventCanonicalMigrationFileStructuralReviewCheck[] =
    REQUIRED_TEXT_CHECKS.map((check) => {
      const satisfied = normalized.includes(
        check.required_text.toLowerCase()
      );

      return {
        check_key: check.check_key,
        satisfied,
        blocking: !satisfied,
        description: check.description,
      };
    });

  const permissivePolicySatisfied = !hasAnyUnsafePermissivePolicy(
    sqlText ?? ""
  );

  return [
    ...requiredTextChecks,
    {
      check_key: "permissive_rls_policy_not_created",
      satisfied: permissivePolicySatisfied,
      blocking: !permissivePolicySatisfied,
      description:
        "The draft must not create permissive RLS policies in this foundation stage.",
    },
  ];
}

function buildSafetyFlags(args: {
  missingRequiredChecks: EventCanonicalMigrationFileStructuralReviewCheckKey[];
  authorizationGateConfirmed: boolean;
  copyRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationFileStructuralReviewSafetyFlag[] {
  const flags: EventCanonicalMigrationFileStructuralReviewSafetyFlag[] = [
    "structural_review_only",
    "local_draft_review_only",
    "supabase_migration_file_not_created",
    "copy_to_supabase_migrations_blocked",
    "supabase_operation_not_performed",
    "database_write_not_performed",
    "external_request_not_performed",
    "human_event_analysis_not_required",
    "real_auto_publish_disabled",
    "authorization_gate_required",
  ];

  if (args.missingRequiredChecks.length === 0) {
    flags.push("all_required_structure_present");
  } else {
    flags.push("missing_required_structure_detected");
  }

  if (!args.authorizationGateConfirmed) {
    flags.push("authorization_not_confirmed");
  }

  if (args.copyRequestedButBlocked) {
    flags.push("copy_to_supabase_migrations_request_blocked");
  }

  if (args.supabaseApplyRequestedButBlocked) {
    flags.push("supabase_apply_request_blocked");
  }

  if (args.databaseWriteRequestedButBlocked) {
    flags.push("database_write_request_blocked");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventCanonicalMigrationFileStructuralReviewDecisionState;
  lane: EventCanonicalMigrationFileStructuralReviewLane;
  reason: EventCanonicalMigrationFileStructuralReviewReason;
  checks: EventCanonicalMigrationFileStructuralReviewCheck[];
  canContinueFutureReviewLater: boolean;
  authorizationGateConfirmed: boolean;
  copyRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationFileStructuralReviewDecision {
  const missingRequiredChecks = args.checks
    .filter((check) => !check.satisfied)
    .map((check) => check.check_key);

  const satisfiedChecks = args.checks
    .filter((check) => check.satisfied)
    .map((check) => check.check_key);

  return {
    decision_state: args.decisionState,
    review_lane: args.lane,
    reason: args.reason,
    checks: args.checks,
    missing_required_checks: missingRequiredChecks,
    satisfied_checks: satisfiedChecks,
    should_create_supabase_migration_file_now: false,
    should_copy_to_supabase_migrations_now: false,
    should_apply_supabase_migration_now: false,
    should_write_database_now: false,
    can_continue_future_review_later: args.canContinueFutureReviewLater,
    can_copy_to_supabase_migrations_now: false,
    can_apply_any_database_change: false,
    safety_flags: buildSafetyFlags({
      missingRequiredChecks,
      authorizationGateConfirmed: args.authorizationGateConfirmed,
      copyRequestedButBlocked: args.copyRequestedButBlocked,
      supabaseApplyRequestedButBlocked: args.supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked: args.databaseWriteRequestedButBlocked,
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

export function resolveEventCanonicalMigrationFileStructuralReviewDecision(
  input: EventCanonicalMigrationFileStructuralReviewInput = {}
): EventCanonicalMigrationFileStructuralReviewDecision {
  const checks = buildChecks(input.sql_text);
  const missingRequiredChecks = checks.filter((check) => !check.satisfied);
  const authorizationGateConfirmed =
    input.authorization_gate_confirmed === true;
  const copyRequestedButBlocked =
    input.allow_copy_to_supabase_migrations === true;
  const supabaseApplyRequestedButBlocked =
    input.allow_apply_supabase_migration === true;
  const databaseWriteRequestedButBlocked = input.allow_database_write === true;

  if (copyRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_copy_to_supabase_migrations_requested",
      lane: "copy_to_supabase_migrations_safety_block_lane",
      reason: "copy_to_supabase_migrations_not_allowed_in_foundation",
      checks,
      canContinueFutureReviewLater: false,
      authorizationGateConfirmed,
      copyRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (supabaseApplyRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_supabase_apply_requested",
      lane: "supabase_apply_safety_block_lane",
      reason: "supabase_apply_not_allowed_in_foundation",
      checks,
      canContinueFutureReviewLater: false,
      authorizationGateConfirmed,
      copyRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (databaseWriteRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_database_write_requested",
      lane: "database_write_safety_block_lane",
      reason: "database_write_not_allowed_in_foundation",
      checks,
      canContinueFutureReviewLater: false,
      authorizationGateConfirmed,
      copyRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (!authorizationGateConfirmed) {
    return buildDecision({
      decisionState: "blocked_authorization_not_confirmed",
      lane: "authorization_dependency_block_lane",
      reason: "authorization_gate_must_be_confirmed_before_structural_review",
      checks,
      canContinueFutureReviewLater: false,
      authorizationGateConfirmed,
      copyRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (missingRequiredChecks.length > 0) {
    return buildDecision({
      decisionState: "hold_missing_required_structure",
      lane: "structural_review_hold_lane",
      reason: "migration_file_draft_structure_missing_required_items",
      checks,
      canContinueFutureReviewLater: false,
      authorizationGateConfirmed,
      copyRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  return buildDecision({
    decisionState: "structurally_valid_for_future_review",
    lane: "migration_file_structural_review_lane",
    reason: "migration_file_draft_structure_matches_required_contract",
    checks,
    canContinueFutureReviewLater: true,
    authorizationGateConfirmed,
    copyRequestedButBlocked,
    supabaseApplyRequestedButBlocked,
    databaseWriteRequestedButBlocked,
  });
}

export const EVENT_CANONICAL_MIGRATION_FILE_STRUCTURAL_REVIEW_DEFAULTS = {
  structural_review_only: true,
  supabase_migration_file_created: false,
  supabase_operation_performed: false,
  database_write_performed: false,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;