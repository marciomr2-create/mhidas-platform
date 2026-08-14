"use client";

// src/app/clubbers/ClubberConnectButton.tsx
import Link from "next/link";
import { useState } from "react";
import type { InitialConnectionState } from "./ClubberDiscoveryClient";

type ConnectionState =
  | InitialConnectionState
  | "sending"
  | "declined"
  | "cancelled"
  | "error";

type PatchAction = "accept" | "decline" | "cancel";

type Props = {
  targetUserId: string;
  initialState: InitialConnectionState;
  isAuthenticated: boolean;
  loginReturnTo: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function connectButtonLabel(state: ConnectionState): string {
  if (state === "sending") return "Enviando...";
  if (state === "error") return "Tentar novamente";

  return "Quero me conectar";
}

function statusLabel(state: ConnectionState): string {
  if (state === "outgoing_pending") return "Solicitação enviada";
  if (state === "connected") return "Conexão confirmada";
  if (state === "blocked") return "Conexão indisponível";
  if (state === "suspended") return "Perfil indisponível";

  return "";
}

export default function ClubberConnectButton({
  targetUserId,
  initialState,
  isAuthenticated,
  loginReturnTo,
}: Props) {
  const [state, setState] = useState<ConnectionState>(initialState);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isBusy = state === "sending" || submitting;

  if (!isAuthenticated || state === "unauthorized") {
    return (
      <Link
        href={`/login?return_to=${encodeURIComponent(loginReturnTo)}`}
        className="clubber-connect-button clubber-connect-button--primary"
      >
        Entrar para conectar
      </Link>
    );
  }

  async function handleConnect() {
    if (isBusy) {
      return;
    }

    setState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/clubbers/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          targetUserId,
        }),
      });

      const data = await response.json().catch(() => null);
      const code = normalizeText(data?.code);
      const apiState = normalizeText(data?.state);

      if (response.status === 401 || code === "UNAUTHORIZED") {
        setState("unauthorized");
        return;
      }

      if (data?.ok && apiState === "outgoing_pending") {
        setState("outgoing_pending");
        return;
      }

      if (code === "ALREADY_CONNECTED") {
        setState("connected");
        return;
      }

      if (code === "REQUEST_ALREADY_SENT") {
        setState("outgoing_pending");
        return;
      }

      if (code === "INCOMING_REQUEST_EXISTS") {
        setState("incoming_pending");
        return;
      }

      if (code === "RELATIONSHIP_BLOCKED") {
        setState("blocked");
        return;
      }

      if (code === "RELATIONSHIP_SUSPENDED") {
        setState("suspended");
        return;
      }

      if (code === "INVALID_TARGET") {
        setMessage("Este perfil não pode receber a solicitação.");
      } else {
        setMessage("Não foi possível enviar a solicitação agora.");
      }

      setState("error");
    } catch {
      setMessage("Falha de conexão. Tente novamente.");
      setState("error");
    }
  }

  async function handlePatch(action: PatchAction) {
    if (isBusy) {
      return;
    }

    const previousState = state;
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/clubbers/connections", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          counterpartUserId: targetUserId,
          action,
        }),
      });

      const data = await response.json().catch(() => null);
      const code = normalizeText(data?.code);

      if (response.status === 401 || code === "UNAUTHORIZED") {
        setState("unauthorized");
        return;
      }

      if (code === "RELATIONSHIP_BLOCKED") {
        setState("blocked");
        return;
      }

      if (code === "RELATIONSHIP_SUSPENDED") {
        setState("suspended");
        return;
      }

      if (!response.ok || !data?.ok) {
        setMessage("Não foi possível atualizar a conexão agora.");
        setState(previousState);
        return;
      }

      if (action === "accept") {
        setState("connected");
        return;
      }

      if (action === "decline") {
        setState("declined");
        return;
      }

      setState("cancelled");
    } catch {
      setMessage("Falha de conexão. Tente novamente.");
      setState(previousState);
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "incoming_pending") {
    return (
      <div
        className="clubber-connect-actions clubber-connect-actions--split"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={() => handlePatch("accept")}
          disabled={isBusy}
          className="clubber-connect-button clubber-connect-button--primary"
        >
          {isBusy ? "Processando..." : "Aceitar conexão"}
        </button>

        <button
          type="button"
          onClick={() => handlePatch("decline")}
          disabled={isBusy}
          className="clubber-connect-button clubber-connect-button--secondary"
        >
          Recusar
        </button>

        {message ? <p className="clubber-connect-message">{message}</p> : null}
      </div>
    );
  }

  if (state === "outgoing_pending") {
    return (
      <div className="clubber-connect-actions" aria-live="polite">
        <span className="clubber-connect-status clubber-connect-status--success">
          {statusLabel(state)}
        </span>

        <button
          type="button"
          onClick={() => handlePatch("cancel")}
          disabled={isBusy}
          className="clubber-connect-button clubber-connect-button--secondary"
        >
          {isBusy ? "Cancelando..." : "Cancelar solicitação"}
        </button>

        {message ? <p className="clubber-connect-message">{message}</p> : null}
      </div>
    );
  }

  if (state === "connected" || state === "blocked" || state === "suspended") {
    return (
      <span
        className={`clubber-connect-status ${
          state === "connected"
            ? "clubber-connect-status--success"
            : "clubber-connect-status--neutral"
        }`}
        aria-live="polite"
      >
        {statusLabel(state)}
      </span>
    );
  }

  return (
    <div className="clubber-connect-actions" aria-live="polite">
      <button
        type="button"
        onClick={handleConnect}
        disabled={isBusy}
        className="clubber-connect-button clubber-connect-button--primary"
      >
        {connectButtonLabel(state)}
      </button>

      {message ? <p className="clubber-connect-message">{message}</p> : null}
    </div>
  );
}
