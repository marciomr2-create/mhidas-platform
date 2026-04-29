// src/app/api/spotify/search-artists/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SpotifyTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type SpotifyArtistImage = {
  url: string;
  height: number | null;
  width: number | null;
};

type SpotifyArtistItem = {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  images: SpotifyArtistImage[];
  external_urls?: {
    spotify?: string;
  };
};

type SpotifySearchResponse = {
  artists?: {
    items?: SpotifyArtistItem[];
  };
  error?: {
    status?: number;
    message?: string;
  };
};

function getEnvValue(key: string) {
  return String(process.env[key] || "").trim();
}

async function getSpotifyAccessToken() {
  const clientId = getEnvValue("SPOTIFY_CLIENT_ID");
  const clientSecret = getEnvValue("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais Spotify ausentes no .env.local.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const json = (await response.json()) as SpotifyTokenResponse;

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "Não foi possível obter token de acesso do Spotify."
    );
  }

  return json.access_token;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = String(url.searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({
        ok: true,
        artists: [],
      });
    }

    const accessToken = await getSpotifyAccessToken();

    const encodedQuery = encodeURIComponent(q);
    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=artist&limit=10`;

    const response = await fetch(spotifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const json = (await response.json()) as SpotifySearchResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          artists: [],
          error:
            json.error?.message ||
            "Não foi possível buscar artistas no Spotify.",
          spotify_status: json.error?.status || response.status,
        },
        { status: response.status }
      );
    }

    const artists =
      json.artists?.items?.map((artist) => {
        const image =
          artist.images?.[0]?.url ||
          artist.images?.[1]?.url ||
          artist.images?.[2]?.url ||
          "";

        return {
          spotify_id: artist.id,
          name: artist.name,
          image_url: image,
          spotify_url: artist.external_urls?.spotify || "",
          popularity: artist.popularity ?? 0,
          genres: artist.genres || [],
        };
      }) || [];

    return NextResponse.json({
      ok: true,
      artists,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        artists: [],
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao buscar artistas no Spotify.",
      },
      { status: 500 }
    );
  }
}