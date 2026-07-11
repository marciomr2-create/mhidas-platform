// src/app/api/official-events/canonical/admin/first-write-preflight/route.ts
import { NextRequest, NextResponse } from "next/server";

import type {
  EventCanonicalAdminWriteServiceRequest,
} from "../../../_shared/eventCanonicalAdminWriteService";

import {
  EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES,
  EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
  resolveEventCanonicalAdminWriteDryRunResult,
} from "../../../_shared/eventCanonicalAdminWriteService";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION = "v4.8.68-event-canonical-first-write-preflight";
const ROUTE_SCOPE = "event-canonical-first-write-preflight";
const WRITE_CONFIRMATION_PHRASE = "CONFIRM_CANONICAL_EVENT_WRITE";

type JsonObject = Record<string, unknown>;

type RouteBody = JsonObject & {
  dryRun?: unknown;
  confirmWrite?: unknown;
  confirmationPhrase?: unknown;
  adminUserId?: unknown;
  event?: unknown;
  sourceEvidence?: unknown;
  existingCanonicalMatches?: unknown;
  searchDocumentProposal?: unknown;
  featureGateProposals?: unknown;
  canonicalIdentityIsUnique?: unknown;
  rejectCandidate?: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();

  if (["true", "1", "yes", "sim"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "nao", "não"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function getConfiguredSecret(): string {
  return normalizeText(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET);
}

function getRequestSecret(request: NextRequest): string {
  const headerSecret =
    request.headers.get("x-official-events-secret") ||
    request.headers.get("x-resolver-secret") ||
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "") ||
    "";

  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  return normalizeText(headerSecret || querySecret);
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = getConfiguredSecret();
  const requestSecret = getRequestSecret(request);

  if (!configuredSecret || !requestSecret) {
    return false;
  }

  return requestSecret === configuredSecret;
}

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function validateRouteBody(body: RouteBody): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!isPlainObject(body.event)) {
    reasons.push("event_object_required");
  } else {
    if (!normalizeText(body.event.event_name)) {
      reasons.push("event_name_required");
    }

    if (!normalizeText(body.event.starts_at)) {
      reasons.push("starts_at_required");
    }
  }

  if (
    !Array.isArray(body.sourceEvidence) ||
    body.sourceEvidence.length === 0
  ) {
    reasons.push("source_evidence_required");
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

function buildServiceRequest(
  body: RouteBody
): EventCanonicalAdminWriteServiceRequest {
  return {
    dryRun: true,
    adminUserId: normalizeNullableText(body.adminUserId),
    event: body.event,
    sourceEvidence: body.sourceEvidence,
    existingCanonicalMatches:
      Array.isArray(body.existingCanonicalMatches)
        ? body.existingCanonicalMatches
        : [],
    searchDocumentProposal:
      isPlainObject(body.searchDocumentProposal)
        ? body.searchDocumentProposal
        : null,
    featureGateProposals:
      Array.isArray(body.featureGateProposals)
        ? body.featureGateProposals
        : null,
    canonicalIdentityIsUnique:
      typeof body.canonicalIdentityIsUnique === "boolean"
        ? body.canonicalIdentityIsUnique
        : null,
    rejectCandidate:
      typeof body.rejectCandidate === "boolean"
        ? body.rejectCandidate
        : null,
  } as EventCanonicalAdminWriteServiceRequest;
}

function getPlanString(
  payload: Record<string, unknown>,
  key: string
): string | null {
  return normalizeNullableText(payload[key]);
}

function getEnvironmentReadiness() {
  const hasSupabaseUrl = Boolean(
    normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );

  const hasServiceRoleKey = Boolean(
    normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  const hasResolverSecret = Boolean(getConfiguredSecret());

  return {
    has_supabase_url: hasSupabaseUrl,
    has_service_role_key: hasServiceRoleKey,
    has_resolver_secret: hasResolverSecret,
    write_environment_ready:
      hasSupabaseUrl &&
      hasServiceRoleKey &&
      hasResolverSecret,
    sensitive_values_returned: false,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonResponse(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "blocked",
        message:
          "Canonical first write preflight is not authorized.",
        route_created: true,
        database_write_performed: false,
        supabase_operation_performed: false,
        visual_change_performed: false,
        sensitive_values_returned: false,
      },
      403
    );
  }

  return jsonResponse({
    ok: true,
    version: ROUTE_VERSION,
    scope: ROUTE_SCOPE,
    mode: "capabilities",
    message:
      "This route performs dry-run preflight only and cannot write canonical event data.",
    accepted_method: "POST",
    forced_dry_run: true,
    write_function_imported: false,
    write_function_called: false,
    confirmation_phrase_required_for_future_write:
      WRITE_CONFIRMATION_PHRASE,
    write_service_version:
      EVENT_CANONICAL_ADMIN_WRITE_SERVICE_VERSION,
    target_tables: Object.values(
      EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES
    ),
    readback_route:
      "/api/official-events/canonical/admin/readback-db",
    route_created: true,
    database_write_performed: false,
    supabase_operation_performed: false,
    visual_change_performed: false,
    public_event_page_changed: false,
    sensitive_values_returned: false,
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonResponse(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "blocked",
        message:
          "Canonical first write preflight is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
        sensitive_values_returned: false,
      },
      403
    );
  }

  let body: RouteBody | null = null;

  try {
    const rawBody = await request.json();

    if (isPlainObject(rawBody)) {
      body = rawBody as RouteBody;
    }
  } catch {
    body = null;
  }

  if (!body) {
    return jsonResponse(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "invalid_request",
        message: "JSON body is required.",
        validation_reasons: ["json_body_required"],
        database_write_performed: false,
        supabase_operation_performed: false,
        sensitive_values_returned: false,
      },
      400
    );
  }

  const validation = validateRouteBody(body);

  if (!validation.ok) {
    return jsonResponse(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "invalid_request",
        message:
          "Canonical first write preflight request is invalid.",
        validation_reasons: validation.reasons,
        database_write_performed: false,
        supabase_operation_performed: false,
        sensitive_values_returned: false,
      },
      400
    );
  }

  const requestedDryRun = normalizeBoolean(body.dryRun, true);
  const requestedConfirmWrite = normalizeBoolean(
    body.confirmWrite,
    false
  );

  const requestedConfirmationPhrase = normalizeText(
    body.confirmationPhrase
  );

  const confirmationPhraseMatches =
    requestedConfirmationPhrase ===
    WRITE_CONFIRMATION_PHRASE;

  const writeIntentDetected =
    requestedDryRun === false ||
    requestedConfirmWrite ||
    Boolean(requestedConfirmationPhrase);

  try {
    const serviceRequest = buildServiceRequest(body);

    const dryRunResult =
      resolveEventCanonicalAdminWriteDryRunResult(
        serviceRequest
      );

    const environment = getEnvironmentReadiness();

    const canonicalEventPayload =
      dryRunResult.plan.canonicalEventPayload;

    const preparedEventSlug = getPlanString(
      canonicalEventPayload,
      "slug"
    );

    const preparedExternalEventId = getPlanString(
      canonicalEventPayload,
      "primary_external_event_id"
    );

    const preparedProvider = getPlanString(
      canonicalEventPayload,
      "primary_provider_key"
    );

    const readbackLookupPrepared = Boolean(
      dryRunResult.canonicalEventId ||
        preparedEventSlug ||
        (preparedExternalEventId && preparedProvider)
    );

    const guardReady =
      dryRunResult.ok &&
      dryRunResult.guardDecision.admin_can_confirm;

    const controlledWritePreflightPassed =
      guardReady &&
      environment.write_environment_ready &&
      readbackLookupPrepared;

    return jsonResponse({
      ok: controlledWritePreflightPassed,
      version: ROUTE_VERSION,
      scope: ROUTE_SCOPE,
      mode: "dry_run_preflight",
      message: controlledWritePreflightPassed
        ? "Candidate passed controlled canonical write preflight. No write was performed."
        : "Candidate did not pass all controlled canonical write preflight checks.",
      request_intent: {
        requested_dry_run: requestedDryRun,
        requested_confirm_write:
          requestedConfirmWrite,
        confirmation_phrase_supplied: Boolean(
          requestedConfirmationPhrase
        ),
        confirmation_phrase_matches:
          confirmationPhraseMatches,
        write_intent_detected: writeIntentDetected,
        write_intent_executed: false,
      },
      preflight: {
        forced_dry_run: true,
        guard_ready: guardReady,
        environment_ready:
          environment.write_environment_ready,
        readback_lookup_prepared:
          readbackLookupPrepared,
        controlled_write_preflight_passed:
          controlledWritePreflightPassed,
        future_write_still_requires: {
          dry_run_false: true,
          confirm_write_true: true,
          exact_confirmation_phrase: true,
          explicit_user_confirmation: true,
          backup_completed: true,
          post_write_readback: true,
        },
      },
      guard: {
        admin_can_confirm:
          dryRunResult.guardDecision.admin_can_confirm,
        recommended_action:
          dryRunResult.recommendedAction,
        confirmation_state:
          dryRunResult.confirmationState,
        blocking_reasons:
          dryRunResult.blockingReasons,
      },
      prepared_plan: {
        canonical_event_id:
          dryRunResult.canonicalEventId,
        event_slug: preparedEventSlug,
        primary_provider_key:
          preparedProvider,
        primary_external_event_id:
          preparedExternalEventId,
        source_payload_count:
          dryRunResult.plan.sourcePayloads.length,
        search_document_prepared: Boolean(
          dryRunResult.plan.searchDocumentPayload
        ),
        feature_feed_payload_count:
          dryRunResult.plan.featureFeedPayloads.length,
        target_tables: Object.values(
          EVENT_CANONICAL_ADMIN_WRITE_SERVICE_TABLES
        ),
      },
      environment,
      readback: {
        route:
          "/api/official-events/canonical/admin/readback-db",
        lookup_prepared: readbackLookupPrepared,
        canonical_event_id:
          dryRunResult.canonicalEventId,
        event_slug: preparedEventSlug,
        external_event_id:
          preparedExternalEventId,
        provider: preparedProvider,
        readback_performed: false,
      },
      safety: {
        read_only: true,
        dry_run: true,
        write_function_imported: false,
        write_function_called: false,
        wrote_changes: false,
        database_write_performed: false,
        supabase_operation_performed: false,
        route_created: true,
        runtime_route_changed: false,
        visual_change_performed: false,
        public_event_page_changed: false,
        ticket_intent_connected: false,
        check_in_connected: false,
        rides_connected: false,
        meetups_connected: false,
        connections_connected: false,
        radar_connected: false,
        free_text_event_interaction_allowed: false,
        sensitive_values_returned: false,
      },
      error: dryRunResult.error,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "controlled_failure",
        message:
          error instanceof Error
            ? error.message
            : "Unknown canonical first write preflight error.",
        forced_dry_run: true,
        write_function_imported: false,
        write_function_called: false,
        wrote_changes: false,
        database_write_performed: false,
        supabase_operation_performed: false,
        visual_change_performed: false,
        public_event_page_changed: false,
        sensitive_values_returned: false,
      },
      500
    );
  }
}
