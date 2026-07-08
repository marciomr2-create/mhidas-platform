// src/app/api/official-events/_shared/eventCanonicalMigrationReadiness.ts

export type EventCanonicalMigrationReadinessRequirementKey =
  | "database_backup_confirmed"
  | "migration_sql_reviewed"
  | "rls_policy_reviewed"
  | "service_role_write_path_reviewed"
  | "admin_write_path_reviewed"
  | "supabase_diff_reviewed"
  | "build_validation_passed"
  | "rollback_plan_reviewed";

export type EventCanonicalMigrationReadinessDecisionState =
  | "ready_for_future_real_migration_preparation"
  | "hold_missing_required_readiness"
  | "blocked_real_migration_requested"
  | "blocked_supabase_apply_requested"
  | "blocked_database_write_requested";

export type EventCanonicalMigrationReadinessLane =
  | "migration_readiness_gate_lane"
  | "readiness_hold_lane"
  | "real_migration_safety_block_lane"
  | "supabase_apply_safety_block_lane"
  | "database_write_safety_block_lane";

export type EventCanonicalMigrationReadinessReason =
  | "all_required_preconditions_confirmed_for_future_migration_preparation"
  | "required_preconditions_missing_for_future_migration_preparation"
  | "real_migration_creation_not_allowed_in_foundation"
  | "supabase_apply_not_allowed_in_foundation"
  | "database_write_not_allowed_in_foundation";

export type EventCanonicalMigrationReadinessSafetyFlag =
  | "readiness_gate_only"
  | "migration_file_not_created"
  | "supabase_operation_not_performed"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required"
  | "backup_required_before_real_migration"
  | "migration_sql_review_required_before_real_migration"
  | "rls_review_required_before_real_migration"
  | "service_role_write_path_required_before_real_migration"
  | "admin_write_path_required_before_real_migration"
  | "supabase_diff_required_before_real_migration"
  | "build_required_before_real_migration"
  | "rollback_plan_required_before_real_migration"
  | "all_required_preconditions_confirmed"
  | "missing_required_preconditions_detected"
  | "real_migration_request_blocked"
  | "supabase_apply_request_blocked"
  | "database_write_request_blocked";

export type EventCanonicalMigrationReadinessRequirementStatus = {
  requirement_key: EventCanonicalMigrationReadinessRequirementKey;
  satisfied: boolean;
  blocking: boolean;
  description: string;
};

export type EventCanonicalMigrationReadinessInput = {
  database_backup_confirmed?: boolean | null;
  migration_sql_reviewed?: boolean | null;
  rls_policy_reviewed?: boolean | null;
  service_role_write_path_reviewed?: boolean | null;
  admin_write_path_reviewed?: boolean | null;
  supabase_diff_reviewed?: boolean | null;
  build_validation_passed?: boolean | null;
  rollback_plan_reviewed?: boolean | null;
  allow_create_real_migration?: boolean | null;
  allow_apply_supabase_migration?: boolean | null;
  allow_database_write?: boolean | null;
};

export type EventCanonicalMigrationReadinessDecision = {
  decision_state: EventCanonicalMigrationReadinessDecisionState;
  readiness_lane: EventCanonicalMigrationReadinessLane;
  reason: EventCanonicalMigrationReadinessReason;
  requirement_statuses: EventCanonicalMigrationReadinessRequirementStatus[];
  missing_requirements: EventCanonicalMigrationReadinessRequirementKey[];
  satisfied_requirements: EventCanonicalMigrationReadinessRequirementKey[];
  should_create_migration_file_now: false;
  should_apply_supabase_migration_now: false;
  should_write_database_now: false;
  can_prepare_real_migration_later: boolean;
  can_move_to_real_migration_authorization_step: boolean;
  safety_flags: EventCanonicalMigrationReadinessSafetyFlag[];
  external_request_performed: false;
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

const REQUIRED_REQUIREMENTS: Array<{
  requirement_key: EventCanonicalMigrationReadinessRequirementKey;
  input_key: keyof EventCanonicalMigrationReadinessInput;
  description: string;
}> = [
  {
    requirement_key: "database_backup_confirmed",
    input_key: "database_backup_confirmed",
    description:
      "A fresh database backup must be confirmed before any real migration is prepared.",
  },
  {
    requirement_key: "migration_sql_reviewed",
    input_key: "migration_sql_reviewed",
    description:
      "The local SQL draft must be reviewed before it can become a real migration.",
  },
  {
    requirement_key: "rls_policy_reviewed",
    input_key: "rls_policy_reviewed",
    description:
      "RLS policies must be reviewed before any canonical event tables are migrated.",
  },
  {
    requirement_key: "service_role_write_path_reviewed",
    input_key: "service_role_write_path_reviewed",
    description:
      "The controlled service role write path must be reviewed before persistence is enabled.",
  },
  {
    requirement_key: "admin_write_path_reviewed",
    input_key: "admin_write_path_reviewed",
    description:
      "Protected admin write flows must be reviewed before any admin mutation path is enabled.",
  },
  {
    requirement_key: "supabase_diff_reviewed",
    input_key: "supabase_diff_reviewed",
    description:
      "A Supabase diff review must be completed before any real migration is created.",
  },
  {
    requirement_key: "build_validation_passed",
    input_key: "build_validation_passed",
    description:
      "The application build must pass before any real migration step is authorized.",
  },
  {
    requirement_key: "rollback_plan_reviewed",
    input_key: "rollback_plan_reviewed",
    description:
      "Rollback order and recovery plan must be reviewed before any real migration is prepared.",
  },
];

function buildRequirementStatuses(
  input: EventCanonicalMigrationReadinessInput
): EventCanonicalMigrationReadinessRequirementStatus[] {
  return REQUIRED_REQUIREMENTS.map((requirement) => {
    const satisfied = input[requirement.input_key] === true;

    return {
      requirement_key: requirement.requirement_key,
      satisfied,
      blocking: !satisfied,
      description: requirement.description,
    };
  });
}

function buildSafetyFlags(args: {
  missingRequirements: EventCanonicalMigrationReadinessRequirementKey[];
  realMigrationRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationReadinessSafetyFlag[] {
  const flags: EventCanonicalMigrationReadinessSafetyFlag[] = [
    "readiness_gate_only",
    "migration_file_not_created",
    "supabase_operation_not_performed",
    "database_write_not_performed",
    "external_request_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
    "backup_required_before_real_migration",
    "migration_sql_review_required_before_real_migration",
    "rls_review_required_before_real_migration",
    "service_role_write_path_required_before_real_migration",
    "admin_write_path_required_before_real_migration",
    "supabase_diff_required_before_real_migration",
    "build_required_before_real_migration",
    "rollback_plan_required_before_real_migration",
  ];

  if (args.missingRequirements.length === 0) {
    flags.push("all_required_preconditions_confirmed");
  } else {
    flags.push("missing_required_preconditions_detected");
  }

  if (args.realMigrationRequestedButBlocked) {
    flags.push("real_migration_request_blocked");
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
  decisionState: EventCanonicalMigrationReadinessDecisionState;
  lane: EventCanonicalMigrationReadinessLane;
  reason: EventCanonicalMigrationReadinessReason;
  requirementStatuses: EventCanonicalMigrationReadinessRequirementStatus[];
  canPrepareRealMigrationLater: boolean;
  canMoveToRealMigrationAuthorizationStep: boolean;
  realMigrationRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationReadinessDecision {
  const missingRequirements = args.requirementStatuses
    .filter((status) => !status.satisfied)
    .map((status) => status.requirement_key);

  const satisfiedRequirements = args.requirementStatuses
    .filter((status) => status.satisfied)
    .map((status) => status.requirement_key);

  return {
    decision_state: args.decisionState,
    readiness_lane: args.lane,
    reason: args.reason,
    requirement_statuses: args.requirementStatuses,
    missing_requirements: missingRequirements,
    satisfied_requirements: satisfiedRequirements,
    should_create_migration_file_now: false,
    should_apply_supabase_migration_now: false,
    should_write_database_now: false,
    can_prepare_real_migration_later: args.canPrepareRealMigrationLater,
    can_move_to_real_migration_authorization_step:
      args.canMoveToRealMigrationAuthorizationStep,
    safety_flags: buildSafetyFlags({
      missingRequirements,
      realMigrationRequestedButBlocked: args.realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked: args.supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked: args.databaseWriteRequestedButBlocked,
    }),
    external_request_performed: false,
    migration_file_created: false,
    supabase_operation_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalMigrationReadinessDecision(
  input: EventCanonicalMigrationReadinessInput = {}
): EventCanonicalMigrationReadinessDecision {
  const requirementStatuses = buildRequirementStatuses(input);
  const missingRequirements = requirementStatuses.filter(
    (status) => !status.satisfied
  );

  const realMigrationRequestedButBlocked =
    input.allow_create_real_migration === true;
  const supabaseApplyRequestedButBlocked =
    input.allow_apply_supabase_migration === true;
  const databaseWriteRequestedButBlocked = input.allow_database_write === true;

  if (realMigrationRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_real_migration_requested",
      lane: "real_migration_safety_block_lane",
      reason: "real_migration_creation_not_allowed_in_foundation",
      requirementStatuses,
      canPrepareRealMigrationLater: false,
      canMoveToRealMigrationAuthorizationStep: false,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (supabaseApplyRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_supabase_apply_requested",
      lane: "supabase_apply_safety_block_lane",
      reason: "supabase_apply_not_allowed_in_foundation",
      requirementStatuses,
      canPrepareRealMigrationLater: false,
      canMoveToRealMigrationAuthorizationStep: false,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (databaseWriteRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_database_write_requested",
      lane: "database_write_safety_block_lane",
      reason: "database_write_not_allowed_in_foundation",
      requirementStatuses,
      canPrepareRealMigrationLater: false,
      canMoveToRealMigrationAuthorizationStep: false,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (missingRequirements.length > 0) {
    return buildDecision({
      decisionState: "hold_missing_required_readiness",
      lane: "readiness_hold_lane",
      reason: "required_preconditions_missing_for_future_migration_preparation",
      requirementStatuses,
      canPrepareRealMigrationLater: false,
      canMoveToRealMigrationAuthorizationStep: false,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  return buildDecision({
    decisionState: "ready_for_future_real_migration_preparation",
    lane: "migration_readiness_gate_lane",
    reason: "all_required_preconditions_confirmed_for_future_migration_preparation",
    requirementStatuses,
    canPrepareRealMigrationLater: true,
    canMoveToRealMigrationAuthorizationStep: true,
    realMigrationRequestedButBlocked,
    supabaseApplyRequestedButBlocked,
    databaseWriteRequestedButBlocked,
  });
}

export const EVENT_CANONICAL_MIGRATION_READINESS_DEFAULTS = {
  readiness_gate_only: true,
  migration_file_created: false,
  supabase_operation_performed: false,
  database_write_performed: false,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;