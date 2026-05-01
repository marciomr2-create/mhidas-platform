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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const field = normalizeText(body?.field);
    const value = normalizeText(body?.value);
    const nextEventDate = normalizeText(body?.nextEventDate);
    const nextEventLink = normalizeText(body?.nextEventLink);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { ok: false, message: "Campo inválido para adicionar." },
        { status: 400 }
      );
    }

    if (!value || value.length < 2) {
      return NextResponse.json(
        { ok: false, message: "Digite um item válido para adicionar." },
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

    if (profileError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível carregar seu Club Mode. ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    const row = (clubProfile || {}) as Record<string, any>;
    const currentItems = splitTokenList(row[field]);
    const nextItems = uniqueTokenList([...currentItems, value]);
    const alreadyExists = nextItems.length === uniqueTokenList(currentItems).length;

    const updatePayload: Record<string, any> = {
      [field]: joinTokenList(nextItems),
      updated_at: new Date().toISOString(),
    };

    if (field === "next_events" && !alreadyExists) {
      const currentDates = splitTokenList(row.next_events_dates);
      const currentLinks = splitTokenList(row.next_events_links);

      updatePayload.next_events_dates = joinTokenList([
        ...currentDates,
        nextEventDate,
      ]);

      updatePayload.next_events_links = joinTokenList([
        ...currentLinks,
        nextEventLink,
      ]);
    }

    if (clubProfile?.user_id) {
      const { error: updateError } = await supabase
        .from("club_profiles")
        .update(updatePayload)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Não foi possível adicionar o item. ${updateError.message}`,
          },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("club_profiles")
        .insert({
          user_id: user.id,
          ...updatePayload,
        });

      if (insertError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Não foi possível criar o Club Mode. ${insertError.message}`,
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
      // A adição do item não deve falhar caso a sincronização dos grupos vivos não exista ou falhe.
    }

    return NextResponse.json({
      ok: true,
      added: !alreadyExists,
      field,
      value,
      message: alreadyExists
        ? "Este item já estava no seu Club Mode."
        : "Item adicionado ao Club Mode.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao adicionar item.",
      },
      { status: 500 }
    );
  }
}
