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

function normalizeDateKey(value: any): string {
  const text = normalizeText(value);

  if (!text) {
    return "";
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const br = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);

  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  return "";
}

function normalizeUrlCompare(value: any): string {
  const text = normalizeText(value);

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return text.replace(/\/+$/, "");
  }
}

function removeFirstDateMetadata(
  items: string[],
  requestedValue: string
): { items: string[]; removed: boolean } {
  const targetText = normalizeText(requestedValue);

  if (!targetText) {
    return { items, removed: false };
  }

  let removeIndex = items.findIndex(
    (item) => normalizeText(item) === targetText
  );

  if (removeIndex < 0) {
    const targetDateKey = normalizeDateKey(targetText);

    if (targetDateKey) {
      removeIndex = items.findIndex(
        (item) => normalizeDateKey(item) === targetDateKey
      );
    }
  }

  if (removeIndex < 0) {
    return { items, removed: false };
  }

  return {
    items: items.filter((_, index) => index !== removeIndex),
    removed: true,
  };
}

function removeFirstLinkMetadata(
  items: string[],
  requestedValue: string
): { items: string[]; removed: boolean } {
  const target = normalizeUrlCompare(requestedValue);

  if (!target) {
    return { items, removed: false };
  }

  const removeIndex = items.findIndex(
    (item) => normalizeUrlCompare(item) === target
  );

  if (removeIndex < 0) {
    return { items, removed: false };
  }

  return {
    items: items.filter((_, index) => index !== removeIndex),
    removed: true,
  };
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

    let removeMetadataMatchMode =
      field === "next_events" ? "positional_fallback" : "not_applicable";
    let removedNextEventDate = false;
    let removedNextEventLink = false;

    if (field === "next_events") {
      const currentDates = splitTokenList(row.next_events_dates);
      const currentLinks = splitTokenList(row.next_events_links);
      const hasCanonicalMetadataIdentity = Boolean(nextEventDate || nextEventLink);

      if (hasCanonicalMetadataIdentity) {
        removeMetadataMatchMode = "canonical_metadata";

        if (nextEventDate) {
          const dateResult = removeFirstDateMetadata(currentDates, nextEventDate);
          updatePayload.next_events_dates = joinTokenList(dateResult.items);
          removedNextEventDate = dateResult.removed;
        }

        if (nextEventLink) {
          const linkResult = removeFirstLinkMetadata(currentLinks, nextEventLink);
          updatePayload.next_events_links = joinTokenList(linkResult.items);
          removedNextEventLink = linkResult.removed;
        }
      } else {
        updatePayload.next_events_dates = joinTokenList(
          keepIndexes.map((index) => currentDates[index] || "").filter(Boolean)
        );

        updatePayload.next_events_links = joinTokenList(
          keepIndexes.map((index) => currentLinks[index] || "").filter(Boolean)
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
      removeMetadataMatchMode,
      removedNextEventDate,
      removedNextEventLink,
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