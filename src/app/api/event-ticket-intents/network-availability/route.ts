// src/app/api/event-ticket-intents/network-availability/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type JsonRecord = Record<string, unknown>;

type ConnectionRow = {
  requester_user_id: string;
  target_user_id: string;
  status: string;
};

type RelationshipControlRow = {
  owner_user_id: string;
  target_user_id: string;
  status: string;
};

type TicketIntentRow = {
  user_id: string;
  metadata: unknown;
  updated_at: string | null;
};

type CardRow = {
  user_id: string;
  slug: string;
  label: string | null;
  status: string;
  is_published: boolean;
};

type ClubProfileRow = {
  user_id: string;
  city_base: string | null;
  club_photo_url: string | null;
};

type NetworkAvailability = {
  status: "available";
  quantity: number;
  ticket_type: string;
  lot: string;
  asking_price: number;
  currency: "BRL";
  transfer_method: string;
  note: string;
  updated_at: string;
};

function normalizeText(value: unknown, maxLength = 180): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}


function normalizePublicHttpsUrl(value: unknown): string {
  const text = normalizeText(value, 500);

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);

    if (url.protocol !== "https:" || url.username || url.password) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
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

function normalizeAvailability(value: unknown): NetworkAvailability | null {
  const availability = asRecord(value);

  if (!availability || availability.status !== "available") {
    return null;
  }

  const quantity = Number(availability.quantity);
  const askingPrice = Number(availability.asking_price);
  const ticketType = normalizeText(availability.ticket_type, 80);
  const lot = normalizeText(availability.lot, 80);
  const transferMethod = normalizeText(availability.transfer_method, 140);
  const note = normalizeText(availability.note, 280);
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
    !updatedAt
  ) {
    return null;
  }

  return {
    status: "available",
    quantity,
    ticket_type: ticketType,
    lot,
    asking_price: Math.round(askingPrice * 100) / 100,
    currency: "BRL",
    transfer_method: transferMethod,
    note,
    updated_at: updatedAt,
  };
}

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      scope: "event-ticket-network-availability",
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
  const authSupabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser();

  if (userError || !user) {
    return buildErrorResponse("Authentication required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const eventGroupId = normalizeText(searchParams.get("event_group_id"), 64);

  if (!eventGroupId || !isUuidLike(eventGroupId)) {
    return buildErrorResponse("Valid event_group_id is required.", 400);
  }

  let serviceSupabase: ReturnType<typeof createServiceRoleClient>;

  try {
    serviceSupabase = createServiceRoleClient();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-network-availability",
        message: "Server availability configuration is missing.",
        details: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }

  const { data: eventGroup, error: eventGroupError } = await serviceSupabase
    .from("event_groups")
    .select("group_id,status,is_public")
    .eq("group_id", eventGroupId)
    .maybeSingle();

  if (eventGroupError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-network-availability",
        message: "Could not validate event group.",
        details: eventGroupError.message,
      },
      { status: 500 }
    );
  }

  if (
    !eventGroup ||
    eventGroup.is_public === false ||
    (eventGroup.status && eventGroup.status !== "active")
  ) {
    return buildErrorResponse("Event group is not available.", 404);
  }

  const { data: connectionData, error: connectionError } = await serviceSupabase
    .from("professional_connections")
    .select("requester_user_id,target_user_id,status")
    .eq("status", "accepted")
    .or(
      `requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`
    );

  if (connectionError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-network-availability",
        message: "Could not load accepted connections.",
        details: connectionError.message,
      },
      { status: 500 }
    );
  }

  const connectionRows = (connectionData ?? []) as ConnectionRow[];
  const connectedUserIds = Array.from(
    new Set(
      connectionRows
        .map((row) =>
          row.requester_user_id === user.id
            ? row.target_user_id
            : row.requester_user_id
        )
        .filter((connectedUserId) => connectedUserId && connectedUserId !== user.id)
    )
  );

  if (connectedUserIds.length === 0) {
    return NextResponse.json({
      ok: true,
      scope: "event-ticket-network-availability",
      event_group_id: eventGroupId,
      audience: "accepted_connections",
      offers: [],
    });
  }

  const { data: controlData, error: controlError } = await serviceSupabase
    .from("professional_relationship_controls")
    .select("owner_user_id,target_user_id,status")
    .or(`owner_user_id.eq.${user.id},target_user_id.eq.${user.id}`);

  if (controlError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-network-availability",
        message: "Could not validate relationship controls.",
        details: controlError.message,
      },
      { status: 500 }
    );
  }

  const controlledUserIds = new Set<string>();

  for (const row of (controlData ?? []) as RelationshipControlRow[]) {
    if (row.status !== "blocked" && row.status !== "suspended") {
      continue;
    }

    const counterpartUserId =
      row.owner_user_id === user.id ? row.target_user_id : row.owner_user_id;

    if (counterpartUserId) {
      controlledUserIds.add(counterpartUserId);
    }
  }

  const eligibleUserIds = connectedUserIds.filter(
    (connectedUserId) => !controlledUserIds.has(connectedUserId)
  );

  if (eligibleUserIds.length === 0) {
    return NextResponse.json({
      ok: true,
      scope: "event-ticket-network-availability",
      event_group_id: eventGroupId,
      audience: "accepted_connections",
      offers: [],
    });
  }

  const { data: intentData, error: intentError } = await serviceSupabase
    .from("event_ticket_intents")
    .select("user_id,metadata,updated_at")
    .eq("event_group_id", eventGroupId)
    .eq("status", "cancelled")
    .in("user_id", eligibleUserIds)
    .order("updated_at", { ascending: false });

  if (intentError) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-network-availability",
        message: "Could not load ticket availability.",
        details: intentError.message,
      },
      { status: 500 }
    );
  }

  const availableByUserId = new Map<string, NetworkAvailability>();

  for (const intent of (intentData ?? []) as TicketIntentRow[]) {
    const metadata = asRecord(intent.metadata);
    const availability = normalizeAvailability(
      metadata?.ticket_network_availability
    );

    if (!availability || availableByUserId.has(intent.user_id)) {
      continue;
    }

    availableByUserId.set(intent.user_id, availability);
  }

  const offerUserIds = Array.from(availableByUserId.keys());

  if (offerUserIds.length === 0) {
    return NextResponse.json({
      ok: true,
      scope: "event-ticket-network-availability",
      event_group_id: eventGroupId,
      audience: "accepted_connections",
      offers: [],
    });
  }

  const [cardResult, profileResult] = await Promise.all([
    serviceSupabase
      .from("cards")
      .select("user_id,slug,label,status,is_published")
      .in("user_id", offerUserIds)
      .eq("status", "active")
      .eq("is_published", true),
    serviceSupabase
      .from("club_profiles")
      .select("user_id,city_base,club_photo_url")
      .in("user_id", offerUserIds),
  ]);

  if (cardResult.error || profileResult.error) {
    return NextResponse.json(
      {
        ok: false,
        scope: "event-ticket-network-availability",
        message: "Could not load public Clubber profiles.",
        details: cardResult.error?.message || profileResult.error?.message,
      },
      { status: 500 }
    );
  }

  const cardByUserId = new Map<string, CardRow>();

  for (const card of (cardResult.data ?? []) as CardRow[]) {
    if (!cardByUserId.has(card.user_id) && normalizeText(card.slug, 120)) {
      cardByUserId.set(card.user_id, card);
    }
  }

  const profileByUserId = new Map<string, ClubProfileRow>();

  for (const profile of (profileResult.data ?? []) as ClubProfileRow[]) {
    profileByUserId.set(profile.user_id, profile);
  }

  const offers = offerUserIds.flatMap((offerUserId) => {
    const availability = availableByUserId.get(offerUserId);
    const card = cardByUserId.get(offerUserId);

    if (!availability || !card) {
      return [];
    }

    const profile = profileByUserId.get(offerUserId);

    return [
      {
        user_id: offerUserId,
        label: normalizeText(card.label, 100) || "Clubber",
        slug: normalizeText(card.slug, 120),
        city_base: normalizeText(profile?.city_base, 120),
        club_photo_url: normalizePublicHttpsUrl(profile?.club_photo_url),
        relation: "accepted_connection",
        ...availability,
      },
    ];
  });

  offers.sort((left, right) =>
    right.updated_at.localeCompare(left.updated_at)
  );

  return NextResponse.json({
    ok: true,
    scope: "event-ticket-network-availability",
    event_group_id: eventGroupId,
    audience: "accepted_connections",
    offers,
  });
}
