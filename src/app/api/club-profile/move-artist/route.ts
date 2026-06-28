export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type Direction = "left" | "right";

type ArtistOrderRow = {
  spotify_id: string;
  sort_order: number | null;
  created_at: string | null;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDirection(value: unknown): Direction {
  return normalizeText(value).toLowerCase() === "left" ? "left" : "right";
}

function readSortOrder(value: number | null): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

    const ownerUserId = user.id;

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

    if (card.user_id !== ownerUserId) {
      return NextResponse.json(
        { ok: false, message: "Você não tem permissão para alterar este perfil." },
        { status: 403 }
      );
    }

    const { data: artistsData, error: artistsError } = await supabase
      .from("club_profile_artists")
      .select("spotify_id, sort_order, created_at")
      .eq("user_id", ownerUserId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
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

    const artists = (artistsData || []) as ArtistOrderRow[];
    const currentIndex = artists.findIndex(
      (artist) => artist.spotify_id === spotifyId
    );

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
    const currentSortOrder = readSortOrder(currentArtist.sort_order);
    const targetSortOrder = readSortOrder(targetArtist.sort_order);

    const finiteOrders = artists
      .map((artist) => readSortOrder(artist.sort_order))
      .filter((value): value is number => value !== null);

    const highestSortOrder = finiteOrders.length
      ? Math.max(...finiteOrders)
      : artists.length;

    async function updateArtistOrder(targetSpotifyId: string, sortOrder: number) {
      const { error } = await supabase
        .from("club_profile_artists")
        .update({ sort_order: sortOrder })
        .eq("user_id", ownerUserId)
        .eq("spotify_id", targetSpotifyId);

      if (error) {
        throw new Error(error.message);
      }
    }

    if (
      currentSortOrder !== null &&
      targetSortOrder !== null &&
      currentSortOrder !== targetSortOrder
    ) {
      const temporarySortOrder = highestSortOrder + artists.length + 1000;

      await updateArtistOrder(currentArtist.spotify_id, temporarySortOrder);
      await updateArtistOrder(targetArtist.spotify_id, currentSortOrder);
      await updateArtistOrder(currentArtist.spotify_id, targetSortOrder);
    } else {
      const reorderedArtists = [...artists];

      [reorderedArtists[currentIndex], reorderedArtists[targetIndex]] = [
        reorderedArtists[targetIndex],
        reorderedArtists[currentIndex],
      ];

      const temporaryBase = highestSortOrder + artists.length + 1000;

      for (let index = 0; index < reorderedArtists.length; index += 1) {
        await updateArtistOrder(
          reorderedArtists[index].spotify_id,
          temporaryBase + index
        );
      }

      for (let index = 0; index < reorderedArtists.length; index += 1) {
        await updateArtistOrder(reorderedArtists[index].spotify_id, index);
      }
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
        message:
          error?.message || "Erro inesperado ao reordenar artista.",
      },
      { status: 500 }
    );
  }
}
