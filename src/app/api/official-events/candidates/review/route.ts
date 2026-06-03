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

type ReviewCandidateRow = {
  candidate_id: string;
  provider: string;
  provider_event_id: string | null;
  provider_url: string | null;
  query_text: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  event_datetime: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  image_url: string | null;
  source_name: string | null;
  source_type: string | null;
  candidate_status: ReviewCandidateStatus;
  confidence: number | null;
  discovery_type: string | null;
  normalized_query: string | null;
  query_city: string | null;
  query_state: string | null;
  query_country: string | null;
  query_start_date: string | null;
  query_end_date: string | null;
  match_reason: string | null;
  event_group_id: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CandidateReviewSummary = {
  primaryOfficialUrl: string | null;
  hasValidOfficialUrl: boolean;
  hasEventGroup: boolean;
  needsEventGroupSelection: boolean;
  canAttemptDryRunConfirmation: boolean;
  canConfirmAutomatically: false;
  suggestedAction:
    | "select_event_group"
    | "run_confirmation_dry_run"
    | "already_confirmed"
    | "review_rejected_or_expired_candidate"
    | "missing_valid_official_url";
  warnings: string[];
};

type EnrichedReviewCandidate = ReviewCandidateRow & {
  review_summary: CandidateReviewSummary;
};

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

function isValidHttpUrl(value: unknown): boolean {
  const text = normalizeText(value);

  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getPrimaryOfficialUrl(candidate: ReviewCandidateRow): string | null {
  return (
    normalizeText(candidate.official_url) ||
    normalizeText(candidate.ticket_url) ||
    normalizeText(candidate.provider_url) ||
    null
  );
}

function buildCandidateReviewSummary(candidate: ReviewCandidateRow): CandidateReviewSummary {
  const primaryOfficialUrl = getPrimaryOfficialUrl(candidate);
  const hasValidOfficialUrl = isValidHttpUrl(primaryOfficialUrl);
  const hasEventGroup = Boolean(normalizeText(candidate.event_group_id));
  const warnings: string[] = [];

  if (!hasValidOfficialUrl) {
    warnings.push("Candidate does not have a valid official URL.");
  }

  if (!hasEventGroup) {
    warnings.push("Candidate is not linked to an event_group yet.");
  }

  if (!candidate.event_date) {
    warnings.push("Candidate does not have event_date.");
  }

  if (!candidate.city && !candidate.state && !candidate.country) {
    warnings.push("Candidate does not have enough location data.");
  }

  if (Number(candidate.confidence || 0) < 60) {
    warnings.push("Candidate confidence is below recommended manual review threshold.");
  }

  if (candidate.candidate_status === "confirmed") {
    return {
      primaryOfficialUrl,
      hasValidOfficialUrl,
      hasEventGroup,
      needsEventGroupSelection: false,
      canAttemptDryRunConfirmation: false,
      canConfirmAutomatically: false,
      suggestedAction: "already_confirmed",
      warnings,
    };
  }

  if (candidate.candidate_status === "rejected" || candidate.candidate_status === "expired") {
    return {
      primaryOfficialUrl,
      hasValidOfficialUrl,
      hasEventGroup,
      needsEventGroupSelection: false,
      canAttemptDryRunConfirmation: false,
      canConfirmAutomatically: false,
      suggestedAction: "review_rejected_or_expired_candidate",
      warnings,
    };
  }

  if (!hasValidOfficialUrl) {
    return {
      primaryOfficialUrl,
      hasValidOfficialUrl,
      hasEventGroup,
      needsEventGroupSelection: !hasEventGroup,
      canAttemptDryRunConfirmation: false,
      canConfirmAutomatically: false,
      suggestedAction: "missing_valid_official_url",
      warnings,
    };
  }

  if (!hasEventGroup) {
    return {
      primaryOfficialUrl,
      hasValidOfficialUrl,
      hasEventGroup,
      needsEventGroupSelection: true,
      canAttemptDryRunConfirmation: false,
      canConfirmAutomatically: false,
      suggestedAction: "select_event_group",
      warnings,
    };
  }

  return {
    primaryOfficialUrl,
    hasValidOfficialUrl,
    hasEventGroup,
    needsEventGroupSelection: false,
    canAttemptDryRunConfirmation: true,
    canConfirmAutomatically: false,
    suggestedAction: "run_confirmation_dry_run",
    warnings,
  };
}

function summarizeCandidates(candidates: EnrichedReviewCandidate[]) {
  return {
    total: candidates.length,
    probableCount: candidates.filter((candidate) => candidate.candidate_status === "probable")
      .length,
    reviewCount: candidates.filter((candidate) => candidate.candidate_status === "review").length,
    confirmedCount: candidates.filter((candidate) => candidate.candidate_status === "confirmed")
      .length,
    rejectedCount: candidates.filter((candidate) => candidate.candidate_status === "rejected")
      .length,
    expiredCount: candidates.filter((candidate) => candidate.candidate_status === "expired")
      .length,
    withEventGroupCount: candidates.filter((candidate) => candidate.review_summary.hasEventGroup)
      .length,
    withoutEventGroupCount: candidates.filter(
      (candidate) => !candidate.review_summary.hasEventGroup
    ).length,
    withValidOfficialUrlCount: candidates.filter(
      (candidate) => candidate.review_summary.hasValidOfficialUrl
    ).length,
    readyForDryRunCount: candidates.filter(
      (candidate) => candidate.review_summary.canAttemptDryRunConfirmation
    ).length,
    needsEventGroupSelectionCount: candidates.filter(
      (candidate) => candidate.review_summary.needsEventGroupSelection
    ).length,
  };
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

  const candidates = (Array.isArray(data) ? data : []) as ReviewCandidateRow[];
  const enrichedCandidates: EnrichedReviewCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    review_summary: buildCandidateReviewSummary(candidate),
  }));

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
    count: enrichedCandidates.length,
    summary: summarizeCandidates(enrichedCandidates),
    candidates: enrichedCandidates,
  });
}