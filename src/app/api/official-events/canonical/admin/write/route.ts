import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type {
  EventCanonicalAdminWriteServiceRequest,
} from "../../../_shared/eventCanonicalAdminWriteService";

import {
  resolveEventCanonicalAdminWriteDryRunResult,
  writeEventCanonicalAdminConfirmation,
} from "../../../_shared/eventCanonicalAdminWriteService";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
  const text = normalizeText(value);
  return text || null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;

  const text = normalizeText(value).toLowerCase();

  if (["true", "1", "yes", "sim"].includes(text)) return true;
  if (["false", "0", "no", "nao", "não"].includes(text)) return false;

  return fallback;
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isAuthorized(request: NextRequest, searchParams: URLSearchParams): boolean {
  const configuredSecret = normalizeText(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET);

  if (!configuredSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!configuredSecret) {
    return false;
  }

  const headerSecret = normalizeText(request.headers.get("x-official-events-secret"));
  const querySecret = normalizeText(searchParams.get("secret"));

  return headerSecret === configuredSecret || querySecret === configuredSecret;
}

function validateRouteBody(body: RouteBody): {
  ok: boolean;
  status: number;
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

  if (!Array.isArray(body.sourceEvidence) || body.sourceEvidence.length === 0) {
    reasons.push("source_evidence_required");
  }

  return {
    ok: reasons.length === 0,
    status: reasons.length === 0 ? 200 : 400,
    reasons,
  };
}

function buildServiceRequest(params: {
  body: RouteBody;
  effectiveDryRun: boolean;
}): EventCanonicalAdminWriteServiceRequest {
  const body = params.body;

  return {
    dryRun: params.effectiveDryRun,
    adminUserId: normalizeNullableText(body.adminUserId),
    event: body.event,
    sourceEvidence: body.sourceEvidence,
    existingCanonicalMatches: Array.isArray(body.existingCanonicalMatches)
      ? body.existingCanonicalMatches
      : [],
    searchDocumentProposal: isPlainObject(body.searchDocumentProposal)
      ? body.searchDocumentProposal
      : null,
    featureGateProposals: Array.isArray(body.featureGateProposals)
      ? body.featureGateProposals
      : null,
    canonicalIdentityIsUnique:
      typeof body.canonicalIdentityIsUnique === "boolean"
        ? body.canonicalIdentityIsUnique
        : null,
    rejectCandidate:
      typeof body.rejectCandidate === "boolean" ? body.rejectCandidate : null,
  } as EventCanonicalAdminWriteServiceRequest;
}

function buildRouteSummary(params: {
  requestedWrite: boolean;
  explicitWriteConfirmed: boolean;
  effectiveDryRun: boolean;
}) {
  return {
    requestedWrite: params.requestedWrite,
    explicitWriteConfirmed: params.explicitWriteConfirmed,
    effectiveDryRun: params.effectiveDryRun,
    writeConfirmationPhraseRequired: WRITE_CONFIRMATION_PHRASE,
    dryRunDefault: true,
    writesRequireDryRunFalse: true,
    writesRequireConfirmWriteTrue: true,
    writesRequireConfirmationPhrase: true,
    eventPageConnected: false,
    ticketIntentConnected: false,
    checkInConnected: false,
    ridesConnected: false,
    meetupsConnected: false,
    radarConnected: false,
    visualChangePerformed: false,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-admin-write-route",
        mode: "blocked",
        message: "Official event canonical admin write route is not authorized.",
        route_created: true,
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-canonical-admin-write-route",
    mode: "capabilities",
    message:
      "Canonical admin write route is available. POST defaults to dry-run and requires explicit write confirmation.",
    dryRunDefault: true,
    writeConfirmationPhraseRequired: WRITE_CONFIRMATION_PHRASE,
    acceptedMethod: "POST",
    route_created: true,
    database_write_performed: false,
    supabase_operation_performed: false,
    visual_change_performed: false,
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-admin-write-route",
        mode: "blocked",
        message: "Official event canonical admin write route is not authorized.",
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 403 }
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
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-admin-write-route",
        mode: "invalid_request",
        message: "JSON body is required.",
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: 400 }
    );
  }

  const validation = validateRouteBody(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-admin-write-route",
        mode: "invalid_request",
        message: "Canonical admin write request is invalid.",
        reasons: validation.reasons,
        database_write_performed: false,
        supabase_operation_performed: false,
      },
      { status: validation.status }
    );
  }

  const requestedWrite = body.dryRun === false;
  const explicitWriteConfirmed =
    requestedWrite &&
    normalizeBoolean(body.confirmWrite, false) === true &&
    normalizeText(body.confirmationPhrase) === WRITE_CONFIRMATION_PHRASE;

  const effectiveDryRun = !explicitWriteConfirmed;

  const serviceRequest = buildServiceRequest({
    body,
    effectiveDryRun,
  });

  if (effectiveDryRun) {
    const dryRunResult = resolveEventCanonicalAdminWriteDryRunResult(serviceRequest);

    return NextResponse.json({
      ok: dryRunResult.ok,
      scope: "event-canonical-admin-write-route",
      mode: "dry_run",
      message: requestedWrite
        ? "Write was requested, but explicit confirmation was missing or invalid. Dry-run was executed instead."
        : "Dry-run executed. No database write was performed.",
      routeSummary: buildRouteSummary({
        requestedWrite,
        explicitWriteConfirmed,
        effectiveDryRun,
      }),
      result: dryRunResult,
      database_write_performed: false,
      supabase_operation_performed: false,
      route_created: true,
      visual_change_performed: false,
    });
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-canonical-admin-write-route",
        mode: "write_blocked",
        message:
          "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
        routeSummary: buildRouteSummary({
          requestedWrite,
          explicitWriteConfirmed,
          effectiveDryRun,
        }),
        database_write_performed: false,
        supabase_operation_performed: false,
        route_created: true,
        visual_change_performed: false,
      },
      { status: 500 }
    );
  }

  const writeResult = await writeEventCanonicalAdminConfirmation(
    supabase as never,
    serviceRequest
  );

  return NextResponse.json(
    {
      ok: writeResult.ok,
      scope: "event-canonical-admin-write-route",
      mode: "write",
      message: writeResult.ok
        ? "Canonical event write completed."
        : "Canonical event write failed or was blocked by the write service.",
      routeSummary: buildRouteSummary({
        requestedWrite,
        explicitWriteConfirmed,
        effectiveDryRun,
      }),
      result: writeResult,
      database_write_performed: writeResult.database_write_performed,
      supabase_operation_performed: writeResult.supabase_operation_performed,
      route_created: true,
      visual_change_performed: false,
    },
    { status: writeResult.ok ? 200 : 409 }
  );
}