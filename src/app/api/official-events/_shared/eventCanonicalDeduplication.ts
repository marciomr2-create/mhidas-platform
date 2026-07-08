// src/app/api/official-events/_shared/eventCanonicalDeduplication.ts

export type EventCanonicalSourceKind =
  | "authorized_ticketing_api"
  | "official_event_site"
  | "official_venue_site"
  | "official_promoter_site"
  | "artist_official_calendar"
  | "public_ticketing_page"
  | "official_social_post"
  | "editorial_discovery"
  | "community_signal"
  | "internal_canonical_event";

export type EventCanonicalDeduplicationDecisionState =
  | "attach_to_existing_canonical"
  | "attach_complementary_signal"
  | "create_new_canonical_candidate"
  | "needs_more_identity_signals"
  | "blocked_by_identity_conflict"
  | "discarded_unvalidated_candidate";

export type EventCanonicalDeduplicationLane =
  | "canonical_direct_match_lane"
  | "complementary_signal_lane"
  | "new_canonical_candidate_lane"
  | "identity_accumulation_lane"
  | "identity_conflict_block_lane"
  | "unvalidated_discard_lane";

export type EventCanonicalDeduplicationReason =
  | "exact_external_id_match"
  | "exact_official_url_match"
  | "exact_ticket_url_match"
  | "strong_identity_similarity"
  | "no_existing_canonical_match"
  | "missing_required_identity"
  | "critical_identity_conflict"
  | "candidate_not_validated_enough"
  | "insufficient_similarity";

export type EventCanonicalDeduplicationSafetyFlag =
  | "canonical_events_are_internal_search_sources"
  | "source_trace_must_be_preserved"
  | "candidate_compared_before_creation"
  | "existing_canonical_match_found"
  | "new_canonical_candidate_detected"
  | "candidate_has_required_identity"
  | "candidate_missing_required_identity"
  | "candidate_is_100_percent_validated"
  | "candidate_is_not_100_percent_validated"
  | "identity_conflict_detected"
  | "external_request_not_performed"
  | "database_write_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required";

export type EventCanonicalSourceTrace = {
  source_key: string;
  source_kind: EventCanonicalSourceKind;
  provider_key?: string | null;
  external_event_id?: string | null;
  source_url?: string | null;
  authority_score?: number | null;
};

export type EventCanonicalIdentitySnapshot = {
  internal_canonical_event_id?: string | null;
  event_name?: string | null;
  starts_at?: string | null;
  venue_name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  official_url?: string | null;
  ticket_url?: string | null;
  external_event_id?: string | null;
  provider_key?: string | null;
  is_100_percent_validated?: boolean | null;
  source_trace?: EventCanonicalSourceTrace[] | null;
};

export type EventCanonicalDeduplicationInput = {
  candidate_event: EventCanonicalIdentitySnapshot;
  existing_canonical_events: EventCanonicalIdentitySnapshot[];
};

export type EventCanonicalDeduplicationMatch = {
  canonical_event: EventCanonicalIdentitySnapshot;
  identity_similarity_score: number;
  name_similarity_score: number;
  location_similarity_score: number;
  match_reason: EventCanonicalDeduplicationReason;
  exact_external_id_match: boolean;
  exact_official_url_match: boolean;
  exact_ticket_url_match: boolean;
  same_event_date: boolean;
  critical_identity_conflict_count: number;
};

export type EventCanonicalDeduplicationDecision = {
  decision_state: EventCanonicalDeduplicationDecisionState;
  deduplication_lane: EventCanonicalDeduplicationLane;
  reason: EventCanonicalDeduplicationReason;
  best_match: EventCanonicalDeduplicationMatch | null;
  all_matches: EventCanonicalDeduplicationMatch[];
  should_create_new_canonical_event: boolean;
  should_attach_to_existing_canonical_event: boolean;
  is_duplicate_of_existing_canonical: boolean;
  is_complementary_signal_for_existing_canonical: boolean;
  resolved_canonical_event_is_direct_search_source: boolean;
  candidate_can_become_direct_search_source: boolean;
  can_feed_internal_search_index: boolean;
  can_feed_autocomplete: boolean;
  can_feed_event_features: boolean;
  source_trace_should_be_preserved: true;
  canonical_record_required_before_public_search: true;
  safety_flags: EventCanonicalDeduplicationSafetyFlag[];
  external_request_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string | null | undefined): string[] {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalized.split(" ").filter((token) => token.length > 1);
}

function calculateTokenSimilarity(
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): number {
  const firstTokens = tokenize(firstValue);
  const secondTokens = tokenize(secondValue);

  if (firstTokens.length === 0 || secondTokens.length === 0) {
    return 0;
  }

  const firstSet = new Set(firstTokens);
  const secondSet = new Set(secondTokens);
  const intersection = firstTokens.filter((token) => secondSet.has(token));
  const union = new Set([...firstSet, ...secondSet]);

  if (union.size === 0) {
    return 0;
  }

  return Math.round((intersection.length / union.size) * 100);
}

function extractDateKey(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

  if (match?.[1]) {
    return match[1];
  }

  return "";
}

function normalizeUrl(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();

    return `${hostname}${pathname}`;
  } catch {
    return value
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .trim();
  }
}

function sameNormalizedValue(
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): boolean {
  const first = normalizeText(firstValue);
  const second = normalizeText(secondValue);

  return first.length > 0 && second.length > 0 && first === second;
}

function sameNormalizedUrl(
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): boolean {
  const first = normalizeUrl(firstValue);
  const second = normalizeUrl(secondValue);

  return first.length > 0 && second.length > 0 && first === second;
}

function hasRequiredCanonicalIdentity(
  event: EventCanonicalIdentitySnapshot
): boolean {
  const hasName = normalizeText(event.event_name).length > 0;
  const hasDate = extractDateKey(event.starts_at).length > 0;
  const hasLocation =
    normalizeText(event.venue_name).length > 0 ||
    normalizeText(event.city).length > 0;
  const hasSourceReference =
    normalizeUrl(event.official_url).length > 0 ||
    normalizeUrl(event.ticket_url).length > 0 ||
    normalizeText(event.external_event_id).length > 0;

  return hasName && hasDate && hasLocation && hasSourceReference;
}

function calculateLocationSimilarity(
  candidate: EventCanonicalIdentitySnapshot,
  canonical: EventCanonicalIdentitySnapshot
): number {
  const venueSimilarity = calculateTokenSimilarity(
    candidate.venue_name,
    canonical.venue_name
  );
  const cityScore = sameNormalizedValue(candidate.city, canonical.city) ? 20 : 0;
  const stateScore = sameNormalizedValue(candidate.state, canonical.state)
    ? 10
    : 0;
  const countryScore = sameNormalizedValue(candidate.country, canonical.country)
    ? 10
    : 0;

  return Math.min(
    100,
    Math.round(venueSimilarity * 0.6 + cityScore + stateScore + countryScore)
  );
}

function compareCandidateWithCanonical(
  candidate: EventCanonicalIdentitySnapshot,
  canonical: EventCanonicalIdentitySnapshot
): EventCanonicalDeduplicationMatch {
  const candidateDateKey = extractDateKey(candidate.starts_at);
  const canonicalDateKey = extractDateKey(canonical.starts_at);
  const sameEventDate =
    candidateDateKey.length > 0 &&
    canonicalDateKey.length > 0 &&
    candidateDateKey === canonicalDateKey;
  const dateConflict =
    candidateDateKey.length > 0 &&
    canonicalDateKey.length > 0 &&
    candidateDateKey !== canonicalDateKey;

  const exactExternalIdMatch =
    normalizeText(candidate.external_event_id).length > 0 &&
    normalizeText(canonical.external_event_id).length > 0 &&
    normalizeText(candidate.external_event_id) ===
      normalizeText(canonical.external_event_id) &&
    (normalizeText(candidate.provider_key).length === 0 ||
      normalizeText(canonical.provider_key).length === 0 ||
      normalizeText(candidate.provider_key) ===
        normalizeText(canonical.provider_key));

  const exactOfficialUrlMatch = sameNormalizedUrl(
    candidate.official_url,
    canonical.official_url
  );

  const exactTicketUrlMatch = sameNormalizedUrl(
    candidate.ticket_url,
    canonical.ticket_url
  );

  const nameSimilarityScore = calculateTokenSimilarity(
    candidate.event_name,
    canonical.event_name
  );
  const locationSimilarityScore = calculateLocationSimilarity(
    candidate,
    canonical
  );

  let score = 0;

  if (exactExternalIdMatch) {
    score += 70;
  }

  if (exactOfficialUrlMatch) {
    score += 60;
  }

  if (exactTicketUrlMatch) {
    score += 50;
  }

  score += Math.round(nameSimilarityScore * 0.35);

  if (sameEventDate) {
    score += 25;
  }

  if (dateConflict) {
    score -= 25;
  }

  score += Math.round(locationSimilarityScore * 0.3);

  const criticalIdentityConflictCount =
    dateConflict && nameSimilarityScore >= 80 && locationSimilarityScore >= 80
      ? 1
      : 0;

  const identitySimilarityScore = Math.max(0, Math.min(100, score));

  let matchReason: EventCanonicalDeduplicationReason =
    "insufficient_similarity";

  if (exactExternalIdMatch) {
    matchReason = "exact_external_id_match";
  } else if (exactOfficialUrlMatch) {
    matchReason = "exact_official_url_match";
  } else if (exactTicketUrlMatch) {
    matchReason = "exact_ticket_url_match";
  } else if (criticalIdentityConflictCount > 0) {
    matchReason = "critical_identity_conflict";
  } else if (identitySimilarityScore >= 80) {
    matchReason = "strong_identity_similarity";
  }

  return {
    canonical_event: canonical,
    identity_similarity_score: identitySimilarityScore,
    name_similarity_score: nameSimilarityScore,
    location_similarity_score: locationSimilarityScore,
    match_reason: matchReason,
    exact_external_id_match: exactExternalIdMatch,
    exact_official_url_match: exactOfficialUrlMatch,
    exact_ticket_url_match: exactTicketUrlMatch,
    same_event_date: sameEventDate,
    critical_identity_conflict_count: criticalIdentityConflictCount,
  };
}

function getSortedMatches(
  input: EventCanonicalDeduplicationInput
): EventCanonicalDeduplicationMatch[] {
  return input.existing_canonical_events
    .filter((event) => event.is_100_percent_validated === true)
    .map((canonicalEvent) =>
      compareCandidateWithCanonical(input.candidate_event, canonicalEvent)
    )
    .sort((firstMatch, secondMatch) => {
      if (
        firstMatch.critical_identity_conflict_count !==
        secondMatch.critical_identity_conflict_count
      ) {
        return (
          secondMatch.critical_identity_conflict_count -
          firstMatch.critical_identity_conflict_count
        );
      }

      return (
        secondMatch.identity_similarity_score -
        firstMatch.identity_similarity_score
      );
    });
}

function buildSafetyFlags(args: {
  candidateHasRequiredIdentity: boolean;
  candidateIsValidated: boolean;
  bestMatch: EventCanonicalDeduplicationMatch | null;
  decisionState: EventCanonicalDeduplicationDecisionState;
}): EventCanonicalDeduplicationSafetyFlag[] {
  const flags: EventCanonicalDeduplicationSafetyFlag[] = [
    "canonical_events_are_internal_search_sources",
    "source_trace_must_be_preserved",
    "candidate_compared_before_creation",
    "external_request_not_performed",
    "database_write_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
  ];

  if (args.candidateHasRequiredIdentity) {
    flags.push("candidate_has_required_identity");
  } else {
    flags.push("candidate_missing_required_identity");
  }

  if (args.candidateIsValidated) {
    flags.push("candidate_is_100_percent_validated");
  } else {
    flags.push("candidate_is_not_100_percent_validated");
  }

  if (args.bestMatch) {
    flags.push("existing_canonical_match_found");
  }

  if (args.bestMatch && args.bestMatch.critical_identity_conflict_count > 0) {
    flags.push("identity_conflict_detected");
  }

  if (args.decisionState === "create_new_canonical_candidate") {
    flags.push("new_canonical_candidate_detected");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventCanonicalDeduplicationDecisionState;
  lane: EventCanonicalDeduplicationLane;
  reason: EventCanonicalDeduplicationReason;
  bestMatch: EventCanonicalDeduplicationMatch | null;
  allMatches: EventCanonicalDeduplicationMatch[];
  shouldCreateNewCanonicalEvent: boolean;
  shouldAttachToExistingCanonicalEvent: boolean;
  isDuplicateOfExistingCanonical: boolean;
  isComplementarySignalForExistingCanonical: boolean;
  resolvedCanonicalEventIsDirectSearchSource: boolean;
  candidateCanBecomeDirectSearchSource: boolean;
  candidateHasRequiredIdentity: boolean;
  candidateIsValidated: boolean;
}): EventCanonicalDeduplicationDecision {
  return {
    decision_state: args.decisionState,
    deduplication_lane: args.lane,
    reason: args.reason,
    best_match: args.bestMatch,
    all_matches: args.allMatches,
    should_create_new_canonical_event: args.shouldCreateNewCanonicalEvent,
    should_attach_to_existing_canonical_event:
      args.shouldAttachToExistingCanonicalEvent,
    is_duplicate_of_existing_canonical: args.isDuplicateOfExistingCanonical,
    is_complementary_signal_for_existing_canonical:
      args.isComplementarySignalForExistingCanonical,
    resolved_canonical_event_is_direct_search_source:
      args.resolvedCanonicalEventIsDirectSearchSource,
    candidate_can_become_direct_search_source:
      args.candidateCanBecomeDirectSearchSource,
    can_feed_internal_search_index:
      args.resolvedCanonicalEventIsDirectSearchSource ||
      args.candidateCanBecomeDirectSearchSource,
    can_feed_autocomplete:
      args.resolvedCanonicalEventIsDirectSearchSource ||
      args.candidateCanBecomeDirectSearchSource,
    can_feed_event_features:
      args.resolvedCanonicalEventIsDirectSearchSource ||
      args.candidateCanBecomeDirectSearchSource,
    source_trace_should_be_preserved: true,
    canonical_record_required_before_public_search: true,
    safety_flags: buildSafetyFlags({
      candidateHasRequiredIdentity: args.candidateHasRequiredIdentity,
      candidateIsValidated: args.candidateIsValidated,
      bestMatch: args.bestMatch,
      decisionState: args.decisionState,
    }),
    external_request_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalDeduplicationDecision(
  input: EventCanonicalDeduplicationInput
): EventCanonicalDeduplicationDecision {
  const candidateHasRequiredIdentity = hasRequiredCanonicalIdentity(
    input.candidate_event
  );
  const candidateIsValidated =
    input.candidate_event.is_100_percent_validated === true;
  const allMatches = getSortedMatches(input);
  const bestMatch = allMatches[0] ?? null;

  if (!candidateHasRequiredIdentity) {
    return buildDecision({
      decisionState: "needs_more_identity_signals",
      lane: "identity_accumulation_lane",
      reason: "missing_required_identity",
      bestMatch,
      allMatches,
      shouldCreateNewCanonicalEvent: false,
      shouldAttachToExistingCanonicalEvent: false,
      isDuplicateOfExistingCanonical: false,
      isComplementarySignalForExistingCanonical: false,
      resolvedCanonicalEventIsDirectSearchSource: Boolean(bestMatch),
      candidateCanBecomeDirectSearchSource: false,
      candidateHasRequiredIdentity,
      candidateIsValidated,
    });
  }

  if (bestMatch && bestMatch.critical_identity_conflict_count > 0) {
    return buildDecision({
      decisionState: "blocked_by_identity_conflict",
      lane: "identity_conflict_block_lane",
      reason: "critical_identity_conflict",
      bestMatch,
      allMatches,
      shouldCreateNewCanonicalEvent: false,
      shouldAttachToExistingCanonicalEvent: false,
      isDuplicateOfExistingCanonical: false,
      isComplementarySignalForExistingCanonical: false,
      resolvedCanonicalEventIsDirectSearchSource: true,
      candidateCanBecomeDirectSearchSource: false,
      candidateHasRequiredIdentity,
      candidateIsValidated,
    });
  }

  if (
    bestMatch &&
    (bestMatch.exact_external_id_match ||
      bestMatch.exact_official_url_match ||
      bestMatch.exact_ticket_url_match)
  ) {
    return buildDecision({
      decisionState: "attach_to_existing_canonical",
      lane: "canonical_direct_match_lane",
      reason: bestMatch.match_reason,
      bestMatch,
      allMatches,
      shouldCreateNewCanonicalEvent: false,
      shouldAttachToExistingCanonicalEvent: true,
      isDuplicateOfExistingCanonical: true,
      isComplementarySignalForExistingCanonical: false,
      resolvedCanonicalEventIsDirectSearchSource: true,
      candidateCanBecomeDirectSearchSource: false,
      candidateHasRequiredIdentity,
      candidateIsValidated,
    });
  }

  if (bestMatch && bestMatch.identity_similarity_score >= 80) {
    return buildDecision({
      decisionState: "attach_complementary_signal",
      lane: "complementary_signal_lane",
      reason: "strong_identity_similarity",
      bestMatch,
      allMatches,
      shouldCreateNewCanonicalEvent: false,
      shouldAttachToExistingCanonicalEvent: true,
      isDuplicateOfExistingCanonical: false,
      isComplementarySignalForExistingCanonical: true,
      resolvedCanonicalEventIsDirectSearchSource: true,
      candidateCanBecomeDirectSearchSource: false,
      candidateHasRequiredIdentity,
      candidateIsValidated,
    });
  }

  if (!candidateIsValidated) {
    return buildDecision({
      decisionState: "discarded_unvalidated_candidate",
      lane: "unvalidated_discard_lane",
      reason: "candidate_not_validated_enough",
      bestMatch,
      allMatches,
      shouldCreateNewCanonicalEvent: false,
      shouldAttachToExistingCanonicalEvent: false,
      isDuplicateOfExistingCanonical: false,
      isComplementarySignalForExistingCanonical: false,
      resolvedCanonicalEventIsDirectSearchSource: false,
      candidateCanBecomeDirectSearchSource: false,
      candidateHasRequiredIdentity,
      candidateIsValidated,
    });
  }

  return buildDecision({
    decisionState: "create_new_canonical_candidate",
    lane: "new_canonical_candidate_lane",
    reason: "no_existing_canonical_match",
    bestMatch,
    allMatches,
    shouldCreateNewCanonicalEvent: true,
    shouldAttachToExistingCanonicalEvent: false,
    isDuplicateOfExistingCanonical: false,
    isComplementarySignalForExistingCanonical: false,
    resolvedCanonicalEventIsDirectSearchSource: false,
    candidateCanBecomeDirectSearchSource: true,
    candidateHasRequiredIdentity,
    candidateIsValidated,
  });
}

export const EVENT_CANONICAL_DEDUPLICATION_DEFAULTS = {
  canonical_events_are_internal_search_sources: true,
  source_trace_should_be_preserved: true,
  canonical_record_required_before_public_search: true,
  external_request_performed: false,
  database_write_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;