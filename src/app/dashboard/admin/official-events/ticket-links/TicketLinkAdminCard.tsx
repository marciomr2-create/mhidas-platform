"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TicketLinkStatus =
  | "inactive"
  | "review"
  | "active"
  | "paused"
  | "expired"
  | "rejected"
  | string;

type TicketLinkAdminCardProps = {
  groupId: string;
  eventName: string;
  eventSlug: string;
  eventDate: string | null;
  cityBase: string | null;
  officialUrl: string | null;
  initialUrl: string | null;
  initialStatus: TicketLinkStatus | null;
  initialPartnerName: string | null;
  initialButtonLabel: string | null;
  initialExpiresAt: string | null;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  eventGroup?: {
    partner_ticket_url?: string | null;
    partner_ticket_status?: string | null;
    partner_ticket_partner_name?: string | null;
    partner_ticket_button_label?: string | null;
    partner_ticket_expires_at?: string | null;
  } | null;
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
  if (!value) return "Data nao informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

export default function TicketLinkAdminCard({
  groupId,
  eventName,
  eventSlug,
  eventDate,
  cityBase,
  officialUrl,
  initialUrl,
  initialStatus,
  initialPartnerName,
  initialButtonLabel,
  initialExpiresAt,
}: TicketLinkAdminCardProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl || "");
  const [status, setStatus] = useState(initialStatus || "inactive");
  const [partnerName, setPartnerName] = useState(initialPartnerName || "");
  const [buttonLabel, setButtonLabel] = useState(
    initialButtonLabel || "Comprar ingresso"
  );
  const [expiresAt, setExpiresAt] = useState(
    toDateTimeLocal(initialExpiresAt)
  );
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicEventHref = useMemo(
    () => `/event/${encodeURIComponent(eventSlug)}`,
    [eventSlug]
  );

  async function applyAction(action: "activate" | "pause" | "clear") {
    if (
      action === "clear" &&
      !window.confirm("Remover o link monetizado deste evento?")
    ) {
      return;
    }

    setWorkingAction(action);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/official-events/admin/ticket-links",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action,
            groupId,
            partnerTicketUrl: url,
            partnerName,
            buttonLabel,
            expiresAt: expiresAt
              ? new Date(expiresAt).toISOString()
              : null,
          }),
        }
      );

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message || "Falha na operacao.");
      }

      const updated = payload.eventGroup;

      setStatus(updated?.partner_ticket_status || "inactive");
      setUrl(updated?.partner_ticket_url || "");
      setPartnerName(updated?.partner_ticket_partner_name || "");
      setButtonLabel(
        updated?.partner_ticket_button_label || "Comprar ingresso"
      );
      setExpiresAt(toDateTimeLocal(updated?.partner_ticket_expires_at || null));
      setFeedback(payload.message || "Operacao concluida.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha inesperada."
      );
    } finally {
      setWorkingAction(null);
    }
  }

  const isWorking = Boolean(workingAction);

  return (
    <article
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: 16,
        background: "rgba(255,255,255,0.035)",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "grid", gap: 5 }}>
        <strong style={{ fontSize: 20 }}>{eventName}</strong>
        <span style={{ opacity: 0.76 }}>
          {[formatDate(eventDate), cityBase].filter(Boolean).join(" | ")}
        </span>
        <span style={{ opacity: 0.76 }}>
          Status comercial: <strong>{status}</strong>
        </span>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 800 }}>URL monetizada HTTPS</span>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          disabled={isWorking}
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(0,0,0,0.24)",
            color: "#fff",
            padding: "11px 12px",
          }}
        />
      </label>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Parceiro</span>
          <input
            type="text"
            value={partnerName}
            onChange={(event) => setPartnerName(event.target.value)}
            disabled={isWorking}
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.24)",
              color: "#fff",
              padding: "11px 12px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Texto do botao</span>
          <input
            type="text"
            value={buttonLabel}
            onChange={(event) => setButtonLabel(event.target.value)}
            disabled={isWorking}
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.24)",
              color: "#fff",
              padding: "11px 12px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Expira em (opcional)</span>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            disabled={isWorking}
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.24)",
              color: "#fff",
              padding: "11px 12px",
            }}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={() => applyAction("activate")}
          disabled={isWorking}
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 12,
            padding: "10px 14px",
            background:
              "linear-gradient(135deg, rgba(125,34,255,1), rgba(125,92,255,0.74))",
            color: "#fff",
            fontWeight: 900,
            cursor: isWorking ? "not-allowed" : "pointer",
          }}
        >
          {workingAction === "activate" ? "Ativando..." : "Ativar link"}
        </button>

        <button
          type="button"
          onClick={() => applyAction("pause")}
          disabled={isWorking || status !== "active"}
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 12,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.07)",
            color: "#fff",
            fontWeight: 900,
            cursor: isWorking ? "not-allowed" : "pointer",
          }}
        >
          {workingAction === "pause" ? "Pausando..." : "Pausar"}
        </button>

        <button
          type="button"
          onClick={() => applyAction("clear")}
          disabled={isWorking}
          style={{
            border: "1px solid rgba(248,113,113,0.35)",
            borderRadius: 12,
            padding: "10px 14px",
            background: "rgba(248,113,113,0.10)",
            color: "#fff",
            fontWeight: 900,
            cursor: isWorking ? "not-allowed" : "pointer",
          }}
        >
          {workingAction === "clear" ? "Removendo..." : "Remover"}
        </button>

        <a
          href={publicEventHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 12,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 900,
          }}
        >
          Abrir evento
        </a>

        {officialUrl ? (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 12,
              padding: "10px 14px",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 900,
            }}
          >
            Ver link oficial
          </a>
        ) : null}
      </div>

      {feedback ? (
        <p style={{ margin: 0, color: "rgba(134,239,172,0.96)" }}>
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p style={{ margin: 0, color: "rgba(248,113,113,0.96)" }}>
          {error}
        </p>
      ) : null}
    </article>
  );
}
