// src/app/[slug]/RemoveClubArtistButton.tsx

"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type RemoveClubArtistButtonProps = {
  cardId: string;
  ownerUserId: string;
  spotifyId: string;
  artistName: string;
};

export default function RemoveClubArtistButton({
  cardId,
  ownerUserId,
  spotifyId,
  artistName,
}: RemoveClubArtistButtonProps) {
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

    const confirmed = window.confirm(`Remover "${artistName}" dos seus artistas de referência?`);

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/club-profile/remove-artist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId,
          spotifyId,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível remover este artista.");
      }

      router.refresh();
    } catch (error: any) {
      alert(error?.message || "Erro ao remover artista.");
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
      aria-label={`Remover artista: ${artistName}`}
      title={`Remover artista: ${artistName}`}
      onClick={handleRemove}
      disabled={loading}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 8,
        width: 30,
        height: 30,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: loading ? "rgba(0,0,0,0.56)" : "rgba(0,0,0,0.72)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loading ? "wait" : "pointer",
        fontSize: 17,
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
