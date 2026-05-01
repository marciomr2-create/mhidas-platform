export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type Direction = "left" | "right";

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDirection(value: any): Direction {
  return normalizeText(value).toLowerCase() === "left" ? "left" : "right";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const spotifyId = normalizeText(body?.spotifyId);
    const direction = normalizeDirection(body?.direction);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!spotifyId) {
      return NextResponse.json(
        { ok: false, message: "Artista inválido para ordenar." },
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

    const { data: artistsData, error: artistsError } = await supabase
      .from("club_profile_artists")
      .select("spotify_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (artistsError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível carregar os artistas. ${artistsError.message}`,
        },
        { status: 500 }
      );
    }

    const artists = artistsData || [];
    const currentIndex = artists.findIndex((artist) => artist.spotify_id === spotifyId);

    if (currentIndex < 0) {
      return NextResponse.json(
        { ok: false, message: "Artista não encontrado para ordenar." },
        { status: 404 }
      );
    }

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= artists.length) {
      return NextResponse.json({
        ok: true,
        moved: false,
        message: "Artista já está no limite da lista.",
      });
    }

    const currentArtist = artists[currentIndex];
    const targetArtist = artists[targetIndex];

    const currentCreatedAt =
      currentArtist.created_at || new Date(Date.now() + currentIndex).toISOString();

    const targetCreatedAt =
      targetArtist.created_at || new Date(Date.now() + targetIndex).toISOString();

    const { error: currentUpdateError } = await supabase
      .from("club_profile_artists")
      .update({ created_at: targetCreatedAt })
      .eq("user_id", user.id)
      .eq("spotify_id", currentArtist.spotify_id);

    if (currentUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível mover o artista. ${currentUpdateError.message}`,
        },
        { status: 500 }
      );
    }

    const { error: targetUpdateError } = await supabase
      .from("club_profile_artists")
      .update({ created_at: currentCreatedAt })
      .eq("user_id", user.id)
      .eq("spotify_id", targetArtist.spotify_id);

    if (targetUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível concluir a ordenação. ${targetUpdateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      moved: true,
      spotifyId,
      direction,
      message: "Artista reordenado.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao reordenar artista.",
      },
      { status: 500 }
    );
  }
}
