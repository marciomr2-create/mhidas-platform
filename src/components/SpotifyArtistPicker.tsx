// src/components/SpotifyArtistPicker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type SpotifyArtist = {
  spotify_id: string;
  name: string;
  image_url: string;
  spotify_url: string;
  popularity: number;
  genres: string[];
};

type SavedArtist = {
  id: string;
  user_id: string;
  spotify_id: string;
  name: string;
  image_url: string | null;
  spotify_url: string | null;
  popularity: number | null;
  genres: string[] | null;
  sort_order: number | null;
  is_active: boolean;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
  } as const;
}

function buttonStyle(disabled = false) {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 800,
    opacity: disabled ? 0.55 : 1,
  } as const;
}

function cardStyle(active = false) {
  return {
    display: "grid",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    border: active
      ? "1px solid rgba(0,200,120,0.35)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(0,200,120,0.10)" : "rgba(255,255,255,0.04)",
  } as const;
}

function artistImageStyle(size = 58) {
  return {
    width: size,
    height: size,
    borderRadius: 14,
    objectFit: "cover" as const,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
  };
}

export default function SpotifyArtistPicker() {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadUserAndArtists();
  }, []);

  useEffect(() => {
    const q = normalizeText(query);

    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;

    async function runSearch() {
      setSearching(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/spotify/search-artists?q=${encodeURIComponent(q)}`
        );

        const json = await response.json();

        if (!active) return;

        if (!json.ok) {
          setResults([]);
          setMessage(json.error || "Não foi possível buscar artistas no Spotify.");
          setSearching(false);
          return;
        }

        setResults((json.artists || []) as SpotifyArtist[]);
        setSearching(false);
      } catch {
        if (!active) return;
        setResults([]);
        setSearching(false);
        setMessage("Erro ao consultar artistas no Spotify.");
      }
    }

    const timer = window.setTimeout(() => {
      void runSearch();
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function loadUserAndArtists() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId("");
      setSavedArtists([]);
      setMessage("Faça login novamente para carregar artistas.");
      return;
    }

    setUserId(user.id);
    await loadSavedArtists(user.id);
  }

  async function loadSavedArtists(currentUserId: string) {
    const { data, error } = await supabase
      .from("club_profile_artists")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setSavedArtists([]);
      setMessage(`Não foi possível carregar artistas salvos. ${error.message}`);
      return;
    }

    setSavedArtists((data || []) as SavedArtist[]);
  }

  async function saveArtist(artist: SpotifyArtist) {
    if (!userId) {
      setMessage("Faça login novamente para salvar artistas.");
      return;
    }

    const alreadySaved = savedArtists.some(
      (item) => item.spotify_id === artist.spotify_id
    );

    if (alreadySaved) {
      setMessage(`${artist.name} já está salvo no Club.`);
      return;
    }

    setSavingId(artist.spotify_id);
    setMessage("");

    const { error } = await supabase.from("club_profile_artists").upsert(
      {
        user_id: userId,
        spotify_id: artist.spotify_id,
        name: artist.name,
        image_url: artist.image_url || null,
        spotify_url: artist.spotify_url || null,
        popularity: artist.popularity || 0,
        genres: artist.genres || [],
        sort_order: savedArtists.length,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,spotify_id",
      }
    );

    if (error) {
      setSavingId("");
      setMessage(`Não foi possível salvar artista. ${error.message}`);
      return;
    }

    await loadSavedArtists(userId);
    setSavingId("");
    setMessage(`${artist.name} salvo no Club.`);
  }

  async function removeArtist(artist: SavedArtist) {
    if (!userId) {
      setMessage("Faça login novamente para remover artistas.");
      return;
    }

    setRemovingId(artist.id);
    setMessage("");

    const { error } = await supabase
      .from("club_profile_artists")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artist.id)
      .eq("user_id", userId);

    if (error) {
      setRemovingId("");
      setMessage(`Não foi possível remover artista. ${error.message}`);
      return;
    }

    await loadSavedArtists(userId);
    setRemovingId("");
    setMessage(`${artist.name} removido do Club.`);
  }

  return (
    <section
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>
          Artistas com imagem do Spotify
        </h3>
        <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.55 }}>
          Busque artistas reais no Spotify e selecione os que devem aparecer visualmente no perfil público.
        </p>
      </div>

      <label>
        <span style={{ display: "block", marginBottom: 8, fontWeight: 700, fontSize: 14 }}>
          Buscar artista
        </span>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Digite: Vintage Culture, Adriatique, Black Coffee"
          style={inputStyle()}
        />
      </label>

      {savedArtists.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <strong>Artistas selecionados</strong>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {savedArtists.map((artist) => (
              <div key={artist.id} style={cardStyle(true)}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} style={artistImageStyle()} />
                  ) : (
                    <div style={artistImageStyle()} />
                  )}

                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <strong>{artist.name}</strong>
                    <span style={{ fontSize: 12, opacity: 0.72 }}>
                      Salvo no Club
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {artist.spotify_url ? (
                    <a
                      href={artist.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...buttonStyle(),
                        display: "inline-block",
                        textDecoration: "none",
                      }}
                    >
                      Abrir Spotify
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => removeArtist(artist)}
                    disabled={removingId === artist.id}
                    style={buttonStyle(removingId === artist.id)}
                  >
                    {removingId === artist.id ? "Removendo..." : "Remover"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        <strong>Resultados do Spotify</strong>

        {searching ? (
          <div style={{ fontSize: 13, opacity: 0.76 }}>
            Buscando artistas...
          </div>
        ) : results.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {results.map((artist) => {
              const selected = savedArtists.some(
                (item) => item.spotify_id === artist.spotify_id
              );

              return (
                <div key={artist.spotify_id} style={cardStyle(selected)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name} style={artistImageStyle()} />
                    ) : (
                      <div style={artistImageStyle()} />
                    )}

                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <strong>{artist.name}</strong>
                      <span style={{ fontSize: 12, opacity: 0.72 }}>
                        Spotify
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => saveArtist(artist)}
                      disabled={selected || savingId === artist.spotify_id}
                      style={buttonStyle(selected || savingId === artist.spotify_id)}
                    >
                      {selected
                        ? "Selecionado"
                        : savingId === artist.spotify_id
                          ? "Salvando..."
                          : "Adicionar"}
                    </button>

                    {artist.spotify_url ? (
                      <a
                        href={artist.spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...buttonStyle(),
                          display: "inline-block",
                          textDecoration: "none",
                        }}
                      >
                        Ver no Spotify
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : normalizeText(query).length >= 2 ? (
          <div style={{ fontSize: 13, opacity: 0.76 }}>
            Nenhum artista encontrado para este termo.
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.76 }}>
            Digite pelo menos 2 caracteres para buscar.
          </div>
        )}
      </div>

      {message ? <p style={{ margin: 0, opacity: 0.88 }}>{message}</p> : null}
    </section>
  );
}