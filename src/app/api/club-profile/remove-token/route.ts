// src/app/api/club-profile/remove-token/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const ALLOWED_FIELDS = new Set([
  "favorite_clubs",
  "favorite_events",
  "last_events",
  "next_events",
]);

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

function joinTokenList(items: string[]): string | null {
  const cleanItems = items
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return cleanItems.length > 0 ? cleanItems.join(", ") : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const field = normalizeText(body?.field);
    const value = normalizeText(body?.value);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { ok: false, message: "Campo inválido para remoção." },
        { status: 400 }
      );
    }

    if (!value) {
      return NextResponse.json(
        { ok: false, message: "Item inválido para remoção." },
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
        { ok: false, message: "Faça login novamente para alterar seu Club." },
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
        { ok: false, message: "Você não tem permissão para alterar este perfil." },
        { status: 403 }
      );
    }

    const { data: clubProfile, error: profileError } = await supabase
      .from("club_profiles")
      .select(
        "user_id, favorite_clubs, favorite_events, last_events, next_events, next_events_dates, next_events_links"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !clubProfile?.user_id) {
      return NextResponse.json(
        { ok: false, message: "Club Mode não encontrado." },
        { status: 404 }
      );
    }

    const row = clubProfile as Record<string, any>;
    const currentItems = splitTokenList(row[field]);
    const target = normalizeCompare(value);

    const keepIndexes: number[] = [];
    const nextItems: string[] = [];

    currentItems.forEach((item, index) => {
      if (normalizeCompare(item) !== target) {
        keepIndexes.push(index);
        nextItems.push(item);
      }
    });

    if (nextItems.length === currentItems.length) {
      return NextResponse.json({
        ok: true,
        removed: false,
        message: "Item não estava mais no perfil.",
      });
    }

    const updatePayload: Record<string, any> = {
      [field]: joinTokenList(nextItems),
      updated_at: new Date().toISOString(),
    };

    if (field === "next_events") {
      const currentDates = splitTokenList(row.next_events_dates);
      const currentLinks = splitTokenList(row.next_events_links);

      updatePayload.next_events_dates = joinTokenList(
        keepIndexes.map((index) => currentDates[index] || "").filter(Boolean)
      );

      updatePayload.next_events_links = joinTokenList(
        keepIndexes.map((index) => currentLinks[index] || "").filter(Boolean)
      );
    }

    const { error: updateError } = await supabase
      .from("club_profiles")
      .update(updatePayload)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível remover o item. ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    try {
      await supabase.rpc("sync_event_groups_from_club_profile", {
        p_user_id: user.id,
      });
    } catch {
      // A remoção do item não deve falhar caso a sincronização dos grupos vivos não exista ou falhe.
    }

    return NextResponse.json({
      ok: true,
      removed: true,
      field,
      value,
      message: "Item removido do Club Mode.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao remover item.",
      },
      { status: 500 }
    );
  }
}
