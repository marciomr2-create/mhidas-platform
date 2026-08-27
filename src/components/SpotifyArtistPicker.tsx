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

type SpotifyArtistPickerProps = {
  title?: string;
  description?: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

export default function SpotifyArtistPicker({
  title = "Artistas com imagem do Spotify",
  description =
    "Busque artistas reais, selecione suas referências e defina a ordem exibida no perfil público.",
}: SpotifyArtistPickerProps) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [movingId, setMovingId] = useState("");
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
      setMessage("Faça login novamente para carregar seus artistas.");
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
      setMessage(`${artist.name} já está no seu Perfil Clubber.`);
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
    setMessage(`${artist.name} foi adicionado ao seu Perfil Clubber.`);
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
    setMessage(`${artist.name} foi removido do seu Perfil Clubber.`);
  }

  async function moveArtist(artist: SavedArtist, direction: "left" | "right") {
    if (!userId || movingId) {
      return;
    }

    const currentIndex = savedArtists.findIndex((item) => item.id === artist.id);
    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= savedArtists.length) {
      return;
    }

    const reordered = [...savedArtists];
    const [movedArtist] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedArtist);

    setMovingId(artist.id);
    setMessage("");
    setSavedArtists(
      reordered.map((item, index) => ({
        ...item,
        sort_order: index,
      }))
    );

    const updatedAt = new Date().toISOString();

    for (let index = 0; index < reordered.length; index += 1) {
      const item = reordered[index];
      const { error } = await supabase
        .from("club_profile_artists")
        .update({
          sort_order: index,
          updated_at: updatedAt,
        })
        .eq("id", item.id)
        .eq("user_id", userId);

      if (error) {
        await loadSavedArtists(userId);
        setMovingId("");
        setMessage(`Não foi possível reordenar os artistas. ${error.message}`);
        return;
      }
    }

    await loadSavedArtists(userId);
    setMovingId("");
    setMessage("Ordem dos artistas atualizada.");
  }

  const actionInProgress = Boolean(savingId || removingId || movingId);
  const queryReady = normalizeText(query).length >= 2;

  return (
    <section className="spotify-artist-picker">
      <style>{pickerCss}</style>

      <div className="spotify-artist-picker__intro">
        <div>
          <p className="spotify-artist-picker__eyebrow">Curadoria musical</p>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>

      <label className="spotify-artist-picker__search">
        <span>Buscar artista</span>
        <div className="spotify-artist-picker__search-field">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Digite o nome do artista"
          />
        </div>
      </label>

      {savedArtists.length > 0 ? (
        <div className="spotify-artist-picker__group">
          <div className="spotify-artist-picker__group-heading">
            <div>
              <strong>Meus artistas</strong>
              <span>Arraste a faixa e use as setas para ordenar.</span>
            </div>
            <span className="spotify-artist-picker__count">
              {savedArtists.length}
            </span>
          </div>

          <div className="spotify-artist-picker__rail" aria-label="Artistas selecionados">
            {savedArtists.map((artist, index) => (
              <article key={artist.id} className="spotify-artist-card spotify-artist-card--saved">
                <div className="spotify-artist-card__visual">
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} />
                  ) : (
                    <div className="spotify-artist-card__placeholder" aria-hidden="true">
                      ♪
                    </div>
                  )}

                  <span className="spotify-artist-card__position" aria-label={`Posição ${index + 1}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="spotify-artist-card__body">
                  <strong title={artist.name}>{artist.name}</strong>

                  <div className="spotify-artist-card__actions">
                    <button
                      type="button"
                      onClick={() => moveArtist(artist, "left")}
                      disabled={index === 0 || actionInProgress}
                      aria-label={`Mover ${artist.name} para a esquerda`}
                      title="Mover para a esquerda"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      onClick={() => moveArtist(artist, "right")}
                      disabled={index === savedArtists.length - 1 || actionInProgress}
                      aria-label={`Mover ${artist.name} para a direita`}
                      title="Mover para a direita"
                    >
                      →
                    </button>

                    <button
                      type="button"
                      className="spotify-artist-card__remove"
                      onClick={() => removeArtist(artist)}
                      disabled={actionInProgress}
                      aria-label={`Remover ${artist.name}`}
                      title="Remover artista"
                    >
                      {removingId === artist.id ? "…" : "×"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="spotify-artist-picker__empty">
          <span aria-hidden="true">♪</span>
          <div>
            <strong>Sua seleção começa aqui</strong>
            <p>Busque e adicione artistas para formar sua identidade musical.</p>
          </div>
        </div>
      )}

      <div className="spotify-artist-picker__group spotify-artist-picker__results">
        <div className="spotify-artist-picker__group-heading">
          <div>
            <strong>Resultados da busca</strong>
            <span>Adicione novas referências sem sair do app.</span>
          </div>
        </div>

        {searching ? (
          <div className="spotify-artist-picker__feedback">Buscando artistas...</div>
        ) : results.length > 0 ? (
          <div className="spotify-artist-picker__rail" aria-label="Resultados da busca">
            {results.map((artist) => {
              const selected = savedArtists.some(
                (item) => item.spotify_id === artist.spotify_id
              );

              return (
                <article
                  key={artist.spotify_id}
                  className={`spotify-artist-card spotify-artist-card--result${
                    selected ? " spotify-artist-card--selected" : ""
                  }`}
                >
                  <div className="spotify-artist-card__visual">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name} />
                    ) : (
                      <div className="spotify-artist-card__placeholder" aria-hidden="true">
                        ♪
                      </div>
                    )}
                  </div>

                  <div className="spotify-artist-card__body">
                    <strong title={artist.name}>{artist.name}</strong>
                    <button
                      type="button"
                      className="spotify-artist-card__add"
                      onClick={() => saveArtist(artist)}
                      disabled={selected || actionInProgress}
                    >
                      {selected
                        ? "Adicionado"
                        : savingId === artist.spotify_id
                          ? "Adicionando..."
                          : "Adicionar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : queryReady ? (
          <div className="spotify-artist-picker__feedback">
            Nenhum artista encontrado para este termo.
          </div>
        ) : (
          <div className="spotify-artist-picker__feedback">
            Digite pelo menos 2 caracteres para buscar.
          </div>
        )}
      </div>

      {message ? (
        <p className="spotify-artist-picker__message" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

const pickerCss = `
  .spotify-artist-picker,
  .spotify-artist-picker * {
    box-sizing: border-box;
  }

  .spotify-artist-picker {
    display: grid;
    gap: 20px;
    min-width: 0;
    padding: 18px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 24px;
    background: var(--mhidas-card-dark);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.20);
  }

  .spotify-artist-picker__intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.72fr);
    gap: 18px;
    align-items: end;
  }

  .spotify-artist-picker__intro h2 {
    margin: 5px 0 0;
    color: #ffffff;
    font-size: clamp(22px, 3vw, 28px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    font-weight: 900;
  }

  .spotify-artist-picker__intro > p {
    margin: 0;
    color: rgba(228, 230, 239, 0.66);
    font-size: 13px;
    line-height: 1.55;
  }

  .spotify-artist-picker__eyebrow {
    margin: 0;
    color: var(--mhidas-clubber-action);
    font-size: 10px;
    line-height: 1.2;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 900;
  }

  .spotify-artist-picker__search {
    display: grid;
    gap: 8px;
  }

  .spotify-artist-picker__search > span {
    color: #f4f5f9;
    font-size: 13px;
    font-weight: 850;
  }

  .spotify-artist-picker__search-field {
    min-height: 50px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.045);
    transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
  }

  .spotify-artist-picker__search-field:focus-within {
    border-color: rgba(42, 134, 148, 0.72);
    background: rgba(255, 255, 255, 0.065);
    box-shadow: 0 0 0 4px rgba(42, 134, 148, 0.10);
  }

  .spotify-artist-picker__search-field > span {
    color: rgba(255, 255, 255, 0.46);
    font-size: 24px;
    line-height: 1;
    transform: translateY(-1px);
  }

  .spotify-artist-picker__search-field input {
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #ffffff;
    font: inherit;
    font-size: 15px;
  }

  .spotify-artist-picker__search-field input::placeholder {
    color: rgba(255, 255, 255, 0.34);
  }

  .spotify-artist-picker__group {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .spotify-artist-picker__group-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 14px;
  }

  .spotify-artist-picker__group-heading > div {
    display: grid;
    gap: 3px;
  }

  .spotify-artist-picker__group-heading strong {
    color: #ffffff;
    font-size: 15px;
    font-weight: 900;
  }

  .spotify-artist-picker__group-heading span:not(.spotify-artist-picker__count) {
    color: rgba(226, 228, 237, 0.56);
    font-size: 11px;
    line-height: 1.45;
  }

  .spotify-artist-picker__count {
    min-width: 0;
    height: auto;
    padding: 0;
    display: inline;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--mhidas-clubber-action);
    font-size: 12px;
    font-weight: 900;
  }

  .spotify-artist-picker__rail {
    display: flex;
    gap: 12px;
    min-width: 0;
    width: 100%;
    padding: 2px 2px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 2px;
    overscroll-behavior-inline: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    touch-action: pan-x;
  }

  .spotify-artist-picker__rail::-webkit-scrollbar {
    display: none;
  }

  .spotify-artist-card {
    position: relative;
    flex: 0 0 184px;
    min-width: 184px;
    scroll-snap-align: start;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 21px;
    background: var(--mhidas-card-secondary);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
  }

  .spotify-artist-card--saved {
    border-color: rgba(42, 134, 148, 0.28);
  }

  .spotify-artist-card--selected {
    border-color: rgba(42, 134, 148, 0.32);
  }

  .spotify-artist-card__visual {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: var(--mhidas-card-secondary);
  }

  .spotify-artist-card__visual img,
  .spotify-artist-card__placeholder {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .spotify-artist-card__visual img {
    transition: transform 220ms ease;
  }

  .spotify-artist-card:hover .spotify-artist-card__visual img {
    transform: scale(1.025);
  }

  .spotify-artist-card__placeholder {
    display: grid;
    place-items: center;
    background: var(--mhidas-card-secondary);
    color: rgba(255, 255, 255, 0.44);
    font-size: 34px;
  }

  .spotify-artist-card__visual::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    height: 42%;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, rgba(9, 10, 15, 0.62));
  }

  .spotify-artist-card__position {
    position: absolute;
    z-index: 1;
    top: 10px;
    left: 10px;
    min-width: 0;
    height: auto;
    padding: 0;
    display: block;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #ffffff;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.88);
  }

  .spotify-artist-card__body {
    display: grid;
    gap: 11px;
    padding: 12px;
  }

  .spotify-artist-card__body > strong {
    min-width: 0;
    overflow: hidden;
    color: #ffffff;
    font-size: 14px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 900;
  }

  .spotify-artist-card__actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
  }

  .spotify-artist-card__actions button,
  .spotify-artist-card__add {
    min-height: 38px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.065);
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 900;
    transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
  }

  .spotify-artist-card__actions button {
    padding: 0;
    font-size: 17px;
  }

  .spotify-artist-card__actions button:hover:not(:disabled),
  .spotify-artist-card__add:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(42, 134, 148, 0.50);
    background: rgba(42, 134, 148, 0.14);
  }

  .spotify-artist-card__actions button:disabled,
  .spotify-artist-card__add:disabled {
    cursor: not-allowed;
    opacity: 0.34;
  }

  .spotify-artist-card__actions .spotify-artist-card__remove {
    color: #ffb3bc;
  }

  .spotify-artist-card__add {
    width: 100%;
    padding: 9px 12px;
    background: var(--mhidas-clubber-action-strong);
    border-color: rgba(42, 134, 148, 0.56);
    font-size: 12px;
  }

  .spotify-artist-card--selected .spotify-artist-card__add {
    background: rgba(42, 134, 148, 0.10);
    border-color: rgba(42, 134, 148, 0.24);
    color: var(--mhidas-clubber-action);
    opacity: 1;
  }

  .spotify-artist-picker__empty {
    min-height: 96px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border: 1px dashed rgba(255, 255, 255, 0.13);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.025);
  }

  .spotify-artist-picker__empty > span {
    width: 48px;
    height: 48px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: rgba(42, 134, 148, 0.10);
    color: var(--mhidas-clubber-action);
    font-size: 22px;
  }

  .spotify-artist-picker__empty strong {
    color: #ffffff;
    font-size: 14px;
  }

  .spotify-artist-picker__empty p {
    margin: 4px 0 0;
    color: rgba(226, 228, 237, 0.57);
    font-size: 12px;
    line-height: 1.5;
  }

  .spotify-artist-picker__feedback {
    min-height: 58px;
    display: flex;
    align-items: center;
    padding: 13px 14px;
    border: 1px solid rgba(255, 255, 255, 0.075);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.025);
    color: rgba(230, 232, 240, 0.64);
    font-size: 12px;
  }

  .spotify-artist-picker__message {
    margin: 0;
    padding: 11px 13px;
    border: 1px solid rgba(42, 134, 148, 0.20);
    border-radius: 13px;
    background: rgba(42, 134, 148, 0.08);
    color: #CBD5E1;
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 720px) {
    .spotify-artist-picker {
      gap: 18px;
      padding: 14px;
      border-radius: 21px;
    }

    .spotify-artist-picker__intro {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .spotify-artist-picker__intro h2 {
      font-size: 22px;
    }

    .spotify-artist-picker__intro > p {
      max-width: 34rem;
      font-size: 12px;
      line-height: 1.5;
    }

    .spotify-artist-picker__search-field {
      min-height: 48px;
    }

    .spotify-artist-picker__rail {
      gap: 10px;
      margin-right: -14px;
      padding-right: 26px;
    }

    .spotify-artist-card {
      flex-basis: 166px;
      min-width: 166px;
      border-radius: 19px;
    }

    .spotify-artist-card__body {
      gap: 10px;
      padding: 10px;
    }

    .spotify-artist-card__body > strong {
      font-size: 13px;
    }

    .spotify-artist-card__actions button,
    .spotify-artist-card__add {
      min-height: 36px;
      border-radius: 10px;
    }

    .spotify-artist-picker__results {
      padding-top: 2px;
    }
  }

  @media (max-width: 380px) {
    .spotify-artist-card {
      flex-basis: 156px;
      min-width: 156px;
    }
  }
`;
