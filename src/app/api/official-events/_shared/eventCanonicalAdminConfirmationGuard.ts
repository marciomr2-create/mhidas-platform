// src/app/api/official-events/_shared/eventCanonicalAdminConfirmationGuard.ts

export type EventCanonicalAdminConfirmationSourceKind =
  | "ticketing_api"
  | "ticketing_public_page"
  | "official_event_site"
  | "official_venue_site"
  | "official_producer_site"
  | "official_artist_source"
  | "social_official_post"
  | "editorial_source"
  | "manual_admin_review"
  | "other_official_source";

export type EventCanonicalAdminConfirmationFeatureKey =
  | "ticket_intent"
  | "check_in"
  | "rides"
  | "meetups"
  | "connections"
  | "social_radar"
  | "search_autocomplete";

export type EventCanonicalAdminConfirmationRecommendedAction =
  | "confirm_create_canonical_event"
  | "confirm_update_existing_canonical_event"
  | "hold_for_more_evidence"
  | "hold_for_search_document"
  | "hold_for_feature_gates"
  | "reject_candidate"
  | "block_ambiguous_identity"
  | "block_free_text_event_interaction"
  | "block_admin_manual_ambiguous_choice"
  | "block_social_feature_fragmentation_risk"
  | "block_ticketing_dependency_misclassified";

export type EventCanonicalAdminConfirmationState =
  | "ready_for_admin_confirmation"
  | "hold_missing_schema"
  | "hold_missing_required_identity"
  | "hold_missing_strong_evidence"
  | "hold_missing_search_document"
  | "hold_missing_feature_gates"
  | "blocked_ambiguous_identity"
  | "blocked_duplicate_conflict"
  | "blocked_free_text_event_interaction"
  | "blocked_admin_manual_ambiguous_choice"
  | "blocked_social_feature_fragmentation_risk"
  | "blocked_ticketing_dependency_misclassified";

export type EventCanonicalAdminConfirmationLane =
  | "safe_admin_confirmation_lane"
  | "missing_schema_hold_lane"
  | "identity_evidence_hold_lane"
  | "catalog_discovery_hold_lane"
  | "feature_gate_hold_lane"
  | "canonical_identity_conflict_block_lane"
  | "fragmentation_risk_block_lane"
  | "ticketing_scope_block_lane";

export type EventCanonicalAdminConfirmationBlockingReason =
  | "canonical_schema_must_exist_before_confirmation"
  | "required_event_identity_fields_are_missing"
  | "strong_official_or_admin_evidence_is_missing"
  | "admin_cannot_choose_between_ambiguous_event_options"
  | "multiple_plausible_canonical_events_detected"
  | "duplicate_candidate_has_identity_conflicts"
  | "free_text_event_interaction_is_not_allowed"
  | "social_features_require_single_canonical_event_id"
  | "canonical_search_document_must_be_prepared"
  | "canonical_feature_gates_must_be_prepared"
  | "ticketing_apis_are_prepared_for_60_day_path_not_required_now";

export type EventCanonicalAdminConfirmationSafetyFlag =
  | "admin_confirmation_guard_only"
  | "admin_cannot_choose_between_ambiguous_options"
  | "single_canonical_event_id_required"
  | "free_text_event_interaction_blocked"
  | "social_features_blocked_without_canonical_event_id"
  | "search_document_required_for_discovery"
  | "feature_gates_required_before_social_activation"
  | "ticketing_60_day_path_preserved"
  | "no_runtime_behavior_changed"
  | "no_route_created"
  | "no_database_write"
  | "no_supabase_operation"
  | "no_visual_change"
  | "safe_to_prepare_admin_confirmation"
  | "blocked_until_more_evidence"
  | "blocked_until_identity_conflict_resolved";

export type EventCanonicalAdminConfirmationSourceEvidence = {
  source_key: string;
  source_kind: EventCanonicalAdminConfirmationSourceKind;
  provider_key?: string | null;
  external_event_id?: string | null;
  source_url?: string | null;
  authority_score: number;
  is_official_source: boolean;
  supports_event_identity: boolean;
};

export type EventCanonicalAdminExistingMatch = {
  canonical_event_id: string;
  identity_match_score: number;
  same_name: boolean;
  same_date: boolean;
  same_city: boolean;
  same_state: boolean;
  same_venue: boolean;
  conflict_reasons: string[];
};

export type EventCanonicalAdminSearchDocumentProposal = {
  search_title: string;
  normalized_title: string;
  event_date_key: string;
  canonical_slug: string;
  city?: string | null;
  state?: string | null;
  venue_name?: string | null;
  artist_names: string[];
  genre_slugs: string[];
  search_tokens: string[];
};

export type EventCanonicalAdminFeatureGateProposal = {
  feature_key: EventCanonicalAdminConfirmationFeatureKey;
  enabled: boolean;
};

export type EventCanonicalAdminConfirmationGuardInput = {
  canonical_schema_ready?: boolean | null;
  candidate_has_required_identity?: boolean | null;
  canonical_identity_is_unique?: boolean | null;
  source_evidence?: EventCanonicalAdminConfirmationSourceEvidence[] | null;
  existing_canonical_matches?: EventCanonicalAdminExistingMatch[] | null;
  search_document_proposal?: EventCanonicalAdminSearchDocumentProposal | null;
  feature_gate_proposals?: EventCanonicalAdminFeatureGateProposal[] | null;
  free_text_event_interaction_requested?: boolean | null;
  admin_manual_choice_between_ambiguous_options_requested?: boolean | null;
  social_feature_requested_before_canonical_event_id?: boolean | null;
  ticketing_api_required_for_confirmation_now?: boolean | null;
  reject_candidate?: boolean | null;
};

export type EventCanonicalAdminConfirmationGuardDecision = {
  confirmation_state: EventCanonicalAdminConfirmationState;
  confirmation_lane: EventCanonicalAdminConfirmationLane;
  recommended_action: EventCanonicalAdminConfirmationRecommendedAction;
  admin_can_confirm: boolean;
  admin_can_reject: boolean;
  admin_can_request_more_evidence: boolean;
  admin_allowed_to_choose_between_ambiguous_options: false;
  target_canonical_event_id: string | null;
  confidence_score: number;
  duplicate_risk_score: number;
  blocking_reasons: EventCanonicalAdminConfirmationBlockingReason[];
  source_evidence_count: number;
  strong_evidence_count: number;
  plausible_existing_match_count: number;
  required_feature_gates: EventCanonicalAdminConfirmationFeatureKey[];
  search_document_required: true;
  feature_gates_required: true;
  canonical_event_id_required_for_social_features: true;
  free_text_event_interaction_allowed: false;
  should_create_or_update_search_document: boolean;
  should_create_or_update_feature_gates: boolean;
  should_allow_ticketing_api_dependency_now: false;
  safety_flags: EventCanonicalAdminConfirmationSafetyFlag[];
  database_write_performed: false;
  supabase_operation_performed: false;
  route_created: false;
  runtime_change_performed: false;
  visual_change_performed: false;
};

const REQUIRED_FEATURE_GATES: EventCanonicalAdminConfirmationFeatureKey[] = [
  "ticket_intent",
  "check_in",
  "rides",
  "meetups",
  "connections",
  "social_radar",
  "search_autocomplete",
];

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSourceEvidence(
  input: EventCanonicalAdminConfirmationGuardInput
): EventCanonicalAdminConfirmationSourceEvidence[] {
  return input.source_evidence ?? [];
}

function getExistingMatches(
  input: EventCanonicalAdminConfirmationGuardInput
): EventCanonicalAdminExistingMatch[] {
  return input.existing_canonical_matches ?? [];
}

function getStrongEvidenceCount(
  evidence: EventCanonicalAdminConfirmationSourceEvidence[]
): number {
  return evidence.filter((source) => {
    const officialSourceIsStrong =
      source.is_official_source === true &&
      source.supports_event_identity === true &&
      source.authority_score >= 80;

    const adminReviewIsStrong =
      source.source_kind === "manual_admin_review" &&
      source.supports_event_identity === true &&
      source.authority_score >= 90;

    return officialSourceIsStrong || adminReviewIsStrong;
  }).length;
}

function getConfidenceScore(
  evidence: EventCanonicalAdminConfirmationSourceEvidence[]
): number {
  if (evidence.length === 0) {
    return 0;
  }

  const identityEvidence = evidence.filter(
    (source) => source.supports_event_identity === true
  );

  if (identityEvidence.length === 0) {
    return 0;
  }

  const averageAuthority =
    identityEvidence.reduce((sum, source) => sum + source.authority_score, 0) /
    identityEvidence.length;

  const officialBonus = evidence.some((source) => source.is_official_source)
    ? 8
    : 0;

  const multiSourceBonus = identityEvidence.length >= 2 ? 7 : 0;

  return clampScore(averageAuthority + officialBonus + multiSourceBonus);
}

function getPlausibleExistingMatches(
  matches: EventCanonicalAdminExistingMatch[]
): EventCanonicalAdminExistingMatch[] {
  return matches.filter((match) => match.identity_match_score >= 70);
}

function getExactSafeExistingMatch(
  matches: EventCanonicalAdminExistingMatch[]
): EventCanonicalAdminExistingMatch | null {
  const safeMatches = matches.filter(
    (match) =>
      match.identity_match_score >= 90 &&
      match.same_name === true &&
      match.same_date === true &&
      match.same_city === true &&
      match.same_state === true &&
      match.conflict_reasons.length === 0
  );

  return safeMatches.length === 1 ? safeMatches[0] : null;
}

function getDuplicateRiskScore(
  matches: EventCanonicalAdminExistingMatch[]
): number {
  const plausibleMatches = getPlausibleExistingMatches(matches);
  const conflictMatches = plausibleMatches.filter(
    (match) => match.conflict_reasons.length > 0
  );

  if (conflictMatches.length > 0) {
    return 100;
  }

  if (plausibleMatches.length > 1) {
    return 90;
  }

  if (plausibleMatches.length === 1) {
    return clampScore(plausibleMatches[0].identity_match_score);
  }

  return 0;
}

function hasSearchDocumentProposal(
  proposal: EventCanonicalAdminSearchDocumentProposal | null | undefined
): boolean {
  if (!proposal) {
    return false;
  }

  return (
    proposal.search_title.trim().length > 0 &&
    proposal.normalized_title.trim().length > 0 &&
    proposal.event_date_key.trim().length > 0 &&
    proposal.canonical_slug.trim().length > 0 &&
    proposal.search_tokens.length > 0
  );
}

function hasRequiredFeatureGateProposals(
  proposals: EventCanonicalAdminFeatureGateProposal[] | null | undefined
): boolean {
  if (!proposals) {
    return false;
  }

  const proposedKeys = new Set(proposals.map((proposal) => proposal.feature_key));

  return REQUIRED_FEATURE_GATES.every((featureKey) => proposedKeys.has(featureKey));
}

function buildSafetyFlags(args: {
  adminCanConfirm: boolean;
  identityBlocked: boolean;
  moreEvidenceNeeded: boolean;
}): EventCanonicalAdminConfirmationSafetyFlag[] {
  const flags: EventCanonicalAdminConfirmationSafetyFlag[] = [
    "admin_confirmation_guard_only",
    "admin_cannot_choose_between_ambiguous_options",
    "single_canonical_event_id_required",
    "free_text_event_interaction_blocked",
    "social_features_blocked_without_canonical_event_id",
    "search_document_required_for_discovery",
    "feature_gates_required_before_social_activation",
    "ticketing_60_day_path_preserved",
    "no_runtime_behavior_changed",
    "no_route_created",
    "no_database_write",
    "no_supabase_operation",
    "no_visual_change",
  ];

  if (args.adminCanConfirm) {
    flags.push("safe_to_prepare_admin_confirmation");
  }

  if (args.moreEvidenceNeeded) {
    flags.push("blocked_until_more_evidence");
  }

  if (args.identityBlocked) {
    flags.push("blocked_until_identity_conflict_resolved");
  }

  return flags;
}

function buildDecision(args: {
  state: EventCanonicalAdminConfirmationState;
  lane: EventCanonicalAdminConfirmationLane;
  action: EventCanonicalAdminConfirmationRecommendedAction;
  adminCanConfirm: boolean;
  adminCanReject?: boolean;
  adminCanRequestMoreEvidence?: boolean;
  targetCanonicalEventId?: string | null;
  confidenceScore: number;
  duplicateRiskScore: number;
  blockingReasons: EventCanonicalAdminConfirmationBlockingReason[];
  sourceEvidenceCount: number;
  strongEvidenceCount: number;
  plausibleExistingMatchCount: number;
  shouldCreateOrUpdateSearchDocument: boolean;
  shouldCreateOrUpdateFeatureGates: boolean;
}): EventCanonicalAdminConfirmationGuardDecision {
  const identityBlocked =
    args.state === "blocked_ambiguous_identity" ||
    args.state === "blocked_duplicate_conflict" ||
    args.state === "blocked_admin_manual_ambiguous_choice" ||
    args.state === "blocked_social_feature_fragmentation_risk";

  const moreEvidenceNeeded =
    args.state === "hold_missing_required_identity" ||
    args.state === "hold_missing_strong_evidence" ||
    args.state === "hold_missing_search_document" ||
    args.state === "hold_missing_feature_gates";

  return {
    confirmation_state: args.state,
    confirmation_lane: args.lane,
    recommended_action: args.action,
    admin_can_confirm: args.adminCanConfirm,
    admin_can_reject: args.adminCanReject ?? true,
    admin_can_request_more_evidence: args.adminCanRequestMoreEvidence ?? true,
    admin_allowed_to_choose_between_ambiguous_options: false,
    target_canonical_event_id: args.targetCanonicalEventId ?? null,
    confidence_score: clampScore(args.confidenceScore),
    duplicate_risk_score: clampScore(args.duplicateRiskScore),
    blocking_reasons: args.blockingReasons,
    source_evidence_count: args.sourceEvidenceCount,
    strong_evidence_count: args.strongEvidenceCount,
    plausible_existing_match_count: args.plausibleExistingMatchCount,
    required_feature_gates: REQUIRED_FEATURE_GATES,
    search_document_required: true,
    feature_gates_required: true,
    canonical_event_id_required_for_social_features: true,
    free_text_event_interaction_allowed: false,
    should_create_or_update_search_document: args.shouldCreateOrUpdateSearchDocument,
    should_create_or_update_feature_gates: args.shouldCreateOrUpdateFeatureGates,
    should_allow_ticketing_api_dependency_now: false,
    safety_flags: buildSafetyFlags({
      adminCanConfirm: args.adminCanConfirm,
      identityBlocked,
      moreEvidenceNeeded,
    }),
    database_write_performed: false,
    supabase_operation_performed: false,
    route_created: false,
    runtime_change_performed: false,
    visual_change_performed: false,
  };
}

export function resolveEventCanonicalAdminConfirmationGuardDecision(
  input: EventCanonicalAdminConfirmationGuardInput = {}
): EventCanonicalAdminConfirmationGuardDecision {
  const evidence = getSourceEvidence(input);
  const existingMatches = getExistingMatches(input);
  const plausibleMatches = getPlausibleExistingMatches(existingMatches);
  const exactSafeExistingMatch = getExactSafeExistingMatch(existingMatches);
  const strongEvidenceCount = getStrongEvidenceCount(evidence);
  const confidenceScore = getConfidenceScore(evidence);
  const duplicateRiskScore = getDuplicateRiskScore(existingMatches);
  const searchDocumentReady = hasSearchDocumentProposal(
    input.search_document_proposal
  );
  const featureGatesReady = hasRequiredFeatureGateProposals(
    input.feature_gate_proposals
  );

  const commonMetrics = {
    confidenceScore,
    duplicateRiskScore,
    sourceEvidenceCount: evidence.length,
    strongEvidenceCount,
    plausibleExistingMatchCount: plausibleMatches.length,
  };

  if (input.canonical_schema_ready !== true) {
    return buildDecision({
      state: "hold_missing_schema",
      lane: "missing_schema_hold_lane",
      action: "hold_for_more_evidence",
      adminCanConfirm: false,
      blockingReasons: ["canonical_schema_must_exist_before_confirmation"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (input.ticketing_api_required_for_confirmation_now === true) {
    return buildDecision({
      state: "blocked_ticketing_dependency_misclassified",
      lane: "ticketing_scope_block_lane",
      action: "block_ticketing_dependency_misclassified",
      adminCanConfirm: false,
      blockingReasons: [
        "ticketing_apis_are_prepared_for_60_day_path_not_required_now",
      ],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (input.free_text_event_interaction_requested === true) {
    return buildDecision({
      state: "blocked_free_text_event_interaction",
      lane: "fragmentation_risk_block_lane",
      action: "block_free_text_event_interaction",
      adminCanConfirm: false,
      blockingReasons: ["free_text_event_interaction_is_not_allowed"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (input.admin_manual_choice_between_ambiguous_options_requested === true) {
    return buildDecision({
      state: "blocked_admin_manual_ambiguous_choice",
      lane: "canonical_identity_conflict_block_lane",
      action: "block_admin_manual_ambiguous_choice",
      adminCanConfirm: false,
      blockingReasons: ["admin_cannot_choose_between_ambiguous_event_options"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (input.social_feature_requested_before_canonical_event_id === true) {
    return buildDecision({
      state: "blocked_social_feature_fragmentation_risk",
      lane: "fragmentation_risk_block_lane",
      action: "block_social_feature_fragmentation_risk",
      adminCanConfirm: false,
      blockingReasons: ["social_features_require_single_canonical_event_id"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (input.candidate_has_required_identity !== true) {
    return buildDecision({
      state: "hold_missing_required_identity",
      lane: "identity_evidence_hold_lane",
      action: "hold_for_more_evidence",
      adminCanConfirm: false,
      blockingReasons: ["required_event_identity_fields_are_missing"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (strongEvidenceCount === 0 || confidenceScore < 80) {
    return buildDecision({
      state: "hold_missing_strong_evidence",
      lane: "identity_evidence_hold_lane",
      action: "hold_for_more_evidence",
      adminCanConfirm: false,
      blockingReasons: ["strong_official_or_admin_evidence_is_missing"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (input.canonical_identity_is_unique !== true || plausibleMatches.length > 1) {
    return buildDecision({
      state: "blocked_ambiguous_identity",
      lane: "canonical_identity_conflict_block_lane",
      action: "block_ambiguous_identity",
      adminCanConfirm: false,
      blockingReasons: ["multiple_plausible_canonical_events_detected"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (
    plausibleMatches.some((match) => match.conflict_reasons.length > 0) &&
    exactSafeExistingMatch === null
  ) {
    return buildDecision({
      state: "blocked_duplicate_conflict",
      lane: "canonical_identity_conflict_block_lane",
      action: "block_ambiguous_identity",
      adminCanConfirm: false,
      blockingReasons: ["duplicate_candidate_has_identity_conflicts"],
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (!searchDocumentReady) {
    return buildDecision({
      state: "hold_missing_search_document",
      lane: "catalog_discovery_hold_lane",
      action: "hold_for_search_document",
      adminCanConfirm: false,
      blockingReasons: ["canonical_search_document_must_be_prepared"],
      shouldCreateOrUpdateSearchDocument: true,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  if (!featureGatesReady) {
    return buildDecision({
      state: "hold_missing_feature_gates",
      lane: "feature_gate_hold_lane",
      action: "hold_for_feature_gates",
      adminCanConfirm: false,
      blockingReasons: ["canonical_feature_gates_must_be_prepared"],
      shouldCreateOrUpdateSearchDocument: true,
      shouldCreateOrUpdateFeatureGates: true,
      ...commonMetrics,
    });
  }

  if (input.reject_candidate === true) {
    return buildDecision({
      state: "ready_for_admin_confirmation",
      lane: "safe_admin_confirmation_lane",
      action: "reject_candidate",
      adminCanConfirm: false,
      adminCanReject: true,
      blockingReasons: [],
      targetCanonicalEventId: exactSafeExistingMatch?.canonical_event_id ?? null,
      shouldCreateOrUpdateSearchDocument: false,
      shouldCreateOrUpdateFeatureGates: false,
      ...commonMetrics,
    });
  }

  const targetCanonicalEventId = exactSafeExistingMatch?.canonical_event_id ?? null;

  return buildDecision({
    state: "ready_for_admin_confirmation",
    lane: "safe_admin_confirmation_lane",
    action:
      targetCanonicalEventId === null
        ? "confirm_create_canonical_event"
        : "confirm_update_existing_canonical_event",
    adminCanConfirm: true,
    blockingReasons: [],
    targetCanonicalEventId,
    shouldCreateOrUpdateSearchDocument: true,
    shouldCreateOrUpdateFeatureGates: true,
    ...commonMetrics,
  });
}

export const EVENT_CANONICAL_ADMIN_CONFIRMATION_GUARD_DEFAULTS = {
  admin_allowed_to_choose_between_ambiguous_options: false,
  canonical_event_id_required_for_social_features: true,
  free_text_event_interaction_allowed: false,
  search_document_required: true,
  feature_gates_required: true,
  ticketing_60_day_path_preserved: true,
  database_write_performed: false,
  supabase_operation_performed: false,
  route_created: false,
  runtime_change_performed: false,
  visual_change_performed: false,
} as const;