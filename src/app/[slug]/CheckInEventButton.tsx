// src/app/[slug]/CheckInEventButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type CheckInEventButtonProps = {
  cardId: string;
  ownerUserId: string;
  eventName: string;
  eventDate?: string;
  eventLink?: string;
  catalogId?: string | null;
  compact?: boolean;
  initialStatus?: "none" | "pending" | "active" | "expired";
};

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function CheckInEventButton({
  cardId,
  ownerUserId,
  eventName,
  eventDate = "",
  eventLink = "",
  catalogId = null,
  compact = false,
  initialStatus = "none",
}: CheckInEventButtonProps) {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialStatus === "active");
  const [message, setMessage] = useState("");

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

  async function handleCheckIn() {
    if (loading || done) return;

    const cleanEventName = normalizeText(eventName);

    if (!cleanEventName) {
      setMessage("Evento inválido para check-in.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/club-profile/check-in-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          cardId,
          eventName: cleanEventName,
          eventDate: normalizeText(eventDate),
          eventLink: normalizeText(eventLink),
          catalogId: catalogId || null,
          source: "manual_confirmed",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível fazer check-in.");
      }

      setDone(true);
      setMessage("Check-in ativo.");
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "Erro ao fazer check-in.");
    } finally {
      setLoading(false);
    }
  }

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: 7 }}>
      <button
        type="button"
        onClick={handleCheckIn}
        disabled={loading || done}
        style={{
          width: "100%",
          minHeight: compact ? 38 : 42,
          borderRadius: 999,
          border: done
            ? "1px solid rgba(0,255,190,0.56)"
            : "1px solid rgba(0,255,190,0.36)",
          background: done
            ? "linear-gradient(135deg, rgba(0,255,190,0.24), rgba(0,110,95,0.28))"
            : "linear-gradient(135deg, rgba(0,255,190,0.18), rgba(125,92,255,0.16))",
          color: "#fff",
          padding: compact ? "0 13px" : "0 15px",
          fontSize: compact ? 12 : 13,
          fontWeight: 950,
          cursor: loading || done ? "default" : "pointer",
          opacity: loading ? 0.68 : 1,
          boxShadow: done
            ? "0 0 24px rgba(0,255,190,0.25)"
            : "0 12px 26px rgba(0,0,0,0.24)",
          textTransform: "uppercase",
          letterSpacing: 0.35,
        }}
      >
        {loading ? "Confirmando..." : done ? "Check-in ativo" : "Fazer check-in"}
      </button>

      {message ? (
        <span
          style={{
            display: "block",
            fontSize: 11,
            lineHeight: 1.35,
            color: "#fff",
            opacity: done ? 0.82 : 0.68,
            textAlign: "center",
          }}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}

