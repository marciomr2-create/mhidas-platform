// src/app/event/[event_slug]/TicketIntentButton.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

type TicketIntentStatus =
  | "interested"
  | "wants_ticket"
  | "ticket_acquired"
  | "cancelled"
  | "checked_in";

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
    updated_at?: string;
  } | null;
};

type JourneyAction = {
  status: Exclude<TicketIntentStatus, "checked_in">;
  label: string;
  detail: string;
  tone: "interest" | "ticket" | "confirmed" | "cancelled";
};

const EVENT_TICKET_INTENT_UPDATED = "mhidas:event-ticket-intent-updated";

const TICKET_INTENT_STATUSES: TicketIntentStatus[] = [
  "interested",
  "wants_ticket",
  "ticket_acquired",
  "cancelled",
  "checked_in",
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

function isTicketIntentStatus(value: unknown): value is TicketIntentStatus {
  return TICKET_INTENT_STATUSES.includes(value as TicketIntentStatus);
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
    return "Sua desistência foi registrada, mas sua camada social e seu histórico continuam acessíveis.";
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
  const [isLoadingInitialStatus, setIsLoadingInitialStatus] = useState(
    Boolean(eventGroupId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = useMemo(() => getStatusLabel(status), [status]);
  const helperText = useMemo(() => getHelperText(status), [status]);
  const isCheckedIn = status === "checked_in";

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

        if (isTicketIntentStatus(savedStatus)) {
          setStatus(savedStatus);
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
            version: "v4.8.131",
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

      setStatus(nextStatus);
      setFeedback(getFeedbackText(nextStatus));

      window.dispatchEvent(
        new CustomEvent(EVENT_TICKET_INTENT_UPDATED, {
          detail: {
            eventGroupId,
            status: nextStatus,
          },
        })
      );
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
