import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION =
  "mvp2-low-connectivity-reunion-runtime-v1";

const ALLOWED_ACTIONS = [
  "request_person",
  "respond_person",
  "set_meetup_consent",
  "revoke_consent",
  "update_location",
  "set_meetup_point",
  "clear_meetup_point",
] as const;

type ReunionAction =
  (typeof ALLOWED_ACTIONS)[number];

type ReunionPayload = {
  action?: unknown;
  event_group_id?: unknown;
  owner_user_id?: unknown;
  meetup_id?: unknown;
  consent_id?: unknown;
  expires_at?: unknown;
  accept?: unknown;
  active?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  accuracy_meters?: unknown;
  captured_at?: unknown;
  label?: unknown;
};

function normalizeText(
  value: unknown,
  maxLength = 200
): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isReunionAction(
  value: string
): value is ReunionAction {
  return ALLOWED_ACTIONS.includes(
    value as ReunionAction
  );
}

function asIsoDate(
  value: unknown
): string | null {
  const normalized = normalizeText(value, 64);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function asFiniteNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : null;
}

function jsonNoStore(
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
  });

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

function errorResponse(
  code: string,
  message: string,
  status: number
) {
  return jsonNoStore(
    {
      ok: false,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      error_code: code,
      message,
      database_write_performed: false,
    },
    status
  );
}

function getRpcFailureStatus(
  message: string
): number {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("auth_required") ||
    normalized.includes("authentication")
  ) {
    return 401;
  }

  if (
    normalized.includes("forbidden") ||
    normalized.includes("manager_required") ||
    normalized.includes("membership_required") ||
    normalized.includes("clubber_required") ||
    normalized.includes("relationship_blocked")
  ) {
    return 403;
  }

  if (
    normalized.includes("not_found")
  ) {
    return 404;
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("not_requested") ||
    normalized.includes("active_consent_required") ||
    normalized.includes("shared_meetup_required") ||
    normalized.includes("meetup_invalid") ||
    normalized.includes("event_invalid")
  ) {
    return 409;
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("required")
  ) {
    return 400;
  }

  return 500;
}

async function requireUser() {
  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}

export async function GET(
  request: NextRequest
) {
  const { supabase, user } =
    await requireUser();

  if (!user) {
    return errorResponse(
      "AUTH_REQUIRED",
      "Authentication required.",
      401
    );
  }

  const eventGroupId = normalizeText(
    request.nextUrl.searchParams.get(
      "event_group_id"
    ),
    64
  );

  const meetupId = normalizeText(
    request.nextUrl.searchParams.get(
      "meetup_id"
    ),
    64
  );

  if (
    !eventGroupId ||
    !isUuidLike(eventGroupId)
  ) {
    return errorResponse(
      "INVALID_EVENT_GROUP",
      "Valid event_group_id is required.",
      400
    );
  }

  if (
    meetupId &&
    !isUuidLike(meetupId)
  ) {
    return errorResponse(
      "INVALID_MEETUP",
      "Valid meetup_id is required.",
      400
    );
  }

  const {
    data: consentsData,
    error: consentsError,
  } = await supabase.rpc(
    "mhidas_read_event_reunion_consents_v1",
    {
      p_event_group_id: eventGroupId,
    }
  );

  if (consentsError) {
    return errorResponse(
      "CONSENTS_READ_FAILED",
      "Could not load reunion consent state.",
      getRpcFailureStatus(consentsError.message)
    );
  }

  const {
    data: locationsData,
    error: locationsError,
  } = await supabase.rpc(
    "mhidas_read_event_reunion_locations_v1",
    {
      p_event_group_id: eventGroupId,
      p_meetup_id: meetupId || null,
    }
  );

  if (locationsError) {
    return errorResponse(
      "LOCATIONS_READ_FAILED",
      "Could not load authorized reunion location state.",
      getRpcFailureStatus(locationsError.message)
    );
  }

  let meetupPoint: unknown = null;

  if (meetupId) {
    const {
      data: meetupPointData,
      error: meetupPointError,
    } = await supabase.rpc(
      "mhidas_read_event_reunion_meetup_point_v1",
      {
        p_event_group_id: eventGroupId,
        p_meetup_id: meetupId,
      }
    );

    if (meetupPointError) {
      return errorResponse(
        "MEETUP_POINT_READ_FAILED",
        "Could not load current group point.",
        getRpcFailureStatus(
          meetupPointError.message
        )
      );
    }

    meetupPoint = Array.isArray(meetupPointData)
      ? meetupPointData[0] ?? null
      : meetupPointData ?? null;
  }

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "event-reunion",
    mode: "read",
    database_write_performed: false,
    event_group_id: eventGroupId,
    meetup_id: meetupId || null,
    viewer_user_id: user.id,
    consents: Array.isArray(consentsData)
      ? consentsData
      : [],
    locations: Array.isArray(locationsData)
      ? locationsData
      : [],
    meetup_point: meetupPoint,
  });
}

export async function POST(
  request: NextRequest
) {
  const { supabase, user } =
    await requireUser();

  if (!user) {
    return errorResponse(
      "AUTH_REQUIRED",
      "Authentication required.",
      401
    );
  }

  let payload: ReunionPayload;

  try {
    payload =
      (await request.json()) as ReunionPayload;
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Invalid JSON body.",
      400
    );
  }

  const action = normalizeText(
    payload.action,
    32
  );

  if (!isReunionAction(action)) {
    return errorResponse(
      "INVALID_ACTION",
      "Invalid reunion action.",
      400
    );
  }

  if (action === "request_person") {
    const eventGroupId = normalizeText(
      payload.event_group_id,
      64
    );

    const ownerUserId = normalizeText(
      payload.owner_user_id,
      64
    );

    const expiresAt = asIsoDate(
      payload.expires_at
    );

    if (
      !isUuidLike(eventGroupId) ||
      !isUuidLike(ownerUserId) ||
      !expiresAt
    ) {
      return errorResponse(
        "INVALID_PERSON_REQUEST",
        "Valid event, person and expiration are required.",
        400
      );
    }

    const { data, error } =
      await supabase.rpc(
        "mhidas_request_event_reunion_person_v1",
        {
          p_event_group_id: eventGroupId,
          p_owner_user_id: ownerUserId,
          p_expires_at: expiresAt,
        }
      );

    if (error) {
      return errorResponse(
        "PERSON_REQUEST_FAILED",
        "Could not request temporary location sharing.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      mode: action,
      consent_id: data,
      database_write_performed: true,
    });
  }

  if (action === "respond_person") {
    const consentId = normalizeText(
      payload.consent_id,
      64
    );

    if (
      !isUuidLike(consentId) ||
      typeof payload.accept !== "boolean"
    ) {
      return errorResponse(
        "INVALID_PERSON_RESPONSE",
        "Valid consent_id and accept value are required.",
        400
      );
    }

    const { data, error } =
      await supabase.rpc(
        "mhidas_respond_event_reunion_person_v1",
        {
          p_consent_id: consentId,
          p_accept: payload.accept,
        }
      );

    if (error) {
      return errorResponse(
        "PERSON_RESPONSE_FAILED",
        "Could not update temporary location-sharing consent.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      mode: action,
      changed: data === true,
      database_write_performed:
        data === true,
    });
  }

  if (action === "set_meetup_consent") {
    const eventGroupId = normalizeText(
      payload.event_group_id,
      64
    );

    const meetupId = normalizeText(
      payload.meetup_id,
      64
    );

    if (
      !isUuidLike(eventGroupId) ||
      !isUuidLike(meetupId) ||
      typeof payload.active !== "boolean"
    ) {
      return errorResponse(
        "INVALID_MEETUP_CONSENT",
        "Valid event, Meetup and active value are required.",
        400
      );
    }

    const expiresAt = payload.active
      ? asIsoDate(payload.expires_at)
      : null;

    if (
      payload.active &&
      !expiresAt
    ) {
      return errorResponse(
        "INVALID_EXPIRATION",
        "Valid expiration is required when sharing is active.",
        400
      );
    }

    const { data, error } =
      await supabase.rpc(
        "mhidas_set_event_reunion_meetup_consent_v1",
        {
          p_event_group_id: eventGroupId,
          p_meetup_id: meetupId,
          p_expires_at: expiresAt,
          p_active: payload.active,
        }
      );

    if (error) {
      return errorResponse(
        "MEETUP_CONSENT_FAILED",
        "Could not update Meetup location-sharing consent.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      mode: action,
      consent_id: data,
      active: payload.active,
      database_write_performed:
        data !== null,
    });
  }

  if (action === "revoke_consent") {
    const consentId = normalizeText(
      payload.consent_id,
      64
    );

    if (!isUuidLike(consentId)) {
      return errorResponse(
        "INVALID_CONSENT",
        "Valid consent_id is required.",
        400
      );
    }

    const { data, error } =
      await supabase.rpc(
        "mhidas_revoke_event_reunion_consent_v1",
        {
          p_consent_id: consentId,
        }
      );

    if (error) {
      return errorResponse(
        "REVOKE_FAILED",
        "Could not stop temporary location sharing.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      mode: action,
      changed: data === true,
      database_write_performed:
        data === true,
    });
  }

  if (action === "update_location") {
    const eventGroupId = normalizeText(
      payload.event_group_id,
      64
    );

    const latitude = asFiniteNumber(
      payload.latitude
    );

    const longitude = asFiniteNumber(
      payload.longitude
    );

    const accuracyMeters = asFiniteNumber(
      payload.accuracy_meters
    );

    const capturedAt = asIsoDate(
      payload.captured_at
    );

    if (
      !isUuidLike(eventGroupId) ||
      latitude === null ||
      longitude === null ||
      accuracyMeters === null ||
      !capturedAt
    ) {
      return errorResponse(
        "INVALID_LOCATION",
        "Valid location snapshot is required.",
        400
      );
    }

    const { data, error } =
      await supabase.rpc(
        "mhidas_update_event_reunion_location_v1",
        {
          p_event_group_id: eventGroupId,
          p_latitude: latitude,
          p_longitude: longitude,
          p_accuracy_meters: accuracyMeters,
          p_captured_at: capturedAt,
        }
      );

    if (error) {
      return errorResponse(
        "LOCATION_UPDATE_FAILED",
        "Could not update temporary reunion location.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      mode: action,
      position_id: data,
      database_write_performed: true,
    });
  }

  if (action === "set_meetup_point") {
    const eventGroupId = normalizeText(
      payload.event_group_id,
      64
    );

    const meetupId = normalizeText(
      payload.meetup_id,
      64
    );

    const label = normalizeText(
      payload.label,
      160
    );

    const latitude = asFiniteNumber(
      payload.latitude
    );

    const longitude = asFiniteNumber(
      payload.longitude
    );

    const accuracyMeters =
      payload.accuracy_meters === null ||
      payload.accuracy_meters === undefined ||
      payload.accuracy_meters === ""
        ? null
        : asFiniteNumber(
            payload.accuracy_meters
          );

    const capturedAt = asIsoDate(
      payload.captured_at
    );

    const expiresAt = asIsoDate(
      payload.expires_at
    );

    if (
      !isUuidLike(eventGroupId) ||
      !isUuidLike(meetupId) ||
      label.length < 2 ||
      latitude === null ||
      longitude === null ||
      (
        payload.accuracy_meters !== null &&
        payload.accuracy_meters !== undefined &&
        payload.accuracy_meters !== "" &&
        accuracyMeters === null
      ) ||
      !capturedAt ||
      !expiresAt
    ) {
      return errorResponse(
        "INVALID_MEETUP_POINT",
        "Valid current group point is required.",
        400
      );
    }

    const { data, error } =
      await supabase.rpc(
        "mhidas_set_event_reunion_meetup_point_v1",
        {
          p_event_group_id: eventGroupId,
          p_meetup_id: meetupId,
          p_label: label,
          p_latitude: latitude,
          p_longitude: longitude,
          p_accuracy_meters: accuracyMeters,
          p_captured_at: capturedAt,
          p_expires_at: expiresAt,
        }
      );

    if (error) {
      return errorResponse(
        "MEETUP_POINT_SET_FAILED",
        "Could not update current group point.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-reunion",
      mode: action,
      meetup_point_id: data,
      database_write_performed: true,
    });
  }

  const eventGroupId = normalizeText(
    payload.event_group_id,
    64
  );

  const meetupId = normalizeText(
    payload.meetup_id,
    64
  );

  if (
    !isUuidLike(eventGroupId) ||
    !isUuidLike(meetupId)
  ) {
    return errorResponse(
      "INVALID_MEETUP_POINT_CLEAR",
      "Valid event and Meetup are required.",
      400
    );
  }

  const { data, error } =
    await supabase.rpc(
      "mhidas_clear_event_reunion_meetup_point_v1",
      {
        p_event_group_id: eventGroupId,
        p_meetup_id: meetupId,
      }
    );

  if (error) {
    return errorResponse(
      "MEETUP_POINT_CLEAR_FAILED",
      "Could not clear current group point.",
      getRpcFailureStatus(error.message)
    );
  }

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "event-reunion",
    mode: action,
    changed: data === true,
    database_write_performed:
      data === true,
  });
}
