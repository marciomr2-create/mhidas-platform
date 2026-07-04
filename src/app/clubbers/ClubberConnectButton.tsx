"use client";

// src/app/clubbers/ClubberConnectButton.tsx
import Link from "next/link";
import { useState } from "react";
import type { InitialConnectionState } from "./ClubberDiscoveryClient";

type ConnectionState =
  | InitialConnectionState
  | "sending"
  | "error";

type Props = {
  targetUserId: string;
  initialState: InitialConnectionState;
  isAuthenticated: boolean;
  loginReturnTo: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buttonLabel(state: ConnectionState): string {
  if (state === "sending") return "Enviando solicitação...";
  if (state === "outgoing_pending") return "Solicitação enviada";
  if (state === "incoming_pending") return "Solicitação recebida";
  if (state === "connected") return "Conectados";
  if (state === "blocked") return "Conexão bloqueada";
  if (state === "suspended") return "Conexão suspensa";
  if (state === "error") return "Tentar novamente";

  return "Quero conectar";
}

function isDisabled(state: ConnectionState): boolean {
  return [
    "sending",
    "outgoing_pending",
    "incoming_pending",
    "connected",
    "blocked",
    "suspended",
  ].includes(state);
}

export default function ClubberConnectButton({
  targetUserId,
  initialState,
  isAuthenticated,
  loginReturnTo,
}: Props) {
  const [state, setState] = useState<ConnectionState>(initialState);

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
    if (isDisabled(state)) {
      return;
    }

    setState("sending");

    try {
      const response = await fetch("/api/network/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setState("connected");
        return;
      }

      setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isDisabled(state)}
      className={`clubber-connect-button ${
        state === "none" || state === "error"
          ? "clubber-connect-button--primary"
          : "clubber-connect-button--status"
      }`}
    >
      {buttonLabel(state)}
    </button>
  );
}
