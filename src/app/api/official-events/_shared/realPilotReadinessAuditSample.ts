// src/app/api/official-events/_shared/realPilotReadinessAuditSample.ts

import type {
  RealPilotReadinessAuditInput,
  RealPilotReadinessDecision,
  RealPilotReadinessDecisionState,
  RealPilotReadinessLane,
  RealPilotReadinessReason,
} from "./realPilotReadinessAudit";

import { resolveRealPilotReadinessAuditDecision } from "./realPilotReadinessAudit";

export type RealPilotReadinessAuditSampleCase = {
  case_key: string;
  description: string;
  input: RealPilotReadinessAuditInput;
  expected_decision_state: RealPilotReadinessDecisionState;
  expected_lane: RealPilotReadinessLane;
  expected_reason: RealPilotReadinessReason;
  expected_missing_critical_area_count: number;
  expected_can_start_real_pilot_engine_work: boolean;
  expected_can_prepare_ticketing_integrations_in_parallel: boolean;
  expected_can_present_scope_to_partners: boolean;
};

export type RealPilotReadinessAuditSampleResult = {
  case_key: string;
  description: string;
  decision: RealPilotReadinessDecision;
  matched_expected_decision: boolean;
};

export type RealPilotReadinessAuditSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  audit_only: true;
  route_created: false;
  database_write_performed: false;
  supabase_operation_performed: false;
  external_request_performed: false;
  visual_change_performed: false;
  all_sample_cases_valid: boolean;
  results: RealPilotReadinessAuditSampleResult[];
};

const ALL_REAL_PILOT_AREAS_MAPPED: RealPilotReadinessAuditInput = {
  repository_clean_and_tagged: true,
  canonical_schema_real_migration_mapped: true,
  canonical_event_admin_validation_mapped: true,
  event_page_canonical_binding_mapped: true,
  event_feature_gates_mapped: true,
  ticket_intent_canonical_binding_mapped: true,
  check_in_canonical_binding_mapped: true,
  rides_meetups_canonical_binding_mapped: true,
  event_connections_radar_binding_mapped: true,
  canonical_event_search_autocomplete_mapped: true,
  ticketing_integration_path_prepared_mapped: true,
  real_pilot_smoke_test_mapped: true,
  release_candidate_freeze_mapped: true,
  ticketing_integrations_required_for_20_day_pilot: false,
  allow_live_database_change_in_audit_step: false,
};

export const REAL_PILOT_READINESS_AUDIT_SAMPLE_CASES: RealPilotReadinessAuditSampleCase[] =
  [
    {
      case_key: "ready_to_start_real_pilot_engine_work",
      description:
        "All critical real pilot areas are mapped and ticketing APIs are correctly scoped for the 60-day path.",
      input: ALL_REAL_PILOT_AREAS_MAPPED,
      expected_decision_state: "ready_to_start_real_pilot_engine_work",
      expected_lane: "real_pilot_engine_execution_lane",
      expected_reason: "critical_real_pilot_engine_areas_are_mapped",
      expected_missing_critical_area_count: 0,
      expected_can_start_real_pilot_engine_work: true,
      expected_can_prepare_ticketing_integrations_in_parallel: true,
      expected_can_present_scope_to_partners: true,
    },
    {
      case_key: "missing_rides_and_radar_mapping_holds_audit",
      description:
        "The audit remains actionable when rides, meetups and radar binding are not mapped yet.",
      input: {
        ...ALL_REAL_PILOT_AREAS_MAPPED,
        rides_meetups_canonical_binding_mapped: false,
        event_connections_radar_binding_mapped: false,
      },
      expected_decision_state: "hold_missing_critical_pilot_area",
      expected_lane: "real_pilot_audit_hold_lane",
      expected_reason: "critical_real_pilot_engine_areas_missing",
      expected_missing_critical_area_count: 2,
      expected_can_start_real_pilot_engine_work: true,
      expected_can_prepare_ticketing_integrations_in_parallel: true,
      expected_can_present_scope_to_partners: true,
    },
    {
      case_key: "unstable_repository_blocks_real_pilot_work",
      description:
        "Real pilot work is blocked if the repository is not clean and tagged.",
      input: {
        ...ALL_REAL_PILOT_AREAS_MAPPED,
        repository_clean_and_tagged: false,
      },
      expected_decision_state: "blocked_unstable_repository",
      expected_lane: "repository_stability_block_lane",
      expected_reason: "repository_must_be_clean_and_tagged_before_real_pilot_work",
      expected_missing_critical_area_count: 0,
      expected_can_start_real_pilot_engine_work: false,
      expected_can_prepare_ticketing_integrations_in_parallel: false,
      expected_can_present_scope_to_partners: false,
    },
    {
      case_key: "ticketing_required_for_20_day_pilot_is_blocked",
      description:
        "Ticketing APIs must be prepared, but cannot be classified as immediate 20-day pilot dependency.",
      input: {
        ...ALL_REAL_PILOT_AREAS_MAPPED,
        ticketing_integrations_required_for_20_day_pilot: true,
      },
      expected_decision_state: "blocked_ticketing_dependency_misclassified",
      expected_lane: "ticketing_dependency_scope_block_lane",
      expected_reason:
        "ticketing_integrations_must_be_prepared_but_not_required_for_20_day_pilot",
      expected_missing_critical_area_count: 0,
      expected_can_start_real_pilot_engine_work: false,
      expected_can_prepare_ticketing_integrations_in_parallel: true,
      expected_can_present_scope_to_partners: true,
    },
    {
      case_key: "live_database_change_in_audit_step_is_blocked",
      description:
        "The audit step cannot perform live database changes; migration must be a dedicated explicit step.",
      input: {
        ...ALL_REAL_PILOT_AREAS_MAPPED,
        allow_live_database_change_in_audit_step: true,
      },
      expected_decision_state: "blocked_live_database_change_requested",
      expected_lane: "database_safety_block_lane",
      expected_reason:
        "live_database_change_requires_backup_and_explicit_migration_step",
      expected_missing_critical_area_count: 0,
      expected_can_start_real_pilot_engine_work: false,
      expected_can_prepare_ticketing_integrations_in_parallel: false,
      expected_can_present_scope_to_partners: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: RealPilotReadinessAuditSampleCase,
  decision: RealPilotReadinessDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.readiness_lane === sampleCase.expected_lane &&
    decision.reason === sampleCase.expected_reason &&
    decision.missing_critical_areas.length ===
      sampleCase.expected_missing_critical_area_count &&
    decision.can_start_real_pilot_engine_work ===
      sampleCase.expected_can_start_real_pilot_engine_work &&
    decision.can_prepare_ticketing_integrations_in_parallel ===
      sampleCase.expected_can_prepare_ticketing_integrations_in_parallel &&
    decision.can_present_scope_to_partners ===
      sampleCase.expected_can_present_scope_to_partners &&
    decision.should_start_with_ticketing_api_integration_now === false &&
    decision.should_change_runtime_now === false &&
    decision.should_create_route_now === false &&
    decision.should_change_database_now === false &&
    decision.should_run_supabase_operation_now === false &&
    decision.external_request_performed === false &&
    decision.route_created === false &&
    decision.database_write_performed === false &&
    decision.supabase_operation_performed === false &&
    decision.visual_change_performed === false
  );
}

export function runRealPilotReadinessAuditSample(): RealPilotReadinessAuditSampleSummary {
  const results = REAL_PILOT_READINESS_AUDIT_SAMPLE_CASES.map((sampleCase) => {
    const decision = resolveRealPilotReadinessAuditDecision(sampleCase.input);

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
    audit_only: true,
    route_created: false,
    database_write_performed: false,
    supabase_operation_performed: false,
    external_request_performed: false,
    visual_change_performed: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateRealPilotReadinessAuditSample(): boolean {
  const summary = runRealPilotReadinessAuditSample();

  return (
    summary.sample_case_count === 5 &&
    summary.valid_sample_case_count === 5 &&
    summary.invalid_sample_case_count === 0 &&
    summary.audit_only === true &&
    summary.route_created === false &&
    summary.database_write_performed === false &&
    summary.supabase_operation_performed === false &&
    summary.external_request_performed === false &&
    summary.visual_change_performed === false &&
    summary.all_sample_cases_valid === true
  );
}

export const REAL_PILOT_READINESS_AUDIT_SAMPLE_RESULT =
  runRealPilotReadinessAuditSample();

export const REAL_PILOT_READINESS_AUDIT_SAMPLE_IS_VALID =
  validateRealPilotReadinessAuditSample();