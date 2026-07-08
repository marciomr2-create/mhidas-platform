// src/app/api/official-events/_shared/eventCanonicalAdminWriteService.ts

import type {
  EventCanonicalAdminConfirmationFeatureKey,
  EventCanonicalAdminConfirmationGuardDecision,
  EventCanonicalAdminConfirmationSourceEvidence,
  EventCanonicalAdminExistingMatch,
  EventCanonicalAdminFeatureGateProposal,
  EventCanonicalAdminSearchDocumentProposal,
} from "./eventCanonicalAdminConfirmationGuard";

import { resolveEventCanonicalAdminConfirmationGuardDecision } from "./eventCanonicalAdminConfirmationGuard";

export type EventCanonicalAdminWriteServiceClient = {
  from: (table: string) => any;
};

type SupabaseWriteResponse<TData = unknown> = {
  data?: TData | null;
  error?: {
    message?: string | null;
  } | null;
};

export type EventCanonicalAdminWriteServiceValidationMethod =
  | "manual_admin"
  | "ticketing_api"
  | "official_event_site"
  | "official_ticketing_public_page"
  | "official_venue_site"
  | "official_producer_site"
  | "official_artist_source"
  | "multi_source_review";

export type EventCanonicalAdminWriteServiceEventInput = {
  slug?: string | null;
  event_name: string;
  normalized_event_name?: string | null;
  starts_at: string;
  ends_at?: string | null;
  event_date_key?: string | null;
  venue_name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  official_url?: string | null;
  ticket_url?: string | null;
  primary_provider_key?: string | null;
  primary_external_event_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type EventCanonicalAdminWriteServiceRequest = {
  dryRun?: boolean | null;
  adminUserId?: string | null;
  event: EventCanonicalAdminWriteServiceEventInput;
  sourceEvidence: EventCanonicalAdminConfirmationSourceEvidence[];
  existingCanonicalMatches?: EventCanonicalAdminExistingMatch[] | null;
  searchDocumentProposal?: EventCanonicalAdminSearchDocumentProposal | null;
  featureGateProposals?: EventCanonicalAdminFeatureGateProposal[] | null;
  canonicalIdentityIsUnique?: boolean | null;
  rejectCandidate?: boolean | null;
};

export type EventCanonicalAdminWriteServicePlan = {
  guardDecision: EventCanonicalAdminConfirmationGuardDecision;
  canonicalEventPayload: Record<string, unknown>;
  sourcePayloads: Record<string, unknown>[];
  searchDocumentPayload: Record<string, unknown>;
  featureFeedPayloads: Record<string, unknown>[];
  canonicalEventIdForWrite: string | null;
  dryRun: boolean;
  canWrite: boolean;
};

export type EventCanonicalAdminWriteServiceResult = {
  ok: boolean;
  mode: "dry_run" | "write";
  wroteChanges: boolean;
  canonicalEventId: string | null;
  recommendedAction: EventCanonicalAdminConfirmationGuardDecision["recommended_action"];
  confirmationState: EventCanonicalAdminConfirmationGuardDecision["confirmation_state"];
  blockingReasons: EventCanonicalAdminConfirmationGuardDecision["blocking_reasons"];
  guardDecision: EventCanonicalAdminConfirmationGuardDecision;
  plan: EventCanonicalAdminWriteServicePlan;
  database_write_performed: boolean;
  supabase_operation_performed: boolean;
  route_created: false;
  runtime_route_changed: false;
  visual_change_performed: false;
  error: string | null;
};

export const EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION =
  "v4.8.55-event-canonical-admin-write-service" as const;

export const EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES = {
  canonicalEvents: "canonical_events",
  canonicalEventSources: "canonical_event_sources",
  canonicalEventSearchDocuments: "canonical_event_search_documents",
  canonicalEventFeatureFeeds: "canonical_event_feature_feeds",
} as const;

const REQUIRED_FEATURE_KEYS: EventCanonicalAdminConfirmationFeatureKey[] = [
  "ticket_intent",
  "check_in",
  "rides",
  "meetups",
  "connections",
  "social_radar",
  "search_autocomplete",
];

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeCountry(value: unknown): string {
  const text = normalizeText(value).toUpperCase();
  return text || "BR";
}

function normalizeForSearch(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeSlug(value: unknown): string {
  return normalizeForSearch(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clampScore(value: unknown, fallback: number): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function deriveEventDateKey(input: EventCanonicalAdminWriteServiceEventInput): string {
  const explicitDateKey = normalizeText(input.event_date_key);

  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitDateKey)) {
    return explicitDateKey;
  }

  const date = new Date(input.starts_at);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return explicitDateKey;
}

function buildCanonicalSlug(
  input: EventCanonicalAdminWriteServiceEventInput,
  eventDateKey: string
): string {
  const explicitSlug = normalizeSlug(input.slug);

  if (explicitSlug) {
    return explicitSlug;
  }

  return normalizeSlug(
    [
      input.event_name,
      eventDateKey,
      input.city,
      input.state,
      input.venue_name,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildNormalizedEventName(input: EventCanonicalAdminWriteServiceEventInput): string {
  return normalizeText(input.normalized_event_name) || normalizeForSearch(input.event_name);
}

function getPrimaryEvidence(
  evidence: EventCanonicalAdminConfirmationSourceEvidence[]
): EventCanonicalAdminConfirmationSourceEvidence | null {
  return [...evidence].sort((a, b) => b.authority_score - a.authority_score)[0] ?? null;
}

function mapValidationMethod(
  evidence: EventCanonicalAdminConfirmationSourceEvidence[]
): EventCanonicalAdminWriteServiceValidationMethod {
  const primaryEvidence = getPrimaryEvidence(evidence);

  if (!primaryEvidence) return "manual_admin";
  if (primaryEvidence.source_kind === "ticketing_api") return "ticketing_api";
  if (primaryEvidence.source_kind === "ticketing_public_page") {
    return "official_ticketing_public_page";
  }
  if (primaryEvidence.source_kind === "official_event_site") return "official_event_site";
  if (primaryEvidence.source_kind === "official_venue_site") return "official_venue_site";
  if (primaryEvidence.source_kind === "official_producer_site") return "official_producer_site";
  if (primaryEvidence.source_kind === "official_artist_source") return "official_artist_source";
  if (evidence.length >= 2) return "multi_source_review";

  return "manual_admin";
}

function buildSearchTokens(params: {
  event: EventCanonicalAdminWriteServiceEventInput;
  eventDateKey: string;
  canonicalSlug: string;
  proposal: EventCanonicalAdminSearchDocumentProposal | null;
  evidence: EventCanonicalAdminConfirmationSourceEvidence[];
}): string[] {
  const tokenSourceValues = [
    params.event.event_name,
    params.event.normalized_event_name,
    params.event.venue_name,
    params.event.city,
    params.event.state,
    params.event.country,
    params.eventDateKey,
    params.canonicalSlug,
    params.proposal?.search_title,
    params.proposal?.normalized_title,
    ...(params.proposal?.artist_names ?? []),
    ...(params.proposal?.genre_slugs ?? []),
    ...(params.proposal?.search_tokens ?? []),
    ...params.evidence.map((source) => source.provider_key),
    ...params.evidence.map((source) => source.external_event_id),
  ];

  const tokens = new Set<string>();

  for (const value of tokenSourceValues) {
    const normalized = normalizeForSearch(value);
    if (!normalized) continue;

    for (const token of normalized.split(" ")) {
      if (token.length >= 2) {
        tokens.add(token);
      }
    }
  }

  return Array.from(tokens).slice(0, 120);
}

function buildAvailabilityScope(params: {
  event: EventCanonicalAdminWriteServiceEventInput;
  proposal: EventCanonicalAdminSearchDocumentProposal | null;
}): string[] {
  const scope = new Set<string>(["event", "catalog", "canonical"]);

  if (normalizeText(params.event.city || params.proposal?.city)) scope.add("city");
  if (normalizeText(params.event.state || params.proposal?.state)) scope.add("state");
  if (normalizeText(params.event.venue_name || params.proposal?.venue_name)) scope.add("venue");
  if ((params.proposal?.artist_names ?? []).length > 0) scope.add("artist");
  if ((params.proposal?.genre_slugs ?? []).length > 0) scope.add("genre");

  return Array.from(scope);
}

export function buildEventCanonicalAdminSearchDocumentProposal(
  request: EventCanonicalAdminWriteServiceRequest
): EventCanonicalAdminSearchDocumentProposal {
  const eventDateKey = deriveEventDateKey(request.event);
  const canonicalSlug = buildCanonicalSlug(request.event, eventDateKey);
  const normalizedTitle = normalizeForSearch(
    [
      request.event.event_name,
      request.event.venue_name,
      request.event.city,
      request.event.state,
      eventDateKey,
    ]
      .filter(Boolean)
      .join(" ")
  );

  const proposal: EventCanonicalAdminSearchDocumentProposal = {
    search_title: [
      request.event.event_name,
      request.event.venue_name,
      request.event.city,
      request.event.state,
      eventDateKey,
    ]
      .filter(Boolean)
      .join(" - "),
    normalized_title: normalizedTitle,
    event_date_key: eventDateKey,
    canonical_slug: canonicalSlug,
    venue_name: normalizeNullableText(request.event.venue_name),
    city: normalizeNullableText(request.event.city),
    state: normalizeNullableText(request.event.state),
    artist_names: [],
    genre_slugs: [],
    search_tokens: [],
  };

  return {
    ...proposal,
    search_tokens: buildSearchTokens({
      event: request.event,
      eventDateKey,
      canonicalSlug,
      proposal,
      evidence: request.sourceEvidence,
    }),
  };
}

export function buildEventCanonicalAdminFeatureGateProposals(
  proposals: EventCanonicalAdminFeatureGateProposal[] | null | undefined
): EventCanonicalAdminFeatureGateProposal[] {
  const proposalByFeature = new Map<EventCanonicalAdminConfirmationFeatureKey, boolean>();

  for (const proposal of proposals ?? []) {
    proposalByFeature.set(proposal.feature_key, proposal.enabled);
  }

  return REQUIRED_FEATURE_KEYS.map((featureKey) => ({
    feature_key: featureKey,
    enabled: proposalByFeature.get(featureKey) ?? featureKey === "search_autocomplete",
  }));
}

function buildCanonicalEventPayload(params: {
  request: EventCanonicalAdminWriteServiceRequest;
  eventDateKey: string;
  canonicalSlug: string;
  confidenceScore: number;
  validationMethod: EventCanonicalAdminWriteServiceValidationMethod;
  guardDecision: EventCanonicalAdminConfirmationGuardDecision;
}): Record<string, unknown> {
  const now = new Date().toISOString();
  const primaryEvidence = getPrimaryEvidence(params.request.sourceEvidence);

  return {
    slug: params.canonicalSlug,
    event_name: normalizeText(params.request.event.event_name),
    normalized_event_name: buildNormalizedEventName(params.request.event),
    starts_at: normalizeText(params.request.event.starts_at),
    ends_at: normalizeNullableText(params.request.event.ends_at),
    event_date_key: params.eventDateKey,
    venue_name: normalizeNullableText(params.request.event.venue_name),
    city: normalizeNullableText(params.request.event.city),
    state: normalizeNullableText(params.request.event.state),
    country: normalizeCountry(params.request.event.country),
    official_url: normalizeNullableText(params.request.event.official_url),
    ticket_url: normalizeNullableText(params.request.event.ticket_url),
    primary_provider_key:
      normalizeNullableText(params.request.event.primary_provider_key) ??
      normalizeNullableText(primaryEvidence?.provider_key),
    primary_external_event_id:
      normalizeNullableText(params.request.event.primary_external_event_id) ??
      normalizeNullableText(primaryEvidence?.external_event_id),
    validation_status: "validated",
    validation_method: params.validationMethod,
    is_100_percent_validated: true,
    source_confidence_score: params.confidenceScore,
    validation_summary: {
      service_version: EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
      guard_state: params.guardDecision.confirmation_state,
      guard_action: params.guardDecision.recommended_action,
      source_evidence_count: params.guardDecision.source_evidence_count,
      strong_evidence_count: params.guardDecision.strong_evidence_count,
      duplicate_risk_score: params.guardDecision.duplicate_risk_score,
      blocking_reasons: params.guardDecision.blocking_reasons,
      admin_allowed_to_choose_between_ambiguous_options:
        params.guardDecision.admin_allowed_to_choose_between_ambiguous_options,
      free_text_event_interaction_allowed:
        params.guardDecision.free_text_event_interaction_allowed,
      canonical_event_id_required_for_social_features:
        params.guardDecision.canonical_event_id_required_for_social_features,
    },
    feature_policy: {
      requires_single_canonical_event_id: true,
      admin_allowed_to_choose_between_ambiguous_options: false,
      free_text_event_interaction_allowed: false,
      canonical_event_id_required_for_social_features: true,
      admin_manual_ambiguous_choice_allowed: false,
      social_features_require_canonical_event_id: true,
    },
    metadata: {
      ...(params.request.event.metadata ?? {}),
      write_service_version: EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
      generated_at: now,
    },
    updated_by: normalizeNullableText(params.request.adminUserId),
    updated_at: now,
  };
}

function buildSourcePayloads(params: {
  request: EventCanonicalAdminWriteServiceRequest;
  canonicalEventId: string | null;
}): Record<string, unknown>[] {
  return params.request.sourceEvidence.map((source) => {
    const isTicketingApi = source.source_kind === "ticketing_api";
    const isManualAdmin = source.source_kind === "manual_admin_review";

    return {
      canonical_event_id: params.canonicalEventId,
      source_key: normalizeText(source.source_key),
      source_kind: source.source_kind,
      provider_key: normalizeNullableText(source.provider_key),
      external_event_id: normalizeNullableText(source.external_event_id),
      source_url: normalizeNullableText(source.source_url),
      authority_score: clampScore(source.authority_score, 0),
      ingestion_mode: isManualAdmin
        ? "manual_admin"
        : isTicketingApi
          ? "future_api_authorized"
          : "public_reference",
      integration_status: isTicketingApi ? "prepared" : "not_integrated",
      source_payload_summary: {
        service_version: EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
        is_official_source: source.is_official_source,
        supports_event_identity: source.supports_event_identity,
      },
      last_seen_at: new Date().toISOString(),
      created_by: normalizeNullableText(params.request.adminUserId),
    };
  });
}

function buildSearchDocumentPayload(params: {
  request: EventCanonicalAdminWriteServiceRequest;
  canonicalEventId: string | null;
  proposal: EventCanonicalAdminSearchDocumentProposal;
  eventDateKey: string;
  canonicalSlug: string;
}): Record<string, unknown> {
  const tokens = buildSearchTokens({
    event: params.request.event,
    eventDateKey: params.eventDateKey,
    canonicalSlug: params.canonicalSlug,
    proposal: params.proposal,
    evidence: params.request.sourceEvidence,
  });

  return {
    canonical_event_id: params.canonicalEventId,
    search_title: normalizeText(params.proposal.search_title),
    normalized_title: normalizeText(params.proposal.normalized_title),
    event_date_key: params.eventDateKey,
    canonical_slug: params.canonicalSlug,
    venue_name:
      normalizeNullableText(params.proposal.venue_name) ??
      normalizeNullableText(params.request.event.venue_name),
    city:
      normalizeNullableText(params.proposal.city) ??
      normalizeNullableText(params.request.event.city),
    state:
      normalizeNullableText(params.proposal.state) ??
      normalizeNullableText(params.request.event.state),
    country: normalizeCountry(params.request.event.country),
    search_tokens: tokens,
    availability_scope: buildAvailabilityScope({
      event: params.request.event,
      proposal: params.proposal,
    }),
    search_rank_score: Math.max(0, tokens.length),
    source_trace_summary: {
      service_version: EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
      source_evidence_count: params.request.sourceEvidence.length,
      artist_names: params.proposal.artist_names,
      genre_slugs: params.proposal.genre_slugs,
    },
    is_publicly_searchable: true,
    updated_at: new Date().toISOString(),
  };
}

function buildFeatureFeedPayloads(params: {
  request: EventCanonicalAdminWriteServiceRequest;
  canonicalEventId: string | null;
  proposals: EventCanonicalAdminFeatureGateProposal[];
}): Record<string, unknown>[] {
  const now = new Date().toISOString();

  return params.proposals.map((proposal) => ({
    canonical_event_id: params.canonicalEventId,
    feature_key: proposal.feature_key,
    enabled: proposal.enabled,
    feed_policy: {
      service_version: EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
      requires_canonical_event_id: true,
      free_text_event_interaction_allowed: false,
    },
    starts_at: null,
    ends_at: null,
    created_by: normalizeNullableText(params.request.adminUserId),
    updated_by: normalizeNullableText(params.request.adminUserId),
    updated_at: now,
  }));
}

export function buildEventCanonicalAdminWriteServicePlan(
  request: EventCanonicalAdminWriteServiceRequest
): EventCanonicalAdminWriteServicePlan {
  const dryRun = request.dryRun !== false;
  const searchDocumentProposal =
    request.searchDocumentProposal ??
    buildEventCanonicalAdminSearchDocumentProposal(request);
  const featureGateProposals = buildEventCanonicalAdminFeatureGateProposals(
    request.featureGateProposals
  );
  const eventDateKey = deriveEventDateKey(request.event);
  const canonicalSlug = buildCanonicalSlug(request.event, eventDateKey);
  const existingMatches = request.existingCanonicalMatches ?? [];
  const canonicalIdentityIsUnique =
    request.canonicalIdentityIsUnique ??
    existingMatches.filter((match) => match.identity_match_score >= 70).length <= 1;

  const guardDecision = resolveEventCanonicalAdminConfirmationGuardDecision({
    canonical_schema_ready: true,
    candidate_has_required_identity: Boolean(
      normalizeText(request.event.event_name) &&
        normalizeText(request.event.starts_at) &&
        eventDateKey
    ),
    canonical_identity_is_unique: canonicalIdentityIsUnique,
    source_evidence: request.sourceEvidence,
    existing_canonical_matches: existingMatches,
    search_document_proposal: searchDocumentProposal,
    feature_gate_proposals: featureGateProposals,
    free_text_event_interaction_requested: false,
    admin_manual_choice_between_ambiguous_options_requested: false,
    social_feature_requested_before_canonical_event_id: false,
    ticketing_api_required_for_confirmation_now: false,
    reject_candidate: request.rejectCandidate,
  });

  const validationMethod = mapValidationMethod(request.sourceEvidence);
  const confidenceScore = Math.max(80, guardDecision.confidence_score);
  const canonicalEventPayload = buildCanonicalEventPayload({
    request,
    eventDateKey,
    canonicalSlug,
    confidenceScore,
    validationMethod,
    guardDecision,
  });
  const canonicalEventIdForWrite = guardDecision.target_canonical_event_id;

  return {
    guardDecision,
    canonicalEventPayload,
    sourcePayloads: buildSourcePayloads({
      request,
      canonicalEventId: canonicalEventIdForWrite,
    }),
    searchDocumentPayload: buildSearchDocumentPayload({
      request,
      canonicalEventId: canonicalEventIdForWrite,
      proposal: searchDocumentProposal,
      eventDateKey,
      canonicalSlug,
    }),
    featureFeedPayloads: buildFeatureFeedPayloads({
      request,
      canonicalEventId: canonicalEventIdForWrite,
      proposals: featureGateProposals,
    }),
    canonicalEventIdForWrite,
    dryRun,
    canWrite: guardDecision.admin_can_confirm && !dryRun,
  };
}

export function resolveEventCanonicalAdminWriteDryRunResult(
  request: EventCanonicalAdminWriteServiceRequest
): EventCanonicalAdminWriteServiceResult {
  const plan = buildEventCanonicalAdminWriteServicePlan({
    ...request,
    dryRun: true,
  });

  return {
    ok: plan.guardDecision.admin_can_confirm,
    mode: "dry_run",
    wroteChanges: false,
    canonicalEventId: plan.canonicalEventIdForWrite,
    recommendedAction: plan.guardDecision.recommended_action,
    confirmationState: plan.guardDecision.confirmation_state,
    blockingReasons: plan.guardDecision.blocking_reasons,
    guardDecision: plan.guardDecision,
    plan,
    database_write_performed: false,
    supabase_operation_performed: false,
    route_created: false,
    runtime_route_changed: false,
    visual_change_performed: false,
    error: null,
  };
}

function buildDryRunOrBlockedResult(
  plan: EventCanonicalAdminWriteServicePlan
): EventCanonicalAdminWriteServiceResult {
  return {
    ok: plan.guardDecision.admin_can_confirm,
    mode: "dry_run",
    wroteChanges: false,
    canonicalEventId: plan.canonicalEventIdForWrite,
    recommendedAction: plan.guardDecision.recommended_action,
    confirmationState: plan.guardDecision.confirmation_state,
    blockingReasons: plan.guardDecision.blocking_reasons,
    guardDecision: plan.guardDecision,
    plan,
    database_write_performed: false,
    supabase_operation_performed: false,
    route_created: false,
    runtime_route_changed: false,
    visual_change_performed: false,
    error: null,
  };
}

export async function writeEventCanonicalAdminConfirmation(
  client: EventCanonicalAdminWriteServiceClient,
  request: EventCanonicalAdminWriteServiceRequest
): Promise<EventCanonicalAdminWriteServiceResult> {
  const plan = buildEventCanonicalAdminWriteServicePlan(request);

  if (plan.dryRun || !plan.guardDecision.admin_can_confirm) {
    return buildDryRunOrBlockedResult(plan);
  }

  try {
    let canonicalEventId = plan.canonicalEventIdForWrite;

    if (canonicalEventId) {
      const updateResult = (await client
        .from(EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES.canonicalEvents)
        .update(plan.canonicalEventPayload)
        .eq("id", canonicalEventId)
        .select("id")
        .single()) as SupabaseWriteResponse<{ id: string }>;

      if (updateResult.error) {
        throw new Error(updateResult.error.message || "Failed to update canonical event.");
      }

      canonicalEventId = updateResult.data?.id ?? canonicalEventId;
    } else {
      const insertResult = (await client
        .from(EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES.canonicalEvents)
        .insert({
          ...plan.canonicalEventPayload,
          created_by: normalizeNullableText(request.adminUserId),
        })
        .select("id")
        .single()) as SupabaseWriteResponse<{ id: string }>;

      if (insertResult.error) {
        throw new Error(insertResult.error.message || "Failed to insert canonical event.");
      }

      canonicalEventId = insertResult.data?.id ?? null;
    }

    if (!canonicalEventId) {
      throw new Error("Canonical event id was not returned after write.");
    }

    const sourcePayloads = buildSourcePayloads({
      request,
      canonicalEventId,
    });

    const searchDocumentPayload = {
      ...plan.searchDocumentPayload,
      canonical_event_id: canonicalEventId,
    };

    const featureFeedPayloads = plan.featureFeedPayloads.map((payload) => ({
      ...payload,
      canonical_event_id: canonicalEventId,
    }));

    if (sourcePayloads.length > 0) {
      const sourceResult = (await client
        .from(EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES.canonicalEventSources)
        .upsert(sourcePayloads, {
          onConflict: "canonical_event_id,source_key",
        })
        .select("id")) as SupabaseWriteResponse<Array<{ id: string }>>;

      if (sourceResult.error) {
        throw new Error(sourceResult.error.message || "Failed to upsert canonical sources.");
      }
    }

    const searchDocumentResult = (await client
      .from(EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES.canonicalEventSearchDocuments)
      .upsert(searchDocumentPayload, {
        onConflict: "canonical_event_id",
      })
      .select("id")
      .single()) as SupabaseWriteResponse<{ id: string }>;

    if (searchDocumentResult.error) {
      throw new Error(
        searchDocumentResult.error.message || "Failed to upsert canonical search document."
      );
    }

    if (featureFeedPayloads.length > 0) {
      const featureFeedResult = (await client
        .from(EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES.canonicalEventFeatureFeeds)
        .upsert(featureFeedPayloads, {
          onConflict: "canonical_event_id,feature_key",
        })
        .select("id")) as SupabaseWriteResponse<Array<{ id: string }>>;

      if (featureFeedResult.error) {
        throw new Error(
          featureFeedResult.error.message || "Failed to upsert canonical feature feeds."
        );
      }
    }

    return {
      ok: true,
      mode: "write",
      wroteChanges: true,
      canonicalEventId,
      recommendedAction: plan.guardDecision.recommended_action,
      confirmationState: plan.guardDecision.confirmation_state,
      blockingReasons: [],
      guardDecision: plan.guardDecision,
      plan: {
        ...plan,
        canonicalEventIdForWrite: canonicalEventId,
        sourcePayloads,
        searchDocumentPayload,
        featureFeedPayloads,
      },
      database_write_performed: true,
      supabase_operation_performed: true,
      route_created: false,
      runtime_route_changed: false,
      visual_change_performed: false,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      mode: "write",
      wroteChanges: false,
      canonicalEventId: plan.canonicalEventIdForWrite,
      recommendedAction: plan.guardDecision.recommended_action,
      confirmationState: plan.guardDecision.confirmation_state,
      blockingReasons: plan.guardDecision.blocking_reasons,
      guardDecision: plan.guardDecision,
      plan,
      database_write_performed: false,
      supabase_operation_performed: false,
      route_created: false,
      runtime_route_changed: false,
      visual_change_performed: false,
      error: error instanceof Error ? error.message : "Unknown canonical write service error.",
    };
  }
}