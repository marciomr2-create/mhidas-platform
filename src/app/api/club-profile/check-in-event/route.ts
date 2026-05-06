// src/app/api/club-profile/check-in-event/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCompare(value: any): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createEventKey(eventName: string): string {
  return normalizeCompare(eventName).replace(/\s+/g, "-");
}

function splitTokenList(value: any): string[] {
  const text = normalizeText(value);

  if (!text) {
    return [];
  }

  return text
    .split(/[,;\n]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function uniqueTokenList(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const clean = normalizeText(item);
    const key = normalizeCompare(clean);

    if (!clean || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(clean);
  }

  return result;
}

function joinTokenList(items: string[]): string | null {
  const cleanItems = uniqueTokenList(items);

  return cleanItems.length > 0 ? cleanItems.join(", ") : null;
}

function normalizeUuidOrNull(value: any): string | null {
  const clean = normalizeText(value);

  if (!clean) {
    return null;
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(clean) ? clean : null;
}

function normalizeNumberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function clampRadiusMeters(value: any): number {
  const parsed = Math.round(Number(value || 1000));

  if (!Number.isFinite(parsed)) {
    return 1000;
  }

  return Math.min(Math.max(parsed, 100), 5000);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(params: {
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}): number {
  const earthRadiusMeters = 6371000;

  const deltaLatitude = toRadians(params.toLatitude - params.fromLatitude);
  const deltaLongitude = toRadians(params.toLongitude - params.fromLongitude);

  const fromLatitudeRadians = toRadians(params.fromLatitude);
  const toLatitudeRadians = toRadians(params.toLatitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

function isValidLatitude(value: number | null): value is number {
  return typeof value === "number" && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return typeof value === "number" && value >= -180 && value <= 180;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const eventName = normalizeText(body?.eventName);
    const eventDate = normalizeText(body?.eventDate);
    const eventLink = normalizeText(body?.eventLink);
    const catalogId = normalizeUuidOrNull(body?.catalogId);
    const source = normalizeText(body?.source) || "manual_confirmed";

    const userLatitude = normalizeNumberOrNull(body?.userLatitude);
    const userLongitude = normalizeNumberOrNull(body?.userLongitude);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!eventName || eventName.length < 2) {
      return NextResponse.json(
        { ok: false, message: "Evento inválido para check-in." },
        { status: 400 }
      );
    }

    if (
      (userLatitude !== null && !isValidLatitude(userLatitude)) ||
      (userLongitude !== null && !isValidLongitude(userLongitude))
    ) {
      return NextResponse.json(
        { ok: false, message: "Localização inválida para check-in." },
        { status: 400 }
      );
    }

    const eventKey = createEventKey(eventName);

    if (!eventKey) {
      return NextResponse.json(
        { ok: false, message: "Não foi possível identificar este evento." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json(
        { ok: false, message: "Faça login novamente para fazer check-in." },
        { status: 401 }
      );
    }

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("card_id, user_id")
      .eq("card_id", cardId)
      .maybeSingle();

    if (cardError || !card?.card_id) {
      return NextResponse.json(
        { ok: false, message: "Perfil não encontrado." },
        { status: 404 }
      );
    }

    if (card.user_id !== user.id) {
      return NextResponse.json(
        {
          ok: false,
          message: "Você não tem permissão para fazer check-in neste perfil.",
        },
        { status: 403 }
      );
    }

    let eventLatitude: number | null = null;
    let eventLongitude: number | null = null;
    let radiusMeters: number | null = null;
    let distanceMeters: number | null = null;
    let locationStatus:
      | "not_checked"
      | "inside_radius"
      | "outside_radius"
      | "location_unavailable"
      | "pending_sync" = "not_checked";

    if (catalogId) {
      try {
        const { data: catalogItem } = await supabase
          .from("club_event_catalog")
          .select("id, latitude, longitude, checkin_radius_meters")
          .eq("id", catalogId)
          .maybeSingle();

        eventLatitude = normalizeNumberOrNull(catalogItem?.latitude);
        eventLongitude = normalizeNumberOrNull(catalogItem?.longitude);
        radiusMeters = clampRadiusMeters(catalogItem?.checkin_radius_meters);
      } catch {
        eventLatitude = null;
        eventLongitude = null;
        radiusMeters = null;
      }
    }

    const hasUserLocation =
      isValidLatitude(userLatitude) && isValidLongitude(userLongitude);

    const hasEventLocation =
      isValidLatitude(eventLatitude) && isValidLongitude(eventLongitude);

    if (hasUserLocation && hasEventLocation) {
      const finalRadiusMeters = clampRadiusMeters(radiusMeters);

      distanceMeters = calculateDistanceMeters({
        fromLatitude: userLatitude!,
        fromLongitude: userLongitude!,
        toLatitude: eventLatitude!,
        toLongitude: eventLongitude!,
      });

      radiusMeters = finalRadiusMeters;
      locationStatus =
        distanceMeters <= finalRadiusMeters ? "inside_radius" : "outside_radius";
    } else if (!hasUserLocation && hasEventLocation) {
      locationStatus = "location_unavailable";
    } else if (hasUserLocation && !hasEventLocation) {
      locationStatus = "not_checked";
    }

    const nowIso = new Date().toISOString();

    const { data: checkIn, error: checkInError } = await supabase
      .from("club_event_checkins")
      .upsert(
        {
          user_id: user.id,
          card_id: cardId,
          event_name: eventName,
          event_key: eventKey,
          event_date: eventDate || null,
          event_link: eventLink || null,
          catalog_id: catalogId,
          status: "active",
          source,
          user_latitude: hasUserLocation ? userLatitude : null,
          user_longitude: hasUserLocation ? userLongitude : null,
          event_latitude: hasEventLocation ? eventLatitude : null,
          event_longitude: hasEventLocation ? eventLongitude : null,
          distance_meters: distanceMeters,
          radius_meters: radiusMeters,
          location_status: locationStatus,
          checked_in_at: nowIso,
          synced_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: "user_id,card_id,event_key",
        }
      )
      .select(
        "id, event_name, event_key, status, location_status, distance_meters, radius_meters"
      )
      .maybeSingle();

    if (checkInError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível registrar o check-in. ${checkInError.message}`,
        },
        { status: 500 }
      );
    }

    const { data: clubProfile, error: profileError } = await supabase
      .from("club_profiles")
      .select("user_id, last_events")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Check-in registrado, mas não foi possível carregar o histórico. ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    const currentLastEvents = splitTokenList(clubProfile?.last_events);
    const nextLastEvents = uniqueTokenList([...currentLastEvents, eventName]);

    const profilePayload = {
      last_events: joinTokenList(nextLastEvents),
      updated_at: nowIso,
    };

    if (clubProfile?.user_id) {
      const { error: updateProfileError } = await supabase
        .from("club_profiles")
        .update(profilePayload)
        .eq("user_id", user.id);

      if (updateProfileError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Check-in registrado, mas não foi possível atualizar Últimos eventos. ${updateProfileError.message}`,
          },
          { status: 500 }
        );
      }
    } else {
      const { error: insertProfileError } = await supabase
        .from("club_profiles")
        .insert({
          user_id: user.id,
          ...profilePayload,
        });

      if (insertProfileError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Check-in registrado, mas não foi possível criar o histórico. ${insertProfileError.message}`,
          },
          { status: 500 }
        );
      }
    }

    try {
      await supabase.rpc("sync_event_groups_from_club_profile", {
        p_user_id: user.id,
      });
    } catch {
      // O check-in não deve falhar caso a sincronização auxiliar não exista ou falhe.
    }

    return NextResponse.json({
      ok: true,
      checkIn,
      status: "active",
      locationStatus,
      distanceMeters,
      radiusMeters,
      eventName,
      message:
        locationStatus === "inside_radius"
          ? "Check-in ativo por proximidade. Evento adicionado em Últimos eventos."
          : locationStatus === "outside_radius"
            ? "Check-in ativo, mas você parece estar fora do raio configurado."
            : locationStatus === "location_unavailable"
              ? "Check-in ativo. Não foi possível validar sua localização."
              : "Check-in ativo. Evento adicionado em Últimos eventos.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao fazer check-in.",
      },
      { status: 500 }
    );
  }
}

