// src/app/api/official-events/canonical/admin/readback/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROUTE_VERSION = "v4.8.58-event-canonical-admin-readback-audit";
const REQUIRED_CONFIRMATION_PHRASE = "CONFIRM_CANONICAL_EVENT_WRITE";

type ReadbackAuditRequest = {
  eventSlug?: unknown;
  canonicalEventId?: unknown;
  externalEventId?: unknown;
  provider?: unknown;
  dryRun?: unknown;
  confirmWrite?: unknown;
  confirmationPhrase?: unknown;
};

type NormalizedReadbackInput = {
  event_slug: string | null;
  canonical_event_id: string | null;
  external_event_id: string | null;
  provider: string | null;
  dry_run: boolean;
  confirm_write: boolean;
  confirmation_phrase_matches: boolean;
};

type ReadbackAuditResponse = {
  ok: boolean;
  version: string;
  mode: "capabilities" | "readback_audit";
  route: string;
  method: "GET" | "POST";
  database_write_performed: false;
  supabase_operation_performed: false;
  write_blocked_by_design: true;
  input: NormalizedReadbackInput;
  safety: {
    dry_run_default: true;
    write_route_not_called: true;
    requires_separate_write_route_for_mutation: true;
    required_confirmation_phrase: typeof REQUIRED_CONFIRMATION_PHRASE;
  };
  audit: {
    requested_lookup_fields: string[];
    lookup_ready: boolean;
    can_be_used_before_real_write_test: boolean;
    notes: string[];
  };
};

function getResolverSecret(): string {
  return String(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET || "").trim();
}

function getRequestSecret(request: NextRequest): string {
  const fromHeader =
    request.headers.get("x-official-events-secret") ||
    request.headers.get("x-resolver-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  const fromQuery = request.nextUrl.searchParams.get("secret") || "";

  return String(fromHeader || fromQuery || "").trim();
}

function isAuthorized(request: NextRequest): boolean {
  const expected = getResolverSecret();
  const received = getRequestSecret(request);

  if (!expected) return false;
  if (!received) return false;

  return received === expected;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }

  return fallback;
}

function normalizeInput(payload: ReadbackAuditRequest): NormalizedReadbackInput {
  const confirmationPhrase = normalizeString(payload.confirmationPhrase);

  return {
    event_slug: normalizeString(payload.eventSlug),
    canonical_event_id: normalizeString(payload.canonicalEventId),
    external_event_id: normalizeString(payload.externalEventId),
    provider: normalizeString(payload.provider),
    dry_run: normalizeBoolean(payload.dryRun, true),
    confirm_write: normalizeBoolean(payload.confirmWrite, false),
    confirmation_phrase_matches:
      confirmationPhrase === REQUIRED_CONFIRMATION_PHRASE,
  };
}

function buildRequestedLookupFields(
  input: NormalizedReadbackInput
): string[] {
  const fields: string[] = [];

  if (input.event_slug) fields.push("event_slug");
  if (input.canonical_event_id) fields.push("canonical_event_id");
  if (input.external_event_id) fields.push("external_event_id");
  if (input.provider) fields.push("provider");

  return fields;
}

function buildResponse(
  method: "GET" | "POST",
  mode: "capabilities" | "readback_audit",
  input: NormalizedReadbackInput
): ReadbackAuditResponse {
  const requestedLookupFields = buildRequestedLookupFields(input);

  return {
    ok: true,
    version: ROUTE_VERSION,
    mode,
    route: "/api/official-events/canonical/admin/readback",
    method,
    database_write_performed: false,
    supabase_operation_performed: false,
    write_blocked_by_design: true,
    input,
    safety: {
      dry_run_default: true,
      write_route_not_called: true,
      requires_separate_write_route_for_mutation: true,
      required_confirmation_phrase: REQUIRED_CONFIRMATION_PHRASE,
    },
    audit: {
      requested_lookup_fields: requestedLookupFields,
      lookup_ready: requestedLookupFields.length > 0,
      can_be_used_before_real_write_test: true,
      notes: [
        "This route is readback/audit-only.",
        "It does not call Supabase.",
        "It does not call the canonical write route.",
        "It is safe to use before any controlled real write test.",
      ],
    },
  };
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "forbidden",
      database_write_performed: false,
      supabase_operation_performed: false,
      write_blocked_by_design: true,
    },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return forbiddenResponse();
  }

  const input = normalizeInput({
    eventSlug: request.nextUrl.searchParams.get("eventSlug"),
    canonicalEventId: request.nextUrl.searchParams.get("canonicalEventId"),
    externalEventId: request.nextUrl.searchParams.get("externalEventId"),
    provider: request.nextUrl.searchParams.get("provider"),
    dryRun: request.nextUrl.searchParams.get("dryRun"),
    confirmWrite: request.nextUrl.searchParams.get("confirmWrite"),
    confirmationPhrase: request.nextUrl.searchParams.get("confirmationPhrase"),
  });

  return NextResponse.json(buildResponse("GET", "capabilities", input));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return forbiddenResponse();
  }

  let payload: ReadbackAuditRequest = {};

  try {
    payload = (await request.json()) as ReadbackAuditRequest;
  } catch {
    payload = {};
  }

  const input = normalizeInput(payload);

  return NextResponse.json(buildResponse("POST", "readback_audit", input));
}