// src/app/event/[event_slug]/TicketIntentButton.tsx

"use client";

import { useMemo, useState } from "react";

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

function getButtonLabel(status: TicketIntentStatus | null) {
  if (status === "ticket_acquired") {
    return "Ingresso garantido";
  }

  if (status === "wants_ticket") {
    return "Quero garantir meu ingresso";
  }

  if (status === "interested") {
    return "Tenho interesse nesse evento";
  }

  return "Meu ingresso já está garantido";
}

function getHelperText(status: TicketIntentStatus | null) {
  if (status === "ticket_acquired") {
    return "Sua presença ficou mais forte no radar social do evento.";
  }

  if (status === "wants_ticket") {
    return "Você sinalizou interesse em garantir ingresso para este evento.";
  }

  if (status === "interested") {
    return "Você demonstrou interesse em viver esse evento.";
  }

  return "Marque sua presença e entre melhor no radar, caronas e encontros deste evento.";
}

export default function TicketIntentButton({
  eventGroupId,
  initialStatus = null,
  compact = false,
}: TicketIntentButtonProps) {
  const [status, setStatus] = useState<TicketIntentStatus | null>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTicketAcquired = status === "ticket_acquired";

  const buttonLabel = useMemo(() => getButtonLabel(status), [status]);
  const helperText = useMemo(() => getHelperText(status), [status]);

  async function saveIntent(nextStatus: TicketIntentStatus) {
    if (!eventGroupId || isSaving) {
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
          notes:
            nextStatus === "ticket_acquired"
              ? "Clubber marked ticket acquired from event page."
              : "Clubber updated ticket intent from event page.",
          metadata: {
            component: "TicketIntentButton",
            version: "v4.2.2",
          },
        }),
      });

      const data = (await response.json()) as TicketIntentApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível salvar sua presença.");
      }

      setStatus(nextStatus);
      setFeedback(
        nextStatus === "ticket_acquired"
          ? "Presença marcada. Seu ingresso ficou registrado por você."
          : "Sua intenção foi atualizada."
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível salvar sua presença."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      style={{
        marginTop: compact ? 12 : 18,
        padding: compact ? 14 : 16,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
        boxShadow: "0 18px 42px rgba(0,0,0,0.24)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: compact ? "column" : "row",
          gap: 12,
          alignItems: compact ? "stretch" : "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.94)",
              fontSize: compact ? 14 : 15,
              fontWeight: 900,
              lineHeight: 1.25,
            }}
          >
            {isTicketAcquired ? "Você já está no caminho do evento" : "Vai nesse evento?"}
          </p>

          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,0.66)",
              fontSize: compact ? 12 : 13,
              lineHeight: 1.45,
            }}
          >
            {helperText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => saveIntent("ticket_acquired")}
          disabled={isSaving || !eventGroupId}
          style={{
            width: compact ? "100%" : "auto",
            minWidth: compact ? "100%" : 216,
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 999,
            padding: "12px 15px",
            cursor: isSaving || !eventGroupId ? "not-allowed" : "pointer",
            background: isTicketAcquired
              ? "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(21,128,61,0.95))"
              : "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(214,214,214,0.92))",
            color: isTicketAcquired ? "#ffffff" : "#080808",
            fontSize: 13,
            fontWeight: 950,
            letterSpacing: "-0.01em",
            opacity: isSaving || !eventGroupId ? 0.68 : 1,
            boxShadow: isTicketAcquired
              ? "0 14px 34px rgba(34,197,94,0.24)"
              : "0 14px 34px rgba(255,255,255,0.12)",
          }}
        >
          {isSaving ? "Salvando..." : buttonLabel}
        </button>
      </div>

      {(feedback || error) && (
        <p
          style={{
            margin: "10px 0 0",
            color: error ? "rgba(248,113,113,0.95)" : "rgba(134,239,172,0.95)",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {error || feedback}
        </p>
      )}
    </section>
  );
}