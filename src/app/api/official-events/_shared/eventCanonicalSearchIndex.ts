// src/app/api/official-events/_shared/eventCanonicalSearchIndex.ts

import type {
  EventCanonicalIdentitySnapshot,
  EventCanonicalSourceTrace,
} from "./eventCanonicalDeduplication";

export type EventCanonicalSearchRecordStatus =
  | "validated_canonical"
  | "canonical_candidate"
  | "existing_canonical_reference"
  | "complementary_signal"
  | "unvalidated_signal"
  | "blocked_signal";

export type EventCanonicalSearchIndexDecisionState =
  | "index_validated_canonical_direct_search"
  | "index_canonical_candidate_internal_only"
  | "index_existing_canonical_reference"
  | "index_autocomplete_hold"
  | "blocked_missing_canonical_identity"
  | "blocked_unvalidated_signal"
  | "blocked_by_status";

export type EventCanonicalSearchIndexLane =
  | "direct_internal_search_lane"
  | "canonical_candidate_lane"
  | "existing_canonical_reference_lane"
  | "autocomplete_hold_lane"
  | "identity_block_lane"
  | "unvalidated_block_lane"
  | "status_block_lane";

export type EventCanonicalSearchIndexReason =
  | "validated_canonical_ready"
  | "canonical_candidate_ready_internal_only"
  | "existing_canonical_reference_ready"
  | "complementary_signal_not_direct_search_source"
  | "missing_required_search_identity"
  | "unvalidated_signal_not_search_source"
  | "blocked_signal_not_search_source";

export type EventCanonicalSearchIndexAvailabilityScope =
  | "internal_search"
  | "autocomplete"
  | "event_features"
  | "public_search"
  | "blocked";

export type EventCanonicalSearchIndexSafetyFlag =
  | "canonical_event_required_before_indexing"
  | "source_trace_preserved"
  | "internal_search_source_created"
  | "autocomplete_source_created"
  | "event_feature_source_created"
  | "public_search_disabled_by_default"
  | "candidate_missing_required_identity"
  | "candidate_has_required_identity"
  | "candidate_is_validated"
  | "candidate_is_not_validated"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required";

export type EventCanonicalSearchIndexInput = {
  canonical_event: EventCanonicalIdentitySnapshot;
  canonical_record_status: EventCanonicalSearchRecordStatus;
  allow_public_search?: boolean | null;
  allow_event_feature_feeds?: boolean | null;
};

export type EventCanonicalSearchIndexSourceTraceSummary = {
  source_count: number;
  strongest_source_kind?: EventCanonicalSourceTrace["source_kind"] | null;
  provider_keys: string[];
  external_event_ids: string[];
  source_urls: string[];
  authority_score_max: number;
};

export type EventCanonicalSearchIndexDocument = {
  canonical_event_id: string;
  search_title: string;
  normalized_title: string;
  starts_at: string;
  event_date_key: string;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  canonical_slug_seed: string;
  search_tokens: string[];
  source_trace_summary: EventCanonicalSearchIndexSourceTraceSummary;
  availability_scope: EventCanonicalSearchIndexAvailabilityScope[];
  search_rank_score: number;
};

export type EventCanonicalSearchIndexDecision = {
  decision_state: EventCanonicalSearchIndexDecisionState;
  search_index_lane: EventCanonicalSearchIndexLane;
  reason: EventCanonicalSearchIndexReason;
  search_document: EventCanonicalSearchIndexDocument | null;
  can_feed_internal_search_index: boolean;
  can_feed_autocomplete: boolean;
  can_feed_event_features: boolean;
  can_feed_public_search: boolean;
  should_create_search_document: boolean;
  should_hold_for_more_identity: boolean;
  should_attach_as_non_search_trace_only: boolean;
  source_trace_should_be_preserved: true;
  canonical_record_required_before_public_search: true;
  safety_flags: EventCanonicalSearchIndexSafetyFlag[];
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

function slugify(value: string): string {
  const normalized = normalizeText(value).replace(/\s+/g, "-");

  if (!normalized) {
    return "event";
  }

  return normalized;
}

function compactUnique(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
}

function getSearchTokens(event: EventCanonicalIdentitySnapshot): string[] {
  return compactUnique([
    ...normalizeText(event.event_name).split(" "),
    ...normalizeText(event.venue_name).split(" "),
    ...normalizeText(event.city).split(" "),
    ...normalizeText(event.state).split(" "),
    ...normalizeText(event.country).split(" "),
    event.provider_key,
    event.external_event_id,
  ]).filter((token) => token.length > 1);
}

function hasRequiredSearchIdentity(
  event: EventCanonicalIdentitySnapshot
): boolean {
  const hasTitle = normalizeText(event.event_name).length > 0;
  const hasDate = extractDateKey(event.starts_at).length > 0;
  const hasLocation =
    normalizeText(event.venue_name).length > 0 ||
    normalizeText(event.city).length > 0;
  const hasCanonicalReference =
    normalizeText(event.internal_canonical_event_id).length > 0 ||
    normalizeText(event.external_event_id).length > 0 ||
    normalizeText(event.official_url).length > 0 ||
    normalizeText(event.ticket_url).length > 0;

  return hasTitle && hasDate && hasLocation && hasCanonicalReference;
}

function summarizeSourceTrace(
  sourceTrace: EventCanonicalSourceTrace[] | null | undefined
): EventCanonicalSearchIndexSourceTraceSummary {
  const trace = sourceTrace ?? [];
  const authorityScores = trace
    .map((source) =>
      typeof source.authority_score === "number" &&
      Number.isFinite(source.authority_score)
        ? source.authority_score
        : 0
    )
    .filter((score) => score >= 0);

  const strongestSource = trace
    .slice()
    .sort((first, second) => {
      const firstScore =
        typeof first.authority_score === "number" ? first.authority_score : 0;
      const secondScore =
        typeof second.authority_score === "number" ? second.authority_score : 0;

      return secondScore - firstScore;
    })[0];

  return {
    source_count: trace.length,
    strongest_source_kind: strongestSource?.source_kind ?? null,
    provider_keys: compactUnique(trace.map((source) => source.provider_key)),
    external_event_ids: compactUnique(
      trace.map((source) => source.external_event_id)
    ),
    source_urls: compactUnique(trace.map((source) => source.source_url)),
    authority_score_max:
      authorityScores.length > 0 ? Math.max(...authorityScores) : 0,
  };
}

function buildCanonicalSlugSeed(event: EventCanonicalIdentitySnapshot): string {
  const parts = [
    event.event_name,
    extractDateKey(event.starts_at),
    event.city,
    event.state,
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return slugify(parts.join(" "));
}

function calculateSearchRankScore(args: {
  event: EventCanonicalIdentitySnapshot;
  sourceTraceSummary: EventCanonicalSearchIndexSourceTraceSummary;
  recordStatus: EventCanonicalSearchRecordStatus;
}): number {
  let score = 0;

  if (args.event.is_100_percent_validated === true) {
    score += 35;
  }

  if (args.recordStatus === "validated_canonical") {
    score += 30;
  }

  if (args.recordStatus === "canonical_candidate") {
    score += 15;
  }

  if (args.sourceTraceSummary.source_count > 0) {
    score += Math.min(args.sourceTraceSummary.source_count, 5) * 5;
  }

  score += Math.min(args.sourceTraceSummary.authority_score_max, 100) * 0.2;

  if (normalizeText(args.event.ticket_url).length > 0) {
    score += 5;
  }

  if (normalizeText(args.event.official_url).length > 0) {
    score += 5;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

function buildSearchDocument(
  event: EventCanonicalIdentitySnapshot,
  availabilityScope: EventCanonicalSearchIndexAvailabilityScope[],
  recordStatus: EventCanonicalSearchRecordStatus
): EventCanonicalSearchIndexDocument {
  const sourceTraceSummary = summarizeSourceTrace(event.source_trace);

  return {
    canonical_event_id:
      event.internal_canonical_event_id ??
      event.external_event_id ??
      buildCanonicalSlugSeed(event),
    search_title: event.event_name ?? "",
    normalized_title: normalizeText(event.event_name),
    starts_at: event.starts_at ?? "",
    event_date_key: extractDateKey(event.starts_at),
    venue_name: event.venue_name ?? null,
    city: event.city ?? null,
    state: event.state ?? null,
    country: event.country ?? null,
    official_url: event.official_url ?? null,
    ticket_url: event.ticket_url ?? null,
    canonical_slug_seed: buildCanonicalSlugSeed(event),
    search_tokens: getSearchTokens(event),
    source_trace_summary: sourceTraceSummary,
    availability_scope: availabilityScope,
    search_rank_score: calculateSearchRankScore({
      event,
      sourceTraceSummary,
      recordStatus,
    }),
  };
}

function buildSafetyFlags(args: {
  hasRequiredIdentity: boolean;
  isValidated: boolean;
  searchDocument: EventCanonicalSearchIndexDocument | null;
  canFeedAutocomplete: boolean;
  canFeedEventFeatures: boolean;
}): EventCanonicalSearchIndexSafetyFlag[] {
  const flags: EventCanonicalSearchIndexSafetyFlag[] = [
    "canonical_event_required_before_indexing",
    "source_trace_preserved",
    "public_search_disabled_by_default",
    "database_write_not_performed",
    "external_request_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
  ];

  if (args.hasRequiredIdentity) {
    flags.push("candidate_has_required_identity");
  } else {
    flags.push("candidate_missing_required_identity");
  }

  if (args.isValidated) {
    flags.push("candidate_is_validated");
  } else {
    flags.push("candidate_is_not_validated");
  }

  if (args.searchDocument) {
    flags.push("internal_search_source_created");
  }

  if (args.canFeedAutocomplete) {
    flags.push("autocomplete_source_created");
  }

  if (args.canFeedEventFeatures) {
    flags.push("event_feature_source_created");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventCanonicalSearchIndexDecisionState;
  lane: EventCanonicalSearchIndexLane;
  reason: EventCanonicalSearchIndexReason;
  searchDocument: EventCanonicalSearchIndexDocument | null;
  canFeedInternalSearchIndex: boolean;
  canFeedAutocomplete: boolean;
  canFeedEventFeatures: boolean;
  canFeedPublicSearch: boolean;
  shouldCreateSearchDocument: boolean;
  shouldHoldForMoreIdentity: boolean;
  shouldAttachAsNonSearchTraceOnly: boolean;
  hasRequiredIdentity: boolean;
  isValidated: boolean;
}): EventCanonicalSearchIndexDecision {
  return {
    decision_state: args.decisionState,
    search_index_lane: args.lane,
    reason: args.reason,
    search_document: args.searchDocument,
    can_feed_internal_search_index: args.canFeedInternalSearchIndex,
    can_feed_autocomplete: args.canFeedAutocomplete,
    can_feed_event_features: args.canFeedEventFeatures,
    can_feed_public_search: args.canFeedPublicSearch,
    should_create_search_document: args.shouldCreateSearchDocument,
    should_hold_for_more_identity: args.shouldHoldForMoreIdentity,
    should_attach_as_non_search_trace_only: args.shouldAttachAsNonSearchTraceOnly,
    source_trace_should_be_preserved: true,
    canonical_record_required_before_public_search: true,
    safety_flags: buildSafetyFlags({
      hasRequiredIdentity: args.hasRequiredIdentity,
      isValidated: args.isValidated,
      searchDocument: args.searchDocument,
      canFeedAutocomplete: args.canFeedAutocomplete,
      canFeedEventFeatures: args.canFeedEventFeatures,
    }),
    external_request_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalSearchIndexDecision(
  input: EventCanonicalSearchIndexInput
): EventCanonicalSearchIndexDecision {
  const event = input.canonical_event;
  const hasRequiredIdentity = hasRequiredSearchIdentity(event);
  const isValidated = event.is_100_percent_validated === true;
  const eventFeatureFeedsAllowed = input.allow_event_feature_feeds === true;
  const publicSearchAllowed = input.allow_public_search === true;

  if (!hasRequiredIdentity) {
    return buildDecision({
      decisionState: "blocked_missing_canonical_identity",
      lane: "identity_block_lane",
      reason: "missing_required_search_identity",
      searchDocument: null,
      canFeedInternalSearchIndex: false,
      canFeedAutocomplete: false,
      canFeedEventFeatures: false,
      canFeedPublicSearch: false,
      shouldCreateSearchDocument: false,
      shouldHoldForMoreIdentity: true,
      shouldAttachAsNonSearchTraceOnly: false,
      hasRequiredIdentity,
      isValidated,
    });
  }

  if (input.canonical_record_status === "blocked_signal") {
    return buildDecision({
      decisionState: "blocked_by_status",
      lane: "status_block_lane",
      reason: "blocked_signal_not_search_source",
      searchDocument: null,
      canFeedInternalSearchIndex: false,
      canFeedAutocomplete: false,
      canFeedEventFeatures: false,
      canFeedPublicSearch: false,
      shouldCreateSearchDocument: false,
      shouldHoldForMoreIdentity: false,
      shouldAttachAsNonSearchTraceOnly: false,
      hasRequiredIdentity,
      isValidated,
    });
  }

  if (input.canonical_record_status === "validated_canonical" && isValidated) {
    const availabilityScope: EventCanonicalSearchIndexAvailabilityScope[] = [
      "internal_search",
      "autocomplete",
    ];

    if (eventFeatureFeedsAllowed) {
      availabilityScope.push("event_features");
    }

    if (publicSearchAllowed) {
      availabilityScope.push("public_search");
    }

    return buildDecision({
      decisionState: "index_validated_canonical_direct_search",
      lane: "direct_internal_search_lane",
      reason: "validated_canonical_ready",
      searchDocument: buildSearchDocument(
        event,
        availabilityScope,
        input.canonical_record_status
      ),
      canFeedInternalSearchIndex: true,
      canFeedAutocomplete: true,
      canFeedEventFeatures: eventFeatureFeedsAllowed,
      canFeedPublicSearch: publicSearchAllowed,
      shouldCreateSearchDocument: true,
      shouldHoldForMoreIdentity: false,
      shouldAttachAsNonSearchTraceOnly: false,
      hasRequiredIdentity,
      isValidated,
    });
  }

  if (input.canonical_record_status === "canonical_candidate" && isValidated) {
    return buildDecision({
      decisionState: "index_canonical_candidate_internal_only",
      lane: "canonical_candidate_lane",
      reason: "canonical_candidate_ready_internal_only",
      searchDocument: buildSearchDocument(
        event,
        ["internal_search", "autocomplete"],
        input.canonical_record_status
      ),
      canFeedInternalSearchIndex: true,
      canFeedAutocomplete: true,
      canFeedEventFeatures: false,
      canFeedPublicSearch: false,
      shouldCreateSearchDocument: true,
      shouldHoldForMoreIdentity: false,
      shouldAttachAsNonSearchTraceOnly: false,
      hasRequiredIdentity,
      isValidated,
    });
  }

  if (input.canonical_record_status === "existing_canonical_reference") {
    return buildDecision({
      decisionState: "index_existing_canonical_reference",
      lane: "existing_canonical_reference_lane",
      reason: "existing_canonical_reference_ready",
      searchDocument: buildSearchDocument(
        event,
        ["internal_search", "autocomplete"],
        input.canonical_record_status
      ),
      canFeedInternalSearchIndex: true,
      canFeedAutocomplete: true,
      canFeedEventFeatures: eventFeatureFeedsAllowed,
      canFeedPublicSearch: false,
      shouldCreateSearchDocument: true,
      shouldHoldForMoreIdentity: false,
      shouldAttachAsNonSearchTraceOnly: false,
      hasRequiredIdentity,
      isValidated,
    });
  }

  if (input.canonical_record_status === "complementary_signal") {
    return buildDecision({
      decisionState: "index_autocomplete_hold",
      lane: "autocomplete_hold_lane",
      reason: "complementary_signal_not_direct_search_source",
      searchDocument: null,
      canFeedInternalSearchIndex: false,
      canFeedAutocomplete: false,
      canFeedEventFeatures: false,
      canFeedPublicSearch: false,
      shouldCreateSearchDocument: false,
      shouldHoldForMoreIdentity: false,
      shouldAttachAsNonSearchTraceOnly: true,
      hasRequiredIdentity,
      isValidated,
    });
  }

  return buildDecision({
    decisionState: "blocked_unvalidated_signal",
    lane: "unvalidated_block_lane",
    reason: "unvalidated_signal_not_search_source",
    searchDocument: null,
    canFeedInternalSearchIndex: false,
    canFeedAutocomplete: false,
    canFeedEventFeatures: false,
    canFeedPublicSearch: false,
    shouldCreateSearchDocument: false,
    shouldHoldForMoreIdentity: false,
    shouldAttachAsNonSearchTraceOnly: true,
    hasRequiredIdentity,
    isValidated,
  });
}

export const EVENT_CANONICAL_SEARCH_INDEX_DEFAULTS = {
  canonical_event_required_before_indexing: true,
  source_trace_should_be_preserved: true,
  canonical_record_required_before_public_search: true,
  public_search_disabled_by_default: true,
  external_request_performed: false,
  database_write_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;