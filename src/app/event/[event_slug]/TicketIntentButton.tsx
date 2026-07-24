// src/app/event/[event_slug]/TicketIntentButton.tsx

"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import availabilityStyles from "./TicketNetworkAvailability.module.css";

type TicketIntentStatus =
  | "interested"
  | "wants_ticket"
  | "ticket_acquired"
  | "cancelled"
  | "checked_in";

type TicketAvailabilityStatus =
  | "available"
  | "reserved"
  | "transferred"
  | "withdrawn";

type JsonRecord = Record<string, unknown>;

type TicketAvailability = {
  status: TicketAvailabilityStatus;
  quantity: number;
  ticket_type: string;
  lot: string;
  asking_price: number;
  currency: "BRL";
  transfer_method: string;
  note: string;
  published_at: string;
  updated_at: string;
};

type TicketIntentButtonProps = {
  eventGroupId: string;
  initialStatus?: TicketIntentStatus | null;
  compact?: boolean;
};

type TicketIntentApiResponse = {
  ok?: boolean;
  message?: string;
  intent?: {
    status?: TicketIntentStatus;
    metadata?: unknown;
    updated_at?: string;
  } | null;
};

type JourneyAction = {
  status: Exclude<TicketIntentStatus, "checked_in">;
  label: string;
  detail: string;
  tone: "interest" | "ticket" | "confirmed" | "cancelled";
};

type AvailabilityFormState = {
  quantity: string;
  ticketType: string;
  lot: string;
  askingPrice: string;
  transferMethod: string;
  note: string;
};

const EVENT_TICKET_INTENT_UPDATED = "mhidas:event-ticket-intent-updated";
const EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED =
  "mhidas:event-ticket-network-availability-updated";

const TICKET_INTENT_STATUSES: TicketIntentStatus[] = [
  "interested",
  "wants_ticket",
  "ticket_acquired",
  "cancelled",
  "checked_in",
];

const TICKET_AVAILABILITY_STATUSES: TicketAvailabilityStatus[] = [
  "available",
  "reserved",
  "transferred",
  "withdrawn",
];

const JOURNEY_ACTIONS: JourneyAction[] = [
  {
    status: "interested",
    label: "Tenho interesse",
    detail: "Acompanhar o evento e explorar sua camada social.",
    tone: "interest",
  },
  {
    status: "wants_ticket",
    label: "Quero adquirir ingresso",
    detail: "Estou me organizando para participar deste evento.",
    tone: "ticket",
  },
  {
    status: "ticket_acquired",
    label: "Já tenho ingresso",
    detail: "Meu ingresso está garantido e posso avançar na jornada.",
    tone: "confirmed",
  },
  {
    status: "cancelled",
    label: "Não vou mais",
    detail: "Registrar desistência sem apagar meu histórico social.",
    tone: "cancelled",
  },
];

const EMPTY_AVAILABILITY_FORM: AvailabilityFormState = {
  quantity: "1",
  ticketType: "",
  lot: "",
  askingPrice: "",
  transferMethod: "Transferência pela plataforma oficial do ingresso",
  note: "",
};

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function isTicketIntentStatus(value: unknown): value is TicketIntentStatus {
  return TICKET_INTENT_STATUSES.includes(value as TicketIntentStatus);
}

function isTicketAvailabilityStatus(
  value: unknown
): value is TicketAvailabilityStatus {
  return TICKET_AVAILABILITY_STATUSES.includes(
    value as TicketAvailabilityStatus
  );
}

function parseTicketAvailability(metadataValue: unknown): TicketAvailability | null {
  const metadata = asRecord(metadataValue);
  const availability = asRecord(metadata?.ticket_network_availability);
  const availabilityStatus = availability?.status;

  if (!availability || !isTicketAvailabilityStatus(availabilityStatus)) {
    return null;
  }

  const quantity = Number(availability.quantity);
  const askingPrice = Number(availability.asking_price);
  const ticketType = normalizeText(availability.ticket_type, 80);
  const transferMethod = normalizeText(availability.transfer_method, 140);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10 ||
    !Number.isFinite(askingPrice) ||
    askingPrice < 0 ||
    !ticketType ||
    !transferMethod
  ) {
    return null;
  }

  return {
    status: availabilityStatus,
    quantity,
    ticket_type: ticketType,
    lot: normalizeText(availability.lot, 80),
    asking_price: Math.round(askingPrice * 100) / 100,
    currency: "BRL",
    transfer_method: transferMethod,
    note: normalizeText(availability.note, 280),
    published_at: normalizeText(availability.published_at, 40),
    updated_at: normalizeText(availability.updated_at, 40),
  };
}

function availabilityToForm(
  availability: TicketAvailability | null
): AvailabilityFormState {
  if (!availability) {
    return { ...EMPTY_AVAILABILITY_FORM };
  }

  return {
    quantity: String(availability.quantity),
    ticketType: availability.ticket_type,
    lot: availability.lot,
    askingPrice: String(availability.asking_price).replace(".", ","),
    transferMethod: availability.transfer_method,
    note: availability.note,
  };
}

function parsePrice(value: string): number | null {
  const normalizedValue = value.replace(/\s/g, "").replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100000) {
    return null;
  }

  return Math.round(parsedValue * 100) / 100;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getStatusLabel(status: TicketIntentStatus | null): string {
  if (status === "ticket_acquired") {
    return "Ingresso garantido";
  }

  if (status === "checked_in") {
    return "Presença registrada";
  }

  if (status === "wants_ticket") {
    return "Quero adquirir ingresso";
  }

  if (status === "interested") {
    return "Tenho interesse";
  }

  if (status === "cancelled") {
    return "Não vou mais";
  }

  return "Jornada ainda não informada";
}

function getHelperText(status: TicketIntentStatus | null): string {
  if (status === "ticket_acquired") {
    return "Seu ingresso está registrado. Agora a experiência prioriza preparação, conexões e participação.";
  }

  if (status === "checked_in") {
    return "Seu check-in confirmou sua presença neste evento.";
  }

  if (status === "wants_ticket") {
    return "Você continua com acesso a pessoas, encontros, grupos e caronas enquanto organiza a compra.";
  }

  if (status === "interested") {
    return "Explore pessoas, encontros, grupos e caronas mesmo antes de adquirir ingresso.";
  }

  if (status === "cancelled") {
    return "Sua desistência foi registrada. Você pode informar um ingresso disponível somente às suas conexões aceitas.";
  }

  return "Escolha seu momento sem limitar o acesso à experiência social do evento.";
}

function getFeedbackText(status: TicketIntentStatus): string {
  if (status === "ticket_acquired") {
    return "Ingresso registrado. As ações de aquisição foram ocultadas.";
  }

  if (status === "wants_ticket") {
    return "Você informou que pretende adquirir ingresso.";
  }

  if (status === "interested") {
    return "Seu interesse neste evento foi registrado.";
  }

  if (status === "cancelled") {
    return "Sua desistência foi registrada.";
  }

  return "Sua jornada foi atualizada.";
}

function getAvailabilityStatusLabel(
  availability: TicketAvailability | null
): string {
  if (availability?.status === "available") {
    return "Disponível para conexões";
  }

  if (availability?.status === "reserved") {
    return "Reservado";
  }

  if (availability?.status === "transferred") {
    return "Transferido";
  }

  if (availability?.status === "withdrawn") {
    return "Disponibilidade retirada";
  }

  return "Não informado";
}

function getActionClassName(action: JourneyAction, isActive: boolean): string {
  return [
    "event-ticket-journey__action",
    `event-ticket-journey__action--${action.tone}`,
    isActive ? "event-ticket-journey__action--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function TicketIntentButton({
  eventGroupId,
  initialStatus = null,
}: TicketIntentButtonProps) {
  const [status, setStatus] = useState<TicketIntentStatus | null>(initialStatus);
  const [availability, setAvailability] =
    useState<TicketAvailability | null>(null);
  const [availabilityForm, setAvailabilityForm] =
    useState<AvailabilityFormState>({ ...EMPTY_AVAILABILITY_FORM });
  const [isAvailabilityEditorOpen, setIsAvailabilityEditorOpen] =
    useState(false);
  const [isLoadingInitialStatus, setIsLoadingInitialStatus] = useState(
    Boolean(eventGroupId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [pendingAvailabilityAction, setPendingAvailabilityAction] = useState<
    "transferred" | "withdrawn" | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availabilityFeedback, setAvailabilityFeedback] =
    useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  const statusLabel = useMemo(() => getStatusLabel(status), [status]);
  const helperText = useMemo(() => getHelperText(status), [status]);
  const availabilityStatusLabel = useMemo(
    () => getAvailabilityStatusLabel(availability),
    [availability]
  );
  const isCheckedIn = status === "checked_in";
  const hasActiveAvailability =
    availability?.status === "available" || availability?.status === "reserved";

  useEffect(() => {
    if (!eventGroupId) {
      setIsLoadingInitialStatus(false);
      return;
    }

    const controller = new AbortController();

    async function loadSavedIntent() {
      setIsLoadingInitialStatus(true);

      try {
        const response = await fetch(
          `/api/event-ticket-intents?event_group_id=${encodeURIComponent(
            eventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401 || !response.ok) {
          return;
        }

        const data = (await response.json()) as TicketIntentApiResponse;
        const savedStatus = data.intent?.status;
        const savedAvailability = parseTicketAvailability(
          data.intent?.metadata
        );

        if (isTicketIntentStatus(savedStatus)) {
          setStatus(savedStatus);
        }

        if (savedAvailability) {
          setAvailability(savedAvailability);
          setAvailabilityForm(availabilityToForm(savedAvailability));
          setIsAvailabilityEditorOpen(false);
        }
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingInitialStatus(false);
        }
      }
    }

    void loadSavedIntent();

    return () => {
      controller.abort();
    };
  }, [eventGroupId]);

  async function saveIntent(nextStatus: TicketIntentStatus) {
    if (!eventGroupId || isSaving || isLoadingInitialStatus || isCheckedIn) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    setError(null);
    setAvailabilityFeedback(null);
    setAvailabilityError(null);

    try {
      const response = await fetch("/api/event-ticket-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_group_id: eventGroupId,
          status: nextStatus,
          source: "event_page",
          notes: "Clubber updated event journey from public event page.",
          metadata: {
            component: "TicketIntentButton",
            version: "v4.8.132",
            journey_foundation: true,
          },
        }),
      });

      const data = (await response.json()) as TicketIntentApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          response.status === 401
            ? "Entre na sua conta para salvar sua jornada."
            : data.message || "Não foi possível salvar sua jornada."
        );
      }

      const savedAvailability = parseTicketAvailability(data.intent?.metadata);

      setStatus(nextStatus);
      setAvailability(savedAvailability);
      setAvailabilityForm(availabilityToForm(savedAvailability));
      setIsAvailabilityEditorOpen(false);
      setFeedback(getFeedbackText(nextStatus));

      window.dispatchEvent(
        new CustomEvent(EVENT_TICKET_INTENT_UPDATED, {
          detail: {
            eventGroupId,
            status: nextStatus,
          },
        })
      );

      if (nextStatus !== "cancelled") {
        window.dispatchEvent(
          new CustomEvent(EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED, {
            detail: {
              eventGroupId,
            },
          })
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível salvar sua jornada."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAvailability(nextStatus: TicketAvailabilityStatus) {
    if (
      !eventGroupId ||
      status !== "cancelled" ||
      isSavingAvailability ||
      isLoadingInitialStatus
    ) {
      return;
    }

    const quantity = Number(availabilityForm.quantity);
    const askingPrice = parsePrice(availabilityForm.askingPrice);
    const ticketType = normalizeText(availabilityForm.ticketType, 80);
    const lot = normalizeText(availabilityForm.lot, 80);
    const transferMethod = normalizeText(
      availabilityForm.transferMethod,
      140
    );
    const note = normalizeText(availabilityForm.note, 280);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      askingPrice === null ||
      !ticketType ||
      !transferMethod
    ) {
      setAvailabilityError(
        "Informe quantidade, tipo do ingresso, valor e forma de transferência."
      );
      return;
    }

    setIsSavingAvailability(true);
    setAvailabilityFeedback(null);
    setAvailabilityError(null);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/event-ticket-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_group_id: eventGroupId,
          status: "cancelled",
          source: "event_page",
          notes:
            "Clubber updated ticket availability for accepted connections.",
          metadata: {
            component: "TicketIntentButton",
            version: "v4.8.132",
            journey_foundation: true,
            ticket_network_availability: {
              status: nextStatus,
              quantity,
              ticket_type: ticketType,
              lot,
              asking_price: askingPrice,
              currency: "BRL",
              transfer_method: transferMethod,
              note,
            },
          },
        }),
      });

      const data = (await response.json()) as TicketIntentApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          response.status === 401
            ? "Entre na sua conta para informar o ingresso."
            : data.message || "Não foi possível atualizar a disponibilidade."
        );
      }

      const savedAvailability = parseTicketAvailability(data.intent?.metadata);

      if (!savedAvailability) {
        throw new Error("A disponibilidade não retornou em formato válido.");
      }

      setAvailability(savedAvailability);
      setAvailabilityForm(availabilityToForm(savedAvailability));
      setIsAvailabilityEditorOpen(false);
      setPendingAvailabilityAction(null);

      if (nextStatus === "available") {
        setAvailabilityFeedback(
          "Ingresso visível somente para suas conexões aceitas neste evento."
        );
      } else if (nextStatus === "reserved") {
        setAvailabilityFeedback(
          availability?.status === "reserved"
            ? "Alterações salvas. O ingresso permanece reservado."
            : "Ingresso marcado como reservado e ocultado das novas consultas."
        );
      } else if (nextStatus === "transferred") {
        setAvailabilityFeedback("Ingresso marcado como transferido.");
      } else {
        setAvailabilityFeedback("Disponibilidade retirada da sua rede.");
      }

      window.dispatchEvent(
        new CustomEvent(EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED, {
          detail: {
            eventGroupId,
          },
        })
      );
    } catch (caughtError) {
      setAvailabilityError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível atualizar a disponibilidade."
      );
    } finally {
      setIsSavingAvailability(false);
    }
  }

  const controlsDisabled =
    isLoadingInitialStatus || isSaving || !eventGroupId || isCheckedIn;

  return (
    <section
      className="event-ticket-journey"
      aria-labelledby="event-ticket-journey-title"
      data-status={status || "unselected"}
    >
      <div className="event-ticket-journey__heading">
        <div className="event-ticket-journey__copy">
          <span className="event-ticket-journey__eyebrow">Minha Jornada</span>

          <h2
            id="event-ticket-journey-title"
            className="event-ticket-journey__title"
          >
            Organize sua participação
          </h2>

          <p className="event-ticket-journey__description">{helperText}</p>
        </div>

        <div className="event-ticket-journey__status" aria-live="polite">
          <span className="event-ticket-journey__status-dot" aria-hidden="true" />
          <span className="event-ticket-journey__status-label">Seu momento</span>
          <strong className="event-ticket-journey__status-value">
            {isLoadingInitialStatus
              ? "Verificando sua jornada..."
              : isSaving
                ? "Salvando sua escolha..."
                : statusLabel}
          </strong>
        </div>
      </div>

      <div
        className="event-ticket-journey__actions"
        role="group"
        aria-label="Atualize sua jornada neste evento"
      >
        {JOURNEY_ACTIONS.map((action, index) => {
          const isActive = status === action.status;

          return (
            <button
              key={action.status}
              type="button"
              onClick={() => saveIntent(action.status)}
              disabled={controlsDisabled || isActive}
              aria-pressed={isActive}
              aria-label={`${action.label}. ${action.detail}`}
              className={getActionClassName(action, isActive)}
            >
              <span className="event-ticket-journey__action-index">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="event-ticket-journey__action-copy">
                <span className="event-ticket-journey__action-title">
                  {action.label}
                </span>

                {isActive ? (
                  <span className="event-ticket-journey__action-state">
                    Selecionado
                  </span>
                ) : null}
              </span>

              <span className="event-ticket-journey__action-arrow" aria-hidden="true">
                →
              </span>
            </button>
          );
        })}
      </div>

      {status === "cancelled" ? (
        <section
          className={`${availabilityStyles.root} event-ticket-availability-editor`}
          aria-labelledby="event-ticket-availability-editor-title"
          data-availability-status={availability?.status || "unselected"}
        >
          <div className="event-ticket-availability-editor__intro">
            <div className="event-ticket-availability-editor__copy">
              <span className="event-ticket-availability-editor__eyebrow">
                Somente para conexões aceitas
              </span>
              <h3
                id="event-ticket-availability-editor-title"
                className="event-ticket-availability-editor__title"
              >
                Seu ingresso está disponível?
              </h3>
              <p className="event-ticket-availability-editor__description">
                Informe a disponibilidade para pessoas que já fazem parte da sua
                rede. O USECLUBBERS não intermedeia nem modera a negociação.
              </p>
            </div>

            <div className="event-ticket-availability-editor__state">
              <span>Disponibilidade</span>
              <strong>{availabilityStatusLabel}</strong>
            </div>
          </div>

          {availability ? (
            <div className="event-ticket-availability-editor__summary">
              <span>
                {availability.quantity} {availability.quantity === 1 ? "ingresso" : "ingressos"}
              </span>
              <span>{availability.ticket_type}</span>
              {availability.lot ? <span>{availability.lot}</span> : null}
              <strong>{formatPrice(availability.asking_price)}</strong>
            </div>
          ) : null}

          {!isAvailabilityEditorOpen ? (
            <button
              type="button"
              className="event-ticket-availability-editor__open"
              onClick={() => {
                setAvailabilityForm(availabilityToForm(availability));
                setIsAvailabilityEditorOpen(true);
                setPendingAvailabilityAction(null);
                setAvailabilityFeedback(null);
                setAvailabilityError(null);
              }}
            >
              {hasActiveAvailability
                ? "Editar disponibilidade"
                : availability?.status === "transferred"
                  ? "Informar outro ingresso disponível"
                  : availability?.status === "withdrawn"
                    ? "Disponibilizar novamente"
                    : "Informar ingresso disponível"}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <div className="event-ticket-availability-editor__form">
              <div className="event-ticket-availability-editor__fields">
                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--small">
                  <span>Quantidade</span>
                  <select
                    value={availabilityForm.quantity}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    disabled={isSavingAvailability}
                  >
                    {Array.from({ length: 10 }, (_, index) => index + 1).map(
                      (quantity) => (
                        <option key={quantity} value={quantity}>
                          {quantity}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="event-ticket-availability-editor__field">
                  <span>Tipo do ingresso</span>
                  <input
                    type="text"
                    value={availabilityForm.ticketType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        ticketType: event.target.value,
                      }))
                    }
                    placeholder="Ex.: pista, VIP ou passaporte"
                    maxLength={80}
                    disabled={isSavingAvailability}
                  />
                </label>

                <label className="event-ticket-availability-editor__field">
                  <span>Lote ou identificação opcional</span>
                  <input
                    type="text"
                    value={availabilityForm.lot}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        lot: event.target.value,
                      }))
                    }
                    placeholder="Ex.: 2º lote"
                    maxLength={80}
                    disabled={isSavingAvailability}
                  />
                </label>

                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--price">
                  <span>Valor informado</span>
                  <div className="event-ticket-availability-editor__price-input">
                    <span>R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={availabilityForm.askingPrice}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setAvailabilityForm((current) => ({
                          ...current,
                          askingPrice: event.target.value,
                        }))
                      }
                      placeholder="0,00"
                      maxLength={12}
                      disabled={isSavingAvailability}
                    />
                  </div>
                </label>

                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--wide event-ticket-availability-editor__field--transfer">
                  <span>Forma declarada de transferência</span>
                  <textarea
                    value={availabilityForm.transferMethod}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        transferMethod: event.target.value,
                      }))
                    }
                    placeholder="Como o ingresso poderá ser transferido"
                    maxLength={140}
                    rows={2}
                    disabled={isSavingAvailability}
                  />
                </label>

                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--wide">
                  <span>Observação opcional</span>
                  <textarea
                    value={availabilityForm.note}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Informação curta que suas conexões precisam saber"
                    maxLength={280}
                    rows={2}
                    disabled={isSavingAvailability}
                  />
                </label>
              </div>

              <p className="event-ticket-availability-editor__responsibility">
                Autenticidade, preço, pagamento, transferência e conclusão da
                negociação são responsabilidade exclusiva das partes.
              </p>

              {pendingAvailabilityAction === "withdrawn" ? (
                <p
                  className="event-ticket-availability-editor__responsibility"
                  role="alert"
                  style={{
                    borderLeftColor: "rgba(248, 113, 113, 0.72)",
                    color: "rgba(254, 202, 202, 0.92)",
                  }}
                >
                  Ao confirmar, esta oferta deixará de aparecer para suas
                  conexões. Você poderá disponibilizá-la novamente depois.
                </p>
              ) : null}

              <div className="event-ticket-availability-editor__controls">
                {pendingAvailabilityAction ? (
                  <>
                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--primary"
                      style={
                        pendingAvailabilityAction === "withdrawn"
                          ? {
                              borderColor: "rgba(248, 113, 113, 0.62)",
                              background:
                                "linear-gradient(135deg, rgba(127, 29, 29, 0.48), rgba(190, 24, 93, 0.24))",
                              color: "#ffffff",
                            }
                          : undefined
                      }
                      onClick={() =>
                        saveAvailability(pendingAvailabilityAction)
                      }
                      disabled={isSavingAvailability}
                    >
                      {isSavingAvailability
                        ? "Salvando..."
                        : pendingAvailabilityAction === "withdrawn"
                          ? "Confirmar retirada"
                          : "Confirmar transferência"}
                    </button>

                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--ghost"
                      onClick={() => setPendingAvailabilityAction(null)}
                      disabled={isSavingAvailability}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--primary"
                      onClick={() =>
                        saveAvailability(
                          availability?.status === "reserved"
                            ? "reserved"
                            : "available"
                        )
                      }
                      disabled={isSavingAvailability}
                    >
                      {isSavingAvailability
                        ? "Salvando..."
                        : availability?.status === "reserved"
                          ? "Salvar alterações"
                          : availability?.status === "available"
                            ? "Atualizar disponibilidade"
                            : "Disponibilizar para conexões"}
                    </button>

                    {availability?.status === "reserved" ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control"
                        onClick={() => saveAvailability("available")}
                        disabled={isSavingAvailability}
                      >
                        Voltar a disponibilizar
                      </button>
                    ) : null}

                    {availability?.status === "available" ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control"
                        onClick={() => saveAvailability("reserved")}
                        disabled={isSavingAvailability}
                      >
                        Marcar reservado
                      </button>
                    ) : null}

                    {hasActiveAvailability ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control"
                        onClick={() =>
                          setPendingAvailabilityAction("transferred")
                        }
                        disabled={isSavingAvailability}
                      >
                        Marcar transferido
                      </button>
                    ) : null}

                    {hasActiveAvailability ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control event-ticket-availability-editor__control--muted"
                        onClick={() =>
                          setPendingAvailabilityAction("withdrawn")
                        }
                        disabled={isSavingAvailability}
                      >
                        Retirar disponibilidade
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--ghost"
                      onClick={() => {
                        setAvailabilityForm(availabilityToForm(availability));
                        setIsAvailabilityEditorOpen(false);
                        setPendingAvailabilityAction(null);
                        setAvailabilityError(null);
                      }}
                      disabled={isSavingAvailability}
                    >
                      Fechar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {(availabilityFeedback || availabilityError) && (
            <p
              className={
                availabilityError
                  ? "event-ticket-availability-editor__feedback event-ticket-availability-editor__feedback--error"
                  : "event-ticket-availability-editor__feedback"
              }
              role={availabilityError ? "alert" : "status"}
            >
              {availabilityError || availabilityFeedback}
            </p>
          )}
        </section>
      ) : null}

      {(feedback || error) && (
        <p
          className={
            error
              ? "event-ticket-journey__feedback event-ticket-journey__feedback--error"
              : "event-ticket-journey__feedback"
          }
          role={error ? "alert" : "status"}
        >
          {error || feedback}
        </p>
      )}
    </section>
  );
}
