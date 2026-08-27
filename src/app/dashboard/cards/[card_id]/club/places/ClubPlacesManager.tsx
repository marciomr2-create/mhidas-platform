"use client";

import { useState } from "react";

type CatalogType = "club" | "venue";

type Suggestion = {
  name?: string | null;
  type?: CatalogType | string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  image_url?: string | null;
  official_url?: string | null;
  instagram_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source_provider?: string | null;
};

const css = `
  .places-manager {
    display: grid;
    gap: 22px;
  }

  .places-section {
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  .places-section-head {
    display: grid;
    gap: 6px;
    margin-bottom: 18px;
  }

  .places-section-head h2 {
    margin: 0;
    font-size: 21px;
  }

  .places-section-head p {
    margin: 0;
    color: #CBD5E1;
    line-height: 1.5;
  }

  .places-saved-grid,
  .places-results-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .places-card {
    min-height: 150px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.09);
    border-top: 2px solid #2A8694;
    border-radius: 14px;
    background: #111111;
    display: grid;
    align-content: space-between;
    gap: 20px;
  }

  .places-card h3 {
    margin: 0;
    font-size: 18px;
  }

  .places-card p {
    margin: 7px 0 0;
    color: #CBD5E1;
    line-height: 1.45;
  }

  .places-card-image {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 14px;
  }

  .places-actions {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .places-action {
    padding: 3px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #CBD5E1;
    font: inherit;
    font-size: 13px;
    font-weight: 850;
    text-decoration: none;
    cursor: pointer;
  }

  .places-action:hover:not(:disabled) {
    color: #F8FAFC;
  }

  .places-action-primary {
    padding: 9px 14px;
    border: 1px solid rgba(42,134,148,0.66);
    border-radius: 8px;
    background: #247C88;
    color: #F8FAFC;
  }

  .places-action:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .places-search-form {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: end;
  }

  .places-field {
    display: grid;
    gap: 7px;
  }

  .places-field label {
    color: #F8FAFC;
    font-size: 13px;
    font-weight: 800;
  }

  .places-field input,
  .places-field select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    background: #050505;
    color: #F8FAFC;
    padding: 11px 12px;
    font: inherit;
    outline: none;
  }

  .places-field input:focus,
  .places-field select:focus {
    border-color: rgba(42,134,148,0.75);
  }

  .places-feedback {
    margin: 14px 0 0;
    color: #CBD5E1;
    font-size: 13px;
  }

  .places-empty {
    margin: 0;
    color: #CBD5E1;
  }

  @media (max-width: 720px) {
    .places-section {
      padding: 17px;
      border-radius: 14px;
    }

    .places-saved-grid,
    .places-results-grid {
      grid-template-columns: 1fr;
    }

    .places-card {
      min-height: 0;
      padding: 17px;
      border-radius: 12px;
    }

    .places-search-form {
      grid-template-columns: 1fr;
    }
  }
`;

function normalize(value: unknown): string {
  return String(value || "").trim();
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = normalize(value);
    const key = clean.toLocaleLowerCase("pt-BR");

    if (!clean || seen.has(key)) continue;

    seen.add(key);
    result.push(clean);
  }

  return result;
}

function parseCityBase(value: string): { city: string; state: string } {
  const parts = normalize(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    city: parts[0] || "",
    state: parts[1] || "",
  };
}

function suggestionLocation(item: Suggestion): string {
  return [normalize(item.city), normalize(item.state)].filter(Boolean).join(" • ");
}

export default function ClubPlacesManager({
  cardId,
  initialPlaces,
  cityBase,
}: {
  cardId: string;
  initialPlaces: string[];
  cityBase: string;
}) {
  const [savedPlaces, setSavedPlaces] = useState(uniqueNames(initialPlaces));
  const [query, setQuery] = useState("");
  const [type, setType] = useState<CatalogType>("club");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState("");

  const parsedCity = parseCityBase(cityBase);

  async function search() {
    const cleanQuery = normalize(query);

    if (cleanQuery.length < 2) {
      setFeedback("Digite pelo menos 2 caracteres para buscar.");
      return;
    }

    setLoading(true);
    setFeedback("");
    setSuggestions([]);

    try {
      const response = await fetch("/api/club-catalog/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanQuery,
          type,
          city: parsedCity.city,
          state: parsedCity.state,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Não foi possível buscar agora.");
      }

      const next = Array.isArray(data.suggestions) ? data.suggestions : [];
      setSuggestions(next);

      if (next.length === 0) {
        setFeedback("Nenhum resultado encontrado. Tente o nome oficial do lugar.");
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível buscar agora."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addSuggestion(item: Suggestion, index: number) {
    const name = normalize(item.name);
    if (!name) return;

    const key = `${normalize(item.source_url) || normalize(item.official_url) || name}-${index}`;
    setSavingKey(key);
    setFeedback("");

    try {
      const payload = {
        name,
        type: normalize(item.type) || type,
        city: normalize(item.city) || parsedCity.city,
        state: normalize(item.state) || parsedCity.state,
        country: normalize(item.country) || "Brasil",
        image_url: normalize(item.image_url) || null,
        official_url: normalize(item.official_url) || null,
        instagram_url: normalize(item.instagram_url) || null,
        source_url:
          normalize(item.source_url) ||
          normalize(item.official_url) ||
          normalize(item.instagram_url) ||
          null,
        source_name: normalize(item.source_name) || null,
        source_provider: normalize(item.source_provider) || "dashboard",
      };

      const response = await fetch("/api/club-catalog/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Não foi possível adicionar este lugar.");
      }

      setSavedPlaces((current) => uniqueNames([...current, name]));
      setFeedback(`${name} foi adicionado ao Perfil Clubber.`);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível adicionar este lugar."
      );
    } finally {
      setSavingKey("");
    }
  }

  async function addManual() {
    const value = normalize(query);

    if (value.length < 2) {
      setFeedback("Digite o nome do club ou lugar.");
      return;
    }

    setSavingKey("manual");
    setFeedback("");

    try {
      const response = await fetch("/api/club-profile/add-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          field: "favorite_clubs",
          value,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "Não foi possível adicionar.");
      }

      setSavedPlaces((current) => uniqueNames([...current, value]));
      setQuery("");
      setSuggestions([]);
      setFeedback(`${value} foi adicionado.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível adicionar.");
    } finally {
      setSavingKey("");
    }
  }

  async function removePlace(value: string) {
    if (!value || savingKey) return;

    setSavingKey(`remove:${value}`);
    setFeedback("");

    try {
      const response = await fetch("/api/club-profile/remove-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          field: "favorite_clubs",
          value,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "Não foi possível remover.");
      }

      setSavedPlaces((current) =>
        current.filter(
          (item) => item.toLocaleLowerCase("pt-BR") !== value.toLocaleLowerCase("pt-BR")
        )
      );
      setFeedback(`${value} foi removido.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível remover.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div className="places-manager">
      <style>{css}</style>

      <section className="places-section">
        <div className="places-section-head">
          <h2>Meus lugares</h2>
          <p>Clubes e locais que ajudam a contar sua identidade dentro da música eletrônica.</p>
        </div>

        {savedPlaces.length > 0 ? (
          <div className="places-saved-grid">
            {savedPlaces.map((place) => (
              <article className="places-card" key={place}>
                <div>
                  <h3>{place}</h3>
                  <p>Adicionado ao seu Perfil Clubber</p>
                </div>

                <div className="places-actions">
                  <button
                    type="button"
                    className="places-action"
                    disabled={Boolean(savingKey)}
                    onClick={() => void removePlace(place)}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="places-empty">Você ainda não adicionou nenhum club ou lugar.</p>
        )}
      </section>

      <section className="places-section">
        <div className="places-section-head">
          <h2>Adicionar club ou lugar</h2>
          <p>Busque pelo nome oficial para aproveitar imagem e referência do catálogo quando disponíveis.</p>
        </div>

        <div className="places-search-form">
          <div className="places-field">
            <label htmlFor="place-type">Tipo</label>
            <select
              id="place-type"
              value={type}
              onChange={(event) => setType(event.target.value as CatalogType)}
            >
              <option value="club">Club</option>
              <option value="venue">Local</option>
            </select>
          </div>

          <div className="places-field">
            <label htmlFor="place-query">Nome</label>
            <input
              id="place-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex: Surreal Park, Green Valley, Laroc Club"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void search();
                }
              }}
            />
          </div>

          <button
            type="button"
            className="places-action places-action-primary"
            onClick={() => void search()}
            disabled={loading || Boolean(savingKey)}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {suggestions.length > 0 ? (
          <div className="places-results-grid" style={{ marginTop: 16 }}>
            {suggestions.map((item, index) => {
              const name = normalize(item.name);
              const key =
                `${normalize(item.source_url) || normalize(item.official_url) || name}-${index}`;
              const location = suggestionLocation(item);

              return (
                <article className="places-card" key={key}>
                  <div>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="places-card-image"
                        loading="lazy"
                      />
                    ) : null}

                    <h3>{name || "Resultado"}</h3>
                    {location ? <p>{location}</p> : null}
                  </div>

                  <div className="places-actions">
                    <button
                      type="button"
                      className="places-action places-action-primary"
                      disabled={Boolean(savingKey)}
                      onClick={() => void addSuggestion(item, index)}
                    >
                      {savingKey === key ? "Adicionando..." : "Adicionar"}
                    </button>

                    {item.official_url ? (
                      <a
                        className="places-action"
                        href={item.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {query.trim().length >= 2 ? (
          <div className="places-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="places-action"
              disabled={Boolean(savingKey)}
              onClick={() => void addManual()}
            >
              Adicionar pelo nome
            </button>
          </div>
        ) : null}

        {feedback ? (
          <p className="places-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
        ) : null}
      </section>
    </div>
  );
}
