// src/app/api/official-events/_shared/eventCanonicalMigrationFileDraft.ts

export type EventCanonicalMigrationFileDraftDecisionState =
  | "local_migration_file_draft_ready"
  | "blocked_authorization_not_confirmed"
  | "blocked_unsafe_supabase_migration_path"
  | "blocked_real_supabase_migration_file_requested"
  | "blocked_supabase_apply_requested"
  | "blocked_database_write_requested";

export type EventCanonicalMigrationFileDraftLane =
  | "local_migration_file_draft_lane"
  | "authorization_dependency_block_lane"
  | "supabase_migration_path_safety_block_lane"
  | "real_supabase_migration_safety_block_lane"
  | "supabase_apply_safety_block_lane"
  | "database_write_safety_block_lane";

export type EventCanonicalMigrationFileDraftReason =
  | "authorized_local_migration_file_draft_ready_for_review_only"
  | "authorization_gate_must_be_confirmed_before_draft"
  | "supabase_migrations_output_path_not_allowed_for_draft"
  | "real_supabase_migration_file_not_allowed_in_foundation"
  | "supabase_apply_not_allowed_in_foundation"
  | "database_write_not_allowed_in_foundation";

export type EventCanonicalMigrationFileDraftSafetyFlag =
  | "local_migration_file_draft_only"
  | "stored_outside_supabase_migrations"
  | "supabase_migration_file_not_created"
  | "supabase_operation_not_performed"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "human_event_analysis_not_required"
  | "real_auto_publish_disabled"
  | "authorization_gate_required"
  | "review_required_before_real_migration"
  | "copy_to_supabase_migrations_blocked"
  | "apply_supabase_blocked"
  | "database_write_blocked"
  | "rollback_notes_included"
  | "draft_filename_matches_future_migration_pattern"
  | "authorization_not_confirmed"
  | "unsafe_supabase_migration_path_blocked"
  | "real_supabase_migration_file_request_blocked"
  | "supabase_apply_request_blocked"
  | "database_write_request_blocked";

export type EventCanonicalMigrationFileDraftInput = {
  authorization_gate_confirmed?: boolean | null;
  requested_output_path?: string | null;
  allow_supabase_migration_file_creation?: boolean | null;
  allow_apply_supabase_migration?: boolean | null;
  allow_database_write?: boolean | null;
};

export type EventCanonicalMigrationFileDraftManifest = {
  draft_version: "v4.8.50";
  local_review_path: "docs/migration-drafts/20260707120000_event_canonical_schema_v4_8_50.sql";
  future_supabase_migration_filename: "20260707120000_event_canonical_schema_v4_8_50.sql";
  future_target_directory: "supabase/migrations";
  is_real_supabase_migration_file: false;
  can_be_copied_to_supabase_migrations_now: false;
  can_be_applied_now: false;
  can_write_database_now: false;
  includes_canonical_events: true;
  includes_canonical_event_sources: true;
  includes_canonical_event_search_documents: true;
  includes_canonical_event_feature_feeds: true;
  includes_rls_enablement_draft: true;
  includes_permissive_rls_policies: false;
  includes_rollback_notes: true;
};

export type EventCanonicalMigrationFileDraftDecision = {
  decision_state: EventCanonicalMigrationFileDraftDecisionState;
  draft_lane: EventCanonicalMigrationFileDraftLane;
  reason: EventCanonicalMigrationFileDraftReason;
  requested_output_path: string;
  manifest: EventCanonicalMigrationFileDraftManifest | null;
  should_create_local_review_draft_artifact_now: boolean;
  should_create_supabase_migration_file_now: false;
  should_apply_supabase_migration_now: false;
  should_write_database_now: false;
  can_prepare_real_migration_later: boolean;
  can_copy_to_supabase_migrations_now: false;
  can_apply_any_database_change: false;
  safety_flags: EventCanonicalMigrationFileDraftSafetyFlag[];
  external_request_performed: false;
  local_migration_file_draft_artifact_created: boolean;
  supabase_migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

const LOCAL_REVIEW_PATH =
  "docs/migration-drafts/20260707120000_event_canonical_schema_v4_8_50.sql" as const;

function normalizePath(value: string | null | undefined): string {
  return (value ?? LOCAL_REVIEW_PATH).replace(/\\/g, "/").trim();
}

function isSupabaseMigrationPath(path: string): boolean {
  return (
    path === "supabase/migrations" ||
    path.startsWith("supabase/migrations/") ||
    path.includes("/supabase/migrations/")
  );
}

export function buildEventCanonicalMigrationFileDraftManifest(): EventCanonicalMigrationFileDraftManifest {
  return {
    draft_version: "v4.8.50",
    local_review_path: LOCAL_REVIEW_PATH,
    future_supabase_migration_filename:
      "20260707120000_event_canonical_schema_v4_8_50.sql",
    future_target_directory: "supabase/migrations",
    is_real_supabase_migration_file: false,
    can_be_copied_to_supabase_migrations_now: false,
    can_be_applied_now: false,
    can_write_database_now: false,
    includes_canonical_events: true,
    includes_canonical_event_sources: true,
    includes_canonical_event_search_documents: true,
    includes_canonical_event_feature_feeds: true,
    includes_rls_enablement_draft: true,
    includes_permissive_rls_policies: false,
    includes_rollback_notes: true,
  };
}

function buildSafetyFlags(args: {
  authorizationGateConfirmed: boolean;
  unsafeSupabaseMigrationPathBlocked: boolean;
  realSupabaseMigrationFileRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationFileDraftSafetyFlag[] {
  const flags: EventCanonicalMigrationFileDraftSafetyFlag[] = [
    "local_migration_file_draft_only",
    "stored_outside_supabase_migrations",
    "supabase_migration_file_not_created",
    "supabase_operation_not_performed",
    "database_write_not_performed",
    "external_request_not_performed",
    "human_event_analysis_not_required",
    "real_auto_publish_disabled",
    "authorization_gate_required",
    "review_required_before_real_migration",
    "copy_to_supabase_migrations_blocked",
    "apply_supabase_blocked",
    "database_write_blocked",
    "rollback_notes_included",
    "draft_filename_matches_future_migration_pattern",
  ];

  if (!args.authorizationGateConfirmed) {
    flags.push("authorization_not_confirmed");
  }

  if (args.unsafeSupabaseMigrationPathBlocked) {
    flags.push("unsafe_supabase_migration_path_blocked");
  }

  if (args.realSupabaseMigrationFileRequestedButBlocked) {
    flags.push("real_supabase_migration_file_request_blocked");
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
  decisionState: EventCanonicalMigrationFileDraftDecisionState;
  lane: EventCanonicalMigrationFileDraftLane;
  reason: EventCanonicalMigrationFileDraftReason;
  requestedOutputPath: string;
  manifest: EventCanonicalMigrationFileDraftManifest | null;
  shouldCreateLocalReviewDraftArtifactNow: boolean;
  canPrepareRealMigrationLater: boolean;
  authorizationGateConfirmed: boolean;
  unsafeSupabaseMigrationPathBlocked: boolean;
  realSupabaseMigrationFileRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationFileDraftDecision {
  return {
    decision_state: args.decisionState,
    draft_lane: args.lane,
    reason: args.reason,
    requested_output_path: args.requestedOutputPath,
    manifest: args.manifest,
    should_create_local_review_draft_artifact_now:
      args.shouldCreateLocalReviewDraftArtifactNow,
    should_create_supabase_migration_file_now: false,
    should_apply_supabase_migration_now: false,
    should_write_database_now: false,
    can_prepare_real_migration_later: args.canPrepareRealMigrationLater,
    can_copy_to_supabase_migrations_now: false,
    can_apply_any_database_change: false,
    safety_flags: buildSafetyFlags({
      authorizationGateConfirmed: args.authorizationGateConfirmed,
      unsafeSupabaseMigrationPathBlocked:
        args.unsafeSupabaseMigrationPathBlocked,
      realSupabaseMigrationFileRequestedButBlocked:
        args.realSupabaseMigrationFileRequestedButBlocked,
      supabaseApplyRequestedButBlocked: args.supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked: args.databaseWriteRequestedButBlocked,
    }),
    external_request_performed: false,
    local_migration_file_draft_artifact_created:
      args.shouldCreateLocalReviewDraftArtifactNow,
    supabase_migration_file_created: false,
    supabase_operation_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalMigrationFileDraftDecision(
  input: EventCanonicalMigrationFileDraftInput = {}
): EventCanonicalMigrationFileDraftDecision {
  const requestedOutputPath = normalizePath(input.requested_output_path);
  const authorizationGateConfirmed =
    input.authorization_gate_confirmed === true;
  const unsafeSupabaseMigrationPathBlocked =
    isSupabaseMigrationPath(requestedOutputPath);
  const realSupabaseMigrationFileRequestedButBlocked =
    input.allow_supabase_migration_file_creation === true;
  const supabaseApplyRequestedButBlocked =
    input.allow_apply_supabase_migration === true;
  const databaseWriteRequestedButBlocked = input.allow_database_write === true;

  if (realSupabaseMigrationFileRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_real_supabase_migration_file_requested",
      lane: "real_supabase_migration_safety_block_lane",
      reason: "real_supabase_migration_file_not_allowed_in_foundation",
      requestedOutputPath,
      manifest: null,
      shouldCreateLocalReviewDraftArtifactNow: false,
      canPrepareRealMigrationLater: false,
      authorizationGateConfirmed,
      unsafeSupabaseMigrationPathBlocked,
      realSupabaseMigrationFileRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (supabaseApplyRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_supabase_apply_requested",
      lane: "supabase_apply_safety_block_lane",
      reason: "supabase_apply_not_allowed_in_foundation",
      requestedOutputPath,
      manifest: null,
      shouldCreateLocalReviewDraftArtifactNow: false,
      canPrepareRealMigrationLater: false,
      authorizationGateConfirmed,
      unsafeSupabaseMigrationPathBlocked,
      realSupabaseMigrationFileRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (databaseWriteRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_database_write_requested",
      lane: "database_write_safety_block_lane",
      reason: "database_write_not_allowed_in_foundation",
      requestedOutputPath,
      manifest: null,
      shouldCreateLocalReviewDraftArtifactNow: false,
      canPrepareRealMigrationLater: false,
      authorizationGateConfirmed,
      unsafeSupabaseMigrationPathBlocked,
      realSupabaseMigrationFileRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (unsafeSupabaseMigrationPathBlocked) {
    return buildDecision({
      decisionState: "blocked_unsafe_supabase_migration_path",
      lane: "supabase_migration_path_safety_block_lane",
      reason: "supabase_migrations_output_path_not_allowed_for_draft",
      requestedOutputPath,
      manifest: null,
      shouldCreateLocalReviewDraftArtifactNow: false,
      canPrepareRealMigrationLater: false,
      authorizationGateConfirmed,
      unsafeSupabaseMigrationPathBlocked,
      realSupabaseMigrationFileRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (!authorizationGateConfirmed) {
    return buildDecision({
      decisionState: "blocked_authorization_not_confirmed",
      lane: "authorization_dependency_block_lane",
      reason: "authorization_gate_must_be_confirmed_before_draft",
      requestedOutputPath,
      manifest: null,
      shouldCreateLocalReviewDraftArtifactNow: false,
      canPrepareRealMigrationLater: false,
      authorizationGateConfirmed,
      unsafeSupabaseMigrationPathBlocked,
      realSupabaseMigrationFileRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  return buildDecision({
    decisionState: "local_migration_file_draft_ready",
    lane: "local_migration_file_draft_lane",
    reason: "authorized_local_migration_file_draft_ready_for_review_only",
    requestedOutputPath,
    manifest: buildEventCanonicalMigrationFileDraftManifest(),
    shouldCreateLocalReviewDraftArtifactNow: true,
    canPrepareRealMigrationLater: true,
    authorizationGateConfirmed,
    unsafeSupabaseMigrationPathBlocked,
    realSupabaseMigrationFileRequestedButBlocked,
    supabaseApplyRequestedButBlocked,
    databaseWriteRequestedButBlocked,
  });
}

export const EVENT_CANONICAL_MIGRATION_FILE_DRAFT_DEFAULTS = {
  local_migration_file_draft_only: true,
  stored_outside_supabase_migrations: true,
  supabase_migration_file_created: false,
  supabase_operation_performed: false,
  database_write_performed: false,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;