// src/components/network/ProfessionalFollowButton.tsx
// v4.5.1-public-pro-follow-button
// visual polish: unified professional action buttons
"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FollowState =
  | "loading"
  | "signed_out"
  | "self"
  | "not_following"
  | "following"
  | "blocked"
  | "suspended"
  | "error";

type FollowStatusResponse = {
  ok?: boolean;
  state?: Exclude<FollowState, "loading" | "error">;
  code?: string;
  message?: string;
};

type ProfessionalFollowButtonProps = {
  targetUserId: string;
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

const followStyle: CSSProperties = {
  ...actionBaseStyle,
  border: "1px solid rgba(96,165,250,0.48)",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(79,70,229,0.72))",
  color: "#F8FAFC",
  boxShadow:
    "0 0 0 1px rgba(59,130,246,0.10) inset, 0 14px 26px rgba(37,99,235,0.16)",
};

const followingStyle: CSSProperties = {
  ...actionBaseStyle,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(15,23,42,0.76)",
  color: "#F8FAFC",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
};

const secondaryStyle: CSSProperties = {
  ...actionBaseStyle,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(15,23,42,0.76)",
  color: "#E5E7EB",
  boxShadow: "none",
};

const disabledStyle: CSSProperties = {
  ...secondaryStyle,
  cursor: "not-allowed",
  opacity: 0.58,
};

function getLoginHref(): string {
  if (typeof window === "undefined") return "/login";

  const currentPath = `${window.location.pathname}${window.location.search}`;
  return `/login?returnTo=${encodeURIComponent(currentPath)}`;
}

async function readStatus(targetUserId: string): Promise<FollowState> {
  const response = await fetch(
    `/api/professional-follows/status?targetUserId=${encodeURIComponent(targetUserId)}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    }
  );

  const payload = (await response.json().catch(() => null)) as FollowStatusResponse | null;

  if (!response.ok || !payload?.ok) {
    if (response.status === 401 || payload?.code === "UNAUTHORIZED") return "signed_out";
    return "error";
  }

  return payload.state ?? "not_following";
}

export default function ProfessionalFollowButton({
  targetUserId,
}: ProfessionalFollowButtonProps) {
  const [state, setState] = useState<FollowState>("loading");
  const [isBusy, setIsBusy] = useState(false);

  const canToggle = state === "not_following" || state === "following";

  const label = useMemo(() => {
    if (isBusy) return state === "following" ? "Removendo" : "Seguindo";

    if (state === "loading") return "Carregando";
    if (state === "signed_out") return "Entrar para seguir";
    if (state === "self") return "Seu perfil";
    if (state === "following") return "Seguindo";
    if (state === "blocked") return "Indisponível";
    if (state === "suspended") return "Pausado";
    if (state === "error") return "Tentar novamente";

    return "Seguir";
  }, [isBusy, state]);

  const currentStyle = useMemo(() => {
    if (state === "not_following") return followStyle;
    if (state === "following") return followingStyle;
    if (state === "signed_out") return secondaryStyle;
    return disabledStyle;
  }, [state]);

  const refresh = useCallback(async () => {
    if (!targetUserId) {
      setState("error");
      return;
    }

    try {
      setState(await readStatus(targetUserId));
    } catch {
      setState("error");
    }
  }, [targetUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFollow = useCallback(async () => {
    if (!targetUserId || !canToggle || isBusy) return;

    const nextMethod = state === "following" ? "DELETE" : "POST";
    const optimisticState: FollowState = state === "following" ? "not_following" : "following";
    const previousState = state;

    setIsBusy(true);
    setState(optimisticState);

    try {
      const response = await fetch("/api/professional-follows", {
        method: nextMethod,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId }),
      });

      const payload = (await response.json().catch(() => null)) as FollowStatusResponse | null;

      if (!response.ok || !payload?.ok) {
        setState(payload?.code === "UNAUTHORIZED" ? "signed_out" : previousState);
        return;
      }

      setState(payload.state ?? optimisticState);
    } catch {
      setState(previousState);
    } finally {
      setIsBusy(false);
    }
  }, [canToggle, isBusy, state, targetUserId]);

  if (state === "self") return null;

  if (state === "signed_out") {
    return (
      <a href={getLoginHref()} style={currentStyle} title="Entrar para seguir este perfil">
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={state === "error" ? refresh : toggleFollow}
      disabled={isBusy || (!canToggle && state !== "error")}
      style={currentStyle}
      aria-pressed={state === "following"}
      aria-label={state === "following" ? "Deixar de seguir este perfil" : label}
      title={state === "following" ? "Clique para deixar de seguir" : label}
    >
      {label}
    </button>
  );
}
