"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type SpotifyArtistSuggestion = {
  spotifyId: string;
  name: string;
  imageUrl: string;
  spotifyUrl: string;
};

type AddClubArtistButtonProps = {
  cardId: string;
  ownerUserId: string;
  compact?: boolean;
};

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeArtist(item: any): SpotifyArtistSuggestion | null {
  const spotifyId = normalizeText(
    item?.spotifyId ||
      item?.spotify_id ||
      item?.id ||
      item?.artist_id
  );

  const name = normalizeText(item?.name || item?.artist_name);

  const imageUrl = normalizeText(
    item?.imageUrl ||
      item?.image_url ||
      item?.images?.[0]?.url ||
      item?.images?.[1]?.url ||
      item?.images?.[2]?.url
  );

  const spotifyUrl = normalizeText(
    item?.spotifyUrl ||
      item?.spotify_url ||
      item?.external_urls?.spotify ||
      item?.url ||
      item?.href
  );

  if (!spotifyId || !name) {
    return null;
  }

  return {
    spotifyId,
    name,
    imageUrl,
    spotifyUrl,
  };
}

function extractArtists(payload: any): SpotifyArtistSuggestion[] {
  const candidates = [
    payload?.artists,
    payload?.items,
    payload?.data,
    payload?.results,
    payload?.artists?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => normalizeArtist(item))
        .filter(Boolean) as SpotifyArtistSuggestion[];
    }
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeArtist(item))
      .filter(Boolean) as SpotifyArtistSuggestion[];
  }

  return [];
}

export default function AddClubArtistButton({
  cardId,
  ownerUserId,
  compact = false,
}: AddClubArtistButtonProps) {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState<SpotifyArtistSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  const canSearch = useMemo(() => normalizeText(query).length >= 2, [query]);

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      try {
        const supabase = createBrowserClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setIsOwner(Boolean(user?.id && ownerUserId && user.id === ownerUserId));
      } catch {
        if (!mounted) return;
        setIsOwner(false);
      } finally {
        if (mounted) {
          setChecked(true);
        }
      }
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [ownerUserId]);

  async function searchSpotify(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const cleanQuery = normalizeText(query);

    if (cleanQuery.length < 2) {
      setMessage("Digite pelo menos 2 caracteres para buscar.");
      return;
    }

    setSearching(true);
    setArtists([]);
    setMessage("");

    try {
      const attempts = [
        async () =>
          fetch(`/api/spotify/search-artists?q=${encodeURIComponent(cleanQuery)}`, {
            method: "GET",
          }),
        async () =>
          fetch(`/api/spotify/search-artists?query=${encodeURIComponent(cleanQuery)}`, {
            method: "GET",
          }),
        async () =>
          fetch("/api/spotify/search-artists", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: cleanQuery, q: cleanQuery }),
          }),
      ];

      let found: SpotifyArtistSuggestion[] = [];
      let lastError = "";

      for (const attempt of attempts) {
        const response = await attempt();

        if (!response.ok) {
          lastError = `Busca Spotify falhou com status ${response.status}.`;
          continue;
        }

        const payload = await response.json().catch(() => null);
        found = extractArtists(payload);

        if (found.length > 0) {
          break;
        }
      }

      setArtists(found);

      if (found.length === 0) {
        setMessage(lastError || "Nenhum artista encontrado.");
      }
    } catch (error: any) {
      setMessage(error?.message || "Erro ao buscar artista no Spotify.");
    } finally {
      setSearching(false);
    }
  }

  async function addArtist(artist: SpotifyArtistSuggestion) {
    if (savingId) return;

    setSavingId(artist.spotifyId);
    setMessage("");

    try {
      const response = await fetch("/api/club-profile/add-artist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId,
          spotifyId: artist.spotifyId,
          name: artist.name,
          imageUrl: artist.imageUrl,
          spotifyUrl: artist.spotifyUrl,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível adicionar artista.");
      }

      setOpen(false);
      setQuery("");
      setArtists([]);
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "Erro ao adicionar artista.");
    } finally {
      setSavingId("");
    }
  }

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: compact ? 34 : 38,
          padding: compact ? "8px 11px" : "10px 13px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.10)",
          color: "#fff",
          fontSize: compact ? 12 : 13,
          fontWeight: 850,
          cursor: "pointer",
          boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
        }}
      >
        <span style={{ fontSize: compact ? 15 : 16, lineHeight: 1 }}>+</span>
        Adicionar artista
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            padding: 18,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              maxHeight: "88vh",
              overflowY: "auto",
              borderRadius: 26,
              background:
                "linear-gradient(180deg, rgba(24,24,34,0.98), rgba(10,10,16,0.98))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.62)",
              padding: 18,
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 18,
                    letterSpacing: -0.3,
                    lineHeight: 1.2,
                  }}
                >
                  Adicionar artista de referência
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.68,
                    lineHeight: 1.4,
                  }}
                >
                  Busque o artista no Spotify e adicione ao seu Club.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={Boolean(savingId)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                  cursor: savingId ? "wait" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={searchSpotify} style={{ marginTop: 18 }}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex: Vintage Culture, Alok, Adriatique"
                autoFocus
                style={{
                  width: "100%",
                  minHeight: 46,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#fff",
                  outline: "none",
                  padding: "0 14px",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="submit"
                  disabled={!canSearch || searching || Boolean(savingId)}
                  style={{
                    minHeight: 40,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background:
                      !canSearch || searching || savingId
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(255,255,255,0.18)",
                    color: "#fff",
                    padding: "0 15px",
                    fontWeight: 850,
                    cursor:
                      !canSearch || searching || savingId ? "not-allowed" : "pointer",
                    opacity: !canSearch || searching || savingId ? 0.6 : 1,
                  }}
                >
                  {searching ? "Buscando..." : "Buscar no Spotify"}
                </button>
              </div>
            </form>

            {message ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  fontSize: 13,
                  lineHeight: 1.4,
                  opacity: 0.86,
                }}
              >
                {message}
              </div>
            ) : null}

            {artists.length > 0 ? (
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {artists.map((artist) => (
                  <button
                    key={artist.spotifyId}
                    type="button"
                    onClick={() => addArtist(artist)}
                    disabled={Boolean(savingId)}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.065)",
                      color: "#fff",
                      borderRadius: 18,
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "64px 1fr",
                      gap: 12,
                      textAlign: "left",
                      cursor: savingId ? "wait" : "pointer",
                      opacity: savingId ? 0.68 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.08)",
                      }}
                    >
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 900,
                            opacity: 0.72,
                          }}
                        >
                          Spotify
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          fontSize: 14,
                          lineHeight: 1.25,
                        }}
                      >
                        {artist.name}
                      </strong>

                      <span
                        style={{
                          display: "inline-flex",
                          marginTop: 8,
                          fontSize: 11,
                          fontWeight: 850,
                          opacity: 0.72,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {savingId === artist.spotifyId ? "Salvando..." : "Adicionar ao Club"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
