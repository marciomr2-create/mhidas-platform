// src/app/api/official-events/_shared/eventCanonicalSchemaRealMigrationValidation.ts

export type EventCanonicalSchemaRealMigrationTableKey =
  | "canonical_events"
  | "canonical_event_sources"
  | "canonical_event_search_documents"
  | "canonical_event_feature_feeds";

export type EventCanonicalSchemaRealMigrationValidationState =
  | "ready_for_supabase_apply"
  | "hold_missing_migration_file"
  | "hold_missing_backup_reference"
  | "blocked_supabase_apply_not_explicit"
  | "blocked_runtime_change_requested";

export type EventCanonicalSchemaRealMigrationValidationLane =
  | "schema_real_migration_apply_readiness_lane"
  | "migration_file_hold_lane"
  | "backup_reference_hold_lane"
  | "supabase_apply_authorization_block_lane"
  | "runtime_change_safety_block_lane";

export type EventCanonicalSchemaRealMigrationValidationReason =
  | "migration_file_and_backup_reference_are_ready_for_explicit_apply"
  | "migration_file_must_exist_before_apply"
  | "backup_reference_must_be_confirmed_before_apply"
  | "supabase_apply_requires_explicit_separate_step"
  | "runtime_changes_not_allowed_in_schema_migration_step";

export type EventCanonicalSchemaRealMigrationSafetyFlag =
  | "real_migration_file_created"
  | "backup_reference_required"
  | "explicit_apply_step_required"
  | "no_runtime_behavior_changed"
  | "no_route_created"
  | "no_visual_change"
  | "no_ticketing_api_integration"
  | "canonical_event_id_schema_prepared"
  | "ticketing_60_day_path_prepared"
  | "write_policies_not_created"
  | "public_read_policies_only"
  | "migration_file_missing"
  | "backup_reference_missing"
  | "supabase_apply_not_explicit_blocked"
  | "runtime_change_blocked";

export type EventCanonicalSchemaRealMigrationValidationInput = {
  migration_file_exists?: boolean | null;
  backup_reference_confirmed?: boolean | null;
  explicit_supabase_apply_step?: boolean | null;
  allow_runtime_change?: boolean | null;
};

export type EventCanonicalSchemaRealMigrationValidationDecision = {
  validation_state: EventCanonicalSchemaRealMigrationValidationState;
  validation_lane: EventCanonicalSchemaRealMigrationValidationLane;
  reason: EventCanonicalSchemaRealMigrationValidationReason;
  required_tables: EventCanonicalSchemaRealMigrationTableKey[];
  should_apply_supabase_now: boolean;
  can_continue_to_apply_step: boolean;
  should_change_runtime_now: false;
  should_create_route_now: false;
  should_change_visual_ui_now: false;
  should_integrate_ticketing_api_now: false;
  safety_flags: EventCanonicalSchemaRealMigrationSafetyFlag[];
  external_request_performed: false;
  database_write_performed: false;
  runtime_change_performed: false;
};

const REQUIRED_TABLES: EventCanonicalSchemaRealMigrationTableKey[] = [
  "canonical_events",
  "canonical_event_sources",
  "canonical_event_search_documents",
  "canonical_event_feature_feeds",
];

function buildSafetyFlags(args: {
  migrationFileExists: boolean;
  backupReferenceConfirmed: boolean;
  explicitSupabaseApplyStep: boolean;
  runtimeChangeRequested: boolean;
}): EventCanonicalSchemaRealMigrationSafetyFlag[] {
  const flags: EventCanonicalSchemaRealMigrationSafetyFlag[] = [
    "backup_reference_required",
    "explicit_apply_step_required",
    "no_runtime_behavior_changed",
    "no_route_created",
    "no_visual_change",
    "no_ticketing_api_integration",
    "canonical_event_id_schema_prepared",
    "ticketing_60_day_path_prepared",
    "write_policies_not_created",
    "public_read_policies_only",
  ];

  if (args.migrationFileExists) {
    flags.push("real_migration_file_created");
  } else {
    flags.push("migration_file_missing");
  }

  if (!args.backupReferenceConfirmed) {
    flags.push("backup_reference_missing");
  }

  if (!args.explicitSupabaseApplyStep) {
    flags.push("supabase_apply_not_explicit_blocked");
  }

  if (args.runtimeChangeRequested) {
    flags.push("runtime_change_blocked");
  }

  return flags;
}

function buildDecision(args: {
  validationState: EventCanonicalSchemaRealMigrationValidationState;
  lane: EventCanonicalSchemaRealMigrationValidationLane;
  reason: EventCanonicalSchemaRealMigrationValidationReason;
  shouldApplySupabaseNow: boolean;
  canContinueToApplyStep: boolean;
  migrationFileExists: boolean;
  backupReferenceConfirmed: boolean;
  explicitSupabaseApplyStep: boolean;
  runtimeChangeRequested: boolean;
}): EventCanonicalSchemaRealMigrationValidationDecision {
  return {
    validation_state: args.validationState,
    validation_lane: args.lane,
    reason: args.reason,
    required_tables: REQUIRED_TABLES,
    should_apply_supabase_now: args.shouldApplySupabaseNow,
    can_continue_to_apply_step: args.canContinueToApplyStep,
    should_change_runtime_now: false,
    should_create_route_now: false,
    should_change_visual_ui_now: false,
    should_integrate_ticketing_api_now: false,
    safety_flags: buildSafetyFlags({
      migrationFileExists: args.migrationFileExists,
      backupReferenceConfirmed: args.backupReferenceConfirmed,
      explicitSupabaseApplyStep: args.explicitSupabaseApplyStep,
      runtimeChangeRequested: args.runtimeChangeRequested,
    }),
    external_request_performed: false,
    database_write_performed: false,
    runtime_change_performed: false,
  };
}

export function resolveEventCanonicalSchemaRealMigrationValidationDecision(
  input: EventCanonicalSchemaRealMigrationValidationInput = {}
): EventCanonicalSchemaRealMigrationValidationDecision {
  const migrationFileExists = input.migration_file_exists === true;
  const backupReferenceConfirmed = input.backup_reference_confirmed === true;
  const explicitSupabaseApplyStep = input.explicit_supabase_apply_step === true;
  const runtimeChangeRequested = input.allow_runtime_change === true;

  if (runtimeChangeRequested) {
    return buildDecision({
      validationState: "blocked_runtime_change_requested",
      lane: "runtime_change_safety_block_lane",
      reason: "runtime_changes_not_allowed_in_schema_migration_step",
      shouldApplySupabaseNow: false,
      canContinueToApplyStep: false,
      migrationFileExists,
      backupReferenceConfirmed,
      explicitSupabaseApplyStep,
      runtimeChangeRequested,
    });
  }

  if (!migrationFileExists) {
    return buildDecision({
      validationState: "hold_missing_migration_file",
      lane: "migration_file_hold_lane",
      reason: "migration_file_must_exist_before_apply",
      shouldApplySupabaseNow: false,
      canContinueToApplyStep: false,
      migrationFileExists,
      backupReferenceConfirmed,
      explicitSupabaseApplyStep,
      runtimeChangeRequested,
    });
  }

  if (!backupReferenceConfirmed) {
    return buildDecision({
      validationState: "hold_missing_backup_reference",
      lane: "backup_reference_hold_lane",
      reason: "backup_reference_must_be_confirmed_before_apply",
      shouldApplySupabaseNow: false,
      canContinueToApplyStep: false,
      migrationFileExists,
      backupReferenceConfirmed,
      explicitSupabaseApplyStep,
      runtimeChangeRequested,
    });
  }

  if (!explicitSupabaseApplyStep) {
    return buildDecision({
      validationState: "blocked_supabase_apply_not_explicit",
      lane: "supabase_apply_authorization_block_lane",
      reason: "supabase_apply_requires_explicit_separate_step",
      shouldApplySupabaseNow: false,
      canContinueToApplyStep: true,
      migrationFileExists,
      backupReferenceConfirmed,
      explicitSupabaseApplyStep,
      runtimeChangeRequested,
    });
  }

  return buildDecision({
    validationState: "ready_for_supabase_apply",
    lane: "schema_real_migration_apply_readiness_lane",
    reason: "migration_file_and_backup_reference_are_ready_for_explicit_apply",
    shouldApplySupabaseNow: true,
    canContinueToApplyStep: true,
    migrationFileExists,
    backupReferenceConfirmed,
    explicitSupabaseApplyStep,
    runtimeChangeRequested,
  });
}

export const EVENT_CANONICAL_SCHEMA_REAL_MIGRATION_DEFAULTS = {
  required_tables: REQUIRED_TABLES,
  backup_reference_required: true,
  explicit_apply_step_required: true,
  no_runtime_behavior_changed: true,
  no_route_created: true,
  no_visual_change: true,
  no_ticketing_api_integration: true,
} as const;