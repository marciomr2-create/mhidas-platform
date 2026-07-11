// src/app/api/official-events/canonical/admin/shadow-debug/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readCanonicalPublicEventBySlug } from "@/app/api/official-events/canonical/_shared/canonicalPublicEventReadFoundation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION = "v4.8.67-event-canonical-shadow-debug-route";
const ROUTE_SCOPE = "event-canonical-shadow-debug-route";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function getConfiguredSecret(): string {
  return normalizeText(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET);
}

function getRequestSecret(request: NextRequest): string {
  const headerSecret =
    request.headers.get("x-official-events-secret") ||
    request.headers.get("x-resolver-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  return normalizeText(headerSecret || querySecret);
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = getConfiguredSecret();
  const requestSecret = getRequestSecret(request);

  if (!configuredSecret) {
    return false;
  }

  if (!requestSecret) {
    return false;
  }

  return requestSecret === configuredSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "read_only",
        message: "Canonical shadow debug route is not authorized.",
        sensitive_values_returned: false,
        database_write_performed: false,
        supabase_operation_performed: false,
        visual_change_performed: false,
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const eventSlug = normalizeText(
    request.nextUrl.searchParams.get("eventSlug")
  ).toLowerCase();

  if (!eventSlug) {
    return NextResponse.json(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "read_only",
        message: "Query parameter eventSlug is required.",
        sensitive_values_returned: false,
        database_write_performed: false,
        supabase_operation_performed: false,
        visual_change_performed: false,
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const result = await readCanonicalPublicEventBySlug(eventSlug);

    return NextResponse.json(
      {
        ok: result.ok,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "read_only",
        event_slug: eventSlug,
        foundation_version: result.version,
        foundation_mode: result.mode,
        found: result.found,
        lookup_strategy: result.lookup_strategy,
        canonical_event_id: result.canonical_event_id,
        summary: {
          canonical_events: result.summary.canonical_events,
          sources: result.summary.sources,
          search_documents: result.summary.search_documents,
          feature_feeds: result.summary.feature_feeds,
          enabled_feature_feeds: result.summary.enabled_feature_feeds,
          disabled_feature_feeds: result.summary.disabled_feature_feeds,
          social_feature_enabled: result.summary.social_feature_enabled,
          supabase_read_performed: result.summary.supabase_read_performed,
        },
        safety: {
          read_only: result.safety.read_only,
          database_write_performed:
            result.safety.database_write_performed,
          supabase_operation_performed:
            result.safety.supabase_operation_performed,
          supabase_read_performed:
            result.safety.supabase_read_performed,
          route_created: true,
          visual_change_performed:
            result.safety.visual_change_performed,
          social_feature_enabled:
            result.safety.social_feature_enabled,
          public_event_page_changed:
            result.safety.public_event_page_changed,
          free_text_event_interaction_allowed:
            result.safety.free_text_event_interaction_allowed,
        },
        error: result.error,
        error_details_returned: false,
        sensitive_values_returned: false,
      },
      {
        status: result.ok ? 200 : 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        version: ROUTE_VERSION,
        scope: ROUTE_SCOPE,
        mode: "read_only",
        event_slug: eventSlug,
        message:
          error instanceof Error
            ? error.message
            : "Unknown canonical shadow debug error.",
        error_details_returned: false,
        sensitive_values_returned: false,
        database_write_performed: false,
        supabase_operation_performed: false,
        visual_change_performed: false,
        public_event_page_changed: false,
        social_feature_enabled: false,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}