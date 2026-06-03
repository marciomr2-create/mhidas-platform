// src/app/api/official-events/candidates/confirm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AdminClient = {
  from: (table: string) => any;
};

type CandidateRecord = {
  candidate_id: string;
  provider: string;
  provider_event_id: string | null;
  provider_url: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  source_name: string | null;
  source_type: string | null;
  candidate_status: string;
  confidence: number | null;
  event_group_id: string | null;
  notes: string | null;
};

type EventGroupRecord = {
  group_id: string;
  event_name: string | null;
  event_date: string | null;
  event_slug: string | null;
  city_base: string | null;
  status: string | null;
  official_status: string | null;
  official_url: string | null;
  official_source_type: string | null;
  official_confidence: number | null;
  official_notes: string | null;
};

type ConfirmRequestBody = {
  candidate_id?: unknown;
  event_group_id?: unknown;
  dryRun?: unknown;
  note?: unknown;
};

type ConfirmationSafety = {
  canConfirm: boolean;
  warnings: string[];
  blockingReasons: string[];
  checks: Record<string, boolean>;
};

type ConfirmationPreview = {
  official_url: string | null;
  official_source_name: string;
  official_source_url: string | null;
  official_source_type: string;
  official_status: "confirmed";
  official_confidence: number;
  official_notes: string;
};

type ConfirmationAdminSummary = {
  requestedDryRun: boolean;
  effectiveDryRun: boolean;
  canConfirm: boolean;
  wroteChanges: boolean;
  canConfirmAutomatically: false;
  showDryRunButton: boolean;
  showConfirmButton: boolean;
  nextRecommendedAction:
    | "already_confirmed"
    | "run_dry_run"
    | "confirm_manually"
    | "review_blocking_reasons"
    | "missing_required_fields"
    | "not_found"
    | "confirmed"
    | "none";
  reason: string;
  candidate: {
    candidate_id: string | null;
    event_name: string | null;
    candidate_status: string | null;
    event_group_id: string | null;
  };
  eventGroup: {
    group_id: string | null;
    event_name: string | null;
    official_status: string | null;
  };
  links: {
    official_url: string | null;
    source_name: string | null;
    source_type: string | null;
  };
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

function normalizeForComparison(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function getCandidateOfficialUrl(candidate: CandidateRecord): string {
  return (
    normalizeText(candidate.official_url) ||
    normalizeText(candidate.ticket_url) ||
    normalizeText(candidate.provider_url)
  );
}

function getEventGroupSourceType(candidate: CandidateRecord): string {
  const sourceType = normalizeText(candidate.source_type).toLowerCase();
  const allowed = new Set(["site", "ticket", "instagram", "manual", "ai_search", "user_suggestion"]);

  if (allowed.has(sourceType)) return sourceType;

  return "manual";
}

function buildManualConfirmationNotes(params: {
  candidate: CandidateRecord;
  eventGroup: EventGroupRecord;
  note: string | null;
}): string {
  const manualNote = params.note ? ` Admin note: ${params.note}` : "";

  return [
    "Manually confirmed from official_event_candidates.",
    `Candidate: ${params.candidate.event_name}.`,
    `Provider: ${params.candidate.provider}.`,
    `Event group: ${params.eventGroup.event_name || params.eventGroup.group_id}.`,
    manualNote,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateConfirmationSafety(params: {
  candidate: CandidateRecord;
  eventGroup: EventGroupRecord;
}): ConfirmationSafety {
  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  const candidateName = normalizeForComparison(params.candidate.event_name);
  const candidateArtist = normalizeForComparison(params.candidate.artist_name);
  const candidateVenue = normalizeForComparison(params.candidate.venue_name);
  const candidateCity = normalizeForComparison(params.candidate.city);
  const candidateState = normalizeForComparison(params.candidate.state);
  const groupName = normalizeForComparison(params.eventGroup.event_name);
  const groupCityBase = normalizeForComparison(params.eventGroup.city_base);

  const officialUrl = getCandidateOfficialUrl(params.candidate);

  const statusAllowed =
    params.candidate.candidate_status === "probable" ||
    params.candidate.candidate_status === "review";

  const groupIsActive = params.eventGroup.status === "active";

  const candidateAlreadyLinkedToGroup =
    normalizeText(params.candidate.event_group_id) === normalizeText(params.eventGroup.group_id);

  const nameMatches =
    Boolean(candidateName && groupName && candidateName.includes(groupName)) ||
    Boolean(candidateName && groupName && groupName.includes(candidateName)) ||
    Boolean(candidateArtist && groupName && groupName.includes(candidateArtist)) ||
    Boolean(candidateVenue && groupName && groupName.includes(candidateVenue));

  const dateMatches =
    Boolean(params.candidate.event_date && params.eventGroup.event_date) &&
    params.candidate.event_date === params.eventGroup.event_date;

  const cityMatches =
    Boolean(candidateCity && groupCityBase && groupCityBase.includes(candidateCity)) ||
    Boolean(candidateState && groupCityBase && groupCityBase.includes(candidateState));

  const hasValidOfficialUrl = isValidHttpUrl(officialUrl);

  if (!statusAllowed) {
    if (params.candidate.candidate_status === "confirmed") {
      blockingReasons.push("Candidate is already confirmed.");
    } else {
      blockingReasons.push("Candidate status must be probable or review before manual confirmation.");
    }
  }

  if (!groupIsActive) {
    blockingReasons.push("Event group must be active before confirmation.");
  }

  if (!hasValidOfficialUrl) {
    blockingReasons.push("Candidate does not have a valid official URL.");
  }

  if (!candidateAlreadyLinkedToGroup && !nameMatches && !dateMatches && !cityMatches) {
    blockingReasons.push("Candidate does not appear to match the selected event group.");
  }

  if (!nameMatches) {
    warnings.push("Candidate event name does not clearly match event group name.");
  }

  if (!dateMatches) {
    warnings.push("Candidate event date does not match event group date.");
  }

  if (!cityMatches) {
    warnings.push("Candidate city/state does not clearly match event group city_base.");
  }

  return {
    canConfirm: blockingReasons.length === 0,
    warnings,
    blockingReasons,
    checks: {
      statusAllowed,
      groupIsActive,
      hasValidOfficialUrl,
      candidateAlreadyLinkedToGroup,
      nameMatches,
      dateMatches,
      cityMatches,
    },
  };
}

function buildConfirmationAdminSummary(params: {
  candidate: CandidateRecord | null;
  eventGroup: EventGroupRecord | null;
  preview: ConfirmationPreview | null;
  safety: ConfirmationSafety | null;
  requestedDryRun: boolean;
  effectiveDryRun: boolean;
  wroteChanges: boolean;
  reason: string;
}): ConfirmationAdminSummary {
  const candidate = params.candidate;
  const eventGroup = params.eventGroup;
  const safety = params.safety;

  let nextRecommendedAction: ConfirmationAdminSummary["nextRecommendedAction"] = "none";
  let showDryRunButton = false;
  let showConfirmButton = false;

  if (!candidate || !eventGroup) {
    nextRecommendedAction = "not_found";
  } else if (candidate.candidate_status === "confirmed") {
    nextRecommendedAction = "already_confirmed";
  } else if (!safety) {
    nextRecommendedAction = "missing_required_fields";
  } else if (!safety.canConfirm) {
    nextRecommendedAction = "review_blocking_reasons";
    showDryRunButton = true;
  } else if (params.wroteChanges) {
    nextRecommendedAction = "confirmed";
  } else if (params.effectiveDryRun) {
    nextRecommendedAction = "confirm_manually";
    showConfirmButton = true;
  } else {
    nextRecommendedAction = "run_dry_run";
    showDryRunButton = true;
  }

  return {
    requestedDryRun: params.requestedDryRun,
    effectiveDryRun: params.effectiveDryRun,
    canConfirm: Boolean(safety?.canConfirm),
    wroteChanges: params.wroteChanges,
    canConfirmAutomatically: false,
    showDryRunButton,
    showConfirmButton,
    nextRecommendedAction,
    reason: params.reason,
    candidate: {
      candidate_id: candidate?.candidate_id || null,
      event_name: candidate?.event_name || null,
      candidate_status: candidate?.candidate_status || null,
      event_group_id: candidate?.event_group_id || null,
    },
    eventGroup: {
      group_id: eventGroup?.group_id || null,
      event_name: eventGroup?.event_name || null,
      official_status: eventGroup?.official_status || null,
    },
    links: {
      official_url: params.preview?.official_url || null,
      source_name: params.preview?.official_source_name || null,
      source_type: params.preview?.official_source_type || null,
    },
  };
}

async function readJsonBody(request: NextRequest): Promise<ConfirmRequestBody> {
  try {
    const body = (await request.json()) as ConfirmRequestBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

async function getCandidate(params: {
  supabase: AdminClient;
  candidateId: string;
}): Promise<{ candidate: CandidateRecord | null; error: string | null }> {
  const { data, error } = await params.supabase
    .from("official_event_candidates")
    .select(
      [
        "candidate_id",
        "provider",
        "provider_event_id",
        "provider_url",
        "event_name",
        "artist_name",
        "event_date",
        "venue_name",
        "city",
        "state",
        "country",
        "official_url",
        "ticket_url",
        "source_name",
        "source_type",
        "candidate_status",
        "confidence",
        "event_group_id",
        "notes",
      ].join(",")
    )
    .eq("candidate_id", params.candidateId)
    .maybeSingle();

  if (error) {
    return {
      candidate: null,
      error: error.message || "Failed to load official event candidate.",
    };
  }

  return {
    candidate: data ? (data as CandidateRecord) : null,
    error: null,
  };
}

async function getEventGroup(params: {
  supabase: AdminClient;
  eventGroupId: string;
}): Promise<{ eventGroup: EventGroupRecord | null; error: string | null }> {
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
        "official_status",
        "official_url",
        "official_source_type",
        "official_confidence",
        "official_notes",
      ].join(",")
    )
    .eq("group_id", params.eventGroupId)
    .maybeSingle();

  if (error) {
    return {
      eventGroup: null,
      error: error.message || "Failed to load event group.",
    };
  }

  return {
    eventGroup: data ? (data as EventGroupRecord) : null,
    error: null,
  };
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: "Official event candidate confirmation is not authorized.",
      },
      { status: 403 }
    );
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: "Supabase service role is not configured.",
      },
      { status: 500 }
    );
  }

  const body = await readJsonBody(request);
  const candidateId = normalizeText(body.candidate_id);
  const eventGroupId = normalizeText(body.event_group_id);
  const dryRun = normalizeBoolean(body.dryRun, true);
  const note = normalizeNullableText(body.note);

  if (!candidateId || !eventGroupId) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: "candidate_id and event_group_id are required.",
        dryRun,
        admin_summary: buildConfirmationAdminSummary({
          candidate: null,
          eventGroup: null,
          preview: null,
          safety: null,
          requestedDryRun: dryRun,
          effectiveDryRun: true,
          wroteChanges: false,
          reason: "candidate_id and event_group_id are required.",
        }),
      },
      { status: 400 }
    );
  }

  const candidateResult = await getCandidate({
    supabase,
    candidateId,
  });

  if (candidateResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: candidateResult.error,
        candidate_id: candidateId,
        event_group_id: eventGroupId,
        dryRun,
      },
      { status: 500 }
    );
  }

  if (!candidateResult.candidate) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: "Candidate was not found.",
        candidate_id: candidateId,
        event_group_id: eventGroupId,
        dryRun,
        admin_summary: buildConfirmationAdminSummary({
          candidate: null,
          eventGroup: null,
          preview: null,
          safety: null,
          requestedDryRun: dryRun,
          effectiveDryRun: true,
          wroteChanges: false,
          reason: "Candidate was not found.",
        }),
      },
      { status: 404 }
    );
  }

  const eventGroupResult = await getEventGroup({
    supabase,
    eventGroupId,
  });

  if (eventGroupResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: eventGroupResult.error,
        candidate_id: candidateId,
        event_group_id: eventGroupId,
        dryRun,
      },
      { status: 500 }
    );
  }

  if (!eventGroupResult.eventGroup) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: "Event group was not found.",
        candidate_id: candidateId,
        event_group_id: eventGroupId,
        dryRun,
        admin_summary: buildConfirmationAdminSummary({
          candidate: candidateResult.candidate,
          eventGroup: null,
          preview: null,
          safety: null,
          requestedDryRun: dryRun,
          effectiveDryRun: true,
          wroteChanges: false,
          reason: "Event group was not found.",
        }),
      },
      { status: 404 }
    );
  }

  const candidate = candidateResult.candidate;
  const eventGroup = eventGroupResult.eventGroup;
  const safety = evaluateConfirmationSafety({
    candidate,
    eventGroup,
  });

  const officialUrl = getCandidateOfficialUrl(candidate);
  const officialSourceType = getEventGroupSourceType(candidate);
  const confirmationNotes = buildManualConfirmationNotes({
    candidate,
    eventGroup,
    note,
  });

  const preview: ConfirmationPreview = {
    official_url: officialUrl || null,
    official_source_name: candidate.source_name || candidate.provider || "Manual review",
    official_source_url: candidate.provider_url || candidate.ticket_url || candidate.official_url || null,
    official_source_type: officialSourceType,
    official_status: "confirmed",
    official_confidence: Math.max(0, Math.min(100, Number(candidate.confidence || 0))),
    official_notes: confirmationNotes,
  };

  if (dryRun || !safety.canConfirm) {
    const reason = safety.canConfirm
      ? "Candidate can be manually confirmed. No changes were written because dryRun is true."
      : "Candidate cannot be confirmed safely for the selected event group.";

    return NextResponse.json({
      ok: safety.canConfirm,
      scope: "official-event-candidate-confirmation",
      mode: "dry_run",
      dryRun: true,
      requestedDryRun: dryRun,
      effectiveDryRun: true,
      canConfirm: safety.canConfirm,
      message: reason,
      candidate,
      eventGroup,
      preview,
      safety,
      wroteChanges: false,
      admin_summary: buildConfirmationAdminSummary({
        candidate,
        eventGroup,
        preview,
        safety,
        requestedDryRun: dryRun,
        effectiveDryRun: true,
        wroteChanges: false,
        reason,
      }),
    });
  }

  const now = new Date().toISOString();

  const { error: eventGroupUpdateError } = await supabase
    .from("event_groups")
    .update({
      official_url: preview.official_url,
      official_source_name: preview.official_source_name,
      official_source_url: preview.official_source_url,
      official_source_type: preview.official_source_type,
      official_status: "confirmed",
      official_confidence: preview.official_confidence,
      official_checked_at: now,
      official_notes: preview.official_notes,
    })
    .eq("group_id", eventGroup.group_id);

  if (eventGroupUpdateError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: eventGroupUpdateError.message || "Failed to update event group.",
        dryRun: false,
        requestedDryRun: false,
        effectiveDryRun: false,
        canConfirm: true,
        wroteChanges: false,
        admin_summary: buildConfirmationAdminSummary({
          candidate,
          eventGroup,
          preview,
          safety,
          requestedDryRun: false,
          effectiveDryRun: false,
          wroteChanges: false,
          reason: eventGroupUpdateError.message || "Failed to update event group.",
        }),
      },
      { status: 500 }
    );
  }

  const { error: candidateUpdateError } = await supabase
    .from("official_event_candidates")
    .update({
      candidate_status: "confirmed",
      event_group_id: eventGroup.group_id,
      updated_at: now,
      notes: confirmationNotes,
    })
    .eq("candidate_id", candidate.candidate_id);

  if (candidateUpdateError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-confirmation",
        message: candidateUpdateError.message || "Event group was updated, but candidate update failed.",
        dryRun: false,
        requestedDryRun: false,
        effectiveDryRun: false,
        canConfirm: true,
        wroteChanges: true,
        partialWrite: true,
        admin_summary: buildConfirmationAdminSummary({
          candidate,
          eventGroup,
          preview,
          safety,
          requestedDryRun: false,
          effectiveDryRun: false,
          wroteChanges: true,
          reason: candidateUpdateError.message || "Event group was updated, but candidate update failed.",
        }),
      },
      { status: 500 }
    );
  }

  const reason = "Candidate manually confirmed as official event source.";

  return NextResponse.json({
    ok: true,
    scope: "official-event-candidate-confirmation",
    mode: "confirmed",
    dryRun: false,
    requestedDryRun: false,
    effectiveDryRun: false,
    canConfirm: true,
    message: reason,
    candidate_id: candidate.candidate_id,
    event_group_id: eventGroup.group_id,
    official_url: preview.official_url,
    official_status: "confirmed",
    wroteChanges: true,
    admin_summary: buildConfirmationAdminSummary({
      candidate: {
        ...candidate,
        candidate_status: "confirmed",
        event_group_id: eventGroup.group_id,
      },
      eventGroup: {
        ...eventGroup,
        official_status: "confirmed",
      },
      preview,
      safety,
      requestedDryRun: false,
      effectiveDryRun: false,
      wroteChanges: true,
      reason,
    }),
  });
}