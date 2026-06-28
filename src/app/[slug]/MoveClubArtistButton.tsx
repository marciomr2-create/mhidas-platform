"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type MoveClubArtistButtonProps = {
  cardId: string;
  ownerUserId: string;
  spotifyId: string;
  artistName: string;
  layout?: "overlay" | "footer";
};

export default function MoveClubArtistButton({
  cardId,
  ownerUserId,
  spotifyId,
  artistName,
  layout = "overlay",
}: MoveClubArtistButtonProps) {
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
        if (mounted) setChecked(true);
      }
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [ownerUserId]);

  async function moveArtist(
    event: MouseEvent<HTMLButtonElement>,
    direction: "left" | "right"
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (loadingDirection) return;

    setLoadingDirection(direction);

    try {
      const response = await fetch("/api/club-profile/move-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, spotifyId, direction }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível mover este artista.");
      }

      router.refresh();
    } catch (error: any) {
      alert(error?.message || "Erro ao mover artista.");
    } finally {
      setLoadingDirection("");
    }
  }

  if (!checked || !isOwner) return null;

  const isFooter = layout === "footer";

  const baseButton = isFooter
    ? ({
        width: 34,
        height: 30,
        border: "none",
        borderRadius: 0,
        background: "transparent",
        color: "rgba(255,255,255,0.82)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loadingDirection ? "wait" : "pointer",
        fontSize: 21,
        fontWeight: 700,
        lineHeight: 1,
        padding: 0,
        opacity: loadingDirection ? 0.42 : 1,
      } as const)
    : ({
        width: 30,
        height: 30,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.34)",
        backdropFilter: "blur(10px)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loadingDirection ? "wait" : "pointer",
        fontSize: 17,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
        opacity: loadingDirection ? 0.45 : 0.72,
      } as const);

  return (
    <div
      style={
        isFooter
          ? {
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
            }
          : {
              position: "absolute",
              left: 10,
              top: 10,
              zIndex: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }
      }
    >
      <button
        type="button"
        aria-label={`Mover ${artistName} para esquerda`}
        title={`Mover ${artistName} para esquerda`}
        onClick={(event) => moveArtist(event, "left")}
        disabled={Boolean(loadingDirection)}
        style={baseButton}
      >
        ←
      </button>

      <button
        type="button"
        aria-label={`Mover ${artistName} para direita`}
        title={`Mover ${artistName} para direita`}
        onClick={(event) => moveArtist(event, "right")}
        disabled={Boolean(loadingDirection)}
        style={baseButton}
      >
        →
      </button>
    </div>
  );
}
