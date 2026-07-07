// src/app/api/official-events/_shared/eventMultiSourceQualityDecisionMatrix.ts

export type EventMultiSourceQualityDecisionKey =
  | "ready_for_manual_review"
  | "mixed_manual_review"
  | "blocked_from_review"
  | "requires_manual_triage";

export type EventMultiSourceQualityDecisionPriority =
  | "normal"
  | "high"
  | "blocked";

export type EventMultiSourceQualityDecisionInput = {
  quality_status?: string | null;
  source_count?: number | string | null;
  ready_for_manual_review_source_count?: number | string | null;
  blocked_source_count?: number | string | null;
  total_review_ready_candidate_count?: number | string | null;
  total_automatic_publication_candidate_count?: number | string | null;
  automatic_publication_allowed?: boolean | null;
  automatic_publication_blocked?: boolean | null;
};

export type EventMultiSourceQualityDecisionSummary = {
  decision_key: EventMultiSourceQualityDecisionKey;
  decision_priority: EventMultiSourceQualityDecisionPriority;
  manual_review_allowed: boolean;
  automatic_publication_allowed: false;
  automatic_publication_blocked: true;
  reason_code: string;
};

export type EventMultiSourceQualityDecisionMatrixCase = {
  case_key: string;
  description: string;
  input: EventMultiSourceQualityDecisionInput;
  expected_decision_key: EventMultiSourceQualityDecisionKey;
  expected_decision_priority: EventMultiSourceQualityDecisionPriority;
  expected_manual_review_allowed: boolean;
};

function toNonNegativeInteger(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }

  return 0;
}

function normalizeQualityStatus(value: string | null | undefined): string {
  if (!value) {
    return "unknown";
  }

  return value.trim().toLowerCase();
}

export function resolveEventMultiSourceQualityDecision(
  input: EventMultiSourceQualityDecisionInput
): EventMultiSourceQualityDecisionSummary {
  const qualityStatus = normalizeQualityStatus(input.quality_status);
  const sourceCount = toNonNegativeInteger(input.source_count);
  const readyForManualReviewSourceCount = toNonNegativeInteger(
    input.ready_for_manual_review_source_count
  );
  const blockedSourceCount = toNonNegativeInteger(input.blocked_source_count);
  const reviewReadyCandidateCount = toNonNegativeInteger(
    input.total_review_ready_candidate_count
  );

  if (sourceCount <= 0) {
    return {
      decision_key: "blocked_from_review",
      decision_priority: "blocked",
      manual_review_allowed: false,
      automatic_publication_allowed: false,
      automatic_publication_blocked: true,
      reason_code: "no_sources_available",
    };
  }

  if (
    qualityStatus === "blocked" ||
    (blockedSourceCount >= sourceCount && readyForManualReviewSourceCount === 0)
  ) {
    return {
      decision_key: "blocked_from_review",
      decision_priority: "blocked",
      manual_review_allowed: false,
      automatic_publication_allowed: false,
      automatic_publication_blocked: true,
      reason_code: "all_sources_blocked",
    };
  }

  if (
    qualityStatus === "mixed_review" ||
    (readyForManualReviewSourceCount > 0 && blockedSourceCount > 0)
  ) {
    return {
      decision_key: "mixed_manual_review",
      decision_priority: "high",
      manual_review_allowed: true,
      automatic_publication_allowed: false,
      automatic_publication_blocked: true,
      reason_code: "ready_and_blocked_sources_detected",
    };
  }

  if (
    qualityStatus === "ready_for_review" ||
    readyForManualReviewSourceCount > 0 ||
    reviewReadyCandidateCount > 0
  ) {
    return {
      decision_key: "ready_for_manual_review",
      decision_priority: "normal",
      manual_review_allowed: true,
      automatic_publication_allowed: false,
      automatic_publication_blocked: true,
      reason_code: "sources_ready_for_manual_review",
    };
  }

  return {
    decision_key: "requires_manual_triage",
    decision_priority: "high",
    manual_review_allowed: true,
    automatic_publication_allowed: false,
    automatic_publication_blocked: true,
    reason_code: "quality_status_requires_manual_triage",
  };
}

export const EVENT_MULTI_SOURCE_QUALITY_DECISION_MATRIX: EventMultiSourceQualityDecisionMatrixCase[] =
  [
    {
      case_key: "all_sources_ready_for_review",
      description:
        "Multiple sources are ready for manual review and no source is blocked.",
      input: {
        quality_status: "ready_for_review",
        source_count: 2,
        ready_for_manual_review_source_count: 2,
        blocked_source_count: 0,
        total_review_ready_candidate_count: 2,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_decision_key: "ready_for_manual_review",
      expected_decision_priority: "normal",
      expected_manual_review_allowed: true,
    },
    {
      case_key: "ready_and_blocked_sources",
      description:
        "One source is ready for manual review and one source is blocked by validation.",
      input: {
        quality_status: "mixed_review",
        source_count: 2,
        ready_for_manual_review_source_count: 1,
        blocked_source_count: 1,
        total_review_ready_candidate_count: 1,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_decision_key: "mixed_manual_review",
      expected_decision_priority: "high",
      expected_manual_review_allowed: true,
    },
    {
      case_key: "all_sources_blocked",
      description:
        "All available sources are blocked and must not enter normal review.",
      input: {
        quality_status: "blocked",
        source_count: 2,
        ready_for_manual_review_source_count: 0,
        blocked_source_count: 2,
        total_review_ready_candidate_count: 0,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_decision_key: "blocked_from_review",
      expected_decision_priority: "blocked",
      expected_manual_review_allowed: false,
    },
    {
      case_key: "no_sources_available",
      description:
        "No source is available, so the event candidate must remain blocked.",
      input: {
        quality_status: "empty",
        source_count: 0,
        ready_for_manual_review_source_count: 0,
        blocked_source_count: 0,
        total_review_ready_candidate_count: 0,
        total_automatic_publication_candidate_count: 0,
        automatic_publication_allowed: false,
        automatic_publication_blocked: true,
      },
      expected_decision_key: "blocked_from_review",
      expected_decision_priority: "blocked",
      expected_manual_review_allowed: false,
    },
  ];

export function validateEventMultiSourceQualityDecisionMatrix(): boolean {
  return EVENT_MULTI_SOURCE_QUALITY_DECISION_MATRIX.every((matrixCase) => {
    const decision = resolveEventMultiSourceQualityDecision(matrixCase.input);

    return (
      decision.decision_key === matrixCase.expected_decision_key &&
      decision.decision_priority === matrixCase.expected_decision_priority &&
      decision.manual_review_allowed ===
        matrixCase.expected_manual_review_allowed &&
      decision.automatic_publication_allowed === false &&
      decision.automatic_publication_blocked === true
    );
  });
}

export const EVENT_MULTI_SOURCE_QUALITY_DECISION_MATRIX_IS_VALID =
  validateEventMultiSourceQualityDecisionMatrix();