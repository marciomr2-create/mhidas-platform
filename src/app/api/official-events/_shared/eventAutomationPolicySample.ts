// src/app/api/official-events/_shared/eventAutomationPolicySample.ts

import type {
  EventAutomationDecisionState,
  EventAutomationLane,
  EventAutomationPolicyDecision,
  EventAutomationPolicyInput,
} from "./eventAutomationPolicy";

import { resolveEventAutomationPolicyDecision } from "./eventAutomationPolicy";

export type EventAutomationPolicySampleCase = {
  case_key: string;
  description: string;
  input: EventAutomationPolicyInput;
  expected_decision_state: EventAutomationDecisionState;
  expected_automation_lane: EventAutomationLane;
  expected_publish_candidate_allowed: boolean;
  expected_blocked: boolean;
};

export type EventAutomationPolicySampleResult = {
  case_key: string;
  description: string;
  decision: EventAutomationPolicyDecision;
  matched_expected_decision: boolean;
};

export type EventAutomationPolicySampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  human_event_analysis_required: false;
  all_sample_cases_valid: boolean;
  results: EventAutomationPolicySampleResult[];
};

export const EVENT_AUTOMATION_POLICY_SAMPLE_CASES: EventAutomationPolicySampleCase[] =
  [
    {
      case_key: "authorized_ticketing_api_safe_candidate",
      description:
        "Authorized ticketing API source with complete identity and strong signals becomes a safe publish candidate, but real auto-publish remains disabled.",
      input: {
        source_authorization_status: "api_authorized",
        source_role: "authorized_ticketing_api",
        source_count: 3,
        strong_source_signal_count: 3,
        authorized_ticketing_source_count: 1,
        official_source_count: 1,
        verified_venue_source_count: 1,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
        has_valid_event_name: true,
        has_valid_event_date: true,
        has_valid_location: true,
        has_valid_official_url: true,
        has_ticket_url: true,
        is_event_expired: false,
        is_low_quality_discovery_source: false,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "safe_auto_publish_candidate",
      expected_automation_lane: "safe_candidate_hold",
      expected_publish_candidate_allowed: true,
      expected_blocked: false,
    },
    {
      case_key: "official_source_needs_more_signals",
      description:
        "Official source with incomplete confidence should wait for more signals instead of being sent to human review.",
      input: {
        source_authorization_status: "official_verified",
        source_role: "official_event_source",
        source_count: 1,
        strong_source_signal_count: 1,
        authorized_ticketing_source_count: 0,
        official_source_count: 1,
        verified_venue_source_count: 0,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
        has_valid_event_name: true,
        has_valid_event_date: true,
        has_valid_location: true,
        has_valid_official_url: true,
        has_ticket_url: false,
        is_event_expired: false,
        is_low_quality_discovery_source: false,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "needs_more_source_signals",
      expected_automation_lane: "signal_accumulation",
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
    {
      case_key: "conflicting_sources_blocked",
      description:
        "Critical conflict between sources blocks automation until the system receives stronger consistent signals.",
      input: {
        source_authorization_status: "partner_verified",
        source_role: "producer",
        source_count: 2,
        strong_source_signal_count: 2,
        authorized_ticketing_source_count: 0,
        official_source_count: 1,
        verified_venue_source_count: 1,
        critical_conflict_count: 1,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
        has_valid_event_name: true,
        has_valid_event_date: true,
        has_valid_location: true,
        has_valid_official_url: true,
        has_ticket_url: false,
        is_event_expired: false,
        is_low_quality_discovery_source: false,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "blocked_by_conflict",
      expected_automation_lane: "conflict_block",
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "validation_error_blocked",
      description:
        "Validation error blocks the candidate automatically without human analysis.",
      input: {
        source_authorization_status: "api_authorized",
        source_role: "authorized_ticketing_api",
        source_count: 2,
        strong_source_signal_count: 2,
        authorized_ticketing_source_count: 1,
        official_source_count: 0,
        verified_venue_source_count: 1,
        critical_conflict_count: 0,
        validation_error_count: 1,
        duplicate_candidate_count: 0,
        has_valid_event_name: true,
        has_valid_event_date: false,
        has_valid_location: true,
        has_valid_official_url: true,
        has_ticket_url: true,
        is_event_expired: false,
        is_low_quality_discovery_source: false,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "blocked_by_validation",
      expected_automation_lane: "validation_block",
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "duplicate_candidate_detected",
      description:
        "Possible duplicate enters automatic duplicate resolution instead of publication.",
      input: {
        source_authorization_status: "official_verified",
        source_role: "venue",
        source_count: 2,
        strong_source_signal_count: 2,
        authorized_ticketing_source_count: 0,
        official_source_count: 1,
        verified_venue_source_count: 1,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 1,
        has_valid_event_name: true,
        has_valid_event_date: true,
        has_valid_location: true,
        has_valid_official_url: true,
        has_ticket_url: false,
        is_event_expired: false,
        is_low_quality_discovery_source: false,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "duplicate_candidate",
      expected_automation_lane: "duplicate_resolution",
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
    {
      case_key: "expired_event_discarded",
      description:
        "Expired event is discarded by policy.",
      input: {
        source_authorization_status: "official_verified",
        source_role: "official_event_source",
        source_count: 2,
        strong_source_signal_count: 2,
        authorized_ticketing_source_count: 0,
        official_source_count: 2,
        verified_venue_source_count: 0,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
        has_valid_event_name: true,
        has_valid_event_date: true,
        has_valid_location: true,
        has_valid_official_url: true,
        has_ticket_url: false,
        is_event_expired: true,
        is_low_quality_discovery_source: false,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "discarded_by_policy",
      expected_automation_lane: "policy_discard",
      expected_publish_candidate_allowed: false,
      expected_blocked: true,
    },
    {
      case_key: "editorial_discovery_only",
      description:
        "Editorial or discovery-only source helps discover an event but cannot publish it.",
      input: {
        source_authorization_status: "public_unverified",
        source_role: "editorial_source",
        source_count: 1,
        strong_source_signal_count: 0,
        authorized_ticketing_source_count: 0,
        official_source_count: 0,
        verified_venue_source_count: 0,
        critical_conflict_count: 0,
        validation_error_count: 0,
        duplicate_candidate_count: 0,
        has_valid_event_name: true,
        has_valid_event_date: true,
        has_valid_location: false,
        has_valid_official_url: false,
        has_ticket_url: false,
        is_event_expired: false,
        is_low_quality_discovery_source: true,
        real_auto_publish_enabled: false,
      },
      expected_decision_state: "discovery_only",
      expected_automation_lane: "discovery_index",
      expected_publish_candidate_allowed: false,
      expected_blocked: false,
    },
  ];

function doesDecisionMatchSampleCase(
  sampleCase: EventAutomationPolicySampleCase,
  decision: EventAutomationPolicyDecision
): boolean {
  return (
    decision.decision_state === sampleCase.expected_decision_state &&
    decision.automation_lane === sampleCase.expected_automation_lane &&
    decision.publish_candidate_allowed ===
      sampleCase.expected_publish_candidate_allowed &&
    decision.blocked === sampleCase.expected_blocked &&
    decision.real_auto_publish_enabled === false &&
    decision.real_auto_publish_allowed === false &&
    decision.safety_flags.includes("real_auto_publish_disabled")
  );
}

export function runEventAutomationPolicySample(): EventAutomationPolicySampleSummary {
  const results = EVENT_AUTOMATION_POLICY_SAMPLE_CASES.map((sampleCase) => {
    const decision = resolveEventAutomationPolicyDecision(sampleCase.input);

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
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
    human_event_analysis_required: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventAutomationPolicySample(): boolean {
  const summary = runEventAutomationPolicySample();

  return (
    summary.sample_case_count === 7 &&
    summary.valid_sample_case_count === 7 &&
    summary.invalid_sample_case_count === 0 &&
    summary.real_auto_publish_enabled === false &&
    summary.real_auto_publish_allowed === false &&
    summary.human_event_analysis_required === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_AUTOMATION_POLICY_SAMPLE_RESULT =
  runEventAutomationPolicySample();

export const EVENT_AUTOMATION_POLICY_SAMPLE_IS_VALID =
  validateEventAutomationPolicySample();