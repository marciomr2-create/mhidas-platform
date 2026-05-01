export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: any): string {
  const text = normalizeText(value);

  if (!text) return "";
  if (text.startsWith("http://")) return text;
  if (text.startsWith("https://")) return text;

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const cardId = normalizeText(body?.cardId);
    const spotifyId = normalizeText(body?.spotifyId || body?.id);
    const name = normalizeText(body?.name);
    const imageUrl = normalizeUrl(body?.imageUrl || body?.image_url);
    const spotifyUrl = normalizeUrl(body?.spotifyUrl || body?.spotify_url);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (!spotifyId || !name) {
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

    const { data: existing, error: existingError } = await supabase
      .from("club_profile_artists")
      .select("spotify_id")
      .eq("user_id", user.id)
      .eq("spotify_id", spotifyId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível verificar o artista. ${existingError.message}`,
        },
        { status: 500 }
      );
    }

    if (existing?.spotify_id) {
      const { error: updateError } = await supabase
        .from("club_profile_artists")
        .update({
          name,
          image_url: imageUrl || null,
          spotify_url: spotifyUrl || null,
        })
        .eq("user_id", user.id)
        .eq("spotify_id", spotifyId);

      if (updateError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Não foi possível atualizar o artista. ${updateError.message}`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        added: false,
        message: "Este artista já estava no seu Club.",
      });
    }

    const { error: insertError } = await supabase
      .from("club_profile_artists")
      .insert({
        user_id: user.id,
        spotify_id: spotifyId,
        name,
        image_url: imageUrl || null,
        spotify_url: spotifyUrl || null,
      });

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          message: `Não foi possível adicionar o artista. ${insertError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      added: true,
      message: "Artista adicionado ao Club.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erro inesperado ao adicionar artista.",
      },
      { status: 500 }
    );
  }
}
