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
        border: "1px solid rgba(99,217,186,0.48)",
        background: "rgba(36,122,106,0.22)",
        shadow: "none",
        textColor: "#dffff6",
        helperOpacity: 0.9,
      };
    }

    if (locationStatus === "outside_radius") {
      return {
        border: "1px solid rgba(216,183,95,0.48)",
        background: "rgba(120,88,30,0.20)",
        shadow: "none",
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
        border: "1px solid rgba(157,145,231,0.44)",
        background: "rgba(93,78,156,0.20)",
        shadow: "none",
        textColor: "#eef0ff",
        helperOpacity: 0.86,
      };
    }

    if (locationStatus === "error") {
      return {
        border: "1px solid rgba(225,112,112,0.48)",
        background: "rgba(132,45,45,0.20)",
        shadow: "none",
        textColor: "#ffe4e4",
        helperOpacity: 0.9,
      };
    }

    return {
      border: done
        ? "1px solid rgba(99,217,186,0.46)"
        : "1px solid rgba(95,190,174,0.38)",
      background: done
        ? "rgba(36,122,106,0.22)"
        : "rgba(38,92,96,0.22)",
      shadow: "none",
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
          borderRadius: 13,
          border: visualState.border,
          background: visualState.background,
          color: visualState.textColor,
          padding: compact ? "0 13px" : "0 15px",
          fontSize: compact ? 12 : 13,
          fontWeight: 850,
          cursor: loading || done ? "default" : "pointer",
          opacity: loading ? 0.68 : 1,
          boxShadow: visualState.shadow,
          textTransform: "none",
          letterSpacing: 0,
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