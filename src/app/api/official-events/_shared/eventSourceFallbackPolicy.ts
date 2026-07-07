// src/app/api/official-events/_shared/eventSourceFallbackPolicy.ts

import type {
  EventAutomationPolicyDecision,
  EventAutomationPolicyInput,
  EventAutomationSourceAuthorizationStatus,
  EventAutomationSourceRole,
} from "./eventAutomationPolicy";

import { resolveEventAutomationPolicyDecision } from "./eventAutomationPolicy";

import type {
  EventTicketingApiSourceAdapterInput,
  EventTicketingApiSourceAdapterResult,
} from "./eventTicketingApiSourceAdapter";

import { adaptTicketingApiSourceToAutomationPolicy } from "./eventTicketingApiSourceAdapter";

export type EventPrimaryTicketingApiStatus =
  | "authorized_available"
  | "not_configured"
  | "pending_authorization"
  | "unavailable"
  | "incomplete_response"
  | "blocked"
  | "conflicting";

export type EventSourceFallbackAdjacentSourceKind =
  | "official_event_site"
  | "official_venue_site"
  | "official_promoter_site"
  | "artist_official_calendar"
  | "public_ticketing_page"
  | "official_social_post"
  | "editorial_discovery"
  | "community_signal"
  | "unknown_public_source";

export type EventSourceFallbackReason =
  | "none_primary_ticketing_api_used"
  | "primary_ticketing_api_not_configured"
  | "primary_ticketing_api_pending_authorization"
  | "primary_ticketing_api_unavailable"
  | "primary_ticketing_api_incomplete_response"
  | "primary_ticketing_api_insufficient_confidence"
  | "primary_ticketing_api_blocked"
  | "primary_ticketing_api_conflicting"
  | "adjacent_fallback_not_available";

export type EventSourceFallbackDecisionState =
  | "primary_ticketing_api_candidate"
  | "fallback_adjacent_candidate"
  | "fallback_adjacent_signal_accumulation"
  | "fallback_adjacent_discovery_only"
  | "blocked_by_primary_ticketing_api"
  | "blocked_by_adjacent_conflict"
  | "blocked_by_adjacent_validation"
  | "discarded_by_policy"
  | "no_usable_signal";

export type EventSourceFallbackLane =
  | "primary_ticketing_api_lane"
  | "adjacent_fallback_candidate_lane"
  | "adjacent_fallback_accumulation_lane"
  | "adjacent_fallback_discovery_lane"
  | "primary_ticketing_api_block_lane"
  | "adjacent_fallback_conflict_block_lane"
  | "adjacent_fallback_validation_block_lane"
  | "policy_discard_lane"
  | "no_signal_lane";

export type EventSourceFallbackSafetyFlag =
  | "primary_ticketing_api_has_priority"
  | "adjacent_sources_are_fallback"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required"
  | "external_request_not_performed"
  | "primary_ticketing_api_used"
  | "primary_ticketing_api_missing_or_unavailable"
  | "primary_ticketing_api_insufficient"
  | "primary_ticketing_api_blocked"
  | "adjacent_official_signal_present"
  | "adjacent_public_ticketing_page_present"
  | "adjacent_social_signal_present"
  | "adjacent_artist_calendar_present"
  | "adjacent_discovery_only"
  | "adjacent_identity_complete"
  | "adjacent_identity_incomplete"
  | "adjacent_conflict_detected"
  | "adjacent_validation_error_detected"
  | "expired_event_detected"
  | "needs_more_adjacent_signals";

export type EventSourceFallbackTicketingApiInput = {
  status: EventPrimaryTicketingApiStatus;
  adapter_input?: EventTicketingApiSourceAdapterInput | null;
};

export type EventSourceFallbackAdjacentSignalInput = {
  source_kind: EventSourceFallbackAdjacentSourceKind;
  source_count?: number | string | null;
  official_source_count?: number | string | null;
  public_ticketing_page_count?: number | string | null;
  official_social_post_count?: number | string | null;
  artist_calendar_source_count?: number | string | null;
  editorial_discovery_count?: number | string | null;
  community_signal_count?: number | string | null;
  matching_identity_signal_count?: number | string | null;
  conflicting_signal_count?: number | string | null;
  validation_error_count?: number | string | null;
  duplicate_candidate_count?: number | string | null;
  has_valid_event_name?: boolean | null;
  has_valid_event_date?: boolean | null;
  has_valid_location?: boolean | null;
  has_valid_city_or_region?: boolean | null;
  has_valid_official_url?: boolean | null;
  has_ticket_url?: boolean | null;
  is_event_expired?: boolean | null;
  is_blocked_source?: boolean | null;
};

export type EventSourceFallbackPolicyInput = {
  primary_ticketing_api: EventSourceFallbackTicketingApiInput;
  adjacent_signal?: EventSourceFallbackAdjacentSignalInput | null;
};

export type EventSourceFallbackPolicyDecision = {
  decision_state: EventSourceFallbackDecisionState;
  fallback_lane: EventSourceFallbackLane;
  fallback_reason: EventSourceFallbackReason;
  used_primary_ticketing_api: boolean;
  used_adjacent_fallback: boolean;
  can_feed_automation_policy: boolean;
  publish_candidate_allowed: boolean;
  blocked: boolean;
  should_wait_for_more_signals: boolean;
  adjacent_authority_score: number;
  adjacent_convergence_score: number;
  policy_input: EventAutomationPolicyInput;
  policy_decision: EventAutomationPolicyDecision;
  ticketing_adapter_result?: EventTicketingApiSourceAdapterResult;
  safety_flags: EventSourceFallbackSafetyFlag[];
  external_request_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
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

function isOfficialAdjacentKind(
  sourceKind: EventSourceFallbackAdjacentSourceKind
): boolean {
  return (
    sourceKind === "official_event_site" ||
    sourceKind === "official_venue_site" ||
    sourceKind === "official_promoter_site" ||
    sourceKind === "artist_official_calendar"
  );
}

function isAdjacentDiscoveryOnlyKind(
  sourceKind: EventSourceFallbackAdjacentSourceKind
): boolean {
  return (
    sourceKind === "editorial_discovery" ||
    sourceKind === "community_signal" ||
    sourceKind === "unknown_public_source"
  );
}

function hasRequiredAdjacentIdentity(
  adjacentSignal: EventSourceFallbackAdjacentSignalInput
): boolean {
  return (
    toBoolean(adjacentSignal.has_valid_event_name) &&
    toBoolean(adjacentSignal.has_valid_event_date) &&
    toBoolean(adjacentSignal.has_valid_location) &&
    toBoolean(adjacentSignal.has_valid_city_or_region) &&
    (toBoolean(adjacentSignal.has_valid_official_url) ||
      toBoolean(adjacentSignal.has_ticket_url))
  );
}

function calculateAdjacentAuthorityScore(
  adjacentSignal: EventSourceFallbackAdjacentSignalInput | null | undefined
): number {
  if (!adjacentSignal) {
    return 0;
  }

  const sourceCount = toNonNegativeInteger(adjacentSignal.source_count);
  const officialSourceCount = toNonNegativeInteger(
    adjacentSignal.official_source_count
  );
  const publicTicketingPageCount = toNonNegativeInteger(
    adjacentSignal.public_ticketing_page_count
  );
  const officialSocialPostCount = toNonNegativeInteger(
    adjacentSignal.official_social_post_count
  );
  const artistCalendarSourceCount = toNonNegativeInteger(
    adjacentSignal.artist_calendar_source_count
  );
  const matchingIdentitySignalCount = toNonNegativeInteger(
    adjacentSignal.matching_identity_signal_count
  );

  let score = 0;

  score += Math.min(sourceCount, 4) * 5;
  score += Math.min(officialSourceCount, 3) * 25;
  score += Math.min(publicTicketingPageCount, 2) * 15;
  score += Math.min(officialSocialPostCount, 2) * 15;
  score += Math.min(artistCalendarSourceCount, 2) * 15;
  score += Math.min(matchingIdentitySignalCount, 4) * 10;

  if (adjacentSignal.source_kind === "official_event_site") {
    score += 30;
  }

  if (adjacentSignal.source_kind === "official_venue_site") {
    score += 25;
  }

  if (adjacentSignal.source_kind === "official_promoter_site") {
    score += 25;
  }

  if (adjacentSignal.source_kind === "artist_official_calendar") {
    score += 20;
  }

  if (adjacentSignal.source_kind === "public_ticketing_page") {
    score += 15;
  }

  if (adjacentSignal.source_kind === "official_social_post") {
    score += 10;
  }

  if (adjacentSignal.source_kind === "editorial_discovery") {
    score -= 20;
  }

  if (adjacentSignal.source_kind === "community_signal") {
    score -= 25;
  }

  if (adjacentSignal.source_kind === "unknown_public_source") {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateAdjacentConvergenceScore(
  adjacentSignal: EventSourceFallbackAdjacentSignalInput | null | undefined
): number {
  if (!adjacentSignal) {
    return 0;
  }

  const sourceCount = toNonNegativeInteger(adjacentSignal.source_count);
  const matchingIdentitySignalCount = toNonNegativeInteger(
    adjacentSignal.matching_identity_signal_count
  );
  const officialSourceCount = toNonNegativeInteger(
    adjacentSignal.official_source_count
  );
  const publicTicketingPageCount = toNonNegativeInteger(
    adjacentSignal.public_ticketing_page_count
  );
  const officialSocialPostCount = toNonNegativeInteger(
    adjacentSignal.official_social_post_count
  );
  const conflictingSignalCount = toNonNegativeInteger(
    adjacentSignal.conflicting_signal_count
  );

  let score = 0;

  score += Math.min(sourceCount, 5) * 10;
  score += Math.min(matchingIdentitySignalCount, 5) * 12;
  score += Math.min(officialSourceCount, 3) * 15;
  score += Math.min(publicTicketingPageCount, 2) * 10;
  score += Math.min(officialSocialPostCount, 2) * 8;

  if (conflictingSignalCount > 0) {
    score -= 45;
  }

  return Math.max(0, Math.min(100, score));
}

function resolveAdjacentPolicyAuthorizationStatus(
  adjacentSignal: EventSourceFallbackAdjacentSignalInput
): EventAutomationSourceAuthorizationStatus {
  if (
    toBoolean(adjacentSignal.is_blocked_source) ||
    toNonNegativeInteger(adjacentSignal.validation_error_count) > 0
  ) {
    return "blocked";
  }

  const officialSourceCount = toNonNegativeInteger(
    adjacentSignal.official_source_count
  );
  const publicTicketingPageCount = toNonNegativeInteger(
    adjacentSignal.public_ticketing_page_count
  );
  const officialSocialPostCount = toNonNegativeInteger(
    adjacentSignal.official_social_post_count
  );

  if (
    adjacentSignal.source_kind === "official_event_site" ||
    adjacentSignal.source_kind === "official_venue_site" ||
    adjacentSignal.source_kind === "official_promoter_site" ||
    officialSourceCount >= 2
  ) {
    return "official_verified";
  }

  if (
    adjacentSignal.source_kind === "artist_official_calendar" ||
    officialSourceCount >= 1 ||
    (publicTicketingPageCount >= 1 && officialSocialPostCount >= 1)
  ) {
    return "partner_verified";
  }

  if (
    adjacentSignal.source_kind === "public_ticketing_page" ||
    adjacentSignal.source_kind === "official_social_post" ||
    publicTicketingPageCount > 0 ||
    officialSocialPostCount > 0
  ) {
    return "public_unverified";
  }

  return "unknown";
}

function resolveAdjacentPolicySourceRole(
  adjacentSignal: EventSourceFallbackAdjacentSignalInput
): EventAutomationSourceRole {
  if (adjacentSignal.source_kind === "official_venue_site") {
    return "venue";
  }

  if (adjacentSignal.source_kind === "official_promoter_site") {
    return "producer";
  }

  if (adjacentSignal.source_kind === "artist_official_calendar") {
    return "artist";
  }

  if (adjacentSignal.source_kind === "official_event_site") {
    return "official_event_source";
  }

  if (adjacentSignal.source_kind === "editorial_discovery") {
    return "editorial_source";
  }

  if (adjacentSignal.source_kind === "community_signal") {
    return "social_signal";
  }

  return "unknown";
}

function buildEmptyPolicyInput(): EventAutomationPolicyInput {
  return {
    source_authorization_status: "unknown",
    source_role: "unknown",
    source_count: 0,
    strong_source_signal_count: 0,
    authorized_ticketing_source_count: 0,
    official_source_count: 0,
    verified_venue_source_count: 0,
    critical_conflict_count: 0,
    validation_error_count: 0,
    duplicate_candidate_count: 0,
    has_required_event_identity: false,
    has_valid_event_name: false,
    has_valid_event_date: false,
    has_valid_location: false,
    has_valid_official_url: false,
    has_ticket_url: false,
    is_event_expired: false,
    is_low_quality_discovery_source: true,
    real_auto_publish_enabled: false,
  };
}

function buildAdjacentPolicyInput(
  adjacentSignal: EventSourceFallbackAdjacentSignalInput
): EventAutomationPolicyInput {
  const officialSourceCount = toNonNegativeInteger(
    adjacentSignal.official_source_count
  );
  const publicTicketingPageCount = toNonNegativeInteger(
    adjacentSignal.public_ticketing_page_count
  );
  const officialSocialPostCount = toNonNegativeInteger(
    adjacentSignal.official_social_post_count
  );
  const artistCalendarSourceCount = toNonNegativeInteger(
    adjacentSignal.artist_calendar_source_count
  );
  const matchingIdentitySignalCount = toNonNegativeInteger(
    adjacentSignal.matching_identity_signal_count
  );

  return {
    source_authorization_status:
      resolveAdjacentPolicyAuthorizationStatus(adjacentSignal),
    source_role: resolveAdjacentPolicySourceRole(adjacentSignal),
    source_count: Math.max(
      1,
      toNonNegativeInteger(adjacentSignal.source_count)
    ),
    strong_source_signal_count:
      officialSourceCount +
      publicTicketingPageCount +
      officialSocialPostCount +
      artistCalendarSourceCount +
      matchingIdentitySignalCount,
    authorized_ticketing_source_count: 0,
    official_source_count:
      officialSourceCount +
      (isOfficialAdjacentKind(adjacentSignal.source_kind) ? 1 : 0),
    verified_venue_source_count:
      adjacentSignal.source_kind === "official_venue_site" ? 1 : 0,
    critical_conflict_count: adjacentSignal.conflicting_signal_count ?? 0,
    validation_error_count: adjacentSignal.validation_error_count ?? 0,
    duplicate_candidate_count: adjacentSignal.duplicate_candidate_count ?? 0,
    has_required_event_identity: hasRequiredAdjacentIdentity(adjacentSignal),
    has_valid_event_name: adjacentSignal.has_valid_event_name ?? false,
    has_valid_event_date: adjacentSignal.has_valid_event_date ?? false,
    has_valid_location:
      toBoolean(adjacentSignal.has_valid_location) &&
      toBoolean(adjacentSignal.has_valid_city_or_region),
    has_valid_official_url:
      toBoolean(adjacentSignal.has_valid_official_url) ||
      (toBoolean(adjacentSignal.has_ticket_url) &&
        publicTicketingPageCount > 0),
    has_ticket_url: adjacentSignal.has_ticket_url ?? false,
    is_event_expired: adjacentSignal.is_event_expired ?? false,
    is_low_quality_discovery_source: isAdjacentDiscoveryOnlyKind(
      adjacentSignal.source_kind
    ),
    real_auto_publish_enabled: false,
  };
}

function resolveFallbackReasonFromPrimaryStatus(
  primaryStatus: EventPrimaryTicketingApiStatus
): EventSourceFallbackReason {
  if (primaryStatus === "not_configured") {
    return "primary_ticketing_api_not_configured";
  }

  if (primaryStatus === "pending_authorization") {
    return "primary_ticketing_api_pending_authorization";
  }

  if (primaryStatus === "unavailable") {
    return "primary_ticketing_api_unavailable";
  }

  if (primaryStatus === "incomplete_response") {
    return "primary_ticketing_api_incomplete_response";
  }

  if (primaryStatus === "blocked") {
    return "primary_ticketing_api_blocked";
  }

  if (primaryStatus === "conflicting") {
    return "primary_ticketing_api_conflicting";
  }

  return "primary_ticketing_api_insufficient_confidence";
}

function buildSafetyFlags(
  primaryStatus: EventPrimaryTicketingApiStatus,
  adjacentSignal: EventSourceFallbackAdjacentSignalInput | null | undefined,
  usedPrimaryTicketingApi: boolean,
  usedAdjacentFallback: boolean,
  adjacentAuthorityScore: number,
  adjacentConvergenceScore: number
): EventSourceFallbackSafetyFlag[] {
  const flags: EventSourceFallbackSafetyFlag[] = [
    "primary_ticketing_api_has_priority",
    "adjacent_sources_are_fallback",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
    "external_request_not_performed",
  ];

  if (usedPrimaryTicketingApi) {
    flags.push("primary_ticketing_api_used");
  }

  if (
    primaryStatus === "not_configured" ||
    primaryStatus === "pending_authorization" ||
    primaryStatus === "unavailable" ||
    primaryStatus === "incomplete_response"
  ) {
    flags.push("primary_ticketing_api_missing_or_unavailable");
  }

  if (primaryStatus === "authorized_available" && !usedPrimaryTicketingApi) {
    flags.push("primary_ticketing_api_insufficient");
  }

  if (primaryStatus === "blocked" || primaryStatus === "conflicting") {
    flags.push("primary_ticketing_api_blocked");
  }

  if (!adjacentSignal) {
    return flags;
  }

  if (
    isOfficialAdjacentKind(adjacentSignal.source_kind) ||
    toNonNegativeInteger(adjacentSignal.official_source_count) > 0
  ) {
    flags.push("adjacent_official_signal_present");
  }

  if (
    adjacentSignal.source_kind === "public_ticketing_page" ||
    toNonNegativeInteger(adjacentSignal.public_ticketing_page_count) > 0
  ) {
    flags.push("adjacent_public_ticketing_page_present");
  }

  if (
    adjacentSignal.source_kind === "official_social_post" ||
    toNonNegativeInteger(adjacentSignal.official_social_post_count) > 0
  ) {
    flags.push("adjacent_social_signal_present");
  }

  if (
    adjacentSignal.source_kind === "artist_official_calendar" ||
    toNonNegativeInteger(adjacentSignal.artist_calendar_source_count) > 0
  ) {
    flags.push("adjacent_artist_calendar_present");
  }

  if (isAdjacentDiscoveryOnlyKind(adjacentSignal.source_kind)) {
    flags.push("adjacent_discovery_only");
  }

  if (hasRequiredAdjacentIdentity(adjacentSignal)) {
    flags.push("adjacent_identity_complete");
  } else {
    flags.push("adjacent_identity_incomplete");
  }

  if (toNonNegativeInteger(adjacentSignal.conflicting_signal_count) > 0) {
    flags.push("adjacent_conflict_detected");
  }

  if (toNonNegativeInteger(adjacentSignal.validation_error_count) > 0) {
    flags.push("adjacent_validation_error_detected");
  }

  if (toBoolean(adjacentSignal.is_event_expired)) {
    flags.push("expired_event_detected");
  }

  if (
    usedAdjacentFallback &&
    (adjacentAuthorityScore < 80 || adjacentConvergenceScore < 75)
  ) {
    flags.push("needs_more_adjacent_signals");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventSourceFallbackDecisionState;
  fallbackLane: EventSourceFallbackLane;
  fallbackReason: EventSourceFallbackReason;
  primaryStatus: EventPrimaryTicketingApiStatus;
  adjacentSignal?: EventSourceFallbackAdjacentSignalInput | null;
  usedPrimaryTicketingApi: boolean;
  usedAdjacentFallback: boolean;
  canFeedAutomationPolicy: boolean;
  publishCandidateAllowed: boolean;
  blocked: boolean;
  shouldWaitForMoreSignals: boolean;
  policyInput: EventAutomationPolicyInput;
  policyDecision: EventAutomationPolicyDecision;
  ticketingAdapterResult?: EventTicketingApiSourceAdapterResult;
}): EventSourceFallbackPolicyDecision {
  const adjacentAuthorityScore = calculateAdjacentAuthorityScore(
    args.adjacentSignal
  );
  const adjacentConvergenceScore = calculateAdjacentConvergenceScore(
    args.adjacentSignal
  );

  const baseDecision = {
    decision_state: args.decisionState,
    fallback_lane: args.fallbackLane,
    fallback_reason: args.fallbackReason,
    used_primary_ticketing_api: args.usedPrimaryTicketingApi,
    used_adjacent_fallback: args.usedAdjacentFallback,
    can_feed_automation_policy: args.canFeedAutomationPolicy,
    publish_candidate_allowed: args.publishCandidateAllowed,
    blocked: args.blocked,
    should_wait_for_more_signals: args.shouldWaitForMoreSignals,
    adjacent_authority_score: adjacentAuthorityScore,
    adjacent_convergence_score: adjacentConvergenceScore,
    policy_input: args.policyInput,
    policy_decision: args.policyDecision,
    safety_flags: buildSafetyFlags(
      args.primaryStatus,
      args.adjacentSignal,
      args.usedPrimaryTicketingApi,
      args.usedAdjacentFallback,
      adjacentAuthorityScore,
      adjacentConvergenceScore
    ),
    external_request_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  } satisfies Omit<
    EventSourceFallbackPolicyDecision,
    "ticketing_adapter_result"
  >;

  if (args.ticketingAdapterResult) {
    return {
      ...baseDecision,
      ticketing_adapter_result: args.ticketingAdapterResult,
    };
  }

  return baseDecision;
}

function resolveAdjacentFallbackDecision(
  primaryStatus: EventPrimaryTicketingApiStatus,
  fallbackReason: EventSourceFallbackReason,
  adjacentSignal: EventSourceFallbackAdjacentSignalInput | null | undefined
): EventSourceFallbackPolicyDecision {
  if (!adjacentSignal) {
    const policyInput = buildEmptyPolicyInput();
    const policyDecision = resolveEventAutomationPolicyDecision(policyInput);

    return buildDecision({
      decisionState: "no_usable_signal",
      fallbackLane: "no_signal_lane",
      fallbackReason: "adjacent_fallback_not_available",
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: false,
      canFeedAutomationPolicy: false,
      publishCandidateAllowed: false,
      blocked: false,
      shouldWaitForMoreSignals: true,
      policyInput,
      policyDecision,
    });
  }

  const policyInput = buildAdjacentPolicyInput(adjacentSignal);
  const policyDecision = resolveEventAutomationPolicyDecision(policyInput);
  const adjacentAuthorityScore = calculateAdjacentAuthorityScore(adjacentSignal);
  const adjacentConvergenceScore =
    calculateAdjacentConvergenceScore(adjacentSignal);
  const completeRequiredIdentity = hasRequiredAdjacentIdentity(adjacentSignal);
  const conflictingSignalCount = toNonNegativeInteger(
    adjacentSignal.conflicting_signal_count
  );
  const validationErrorCount = toNonNegativeInteger(
    adjacentSignal.validation_error_count
  );

  if (toBoolean(adjacentSignal.is_event_expired)) {
    return buildDecision({
      decisionState: "discarded_by_policy",
      fallbackLane: "policy_discard_lane",
      fallbackReason,
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: true,
      canFeedAutomationPolicy: true,
      publishCandidateAllowed: false,
      blocked: true,
      shouldWaitForMoreSignals: false,
      policyInput,
      policyDecision,
    });
  }

  if (validationErrorCount > 0 || toBoolean(adjacentSignal.is_blocked_source)) {
    return buildDecision({
      decisionState: "blocked_by_adjacent_validation",
      fallbackLane: "adjacent_fallback_validation_block_lane",
      fallbackReason,
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: true,
      canFeedAutomationPolicy: true,
      publishCandidateAllowed: false,
      blocked: true,
      shouldWaitForMoreSignals: true,
      policyInput,
      policyDecision,
    });
  }

  if (conflictingSignalCount > 0) {
    return buildDecision({
      decisionState: "blocked_by_adjacent_conflict",
      fallbackLane: "adjacent_fallback_conflict_block_lane",
      fallbackReason,
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: true,
      canFeedAutomationPolicy: true,
      publishCandidateAllowed: false,
      blocked: true,
      shouldWaitForMoreSignals: true,
      policyInput,
      policyDecision,
    });
  }

  if (isAdjacentDiscoveryOnlyKind(adjacentSignal.source_kind)) {
    return buildDecision({
      decisionState: "fallback_adjacent_discovery_only",
      fallbackLane: "adjacent_fallback_discovery_lane",
      fallbackReason,
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: true,
      canFeedAutomationPolicy: false,
      publishCandidateAllowed: false,
      blocked: false,
      shouldWaitForMoreSignals: true,
      policyInput,
      policyDecision,
    });
  }

  if (!completeRequiredIdentity) {
    return buildDecision({
      decisionState: "blocked_by_adjacent_validation",
      fallbackLane: "adjacent_fallback_validation_block_lane",
      fallbackReason,
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: true,
      canFeedAutomationPolicy: true,
      publishCandidateAllowed: false,
      blocked: true,
      shouldWaitForMoreSignals: true,
      policyInput,
      policyDecision,
    });
  }

  if (adjacentAuthorityScore >= 80 && adjacentConvergenceScore >= 75) {
    return buildDecision({
      decisionState: "fallback_adjacent_candidate",
      fallbackLane: "adjacent_fallback_candidate_lane",
      fallbackReason,
      primaryStatus,
      adjacentSignal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: true,
      canFeedAutomationPolicy: true,
      publishCandidateAllowed: true,
      blocked: false,
      shouldWaitForMoreSignals: false,
      policyInput,
      policyDecision,
    });
  }

  return buildDecision({
    decisionState: "fallback_adjacent_signal_accumulation",
    fallbackLane: "adjacent_fallback_accumulation_lane",
    fallbackReason,
    primaryStatus,
    adjacentSignal,
    usedPrimaryTicketingApi: false,
    usedAdjacentFallback: true,
    canFeedAutomationPolicy: true,
    publishCandidateAllowed: false,
    blocked: false,
    shouldWaitForMoreSignals: true,
    policyInput,
    policyDecision,
  });
}

export function resolveEventSourceFallbackPolicyDecision(
  input: EventSourceFallbackPolicyInput
): EventSourceFallbackPolicyDecision {
  const primaryStatus = input.primary_ticketing_api.status;

  if (primaryStatus === "blocked" || primaryStatus === "conflicting") {
    const policyInput = buildEmptyPolicyInput();
    const policyDecision = resolveEventAutomationPolicyDecision(policyInput);

    return buildDecision({
      decisionState: "blocked_by_primary_ticketing_api",
      fallbackLane: "primary_ticketing_api_block_lane",
      fallbackReason: resolveFallbackReasonFromPrimaryStatus(primaryStatus),
      primaryStatus,
      adjacentSignal: input.adjacent_signal,
      usedPrimaryTicketingApi: false,
      usedAdjacentFallback: false,
      canFeedAutomationPolicy: false,
      publishCandidateAllowed: false,
      blocked: true,
      shouldWaitForMoreSignals: false,
      policyInput,
      policyDecision,
    });
  }

  if (
    primaryStatus === "authorized_available" &&
    input.primary_ticketing_api.adapter_input
  ) {
    const ticketingAdapterResult = adaptTicketingApiSourceToAutomationPolicy(
      input.primary_ticketing_api.adapter_input
    );

    if (
      ticketingAdapterResult.policy_decision.decision_state ===
      "safe_auto_publish_candidate"
    ) {
      return buildDecision({
        decisionState: "primary_ticketing_api_candidate",
        fallbackLane: "primary_ticketing_api_lane",
        fallbackReason: "none_primary_ticketing_api_used",
        primaryStatus,
        adjacentSignal: input.adjacent_signal,
        usedPrimaryTicketingApi: true,
        usedAdjacentFallback: false,
        canFeedAutomationPolicy: true,
        publishCandidateAllowed: true,
        blocked: false,
        shouldWaitForMoreSignals: false,
        policyInput: ticketingAdapterResult.policy_input,
        policyDecision: ticketingAdapterResult.policy_decision,
        ticketingAdapterResult,
      });
    }

    if (
      ticketingAdapterResult.policy_decision.decision_state ===
        "blocked_by_conflict" ||
      ticketingAdapterResult.policy_decision.decision_state ===
        "blocked_by_validation"
    ) {
      return buildDecision({
        decisionState: "blocked_by_primary_ticketing_api",
        fallbackLane: "primary_ticketing_api_block_lane",
        fallbackReason: "primary_ticketing_api_insufficient_confidence",
        primaryStatus,
        adjacentSignal: input.adjacent_signal,
        usedPrimaryTicketingApi: true,
        usedAdjacentFallback: false,
        canFeedAutomationPolicy: true,
        publishCandidateAllowed: false,
        blocked: true,
        shouldWaitForMoreSignals: false,
        policyInput: ticketingAdapterResult.policy_input,
        policyDecision: ticketingAdapterResult.policy_decision,
        ticketingAdapterResult,
      });
    }

    return resolveAdjacentFallbackDecision(
      primaryStatus,
      "primary_ticketing_api_insufficient_confidence",
      input.adjacent_signal
    );
  }

  return resolveAdjacentFallbackDecision(
    primaryStatus,
    resolveFallbackReasonFromPrimaryStatus(primaryStatus),
    input.adjacent_signal
  );
}

export const EVENT_SOURCE_FALLBACK_FOUNDATION_DEFAULTS = {
  primary_ticketing_api_has_priority: true,
  adjacent_sources_are_fallback: true,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;