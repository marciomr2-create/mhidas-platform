// src/app/api/club-profile/remove-artist/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const spotifyId = normalizeText(body?.spotifyId);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!spotifyId) {
      return NextResponse.json(
        { ok: false, message: "Artista inválido." },
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
        { ok: false, message: "Faça login novamente para alterar seus artistas." },
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

    const { error: deleteError } = await supabase
      .from("club_profile_artists")
      .delete()
      .eq("user_id", user.id)
      .eq("spotify_id", spotifyId);

    if (deleteError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível remover o artista. ${deleteError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      removed: true,
      spotifyId,
      message: "Artista removido do Club Mode.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao remover artista.",
      },
      { status: 500 }
    );
  }
}
