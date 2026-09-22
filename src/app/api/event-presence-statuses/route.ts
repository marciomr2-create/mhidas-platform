import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION =
  "mvp2-status-point-safety-runtime-v1";

const ALLOWED_ACTIONS = ["set", "clear"] as const;

const ALLOWED_STATUSES = [
  "arrived",
  "entering",
  "at_stage",
  "moving_stage",
  "at_meeting_point",
  "looking_for_group",
  "leaving",
  "safe_home",
] as const;

type PresenceAction =
  (typeof ALLOWED_ACTIONS)[number];

type PresenceStatus =
  (typeof ALLOWED_STATUSES)[number];

type PresencePayload = {
  action?: unknown;
  event_group_id?: unknown;
  status?: unknown;
  meetup_id?: unknown;
  set_id?: unknown;
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

function isPresenceAction(
  value: string
): value is PresenceAction {
  return ALLOWED_ACTIONS.includes(
    value as PresenceAction
  );
}

function isPresenceStatus(
  value: string
): value is PresenceStatus {
  return ALLOWED_STATUSES.includes(
    value as PresenceStatus
  );
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
      scope: "event-presence-statuses",
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
    normalized.includes("authentication required")
  ) {
    return 401;
  }

  if (
    normalized.includes(
      "active published clubber profile required"
    )
  ) {
    return 403;
  }

  if (
    normalized.includes("not found")
  ) {
    return 404;
  }

  if (
    normalized.includes("approved active meetup") ||
    normalized.includes("does not match")
  ) {
    return 409;
  }

  if (
    normalized.includes("required") ||
    normalized.includes("invalid") ||
    normalized.includes("does not accept")
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

  const { data, error } = await supabase.rpc(
    "mhidas_read_event_presence_statuses",
    {
      p_event_group_id: eventGroupId,
    }
  );

  if (error) {
    return errorResponse(
      "PRESENCE_READ_FAILED",
      "Could not load event presence statuses.",
      getRpcFailureStatus(error.message)
    );
  }

  const statuses = Array.isArray(data)
    ? data
    : [];

  const userIds = Array.from(
    new Set(
      statuses
        .map((row: any) =>
          normalizeText(row?.user_id, 64)
        )
        .filter(
          (userId) =>
            Boolean(userId) &&
            isUuidLike(userId)
        )
    )
  );

  const people: Array<{
    user_id: string;
    slug: string;
    label: string;
    city_base: string | null;
    club_photo_url: string | null;
  }> = [];

  if (userIds.length > 0) {
    const [
      { data: cardsData, error: cardsError },
      {
        data: profilesData,
        error: profilesError,
      },
    ] = await Promise.all([
      supabase
        .from("cards")
        .select(
          "user_id,slug,label,status,is_published"
        )
        .in("user_id", userIds)
        .eq("status", "active")
        .eq("is_published", true),

      supabase
        .from("club_profiles")
        .select(
          "user_id,city_base,club_photo_url"
        )
        .in("user_id", userIds),
    ]);

    if (cardsError || profilesError) {
      return errorResponse(
        "PRESENCE_IDENTITY_READ_FAILED",
        "Could not load Clubber identities.",
        500
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
      const userId = normalizeText(
        card.user_id,
        64
      );

      const slug = normalizeText(
        card.slug,
        200
      );

      if (
        !userId ||
        !slug ||
        seenUserIds.has(userId)
      ) {
        continue;
      }

      seenUserIds.add(userId);

      const profile =
        profilesByUserId.get(userId);

      people.push({
        user_id: userId,
        slug,
        label:
          normalizeText(
            card.label,
            120
          ) || "Clubber",
        city_base: profile?.city_base
          ? normalizeText(
              profile.city_base,
              160
            )
          : null,
        club_photo_url:
          profile?.club_photo_url
            ? normalizeText(
                profile.club_photo_url,
                1000
              )
            : null,
      });
    }
  }

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "event-presence-statuses",
    mode: "read",
    database_write_performed: false,
    event_group_id: eventGroupId,
    viewer_user_id: user.id,
    statuses,
    people,
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

  let payload: PresencePayload;

  try {
    payload =
      (await request.json()) as PresencePayload;
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Invalid JSON body.",
      400
    );
  }

  const action = normalizeText(
    payload.action,
    24
  );

  const eventGroupId = normalizeText(
    payload.event_group_id,
    64
  );

  if (!isPresenceAction(action)) {
    return errorResponse(
      "INVALID_ACTION",
      "Invalid presence action.",
      400
    );
  }

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

  if (action === "clear") {
    const { data, error } =
      await supabase.rpc(
        "mhidas_clear_event_presence_status",
        {
          p_event_group_id: eventGroupId,
        }
      );

    if (error) {
      return errorResponse(
        "CLEAR_FAILED",
        "Could not clear event presence status.",
        getRpcFailureStatus(error.message)
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-presence-statuses",
      mode: "clear",
      event_group_id: eventGroupId,
      changed: data === true,
      database_write_performed:
        data === true,
    });
  }

  const status = normalizeText(
    payload.status,
    32
  );

  if (!isPresenceStatus(status)) {
    return errorResponse(
      "INVALID_STATUS",
      "Invalid presence status.",
      400
    );
  }

  const meetupId = normalizeText(
    payload.meetup_id,
    64
  );

  const setId = normalizeText(
    payload.set_id,
    64
  );

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

  if (
    setId &&
    !isUuidLike(setId)
  ) {
    return errorResponse(
      "INVALID_SET",
      "Valid set_id is required.",
      400
    );
  }

  if (
    status === "at_meeting_point" &&
    (!meetupId || setId)
  ) {
    return errorResponse(
      "MEETUP_CONTEXT_REQUIRED",
      "Meeting-point status requires meetup context.",
      400
    );
  }

  if (
    (status === "at_stage" ||
      status === "moving_stage") &&
    (!setId || meetupId)
  ) {
    return errorResponse(
      "SET_CONTEXT_REQUIRED",
      "Stage status requires official set context.",
      400
    );
  }

  if (
    ![
      "at_meeting_point",
      "at_stage",
      "moving_stage",
    ].includes(status) &&
    (meetupId || setId)
  ) {
    return errorResponse(
      "UNEXPECTED_CONTEXT",
      "This presence status does not accept location context.",
      400
    );
  }

  const { data, error } =
    await supabase.rpc(
      "mhidas_set_event_presence_status",
      {
        p_event_group_id: eventGroupId,
        p_status: status,
        p_meetup_id:
          meetupId || null,
        p_set_id:
          setId || null,
      }
    );

  if (error) {
    return errorResponse(
      "SET_FAILED",
      "Could not update event presence status.",
      getRpcFailureStatus(error.message)
    );
  }

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "event-presence-statuses",
    mode: "set",
    event_group_id: eventGroupId,
    presence_status_id: data,
    status,
    database_write_performed: true,
  });
}