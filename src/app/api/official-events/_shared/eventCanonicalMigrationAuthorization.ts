// src/app/api/official-events/_shared/eventCanonicalMigrationAuthorization.ts

export type EventCanonicalMigrationAuthorizationRequirementKey =
  | "readiness_gate_confirmed"
  | "owner_authorization_confirmed"
  | "migration_scope_frozen"
  | "backup_reference_recorded"
  | "rollback_authorization_confirmed"
  | "production_window_planned"
  | "post_migration_validation_planned"
  | "emergency_stop_acknowledged";

export type EventCanonicalMigrationAuthorizationDecisionState =
  | "authorized_for_future_migration_file_preparation"
  | "hold_missing_authorization"
  | "blocked_readiness_not_confirmed"
  | "blocked_real_migration_requested"
  | "blocked_supabase_apply_requested"
  | "blocked_database_write_requested";

export type EventCanonicalMigrationAuthorizationLane =
  | "future_migration_authorization_lane"
  | "authorization_hold_lane"
  | "readiness_dependency_block_lane"
  | "real_migration_safety_block_lane"
  | "supabase_apply_safety_block_lane"
  | "database_write_safety_block_lane";

export type EventCanonicalMigrationAuthorizationReason =
  | "all_authorization_requirements_confirmed_for_future_migration_file_preparation"
  | "authorization_requirements_missing_for_future_migration_file_preparation"
  | "readiness_gate_must_be_confirmed_before_authorization"
  | "real_migration_creation_not_allowed_in_foundation"
  | "supabase_apply_not_allowed_in_foundation"
  | "database_write_not_allowed_in_foundation";

export type EventCanonicalMigrationAuthorizationSafetyFlag =
  | "authorization_gate_only"
  | "migration_file_not_created"
  | "supabase_operation_not_performed"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required"
  | "readiness_gate_dependency_required"
  | "owner_authorization_required"
  | "migration_scope_freeze_required"
  | "backup_reference_required"
  | "rollback_authorization_required"
  | "production_window_required"
  | "post_migration_validation_required"
  | "emergency_stop_required"
  | "all_authorization_requirements_confirmed"
  | "missing_authorization_requirements_detected"
  | "readiness_gate_not_confirmed"
  | "real_migration_request_blocked"
  | "supabase_apply_request_blocked"
  | "database_write_request_blocked";

export type EventCanonicalMigrationAuthorizationRequirementStatus = {
  requirement_key: EventCanonicalMigrationAuthorizationRequirementKey;
  satisfied: boolean;
  blocking: boolean;
  description: string;
};

export type EventCanonicalMigrationAuthorizationInput = {
  readiness_gate_confirmed?: boolean | null;
  owner_authorization_confirmed?: boolean | null;
  migration_scope_frozen?: boolean | null;
  backup_reference_recorded?: boolean | null;
  rollback_authorization_confirmed?: boolean | null;
  production_window_planned?: boolean | null;
  post_migration_validation_planned?: boolean | null;
  emergency_stop_acknowledged?: boolean | null;
  allow_create_real_migration?: boolean | null;
  allow_apply_supabase_migration?: boolean | null;
  allow_database_write?: boolean | null;
};

export type EventCanonicalMigrationAuthorizationDecision = {
  decision_state: EventCanonicalMigrationAuthorizationDecisionState;
  authorization_lane: EventCanonicalMigrationAuthorizationLane;
  reason: EventCanonicalMigrationAuthorizationReason;
  requirement_statuses: EventCanonicalMigrationAuthorizationRequirementStatus[];
  missing_requirements: EventCanonicalMigrationAuthorizationRequirementKey[];
  satisfied_requirements: EventCanonicalMigrationAuthorizationRequirementKey[];
  should_create_migration_file_now: false;
  should_apply_supabase_migration_now: false;
  should_write_database_now: false;
  can_prepare_real_migration_file_later: boolean;
  can_move_to_real_migration_file_draft_step: boolean;
  can_apply_any_database_change: false;
  safety_flags: EventCanonicalMigrationAuthorizationSafetyFlag[];
  external_request_performed: false;
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

const AUTHORIZATION_REQUIREMENTS: Array<{
  requirement_key: EventCanonicalMigrationAuthorizationRequirementKey;
  input_key: keyof EventCanonicalMigrationAuthorizationInput;
  description: string;
}> = [
  {
    requirement_key: "readiness_gate_confirmed",
    input_key: "readiness_gate_confirmed",
    description:
      "The v4.8.48 readiness gate must be confirmed before any future migration authorization can be considered.",
  },
  {
    requirement_key: "owner_authorization_confirmed",
    input_key: "owner_authorization_confirmed",
    description:
      "The project owner must explicitly authorize moving from readiness into future migration file preparation.",
  },
  {
    requirement_key: "migration_scope_frozen",
    input_key: "migration_scope_frozen",
    description:
      "The canonical event schema scope must be frozen before preparing a real migration file later.",
  },
  {
    requirement_key: "backup_reference_recorded",
    input_key: "backup_reference_recorded",
    description:
      "A concrete backup reference must be recorded before future migration file preparation.",
  },
  {
    requirement_key: "rollback_authorization_confirmed",
    input_key: "rollback_authorization_confirmed",
    description:
      "Rollback authorization and recovery ownership must be confirmed before future migration file preparation.",
  },
  {
    requirement_key: "production_window_planned",
    input_key: "production_window_planned",
    description:
      "A production window must be planned before any future real database change is prepared.",
  },
  {
    requirement_key: "post_migration_validation_planned",
    input_key: "post_migration_validation_planned",
    description:
      "Post-migration validation must be planned before preparing a real migration file later.",
  },
  {
    requirement_key: "emergency_stop_acknowledged",
    input_key: "emergency_stop_acknowledged",
    description:
      "An emergency stop condition must be acknowledged before any future real migration step.",
  },
];

function buildRequirementStatuses(
  input: EventCanonicalMigrationAuthorizationInput
): EventCanonicalMigrationAuthorizationRequirementStatus[] {
  return AUTHORIZATION_REQUIREMENTS.map((requirement) => {
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
  missingRequirements: EventCanonicalMigrationAuthorizationRequirementKey[];
  readinessGateConfirmed: boolean;
  realMigrationRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationAuthorizationSafetyFlag[] {
  const flags: EventCanonicalMigrationAuthorizationSafetyFlag[] = [
    "authorization_gate_only",
    "migration_file_not_created",
    "supabase_operation_not_performed",
    "database_write_not_performed",
    "external_request_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
    "readiness_gate_dependency_required",
    "owner_authorization_required",
    "migration_scope_freeze_required",
    "backup_reference_required",
    "rollback_authorization_required",
    "production_window_required",
    "post_migration_validation_required",
    "emergency_stop_required",
  ];

  if (args.missingRequirements.length === 0) {
    flags.push("all_authorization_requirements_confirmed");
  } else {
    flags.push("missing_authorization_requirements_detected");
  }

  if (!args.readinessGateConfirmed) {
    flags.push("readiness_gate_not_confirmed");
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
  decisionState: EventCanonicalMigrationAuthorizationDecisionState;
  lane: EventCanonicalMigrationAuthorizationLane;
  reason: EventCanonicalMigrationAuthorizationReason;
  requirementStatuses: EventCanonicalMigrationAuthorizationRequirementStatus[];
  canPrepareRealMigrationFileLater: boolean;
  canMoveToRealMigrationFileDraftStep: boolean;
  readinessGateConfirmed: boolean;
  realMigrationRequestedButBlocked: boolean;
  supabaseApplyRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalMigrationAuthorizationDecision {
  const missingRequirements = args.requirementStatuses
    .filter((status) => !status.satisfied)
    .map((status) => status.requirement_key);

  const satisfiedRequirements = args.requirementStatuses
    .filter((status) => status.satisfied)
    .map((status) => status.requirement_key);

  return {
    decision_state: args.decisionState,
    authorization_lane: args.lane,
    reason: args.reason,
    requirement_statuses: args.requirementStatuses,
    missing_requirements: missingRequirements,
    satisfied_requirements: satisfiedRequirements,
    should_create_migration_file_now: false,
    should_apply_supabase_migration_now: false,
    should_write_database_now: false,
    can_prepare_real_migration_file_later:
      args.canPrepareRealMigrationFileLater,
    can_move_to_real_migration_file_draft_step:
      args.canMoveToRealMigrationFileDraftStep,
    can_apply_any_database_change: false,
    safety_flags: buildSafetyFlags({
      missingRequirements,
      readinessGateConfirmed: args.readinessGateConfirmed,
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

export function resolveEventCanonicalMigrationAuthorizationDecision(
  input: EventCanonicalMigrationAuthorizationInput = {}
): EventCanonicalMigrationAuthorizationDecision {
  const requirementStatuses = buildRequirementStatuses(input);
  const missingRequirements = requirementStatuses.filter(
    (status) => !status.satisfied
  );
  const readinessGateConfirmed = input.readiness_gate_confirmed === true;
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
      canPrepareRealMigrationFileLater: false,
      canMoveToRealMigrationFileDraftStep: false,
      readinessGateConfirmed,
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
      canPrepareRealMigrationFileLater: false,
      canMoveToRealMigrationFileDraftStep: false,
      readinessGateConfirmed,
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
      canPrepareRealMigrationFileLater: false,
      canMoveToRealMigrationFileDraftStep: false,
      readinessGateConfirmed,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (!readinessGateConfirmed) {
    return buildDecision({
      decisionState: "blocked_readiness_not_confirmed",
      lane: "readiness_dependency_block_lane",
      reason: "readiness_gate_must_be_confirmed_before_authorization",
      requirementStatuses,
      canPrepareRealMigrationFileLater: false,
      canMoveToRealMigrationFileDraftStep: false,
      readinessGateConfirmed,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (missingRequirements.length > 0) {
    return buildDecision({
      decisionState: "hold_missing_authorization",
      lane: "authorization_hold_lane",
      reason:
        "authorization_requirements_missing_for_future_migration_file_preparation",
      requirementStatuses,
      canPrepareRealMigrationFileLater: false,
      canMoveToRealMigrationFileDraftStep: false,
      readinessGateConfirmed,
      realMigrationRequestedButBlocked,
      supabaseApplyRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  return buildDecision({
    decisionState: "authorized_for_future_migration_file_preparation",
    lane: "future_migration_authorization_lane",
    reason:
      "all_authorization_requirements_confirmed_for_future_migration_file_preparation",
    requirementStatuses,
    canPrepareRealMigrationFileLater: true,
    canMoveToRealMigrationFileDraftStep: true,
    readinessGateConfirmed,
    realMigrationRequestedButBlocked,
    supabaseApplyRequestedButBlocked,
    databaseWriteRequestedButBlocked,
  });
}

export const EVENT_CANONICAL_MIGRATION_AUTHORIZATION_DEFAULTS = {
  authorization_gate_only: true,
  migration_file_created: false,
  supabase_operation_performed: false,
  database_write_performed: false,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;