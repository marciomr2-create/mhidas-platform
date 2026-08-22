// src/app/api/event-meetups/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ALLOWED_ACTIONS = [
  "create",
  "request_join",
  "decide_request",
  "cancel_request",
  "leave",
  "set_status",
] as const;

const ALLOWED_VISIBILITIES = ["public", "private"] as const;
const ALLOWED_DECISIONS = ["approved", "rejected"] as const;
const ALLOWED_LIFECYCLE_STATUSES = [
  "closed",
  "cancelled",
] as const;

type MeetupAction = (typeof ALLOWED_ACTIONS)[number];
type SocialVisibility = (typeof ALLOWED_VISIBILITIES)[number];
type RequestDecision = (typeof ALLOWED_DECISIONS)[number];
type LifecycleStatus =
  (typeof ALLOWED_LIFECYCLE_STATUSES)[number];
type JsonRecord = Record<string, unknown>;

type MeetupPayload = {
  action?: unknown;
  event_group_id?: unknown;
  meetup_id?: unknown;
  request_id?: unknown;
  name?: unknown;
  description?: unknown;
  meeting_point_label?: unknown;
  meeting_point_reference?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  max_members?: unknown;
  rules?: unknown;
  visibility?: unknown;
  expires_at?: unknown;
  message?: unknown;
  decision?: unknown;
  status?: unknown;
};

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function asNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

function asNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);

  if (!Number.isInteger(numeric)) {
    throw new Error("Expected an integer value.");
  }

  return numeric;
}

function asNullableIsoDate(value: unknown): string | null {
  const normalized = normalizeText(value, 64);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value.");
  }

  return parsed.toISOString();
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isMeetupAction(value: string): value is MeetupAction {
  return ALLOWED_ACTIONS.includes(value as MeetupAction);
}

function isSocialVisibility(value: string): value is SocialVisibility {
  return ALLOWED_VISIBILITIES.includes(value as SocialVisibility);
}

function isRequestDecision(value: string): value is RequestDecision {
  return ALLOWED_DECISIONS.includes(value as RequestDecision);
}

function isLifecycleStatus(value: string): value is LifecycleStatus {
  return ALLOWED_LIFECYCLE_STATUSES.includes(
    value as LifecycleStatus
  );
}

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      scope: "event-meetups",
      message,
    },
    { status }
  );
}

function buildSupabaseErrorResponse(
  message: string,
  details: string,
  status = 500
) {
  return NextResponse.json(
    {
      ok: false,
      scope: "event-meetups",
      message,
      details,
    },
    { status }
  );
}

function getRpcFailureStatus(message: string): number {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("authentication required") ||
    normalized.includes("jwt")
  ) {
    return 401;
  }

  if (
    normalized.includes("creator required") ||
    normalized.includes("owner required")
  ) {
    return 403;
  }

  if (normalized.includes("not found")) {
    return 404;
  }

  if (
    normalized.includes("already") ||
    normalized.includes("not accepting") ||
    normalized.includes("expired") ||
    normalized.includes("prevents") ||
    normalized.includes("capacity exceeded") ||
    normalized.includes("not pending") ||
    normalized.includes("not active") ||
    normalized.includes("transition not allowed") ||
    normalized.includes("must close")
  ) {
    return 409;
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("must be") ||
    normalized.includes("between")
  ) {
    return 400;
  }

  return 500;
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return buildErrorResponse("Authentication required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const eventGroupId = normalizeText(
    searchParams.get("event_group_id"),
    64
  );

  if (!eventGroupId || !isUuidLike(eventGroupId)) {
    return buildErrorResponse(
      "Valid event_group_id is required.",
      400
    );
  }

  const { data: meetupsData, error: meetupsError } = await supabase
    .from("event_meetups")
    .select(
      "meetup_id,event_group_id,creator_user_id,name,description,meeting_point_label,meeting_point_reference,starts_at,ends_at,max_members,rules,visibility,status,expires_at,closed_at,archived_at,cancelled_at,created_at,updated_at"
    )
    .eq("event_group_id", eventGroupId)
    .order("starts_at", { ascending: true });

  if (meetupsError) {
    return buildSupabaseErrorResponse(
      "Could not load event meetups.",
      meetupsError.message
    );
  }

  const meetupIds = (meetupsData ?? []).map(
    (meetup) => meetup.meetup_id
  );

  if (meetupIds.length === 0) {
    return NextResponse.json({
      ok: true,
      scope: "event-meetups",
      mode: "read",
      event_group_id: eventGroupId,
      viewer_user_id: user.id,
      meetups: [],
      members: [],
      requests: [],
      people: [],
    });
  }

  const [
    { data: membersData, error: membersError },
    { data: requestsData, error: requestsError },
  ] = await Promise.all([
    supabase
      .from("event_meetup_members")
      .select(
        "meetup_member_id,meetup_id,user_id,role,status,joined_at,left_at,status_changed_at,created_at,updated_at"
      )
      .in("meetup_id", meetupIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_meetup_join_requests")
      .select(
        "request_id,meetup_id,requester_user_id,status,message,decided_by_user_id,decided_at,cancelled_at,created_at,updated_at"
      )
      .in("meetup_id", meetupIds)
      .order("created_at", { ascending: false }),
  ]);

  if (membersError) {
    return buildSupabaseErrorResponse(
      "Could not load event meetup members.",
      membersError.message
    );
  }

  if (requestsError) {
    return buildSupabaseErrorResponse(
      "Could not load event meetup requests.",
      requestsError.message
    );
  }

  const personUserIds = Array.from(
    new Set([
      ...(meetupsData ?? []).map((meetup) =>
        String(meetup.creator_user_id || "")
      ),
      ...(membersData ?? []).map((member) =>
        String(member.user_id || "")
      ),
      ...(requestsData ?? []).map((requestRow) =>
        String(requestRow.requester_user_id || "")
      ),
    ].filter(Boolean))
  );

  const people: Array<{
    user_id: string;
    slug: string;
    label: string;
    city_base: string | null;
    club_photo_url: string | null;
  }> = [];

  if (personUserIds.length > 0) {
    const [
      { data: cardsData, error: cardsError },
      { data: profilesData, error: profilesError },
    ] = await Promise.all([
      supabase
        .from("cards")
        .select("user_id,slug,label,status,is_published")
        .in("user_id", personUserIds)
        .eq("status", "active")
        .eq("is_published", true),
      supabase
        .from("club_profiles")
        .select("user_id,city_base,club_photo_url")
        .in("user_id", personUserIds),
    ]);

    if (cardsError) {
      return buildSupabaseErrorResponse(
        "Could not load Clubber identities for event meetups.",
        cardsError.message
      );
    }

    if (profilesError) {
      return buildSupabaseErrorResponse(
        "Could not load Clubber profiles for event meetups.",
        profilesError.message
      );
    }

    const profilesByUserId = new Map(
      (profilesData ?? []).map((profile) => [
        String(profile.user_id),
        profile,
      ])
    );
    const seenUserIds = new Set<string>();

    for (const card of cardsData ?? []) {
      const userId = String(card.user_id || "").trim();
      const slug = normalizeText(card.slug, 200);

      if (!userId || !slug || seenUserIds.has(userId)) {
        continue;
      }

      seenUserIds.add(userId);
      const profile = profilesByUserId.get(userId);

      people.push({
        user_id: userId,
        slug,
        label: normalizeText(card.label, 120) || "Clubber",
        city_base: profile?.city_base
          ? normalizeText(profile.city_base, 160)
          : null,
        club_photo_url: profile?.club_photo_url
          ? normalizeText(profile.club_photo_url, 1000)
          : null,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    scope: "event-meetups",
    mode: "read",
    event_group_id: eventGroupId,
    viewer_user_id: user.id,
    meetups: meetupsData ?? [],
    members: membersData ?? [],
    requests: requestsData ?? [],
    people,
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return buildErrorResponse("Authentication required.", 401);
  }

  let payload: MeetupPayload;

  try {
    payload = (await request.json()) as MeetupPayload;
  } catch {
    return buildErrorResponse("Invalid JSON body.", 400);
  }

  const action = normalizeText(payload.action, 32);

  if (!isMeetupAction(action)) {
    return buildErrorResponse("Invalid meetup action.", 400);
  }

  if (action === "create") {
    const eventGroupId = normalizeText(payload.event_group_id, 64);
    const name = normalizeText(payload.name, 80);
    const meetingPointLabel = normalizeText(
      payload.meeting_point_label,
      160
    );
    const visibility = normalizeText(
      payload.visibility || "public",
      24
    );

    if (!eventGroupId || !isUuidLike(eventGroupId)) {
      return buildErrorResponse(
        "Valid event_group_id is required.",
        400
      );
    }

    if (name.length < 3) {
      return buildErrorResponse(
        "Meetup name must contain at least 3 characters.",
        400
      );
    }

    if (meetingPointLabel.length < 2) {
      return buildErrorResponse(
        "Meeting point is required.",
        400
      );
    }

    if (!isSocialVisibility(visibility)) {
      return buildErrorResponse(
        "Invalid meetup visibility.",
        400
      );
    }

    let startsAt: string | null;
    let endsAt: string | null;
    let expiresAt: string | null;
    let maxMembers: number | null;

    try {
      startsAt = asNullableIsoDate(payload.starts_at);
      endsAt = asNullableIsoDate(payload.ends_at);
      expiresAt = asNullableIsoDate(payload.expires_at);
      maxMembers = asNullableInteger(payload.max_members) ?? 20;
    } catch (error) {
      return buildErrorResponse(
        error instanceof Error
          ? error.message
          : "Invalid meetup details.",
        400
      );
    }

    if (!startsAt) {
      return buildErrorResponse("starts_at is required.", 400);
    }

    const startsAtMs = new Date(startsAt).getTime();
    const endsAtMs = endsAt ? new Date(endsAt).getTime() : null;

    if (startsAtMs <= Date.now()) {
      return buildErrorResponse(
        "starts_at must be in the future.",
        400
      );
    }

    if (endsAtMs !== null && endsAtMs <= startsAtMs) {
      return buildErrorResponse(
        "ends_at must be after starts_at.",
        400
      );
    }

    if (maxMembers < 2 || maxMembers > 250) {
      return buildErrorResponse(
        "max_members must be between 2 and 250.",
        400
      );
    }

    const rpcArgs: JsonRecord = {
      p_event_group_id: eventGroupId,
      p_name: name,
      p_description: asNullableText(payload.description, 500),
      p_meeting_point_label: meetingPointLabel,
      p_meeting_point_reference: asNullableText(
        payload.meeting_point_reference,
        500
      ),
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_max_members: maxMembers,
      p_rules: asNullableText(payload.rules, 2000),
      p_visibility: visibility,
      p_expires_at: expiresAt,
    };

    const { data, error } = await supabase.rpc(
      "mhidas_create_event_meetup",
      rpcArgs
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not create event meetup.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-meetups",
      mode: "create",
      meetup_id: data,
    });
  }

  if (action === "request_join") {
    const meetupId = normalizeText(payload.meetup_id, 64);

    if (!meetupId || !isUuidLike(meetupId)) {
      return buildErrorResponse(
        "Valid meetup_id is required.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_request_join_event_meetup",
      {
        p_meetup_id: meetupId,
        p_message: asNullableText(payload.message, 500),
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not request event meetup participation.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-meetups",
      mode: "request_join",
      request_id: data,
    });
  }

  if (action === "cancel_request") {
    const requestId = normalizeText(payload.request_id, 64);

    if (!requestId || !isUuidLike(requestId)) {
      return buildErrorResponse(
        "Valid request_id is required.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_cancel_event_meetup_request",
      {
        p_request_id: requestId,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not cancel event meetup request.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-meetups",
      mode: "cancel_request",
      cancelled: data === true,
    });
  }

  if (action === "leave") {
    const meetupId = normalizeText(payload.meetup_id, 64);

    if (!meetupId || !isUuidLike(meetupId)) {
      return buildErrorResponse(
        "Valid meetup_id is required.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_leave_event_meetup",
      {
        p_meetup_id: meetupId,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not leave event meetup.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-meetups",
      mode: "leave",
      left: data === true,
    });
  }

  if (action === "set_status") {
    const meetupId = normalizeText(payload.meetup_id, 64);
    const status = normalizeText(payload.status, 24);

    if (!meetupId || !isUuidLike(meetupId)) {
      return buildErrorResponse(
        "Valid meetup_id is required.",
        400
      );
    }

    if (!isLifecycleStatus(status)) {
      return buildErrorResponse(
        "Invalid meetup lifecycle status.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_set_event_meetup_status",
      {
        p_meetup_id: meetupId,
        p_status: status,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not update event meetup status.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-meetups",
      mode: "set_status",
      status,
      updated: data === true,
    });
  }

  const requestId = normalizeText(payload.request_id, 64);
  const decision = normalizeText(payload.decision, 24);

  if (!requestId || !isUuidLike(requestId)) {
    return buildErrorResponse(
      "Valid request_id is required.",
      400
    );
  }

  if (!isRequestDecision(decision)) {
    return buildErrorResponse(
      "Invalid meetup request decision.",
      400
    );
  }

  const { data, error } = await supabase.rpc(
    "mhidas_decide_event_meetup_request",
    {
      p_request_id: requestId,
      p_decision: decision,
    }
  );

  if (error) {
    return buildSupabaseErrorResponse(
      "Could not decide event meetup request.",
      error.message,
      getRpcFailureStatus(error.message)
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-meetups",
    mode: "decide_request",
    decided: data === true,
  });
}
