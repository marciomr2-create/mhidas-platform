// src/app/[slug]/CheckInEventButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

type BrowserLocationResult = {
  latitude: number | null;
  longitude: number | null;
  locationSource: "browser_gps" | "manual_confirmed";
};

type LocationStatus =
  | "idle"
  | "inside_radius"
  | "outside_radius"
  | "location_unavailable"
  | "not_checked"
  | "pending_sync"
  | "error";

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getBrowserLocation(): Promise<BrowserLocationResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        locationSource: "manual_confirmed",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationSource: "browser_gps",
        });
      },
      () => {
        resolve({
          latitude: null,
          longitude: null,
          locationSource: "manual_confirmed",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
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
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(
    initialStatus === "active" ? "not_checked" : "idle"
  );

  const visualState = useMemo(() => {
    if (locationStatus === "inside_radius") {
      return {
        border: "1px solid rgba(0,255,190,0.72)",
        background:
          "linear-gradient(135deg, rgba(0,255,190,0.28), rgba(0,110,95,0.32))",
        shadow: "0 0 28px rgba(0,255,190,0.32)",
        textColor: "#dffff6",
        helperOpacity: 0.9,
      };
    }

    if (locationStatus === "outside_radius") {
      return {
        border: "1px solid rgba(255,205,90,0.72)",
        background:
          "linear-gradient(135deg, rgba(255,205,90,0.26), rgba(120,78,0,0.28))",
        shadow: "0 0 28px rgba(255,205,90,0.22)",
        textColor: "#fff2cf",
        helperOpacity: 0.9,
      };
    }

    if (
      locationStatus === "location_unavailable" ||
      locationStatus === "not_checked" ||
      locationStatus === "pending_sync"
    ) {
      return {
        border: "1px solid rgba(150,165,255,0.58)",
        background:
          "linear-gradient(135deg, rgba(125,92,255,0.25), rgba(0,255,190,0.12))",
        shadow: "0 0 24px rgba(125,92,255,0.22)",
        textColor: "#eef0ff",
        helperOpacity: 0.86,
      };
    }

    if (locationStatus === "error") {
      return {
        border: "1px solid rgba(255,110,110,0.66)",
        background:
          "linear-gradient(135deg, rgba(255,110,110,0.22), rgba(120,0,0,0.24))",
        shadow: "0 0 22px rgba(255,110,110,0.18)",
        textColor: "#ffe4e4",
        helperOpacity: 0.9,
      };
    }

    return {
      border: done
        ? "1px solid rgba(0,255,190,0.56)"
        : "1px solid rgba(0,255,190,0.36)",
      background: done
        ? "linear-gradient(135deg, rgba(0,255,190,0.24), rgba(0,110,95,0.28))"
        : "linear-gradient(135deg, rgba(0,255,190,0.18), rgba(125,92,255,0.16))",
      shadow: done
        ? "0 0 24px rgba(0,255,190,0.25)"
        : "0 12px 26px rgba(0,0,0,0.24)",
      textColor: "#fff",
      helperOpacity: done ? 0.82 : 0.68,
    };
  }, [done, locationStatus]);

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
      setLocationStatus("error");
      setMessage("Evento inválido para check-in.");
      return;
    }

    setLoading(true);
    setLocationStatus("pending_sync");
    setMessage("Solicitando localização...");

    try {
      const location = await getBrowserLocation();

      setMessage("Confirmando check-in...");

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
          source: location.locationSource,
          userLatitude: location.latitude,
          userLongitude: location.longitude,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Não foi possível fazer check-in.");
      }

      const nextLocationStatus = normalizeText(result?.locationStatus) as LocationStatus;

      setDone(true);

      if (nextLocationStatus === "inside_radius") {
        setLocationStatus("inside_radius");
        setMessage("Check-in ativo por proximidade.");
      } else if (nextLocationStatus === "outside_radius") {
        setLocationStatus("outside_radius");
        setMessage("Check-in ativo, mas fora do raio configurado.");
      } else if (nextLocationStatus === "location_unavailable") {
        setLocationStatus("location_unavailable");
        setMessage("Check-in ativo, localização não validada.");
      } else {
        setLocationStatus("not_checked");
        setMessage(result?.message || "Check-in ativo, localização não validada.");
      }

      router.refresh();
    } catch (error: any) {
      setLocationStatus("error");
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
          border: visualState.border,
          background: visualState.background,
          color: visualState.textColor,
          padding: compact ? "0 13px" : "0 15px",
          fontSize: compact ? 12 : 13,
          fontWeight: 950,
          cursor: loading || done ? "default" : "pointer",
          opacity: loading ? 0.68 : 1,
          boxShadow: visualState.shadow,
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
            color: visualState.textColor,
            opacity: visualState.helperOpacity,
            textAlign: "center",
          }}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}