// src/app/api/official-events/_shared/eventMultiSourceReviewContract.ts

import type {
  EventMultiSourceQualityDecisionInput,
  EventMultiSourceQualityDecisionKey,
  EventMultiSourceQualityDecisionSummary,
} from "./eventMultiSourceQualityDecisionMatrix";

import {
  EVENT_MULTI_SOURCE_QUALITY_DECISION_MATRIX,
  resolveEventMultiSourceQualityDecision,
} from "./eventMultiSourceQualityDecisionMatrix";

export type EventMultiSourceReviewContractKey =
  | "manual_review_queue"
  | "priority_manual_review_queue"
  | "blocked_queue"
  | "manual_triage_queue";

export type EventMultiSourceReviewLane =
  | "normal_manual_review"
  | "high_priority_manual_review"
  | "blocked_review"
  | "manual_triage";

export type EventMultiSourceReviewAdminAction =
  | "review_candidate"
  | "review_conflicting_sources"
  | "keep_blocked"
  | "triage_candidate";

export type EventMultiSourceReviewContractInput =
  EventMultiSourceQualityDecisionInput & {
    candidate_key?: string | null;
    event_name?: string | null;
  };

export type EventMultiSourceReviewContract = {
  contract_key: EventMultiSourceReviewContractKey;
  review_lane: EventMultiSourceReviewLane;
  admin_action: EventMultiSourceReviewAdminAction;
  decision: EventMultiSourceQualityDecisionSummary;
  candidate_key: string | null;
  event_name: string | null;
  requires_human_decision: true;
  manual_review_allowed: boolean;
  automatic_publication_allowed: false;
  automatic_publication_blocked: true;
  safety_notes: string[];
};

function resolveContractKey(
  decisionKey: EventMultiSourceQualityDecisionKey
): EventMultiSourceReviewContractKey {
  switch (decisionKey) {
    case "ready_for_manual_review":
      return "manual_review_queue";

    case "mixed_manual_review":
      return "priority_manual_review_queue";

    case "blocked_from_review":
      return "blocked_queue";

    case "requires_manual_triage":
      return "manual_triage_queue";
  }
}

function resolveReviewLane(
  decisionKey: EventMultiSourceQualityDecisionKey
): EventMultiSourceReviewLane {
  switch (decisionKey) {
    case "ready_for_manual_review":
      return "normal_manual_review";

    case "mixed_manual_review":
      return "high_priority_manual_review";

    case "blocked_from_review":
      return "blocked_review";

    case "requires_manual_triage":
      return "manual_triage";
  }
}

function resolveAdminAction(
  decisionKey: EventMultiSourceQualityDecisionKey
): EventMultiSourceReviewAdminAction {
  switch (decisionKey) {
    case "ready_for_manual_review":
      return "review_candidate";

    case "mixed_manual_review":
      return "review_conflicting_sources";

    case "blocked_from_review":
      return "keep_blocked";

    case "requires_manual_triage":
      return "triage_candidate";
  }
}

function buildSafetyNotes(
  decision: EventMultiSourceQualityDecisionSummary
): string[] {
  const notes = [
    "Automatic publication remains disabled.",
    "A human reviewer must confirm any publication decision in a future admin flow.",
  ];

  if (decision.decision_key === "mixed_manual_review") {
    notes.push(
      "At least one source is review-ready and at least one source is blocked."
    );
  }

  if (decision.decision_key === "blocked_from_review") {
    notes.push("The candidate must remain blocked until its source state changes.");
  }

  if (decision.decision_key === "requires_manual_triage") {
    notes.push("The candidate requires manual triage before normal review.");
  }

  return notes;
}

export function resolveEventMultiSourceReviewContract(
  input: EventMultiSourceReviewContractInput
): EventMultiSourceReviewContract {
  const decision = resolveEventMultiSourceQualityDecision(input);

  return {
    contract_key: resolveContractKey(decision.decision_key),
    review_lane: resolveReviewLane(decision.decision_key),
    admin_action: resolveAdminAction(decision.decision_key),
    decision,
    candidate_key: input.candidate_key ?? null,
    event_name: input.event_name ?? null,
    requires_human_decision: true,
    manual_review_allowed: decision.manual_review_allowed,
    automatic_publication_allowed: false,
    automatic_publication_blocked: true,
    safety_notes: buildSafetyNotes(decision),
  };
}

export const EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE_CASES =
  EVENT_MULTI_SOURCE_QUALITY_DECISION_MATRIX.map((matrixCase) => ({
    case_key: matrixCase.case_key,
    description: matrixCase.description,
    contract: resolveEventMultiSourceReviewContract({
      ...matrixCase.input,
      candidate_key: `sample-${matrixCase.case_key}`,
      event_name: `Sample ${matrixCase.case_key}`,
    }),
  }));

export function validateEventMultiSourceReviewContracts(): boolean {
  return EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE_CASES.every(
    (sampleCase) =>
      sampleCase.contract.requires_human_decision === true &&
      sampleCase.contract.automatic_publication_allowed === false &&
      sampleCase.contract.automatic_publication_blocked === true &&
      sampleCase.contract.safety_notes.length >= 2
  );
}

export const EVENT_MULTI_SOURCE_REVIEW_CONTRACTS_ARE_VALID =
  validateEventMultiSourceReviewContracts();