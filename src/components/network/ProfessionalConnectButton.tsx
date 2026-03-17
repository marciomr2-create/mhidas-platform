"use client";

import { useEffect, useState } from "react";

type ConnectionState =
  | "loading"
  | "unauthenticated"
  | "self"
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "connected"
  | "declined"
  | "cancelled";

type StatusResponse = {
  ok?: boolean;
  state?: ConnectionState;
  code?: string;
};

type Props = {
  targetUserId: string;
  className?: string;
};

export default function ProfessionalConnectButton({
  targetUserId,
  className = "",
}: Props) {
  const [state, setState] = useState<ConnectionState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        setMessage("");

        const response = await fetch(
          `/api/network/connections/status?targetUserId=${encodeURIComponent(targetUserId)}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        if (cancelled) return;

        if (response.status === 401) {
          setState("unauthenticated");
          return;
        }

        const data: StatusResponse = await response.json().catch(() => ({}));

        if (!response.ok) {
          setState("none");
          return;
        }

        setState(data.state ?? "none");
      } catch (error) {
        console.error("[ProfessionalConnectButton] loadStatus error:", error);
        if (!cancelled) {
          setState("none");
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  async function handleCreateConnection() {
    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch("/api/network/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ targetUserId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.code === "REQUEST_ALREADY_SENT") {
          setState("outgoing_pending");
          return;
        }

        if (data?.code === "INCOMING_REQUEST_EXISTS") {
          setState("incoming_pending");
          return;
        }

        if (data?.code === "ALREADY_CONNECTED") {
          setState("connected");
          return;
        }

        if (data?.code === "UNAUTHORIZED") {
          setState("unauthenticated");
          return;
        }

        setMessage("Não foi possível enviar a solicitação.");
        return;
      }

      setState("outgoing_pending");
      window.location.reload();
    } catch (error) {
      console.error("[ProfessionalConnectButton] create error:", error);
      setMessage("Erro ao enviar solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePatch(action: "accept" | "decline" | "cancel") {
    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch("/api/network/connections", {
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.code === "UNAUTHORIZED") {
          setState("unauthenticated");
          return;
        }

        setMessage("Não foi possível atualizar a conexão.");
        return;
      }

      if (action === "accept") {
        setState("connected");
      } else if (action === "decline") {
        setState("declined");
      } else {
        setState("cancelled");
      }

      window.location.reload();
    } catch (error) {
      console.error("[ProfessionalConnectButton] patch error:", error);
      setMessage("Erro ao atualizar conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref =
    typeof window === "undefined"
      ? "/login"
      : `/login?next=${encodeURIComponent(
          `${window.location.pathname}${window.location.search}`
        )}`;

  if (state === "loading") {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/60"
        >
          Carregando...
        </button>
      </div>
    );
  }

  if (state === "self") {
    return null;
  }

  if (state === "unauthenticated") {
    return (
      <div className={className}>
        <a
          href={loginHref}
          className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Entrar para conectar
        </a>
      </div>
    );
  }

  if (state === "connected") {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300"
        >
          Conectado
        </button>
      </div>
    );
  }

  if (state === "incoming_pending") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => handlePatch("accept")}
          disabled={submitting}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Processando..." : "Aceitar"}
        </button>

        <button
          type="button"
          onClick={() => handlePatch("decline")}
          disabled={submitting}
          className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Recusar
        </button>
      </div>
    );
  }

  if (state === "outgoing_pending") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <button
          type="button"
          disabled
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70"
        >
          Solicitação enviada
        </button>

        <button
          type="button"
          onClick={() => handlePatch("cancel")}
          disabled={submitting}
          className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Cancelando..." : "Cancelar"}
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleCreateConnection}
        disabled={submitting}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Conectar"}
      </button>

      {message ? (
        <p className="mt-2 text-xs text-red-300">{message}</p>
      ) : null}
    </div>
  );
}