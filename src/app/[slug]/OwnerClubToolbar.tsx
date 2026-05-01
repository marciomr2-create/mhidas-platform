"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/utils/supabase/client";

type OwnerClubToolbarProps = {
  cardId: string;
  ownerUserId: string;
  slug: string;
};

export default function OwnerClubToolbar({
  cardId,
  ownerUserId,
  slug,
}: OwnerClubToolbarProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);

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

  if (!checked || !isOwner) {
    return null;
  }

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "10px 13px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 820,
    fontSize: 13,
    lineHeight: 1.1,
    whiteSpace: "nowrap" as const,
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.18)",
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 22,
        background:
          "linear-gradient(135deg, rgba(125,92,255,0.20), rgba(255,255,255,0.055))",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <strong
          style={{
            display: "block",
            fontSize: 14,
            lineHeight: 1.25,
            letterSpacing: -0.1,
          }}
        >
          Você está editando seu Club
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 12,
            opacity: 0.68,
            lineHeight: 1.35,
          }}
        >
          Esta barra aparece apenas para o dono do perfil logado.
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/dashboard/cards/${cardId}/club`} style={buttonStyle}>
          Editar Club
        </Link>


        <Link href={`/dashboard/cards/${cardId}`} style={primaryButtonStyle}>
          Perfil, QR e NFC
        </Link>

        <Link href={`/${slug}?mode=club`} style={buttonStyle}>
          Ver como público
        </Link>
      </div>
    </div>
  );
}

