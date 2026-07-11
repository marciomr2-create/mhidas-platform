// src/app/api/official-events/canonical/admin/foundation-self-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  CANONICAL_PUBLIC_EVENT_READ_FOUNDATION_VERSION,
  readCanonicalPublicEvent,
} from "../../_shared/canonicalPublicEventReadFoundation";

export const dynamic = "force-dynamic";

const ROUTE_VERSION = "v4.8.65-event-canonical-foundation-self-test-route";

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

function forbiddenResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "forbidden",
      version: ROUTE_VERSION,
      mode: "canonical_foundation_self_test",
      database_write_performed: false,
      supabase_operation_performed: false,
      supabase_read_performed: false,
      write_blocked_by_design: true,
      route_created: true,
      runtime_route_changed: false,
      visual_change_performed: false,
      social_feature_enabled: false,
    },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return forbiddenResponse();
  }

  const eventSlug = normalizeString(request.nextUrl.searchParams.get("eventSlug"));
  const canonicalEventId = normalizeString(
    request.nextUrl.searchParams.get("canonicalEventId")
  );

  const result = await readCanonicalPublicEvent({
    eventSlug,
    canonicalEventId,
  });

  return NextResponse.json({
    ok: result.ok,
    version: ROUTE_VERSION,
    mode: "canonical_foundation_self_test",
    route: "/api/official-events/canonical/admin/foundation-self-test",
    method: "GET",
    foundation_version: CANONICAL_PUBLIC_EVENT_READ_FOUNDATION_VERSION,
    database_write_performed: false,
    supabase_operation_performed: result.safety.supabase_operation_performed,
    supabase_read_performed: result.safety.supabase_read_performed,
    write_blocked_by_design: true,
    route_created: true,
    runtime_route_changed: false,
    visual_change_performed: false,
    social_feature_enabled: result.safety.social_feature_enabled,
    public_event_page_changed: false,
    free_text_event_interaction_allowed: false,
    input: {
      event_slug: eventSlug,
      canonical_event_id: canonicalEventId,
    },
    result,
    self_test: {
      imported_foundation: true,
      foundation_version_matches_expected:
        CANONICAL_PUBLIC_EVENT_READ_FOUNDATION_VERSION ===
        "v4.8.64-event-canonical-public-event-read-foundation",
      read_only_confirmed: result.safety.read_only === true,
      no_database_write_confirmed:
        result.safety.database_write_performed === false,
      no_visual_change_confirmed:
        result.safety.visual_change_performed === false,
      no_public_event_page_change_confirmed:
        result.safety.public_event_page_changed === false,
      no_free_text_event_interaction_confirmed:
        result.safety.free_text_event_interaction_allowed === false,
    },
  });
}