// src/app/api/event-tribes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ALLOWED_ACTIONS = [
  "create",
  "update",
  "request_join",
  "cancel_request",
  "decide_request",
  "leave",
  "remove_member",
  "set_member_role",
  "set_status",
] as const;

const ALLOWED_CATEGORIES = [
  "genre",
  "artist",
  "stage",
  "city_caravan",
  "experience",
  "social_profile",
  "lodging_logistics",
  "club_festival_community",
  "custom",
] as const;

const ALLOWED_VISIBILITIES = ["public", "private"] as const;
const ALLOWED_DECISIONS = ["approved", "rejected"] as const;
const ALLOWED_MEMBER_ROLES = [
  "organizer",
  "moderator",
  "member",
] as const;
const ALLOWED_STATUSES = [
  "active",
  "closed",
  "archived",
  "cancelled",
] as const;

type TribeAction = (typeof ALLOWED_ACTIONS)[number];
type TribeCategory = (typeof ALLOWED_CATEGORIES)[number];
type TribeVisibility = (typeof ALLOWED_VISIBILITIES)[number];
type JoinDecision = (typeof ALLOWED_DECISIONS)[number];
type TribeMemberRole = (typeof ALLOWED_MEMBER_ROLES)[number];
type TribeStatus = (typeof ALLOWED_STATUSES)[number];

type TribePayload = {
  action?: unknown;
  event_group_id?: unknown;
  tribe_id?: unknown;
  request_id?: unknown;
  member_user_id?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  visibility?: unknown;
  max_members?: unknown;
  rules?: unknown;
  expires_at?: unknown;
  message?: unknown;
  decision?: unknown;
  role?: unknown;
  status?: unknown;
  block?: unknown;
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

function asInteger(value: unknown): number {
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

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value, 12).toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (
    normalized === "" ||
    normalized === "false" ||
    normalized === "0"
  ) {
    return false;
  }

  throw new Error("Invalid boolean value.");
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isTribeAction(value: string): value is TribeAction {
  return ALLOWED_ACTIONS.includes(value as TribeAction);
}

function isTribeCategory(value: string): value is TribeCategory {
  return ALLOWED_CATEGORIES.includes(value as TribeCategory);
}

function isTribeVisibility(
  value: string
): value is TribeVisibility {
  return ALLOWED_VISIBILITIES.includes(
    value as TribeVisibility
  );
}

function isJoinDecision(value: string): value is JoinDecision {
  return ALLOWED_DECISIONS.includes(value as JoinDecision);
}

function isTribeMemberRole(
  value: string
): value is TribeMemberRole {
  return ALLOWED_MEMBER_ROLES.includes(
    value as TribeMemberRole
  );
}

function isTribeStatus(value: string): value is TribeStatus {
  return ALLOWED_STATUSES.includes(value as TribeStatus);
}

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      scope: "event-tribes",
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
      scope: "event-tribes",
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
    normalized.includes("manager required") ||
    normalized.includes("creator required") ||
    normalized.includes("creator or organizer required") ||
    normalized.includes("moderator can") ||
    normalized.includes("organizer cannot") ||
    normalized.includes("organizer can")
  ) {
    return 403;
  }

  if (normalized.includes("not found")) {
    return 404;
  }

  if (
    normalized.includes("already") ||
    normalized.includes("no longer pending") ||
    normalized.includes("not accepting") ||
    normalized.includes("expired") ||
    normalized.includes("prevents") ||
    normalized.includes("limit reached") ||
    normalized.includes("blocked") ||
    normalized.includes("status is final") ||
    normalized.includes("cannot leave") ||
    normalized.includes("cannot be removed") ||
    normalized.includes("cannot be edited") ||
    normalized.includes("self approval") ||
    normalized.includes("published clubber profile required") ||
    normalized.includes("no longer has a published")
  ) {
    return 409;
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("must") ||
    normalized.includes("between") ||
    normalized.includes("exceeds") ||
    normalized.includes("required") ||
    normalized.includes("use the leave operation")
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

function validateTribeDefinition(payload: TribePayload) {
  const name = normalizeText(payload.name, 80);
  const description = asNullableText(payload.description, 360);
  const category = normalizeText(payload.category, 40);
  const visibility = normalizeText(payload.visibility, 20);
  const maxMembers = asInteger(payload.max_members);
  const rules = asNullableText(payload.rules, 2000);
  const expiresAt = asNullableIsoDate(payload.expires_at);

  if (name.length < 3 || name.length > 80) {
    throw new Error(
      "Tribe name must contain 3 to 80 characters."
    );
  }

  if (!isTribeCategory(category)) {
    throw new Error("Invalid tribe category.");
  }

  if (!isTribeVisibility(visibility)) {
    throw new Error("Invalid tribe visibility.");
  }

  if (maxMembers < 2 || maxMembers > 250) {
    throw new Error(
      "max_members must be between 2 and 250."
    );
  }

  return {
    name,
    description,
    category,
    visibility,
    maxMembers,
    rules,
    expiresAt,
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

  const { data: tribesData, error: tribesError } =
    await supabase
      .from("event_tribes")
      .select(
        "tribe_id,event_group_id,creator_user_id,name,description,category,visibility,max_members,rules,status,expires_at,closed_at,archived_at,cancelled_at,created_at,updated_at"
      )
      .eq("event_group_id", eventGroupId)
      .order("created_at", { ascending: false });

  if (tribesError) {
    return buildSupabaseErrorResponse(
      "Could not load event tribes.",
      tribesError.message
    );
  }

  const tribeIds = (tribesData ?? []).map(
    (tribe) => tribe.tribe_id
  );

  if (tribeIds.length === 0) {
    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "read",
      event_group_id: eventGroupId,
      viewer_user_id: user.id,
      categories: ALLOWED_CATEGORIES,
      tribes: [],
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
      .from("event_tribe_members")
      .select(
        "tribe_member_id,tribe_id,user_id,role,status,invited_by_user_id,status_changed_by_user_id,joined_at,left_at,status_changed_at,created_at,updated_at"
      )
      .in("tribe_id", tribeIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_tribe_join_requests")
      .select(
        "request_id,tribe_id,requester_user_id,status,message,decided_by_user_id,decided_at,cancelled_at,created_at,updated_at"
      )
      .in("tribe_id", tribeIds)
      .order("created_at", { ascending: false }),
  ]);

  if (membersError) {
    return buildSupabaseErrorResponse(
      "Could not load event tribe members.",
      membersError.message
    );
  }

  if (requestsError) {
    return buildSupabaseErrorResponse(
      "Could not load event tribe requests.",
      requestsError.message
    );
  }

  const visibleUserIds = Array.from(
    new Set(
      [
        ...(tribesData ?? []).map(
          (tribe) => tribe.creator_user_id
        ),
        ...(membersData ?? []).map(
          (member) => member.user_id
        ),
        ...(requestsData ?? []).map(
          (joinRequest) => joinRequest.requester_user_id
        ),
      ].filter(Boolean)
    )
  );

  let people: Array<{
    user_id: string;
    label: string;
    slug: string | null;
    photo_url: string | null;
    city_base: string | null;
  }> = [];

  if (visibleUserIds.length > 0) {
    const [
      { data: cardsData, error: cardsError },
      { data: profilesData, error: profilesError },
    ] = await Promise.all([
      supabase
        .from("cards")
        .select("user_id,label,slug,status,is_published")
        .in("user_id", visibleUserIds)
        .eq("status", "active")
        .eq("is_published", true),
      supabase
        .from("club_profiles")
        .select("user_id,city_base,club_photo_url")
        .in("user_id", visibleUserIds),
    ]);

    if (!cardsError || !profilesError) {
      const cardByUserId = new Map<
        string,
        {
          label: string | null;
          slug: string | null;
        }
      >();

      for (const card of cardsError ? [] : cardsData ?? []) {
        if (!cardByUserId.has(card.user_id)) {
          cardByUserId.set(card.user_id, {
            label: card.label,
            slug: card.slug,
          });
        }
      }

      const profileByUserId = new Map<
        string,
        {
          city_base: string | null;
          club_photo_url: string | null;
        }
      >();

      for (const profile of profilesError ? [] : profilesData ?? []) {
        profileByUserId.set(profile.user_id, {
          city_base: profile.city_base,
          club_photo_url: profile.club_photo_url,
        });
      }

      people = visibleUserIds.map((userId) => {
        const card = cardByUserId.get(userId);
        const profile = profileByUserId.get(userId);

        return {
          user_id: userId,
          label:
            normalizeText(card?.label, 100) || "Clubber",
          slug: normalizeText(card?.slug, 160) || null,
          photo_url:
            normalizeText(profile?.club_photo_url, 1000) ||
            null,
          city_base:
            normalizeText(profile?.city_base, 160) || null,
        };
      });
    }
  }

  return NextResponse.json({
    ok: true,
    scope: "event-tribes",
    mode: "read",
    event_group_id: eventGroupId,
    viewer_user_id: user.id,
    categories: ALLOWED_CATEGORIES,
    tribes: tribesData ?? [],
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

  let payload: TribePayload;

  try {
    payload = (await request.json()) as TribePayload;
  } catch {
    return buildErrorResponse("Invalid JSON body.", 400);
  }

  const action = normalizeText(payload.action, 32);

  if (!isTribeAction(action)) {
    return buildErrorResponse("Invalid tribe action.", 400);
  }

  if (action === "create") {
    const eventGroupId = normalizeText(
      payload.event_group_id,
      64
    );

    if (!eventGroupId || !isUuidLike(eventGroupId)) {
      return buildErrorResponse(
        "Valid event_group_id is required.",
        400
      );
    }

    let definition: ReturnType<typeof validateTribeDefinition>;

    try {
      definition = validateTribeDefinition(payload);
    } catch (error) {
      return buildErrorResponse(
        error instanceof Error
          ? error.message
          : "Invalid tribe definition.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_create_event_tribe",
      {
        p_event_group_id: eventGroupId,
        p_name: definition.name,
        p_description: definition.description,
        p_category: definition.category,
        p_visibility: definition.visibility,
        p_max_members: definition.maxMembers,
        p_rules: definition.rules,
        p_expires_at: definition.expiresAt,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not create event tribe.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "create",
      tribe_id: data,
    });
  }

  if (action === "update") {
    const tribeId = normalizeText(payload.tribe_id, 64);

    if (!tribeId || !isUuidLike(tribeId)) {
      return buildErrorResponse(
        "Valid tribe_id is required.",
        400
      );
    }

    let definition: ReturnType<typeof validateTribeDefinition>;

    try {
      definition = validateTribeDefinition(payload);
    } catch (error) {
      return buildErrorResponse(
        error instanceof Error
          ? error.message
          : "Invalid tribe definition.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_update_event_tribe",
      {
        p_tribe_id: tribeId,
        p_name: definition.name,
        p_description: definition.description,
        p_category: definition.category,
        p_visibility: definition.visibility,
        p_max_members: definition.maxMembers,
        p_rules: definition.rules,
        p_expires_at: definition.expiresAt,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not update event tribe.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "update",
      updated: data === true,
    });
  }

  if (action === "request_join") {
    const tribeId = normalizeText(payload.tribe_id, 64);
    const message = asNullableText(payload.message, 500);

    if (!tribeId || !isUuidLike(tribeId)) {
      return buildErrorResponse(
        "Valid tribe_id is required.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_request_join_event_tribe",
      {
        p_tribe_id: tribeId,
        p_message: message,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not request event tribe membership.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
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
      "mhidas_cancel_event_tribe_join_request",
      {
        p_request_id: requestId,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not cancel event tribe request.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "cancel_request",
      cancelled: data === true,
    });
  }

  if (action === "decide_request") {
    const requestId = normalizeText(payload.request_id, 64);
    const decision = normalizeText(payload.decision, 24);

    if (!requestId || !isUuidLike(requestId)) {
      return buildErrorResponse(
        "Valid request_id is required.",
        400
      );
    }

    if (!isJoinDecision(decision)) {
      return buildErrorResponse(
        "Invalid tribe join decision.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_decide_event_tribe_join_request",
      {
        p_request_id: requestId,
        p_decision: decision,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not decide event tribe request.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "decide_request",
      decision,
      decided: data === true,
    });
  }

  if (action === "leave") {
    const tribeId = normalizeText(payload.tribe_id, 64);

    if (!tribeId || !isUuidLike(tribeId)) {
      return buildErrorResponse(
        "Valid tribe_id is required.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_leave_event_tribe",
      {
        p_tribe_id: tribeId,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not leave event tribe.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "leave",
      left: data === true,
    });
  }

  if (action === "remove_member") {
    const tribeId = normalizeText(payload.tribe_id, 64);
    const memberUserId = normalizeText(
      payload.member_user_id,
      64
    );

    if (!tribeId || !isUuidLike(tribeId)) {
      return buildErrorResponse(
        "Valid tribe_id is required.",
        400
      );
    }

    if (!memberUserId || !isUuidLike(memberUserId)) {
      return buildErrorResponse(
        "Valid member_user_id is required.",
        400
      );
    }

    let block: boolean;

    try {
      block = asBoolean(payload.block);
    } catch (error) {
      return buildErrorResponse(
        error instanceof Error
          ? error.message
          : "Invalid block value.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_remove_event_tribe_member",
      {
        p_tribe_id: tribeId,
        p_member_user_id: memberUserId,
        p_block: block,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not remove event tribe member.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "remove_member",
      blocked: block,
      removed: data === true,
    });
  }

  if (action === "set_member_role") {
    const tribeId = normalizeText(payload.tribe_id, 64);
    const memberUserId = normalizeText(
      payload.member_user_id,
      64
    );
    const role = normalizeText(payload.role, 24);

    if (!tribeId || !isUuidLike(tribeId)) {
      return buildErrorResponse(
        "Valid tribe_id is required.",
        400
      );
    }

    if (!memberUserId || !isUuidLike(memberUserId)) {
      return buildErrorResponse(
        "Valid member_user_id is required.",
        400
      );
    }

    if (!isTribeMemberRole(role)) {
      return buildErrorResponse(
        "Invalid tribe member role.",
        400
      );
    }

    const { data, error } = await supabase.rpc(
      "mhidas_set_event_tribe_member_role",
      {
        p_tribe_id: tribeId,
        p_member_user_id: memberUserId,
        p_role: role,
      }
    );

    if (error) {
      return buildSupabaseErrorResponse(
        "Could not update event tribe member role.",
        error.message,
        getRpcFailureStatus(error.message)
      );
    }

    return NextResponse.json({
      ok: true,
      scope: "event-tribes",
      mode: "set_member_role",
      role,
      updated: data === true,
    });
  }

  const tribeId = normalizeText(payload.tribe_id, 64);
  const status = normalizeText(payload.status, 24);

  if (!tribeId || !isUuidLike(tribeId)) {
    return buildErrorResponse(
      "Valid tribe_id is required.",
      400
    );
  }

  if (!isTribeStatus(status)) {
    return buildErrorResponse(
      "Invalid tribe status.",
      400
    );
  }

  const { data, error } = await supabase.rpc(
    "mhidas_set_event_tribe_status",
    {
      p_tribe_id: tribeId,
      p_status: status,
    }
  );

  if (error) {
    return buildSupabaseErrorResponse(
      "Could not update event tribe status.",
      error.message,
      getRpcFailureStatus(error.message)
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-tribes",
    mode: "set_status",
    status,
    updated: data === true,
  });
}
