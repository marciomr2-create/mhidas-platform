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

type Direction = "left" | "right";

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
  const cleanItems = items.map((item) => normalizeText(item)).filter(Boolean);

  return cleanItems.length > 0 ? cleanItems.join(", ") : null;
}

function swapItems(items: string[], fromIndex: number, toIndex: number): string[] {
  const next = [...items];
  const temp = next[fromIndex];
  next[fromIndex] = next[toIndex];
  next[toIndex] = temp;

  return next;
}

function normalizeDirection(value: any): Direction {
  return normalizeText(value).toLowerCase() === "left" ? "left" : "right";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const field = normalizeText(body?.field);
    const value = normalizeText(body?.value);
    const direction = normalizeDirection(body?.direction);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { ok: false, message: "Campo inválido para ordenar." },
        { status: 400 }
      );
    }

    if (!value) {
      return NextResponse.json(
        { ok: false, message: "Item inválido para ordenar." },
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
    const currentIndex = currentItems.findIndex(
      (item) => normalizeCompare(item) === normalizeCompare(value)
    );

    if (currentIndex < 0) {
      return NextResponse.json(
        { ok: false, message: "Item não encontrado para ordenar." },
        { status: 404 }
      );
    }

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= currentItems.length) {
      return NextResponse.json({
        ok: true,
        moved: false,
        message: "Item já está no limite da lista.",
      });
    }

    const movedItems = swapItems(currentItems, currentIndex, targetIndex);

    const updatePayload: Record<string, any> = {
      [field]: joinTokenList(movedItems),
      updated_at: new Date().toISOString(),
    };

    if (field === "next_events") {
      const dates = splitTokenList(row.next_events_dates);
      const links = splitTokenList(row.next_events_links);

      if (dates.length === currentItems.length) {
        updatePayload.next_events_dates = joinTokenList(
          swapItems(dates, currentIndex, targetIndex)
        );
      }

      if (links.length === currentItems.length) {
        updatePayload.next_events_links = joinTokenList(
          swapItems(links, currentIndex, targetIndex)
        );
      }
    }

    const { error: updateError } = await supabase
      .from("club_profiles")
      .update(updatePayload)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível reordenar o item. ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    try {
      await supabase.rpc("sync_event_groups_from_club_profile", {
        p_user_id: user.id,
      });
    } catch {
      // Não bloquear a ordenação por falha de sincronização auxiliar.
    }

    return NextResponse.json({
      ok: true,
      moved: true,
      field,
      value,
      direction,
      message: "Item reordenado.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao reordenar item.",
      },
      { status: 500 }
    );
  }
}
