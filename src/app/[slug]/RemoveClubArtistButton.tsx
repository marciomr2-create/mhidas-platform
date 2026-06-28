"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type RemoveClubArtistButtonProps = {
  cardId: string;
  ownerUserId: string;
  spotifyId: string;
  artistName: string;
  label?: string;
  layout?: "overlay" | "footer";
};

export default function RemoveClubArtistButton({
  cardId,
  ownerUserId,
  spotifyId,
  artistName,
  label = "Remover",
  layout = "overlay",
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
        if (mounted) setChecked(true);
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

    const confirmed = window.confirm(
      `Remover "${artistName}" dos seus artistas de referência?`
    );
    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/club-profile/remove-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, spotifyId }),
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

  if (!checked || !isOwner) return null;

  const isFooter = layout === "footer";

  return (
    <button
      type="button"
      aria-label={`${label}: ${artistName}`}
      title={`${label}: ${artistName}`}
      onClick={handleRemove}
      disabled={loading}
      style={
        isFooter
          ? {
              position: "static",
              width: "auto",
              minHeight: 30,
              border: "none",
              borderRadius: 0,
              background: "transparent",
              color: "rgba(255,255,255,0.72)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading ? "wait" : "pointer",
              fontSize: 12,
              fontWeight: 850,
              lineHeight: 1,
              padding: 0,
              opacity: loading ? 0.42 : 1,
            }
          : {
              position: "absolute",
              right: 10,
              top: 10,
              zIndex: 8,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: loading ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.34)",
              backdropFilter: "blur(10px)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading ? "wait" : "pointer",
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
              opacity: loading ? 0.45 : 0.72,
            }
      }
    >
      {isFooter ? label : "×"}
    </button>
  );
}
