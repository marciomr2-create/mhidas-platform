// src/app/dashboard/cards/[card_id]/club/identity/ClubIdentityFocusedManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  searchClubGenreTaxonomy,
  type ClubGenreTaxonomyItem,
} from "./clubGenreTaxonomy";

type Props = {
  cardId: string;
  initialCity: string;
  initialDescription: string;
  initialGenres: string;
  favoriteArtists: string;
  favoriteClubs: string;
  favoriteEvents: string;
};

type CatalogItem = {
  id: string;
  item_type: "genre";
  name: string;
  subtitle: string | null;
  country_code: string | null;
  city_label: string | null;
  popularity: number | null;
};

type BrazilCityItem = {
  id: string;
  city_name: string;
  state_code: string;
  display_name: string;
  sort_rank: number | null;
};

type GenreSuggestion = {
  key: string;
  name: string;
  source: "useclubbers" | "catalog";
};

const GENERIC_DESCRIPTION =
  "Curto música eletrônica, gosto de descobrir novos sons, conhecer eventos e novos lugares, fazer novos amigos e compartilhar experiências.";

const MAX_GENRES = 8;

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeSearchText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPreferences(value: string | null | undefined) {
  const text = normalizeText(value);

  if (!text) {
    return [];
  }

  return text
    .split(/,|•|;|\||\n/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function uniqueItems(items: string[]) {
  return Array.from(
    new Map(
      items
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .map((item) => [normalizeSearchText(item), item])
    ).values()
  );
}

function containsItem(items: string[], value: string) {
  const target = normalizeSearchText(value);

  return items.some((item) => normalizeSearchText(item) === target);
}

function useDebouncedValue<T>(value: T, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}

function mergeGenreSuggestions(
  localItems: ClubGenreTaxonomyItem[],
  catalogItems: CatalogItem[],
  limit = 5
): GenreSuggestion[] {
  const merged = new Map<string, GenreSuggestion>();

  for (const item of localItems) {
    const normalizedName = normalizeSearchText(item.name);

    if (!normalizedName || merged.has(normalizedName)) {
      continue;
    }

    merged.set(normalizedName, {
      key: `useclubbers-${normalizedName}`,
      name: item.name,
      source: "useclubbers",
    });
  }

  for (const item of catalogItems) {
    const normalizedName = normalizeSearchText(item.name);

    if (!normalizedName || merged.has(normalizedName)) {
      continue;
    }

    merged.set(normalizedName, {
      key: `catalog-${item.id}`,
      name: item.name,
      source: "catalog",
    });
  }

  return Array.from(merged.values()).slice(0, limit);
}

export default function ClubIdentityFocusedManager({
  cardId,
  initialCity,
  initialDescription,
  initialGenres,
  favoriteArtists,
  favoriteClubs,
  favoriteEvents,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  void favoriteArtists;
  void favoriteClubs;
  void favoriteEvents;

  const [city, setCity] = useState(initialCity);
  const [citySelected, setCitySelected] = useState(Boolean(normalizeText(initialCity)));
  const [description, setDescription] = useState(initialDescription);
  const [genres, setGenres] = useState<string[]>(() =>
    uniqueItems(splitPreferences(initialGenres))
  );

  const [genreInput, setGenreInput] = useState("");

  const [cityItems, setCityItems] = useState<BrazilCityItem[]>([]);
  const [cityLoading, setCityLoading] = useState(false);

  const [catalogGenreItems, setCatalogGenreItems] = useState<CatalogItem[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const cityQuery = useDebouncedValue(normalizeSearchText(city), 220);
  const genreCatalogQuery = useDebouncedValue(
    normalizeSearchText(genreInput),
    220
  );

  const hasGenreQuery = Boolean(normalizeText(genreInput));

  const localGenreItems = useMemo(
    () => (hasGenreQuery ? searchClubGenreTaxonomy(genreInput, 8) : []),
    [genreInput, hasGenreQuery]
  );

  const genreSuggestions = useMemo(
    () =>
      hasGenreQuery
        ? mergeGenreSuggestions(localGenreItems, catalogGenreItems, 5)
        : [],
    [hasGenreQuery, localGenreItems, catalogGenreItems]
  );

  const primaryGenre = genres[0] || "";
  const secondaryGenres = genres.slice(1);
  const genreLimitReached = genres.length >= MAX_GENRES;

  useEffect(() => {
    let active = true;

    async function run() {
      if (!cityQuery || citySelected) {
        setCityItems([]);
        setCityLoading(false);
        return;
      }

      setCityLoading(true);

      const { data, error } = await supabase
        .from("br_cities")
        .select("id, city_name, state_code, display_name, sort_rank")
        .eq("is_active", true)
        .ilike("search_name", `%${cityQuery}%`)
        .order("sort_rank", { ascending: false })
        .order("display_name", { ascending: true })
        .limit(12);

      if (!active) {
        return;
      }

      setCityItems(error ? [] : ((data as BrazilCityItem[]) || []));
      setCityLoading(false);
    }

    void run();

    return () => {
      active = false;
    };
  }, [supabase, cityQuery, citySelected]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!genreCatalogQuery) {
        setCatalogGenreItems([]);
        setGenreLoading(false);
        return;
      }

      setGenreLoading(true);

      const { data, error } = await supabase
        .from("catalog_items")
        .select("id, item_type, name, subtitle, country_code, city_label, popularity")
        .eq("item_type", "genre")
        .eq("is_active", true)
        .ilike("normalized_name", `%${genreCatalogQuery}%`)
        .order("popularity", { ascending: false })
        .order("name", { ascending: true })
        .limit(10);

      if (!active) {
        return;
      }

      setCatalogGenreItems(error ? [] : ((data as CatalogItem[]) || []));
      setGenreLoading(false);
    }

    void run();

    return () => {
      active = false;
    };
  }, [supabase, genreCatalogQuery]);

  function setPrimaryGenre(value: string) {
    const target = normalizeText(value);

    if (!target) {
      return;
    }

    setGenres((current) => {
      const rest = current.filter(
        (item) => normalizeSearchText(item) !== normalizeSearchText(target)
      );

      return uniqueItems([target, ...rest]);
    });
  }

  function addGenre(value: string) {
    const cleanValue = normalizeText(value);

    if (!cleanValue) {
      return;
    }

    if (genreLimitReached && !containsItem(genres, cleanValue)) {
      setMessage("Você pode escolher até 8 vertentes.");
      return;
    }

    setGenres((current) => uniqueItems([...current, cleanValue]));
    setGenreInput("");
    setMessage("");
  }

  function chooseGenre(value: string) {
    if (containsItem(genres, value)) {
      setPrimaryGenre(value);
      setGenreInput("");
      return;
    }

    addGenre(value);
  }

  function removeGenre(target: string) {
    setGenres((current) =>
      current.filter(
        (item) => normalizeSearchText(item) !== normalizeSearchText(target)
      )
    );
    setMessage("");
  }

  function handleGenreEnter() {
    const cleanValue = normalizeText(genreInput);

    if (!cleanValue) {
      return;
    }

    const exactMatch = genreSuggestions.find(
      (item) =>
        normalizeSearchText(item.name) === normalizeSearchText(cleanValue)
    );

    chooseGenre(exactMatch ? exactMatch.name : cleanValue);
  }

  function selectCity(displayName: string) {
    setCity(displayName);
    setCitySelected(true);
    setCityItems([]);
  }

  function useSuggestion() {
    setDescription(GENERIC_DESCRIPTION);
    setMessage("Sugestão adicionada à sua descrição.");
  }

  async function saveIdentity() {
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Faça login novamente para salvar sua identidade.");
      }

      const { data: ownedCard } = await supabase
        .from("cards")
        .select("card_id")
        .eq("card_id", cardId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!ownedCard) {
        throw new Error("Este Perfil Clubber não pertence ao usuário atual.");
      }

      const { error } = await supabase
        .from("club_profiles")
        .update({
          city_base: normalizeText(city) || null,
          club_tagline: normalizeText(description) || null,
          favorite_genres: genres.length > 0 ? genres.join(", ") : null,
        })
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setMessage("Identidade salva com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar sua identidade agora."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="focused-identity-form">
      <style>{managerCss}</style>

      <section className="focused-card">
        <div className="focused-heading">
          <p className="focused-eyebrow">Minha cidade</p>
          <h2>Cidade e estado</h2>
          <p>Digite sua cidade e escolha uma opção no formato Cidade - UF.</p>
        </div>

        <label className="focused-field">
          <span>Cidade e estado</span>
          <input
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setCitySelected(false);
            }}
            onFocus={() => {
              if (!normalizeText(city)) {
                setCitySelected(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && cityItems.length > 0) {
                event.preventDefault();
                selectCity(cityItems[0].display_name);
              }
            }}
            placeholder="Ex.: São Caetano do Sul"
            autoComplete="address-level2"
          />
        </label>

        {!citySelected ? (
          <div className="focused-city-results" aria-live="polite">
            {cityLoading ? (
              <p>Buscando cidades...</p>
            ) : cityItems.length > 0 ? (
              cityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="focused-city-result"
                  onClick={() => selectCity(item.display_name)}
                >
                  {item.display_name}
                </button>
              ))
            ) : normalizeText(city) ? (
              <p>Nenhuma cidade encontrada. Você pode continuar digitando.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="focused-card">
        <div className="focused-heading">
          <p className="focused-eyebrow">Sobre mim</p>
          <h2>Minha descrição</h2>
          <p>
            Escreva uma frase curta sobre você e o que mais combina com sua experiência
            na música eletrônica.
          </p>
        </div>

        <label className="focused-field">
          <span>Minha descrição</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Escreva uma frase curta sobre você."
          />
        </label>

        <div className="focused-suggestion-card">
          <div>
            <strong>Sugestão de descrição</strong>
            <p>{GENERIC_DESCRIPTION}</p>
          </div>

          <button
            type="button"
            className="focused-text-action"
            onClick={useSuggestion}
          >
            Usar sugestão
          </button>
        </div>
      </section>

      <section className="focused-card music-identity-card">
        <div className="focused-heading music-heading">
          <p className="focused-eyebrow">Minha música</p>
          <h2>Minha identidade musical</h2>
          <p>Escolha as vertentes que mais representam você.</p>
        </div>

        <div className="music-primary-stage">
          <div className="music-primary-topline">
            <p className="music-label">Meu som principal</p>

            {primaryGenre ? (
              <button
                type="button"
                className="music-primary-remove"
                onClick={() => removeGenre(primaryGenre)}
              >
                Remover
              </button>
            ) : null}
          </div>

          {primaryGenre ? (
            <>
              <p className="music-primary-name">{primaryGenre}</p>
              <p className="music-primary-copy">O som que mais representa você.</p>
            </>
          ) : (
            <>
              <p className="music-primary-empty">Seu som principal começa aqui.</p>
              <p className="music-primary-copy">
                A primeira vertente que você escolher será destacada como principal.
              </p>
            </>
          )}
        </div>

        {secondaryGenres.length > 0 ? (
          <div className="music-secondary-section">
            <div className="music-secondary-heading">
              <p className="music-label">Também faz parte do meu som</p>
              <p className="music-secondary-help">
                Toque em uma vertente para torná-la principal.
              </p>
            </div>

            <div className="music-secondary-list">
              {secondaryGenres.map((genre) => (
                <div
                  key={normalizeSearchText(genre)}
                  className="music-secondary-chip"
                >
                  <button
                    type="button"
                    className="music-secondary-main"
                    onClick={() => setPrimaryGenre(genre)}
                    aria-label={`Definir ${genre} como som principal`}
                  >
                    {genre}
                  </button>

                  <button
                    type="button"
                    className="music-secondary-remove"
                    onClick={() => removeGenre(genre)}
                    aria-label={`Remover ${genre}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="music-search-section">
          <label className="focused-field">
            <span>Encontre uma vertente</span>
            <input
              value={genreInput}
              onChange={(event) => setGenreInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleGenreEnter();
                }
              }}
              placeholder="Busque por nome: EDM, Techno, Psytrance..."
              autoComplete="off"
            />
            <small>
              {genres.length} de {MAX_GENRES} vertentes escolhidas. Digite para pesquisar. Se não encontrar, pressione Enter para adicionar.
            </small>
          </label>

          {hasGenreQuery ? (
            <div className="music-search-results" aria-live="polite">
              {genreLoading && genreSuggestions.length === 0 ? (
                <p>Buscando vertentes...</p>
              ) : genreSuggestions.length > 0 ? (
                genreSuggestions.map((item) => {
                  const selected = containsItem(genres, item.name);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      className="music-search-result"
                      onClick={() => chooseGenre(item.name)}
                    >
                      <span>{item.name}</span>
                      <span className="music-search-action">
                        {selected
                          ? "Tornar principal"
                          : genreLimitReached
                            ? "Limite atingido"
                            : "Adicionar"}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p>
                  Nenhuma vertente encontrada. Pressione Enter para adicionar o texto digitado.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <div className="focused-actions">
        <button
          type="button"
          className="focused-primary"
          onClick={saveIdentity}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar identidade"}
        </button>

        <a
          href={`/dashboard/cards/${cardId}/club`}
          className="focused-secondary"
        >
          Voltar sem alterar
        </a>
      </div>

      {message ? (
        <p className="focused-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

const managerCss = `
  .focused-identity-form {
    display: grid;
    gap: 16px;
  }

  .focused-card {
    padding: 24px;
    display: grid;
    gap: 22px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 22px;
    background: #0e0e0e;
  }

  .focused-heading {
    display: grid;
    gap: 5px;
  }

  .focused-heading h2 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 22px;
    line-height: 1.2;
    letter-spacing: -0.025em;
    font-weight: 820;
  }

  .focused-heading > p:not(.focused-eyebrow) {
    margin: 7px 0 0;
    color: #aeb6c2;
    font-size: 14px;
    line-height: 1.7;
  }

  .focused-eyebrow,
  .music-label {
    margin: 0;
    color: #2a8694;
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 850;
  }

  .focused-field {
    display: grid;
    gap: 9px;
  }

  .focused-field > span,
  .focused-suggestion-card strong {
    color: #f8fafc;
    font-size: 13px;
    font-weight: 760;
  }

  .focused-field input,
  .focused-field textarea {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    background: #111111;
    color: #f8fafc;
    padding: 14px 15px;
    font: inherit;
    outline: none;
  }

  .focused-field textarea {
    min-height: 112px;
    resize: vertical;
    line-height: 1.6;
  }

  .focused-field input:focus,
  .focused-field textarea:focus {
    border-color: #2a8694;
  }

  .focused-field input::placeholder,
  .focused-field textarea::placeholder {
    color: #6f7782;
  }

  .focused-field small,
  .focused-suggestion-card p,
  .focused-message,
  .focused-city-results p,
  .music-search-results p,
  .music-secondary-help {
    margin: 0;
    color: #89929f;
    font-size: 12px;
    line-height: 1.55;
  }

  .focused-city-results {
    margin-top: -8px;
    display: grid;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .focused-city-result {
    width: 100%;
    min-height: 40px;
    padding: 10px 2px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    color: #cbd5e1;
    text-align: left;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .focused-city-result:hover {
    color: #ffffff;
  }

  .focused-suggestion-card {
    padding: 15px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    background: #111111;
  }

  .focused-suggestion-card > div {
    display: grid;
    gap: 7px;
  }

  .focused-text-action {
    padding: 0;
    border: 0;
    background: transparent;
    color: #cbd5e1;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .focused-text-action:hover {
    color: #ffffff;
  }

  .music-identity-card {
    gap: 24px;
    overflow: hidden;
  }

  .music-primary-stage {
    position: relative;
    padding: 24px 24px 22px;
    display: grid;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-left: 3px solid #2a8694;
    border-radius: 18px;
    background: #111111;
  }

  .music-primary-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .music-primary-remove {
    padding: 0;
    border: 0;
    background: transparent;
    color: #89929f;
    font: inherit;
    font-size: 10px;
    font-weight: 740;
    cursor: pointer;
  }

  .music-primary-remove:hover {
    color: #ffffff;
  }

  .music-primary-name {
    margin: 2px 0 0;
    color: #f8fafc;
    font-size: clamp(30px, 5vw, 48px);
    line-height: 0.98;
    letter-spacing: -0.045em;
    font-weight: 900;
  }

  .music-primary-empty {
    margin: 2px 0 0;
    color: #f8fafc;
    font-size: 23px;
    line-height: 1.15;
    letter-spacing: -0.025em;
    font-weight: 820;
  }

  .music-primary-copy {
    margin: 2px 0 0;
    color: #89929f;
    font-size: 12px;
    line-height: 1.6;
  }

  .music-secondary-section {
    display: grid;
    gap: 12px;
  }

  .music-secondary-heading {
    display: grid;
    gap: 6px;
  }

  .music-secondary-list {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .music-secondary-chip {
    min-height: 40px;
    display: inline-flex;
    align-items: stretch;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 13px;
    background: #111111;
    overflow: hidden;
  }

  .music-secondary-main,
  .music-secondary-remove {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }

  .music-secondary-main {
    padding: 8px 11px 8px 13px;
    color: #f8fafc;
    font-size: 12px;
    font-weight: 760;
  }

  .music-secondary-main:hover {
    color: #ffffff;
  }

  .music-secondary-remove {
    width: 34px;
    padding: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    color: #89929f;
    font-size: 16px;
    line-height: 1;
  }

  .music-secondary-remove:hover {
    color: #ffffff;
  }

  .music-secondary-chip:hover {
    border-color: #2a8694;
  }

  .music-search-section {
    padding-top: 2px;
    display: grid;
    gap: 12px;
  }

  .music-search-results {
    display: grid;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .music-search-result {
    width: 100%;
    min-height: 46px;
    padding: 11px 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    color: #f8fafc;
    text-align: left;
    font: inherit;
    font-size: 13px;
    font-weight: 760;
    cursor: pointer;
  }

  .music-search-result:hover {
    color: #ffffff;
  }

  .music-search-action {
    flex: 0 0 auto;
    color: #89929f;
    font-size: 11px;
    font-weight: 720;
  }

  .music-search-result:hover .music-search-action {
    color: #2a8694;
  }

  .focused-actions {
    padding-top: 4px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .focused-primary {
    min-height: 48px;
    padding: 13px 18px;
    border: 1px solid rgba(42, 134, 148, 0.52);
    border-radius: 14px;
    background: #247c88;
    color: #ffffff;
    font: inherit;
    font-size: 14px;
    font-weight: 850;
    cursor: pointer;
  }

  .focused-primary:hover {
    background: #2a8694;
  }

  .focused-primary:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .focused-secondary {
    color: #cbd5e1;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
  }

  .focused-secondary:hover {
    color: #ffffff;
  }

  .focused-message {
    padding: 2px 2px 0;
  }

  @media (max-width: 760px) {
    .focused-card {
      padding: 18px;
      border-radius: 18px;
    }

    .focused-heading h2 {
      font-size: 20px;
    }

    .focused-suggestion-card {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .music-primary-stage {
      padding: 20px 18px 18px;
      border-radius: 16px;
    }

    .music-primary-name {
      font-size: 34px;
    }

    .music-secondary-list {
      gap: 8px;
    }

    .music-secondary-chip {
      min-height: 38px;
    }

    .music-secondary-main {
      padding-inline: 11px;
      font-size: 11px;
    }

    .music-secondary-remove {
      width: 32px;
    }

    .focused-actions {
      display: grid;
      gap: 13px;
    }

    .focused-primary {
      width: 100%;
    }

    .focused-secondary {
      text-align: center;
    }
  }

  @media (max-width: 420px) {
    .focused-card {
      padding: 16px;
      border-radius: 16px;
    }

    .music-primary-name {
      font-size: 31px;
    }

    .music-secondary-list {
      gap: 7px;
    }

    .music-secondary-main {
      max-width: 235px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;
