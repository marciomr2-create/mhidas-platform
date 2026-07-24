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

const ALLOWED_AVAILABILITY_STATUSES = [
  "available",
  "reserved",
  "transferred",
  "withdrawn",
] as const;

type TicketIntentStatus = (typeof ALLOWED_STATUSES)[number];
type TicketIntentSource = (typeof ALLOWED_SOURCES)[number];
type TicketAvailabilityStatus =
  (typeof ALLOWED_AVAILABILITY_STATUSES)[number];
type JsonRecord = Record<string, unknown>;

type TicketIntentPayload = {
  event_group_id?: unknown;
  status?: unknown;
  source?: unknown;
  notes?: unknown;
  metadata?: unknown;
};

type TicketAvailability = {
  status: TicketAvailabilityStatus;
  quantity: number;
  ticket_type: string;
  lot: string;
  asking_price: number;
  currency: "BRL";
  transfer_method: string;
  note: string;
  audience: "accepted_connections";
  platform_role: "connection_only";
  version: "v4.8.132";
  published_at: string;
  updated_at: string;
};

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isAllowedStatus(value: string): value is TicketIntentStatus {
  return ALLOWED_STATUSES.includes(value as TicketIntentStatus);
}

function isAllowedSource(value: string): value is TicketIntentSource {
  return ALLOWED_SOURCES.includes(value as TicketIntentSource);
}

function isAllowedAvailabilityStatus(
  value: string
): value is TicketAvailabilityStatus {
  return ALLOWED_AVAILABILITY_STATUSES.includes(
    value as TicketAvailabilityStatus
  );
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function parseStoredAvailability(value: unknown): TicketAvailability | null {
  const availability = asRecord(value);
  const status = normalizeText(availability?.status, 24);

  if (!availability || !isAllowedAvailabilityStatus(status)) {
    return null;
  }

  const quantity = Number(availability.quantity);
  const askingPrice = Number(availability.asking_price);
  const ticketType = normalizeText(availability.ticket_type, 80);
  const transferMethod = normalizeText(availability.transfer_method, 140);
  const publishedAt = normalizeText(availability.published_at, 40);
  const updatedAt = normalizeText(availability.updated_at, 40);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10 ||
    !Number.isFinite(askingPrice) ||
    askingPrice < 0 ||
    askingPrice > 100000 ||
    !ticketType ||
    !transferMethod ||
    !publishedAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    status,
    quantity,
    ticket_type: ticketType,
    lot: normalizeText(availability.lot, 80),
    asking_price: Math.round(askingPrice * 100) / 100,
    currency: "BRL",
    transfer_method: transferMethod,
    note: normalizeText(availability.note, 280),
    audience: "accepted_connections",
    platform_role: "connection_only",
    version: "v4.8.132",
    published_at: publishedAt,
    updated_at: updatedAt,
  };
}

function normalizeAvailabilityUpdate(
  value: unknown,
  existingAvailability: TicketAvailability | null,
  requestedStatus: TicketIntentStatus,
  now: string
): TicketAvailability {
  const availability = asRecord(value);
  const availabilityStatus = normalizeText(availability?.status, 24);

  if (!availability || !isAllowedAvailabilityStatus(availabilityStatus)) {
    throw new Error("Invalid ticket availability status.");
  }

  if (
    (availabilityStatus === "available" ||
      availabilityStatus === "reserved") &&
    requestedStatus !== "cancelled"
  ) {
    throw new Error(
      "Active ticket availability requires cancelled journey status."
    );
  }

  const quantity = Number(
    availability.quantity ?? existingAvailability?.quantity
  );
  const askingPrice = Number(
    availability.asking_price ?? existingAvailability?.asking_price
  );
  const ticketType = normalizeText(
    availability.ticket_type ?? existingAvailability?.ticket_type,
    80
  );
  const lot = normalizeText(
    availability.lot ?? existingAvailability?.lot,
    80
  );
  const transferMethod = normalizeText(
    availability.transfer_method ?? existingAvailability?.transfer_method,
    140
  );
  const note = normalizeText(
    availability.note ?? existingAvailability?.note,
    280
  );

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10 ||
    !Number.isFinite(askingPrice) ||
    askingPrice < 0 ||
    askingPrice > 100000 ||
    !ticketType ||
    !transferMethod
  ) {
    throw new Error("Invalid ticket availability details.");
  }

  return {
    status: availabilityStatus,
    quantity,
    ticket_type: ticketType,
    lot,
    asking_price: Math.round(askingPrice * 100) / 100,
    currency: "BRL",
    transfer_method: transferMethod,
    note,
    audience: "accepted_connections",
    platform_role: "connection_only",
    version: "v4.8.132",
    published_at: existingAvailability?.published_at || now,
    updated_at: now,
  };
}

function mergeMetadata(
  existingValue: unknown,
  incomingValue: unknown,
  requestedStatus: TicketIntentStatus,
  now: string
): JsonRecord {
  const existingMetadata = asRecord(existingValue) ?? {};
  const incomingMetadata = asRecord(incomingValue) ?? {};
  const nextMetadata: JsonRecord = {
    ...existingMetadata,
  };

  for (const [key, value] of Object.entries(incomingMetadata)) {
    if (
      key === "ticket_network_availability" ||
      key === "__proto__" ||
      key === "prototype" ||
      key === "constructor"
    ) {
      continue;
    }

    nextMetadata[key] = value;
  }

  const existingAvailability = parseStoredAvailability(
    existingMetadata.ticket_network_availability
  );

  if (
    Object.prototype.hasOwnProperty.call(
      incomingMetadata,
      "ticket_network_availability"
    )
  ) {
    nextMetadata.ticket_network_availability = normalizeAvailabilityUpdate(
      incomingMetadata.ticket_network_availability,
      existingAvailability,
      requestedStatus,
      now
    );
  } else if (
    requestedStatus !== "cancelled" &&
    existingAvailability &&
    (existingAvailability.status === "available" ||
      existingAvailability.status === "reserved")
  ) {
    nextMetadata.ticket_network_availability = {
      ...existingAvailability,
      status: "withdrawn",
      updated_at: now,
    } satisfies TicketAvailability;
  }

  const serializedMetadata = JSON.stringify(nextMetadata);

  if (serializedMetadata.length > 8000) {
    throw new Error("Ticket intent metadata is too large.");
  }

  return nextMetadata;
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
  const eventGroupId = normalizeText(searchParams.get("event_group_id"), 64);

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

  const eventGroupId = normalizeText(payload.event_group_id, 64);
  const requestedStatus = normalizeText(payload.status || "interested", 32);
  const requestedSource = normalizeText(payload.source || "event_page", 32);
  const notes = normalizeText(payload.notes, 1000) || null;

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

  const { data: existingIntent, error: existingIntentError } = await supabase
    .from("event_ticket_intents")
    .select("intent_id,metadata")
    .eq("event_group_id", eventGroupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingIntentError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-intents",
        message: "Could not load existing ticket intent.",
        details: existingIntentError.message,
      },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  let metadata: JsonRecord;

  try {
    metadata = mergeMetadata(
      existingIntent?.metadata,
      payload.metadata,
      requestedStatus,
      now
    );
  } catch (error) {
    return buildErrorResponse(
      error instanceof Error ? error.message : "Invalid ticket metadata.",
      400
    );
  }

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
