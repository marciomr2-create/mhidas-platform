// src/app/api/official-events/candidates/review/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AdminClient = {
  from: (table: string) => any;
};

type ReviewCandidateStatus = "probable" | "review" | "confirmed" | "rejected" | "expired";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 25;

  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function getAdminClient(): AdminClient | null {
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
  }) as AdminClient;
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

function getRequestedStatuses(searchParams: URLSearchParams): ReviewCandidateStatus[] {
  const status = normalizeText(searchParams.get("status")).toLowerCase();

  if (status === "confirmed") return ["confirmed"];
  if (status === "rejected") return ["rejected"];
  if (status === "expired") return ["expired"];
  if (status === "all") return ["probable", "review", "confirmed", "rejected", "expired"];
  if (status === "probable") return ["probable"];
  if (status === "review") return ["review"];

  return ["probable", "review"];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidates-review",
        message: "Official event candidate review is not authorized.",
        candidates: [],
      },
      { status: 403 }
    );
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidates-review",
        message: "Supabase service role is not configured.",
        candidates: [],
      },
      { status: 500 }
    );
  }

  const provider = normalizeText(searchParams.get("provider")).toLowerCase();
  const query = normalizeText(searchParams.get("q"));
  const limit = normalizeLimit(searchParams.get("limit"));
  const statuses = getRequestedStatuses(searchParams);

  let requestQuery = supabase
    .from("official_event_candidates")
    .select(
      [
        "candidate_id",
        "provider",
        "provider_event_id",
        "provider_url",
        "query_text",
        "event_name",
        "artist_name",
        "event_date",
        "event_datetime",
        "venue_name",
        "city",
        "state",
        "country",
        "official_url",
        "ticket_url",
        "image_url",
        "source_name",
        "source_type",
        "candidate_status",
        "confidence",
        "discovery_type",
        "normalized_query",
        "query_city",
        "query_state",
        "query_country",
        "query_start_date",
        "query_end_date",
        "match_reason",
        "event_group_id",
        "notes",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .in("candidate_status", statuses)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (provider) {
    requestQuery = requestQuery.eq("provider", provider);
  }

  if (query) {
    requestQuery = requestQuery.or(
      `event_name.ilike.%${query}%,artist_name.ilike.%${query}%,venue_name.ilike.%${query}%,city.ilike.%${query}%`
    );
  }

  const { data, error } = await requestQuery;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidates-review",
        message: error.message || "Failed to load official event candidates.",
        statuses,
        provider: provider || null,
        query: query || null,
        limit,
        candidates: [],
      },
      { status: 500 }
    );
  }

  const candidates = Array.isArray(data) ? data : [];

  return NextResponse.json({
    ok: true,
    scope: "official-event-candidates-review",
    message: "Official event candidates loaded for manual review preview.",
    mode: "read_only",
    canConfirmAutomatically: false,
    statuses,
    provider: provider || null,
    query: query || null,
    limit,
    count: candidates.length,
    candidates,
  });
}