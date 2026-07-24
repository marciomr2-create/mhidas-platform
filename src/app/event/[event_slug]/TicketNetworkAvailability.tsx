// src/app/event/[event_slug]/TicketNetworkAvailability.tsx

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import availabilityStyles from "./TicketNetworkAvailability.module.css";

type TicketNetworkOffer = {
  user_id: string;
  label: string;
  slug: string;
  city_base: string;
  club_photo_url: string;
  relation: "accepted_connection";
  status: "available";
  quantity: number;
  ticket_type: string;
  lot: string;
  asking_price: number;
  currency: "BRL";
  transfer_method: string;
  note: string;
  updated_at: string;
};

type TicketNetworkAvailabilityResponse = {
  ok?: boolean;
  message?: string;
  offers?: TicketNetworkOffer[];
};

type TicketNetworkAvailabilityProps = {
  eventGroupId: string;
};

type AvailabilityUpdatedDetail = {
  eventGroupId?: string;
};

const EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED =
  "mhidas:event-ticket-network-availability-updated";

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Atualização recente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(label: string): string {
  const words = normalizeText(label).split(" ").filter(Boolean);

  if (words.length === 0) {
    return "UC";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function TicketNetworkAvailability({
  eventGroupId,
}: TicketNetworkAvailabilityProps) {
  const [offers, setOffers] = useState<TicketNetworkOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailableToViewer, setIsUnavailableToViewer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(
    async (signal?: AbortSignal) => {
      if (!eventGroupId) {
        setOffers([]);
        setIsLoading(false);
        return;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/event-ticket-intents/network-availability?event_group_id=${encodeURIComponent(
            eventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          }
        );

        if (response.status === 401) {
          setIsUnavailableToViewer(true);
          setOffers([]);
          return;
        }

        const data =
          (await response.json()) as TicketNetworkAvailabilityResponse;

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message || "Não foi possível consultar sua rede de ingressos."
          );
        }

        setIsUnavailableToViewer(false);
        setOffers(Array.isArray(data.offers) ? data.offers : []);
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Não foi possível consultar sua rede de ingressos."
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [eventGroupId]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadOffers(controller.signal);

    function handleAvailabilityUpdated(event: Event) {
      const customEvent = event as CustomEvent<AvailabilityUpdatedDetail>;

      if (customEvent.detail?.eventGroupId !== eventGroupId) {
        return;
      }

      void loadOffers();
    }

    window.addEventListener(
      EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED,
      handleAvailabilityUpdated as EventListener
    );

    return () => {
      controller.abort();
      window.removeEventListener(
        EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED,
        handleAvailabilityUpdated as EventListener
      );
    };
  }, [eventGroupId, loadOffers]);

  if (isLoading || isUnavailableToViewer || offers.length === 0) {
    return null;
  }

  return (
    <section
      className={`${availabilityStyles.root} event-ticket-network-availability`}
      aria-labelledby="event-ticket-network-availability-title"
    >
      <div className="event-ticket-network-availability__heading">
        <div>
          <span className="event-ticket-network-availability__eyebrow">
            Entre pessoas que já se conhecem
          </span>
          <h2
            id="event-ticket-network-availability-title"
            className="event-ticket-network-availability__title"
          >
            Ingresso disponível na sua rede
          </h2>
          <p className="event-ticket-network-availability__description">
            Disponibilidades informadas por conexões aceitas para este evento.
          </p>
        </div>

        <strong className="event-ticket-network-availability__count">
          {offers.length === 1 ? "1 conexão" : `${offers.length} conexões`}
        </strong>
      </div>

      <div className="event-ticket-network-availability__list">
        {offers.map((offer) => (
          <article
            key={`${offer.user_id}-${offer.updated_at}`}
            className="event-ticket-network-availability__item"
          >
            <div
              className="event-ticket-network-availability__avatar"
              style={
                offer.club_photo_url
                  ? { backgroundImage: `url(${JSON.stringify(offer.club_photo_url)})` }
                  : undefined
              }
              aria-hidden="true"
            >
              {!offer.club_photo_url ? getInitials(offer.label) : null}
            </div>

            <div className="event-ticket-network-availability__identity">
              <span className="event-ticket-network-availability__relation">
                Conexão aceita
              </span>
              <strong>{offer.label}</strong>
              {offer.city_base ? <span>{offer.city_base}</span> : null}
            </div>

            <div className="event-ticket-network-availability__details">
              <span>
                {offer.quantity} {offer.quantity === 1 ? "ingresso" : "ingressos"}
              </span>
              <strong>{offer.ticket_type}</strong>
              {offer.lot ? <span>{offer.lot}</span> : null}
            </div>

            <div className="event-ticket-network-availability__commercial">
              <strong>{formatPrice(offer.asking_price)}</strong>
              <span>{offer.transfer_method}</span>
              <small>Atualizado em {formatUpdatedAt(offer.updated_at)}</small>
            </div>

            {offer.note ? (
              <p className="event-ticket-network-availability__note">
                {offer.note}
              </p>
            ) : null}

            <Link
              href={`/${encodeURIComponent(offer.slug)}?mode=club`}
              className="event-ticket-network-availability__profile-link"
            >
              Ver perfil Clubber <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>

      <p className="event-ticket-network-availability__disclaimer">
        O USECLUBBERS apenas apresenta a disponibilidade informada por uma
        conexão. Autenticidade, preço, pagamento, transferência e conclusão da
        negociação são responsabilidade exclusiva das partes.
      </p>

      {error ? (
        <p className="event-ticket-network-availability__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
