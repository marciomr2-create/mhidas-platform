// src/app/api/event-rides/route.ts

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

const ALLOWED_MODES = ["offer", "seek"] as const;
const ALLOWED_DIRECTIONS = [
  "outbound",
  "return",
  "round_trip",
] as const;
const ALLOWED_VISIBILITIES = ["public", "private"] as const;
const ALLOWED_DECISIONS = ["approved", "rejected"] as const;
const ALLOWED_LIFECYCLE_STATUSES = [
  "closed",
  "cancelled",
] as const;

type RideAction = (typeof ALLOWED_ACTIONS)[number];
type RideMode = (typeof ALLOWED_MODES)[number];
type RideDirection = (typeof ALLOWED_DIRECTIONS)[number];
type SocialVisibility = (typeof ALLOWED_VISIBILITIES)[number];
type RequestDecision = (typeof ALLOWED_DECISIONS)[number];
type LifecycleStatus =
  (typeof ALLOWED_LIFECYCLE_STATUSES)[number];
type JsonRecord = Record<string, unknown>;

type RidePayload = {
  action?: unknown;
  event_group_id?: unknown;
  ride_id?: unknown;
  request_id?: unknown;
  mode?: unknown;
  direction?: unknown;
  origin_label?: unknown;
  destination_label?: unknown;
  departure_at?: unknown;
  return_at?: unknown;
  seats_available?: unknown;
  seats_requested?: unknown;
  contribution_note?: unknown;
  transport_type?: unknown;
  notes?: unknown;
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

function isRideAction(value: string): value is RideAction {
  return ALLOWED_ACTIONS.includes(value as RideAction);
}

function isRideMode(value: string): value is RideMode {
  return ALLOWED_MODES.includes(value as RideMode);
}

function isRideDirection(value: string): value is RideDirection {
  return ALLOWED_DIRECTIONS.includes(value as RideDirection);
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
      scope: "event-rides",
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
      scope: "event-rides",
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

  const { data: ridesData, error: ridesError } = await supabase
    .from("event_rides")
    .select(
      "ride_id,event_group_id,creator_user_id,mode,direction,origin_label,destination_label,departure_at,return_at,seats_available,contribution_note,transport_type,notes,visibility,status,expires_at,closed_at,archived_at,cancelled_at,created_at,updated_at"
    )
    .eq("event_group_id", eventGroupId)
    .order("created_at", { ascending: false });

  if (ridesError) {
    return buildSupabaseErrorResponse(
      "Could not load event rides.",
      ridesError.message
    );
  }

  const rideIds = (ridesData ?? []).map((ride) => ride.ride_id);

  if (rideIds.length === 0) {
    return NextResponse.json({
      ok: true,
      scope: "event-rides",
      mode: "read",
      event_group_id: eventGroupId,
      viewer_user_id: user.id,
      rides: [],
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
      .from("event_ride_members")
      .select(
        "ride_member_id,ride_id,user_id,role,status,joined_at,left_at,status_changed_at,created_at,updated_at"
      )
      .in("ride_id", rideIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_ride_join_requests")
      .select(
        "request_id,ride_id,requester_user_id,seats_requested,status,message,decided_by_user_id,decided_at,cancelled_at,created_at,updated_at"
      )
      .in("ride_id", rideIds)
      .order("created_at", { ascending: false }),
  ]);

  if (membersError) {
    return buildSupabaseErrorResponse(
      "Could not load event ride members.",
      membersError.message
    );
  }

  if (requestsError) {
    return buildSupabaseErrorResponse(
      "Could not load event ride requests.",
      requestsError.message
    );
  }

  const personUserIds = Array.from(
    new Set([
      ...(ridesData ?? []).map((ride) =>
        String(ride.creator_user_id || "")
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
        "Could not load Clubber identities for event rides.",
        cardsError.message
      );
    }

    if (profilesError) {
      return buildSupabaseErrorResponse(
        "Could not load Clubber profiles for event rides.",
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
    scope: "event-rides",
    mode: "read",
    event_group_id: eventGroupId,
    viewer_user_id: user.id,
    rides: ridesData ?? [],
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

  let payload: RidePayload;

  try {
    payload = (await request.json()) as RidePayload;
  } catch {
    return buildErrorResponse("Invalid JSON body.", 400);
  }

  const action = normalizeText(payload.action, 32);

  if (!isRideAction(action)) {
    return buildErrorResponse("Invalid ride action.", 400);
  }

  if (action === "create") {
    const eventGroupId = normalizeText(payload.event_group_id, 64);
    const mode = normalizeText(payload.mode, 24);
    const direction = normalizeText(payload.direction, 24);
    const originLabel = normalizeText(payload.origin_label, 120);
    const destinationLabel = normalizeText(
      payload.destination_label,
      120
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

    if (!isRideMode(mode)) {
      return buildErrorResponse("Invalid ride mode.", 400);
    }

    if (!isRideDirection(direction)) {
      return buildErrorResponse(
        "Invalid ride direction.",
        400
      );
    }

    if (!originLabel || !destinationLabel) {
      return buildErrorResponse(
        "Origin and destination are required.",
        400
      );
    }

    if (!isSocialVisibility(visibility)) {
      return buildErrorResponse(
        "Invalid ride visibility.",
        400
      );
    }

    let departureAt: string | null;
    let returnAt: string | null;
    let expiresAt: string | null;
    let seatsAvailable: number | null;

    try {
      departureAt = asNullableIsoDate(payload.departure_at);
      returnAt = asNullableIsoDate(payload.return_at);
      expiresAt = asNullableIsoDate(payload.expires_at);
      seatsAvailable = asNullableInteger(payload.seats_available);
    } catch (error) {
      return buildErrorResponse(
        error instanceof Error
          ? error.message
          : "Invalid ride details.",
        400
      );
    }

    if (
      seatsAvailable !== null &&
      (seatsAvailable < 1 || seatsAvailable > 50)
    ) {
      return buildErrorResponse(
        "seats_available must be between 1 and 50.",
        400
      );
    }

    const rpcArgs: JsonRecord = {
      p_event_group_id: eventGroupId,
      p_mode: mode,
      p_direction: direction,
      p_origin_label: originLabel,
      p_destination_label: destinationLabel,
      p_departure_at: departureAt,
      p_return_at: returnAt,
      p_seats_available: seatsAvailable,
      p_contribution_note: asNullableText(
        payload.contribution_note,
        180
      ),
      p_transport_type: asNullableText(
        payload.transport_type,
        60
      ),
      p_notes: asNullableText(payload.notes, 1000),
      p_visibility: visibility,
      p_expires_at: expiresAt,
    };

    const { data, error } = await supabase.rpc(
      "mhidas_create_event_ride",
      rpcArgs
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not create event ride.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-rides",
      mode: "create",
      ride_id: data,
    });
  }

  if (action === "request_join") {
    const rideId = normalizeText(payload.ride_id, 64);

    if (!rideId || !isUuidLike(rideId)) {
      return buildErrorResponse(
        "Valid ride_id is required.",
        400
      );
    }

    let seatsRequested: number | null;

    try {
      seatsRequested =
        asNullableInteger(payload.seats_requested) ?? 1;
    } catch (error) {
      return buildErrorResponse(
        error instanceof Error
          ? error.message
          : "Invalid seats_requested.",
        400
      );
    }

    if (seatsRequested < 1 || seatsRequested > 10) {
      return buildErrorResponse(
        "seats_requested must be between 1 and 10.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_request_join_event_ride",
      {
        p_ride_id: rideId,
        p_seats_requested: seatsRequested,
        p_message: asNullableText(payload.message, 500),
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not request event ride participation.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-rides",
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
      "mhidas_cancel_event_ride_request",
      {
        p_request_id: requestId,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not cancel event ride request.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-rides",
      mode: "cancel_request",
      cancelled: data === true,
    });
  }

  if (action === "leave") {
    const rideId = normalizeText(payload.ride_id, 64);

    if (!rideId || !isUuidLike(rideId)) {
      return buildErrorResponse(
        "Valid ride_id is required.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_leave_event_ride",
      {
        p_ride_id: rideId,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not leave event ride.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-rides",
      mode: "leave",
      left: data === true,
    });
  }

  if (action === "set_status") {
    const rideId = normalizeText(payload.ride_id, 64);
    const status = normalizeText(payload.status, 24);

    if (!rideId || !isUuidLike(rideId)) {
      return buildErrorResponse(
        "Valid ride_id is required.",
        400
      );
    }

    if (!isLifecycleStatus(status)) {
      return buildErrorResponse(
        "Invalid ride lifecycle status.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_set_event_ride_status",
      {
        p_ride_id: rideId,
        p_status: status,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not update event ride status.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-rides",
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
      "Invalid ride request decision.",
      400
    );
  }

  const { data, error } = await supabase.rpc(
    "mhidas_decide_event_ride_request",
    {
      p_request_id: requestId,
      p_decision: decision,
    }
  );

  if (error) {
    return buildSupabaseErrorResponse(
      "Could not decide event ride request.",
      error.message,
      getRpcFailureStatus(error.message)
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-rides",
    mode: "decide_request",
    decided: data === true,
  });
}
