"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import AddClubArtistButton from "./AddClubArtistButton";
import AddClubTokenButton from "./AddClubTokenButton";

type TokenField =
  | "favorite_clubs"
  | "favorite_events"
  | "last_events"
  | "next_events";

type CatalogType = "club" | "festival" | "party" | "event" | "venue";

type ClubOwnerEmptyBlockProps = {
  cardId: string;
  ownerUserId: string;
  title: string;
  description: string;
  kind: "artist" | "token";
  cityBase?: string;
  field?: TokenField;
  type?: CatalogType;
  label?: string;
  modalTitle?: string;
  placeholder?: string;
  allowNextEventDetails?: boolean;
  standalone?: boolean;
};

export default function ClubOwnerEmptyBlock({
  cardId,
  ownerUserId,
  title,
  description,
  kind,
  cityBase = "",
  field,
  type,
  label,
  modalTitle,
  placeholder,
  allowNextEventDetails = false,
  standalone = false,
}: ClubOwnerEmptyBlockProps) {
  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

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

  const content = (
    <div
      style={{
        padding: standalone ? 18 : 16,
        borderRadius: standalone ? 24 : 20,
        border: "1px dashed rgba(255,255,255,0.18)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.070), rgba(255,255,255,0.030))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 220, flex: "1 1 260px" }}>
        <strong
          style={{
            display: "block",
            color: "#fff",
            fontSize: standalone ? 18 : 15,
            lineHeight: 1.25,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 6,
            color: "rgba(255,255,255,0.68)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {description}
        </span>
      </div>

      {kind === "artist" ? (
        <AddClubArtistButton
          cardId={cardId}
          ownerUserId={ownerUserId}
          compact
        />
      ) : field && type && label && modalTitle && placeholder ? (
        <AddClubTokenButton
          cardId={cardId}
          ownerUserId={ownerUserId}
          field={field}
          type={type}
          label={label}
          title={modalTitle}
          placeholder={placeholder}
          cityBase={cityBase}
          compact
          allowNextEventDetails={allowNextEventDetails}
        />
      ) : null}
    </div>
  );

  if (!standalone) {
    return <div style={{ marginTop: 14 }}>{content}</div>;
  }

  return (
    <section
      className="uc-section"
      style={{
        background: "rgba(255,255,255,0.045)",
        borderRadius: 28,
        padding: 22,
        marginTop: 20,
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
      }}
    >
      {content}
    </section>
  );
}
