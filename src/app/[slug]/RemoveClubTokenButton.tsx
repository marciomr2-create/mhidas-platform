// src/app/[slug]/RemoveClubTokenButton.tsx

"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type RemoveClubTokenButtonProps = {
  cardId: string;
  ownerUserId: string;
  field: "favorite_clubs" | "favorite_events" | "last_events" | "next_events";
  value: string;
  label?: string;
};

export default function RemoveClubTokenButton({
  cardId,
  ownerUserId,
  field,
  value,
  label = "Remover",
}: RemoveClubTokenButtonProps) {
  const router = useRouter();

  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

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

  async function handleRemove(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (loading) return;

    const confirmed = window.confirm(`Remover "${value}" do seu Club?`);

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/club-profile/remove-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId,
          field,
          value,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível remover este item.");
      }

      router.refresh();
    } catch (error: any) {
      alert(error?.message || "Erro ao remover item.");
    } finally {
      setLoading(false);
    }
  }

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={`${label}: ${value}`}
      title={`${label}: ${value}`}
      onClick={handleRemove}
      disabled={loading}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 8,
        width: 34,
        height: 34,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: loading ? "rgba(0,0,0,0.56)" : "rgba(0,0,0,0.72)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loading ? "wait" : "pointer",
        fontSize: 18,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: "0 10px 26px rgba(0,0,0,0.38)",
        opacity: loading ? 0.62 : 1,
      }}
    >
      ×
    </button>
  );
}
