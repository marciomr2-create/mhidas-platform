// src/app/api/official-events/admin/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AdminClient = {
  from: (table: string) => any;
};

type OfficialEventCandidateStatus =
  | "probable"
  | "review"
  | "confirmed"
  | "rejected"
  | "expired";

type OfficialEventCandidateRow = {
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
  candidate_status: OfficialEventCandidateStatus;
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

type EventGroupRow = {
  group_id: string;
  event_name: string | null;
  event_date: string | null;
  event_slug: string | null;
  city_base: string | null;
  status: string | null;
  is_public: boolean | null;
  official_status: string | null;
  official_url: string | null;
  official_source_name: string | null;
  official_source_type: string | null;
  official_confidence: number | null;
};

type AdminPreviewAction =
  | "select_event_group"
  | "run_confirmation_dry_run"
  | "already_confirmed"
  | "review_rejected_or_expired_candidate"
  | "missing_valid_official_url";

type CandidateAdminPreview = OfficialEventCandidateRow & {
  primaryOfficialUrl: string | null;
  hasValidOfficialUrl: boolean;
  hasEventGroup: boolean;
  canConfirmAutomatically: false;
  recommendedAction: AdminPreviewAction;
  actionLabel: string;
  actionReason: string;
  eventGroup: EventGroupRow | null;
  warnings: string[];
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

function getRequestedStatuses(searchParams: URLSearchParams): OfficialEventCandidateStatus[] {
  const status = normalizeText(searchParams.get("status")).toLowerCase();

  if (status === "confirmed") return ["confirmed"];
  if (status === "rejected") return ["rejected"];
  if (status === "expired") return ["expired"];
  if (status === "all") return ["probable", "review", "confirmed", "rejected", "expired"];
  if (status === "probable") return ["probable"];
  if (status === "review") return ["review"];

  return ["probable", "review", "confirmed"];
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

function getPrimaryOfficialUrl(candidate: OfficialEventCandidateRow): string | null {
  return (
    normalizeText(candidate.official_url) ||
    normalizeText(candidate.ticket_url) ||
    normalizeText(candidate.provider_url) ||
    null
  );
}

function buildCandidateWarnings(params: {
  candidate: OfficialEventCandidateRow;
  hasValidOfficialUrl: boolean;
  hasEventGroup: boolean;
  eventGroup: EventGroupRow | null;
}): string[] {
  const warnings: string[] = [];

  if (!params.hasValidOfficialUrl) {
    warnings.push("Candidate does not have a valid official URL.");
  }

  if (!params.hasEventGroup) {
    warnings.push("Candidate is not linked to an event_group yet.");
  }

  if (!params.candidate.event_date) {
    warnings.push("Candidate does not have event_date.");
  }

  if (!params.candidate.city && !params.candidate.state && !params.candidate.country) {
    warnings.push("Candidate does not have enough location data.");
  }

  if (Number(params.candidate.confidence || 0) < 60) {
    warnings.push("Candidate confidence is below recommended manual review threshold.");
  }

  if (params.eventGroup?.official_status === "confirmed" && params.candidate.candidate_status !== "confirmed") {
    warnings.push("Linked event_group is already confirmed but candidate is not confirmed.");
  }

  return warnings;
}

function resolveRecommendedAction(params: {
  candidate: OfficialEventCandidateRow;
  hasValidOfficialUrl: boolean;
  hasEventGroup: boolean;
}): {
  recommendedAction: AdminPreviewAction;
  actionLabel: string;
  actionReason: string;
} {
  if (params.candidate.candidate_status === "confirmed") {
    return {
      recommendedAction: "already_confirmed",
      actionLabel: "Already confirmed",
      actionReason: "Candidate is already confirmed and should not be confirmed again.",
    };
  }

  if (
    params.candidate.candidate_status === "rejected" ||
    params.candidate.candidate_status === "expired"
  ) {
    return {
      recommendedAction: "review_rejected_or_expired_candidate",
      actionLabel: "Review status",
      actionReason: "Candidate is rejected or expired and should be reviewed before any new action.",
    };
  }

  if (!params.hasValidOfficialUrl) {
    return {
      recommendedAction: "missing_valid_official_url",
      actionLabel: "Missing valid official URL",
      actionReason: "Candidate needs a valid official URL before confirmation can be tested.",
    };
  }

  if (!params.hasEventGroup) {
    return {
      recommendedAction: "select_event_group",
      actionLabel: "Select event group",
      actionReason: "Candidate needs a target event_group before confirmation dry-run.",
    };
  }

  return {
    recommendedAction: "run_confirmation_dry_run",
    actionLabel: "Run confirmation dry-run",
    actionReason: "Candidate has a valid URL and linked event_group. Run dry-run before confirming.",
  };
}

function enrichCandidate(params: {
  candidate: OfficialEventCandidateRow;
  eventGroupById: Map<string, EventGroupRow>;
}): CandidateAdminPreview {
  const primaryOfficialUrl = getPrimaryOfficialUrl(params.candidate);
  const hasValidOfficialUrl = isValidHttpUrl(primaryOfficialUrl);
  const eventGroupId = normalizeText(params.candidate.event_group_id);
  const eventGroup = eventGroupId ? params.eventGroupById.get(eventGroupId) || null : null;
  const hasEventGroup = Boolean(eventGroupId);
  const action = resolveRecommendedAction({
    candidate: params.candidate,
    hasValidOfficialUrl,
    hasEventGroup,
  });

  return {
    ...params.candidate,
    primaryOfficialUrl,
    hasValidOfficialUrl,
    hasEventGroup,
    canConfirmAutomatically: false,
    recommendedAction: action.recommendedAction,
    actionLabel: action.actionLabel,
    actionReason: action.actionReason,
    eventGroup,
    warnings: buildCandidateWarnings({
      candidate: params.candidate,
      hasValidOfficialUrl,
      hasEventGroup,
      eventGroup,
    }),
  };
}

function summarizeAdminPreview(candidates: CandidateAdminPreview[]) {
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
    withEventGroupCount: candidates.filter((candidate) => candidate.hasEventGroup).length,
    withoutEventGroupCount: candidates.filter((candidate) => !candidate.hasEventGroup).length,
    withValidOfficialUrlCount: candidates.filter((candidate) => candidate.hasValidOfficialUrl).length,
    readyForDryRunCount: candidates.filter(
      (candidate) => candidate.recommendedAction === "run_confirmation_dry_run"
    ).length,
    alreadyConfirmedCount: candidates.filter(
      (candidate) => candidate.recommendedAction === "already_confirmed"
    ).length,
    needsEventGroupSelectionCount: candidates.filter(
      (candidate) => candidate.recommendedAction === "select_event_group"
    ).length,
    missingValidOfficialUrlCount: candidates.filter(
      (candidate) => candidate.recommendedAction === "missing_valid_official_url"
    ).length,
  };
}

async function loadLinkedEventGroups(params: {
  supabase: AdminClient;
  candidates: OfficialEventCandidateRow[];
}): Promise<{
  eventGroupById: Map<string, EventGroupRow>;
  error: string | null;
}> {
  const eventGroupIds = Array.from(
    new Set(
      params.candidates
        .map((candidate) => normalizeText(candidate.event_group_id))
        .filter(Boolean)
    )
  );

  if (!eventGroupIds.length) {
    return {
      eventGroupById: new Map(),
      error: null,
    };
  }

  const { data, error } = await params.supabase
    .from("event_groups")
    .select(
      [
        "group_id",
        "event_name",
        "event_date",
        "event_slug",
        "city_base",
        "status",
        "is_public",
        "official_status",
        "official_url",
        "official_source_name",
        "official_source_type",
        "official_confidence",
      ].join(",")
    )
    .in("group_id", eventGroupIds);

  if (error) {
    return {
      eventGroupById: new Map(),
      error: error.message || "Failed to load linked event groups.",
    };
  }

  const eventGroups = (Array.isArray(data) ? data : []) as EventGroupRow[];

  return {
    eventGroupById: new Map(eventGroups.map((eventGroup) => [eventGroup.group_id, eventGroup])),
    error: null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-admin-preview",
        message: "Official event admin preview is not authorized.",
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
        scope: "official-event-admin-preview",
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
        scope: "official-event-admin-preview",
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

  const candidates = (Array.isArray(data) ? data : []) as OfficialEventCandidateRow[];

  const linkedEventGroups = await loadLinkedEventGroups({
    supabase,
    candidates,
  });

  if (linkedEventGroups.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-admin-preview",
        message: linkedEventGroups.error,
        statuses,
        provider: provider || null,
        query: query || null,
        limit,
        candidates: [],
      },
      { status: 500 }
    );
  }

  const enrichedCandidates = candidates.map((candidate) =>
    enrichCandidate({
      candidate,
      eventGroupById: linkedEventGroups.eventGroupById,
    })
  );

  return NextResponse.json({
    ok: true,
    scope: "official-event-admin-preview",
    message: "Official event admin preview loaded successfully.",
    mode: "read_only",
    canConfirmAutomatically: false,
    statuses,
    provider: provider || null,
    query: query || null,
    limit,
    count: enrichedCandidates.length,
    summary: summarizeAdminPreview(enrichedCandidates),
    candidates: enrichedCandidates,
  });
}