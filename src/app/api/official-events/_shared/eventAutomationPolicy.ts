// src/app/api/official-events/_shared/eventAutomationPolicy.ts

export type EventAutomationSourceAuthorizationStatus =
  | "api_authorized"
  | "official_verified"
  | "partner_verified"
  | "public_unverified"
  | "blocked"
  | "unknown";

export type EventAutomationSourceRole =
  | "authorized_ticketing_api"
  | "official_event_source"
  | "venue"
  | "producer"
  | "artist"
  | "editorial_source"
  | "social_signal"
  | "unknown";

export type EventAutomationDecisionState =
  | "safe_auto_publish_candidate"
  | "needs_more_source_signals"
  | "blocked_by_conflict"
  | "blocked_by_validation"
  | "discarded_by_policy"
  | "duplicate_candidate"
  | "discovery_only";

export type EventAutomationLane =
  | "safe_candidate_hold"
  | "signal_accumulation"
  | "conflict_block"
  | "validation_block"
  | "policy_discard"
  | "duplicate_resolution"
  | "discovery_index";

export type EventAutomationSafetyFlag =
  | "real_auto_publish_disabled"
  | "source_authorized"
  | "official_signal_present"
  | "ticketing_api_signal_present"
  | "required_identity_complete"
  | "required_identity_incomplete"
  | "critical_conflict_detected"
  | "validation_error_detected"
  | "duplicate_candidate_detected"
  | "event_expired"
  | "discovery_only_source"
  | "needs_more_signals";

export type EventAutomationPolicyInput = {
  source_authorization_status?: EventAutomationSourceAuthorizationStatus | null;
  source_role?: EventAutomationSourceRole | null;
  source_count?: number | string | null;
  strong_source_signal_count?: number | string | null;
  authorized_ticketing_source_count?: number | string | null;
  official_source_count?: number | string | null;
  verified_venue_source_count?: number | string | null;
  critical_conflict_count?: number | string | null;
  validation_error_count?: number | string | null;
  duplicate_candidate_count?: number | string | null;
  has_required_event_identity?: boolean | null;
  has_valid_event_name?: boolean | null;
  has_valid_event_date?: boolean | null;
  has_valid_location?: boolean | null;
  has_valid_official_url?: boolean | null;
  has_ticket_url?: boolean | null;
  is_event_expired?: boolean | null;
  is_low_quality_discovery_source?: boolean | null;
  real_auto_publish_enabled?: boolean | null;
};

export type EventAutomationPolicyDecision = {
  decision_state: EventAutomationDecisionState;
  automation_lane: EventAutomationLane;
  publish_candidate_allowed: boolean;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
  blocked: boolean;
  should_retry_when_more_signals_arrive: boolean;
  reason_code: string;
  confidence_score: number;
  source_signal_score: number;
  safety_flags: EventAutomationSafetyFlag[];
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

function toBoolean(value: boolean | null | undefined): boolean {
  return value === true;
}

function hasAuthorizedSource(input: EventAutomationPolicyInput): boolean {
  const authorizationStatus = input.source_authorization_status ?? "unknown";

  return (
    authorizationStatus === "api_authorized" ||
    authorizationStatus === "official_verified" ||
    authorizationStatus === "partner_verified" ||
    toNonNegativeInteger(input.authorized_ticketing_source_count) > 0 ||
    toNonNegativeInteger(input.official_source_count) > 0 ||
    toNonNegativeInteger(input.verified_venue_source_count) > 0
  );
}

function hasTicketingApiSignal(input: EventAutomationPolicyInput): boolean {
  return (
    input.source_role === "authorized_ticketing_api" ||
    toNonNegativeInteger(input.authorized_ticketing_source_count) > 0
  );
}

function hasOfficialSignal(input: EventAutomationPolicyInput): boolean {
  return (
    input.source_role === "official_event_source" ||
    input.source_role === "venue" ||
    input.source_role === "producer" ||
    input.source_authorization_status === "official_verified" ||
    toNonNegativeInteger(input.official_source_count) > 0 ||
    toNonNegativeInteger(input.verified_venue_source_count) > 0
  );
}

function hasCompleteRequiredIdentity(input: EventAutomationPolicyInput): boolean {
  if (input.has_required_event_identity === true) {
    return true;
  }

  return (
    toBoolean(input.has_valid_event_name) &&
    toBoolean(input.has_valid_event_date) &&
    toBoolean(input.has_valid_location) &&
    toBoolean(input.has_valid_official_url)
  );
}

function calculateSourceSignalScore(input: EventAutomationPolicyInput): number {
  const sourceCount = toNonNegativeInteger(input.source_count);
  const strongSourceSignalCount = toNonNegativeInteger(
    input.strong_source_signal_count
  );
  const authorizedTicketingSourceCount = toNonNegativeInteger(
    input.authorized_ticketing_source_count
  );
  const officialSourceCount = toNonNegativeInteger(input.official_source_count);
  const verifiedVenueSourceCount = toNonNegativeInteger(
    input.verified_venue_source_count
  );

  let score = 0;

  score += Math.min(sourceCount, 4) * 10;
  score += Math.min(strongSourceSignalCount, 3) * 15;
  score += Math.min(authorizedTicketingSourceCount, 2) * 20;
  score += Math.min(officialSourceCount, 2) * 20;
  score += Math.min(verifiedVenueSourceCount, 2) * 15;

  if (input.source_authorization_status === "api_authorized") {
    score += 25;
  }

  if (input.source_authorization_status === "official_verified") {
    score += 25;
  }

  if (input.source_authorization_status === "partner_verified") {
    score += 15;
  }

  return Math.min(100, score);
}

function calculateConfidenceScore(input: EventAutomationPolicyInput): number {
  let score = calculateSourceSignalScore(input);

  if (hasCompleteRequiredIdentity(input)) {
    score += 20;
  }

  if (toBoolean(input.has_ticket_url)) {
    score += 5;
  }

  if (toNonNegativeInteger(input.critical_conflict_count) > 0) {
    score -= 40;
  }

  if (toNonNegativeInteger(input.validation_error_count) > 0) {
    score -= 35;
  }

  if (toNonNegativeInteger(input.duplicate_candidate_count) > 0) {
    score -= 20;
  }

  if (toBoolean(input.is_event_expired)) {
    score -= 60;
  }

  if (toBoolean(input.is_low_quality_discovery_source)) {
    score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}

function buildSafetyFlags(
  input: EventAutomationPolicyInput,
  sourceSignalScore: number
): EventAutomationSafetyFlag[] {
  const flags: EventAutomationSafetyFlag[] = ["real_auto_publish_disabled"];

  if (hasAuthorizedSource(input)) {
    flags.push("source_authorized");
  }

  if (hasOfficialSignal(input)) {
    flags.push("official_signal_present");
  }

  if (hasTicketingApiSignal(input)) {
    flags.push("ticketing_api_signal_present");
  }

  if (hasCompleteRequiredIdentity(input)) {
    flags.push("required_identity_complete");
  } else {
    flags.push("required_identity_incomplete");
  }

  if (toNonNegativeInteger(input.critical_conflict_count) > 0) {
    flags.push("critical_conflict_detected");
  }

  if (toNonNegativeInteger(input.validation_error_count) > 0) {
    flags.push("validation_error_detected");
  }

  if (toNonNegativeInteger(input.duplicate_candidate_count) > 0) {
    flags.push("duplicate_candidate_detected");
  }

  if (toBoolean(input.is_event_expired)) {
    flags.push("event_expired");
  }

  if (toBoolean(input.is_low_quality_discovery_source)) {
    flags.push("discovery_only_source");
  }

  if (sourceSignalScore < 80) {
    flags.push("needs_more_signals");
  }

  return flags;
}

function buildDecision(
  decisionState: EventAutomationDecisionState,
  automationLane: EventAutomationLane,
  reasonCode: string,
  input: EventAutomationPolicyInput,
  publishCandidateAllowed: boolean,
  blocked: boolean,
  shouldRetryWhenMoreSignalsArrive: boolean
): EventAutomationPolicyDecision {
  const sourceSignalScore = calculateSourceSignalScore(input);
  const confidenceScore = calculateConfidenceScore(input);

  return {
    decision_state: decisionState,
    automation_lane: automationLane,
    publish_candidate_allowed: publishCandidateAllowed,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
    blocked,
    should_retry_when_more_signals_arrive: shouldRetryWhenMoreSignalsArrive,
    reason_code: reasonCode,
    confidence_score: confidenceScore,
    source_signal_score: sourceSignalScore,
    safety_flags: buildSafetyFlags(input, sourceSignalScore),
  };
}

export function resolveEventAutomationPolicyDecision(
  input: EventAutomationPolicyInput
): EventAutomationPolicyDecision {
  const sourceCount = toNonNegativeInteger(input.source_count);
  const criticalConflictCount = toNonNegativeInteger(
    input.critical_conflict_count
  );
  const validationErrorCount = toNonNegativeInteger(input.validation_error_count);
  const duplicateCandidateCount = toNonNegativeInteger(
    input.duplicate_candidate_count
  );
  const sourceSignalScore = calculateSourceSignalScore(input);
  const confidenceScore = calculateConfidenceScore(input);
  const completeRequiredIdentity = hasCompleteRequiredIdentity(input);
  const authorizedSource = hasAuthorizedSource(input);

  if (toBoolean(input.is_event_expired)) {
    return buildDecision(
      "discarded_by_policy",
      "policy_discard",
      "event_expired",
      input,
      false,
      true,
      false
    );
  }

  if (criticalConflictCount > 0) {
    return buildDecision(
      "blocked_by_conflict",
      "conflict_block",
      "critical_source_conflict_detected",
      input,
      false,
      true,
      true
    );
  }

  if (
    validationErrorCount > 0 ||
    input.source_authorization_status === "blocked"
  ) {
    return buildDecision(
      "blocked_by_validation",
      "validation_block",
      "validation_or_source_authorization_block",
      input,
      false,
      true,
      true
    );
  }

  if (duplicateCandidateCount > 0) {
    return buildDecision(
      "duplicate_candidate",
      "duplicate_resolution",
      "possible_duplicate_candidate_detected",
      input,
      false,
      false,
      true
    );
  }

  if (
    sourceCount <= 0 ||
    toBoolean(input.is_low_quality_discovery_source) ||
    input.source_role === "editorial_source" ||
    input.source_role === "social_signal"
  ) {
    return buildDecision(
      "discovery_only",
      "discovery_index",
      "source_can_discover_but_not_publish",
      input,
      false,
      false,
      true
    );
  }

  if (
    authorizedSource &&
    completeRequiredIdentity &&
    sourceSignalScore >= 80 &&
    confidenceScore >= 85
  ) {
    return buildDecision(
      "safe_auto_publish_candidate",
      "safe_candidate_hold",
      "safe_candidate_but_real_auto_publish_disabled",
      input,
      true,
      false,
      false
    );
  }

  return buildDecision(
    "needs_more_source_signals",
    "signal_accumulation",
    "insufficient_automation_confidence",
    input,
    false,
    false,
    true
  );
}

export const EVENT_AUTOMATION_POLICY_FOUNDATION_DEFAULTS = {
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
  human_event_analysis_required: false,
} as const;