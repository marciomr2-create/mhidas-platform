"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type MoveClubTokenButtonProps = {
  cardId: string;
  ownerUserId: string;
  field: "favorite_clubs" | "favorite_events" | "last_events" | "next_events";
  value: string;
};

export default function MoveClubTokenButton({
  cardId,
  ownerUserId,
  field,
  value,
}: MoveClubTokenButtonProps) {
  const router = useRouter();

  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loadingDirection, setLoadingDirection] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      try {
        const supabase = createBrowserClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setIsOwner(Boolean(user?.id && ownerUserId && user.id === ownerUserId));
      } catch {
        if (!mounted) return;
        setIsOwner(false);
      } finally {
        if (mounted) {
          setChecked(true);
        }
      }
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [ownerUserId]);

  async function moveItem(
    event: MouseEvent<HTMLButtonElement>,
    direction: "left" | "right"
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (loadingDirection) return;

    setLoadingDirection(direction);

    try {
      const response = await fetch("/api/club-profile/move-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId,
          field,
          value,
          direction,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível mover este item.");
      }

      router.refresh();
    } catch (error: any) {
      alert(error?.message || "Erro ao mover item.");
    } finally {
      setLoadingDirection("");
    }
  }

  if (!checked || !isOwner) {
    return null;
  }

  const baseButton = {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.58)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: loadingDirection ? "wait" : "pointer",
    fontSize: 16,
    fontWeight: 900,
    lineHeight: 1,
    boxShadow: "0 8px 18px rgba(0,0,0,0.30)",
    opacity: loadingDirection ? 0.55 : 0.86,
  } as const;

  return (
    <div
      style={{
        position: "absolute",
        left: 9,
        bottom: 9,
        zIndex: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <button
        type="button"
        aria-label={`Mover ${value} para esquerda`}
        title={`Mover ${value} para esquerda`}
        onClick={(event) => moveItem(event, "left")}
        disabled={Boolean(loadingDirection)}
        style={baseButton}
      >
        ‹
      </button>

      <button
        type="button"
        aria-label={`Mover ${value} para direita`}
        title={`Mover ${value} para direita`}
        onClick={(event) => moveItem(event, "right")}
        disabled={Boolean(loadingDirection)}
        style={baseButton}
      >
        ›
      </button>
    </div>
  );
}
