// src/app/api/official-events/_shared/eventMultiSourceReviewContractSample.ts

import type {
  EventMultiSourceReviewAdminAction,
  EventMultiSourceReviewContract,
  EventMultiSourceReviewContractInput,
  EventMultiSourceReviewContractKey,
  EventMultiSourceReviewLane,
} from "./eventMultiSourceReviewContract";

import { resolveEventMultiSourceReviewContract } from "./eventMultiSourceReviewContract";

export type EventMultiSourceReviewContractSampleCase = {
  case_key: string;
  description: string;
  input: EventMultiSourceReviewContractInput;
  expected_contract_key: EventMultiSourceReviewContractKey;
  expected_review_lane: EventMultiSourceReviewLane;
  expected_admin_action: EventMultiSourceReviewAdminAction;
  expected_manual_review_allowed: boolean;
};

export type EventMultiSourceReviewContractSampleResult = {
  case_key: string;
  description: string;
  contract: EventMultiSourceReviewContract;
  matched_expected_contract: boolean;
};

export type EventMultiSourceReviewContractSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  automatic_publication_allowed: false;
  automatic_publication_blocked: true;
  requires_human_decision: true;
  all_sample_cases_valid: boolean;
  results: EventMultiSourceReviewContractSampleResult[];
};

export const EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE_CASES: EventMultiSourceReviewContractSampleCase[] =
  [
    {
      case_key: "all_sources_ready_for_review",
      description:
        "Multiple sources are ready for manual review and should enter the normal manual review queue.",
      input: {
        candidate_key: "sample-ready-candidate-v4-8-37",
        event_name: "Sample Ready Candidate",
        quality_status: "ready_for_review",
        source_count: 2,
        ready_for_manual_review_source_count: 2,
        blocked_source_count: 0,
        total_review_ready_candidate_count: 2,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_contract_key: "manual_review_queue",
      expected_review_lane: "normal_manual_review",
      expected_admin_action: "review_candidate",
      expected_manual_review_allowed: true,
    },
    {
      case_key: "ready_and_blocked_sources",
      description:
        "One source is ready and one source is blocked, so the candidate should enter priority manual review.",
      input: {
        candidate_key: "sample-mixed-candidate-v4-8-37",
        event_name: "Sample Mixed Candidate",
        quality_status: "mixed_review",
        source_count: 2,
        ready_for_manual_review_source_count: 1,
        blocked_source_count: 1,
        total_review_ready_candidate_count: 1,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_contract_key: "priority_manual_review_queue",
      expected_review_lane: "high_priority_manual_review",
      expected_admin_action: "review_conflicting_sources",
      expected_manual_review_allowed: true,
    },
    {
      case_key: "all_sources_blocked",
      description:
        "All sources are blocked, so the candidate should remain in the blocked queue.",
      input: {
        candidate_key: "sample-blocked-candidate-v4-8-37",
        event_name: "Sample Blocked Candidate",
        quality_status: "blocked",
        source_count: 2,
        ready_for_manual_review_source_count: 0,
        blocked_source_count: 2,
        total_review_ready_candidate_count: 0,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_contract_key: "blocked_queue",
      expected_review_lane: "blocked_review",
      expected_admin_action: "keep_blocked",
      expected_manual_review_allowed: false,
    },
    {
      case_key: "unknown_quality_requires_triage",
      description:
        "An unknown quality state with available sources should enter manual triage.",
      input: {
        candidate_key: "sample-triage-candidate-v4-8-37",
        event_name: "Sample Triage Candidate",
        quality_status: "unknown_quality_state",
        source_count: 1,
        ready_for_manual_review_source_count: 0,
        blocked_source_count: 0,
        total_review_ready_candidate_count: 0,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_contract_key: "manual_triage_queue",
      expected_review_lane: "manual_triage",
      expected_admin_action: "triage_candidate",
      expected_manual_review_allowed: true,
    },
  ];

function doesContractMatchSampleCase(
  sampleCase: EventMultiSourceReviewContractSampleCase,
  contract: EventMultiSourceReviewContract
): boolean {
  return (
    contract.contract_key === sampleCase.expected_contract_key &&
    contract.review_lane === sampleCase.expected_review_lane &&
    contract.admin_action === sampleCase.expected_admin_action &&
    contract.manual_review_allowed ===
      sampleCase.expected_manual_review_allowed &&
    contract.requires_human_decision === true &&
    contract.automatic_publication_allowed === false &&
    contract.automatic_publication_blocked === true &&
    contract.safety_notes.length >= 2
  );
}

export function runEventMultiSourceReviewContractSample(): EventMultiSourceReviewContractSampleSummary {
  const results = EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE_CASES.map(
    (sampleCase) => {
      const contract = resolveEventMultiSourceReviewContract(sampleCase.input);

      return {
        case_key: sampleCase.case_key,
        description: sampleCase.description,
        contract,
        matched_expected_contract: doesContractMatchSampleCase(
          sampleCase,
          contract
        ),
      };
    }
  );

  const validSampleCaseCount = results.filter(
    (result) => result.matched_expected_contract
  ).length;

  return {
    sample_case_count: results.length,
    valid_sample_case_count: validSampleCaseCount,
    invalid_sample_case_count: results.length - validSampleCaseCount,
    automatic_publication_allowed: false,
    automatic_publication_blocked: true,
    requires_human_decision: true,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventMultiSourceReviewContractSample(): boolean {
  const summary = runEventMultiSourceReviewContractSample();

  return (
    summary.sample_case_count === 4 &&
    summary.valid_sample_case_count === 4 &&
    summary.invalid_sample_case_count === 0 &&
    summary.automatic_publication_allowed === false &&
    summary.automatic_publication_blocked === true &&
    summary.requires_human_decision === true &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE_RESULT =
  runEventMultiSourceReviewContractSample();

export const EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE_IS_VALID =
  validateEventMultiSourceReviewContractSample();