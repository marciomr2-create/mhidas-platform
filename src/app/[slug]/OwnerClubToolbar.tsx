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
    minHeight: 34,
    padding: "8px 11px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 820,
    fontSize: 12,
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
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 18,
        background:
          "linear-gradient(135deg, rgba(0,255,190,0.10), rgba(125,92,255,0.12))",
        border: "1px solid rgba(0,255,190,0.14)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div>
        <strong
          style={{
            display: "block",
            fontSize: 13,
            lineHeight: 1.25,
            letterSpacing: -0.1,
          }}
        >
          Modo edição
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
          Edite seu perfil Clubbers direto nesta página.
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Link href={`/${slug}?mode=club`} style={primaryButtonStyle}>
          Editar perfil
        </Link>

        <Link
          href={`/api/qr/${slug}?mode=club`}
          target="_blank"
          rel="noopener noreferrer"
          style={buttonStyle}
        >
          QR / NFC
        </Link>

        <Link href={`/${slug}?mode=club&view=public`} style={buttonStyle}>
          Ver público
        </Link>
      </div>
    </div>
  );
}
