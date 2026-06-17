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
        padding: standalone ? 16 : 14,
        borderRadius: standalone ? 22 : 18,
        border: "1px solid rgba(0,255,190,0.10)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.040), rgba(0,255,190,0.024))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 220, flex: "1 1 260px" }}>
        <strong
          style={{
            display: "block",
            color: "#fff",
            fontSize: standalone ? 17 : 15,
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
            color: "rgba(255,255,255,0.72)",
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
        background: "linear-gradient(145deg, rgba(14,12,28,0.58), rgba(3,4,10,0.42))",
        borderRadius: 24,
        padding: 20,
        marginTop: 20,
        border: "1px solid rgba(125,92,255,0.16)",
        boxShadow: "0 20px 58px rgba(0,0,0,0.28), inset 0 0 26px rgba(0,255,190,0.014)",
      }}
    >
      {content}
    </section>
  );
}
