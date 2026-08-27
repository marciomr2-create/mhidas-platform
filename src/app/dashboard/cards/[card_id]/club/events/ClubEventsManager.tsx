"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type ClubEventView = "upcoming" | "previous" | "favorites" | "checkins";

export type CanonicalEvent = {
  id: string;
  slug: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  eventDateKey: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  officialUrl: string;
  ticketUrl: string;
  imageUrl: string;
};

export type ClubEventItem = {
  name: string;
  date: string;
  officialUrl: string;
  canonical: CanonicalEvent | null;
};

export type ClubCheckInItem = {
  eventName: string;
  eventKey: string;
  eventSlug: string;
  status: string;
  locationStatus: string;
  checkedInAt: string;
};

type Props = {
  cardId: string;
  initialView: ClubEventView;
  upcoming: ClubEventItem[];
  previous: ClubEventItem[];
  favorites: ClubEventItem[];
  checkIns: ClubCheckInItem[];
};

type EditableView = Exclude<ClubEventView, "checkins">;

const VIEW_META: Record<
  ClubEventView,
  { label: string; title: string; description: string }
> = {
  upcoming: {
    label: "Próximos",
    title: "Próximos eventos",
    description: "Eventos que você pretende participar.",
  },
  previous: {
    label: "Anteriores",
    title: "Eventos anteriores",
    description: "Eventos dos quais você participou.",
  },
  favorites: {
    label: "Favoritos",
    title: "Eventos favoritos",
    description: "Eventos que você quer manter como referência.",
  },
  checkins: {
    label: "Presenças",
    title: "Presenças registradas",
    description: "Registros de presença realizados pelo USECLUBBERS.",
  },
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCompare(value: unknown): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(value: string): string {
  const text = cleanText(value);
  if (!text) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string): string {
  const text = cleanText(value);
  if (!text) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function locationLabel(event: CanonicalEvent | null): string {
  if (!event) return "";

  return [event.venueName, [event.city, event.state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" • ");
}

function fieldForView(view: EditableView): "next_events" | "last_events" | "favorite_events" {
  if (view === "upcoming") return "next_events";
  if (view === "previous") return "last_events";
  return "favorite_events";
}

function viewFromField(
  field: "next_events" | "last_events" | "favorite_events"
): EditableView {
  if (field === "next_events") return "upcoming";
  if (field === "last_events") return "previous";
  return "favorites";
}

function checkInStatusLabel(status: string): string {
  if (status === "active") return "Presença registrada";
  if (status === "expired") return "Presença encerrada";
  if (status === "cancelled" || status === "canceled") return "Registro cancelado";
  return "Presença registrada";
}

export default function ClubEventsManager({
  cardId,
  initialView,
  upcoming: initialUpcoming,
  previous: initialPrevious,
  favorites: initialFavorites,
  checkIns,
}: Props) {
  const router = useRouter();

  const [view, setView] = useState<ClubEventView>(initialView);
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [previous, setPrevious] = useState(initialPrevious);
  const [favorites, setFavorites] = useState(initialFavorites);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CanonicalEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [removingName, setRemovingName] = useState("");
  const [message, setMessage] = useState("");
  const [enrichmentDone, setEnrichmentDone] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    setUpcoming(initialUpcoming);
  }, [initialUpcoming]);

  useEffect(() => {
    setPrevious(initialPrevious);
  }, [initialPrevious]);

  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  const items =
    view === "upcoming" ? upcoming : view === "previous" ? previous : favorites;

  const canonicalItems =
    view === "checkins" ? [] : items.filter((item) => Boolean(item.canonical));
  const legacyItems =
    view === "checkins" ? [] : items.filter((item) => !item.canonical);

  const tabs = useMemo(
    () => (Object.keys(VIEW_META) as ClubEventView[]),
    []
  );

  function setItemsForView(targetView: EditableView, nextItems: ClubEventItem[]) {
    if (targetView === "upcoming") setUpcoming(nextItems);
    if (targetView === "previous") setPrevious(nextItems);
    if (targetView === "favorites") setFavorites(nextItems);
  }

  async function searchCanonicalEvents(
    event?: FormEvent<HTMLFormElement>,
    exact = false,
    exactQuery?: string,
    targetView?: EditableView
  ): Promise<CanonicalEvent[]> {
    event?.preventDefault();

    const activeView =
      targetView || (view === "checkins" ? "upcoming" : (view as EditableView));
    const cleanQuery = cleanText(exactQuery ?? query);

    if (cleanQuery.length < 2) {
      if (!exact) setMessage("Digite pelo menos 2 caracteres para buscar.");
      return [];
    }

    if (!exact) {
      setSearching(true);
      setMessage("");
      setResults([]);
    }

    try {
      const params = new URLSearchParams({
        cardId,
        q: cleanQuery,
        view: activeView,
      });

      if (exact) params.set("exact", "1");

      const response = await fetch(`/api/club-events/search?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Não foi possível buscar eventos agora.");
      }

      const nextResults = Array.isArray(data.events)
        ? (data.events as CanonicalEvent[])
        : [];

      if (!exact) {
        setResults(nextResults);
        if (nextResults.length === 0) {
          setMessage("Nenhum evento encontrado. Tente outro nome.");
        }
      }

      return nextResults;
    } catch (error) {
      if (!exact) {
        setMessage(
          error instanceof Error ? error.message : "Não foi possível buscar eventos agora."
        );
      }
      return [];
    } finally {
      if (!exact) setSearching(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function enrich(
      targetView: EditableView,
      source: ClubEventItem[]
    ): Promise<ClubEventItem[]> {
      const next = await Promise.all(
        source.map(async (item) => {
          if (item.canonical || !item.name) return item;
          const matches = await searchCanonicalEvents(
            undefined,
            true,
            item.name,
            targetView
          );

          const exact = matches.find(
            (candidate) =>
              normalizeCompare(candidate.eventName) === normalizeCompare(item.name)
          );

          return exact
            ? {
                ...item,
                canonical: exact,
                date: item.date || exact.startsAt || exact.eventDateKey,
                officialUrl: item.officialUrl || exact.officialUrl || exact.ticketUrl,
              }
            : item;
        })
      );

      return next;
    }

    async function run() {
      setEnrichmentDone(false);

      const [nextUpcoming, nextPrevious, nextFavorites] = await Promise.all([
        enrich("upcoming", initialUpcoming),
        enrich("previous", initialPrevious),
        enrich("favorites", initialFavorites),
      ]);

      if (!active) return;

      setUpcoming(nextUpcoming);
      setPrevious(nextPrevious);
      setFavorites(nextFavorites);
      setEnrichmentDone(true);
    }

    void run();

    return () => {
      active = false;
    };
    // Initial server values are the source of truth for enrichment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, initialUpcoming, initialPrevious, initialFavorites]);

  async function addEvent(item: CanonicalEvent) {
    if (view === "checkins" || savingId) return;

    const targetView = view as EditableView;
    const field = fieldForView(targetView);

    if (
      items.some(
        (current) =>
          normalizeCompare(current.name) === normalizeCompare(item.eventName)
      )
    ) {
      setMessage("Este evento já está nesta lista.");
      return;
    }

    setSavingId(item.id);
    setMessage("");

    try {
      const response = await fetch("/api/club-profile/add-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          field,
          value: item.eventName,
          nextEventDate:
            field === "next_events" ? item.startsAt || item.eventDateKey : "",
          nextEventLink:
            field === "next_events" ? item.officialUrl || item.ticketUrl : "",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Não foi possível adicionar este evento.");
      }

      const nextItem: ClubEventItem = {
        name: item.eventName,
        date: item.startsAt || item.eventDateKey,
        officialUrl: item.officialUrl || item.ticketUrl,
        canonical: item,
      };

      setItemsForView(targetView, [...items, nextItem]);
      setMessage("Evento adicionado.");
      setQuery("");
      setResults([]);
      setSearchOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível adicionar este evento."
      );
    } finally {
      setSavingId("");
    }
  }

  async function removeEvent(item: ClubEventItem) {
    if (view === "checkins" || removingName) return;

    const targetView = view as EditableView;
    const field = fieldForView(targetView);

    setRemovingName(item.name);
    setMessage("");

    try {
      const response = await fetch("/api/club-profile/remove-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          field,
          value: item.name,
          nextEventDate:
            field === "next_events" && item.canonical
              ? item.canonical.startsAt || item.canonical.eventDateKey || item.date || ""
              : "",
          nextEventLink:
            field === "next_events" && item.canonical
              ? item.canonical.officialUrl || item.canonical.ticketUrl || item.officialUrl || ""
              : "",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Não foi possível remover este evento.");
      }

      setItemsForView(
        viewFromField(field),
        items.filter(
          (current) =>
            normalizeCompare(current.name) !== normalizeCompare(item.name)
        )
      );

      setMessage("Evento removido.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível remover este evento."
      );
    } finally {
      setRemovingName("");
    }
  }

  function switchView(nextView: ClubEventView) {
    setView(nextView);
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setMessage("");
    setShowLegacy(false);

    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.replaceState({}, "", url.toString());
  }

  const meta = VIEW_META[view];

  return (
    <section className="club-events-manager">
      <style>{managerCss}</style>

      <nav className="events-tabs" aria-label="Seções de Meus Eventos">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`events-tab ${view === tab ? "events-tab--active" : ""}`}
            aria-current={view === tab ? "page" : undefined}
            onClick={() => switchView(tab)}
          >
            {VIEW_META[tab].label}
          </button>
        ))}
      </nav>

      <div className="events-section-heading">
        <div>
          <h2>{meta.title}</h2>
          <p>{meta.description}</p>
        </div>

        {view !== "checkins" ? (
          <button
            type="button"
            className="events-add-button"
            onClick={() => {
              setSearchOpen((current) => !current);
              setMessage("");
            }}
          >
            {searchOpen ? "Fechar busca" : "Adicionar evento"}
          </button>
        ) : null}
      </div>

      {view !== "checkins" && searchOpen ? (
        <div className="events-search-panel">
          <form className="events-search-form" onSubmit={searchCanonicalEvents}>
            <label htmlFor="club-event-search">Buscar evento</label>
            <div className="events-search-row">
              <input
                id="club-event-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o nome do evento"
                autoComplete="off"
              />
              <button type="submit" disabled={searching}>
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </form>

          {results.length > 0 ? (
            <div className="events-search-results">
              {results.map((event) => (
                <article key={event.id} className="event-result-card">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt=""
                      className="event-result-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="event-result-image event-result-image--empty" aria-hidden="true">
                      EVENTO
                    </div>
                  )}

                  <div className="event-result-content">
                    <h3>{event.eventName}</h3>
                    {formatDate(event.startsAt || event.eventDateKey) ? (
                      <p>{formatDate(event.startsAt || event.eventDateKey)}</p>
                    ) : null}
                    {locationLabel(event) ? <p>{locationLabel(event)}</p> : null}
                  </div>

                  <button
                    type="button"
                    className="event-result-add"
                    disabled={Boolean(savingId)}
                    onClick={() => void addEvent(event)}
                  >
                    {savingId === event.id ? "Adicionando..." : "Adicionar"}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="events-message">{message}</p> : null}

      {view === "checkins" ? (
        checkIns.length > 0 ? (
          <div className="events-list">
            {checkIns.map((item, index) => (
              <article
                key={`${item.eventSlug || item.eventKey || item.eventName}-${item.checkedInAt}-${index}`}
                className="event-card"
              >
                <div className="event-card-main">
                  <h3>{item.eventName}</h3>
                  <p>{checkInStatusLabel(item.status)}</p>
                  {formatDateTime(item.checkedInAt) ? (
                    <p>{formatDateTime(item.checkedInAt)}</p>
                  ) : null}
                </div>

                {item.eventSlug ? (
                  <Link
                    href={`/event/${item.eventSlug}`}
                    target="_blank"
                    className="event-secondary-action"
                  >
                    Ver evento
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="events-empty-list">
            <h3>Nenhuma presença registrada</h3>
            <p>Quando você fizer check-in em um evento, o registro aparecerá aqui.</p>
          </div>
        )
      ) : !enrichmentDone ? (
        <p className="events-loading-text">Organizando seus eventos...</p>
      ) : (
        <>
          {canonicalItems.length > 0 ? (
            <div className="events-list">
              {canonicalItems.map((item) => {
                const canonical = item.canonical;
                const displayDate = formatDate(
                  item.date || canonical?.startsAt || canonical?.eventDateKey || ""
                );
                const location = locationLabel(canonical);
                const internalHref = canonical?.slug ? `/event/${canonical.slug}` : "";

                return (
                  <article key={`${view}-${normalizeCompare(item.name)}`} className="event-card">
                    {canonical?.imageUrl ? (
                      <img
                        src={canonical.imageUrl}
                        alt=""
                        className="event-card-image"
                        loading="lazy"
                      />
                    ) : null}

                    <div className="event-card-main">
                      <h3>{canonical?.eventName || item.name}</h3>
                      {displayDate ? <p>{displayDate}</p> : null}
                      {location ? <p>{location}</p> : null}
                    </div>

                    <div className="event-card-actions">
                      {internalHref ? (
                        <Link
                          href={internalHref}
                          target="_blank"
                          className="event-secondary-action"
                        >
                          Ver evento
                        </Link>
                      ) : null}

                      <button
                        type="button"
                        className="event-remove-action"
                        disabled={Boolean(removingName)}
                        onClick={() => void removeEvent(item)}
                      >
                        {removingName === item.name ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="events-empty-list">
              <h3>Você ainda não adicionou eventos nesta seção</h3>
              <p>Use “Adicionar evento” para encontrar um evento.</p>
            </div>
          )}

          {legacyItems.length > 0 ? (
            <section className="events-legacy-section">
              <div className="events-legacy-heading">
                <div>
                  <h3>Eventos salvos anteriormente</h3>
                  <p>
                    Alguns eventos salvos anteriormente ainda não foram identificados. Eles ficam separados
                    dos eventos encontrados pelo USECLUBBERS.
                  </p>
                </div>

                <button
                  type="button"
                  className="events-legacy-toggle"
                  onClick={() => setShowLegacy((current) => !current)}
                >
                  {showLegacy ? "Ocultar eventos salvos anteriormente" : "Revisar eventos salvos anteriormente"}
                </button>
              </div>

              <p className="events-legacy-count">
                {legacyItems.length} {legacyItems.length === 1 ? "evento salvo anteriormente" : "eventos salvos anteriormente"}
              </p>

              {showLegacy ? (
                <div className="events-legacy-list">
                  {legacyItems.map((item) => (
                    <article
                      key={`legacy-${view}-${normalizeCompare(item.name)}`}
                      className="event-legacy-row"
                    >
                      <p className="event-legacy-name">{item.name}</p>

                      <button
                        type="button"
                        className="event-remove-action"
                        disabled={Boolean(removingName)}
                        onClick={() => void removeEvent(item)}
                      >
                        {removingName === item.name ? "Removendo..." : "Remover"}
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

const managerCss = `
  .club-events-manager {
    display: grid;
    gap: 18px;
  }

  .events-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .events-tab,
  .events-add-button,
  .events-search-row button,
  .event-result-add,
  .event-secondary-action,
  .event-remove-action {
    appearance: none;
    min-height: 42px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.10);
    background: #111111;
    color: #CBD5E1;
    font: inherit;
    font-size: 13px;
    font-weight: 760;
    cursor: pointer;
    text-decoration: none;
  }

  .events-tab {
    padding: 10px 12px;
  }

  .events-tab--active,
  .events-add-button,
  .events-search-row button,
  .event-result-add {
    border-color: #2A8694;
    background: #247C88;
    color: #F8FAFC;
  }

  .events-section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .events-section-heading h2,
  .events-section-heading p,
  .event-card h3,
  .event-card p,
  .event-result-card h3,
  .event-result-card p,
  .events-empty-list h3,
  .events-empty-list p,
  .events-message {
    margin: 0;
  }

  .events-section-heading h2 {
    font-size: 22px;
    line-height: 1.15;
  }

  .events-section-heading p {
    margin-top: 5px;
    color: #CBD5E1;
    font-size: 13px;
    line-height: 1.5;
  }

  .events-add-button {
    padding: 10px 14px;
    white-space: nowrap;
  }

  .events-search-panel,
  .events-empty-list {
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  .events-search-form {
    display: grid;
    gap: 8px;
  }

  .events-search-form label {
    color: #F8FAFC;
    font-size: 13px;
    font-weight: 760;
  }

  .events-search-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .events-search-row input {
    min-width: 0;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 10px;
    background: #111111;
    color: #F8FAFC;
    font: inherit;
    outline: none;
  }

  .events-search-row input:focus {
    border-color: #2A8694;
    box-shadow: 0 0 0 3px rgba(42,134,148,0.16);
  }

  .events-search-row button,
  .event-result-add {
    padding: 10px 14px;
  }

  .events-search-results,
  .events-list {
    display: grid;
    gap: 10px;
  }

  .events-search-results {
    margin-top: 14px;
  }

  .event-result-card,
  .event-card {
    display: grid;
    align-items: center;
    gap: 14px;
    padding: 13px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  .event-result-card {
    grid-template-columns: 84px minmax(0, 1fr) auto;
  }

  .event-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .event-card:has(.event-card-image) {
    grid-template-columns: 96px minmax(0, 1fr) auto;
  }

  .event-result-image,
  .event-card-image {
    width: 100%;
    aspect-ratio: 1.2 / 1;
    object-fit: cover;
    border-radius: 12px;
    background: #111111;
  }

  .event-result-image--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2A8694;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.12em;
  }

  .event-result-content,
  .event-card-main {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .event-result-card h3,
  .event-card h3 {
    color: #F8FAFC;
    font-size: 15px;
    line-height: 1.3;
  }

  .event-result-card p,
  .event-card p,
  .events-empty-list p {
    color: #CBD5E1;
    font-size: 12px;
    line-height: 1.45;
  }

  .event-legacy-note {
    opacity: 0.72;
  }

  .event-card-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .event-secondary-action,
  .event-remove-action {
    min-height: 38px;
    padding: 8px 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .event-secondary-action:hover,
  .event-remove-action:hover,
  .events-tab:hover {
    border-color: #2A8694;
    color: #F8FAFC;
  }

  .events-message,
  .events-loading-text,
  .events-legacy-count {
    margin: 0;
    color: #CBD5E1;
    font-size: 13px;
    line-height: 1.5;
  }

  .events-legacy-section {
    padding-top: 6px;
    display: grid;
    gap: 12px;
    border-top: 1px solid rgba(255,255,255,0.10);
  }

  .events-legacy-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
  }

  .events-legacy-heading h3,
  .events-legacy-heading p,
  .event-legacy-name {
    margin: 0;
  }

  .events-legacy-heading h3 {
    font-size: 16px;
    color: #F8FAFC;
  }

  .events-legacy-heading p {
    margin-top: 4px;
    max-width: 620px;
    color: #CBD5E1;
    font-size: 12px;
    line-height: 1.45;
  }

  .events-legacy-toggle {
    appearance: none;
    min-height: 38px;
    padding: 8px 11px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 10px;
    background: #111111;
    color: #CBD5E1;
    font: inherit;
    font-size: 12px;
    font-weight: 760;
    cursor: pointer;
    white-space: nowrap;
  }

  .events-legacy-toggle:hover {
    border-color: #2A8694;
    color: #F8FAFC;
  }

  .events-legacy-count {
    opacity: 0.72;
  }

  .events-legacy-list {
    display: grid;
    gap: 8px;
  }

  .event-legacy-row {
    min-width: 0;
    padding: 10px 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    background: #0E0E0E;
  }

  .event-legacy-name {
    min-width: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: #CBD5E1;
    font-size: 12px;
    line-height: 1.4;
  }

  .events-empty-list {
    display: grid;
    gap: 6px;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.64;
  }

  @media (max-width: 720px) {
    .events-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .events-section-heading,
    .events-legacy-heading {
      align-items: stretch;
      flex-direction: column;
    }

    .events-add-button,
    .events-legacy-toggle {
      width: 100%;
    }

    .events-search-row {
      grid-template-columns: 1fr;
    }

    .event-result-card,
    .event-card,
    .event-card:has(.event-card-image) {
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: start;
    }

    .event-result-add,
    .event-card-actions {
      grid-column: 1 / -1;
      width: 100%;
    }

    .event-card-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .event-card:not(:has(.event-card-image)) .event-card-main {
      grid-column: 1 / -1;
    }

    .event-secondary-action,
    .event-remove-action {
      width: 100%;
    }

    .event-legacy-row {
      grid-template-columns: 1fr;
    }
  }
`;