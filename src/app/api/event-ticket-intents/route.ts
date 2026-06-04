// src/app/api/event-ticket-intents/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ALLOWED_STATUSES = [
  "interested",
  "wants_ticket",
  "ticket_acquired",
  "cancelled",
  "checked_in",
] as const;

const ALLOWED_SOURCES = [
  "event_page",
  "club_profile",
  "admin",
  "import",
  "other",
] as const;

type TicketIntentStatus = (typeof ALLOWED_STATUSES)[number];
type TicketIntentSource = (typeof ALLOWED_SOURCES)[number];

type TicketIntentPayload = {
  event_group_id?: unknown;
  status?: unknown;
  source?: unknown;
  notes?: unknown;
  metadata?: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isAllowedStatus(value: string): value is TicketIntentStatus {
  return ALLOWED_STATUSES.includes(value as TicketIntentStatus);
}

function isAllowedSource(value: string): value is TicketIntentSource {
  return ALLOWED_SOURCES.includes(value as TicketIntentSource);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      scope: "event-ticket-intents",
      message,
    },
    { status }
  );
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return buildErrorResponse("Authentication required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const eventGroupId = normalizeText(searchParams.get("event_group_id"));

  if (!eventGroupId || !isUuidLike(eventGroupId)) {
    return buildErrorResponse("Valid event_group_id is required.", 400);
  }

  const { data, error } = await supabase
    .from("event_ticket_intents")
    .select(
      "intent_id,event_group_id,user_id,status,source,notes,metadata,created_at,updated_at"
    )
    .eq("event_group_id", eventGroupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-intents",
        message: "Could not load ticket intent.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-ticket-intents",
    mode: "read",
    event_group_id: eventGroupId,
    user_id: user.id,
    intent: data ?? null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return buildErrorResponse("Authentication required.", 401);
  }

  let payload: TicketIntentPayload;

  try {
    payload = (await request.json()) as TicketIntentPayload;
  } catch {
    return buildErrorResponse("Invalid JSON body.", 400);
  }

  const eventGroupId = normalizeText(payload.event_group_id);
  const requestedStatus = normalizeText(payload.status || "interested");
  const requestedSource = normalizeText(payload.source || "event_page");
  const notes = normalizeText(payload.notes) || null;
  const metadata =
    payload.metadata &&
    typeof payload.metadata === "object" &&
    !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};

  if (!eventGroupId || !isUuidLike(eventGroupId)) {
    return buildErrorResponse("Valid event_group_id is required.", 400);
  }

  if (!isAllowedStatus(requestedStatus)) {
    return buildErrorResponse("Invalid ticket intent status.", 400);
  }

  if (!isAllowedSource(requestedSource)) {
    return buildErrorResponse("Invalid ticket intent source.", 400);
  }

  let serviceSupabase: ReturnType<typeof createServiceRoleClient>;

  try {
    serviceSupabase = createServiceRoleClient();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-intents",
        message: "Server ticket intent configuration is missing.",
        details: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }

  const { data: eventGroup, error: eventGroupError } = await serviceSupabase
    .from("event_groups")
    .select("group_id,event_name,event_date,event_slug,city_base,status,is_public")
    .eq("group_id", eventGroupId)
    .maybeSingle();

  if (eventGroupError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-intents",
        message: "Could not validate event group.",
        details: eventGroupError.message,
      },
      { status: 500 }
    );
  }

  if (!eventGroup) {
    return buildErrorResponse("Event group not found.", 404);
  }

  if (eventGroup.status && eventGroup.status !== "active") {
    return buildErrorResponse("Event group is not active.", 409);
  }

  const now = new Date().toISOString();

  const { data: intent, error: upsertError } = await supabase
    .from("event_ticket_intents")
    .upsert(
      {
        event_group_id: eventGroupId,
        user_id: user.id,
        status: requestedStatus,
        source: requestedSource,
        notes,
        metadata,
        updated_at: now,
      },
      {
        onConflict: "event_group_id,user_id",
      }
    )
    .select(
      "intent_id,event_group_id,user_id,status,source,notes,metadata,created_at,updated_at"
    )
    .single();

  if (upsertError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-intents",
        message: "Could not save ticket intent.",
        details: upsertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: "event-ticket-intents",
    mode: "upsert",
    message: "Ticket intent saved.",
    event_group: eventGroup,
    intent,
  });
}