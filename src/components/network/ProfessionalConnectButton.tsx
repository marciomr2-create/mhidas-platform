// src/components/network/ProfessionalConnectButton.tsx
// v4.5.1-public-pro-follow-button
// visual polish: unified professional action buttons
"use client";

import type { CSSProperties } from "react";
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
  | "cancelled"
  | "suspended"
  | "blocked";

type StatusResponse = {
  ok?: boolean;
  state?: ConnectionState;
  code?: string;
};

type Props = {
  targetUserId: string;
  className?: string;
};

const actionBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "10px 14px",
  borderRadius: 14,
  fontWeight: 900,
  fontSize: 13,
  lineHeight: 1.1,
  letterSpacing: "-0.01em",
  textDecoration: "none",
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  transition:
    "transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
};

const primaryStyle: CSSProperties = {
  ...actionBaseStyle,
  border: "1px solid rgba(96,165,250,0.48)",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(79,70,229,0.72))",
  color: "#F8FAFC",
  boxShadow:
    "0 0 0 1px rgba(59,130,246,0.10) inset, 0 14px 26px rgba(37,99,235,0.16)",
};

const secondaryStyle: CSSProperties = {
  ...actionBaseStyle,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(15,23,42,0.76)",
  color: "#F8FAFC",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
};

const successStyle: CSSProperties = {
  ...actionBaseStyle,
  border: "1px solid rgba(45,212,191,0.36)",
  background: "rgba(20,184,166,0.12)",
  color: "#99F6E4",
  cursor: "default",
  boxShadow: "0 0 0 1px rgba(45,212,191,0.05) inset",
};

const disabledStyle: CSSProperties = {
  ...secondaryStyle,
  cursor: "not-allowed",
  opacity: 0.6,
};

const actionGroupStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
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

        if (data?.code === "RELATIONSHIP_BLOCKED") {
          setState("blocked");
          return;
        }

        if (data?.code === "RELATIONSHIP_SUSPENDED") {
          setState("suspended");
          return;
        }

        if (data?.code === "UNAUTHORIZED") {
          setState("unauthenticated");
          return;
        }

        setMessage("Não foi possível enviar a conexão agora.");
        return;
      }

      setState("outgoing_pending");
      setMessage("");
    } catch (error) {
      console.error("[ProfessionalConnectButton] create error:", error);
      setMessage("Erro ao enviar a conexão.");
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

        if (data?.code === "RELATIONSHIP_BLOCKED") {
          setState("blocked");
          return;
        }

        if (data?.code === "RELATIONSHIP_SUSPENDED") {
          setState("suspended");
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

      setMessage("");
    } catch (error) {
      console.error("[ProfessionalConnectButton] patch error:", error);
      setMessage("Erro ao atualizar a conexão.");
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
        <button type="button" disabled style={disabledStyle}>
          Verificando
        </button>
      </div>
    );
  }

  if (state === "self") {
    return (
      <div className={className} style={actionGroupStyle}>
        <a href="/dashboard/network" style={primaryStyle}>
          Abrir conexões
        </a>

        <a href="/dashboard" style={secondaryStyle}>
          Abrir meu painel
        </a>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <div className={className}>
        <a href={loginHref} style={primaryStyle}>
          Entrar para conectar
        </a>
      </div>
    );
  }

  if (state === "connected") {
    return (
      <div className={className}>
        <button type="button" disabled style={successStyle}>
          Conexão confirmada
        </button>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className={className}>
        <button type="button" disabled style={disabledStyle}>
          Conexão indisponível
        </button>
      </div>
    );
  }

  if (state === "suspended") {
    return (
      <div className={className}>
        <button type="button" disabled style={disabledStyle}>
          Perfil suspenso
        </button>
      </div>
    );
  }

  if (state === "incoming_pending") {
    return (
      <div className={className} style={actionGroupStyle}>
        <button
          type="button"
          onClick={() => handlePatch("accept")}
          disabled={submitting}
          style={submitting ? disabledStyle : primaryStyle}
        >
          {submitting ? "Processando" : "Aceitar conexão"}
        </button>

        <button
          type="button"
          onClick={() => handlePatch("decline")}
          disabled={submitting}
          style={submitting ? disabledStyle : secondaryStyle}
        >
          Recusar
        </button>
      </div>
    );
  }

  if (state === "outgoing_pending") {
    return (
      <div className={className} style={actionGroupStyle}>
        <button type="button" disabled style={secondaryStyle}>
          Conexão enviada
        </button>

        <button
          type="button"
          onClick={() => handlePatch("cancel")}
          disabled={submitting}
          style={submitting ? disabledStyle : secondaryStyle}
        >
          {submitting ? "Cancelando" : "Cancelar"}
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
        style={submitting ? disabledStyle : primaryStyle}
      >
        {submitting ? "Enviando" : "Conectar"}
      </button>

      {message ? (
        <p style={{ marginTop: 8, color: "#FCA5A5", fontSize: 12 }}>{message}</p>
      ) : null}
    </div>
  );
}
