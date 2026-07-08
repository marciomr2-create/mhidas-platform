// src/app/api/official-events/_shared/eventCanonicalPersistenceContract.ts

import type {
  EventCanonicalIdentitySnapshot,
  EventCanonicalSourceTrace,
} from "./eventCanonicalDeduplication";

import type { EventCanonicalSearchIndexDocument } from "./eventCanonicalSearchIndex";

export type EventCanonicalPersistenceIntent =
  | "create_new_canonical_event"
  | "update_existing_canonical_event"
  | "attach_source_trace_to_existing_canonical"
  | "sync_search_document"
  | "hold_for_more_identity"
  | "blocked";

export type EventCanonicalPersistenceDecisionState =
  | "prepare_create_canonical_event_plan"
  | "prepare_update_existing_canonical_event_plan"
  | "prepare_attach_source_trace_plan"
  | "prepare_search_document_sync_plan"
  | "hold_missing_required_identity"
  | "blocked_unvalidated_canonical_event"
  | "blocked_by_conflict_or_status"
  | "blocked_real_write_not_enabled";

export type EventCanonicalPersistenceLane =
  | "canonical_create_plan_lane"
  | "canonical_update_plan_lane"
  | "source_trace_attach_plan_lane"
  | "search_document_sync_plan_lane"
  | "identity_hold_lane"
  | "validation_block_lane"
  | "conflict_block_lane"
  | "real_write_safety_block_lane";

export type EventCanonicalPersistenceReason =
  | "validated_new_canonical_event_ready_for_planned_persistence"
  | "validated_existing_canonical_event_ready_for_planned_update"
  | "source_trace_ready_to_attach_to_existing_canonical"
  | "search_document_ready_for_planned_sync"
  | "missing_required_persistence_identity"
  | "candidate_not_validated_enough_for_canonical_persistence"
  | "conflict_or_blocked_status_must_not_persist"
  | "real_database_write_not_allowed_in_foundation";

export type EventCanonicalPersistencePlannedRecordRole =
  | "canonical_event_record"
  | "canonical_event_source_trace"
  | "canonical_search_document"
  | "event_feature_feed_reference";

export type EventCanonicalPersistenceSafetyFlag =
  | "persistence_contract_only"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required"
  | "canonical_event_requires_100_percent_validation"
  | "canonical_identity_validated_before_plan"
  | "canonical_identity_missing_required_fields"
  | "source_trace_preserved"
  | "search_document_preserved"
  | "idempotency_key_created"
  | "existing_canonical_event_targeted"
  | "new_canonical_event_candidate_targeted"
  | "conflict_or_blocked_status_detected"
  | "real_write_requested_but_blocked";

export type EventCanonicalPersistenceInput = {
  canonical_event: EventCanonicalIdentitySnapshot;
  search_document?: EventCanonicalSearchIndexDocument | null;
  persistence_intent: EventCanonicalPersistenceIntent;
  existing_canonical_event_id?: string | null;
  has_identity_conflict?: boolean | null;
  allow_database_write?: boolean | null;
  allow_real_auto_publish?: boolean | null;
};

export type EventCanonicalPersistenceSourceTracePayload = {
  source_key: string;
  source_kind: EventCanonicalSourceTrace["source_kind"];
  provider_key: string | null;
  external_event_id: string | null;
  source_url: string | null;
  authority_score: number;
};

export type EventCanonicalPersistenceCanonicalPayload = {
  canonical_event_id: string;
  event_name: string;
  starts_at: string;
  event_date_key: string;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  external_event_id: string | null;
  provider_key: string | null;
  is_100_percent_validated: true;
};

export type EventCanonicalPersistenceSearchDocumentPayload = {
  canonical_event_id: string;
  search_title: string;
  normalized_title: string;
  event_date_key: string;
  canonical_slug_seed: string;
  search_tokens: string[];
  search_rank_score: number;
};

export type EventCanonicalPersistencePlan = {
  plan_key: string;
  idempotency_key: string;
  persistence_intent: EventCanonicalPersistenceIntent;
  planned_record_roles: EventCanonicalPersistencePlannedRecordRole[];
  canonical_payload: EventCanonicalPersistenceCanonicalPayload | null;
  source_trace_payloads: EventCanonicalPersistenceSourceTracePayload[];
  search_document_payload: EventCanonicalPersistenceSearchDocumentPayload | null;
  can_feed_event_features_after_real_persistence: boolean;
  can_feed_internal_search_after_real_persistence: boolean;
  can_feed_autocomplete_after_real_persistence: boolean;
};

export type EventCanonicalPersistenceDecision = {
  decision_state: EventCanonicalPersistenceDecisionState;
  persistence_lane: EventCanonicalPersistenceLane;
  reason: EventCanonicalPersistenceReason;
  persistence_plan: EventCanonicalPersistencePlan | null;
  should_prepare_persistence_plan: boolean;
  should_hold_for_more_identity: boolean;
  should_block_persistence: boolean;
  can_create_canonical_event_after_real_write_enablement: boolean;
  can_update_existing_canonical_event_after_real_write_enablement: boolean;
  can_attach_source_trace_after_real_write_enablement: boolean;
  can_sync_search_document_after_real_write_enablement: boolean;
  source_trace_should_be_preserved: true;
  search_document_should_be_preserved: true;
  safety_flags: EventCanonicalPersistenceSafetyFlag[];
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

function compactUnique(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
}

function buildStableKey(parts: Array<string | null | undefined>): string {
  const key = parts
    .map((part) => normalizeText(part))
    .filter((part) => part.length > 0)
    .join("-");

  return key || "canonical-event-persistence-plan";
}

function hasRequiredPersistenceIdentity(
  event: EventCanonicalIdentitySnapshot
): boolean {
  const hasName = normalizeText(event.event_name).length > 0;
  const hasDate = extractDateKey(event.starts_at).length > 0;
  const hasLocation =
    normalizeText(event.venue_name).length > 0 ||
    normalizeText(event.city).length > 0;
  const hasCanonicalReference =
    normalizeText(event.internal_canonical_event_id).length > 0 ||
    normalizeText(event.external_event_id).length > 0 ||
    normalizeText(event.official_url).length > 0 ||
    normalizeText(event.ticket_url).length > 0;

  return hasName && hasDate && hasLocation && hasCanonicalReference;
}

function resolveCanonicalEventId(
  input: EventCanonicalPersistenceInput
): string {
  return (
    input.existing_canonical_event_id ??
    input.canonical_event.internal_canonical_event_id ??
    input.canonical_event.external_event_id ??
    buildStableKey([
      input.canonical_event.event_name,
      extractDateKey(input.canonical_event.starts_at),
      input.canonical_event.city,
      input.canonical_event.state,
    ])
  );
}

function buildIdempotencyKey(input: EventCanonicalPersistenceInput): string {
  return buildStableKey([
    input.persistence_intent,
    resolveCanonicalEventId(input),
    input.canonical_event.event_name,
    extractDateKey(input.canonical_event.starts_at),
    input.canonical_event.city,
    input.canonical_event.state,
    input.canonical_event.external_event_id,
    input.canonical_event.provider_key,
  ]);
}

function buildCanonicalPayload(
  input: EventCanonicalPersistenceInput
): EventCanonicalPersistenceCanonicalPayload {
  return {
    canonical_event_id: resolveCanonicalEventId(input),
    event_name: input.canonical_event.event_name ?? "",
    starts_at: input.canonical_event.starts_at ?? "",
    event_date_key: extractDateKey(input.canonical_event.starts_at),
    venue_name: input.canonical_event.venue_name ?? null,
    city: input.canonical_event.city ?? null,
    state: input.canonical_event.state ?? null,
    country: input.canonical_event.country ?? null,
    official_url: input.canonical_event.official_url ?? null,
    ticket_url: input.canonical_event.ticket_url ?? null,
    external_event_id: input.canonical_event.external_event_id ?? null,
    provider_key: input.canonical_event.provider_key ?? null,
    is_100_percent_validated: true,
  };
}

function buildSourceTracePayloads(
  sourceTrace: EventCanonicalSourceTrace[] | null | undefined
): EventCanonicalPersistenceSourceTracePayload[] {
  return (sourceTrace ?? []).map((source) => ({
    source_key: source.source_key,
    source_kind: source.source_kind,
    provider_key: source.provider_key ?? null,
    external_event_id: source.external_event_id ?? null,
    source_url: source.source_url ?? null,
    authority_score:
      typeof source.authority_score === "number" &&
      Number.isFinite(source.authority_score)
        ? source.authority_score
        : 0,
  }));
}

function buildSearchDocumentPayload(
  searchDocument: EventCanonicalSearchIndexDocument | null | undefined
): EventCanonicalPersistenceSearchDocumentPayload | null {
  if (!searchDocument) {
    return null;
  }

  return {
    canonical_event_id: searchDocument.canonical_event_id,
    search_title: searchDocument.search_title,
    normalized_title: searchDocument.normalized_title,
    event_date_key: searchDocument.event_date_key,
    canonical_slug_seed: searchDocument.canonical_slug_seed,
    search_tokens: compactUnique(searchDocument.search_tokens),
    search_rank_score: searchDocument.search_rank_score,
  };
}

function buildPersistencePlan(args: {
  input: EventCanonicalPersistenceInput;
  plannedRecordRoles: EventCanonicalPersistencePlannedRecordRole[];
  includeCanonicalPayload: boolean;
  includeSourceTracePayloads: boolean;
  includeSearchDocumentPayload: boolean;
}): EventCanonicalPersistencePlan {
  const searchDocumentPayload = args.includeSearchDocumentPayload
    ? buildSearchDocumentPayload(args.input.search_document)
    : null;

  return {
    plan_key: buildStableKey([
      "plan",
      args.input.persistence_intent,
      resolveCanonicalEventId(args.input),
    ]),
    idempotency_key: buildIdempotencyKey(args.input),
    persistence_intent: args.input.persistence_intent,
    planned_record_roles: args.plannedRecordRoles,
    canonical_payload: args.includeCanonicalPayload
      ? buildCanonicalPayload(args.input)
      : null,
    source_trace_payloads: args.includeSourceTracePayloads
      ? buildSourceTracePayloads(args.input.canonical_event.source_trace)
      : [],
    search_document_payload: searchDocumentPayload,
    can_feed_event_features_after_real_persistence: Boolean(
      searchDocumentPayload
    ),
    can_feed_internal_search_after_real_persistence: Boolean(
      searchDocumentPayload
    ),
    can_feed_autocomplete_after_real_persistence: Boolean(searchDocumentPayload),
  };
}

function buildSafetyFlags(args: {
  hasRequiredIdentity: boolean;
  isValidated: boolean;
  input: EventCanonicalPersistenceInput;
  plan: EventCanonicalPersistencePlan | null;
  conflictOrBlocked: boolean;
  realWriteRequestedButBlocked: boolean;
}): EventCanonicalPersistenceSafetyFlag[] {
  const flags: EventCanonicalPersistenceSafetyFlag[] = [
    "persistence_contract_only",
    "database_write_not_performed",
    "external_request_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
    "canonical_event_requires_100_percent_validation",
    "source_trace_preserved",
    "search_document_preserved",
  ];

  if (args.hasRequiredIdentity) {
    flags.push("canonical_identity_validated_before_plan");
  } else {
    flags.push("canonical_identity_missing_required_fields");
  }

  if (args.plan) {
    flags.push("idempotency_key_created");
  }

  if (args.input.existing_canonical_event_id) {
    flags.push("existing_canonical_event_targeted");
  }

  if (
    args.input.persistence_intent === "create_new_canonical_event" &&
    args.isValidated
  ) {
    flags.push("new_canonical_event_candidate_targeted");
  }

  if (args.conflictOrBlocked) {
    flags.push("conflict_or_blocked_status_detected");
  }

  if (args.realWriteRequestedButBlocked) {
    flags.push("real_write_requested_but_blocked");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventCanonicalPersistenceDecisionState;
  lane: EventCanonicalPersistenceLane;
  reason: EventCanonicalPersistenceReason;
  input: EventCanonicalPersistenceInput;
  plan: EventCanonicalPersistencePlan | null;
  shouldPreparePersistencePlan: boolean;
  shouldHoldForMoreIdentity: boolean;
  shouldBlockPersistence: boolean;
  canCreateCanonicalEvent: boolean;
  canUpdateExistingCanonicalEvent: boolean;
  canAttachSourceTrace: boolean;
  canSyncSearchDocument: boolean;
  hasRequiredIdentity: boolean;
  isValidated: boolean;
  conflictOrBlocked: boolean;
  realWriteRequestedButBlocked: boolean;
}): EventCanonicalPersistenceDecision {
  return {
    decision_state: args.decisionState,
    persistence_lane: args.lane,
    reason: args.reason,
    persistence_plan: args.plan,
    should_prepare_persistence_plan: args.shouldPreparePersistencePlan,
    should_hold_for_more_identity: args.shouldHoldForMoreIdentity,
    should_block_persistence: args.shouldBlockPersistence,
    can_create_canonical_event_after_real_write_enablement:
      args.canCreateCanonicalEvent,
    can_update_existing_canonical_event_after_real_write_enablement:
      args.canUpdateExistingCanonicalEvent,
    can_attach_source_trace_after_real_write_enablement:
      args.canAttachSourceTrace,
    can_sync_search_document_after_real_write_enablement:
      args.canSyncSearchDocument,
    source_trace_should_be_preserved: true,
    search_document_should_be_preserved: true,
    safety_flags: buildSafetyFlags({
      hasRequiredIdentity: args.hasRequiredIdentity,
      isValidated: args.isValidated,
      input: args.input,
      plan: args.plan,
      conflictOrBlocked: args.conflictOrBlocked,
      realWriteRequestedButBlocked: args.realWriteRequestedButBlocked,
    }),
    external_request_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalPersistenceDecision(
  input: EventCanonicalPersistenceInput
): EventCanonicalPersistenceDecision {
  const hasRequiredIdentity = hasRequiredPersistenceIdentity(
    input.canonical_event
  );
  const isValidated = input.canonical_event.is_100_percent_validated === true;
  const conflictOrBlocked =
    input.has_identity_conflict === true ||
    input.persistence_intent === "blocked";
  const realWriteRequestedButBlocked = input.allow_database_write === true;

  if (realWriteRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_real_write_not_enabled",
      lane: "real_write_safety_block_lane",
      reason: "real_database_write_not_allowed_in_foundation",
      input,
      plan: null,
      shouldPreparePersistencePlan: false,
      shouldHoldForMoreIdentity: false,
      shouldBlockPersistence: true,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: false,
      canAttachSourceTrace: false,
      canSyncSearchDocument: false,
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  if (!hasRequiredIdentity) {
    return buildDecision({
      decisionState: "hold_missing_required_identity",
      lane: "identity_hold_lane",
      reason: "missing_required_persistence_identity",
      input,
      plan: null,
      shouldPreparePersistencePlan: false,
      shouldHoldForMoreIdentity: true,
      shouldBlockPersistence: false,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: false,
      canAttachSourceTrace: false,
      canSyncSearchDocument: false,
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  if (conflictOrBlocked) {
    return buildDecision({
      decisionState: "blocked_by_conflict_or_status",
      lane: "conflict_block_lane",
      reason: "conflict_or_blocked_status_must_not_persist",
      input,
      plan: null,
      shouldPreparePersistencePlan: false,
      shouldHoldForMoreIdentity: false,
      shouldBlockPersistence: true,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: false,
      canAttachSourceTrace: false,
      canSyncSearchDocument: false,
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  if (
    input.persistence_intent === "attach_source_trace_to_existing_canonical" &&
    input.existing_canonical_event_id
  ) {
    const plan = buildPersistencePlan({
      input,
      plannedRecordRoles: ["canonical_event_source_trace"],
      includeCanonicalPayload: false,
      includeSourceTracePayloads: true,
      includeSearchDocumentPayload: false,
    });

    return buildDecision({
      decisionState: "prepare_attach_source_trace_plan",
      lane: "source_trace_attach_plan_lane",
      reason: "source_trace_ready_to_attach_to_existing_canonical",
      input,
      plan,
      shouldPreparePersistencePlan: true,
      shouldHoldForMoreIdentity: false,
      shouldBlockPersistence: false,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: false,
      canAttachSourceTrace: true,
      canSyncSearchDocument: false,
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  if (!isValidated) {
    return buildDecision({
      decisionState: "blocked_unvalidated_canonical_event",
      lane: "validation_block_lane",
      reason: "candidate_not_validated_enough_for_canonical_persistence",
      input,
      plan: null,
      shouldPreparePersistencePlan: false,
      shouldHoldForMoreIdentity: false,
      shouldBlockPersistence: true,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: false,
      canAttachSourceTrace: false,
      canSyncSearchDocument: false,
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  if (
    input.persistence_intent === "sync_search_document" &&
    input.search_document
  ) {
    const plan = buildPersistencePlan({
      input,
      plannedRecordRoles: ["canonical_search_document"],
      includeCanonicalPayload: false,
      includeSourceTracePayloads: false,
      includeSearchDocumentPayload: true,
    });

    return buildDecision({
      decisionState: "prepare_search_document_sync_plan",
      lane: "search_document_sync_plan_lane",
      reason: "search_document_ready_for_planned_sync",
      input,
      plan,
      shouldPreparePersistencePlan: true,
      shouldHoldForMoreIdentity: false,
      shouldBlockPersistence: false,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: false,
      canAttachSourceTrace: false,
      canSyncSearchDocument: true,
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  if (
    input.persistence_intent === "update_existing_canonical_event" &&
    input.existing_canonical_event_id
  ) {
    const plan = buildPersistencePlan({
      input,
      plannedRecordRoles: [
        "canonical_event_record",
        "canonical_event_source_trace",
        "canonical_search_document",
        "event_feature_feed_reference",
      ],
      includeCanonicalPayload: true,
      includeSourceTracePayloads: true,
      includeSearchDocumentPayload: Boolean(input.search_document),
    });

    return buildDecision({
      decisionState: "prepare_update_existing_canonical_event_plan",
      lane: "canonical_update_plan_lane",
      reason: "validated_existing_canonical_event_ready_for_planned_update",
      input,
      plan,
      shouldPreparePersistencePlan: true,
      shouldHoldForMoreIdentity: false,
      shouldBlockPersistence: false,
      canCreateCanonicalEvent: false,
      canUpdateExistingCanonicalEvent: true,
      canAttachSourceTrace: true,
      canSyncSearchDocument: Boolean(input.search_document),
      hasRequiredIdentity,
      isValidated,
      conflictOrBlocked,
      realWriteRequestedButBlocked,
    });
  }

  const createPlan = buildPersistencePlan({
    input,
    plannedRecordRoles: [
      "canonical_event_record",
      "canonical_event_source_trace",
      "canonical_search_document",
      "event_feature_feed_reference",
    ],
    includeCanonicalPayload: true,
    includeSourceTracePayloads: true,
    includeSearchDocumentPayload: Boolean(input.search_document),
  });

  return buildDecision({
    decisionState: "prepare_create_canonical_event_plan",
    lane: "canonical_create_plan_lane",
    reason: "validated_new_canonical_event_ready_for_planned_persistence",
    input,
    plan: createPlan,
    shouldPreparePersistencePlan: true,
    shouldHoldForMoreIdentity: false,
    shouldBlockPersistence: false,
    canCreateCanonicalEvent: true,
    canUpdateExistingCanonicalEvent: false,
    canAttachSourceTrace: true,
    canSyncSearchDocument: Boolean(input.search_document),
    hasRequiredIdentity,
    isValidated,
    conflictOrBlocked,
    realWriteRequestedButBlocked,
  });
}

export const EVENT_CANONICAL_PERSISTENCE_CONTRACT_DEFAULTS = {
  persistence_contract_only: true,
  external_request_performed: false,
  database_write_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;