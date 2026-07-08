// src/app/api/official-events/_shared/realPilotReadinessAudit.ts

export type RealPilotReadinessAreaKey =
  | "canonical_schema_real_migration"
  | "canonical_event_admin_validation"
  | "event_page_canonical_binding"
  | "event_feature_gates"
  | "ticket_intent_canonical_binding"
  | "check_in_canonical_binding"
  | "rides_meetups_canonical_binding"
  | "event_connections_radar_binding"
  | "canonical_event_search_autocomplete"
  | "ticketing_integration_path_prepared"
  | "real_pilot_smoke_test"
  | "release_candidate_freeze";

export type RealPilotDependencyHorizon =
  | "pilot_20_days"
  | "ticketing_60_days"
  | "post_pilot";

export type RealPilotReadinessDecisionState =
  | "ready_to_start_real_pilot_engine_work"
  | "hold_missing_critical_pilot_area"
  | "blocked_unstable_repository"
  | "blocked_ticketing_dependency_misclassified"
  | "blocked_live_database_change_requested";

export type RealPilotReadinessLane =
  | "real_pilot_engine_execution_lane"
  | "real_pilot_audit_hold_lane"
  | "repository_stability_block_lane"
  | "ticketing_dependency_scope_block_lane"
  | "database_safety_block_lane";

export type RealPilotReadinessReason =
  | "critical_real_pilot_engine_areas_are_mapped"
  | "critical_real_pilot_engine_areas_missing"
  | "repository_must_be_clean_and_tagged_before_real_pilot_work"
  | "ticketing_integrations_must_be_prepared_but_not_required_for_20_day_pilot"
  | "live_database_change_requires_backup_and_explicit_migration_step";

export type RealPilotReadinessSafetyFlag =
  | "audit_only"
  | "no_runtime_behavior_changed"
  | "no_route_created"
  | "no_database_change"
  | "no_supabase_operation"
  | "no_external_request"
  | "no_visual_change"
  | "twenty_day_motor_scope_confirmed"
  | "sixty_day_ticketing_scope_confirmed"
  | "ticketing_not_immediate_blocker"
  | "manual_admin_validation_is_immediate_path"
  | "canonical_event_id_is_required"
  | "all_critical_areas_mapped"
  | "missing_critical_areas_detected"
  | "unstable_repository_blocked"
  | "ticketing_dependency_misclassified_blocked"
  | "live_database_change_blocked";

export type RealPilotReadinessAuditInput = {
  repository_clean_and_tagged?: boolean | null;
  canonical_schema_real_migration_mapped?: boolean | null;
  canonical_event_admin_validation_mapped?: boolean | null;
  event_page_canonical_binding_mapped?: boolean | null;
  event_feature_gates_mapped?: boolean | null;
  ticket_intent_canonical_binding_mapped?: boolean | null;
  check_in_canonical_binding_mapped?: boolean | null;
  rides_meetups_canonical_binding_mapped?: boolean | null;
  event_connections_radar_binding_mapped?: boolean | null;
  canonical_event_search_autocomplete_mapped?: boolean | null;
  ticketing_integration_path_prepared_mapped?: boolean | null;
  real_pilot_smoke_test_mapped?: boolean | null;
  release_candidate_freeze_mapped?: boolean | null;
  ticketing_integrations_required_for_20_day_pilot?: boolean | null;
  allow_live_database_change_in_audit_step?: boolean | null;
};

export type RealPilotReadinessAreaStatus = {
  area_key: RealPilotReadinessAreaKey;
  dependency_horizon: RealPilotDependencyHorizon;
  satisfied: boolean;
  blocking: boolean;
  description: string;
};

export type RealPilotReadinessDecision = {
  decision_state: RealPilotReadinessDecisionState;
  readiness_lane: RealPilotReadinessLane;
  reason: RealPilotReadinessReason;
  area_statuses: RealPilotReadinessAreaStatus[];
  missing_critical_areas: RealPilotReadinessAreaKey[];
  satisfied_areas: RealPilotReadinessAreaKey[];
  twenty_day_scope_area_count: number;
  sixty_day_ticketing_area_count: number;
  should_start_with_ticketing_api_integration_now: false;
  should_change_runtime_now: false;
  should_create_route_now: false;
  should_change_database_now: false;
  should_run_supabase_operation_now: false;
  can_start_real_pilot_engine_work: boolean;
  can_prepare_ticketing_integrations_in_parallel: boolean;
  can_present_scope_to_partners: boolean;
  safety_flags: RealPilotReadinessSafetyFlag[];
  external_request_performed: false;
  route_created: false;
  database_write_performed: false;
  supabase_operation_performed: false;
  visual_change_performed: false;
};

const REAL_PILOT_AREA_REQUIREMENTS: Array<{
  area_key: RealPilotReadinessAreaKey;
  input_key: keyof RealPilotReadinessAuditInput;
  dependency_horizon: RealPilotDependencyHorizon;
  description: string;
}> = [
  {
    area_key: "canonical_schema_real_migration",
    input_key: "canonical_schema_real_migration_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Apply the canonical event schema with safe RLS, backup, rollback and validation before real pilot features depend on it.",
  },
  {
    area_key: "canonical_event_admin_validation",
    input_key: "canonical_event_admin_validation_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Allow admin/manual validation to create or update canonical events and register source traces.",
  },
  {
    area_key: "event_page_canonical_binding",
    input_key: "event_page_canonical_binding_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Bind /event/[event_slug] to canonical_event_id instead of relying only on slug or loose candidate data.",
  },
  {
    area_key: "event_feature_gates",
    input_key: "event_feature_gates_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Enable check-in, ticket intent, rides, meetups, connections and radar only for validated canonical events.",
  },
  {
    area_key: "ticket_intent_canonical_binding",
    input_key: "ticket_intent_canonical_binding_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Attach ticket intent to canonical_event_id to avoid fragmented user demand across duplicated event references.",
  },
  {
    area_key: "check_in_canonical_binding",
    input_key: "check_in_canonical_binding_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Attach check-in to canonical_event_id and validate event status/window before presence becomes visible.",
  },
  {
    area_key: "rides_meetups_canonical_binding",
    input_key: "rides_meetups_canonical_binding_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Attach ride and meetup intents to canonical_event_id so all social actions occur inside the same valid event.",
  },
  {
    area_key: "event_connections_radar_binding",
    input_key: "event_connections_radar_binding_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Attach event radar and connection context to canonical_event_id so clubbers are matched inside the same event.",
  },
  {
    area_key: "canonical_event_search_autocomplete",
    input_key: "canonical_event_search_autocomplete_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Use canonical event search documents for event lookup, autocomplete and feature entry points.",
  },
  {
    area_key: "ticketing_integration_path_prepared",
    input_key: "ticketing_integration_path_prepared_mapped",
    dependency_horizon: "ticketing_60_days",
    description:
      "Keep provider_key, external_event_id, source URL, authority score and ingestion status ready for future ticketing APIs.",
  },
  {
    area_key: "real_pilot_smoke_test",
    input_key: "real_pilot_smoke_test_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Define and execute end-to-end smoke tests with real event, real clubbers and critical social flows.",
  },
  {
    area_key: "release_candidate_freeze",
    input_key: "release_candidate_freeze_mapped",
    dependency_horizon: "pilot_20_days",
    description:
      "Freeze a tagged release candidate only after build, validation and clean repository status.",
  },
];

function buildAreaStatuses(
  input: RealPilotReadinessAuditInput
): RealPilotReadinessAreaStatus[] {
  return REAL_PILOT_AREA_REQUIREMENTS.map((area) => {
    const satisfied = input[area.input_key] === true;

    return {
      area_key: area.area_key,
      dependency_horizon: area.dependency_horizon,
      satisfied,
      blocking: !satisfied,
      description: area.description,
    };
  });
}

function buildSafetyFlags(args: {
  missingCriticalAreas: RealPilotReadinessAreaKey[];
  repositoryStable: boolean;
  ticketingDependencyMisclassified: boolean;
  liveDatabaseChangeRequested: boolean;
}): RealPilotReadinessSafetyFlag[] {
  const flags: RealPilotReadinessSafetyFlag[] = [
    "audit_only",
    "no_runtime_behavior_changed",
    "no_route_created",
    "no_database_change",
    "no_supabase_operation",
    "no_external_request",
    "no_visual_change",
    "twenty_day_motor_scope_confirmed",
    "sixty_day_ticketing_scope_confirmed",
    "ticketing_not_immediate_blocker",
    "manual_admin_validation_is_immediate_path",
    "canonical_event_id_is_required",
  ];

  if (args.missingCriticalAreas.length === 0) {
    flags.push("all_critical_areas_mapped");
  } else {
    flags.push("missing_critical_areas_detected");
  }

  if (!args.repositoryStable) {
    flags.push("unstable_repository_blocked");
  }

  if (args.ticketingDependencyMisclassified) {
    flags.push("ticketing_dependency_misclassified_blocked");
  }

  if (args.liveDatabaseChangeRequested) {
    flags.push("live_database_change_blocked");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: RealPilotReadinessDecisionState;
  lane: RealPilotReadinessLane;
  reason: RealPilotReadinessReason;
  areaStatuses: RealPilotReadinessAreaStatus[];
  canStartRealPilotEngineWork: boolean;
  canPrepareTicketingIntegrationsInParallel: boolean;
  canPresentScopeToPartners: boolean;
  repositoryStable: boolean;
  ticketingDependencyMisclassified: boolean;
  liveDatabaseChangeRequested: boolean;
}): RealPilotReadinessDecision {
  const missingCriticalAreas = args.areaStatuses
    .filter((area) => !area.satisfied)
    .map((area) => area.area_key);

  const satisfiedAreas = args.areaStatuses
    .filter((area) => area.satisfied)
    .map((area) => area.area_key);

  return {
    decision_state: args.decisionState,
    readiness_lane: args.lane,
    reason: args.reason,
    area_statuses: args.areaStatuses,
    missing_critical_areas: missingCriticalAreas,
    satisfied_areas: satisfiedAreas,
    twenty_day_scope_area_count: args.areaStatuses.filter(
      (area) => area.dependency_horizon === "pilot_20_days"
    ).length,
    sixty_day_ticketing_area_count: args.areaStatuses.filter(
      (area) => area.dependency_horizon === "ticketing_60_days"
    ).length,
    should_start_with_ticketing_api_integration_now: false,
    should_change_runtime_now: false,
    should_create_route_now: false,
    should_change_database_now: false,
    should_run_supabase_operation_now: false,
    can_start_real_pilot_engine_work: args.canStartRealPilotEngineWork,
    can_prepare_ticketing_integrations_in_parallel:
      args.canPrepareTicketingIntegrationsInParallel,
    can_present_scope_to_partners: args.canPresentScopeToPartners,
    safety_flags: buildSafetyFlags({
      missingCriticalAreas,
      repositoryStable: args.repositoryStable,
      ticketingDependencyMisclassified: args.ticketingDependencyMisclassified,
      liveDatabaseChangeRequested: args.liveDatabaseChangeRequested,
    }),
    external_request_performed: false,
    route_created: false,
    database_write_performed: false,
    supabase_operation_performed: false,
    visual_change_performed: false,
  };
}

export function resolveRealPilotReadinessAuditDecision(
  input: RealPilotReadinessAuditInput = {}
): RealPilotReadinessDecision {
  const areaStatuses = buildAreaStatuses(input);
  const missingCriticalAreas = areaStatuses.filter((area) => !area.satisfied);
  const repositoryStable = input.repository_clean_and_tagged === true;
  const ticketingDependencyMisclassified =
    input.ticketing_integrations_required_for_20_day_pilot === true;
  const liveDatabaseChangeRequested =
    input.allow_live_database_change_in_audit_step === true;

  if (liveDatabaseChangeRequested) {
    return buildDecision({
      decisionState: "blocked_live_database_change_requested",
      lane: "database_safety_block_lane",
      reason: "live_database_change_requires_backup_and_explicit_migration_step",
      areaStatuses,
      canStartRealPilotEngineWork: false,
      canPrepareTicketingIntegrationsInParallel: false,
      canPresentScopeToPartners: false,
      repositoryStable,
      ticketingDependencyMisclassified,
      liveDatabaseChangeRequested,
    });
  }

  if (ticketingDependencyMisclassified) {
    return buildDecision({
      decisionState: "blocked_ticketing_dependency_misclassified",
      lane: "ticketing_dependency_scope_block_lane",
      reason:
        "ticketing_integrations_must_be_prepared_but_not_required_for_20_day_pilot",
      areaStatuses,
      canStartRealPilotEngineWork: false,
      canPrepareTicketingIntegrationsInParallel: true,
      canPresentScopeToPartners: true,
      repositoryStable,
      ticketingDependencyMisclassified,
      liveDatabaseChangeRequested,
    });
  }

  if (!repositoryStable) {
    return buildDecision({
      decisionState: "blocked_unstable_repository",
      lane: "repository_stability_block_lane",
      reason: "repository_must_be_clean_and_tagged_before_real_pilot_work",
      areaStatuses,
      canStartRealPilotEngineWork: false,
      canPrepareTicketingIntegrationsInParallel: false,
      canPresentScopeToPartners: false,
      repositoryStable,
      ticketingDependencyMisclassified,
      liveDatabaseChangeRequested,
    });
  }

  if (missingCriticalAreas.length > 0) {
    return buildDecision({
      decisionState: "hold_missing_critical_pilot_area",
      lane: "real_pilot_audit_hold_lane",
      reason: "critical_real_pilot_engine_areas_missing",
      areaStatuses,
      canStartRealPilotEngineWork: true,
      canPrepareTicketingIntegrationsInParallel: true,
      canPresentScopeToPartners: true,
      repositoryStable,
      ticketingDependencyMisclassified,
      liveDatabaseChangeRequested,
    });
  }

  return buildDecision({
    decisionState: "ready_to_start_real_pilot_engine_work",
    lane: "real_pilot_engine_execution_lane",
    reason: "critical_real_pilot_engine_areas_are_mapped",
    areaStatuses,
    canStartRealPilotEngineWork: true,
    canPrepareTicketingIntegrationsInParallel: true,
    canPresentScopeToPartners: true,
    repositoryStable,
    ticketingDependencyMisclassified,
    liveDatabaseChangeRequested,
  });
}

export const REAL_PILOT_READINESS_AUDIT_DEFAULTS = {
  audit_only: true,
  route_created: false,
  database_write_performed: false,
  supabase_operation_performed: false,
  external_request_performed: false,
  visual_change_performed: false,
  should_start_with_ticketing_api_integration_now: false,
} as const;