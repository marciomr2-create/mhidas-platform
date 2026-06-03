// src/app/api/official-events/candidates/decision/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AdminClient = {
  from: (table: string) => any;
};

type CandidateStatus = "probable" | "review" | "confirmed" | "rejected" | "expired";

type ReviewDecision =
  | "reject"
  | "expire"
  | "mark_review"
  | "mark_probable"
  | "add_note";

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
  candidate_status: CandidateStatus;
  confidence: number | null;
  event_group_id: string | null;
  notes: string | null;
  updated_at: string | null;
};

type DecisionRequestBody = {
  candidate_id?: unknown;
  decision?: unknown;
  dryRun?: unknown;
  note?: unknown;
};

type DecisionSafety = {
  canApply: boolean;
  blockingReasons: string[];
  warnings: string[];
  checks: Record<string, boolean>;
};

type DecisionPreview = {
  candidate_id: string;
  current_status: CandidateStatus;
  next_status: CandidateStatus;
  decision: ReviewDecision;
  willChangeStatus: boolean;
  willUpdateNotes: boolean;
  notesPreview: string;
};

type DecisionAdminSummary = {
  requestedDryRun: boolean;
  effectiveDryRun: boolean;
  canApply: boolean;
  wroteChanges: boolean;
  canConfirmAutomatically: false;
  decision: ReviewDecision | null;
  currentStatus: CandidateStatus | null;
  nextStatus: CandidateStatus | null;
  showApplyButton: boolean;
  showDryRunButton: boolean;
  nextRecommendedAction:
    | "apply_decision"
    | "run_dry_run"
    | "review_blocking_reasons"
    | "already_confirmed"
    | "already_in_target_status"
    | "missing_required_fields"
    | "candidate_not_found"
    | "decision_applied"
    | "none";
  reason: string;
  candidate: {
    candidate_id: string | null;
    event_name: string | null;
    provider: string | null;
    candidate_status: CandidateStatus | null;
    event_group_id: string | null;
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

function normalizeDecision(value: unknown): ReviewDecision | null {
  const text = normalizeText(value).toLowerCase();

  if (text === "reject") return "reject";
  if (text === "expire") return "expire";
  if (text === "mark_review") return "mark_review";
  if (text === "mark_probable") return "mark_probable";
  if (text === "add_note") return "add_note";

  return null;
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

function getTargetStatus(params: {
  currentStatus: CandidateStatus;
  decision: ReviewDecision;
}): CandidateStatus {
  if (params.decision === "reject") return "rejected";
  if (params.decision === "expire") return "expired";
  if (params.decision === "mark_review") return "review";
  if (params.decision === "mark_probable") return "probable";

  return params.currentStatus;
}

function buildDecisionNotes(params: {
  candidate: CandidateRecord;
  decision: ReviewDecision;
  note: string | null;
  now: string;
}): string {
  const previousNotes = normalizeText(params.candidate.notes);
  const noteText = params.note || "No admin note provided.";

  const decisionLine = [
    `[${params.now}]`,
    `Admin decision: ${params.decision}.`,
    `Previous status: ${params.candidate.candidate_status}.`,
    `Note: ${noteText}`,
  ].join(" ");

  if (!previousNotes) {
    return decisionLine;
  }

  return `${previousNotes}\n${decisionLine}`;
}

function evaluateDecisionSafety(params: {
  candidate: CandidateRecord;
  decision: ReviewDecision;
  note: string | null;
  targetStatus: CandidateStatus;
}): DecisionSafety {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  const isConfirmed = params.candidate.candidate_status === "confirmed";
  const isAddNote = params.decision === "add_note";
  const hasAdminNote = Boolean(params.note);
  const statusWillChange = params.candidate.candidate_status !== params.targetStatus;

  if (isConfirmed && !isAddNote) {
    blockingReasons.push(
      "Confirmed candidates cannot be moved by the review decision endpoint."
    );
  }

  if (!isAddNote && !statusWillChange) {
    blockingReasons.push("Candidate is already in the requested target status.");
  }

  if (isAddNote && !hasAdminNote) {
    blockingReasons.push("Administrative note is required when decision is add_note.");
  }

  if (!hasAdminNote) {
    warnings.push("No administrative note was provided.");
  }

  if (params.candidate.event_group_id && params.decision === "reject") {
    warnings.push(
      "Candidate is linked to an event_group. Review the link before rejecting."
    );
  }

  return {
    canApply: blockingReasons.length === 0,
    blockingReasons,
    warnings,
    checks: {
      isConfirmed,
      isAddNote,
      hasAdminNote,
      statusWillChange,
      hasEventGroup: Boolean(params.candidate.event_group_id),
    },
  };
}

function buildDecisionPreview(params: {
  candidate: CandidateRecord;
  decision: ReviewDecision;
  targetStatus: CandidateStatus;
  notesPreview: string;
}): DecisionPreview {
  return {
    candidate_id: params.candidate.candidate_id,
    current_status: params.candidate.candidate_status,
    next_status: params.targetStatus,
    decision: params.decision,
    willChangeStatus: params.candidate.candidate_status !== params.targetStatus,
    willUpdateNotes: true,
    notesPreview: params.notesPreview,
  };
}

function buildDecisionAdminSummary(params: {
  candidate: CandidateRecord | null;
  decision: ReviewDecision | null;
  targetStatus: CandidateStatus | null;
  safety: DecisionSafety | null;
  requestedDryRun: boolean;
  effectiveDryRun: boolean;
  wroteChanges: boolean;
  reason: string;
}): DecisionAdminSummary {
  const candidate = params.candidate;
  const safety = params.safety;
  const currentStatus = candidate?.candidate_status || null;
  const targetStatus = params.targetStatus;

  let nextRecommendedAction: DecisionAdminSummary["nextRecommendedAction"] = "none";
  let showApplyButton = false;
  let showDryRunButton = false;

  if (!params.decision || !candidate) {
    nextRecommendedAction = candidate ? "missing_required_fields" : "candidate_not_found";
  } else if (currentStatus === "confirmed" && params.decision !== "add_note") {
    nextRecommendedAction = "already_confirmed";
  } else if (!safety?.canApply) {
    const alreadyInTargetStatus =
      Boolean(currentStatus && targetStatus && currentStatus === targetStatus) &&
      params.decision !== "add_note";

    nextRecommendedAction = alreadyInTargetStatus
      ? "already_in_target_status"
      : "review_blocking_reasons";
    showDryRunButton = true;
  } else if (params.wroteChanges) {
    nextRecommendedAction = "decision_applied";
  } else if (params.effectiveDryRun) {
    nextRecommendedAction = "apply_decision";
    showApplyButton = true;
  } else {
    nextRecommendedAction = "run_dry_run";
    showDryRunButton = true;
  }

  return {
    requestedDryRun: params.requestedDryRun,
    effectiveDryRun: params.effectiveDryRun,
    canApply: Boolean(safety?.canApply),
    wroteChanges: params.wroteChanges,
    canConfirmAutomatically: false,
    decision: params.decision,
    currentStatus,
    nextStatus: targetStatus,
    showApplyButton,
    showDryRunButton,
    nextRecommendedAction,
    reason: params.reason,
    candidate: {
      candidate_id: candidate?.candidate_id || null,
      event_name: candidate?.event_name || null,
      provider: candidate?.provider || null,
      candidate_status: currentStatus,
      event_group_id: candidate?.event_group_id || null,
    },
  };
}

async function readJsonBody(request: NextRequest): Promise<DecisionRequestBody> {
  try {
    const body = (await request.json()) as DecisionRequestBody;
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
        "updated_at",
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

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-review-decision",
        message: "Official event candidate review decision is not authorized.",
      },
      { status: 403 }
    );
  }

  const supabase = getAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-review-decision",
        message: "Supabase service role is not configured.",
      },
      { status: 500 }
    );
  }

  const body = await readJsonBody(request);
  const candidateId = normalizeText(body.candidate_id);
  const decision = normalizeDecision(body.decision);
  const dryRun = normalizeBoolean(body.dryRun, true);
  const note = normalizeNullableText(body.note);

  if (!candidateId || !decision) {
    const reason = "candidate_id and valid decision are required.";

    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-review-decision",
        message: reason,
        dryRun,
        requestedDryRun: dryRun,
        effectiveDryRun: true,
        wroteChanges: false,
        admin_summary: buildDecisionAdminSummary({
          candidate: null,
          decision,
          targetStatus: null,
          safety: null,
          requestedDryRun: dryRun,
          effectiveDryRun: true,
          wroteChanges: false,
          reason,
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
        scope: "official-event-candidate-review-decision",
        message: candidateResult.error,
        candidate_id: candidateId,
        dryRun,
      },
      { status: 500 }
    );
  }

  if (!candidateResult.candidate) {
    const reason = "Candidate was not found.";

    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-review-decision",
        message: reason,
        candidate_id: candidateId,
        dryRun,
        requestedDryRun: dryRun,
        effectiveDryRun: true,
        wroteChanges: false,
        admin_summary: buildDecisionAdminSummary({
          candidate: null,
          decision,
          targetStatus: null,
          safety: null,
          requestedDryRun: dryRun,
          effectiveDryRun: true,
          wroteChanges: false,
          reason,
        }),
      },
      { status: 404 }
    );
  }

  const candidate = candidateResult.candidate;
  const targetStatus = getTargetStatus({
    currentStatus: candidate.candidate_status,
    decision,
  });
  const now = new Date().toISOString();
  const notesPreview = buildDecisionNotes({
    candidate,
    decision,
    note,
    now,
  });
  const safety = evaluateDecisionSafety({
    candidate,
    decision,
    note,
    targetStatus,
  });
  const preview = buildDecisionPreview({
    candidate,
    decision,
    targetStatus,
    notesPreview,
  });

  if (dryRun || !safety.canApply) {
    const reason = safety.canApply
      ? "Decision can be applied. No changes were written because dryRun is true."
      : "Decision cannot be applied safely.";

    return NextResponse.json({
      ok: safety.canApply,
      scope: "official-event-candidate-review-decision",
      mode: "dry_run",
      dryRun: true,
      requestedDryRun: dryRun,
      effectiveDryRun: true,
      canApply: safety.canApply,
      message: reason,
      candidate,
      decision,
      targetStatus,
      preview,
      safety,
      wroteChanges: false,
      admin_summary: buildDecisionAdminSummary({
        candidate,
        decision,
        targetStatus,
        safety,
        requestedDryRun: dryRun,
        effectiveDryRun: true,
        wroteChanges: false,
        reason,
      }),
    });
  }

  const updatePayload: {
    candidate_status?: CandidateStatus;
    updated_at: string;
    notes: string;
  } = {
    updated_at: now,
    notes: notesPreview,
  };

  if (decision !== "add_note") {
    updatePayload.candidate_status = targetStatus;
  }

  const { error: updateError } = await supabase
    .from("official_event_candidates")
    .update(updatePayload)
    .eq("candidate_id", candidate.candidate_id);

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-candidate-review-decision",
        message: updateError.message || "Failed to apply review decision.",
        candidate_id: candidate.candidate_id,
        decision,
        targetStatus,
        dryRun: false,
        requestedDryRun: false,
        effectiveDryRun: false,
        canApply: true,
        wroteChanges: false,
        admin_summary: buildDecisionAdminSummary({
          candidate,
          decision,
          targetStatus,
          safety,
          requestedDryRun: false,
          effectiveDryRun: false,
          wroteChanges: false,
          reason: updateError.message || "Failed to apply review decision.",
        }),
      },
      { status: 500 }
    );
  }

  const reason = "Review decision applied successfully.";

  return NextResponse.json({
    ok: true,
    scope: "official-event-candidate-review-decision",
    mode: "decision_applied",
    dryRun: false,
    requestedDryRun: false,
    effectiveDryRun: false,
    canApply: true,
    message: reason,
    candidate_id: candidate.candidate_id,
    decision,
    previous_status: candidate.candidate_status,
    candidate_status: targetStatus,
    wroteChanges: true,
    admin_summary: buildDecisionAdminSummary({
      candidate: {
        ...candidate,
        candidate_status: targetStatus,
        notes: notesPreview,
        updated_at: now,
      },
      decision,
      targetStatus,
      safety,
      requestedDryRun: false,
      effectiveDryRun: false,
      wroteChanges: true,
      reason,
    }),
  });
}