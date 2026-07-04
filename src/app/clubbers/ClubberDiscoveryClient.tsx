"use client";

// src/app/clubbers/ClubberDiscoveryClient.tsx
import Link from "next/link";
import { useMemo, useState } from "react";
import ClubberConnectButton from "./ClubberConnectButton";

export type InitialConnectionState =
  | "none"
  | "unauthorized"
  | "outgoing_pending"
  | "incoming_pending"
  | "connected"
  | "blocked"
  | "suspended";

export type ClubberDiscoveryItem = {
  user_id: string;
  slug: string;
  label: string;
  city_base: string;
  club_tagline: string;
  club_photo_url: string;
  favorite_genres: string[];
  open_to_networking: boolean;
  initial_connection_state: InitialConnectionState;
};

export type ClubberViewerContext = {
  user_id: string;
  city_base: string;
  favorite_genres: string[];
  is_authenticated: boolean;
};

type Props = {
  items: ClubberDiscoveryItem[];
  viewer: ClubberViewerContext;
};

type RankedItem = ClubberDiscoveryItem & {
  score: number;
  reasons: string[];
};

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-/_,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractState(cityBase: string): string {
  const normalized = normalizeText(cityBase).toUpperCase();
  const match = normalized.match(/(?:-|\/|,)\s*([A-Z]{2})$/);

  return match?.[1] || "";
}

function getRegionFromState(state: string): string {
  const uf = normalizeText(state).toUpperCase();

  if (["PR", "SC", "RS"].includes(uf)) return "Sul";
  if (["SP", "RJ", "MG", "ES"].includes(uf)) return "Sudeste";
  if (["DF", "GO", "MT", "MS"].includes(uf)) return "Centro-Oeste";
  if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(uf)) {
    return "Nordeste";
  }
  if (["AM", "PA", "AC", "RO", "RR", "AP", "TO"].includes(uf)) return "Norte";

  return "";
}

function dedupeAndSort(values: string[]): string[] {
  const map = new Map<string, string>();

  for (const value of values) {
    const clean = normalizeText(value);
    const key = normalizeForMatch(clean);

    if (!clean || !key || map.has(key)) {
      continue;
    }

    map.set(key, clean);
  }

  return Array.from(map.values()).sort((left, right) =>
    left.localeCompare(right, "pt-BR"),
  );
}

function commonGenres(left: string[], right: string[]): string[] {
  const rightMap = new Map(
    right.map((genre) => [normalizeForMatch(genre), normalizeText(genre)]),
  );

  const result: string[] = [];

  for (const genre of left) {
    const key = normalizeForMatch(genre);

    if (key && rightMap.has(key)) {
      result.push(normalizeText(genre));
    }
  }

  return dedupeAndSort(result);
}

function includesSearch(item: ClubberDiscoveryItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const source = [
    item.label,
    item.city_base,
    item.club_tagline,
    ...item.favorite_genres,
  ]
    .map((value) => normalizeForMatch(value))
    .join(" ");

  return source.includes(query);
}

function matchesCity(item: ClubberDiscoveryItem, city: string): boolean {
  if (!city) {
    return true;
  }

  return normalizeForMatch(item.city_base).includes(city);
}

function matchesState(item: ClubberDiscoveryItem, state: string): boolean {
  if (!state) {
    return true;
  }

  return extractState(item.city_base) === state;
}

function matchesGenre(item: ClubberDiscoveryItem, genre: string): boolean {
  if (!genre) {
    return true;
  }

  return item.favorite_genres.some(
    (itemGenre) => normalizeForMatch(itemGenre) === genre,
  );
}

function rankItem(
  item: ClubberDiscoveryItem,
  viewer: ClubberViewerContext,
  filters: {
    query: string;
    city: string;
    state: string;
    genre: string;
  },
): RankedItem {
  const reasons: string[] = [];
  let score = 0;

  const viewerCity = normalizeForMatch(viewer.city_base);
  const itemCity = normalizeForMatch(item.city_base);
  const viewerState = extractState(viewer.city_base);
  const itemState = extractState(item.city_base);
  const viewerRegion = getRegionFromState(viewerState);
  const itemRegion = getRegionFromState(itemState);
  const sharedGenres = commonGenres(
    viewer.favorite_genres,
    item.favorite_genres,
  );

  if (viewerCity && itemCity && viewerCity === itemCity) {
    score += 140;
    reasons.push("Mesma cidade");
  } else if (viewerState && itemState && viewerState === itemState) {
    score += 48;
    reasons.push("Mesmo estado");
  } else if (viewerRegion && itemRegion && viewerRegion === itemRegion) {
    score += 18;
    reasons.push("Mesma região");
  }

  if (sharedGenres.length > 0) {
    score += Math.min(sharedGenres.length, 4) * 52;
    reasons.push(
      sharedGenres.length === 1
        ? `Vertente em comum: ${sharedGenres[0]}`
        : `${sharedGenres.length} vertentes em comum`,
    );
  }

  if (filters.city && matchesCity(item, filters.city)) {
    score += 90;
    reasons.push("Cidade selecionada");
  }

  if (filters.state && matchesState(item, filters.state)) {
    score += 55;
    reasons.push("Estado selecionado");
  }

  if (filters.genre && matchesGenre(item, filters.genre)) {
    score += 85;
    const selectedGenre =
      item.favorite_genres.find(
        (genre) => normalizeForMatch(genre) === filters.genre,
      ) || "Vertente selecionada";
    reasons.push(`Também curte ${selectedGenre}`);
  }

  if (filters.query && includesSearch(item, filters.query)) {
    score += 60;
  }

  if (item.open_to_networking) {
    score += 16;
    reasons.push("Aberto a novas conexões");
  }

  if (item.club_photo_url) {
    score += 5;
  }

  if (item.club_tagline) {
    score += 4;
  }

  if (reasons.length === 0) {
    if (item.favorite_genres[0]) {
      reasons.push(`Curte ${item.favorite_genres[0]}`);
    } else if (item.city_base) {
      reasons.push(item.city_base);
    } else {
      reasons.push("Perfil Clubber publicado");
    }
  }

  return {
    ...item,
    score,
    reasons: dedupeAndSort(reasons).slice(0, 3),
  };
}

export default function ClubberDiscoveryClient({ items, viewer }: Props) {
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");

  const cities = useMemo(
    () => dedupeAndSort(items.map((item) => item.city_base).filter(Boolean)),
    [items],
  );

  const states = useMemo(
    () =>
      dedupeAndSort(
        items.map((item) => extractState(item.city_base)).filter(Boolean),
      ),
    [items],
  );

  const genres = useMemo(
    () =>
      dedupeAndSort(
        items.flatMap((item) => item.favorite_genres).filter(Boolean),
      ),
    [items],
  );

  const normalizedFilters = {
    query: normalizeForMatch(query),
    city: normalizeForMatch(cityFilter),
    state: normalizeText(stateFilter).toUpperCase(),
    genre: normalizeForMatch(genreFilter),
  };

  const hasActiveFilters = Boolean(
    normalizedFilters.query ||
      normalizedFilters.city ||
      normalizedFilters.state ||
      normalizedFilters.genre,
  );

  const exactItems = useMemo(
    () =>
      items.filter(
        (item) =>
          includesSearch(item, normalizedFilters.query) &&
          matchesCity(item, normalizedFilters.city) &&
          matchesState(item, normalizedFilters.state) &&
          matchesGenre(item, normalizedFilters.genre),
      ),
    [
      items,
      normalizedFilters.city,
      normalizedFilters.genre,
      normalizedFilters.query,
      normalizedFilters.state,
    ],
  );

  const relaxedItems = useMemo(() => {
    if (!hasActiveFilters || exactItems.length > 0) {
      return exactItems;
    }

    const matches = items.filter((item) => {
      const activeMatches = [
        normalizedFilters.query
          ? includesSearch(item, normalizedFilters.query)
          : false,
        normalizedFilters.city
          ? matchesCity(item, normalizedFilters.city)
          : false,
        normalizedFilters.state
          ? matchesState(item, normalizedFilters.state)
          : false,
        normalizedFilters.genre
          ? matchesGenre(item, normalizedFilters.genre)
          : false,
      ];

      return activeMatches.some(Boolean);
    });

    return matches.length > 0 ? matches : items;
  }, [
    exactItems,
    hasActiveFilters,
    items,
    normalizedFilters.city,
    normalizedFilters.genre,
    normalizedFilters.query,
    normalizedFilters.state,
  ]);

  const rankedItems = useMemo(
    () =>
      relaxedItems
        .map((item) =>
          rankItem(item, viewer, {
            query: normalizedFilters.query,
            city: normalizedFilters.city,
            state: normalizedFilters.state,
            genre: normalizedFilters.genre,
          }),
        )
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }

          return left.label.localeCompare(right.label, "pt-BR");
        })
        .slice(0, 48),
    [
      relaxedItems,
      normalizedFilters.city,
      normalizedFilters.genre,
      normalizedFilters.query,
      normalizedFilters.state,
      viewer,
    ],
  );

  const searchWasExpanded =
    hasActiveFilters && exactItems.length === 0 && rankedItems.length > 0;

  function clearFilters() {
    setQuery("");
    setCityFilter("");
    setStateFilter("");
    setGenreFilter("");
  }

  return (
    <main className="clubber-discovery-page">
      <header className="clubber-discovery-hero">
        <div className="clubber-discovery-hero__topline">
          <Link href="/dashboard" className="clubber-discovery-back">
            ← Minha central
          </Link>

        </div>

        <div className="clubber-discovery-hero__content">
          <div>
            <h1>Descobrir Clubbers</h1>
            <p>
              Encontre pessoas da sua cidade e com vertentes musicais em comum,
              sem depender de um evento específico.
            </p>
          </div>

          <div className="clubber-discovery-summary">
            <strong>{items.length}</strong>
            <span>perfis publicados disponíveis</span>
          </div>
        </div>
      </header>

      <section
        className="clubber-discovery-filters"
        aria-label="Filtros de descoberta Clubber"
      >
        <div className="clubber-discovery-filter clubber-discovery-filter--wide">
          <label htmlFor="clubber-search">Buscar Clubber</label>
          <input
            id="clubber-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, cidade, vertente ou descrição"
          />
        </div>

        <div className="clubber-discovery-filter">
          <label htmlFor="clubber-city">Cidade</label>
          <input
            id="clubber-city"
            list="clubber-city-options"
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            placeholder="Ex.: São Paulo - SP"
          />
          <datalist id="clubber-city-options">
            {cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>

        <div className="clubber-discovery-filter">
          <label htmlFor="clubber-state">Estado</label>
          <select
            id="clubber-state"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div className="clubber-discovery-filter">
          <label htmlFor="clubber-genre">Vertente musical</label>
          <select
            id="clubber-genre"
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
          >
            <option value="">Todas</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="clubber-discovery-clear"
          >
            Limpar filtros
          </button>
        ) : null}
      </section>

      <section className="clubber-discovery-results-heading">
        <div>
          <span className="clubber-discovery-kicker">
            {searchWasExpanded ? "Busca ampliada" : "Resultados"}
          </span>
          <h2>
            {rankedItems.length === 1
              ? "1 Clubber encontrado"
              : `${rankedItems.length} Clubbers encontrados`}
          </h2>
        </div>

        <p>
          {searchWasExpanded
            ? "Não encontramos uma combinação exata. Mostramos as pessoas mais próximas dos critérios escolhidos."
            : viewer.city_base || viewer.favorite_genres.length > 0
              ? "Os perfis mais compatíveis com sua cidade e sua identidade musical aparecem primeiro."
              : "Use cidade e vertente para aproximar os resultados da sua vibe."}
        </p>
      </section>

      {rankedItems.length > 0 ? (
        <section className="clubber-discovery-grid">
          {rankedItems.map((item) => (
            <article key={item.user_id} className="clubber-discovery-card">
              <div className="clubber-discovery-card__identity">
                <div
                  className="clubber-discovery-photo"
                  role="img"
                  aria-label={`Foto de ${item.label}`}
                  style={{
                    backgroundImage: item.club_photo_url
                      ? `url(${item.club_photo_url})`
                      : "linear-gradient(135deg, rgba(125,92,255,0.34), rgba(0,255,190,0.16))",
                  }}
                />

                <div className="clubber-discovery-card__name">
                  <h3>{item.label}</h3>
                  <span>{item.city_base || "Cidade não informada"}</span>
                </div>
              </div>

              {item.club_tagline ? (
                <p className="clubber-discovery-card__tagline">
                  {item.club_tagline}
                </p>
              ) : null}

              {item.favorite_genres.length > 0 ? (
                <div className="clubber-discovery-genres">
                  {item.favorite_genres.slice(0, 4).map((genre) => (
                    <span key={`${item.user_id}-${genre}`}>{genre}</span>
                  ))}
                </div>
              ) : null}

              <div className="clubber-discovery-reasons">
                <span>Por que apareceu</span>
                <ul>
                  {item.reasons.map((reason) => (
                    <li key={`${item.user_id}-${reason}`}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="clubber-discovery-actions">
                <ClubberConnectButton
                  targetUserId={item.user_id}
                  initialState={item.initial_connection_state}
                  isAuthenticated={viewer.is_authenticated}
                  loginReturnTo="/clubbers"
                />

                <Link
                  href={`/${item.slug}?mode=club&return_to=${encodeURIComponent(
                    "/clubbers",
                  )}`}
                  className="clubber-discovery-profile-link"
                >
                  Ver perfil Club
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="clubber-discovery-empty">
          <strong>Nenhum Perfil Clubber publicado está disponível agora.</strong>
          <p>
            Assim que novos perfis forem publicados, eles aparecerão nesta
            descoberta.
          </p>
          <Link href="/dashboard/cards">Revisar meu Perfil Clubber</Link>
        </section>
      )}

      <style jsx>{`
        :global(body) {
          background:
            radial-gradient(circle at 12% 0%, rgba(125, 92, 255, 0.12), transparent 34%),
            radial-gradient(circle at 90% 16%, rgba(0, 255, 190, 0.08), transparent 32%),
            #050609;
        }

        :global(.clubber-connect-button) {
          min-height: 44px;
          border-radius: 14px;
          padding: 11px 14px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          font: inherit;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 900;
          text-decoration: none;
          text-align: center;
          cursor: pointer;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        :global(.clubber-connect-button--primary) {
          color: #04110d;
          border-color: rgba(0, 255, 190, 0.66);
          background: linear-gradient(135deg, #00f0b5, #76ffd9);
          box-shadow: 0 12px 28px rgba(0, 255, 190, 0.13);
        }

        :global(.clubber-connect-button--status) {
          color: rgba(255, 255, 255, 0.74);
          background: rgba(255, 255, 255, 0.055);
          cursor: default;
        }

        :global(.clubber-connect-button:disabled) {
          opacity: 0.76;
        }

        .clubber-discovery-page {
          width: min(1180px, calc(100% - 24px));
          margin: 0 auto;
          padding: 16px 0 52px;
          color: #fff;
        }

        .clubber-discovery-hero {
          display: grid;
          gap: 22px;
          padding: 14px 2px 28px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .clubber-discovery-hero__topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .clubber-discovery-back {
          color: rgba(255, 255, 255, 0.76);
          font-size: 13px;
          font-weight: 850;
          text-decoration: none;
        }

        .clubber-discovery-kicker {
          color: #7affd9;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .clubber-discovery-hero__content {
          display: grid;
          gap: 18px;
        }

        .clubber-discovery-hero h1 {
          margin: 0;
          max-width: 760px;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .clubber-discovery-hero p {
          margin: 14px 0 0;
          max-width: 700px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 15px;
          line-height: 1.62;
        }

        .clubber-discovery-summary {
          display: grid;
          gap: 3px;
          align-content: end;
          padding-top: 6px;
        }

        .clubber-discovery-summary strong {
          font-size: 28px;
          line-height: 1;
        }

        .clubber-discovery-summary span {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
        }

        .clubber-discovery-filters {
          display: grid;
          gap: 12px;
          padding: 24px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .clubber-discovery-filter {
          display: grid;
          gap: 7px;
        }

        .clubber-discovery-filter label {
          color: rgba(255, 255, 255, 0.62);
          font-size: 11px;
          font-weight: 850;
        }

        .clubber-discovery-filter input,
        .clubber-discovery-filter select {
          width: 100%;
          min-height: 46px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          outline: none;
          background: rgba(255, 255, 255, 0.055);
          color: #fff;
          padding: 11px 13px;
          font: inherit;
          font-size: 13px;
        }

        .clubber-discovery-filter input:focus,
        .clubber-discovery-filter select:focus {
          border-color: rgba(0, 255, 190, 0.56);
          box-shadow: 0 0 0 3px rgba(0, 255, 190, 0.08);
        }

        .clubber-discovery-filter select option {
          background: #12141a;
          color: #fff;
        }

        .clubber-discovery-clear {
          min-height: 44px;
          align-self: end;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          background: transparent;
          color: rgba(255, 255, 255, 0.76);
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .clubber-discovery-results-heading {
          display: grid;
          gap: 12px;
          padding: 28px 0 18px;
        }

        .clubber-discovery-results-heading h2 {
          margin: 7px 0 0;
          font-size: 25px;
          letter-spacing: -0.035em;
        }

        .clubber-discovery-results-heading p {
          margin: 0;
          max-width: 680px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 13px;
          line-height: 1.55;
        }

        .clubber-discovery-grid {
          display: grid;
          gap: 14px;
        }

        .clubber-discovery-card {
          display: grid;
          gap: 16px;
          min-width: 0;
          padding: 17px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(22, 24, 31, 0.9), rgba(13, 15, 20, 0.9));
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.19);
        }

        .clubber-discovery-card__identity {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 13px;
          align-items: center;
        }

        .clubber-discovery-photo {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background-position: center;
          background-size: cover;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .clubber-discovery-card__name {
          min-width: 0;
        }

        .clubber-discovery-card__name h3 {
          margin: 0;
          overflow-wrap: anywhere;
          font-size: 20px;
          line-height: 1.1;
          letter-spacing: -0.025em;
        }

        .clubber-discovery-card__name span {
          display: block;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          line-height: 1.4;
        }

        .clubber-discovery-card__tagline {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          line-height: 1.55;
        }

        .clubber-discovery-genres {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .clubber-discovery-genres span {
          padding: 6px 8px;
          border: 1px solid rgba(125, 92, 255, 0.24);
          border-radius: 999px;
          background: rgba(125, 92, 255, 0.08);
          color: rgba(255, 255, 255, 0.77);
          font-size: 10px;
          font-weight: 800;
        }

        .clubber-discovery-reasons {
          display: grid;
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .clubber-discovery-reasons > span {
          color: rgba(255, 255, 255, 0.43);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .clubber-discovery-reasons ul {
          display: grid;
          gap: 5px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .clubber-discovery-reasons li {
          position: relative;
          padding-left: 14px;
          color: rgba(255, 255, 255, 0.77);
          font-size: 11px;
          line-height: 1.45;
        }

        .clubber-discovery-reasons li::before {
          content: "";
          position: absolute;
          top: 0.58em;
          left: 0;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #7affd9;
        }

        .clubber-discovery-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 9px;
        }

        .clubber-discovery-profile-link {
          min-height: 44px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.84);
          background: rgba(255, 255, 255, 0.04);
          font-size: 13px;
          font-weight: 850;
          text-decoration: none;
        }

        .clubber-discovery-empty {
          display: grid;
          gap: 10px;
          padding: 26px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
        }

        .clubber-discovery-empty p {
          margin: 0;
          color: rgba(255, 255, 255, 0.64);
          line-height: 1.55;
        }

        .clubber-discovery-empty a {
          width: fit-content;
          color: #7affd9;
          font-weight: 850;
          text-decoration: none;
        }

        @media (min-width: 720px) {
          .clubber-discovery-page {
            width: min(1180px, calc(100% - 40px));
            padding-top: 24px;
          }

          .clubber-discovery-hero__content {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
          }

          .clubber-discovery-filters {
            grid-template-columns:
              minmax(220px, 1.5fr)
              minmax(190px, 1fr)
              minmax(120px, 0.55fr)
              minmax(190px, 1fr)
              auto;
            align-items: end;
          }

          .clubber-discovery-results-heading {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
            align-items: end;
          }

          .clubber-discovery-results-heading p {
            justify-self: end;
            text-align: right;
          }

          .clubber-discovery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .clubber-discovery-actions {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (min-width: 1040px) {
          .clubber-discovery-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
